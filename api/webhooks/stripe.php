<?php
require_once '../../vendor/autoload.php';
require_once '../config/database.php';
require_once '../services/StripeService.php';

// Set content type for webhook response
header('Content-Type: application/json');

// Enable CORS for webhook endpoints
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Stripe-Signature');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests for webhooks
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

try {
    // Get the raw POST body
    $payload = @file_get_contents('php://input');
    $sig_header = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
    
    if (!$payload || !$sig_header) {
        throw new Exception('Missing payload or signature');
    }

    // Initialize database and Stripe service
    $database = new Database();
    $pdo = $database->getConnection();
    $stripeService = new StripeService($database);
    
    // Verify webhook signature and construct event
    $event = $stripeService->constructWebhookEvent($payload, $sig_header);
    
    // Log webhook event
    error_log("Stripe webhook received: " . $event->type . " - ID: " . $event->id);
    
    // Log event receipt
    logWebhookEvent($event, $pdo);
    
    // Handle the event
    $result = handleStripeWebhookEvent($event);
    
    if ($result['success']) {
        http_response_code(200);
        echo json_encode(['status' => 'success', 'message' => $result['message']]);
    } else {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => $result['message']]);
    }

} catch (Exception $e) {
    error_log("Stripe webhook error: " . $e->getMessage());
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Webhook processing failed']);
}

function logWebhookEvent($event, $pdo) {
    try {
        
        // Check if we've already processed this event (create table if needed)
        try {
            $pdo->exec("CREATE TABLE IF NOT EXISTS webhook_events (
                id INT PRIMARY KEY AUTO_INCREMENT,
                stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
                event_type VARCHAR(100) NOT NULL,
                processed BOOLEAN DEFAULT FALSE,
                processing_attempts INT DEFAULT 0,
                last_processing_error TEXT,
                event_data JSON,
                received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                processed_at TIMESTAMP NULL
            )");
        } catch (Exception $e) {
            // Table might already exist
        }
        
        $checkStmt = $pdo->prepare("SELECT id FROM webhook_events WHERE stripe_event_id = ?");
        $checkStmt->execute([$event->id]);
        
        if (!$checkStmt->fetch()) {
            // Insert new webhook event log
            $stmt = $pdo->prepare("
                INSERT INTO webhook_events (
                    stripe_event_id, event_type, event_data, received_at
                ) VALUES (?, ?, ?, NOW())
            ");
            $stmt->execute([
                $event->id,
                $event->type,
                json_encode($event->data->object)
            ]);
        }
    } catch (Exception $e) {
        error_log("Failed to log webhook event: " . $e->getMessage());
    }
}

function handleStripeWebhookEvent($event) {
    global $pdo;
    
    switch ($event->type) {
        case 'payment_intent.succeeded':
            return handlePaymentIntentSucceeded($event->data->object);
            
        case 'payment_intent.payment_failed':
            return handlePaymentIntentFailed($event->data->object);
            
        case 'payment_intent.canceled':
            return handlePaymentIntentCanceled($event->data->object);
            
        case 'payment_intent.requires_action':
            return handlePaymentIntentRequiresAction($event->data->object);
            
        case 'charge.dispute.created':
            return handleChargeDisputeCreated($event->data->object);
            
        case 'invoice.payment_succeeded':
            return handleInvoicePaymentSucceeded($event->data->object);
            
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
            return handleSubscriptionEvent($event->data->object, $event->type);
            
        default:
            return [
                'success' => true, 
                'message' => 'Unhandled event type: ' . $event->type
            ];
    }
}

function handlePaymentIntentSucceeded($paymentIntent) {
    global $pdo;
    
    try {
        // Extract metadata
        $videoId = $paymentIntent->metadata->video_id ?? null;
        $userId = $paymentIntent->metadata->user_id ?? null;
        $videoTitle = $paymentIntent->metadata->video_title ?? 'Unknown Video';
        
        if (!$videoId || !$userId) {
            throw new Exception('Missing video_id or user_id in metadata');
        }
        
        // Start transaction
        $pdo->beginTransaction();
        
        // Update stripe_payments table
        $stmt = $pdo->prepare("
            UPDATE stripe_payments 
            SET 
                status = 'succeeded',
                stripe_charge_id = ?,
                updated_at = NOW()
            WHERE payment_intent_id = ?
        ");
        $stmt->execute([
            $paymentIntent->latest_charge ?? $paymentIntent->id,
            $paymentIntent->id
        ]);
        
        // Check if purchase already exists to avoid duplicates
        $checkStmt = $pdo->prepare("
            SELECT id FROM purchases 
            WHERE user_id = ? AND video_id = ? AND payment_intent_id = ?
        ");
        $checkStmt->execute([$userId, $videoId, $paymentIntent->id]);
        
        if (!$checkStmt->fetch()) {
            // Create purchase record - ensure table has all required columns
            try {
                $pdo->exec("ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255)");
            } catch (Exception $e) {
                // Column might already exist
            }
            
            $purchaseStmt = $pdo->prepare("
                INSERT INTO purchases (
                    user_id, video_id, amount, currency, status, 
                    payment_method, payment_intent_id, purchased_at
                ) VALUES (?, ?, ?, ?, 'completed', 'stripe', ?, NOW())
            ");
            $purchaseStmt->execute([
                $userId,
                $videoId,
                $paymentIntent->amount / 100, // Convert from cents
                strtoupper($paymentIntent->currency),
                $paymentIntent->id
            ]);
            
            // Update video purchase count
            $updateVideoStmt = $pdo->prepare("
                UPDATE videos 
                SET purchase_count = purchase_count + 1,
                    total_revenue = total_revenue + ?
                WHERE id = ?
            ");
            $updateVideoStmt->execute([
                $paymentIntent->amount / 100,
                $videoId
            ]);
            
            // Update user purchase metrics
            $updateUserStmt = $pdo->prepare("
                UPDATE users 
                SET total_spent = total_spent + ?,
                    purchase_count = purchase_count + 1
                WHERE id = ?
            ");
            $updateUserStmt->execute([
                $paymentIntent->amount / 100,
                $userId
            ]);
        }
        
        // Commit transaction
        $pdo->commit();
        
        // Log successful payment
        error_log("Payment succeeded: User $userId purchased Video $videoId for $" . ($paymentIntent->amount / 100));
        
        return [
            'success' => true,
            'message' => "Payment completed successfully for video: $videoTitle"
        ];
        
    } catch (Exception $e) {
        $pdo->rollBack();
        error_log("Error processing payment_intent.succeeded: " . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Failed to process successful payment: ' . $e->getMessage()
        ];
    }
}

function handlePaymentIntentFailed($paymentIntent) {
    global $pdo;
    
    try {
        // Update stripe_payments table
        $stmt = $pdo->prepare("
            UPDATE stripe_payments 
            SET 
                status = 'failed',
                failure_code = ?,
                failure_message = ?,
                updated_at = NOW()
            WHERE payment_intent_id = ?
        ");
        $stmt->execute([
            $paymentIntent->last_payment_error->code ?? 'unknown',
            $paymentIntent->last_payment_error->message ?? 'Payment failed',
            $paymentIntent->id
        ]);
        
        error_log("Payment failed: " . $paymentIntent->id . " - " . ($paymentIntent->last_payment_error->message ?? 'Unknown error'));
        
        return [
            'success' => true,
            'message' => 'Payment failure recorded'
        ];
        
    } catch (Exception $e) {
        error_log("Error processing payment_intent.payment_failed: " . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Failed to record payment failure'
        ];
    }
}

function handlePaymentIntentCanceled($paymentIntent) {
    global $pdo;
    
    try {
        // Update stripe_payments table
        $stmt = $pdo->prepare("
            UPDATE stripe_payments 
            SET 
                status = 'canceled',
                updated_at = NOW()
            WHERE payment_intent_id = ?
        ");
        $stmt->execute([$paymentIntent->id]);
        
        error_log("Payment canceled: " . $paymentIntent->id);
        
        return [
            'success' => true,
            'message' => 'Payment cancellation recorded'
        ];
        
    } catch (Exception $e) {
        error_log("Error processing payment_intent.canceled: " . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Failed to record payment cancellation'
        ];
    }
}

function handlePaymentIntentRequiresAction($paymentIntent) {
    global $pdo;
    
    try {
        // Update stripe_payments table to track 3DS authentication requirement
        $stmt = $pdo->prepare("
            UPDATE stripe_payments 
            SET 
                status = 'requires_action',
                requires_action = 1,
                updated_at = NOW()
            WHERE payment_intent_id = ?
        ");
        $stmt->execute([$paymentIntent->id]);
        
        error_log("Payment requires action (3DS): " . $paymentIntent->id);
        
        return [
            'success' => true,
            'message' => '3DS authentication requirement recorded'
        ];
        
    } catch (Exception $e) {
        error_log("Error processing payment_intent.requires_action: " . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Failed to record 3DS requirement'
        ];
    }
}

function handleChargeDisputeCreated($dispute) {
    global $pdo;
    
    try {
        // Log dispute for manual review
        $stmt = $pdo->prepare("
            INSERT INTO payment_disputes (
                stripe_dispute_id, charge_id, amount, currency, 
                reason, status, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $dispute->id,
            $dispute->charge,
            $dispute->amount / 100,
            strtoupper($dispute->currency),
            $dispute->reason,
            $dispute->status
        ]);
        
        error_log("Charge dispute created: " . $dispute->id . " for charge: " . $dispute->charge);
        
        return [
            'success' => true,
            'message' => 'Dispute recorded for manual review'
        ];
        
    } catch (Exception $e) {
        error_log("Error processing charge.dispute.created: " . $e->getMessage());
        return [
            'success' => false,
            'message' => 'Failed to record dispute'
        ];
    }
}

function handleInvoicePaymentSucceeded($invoice) {
    // Handle subscription payments if needed in the future
    error_log("Invoice payment succeeded: " . $invoice->id);
    
    return [
        'success' => true,
        'message' => 'Invoice payment processed'
    ];
}

function handleSubscriptionEvent($subscription, $eventType) {
    // Handle subscription events if needed in the future
    error_log("Subscription event: " . $eventType . " - " . $subscription->id);
    
    return [
        'success' => true,
        'message' => 'Subscription event processed'
    ];
}
?>