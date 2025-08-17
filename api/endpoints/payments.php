<?php
/**
 * Stripe Payment Endpoints for VideoHub
 * Handles payment processing with Stripe integration
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/StripeService.php';

// Handle CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Parse input data
$input = json_decode(file_get_contents('php://input'), true);

// Initialize database and services
try {
    $database = new Database();
    $stripeService = new StripeService($database);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Service initialization failed'
    ]);
    exit;
}

// Route handling
try {
    switch ($method) {
        case 'POST':
            if (strpos($path, '/payments/create-payment-intent') !== false) {
                handleCreatePaymentIntent($stripeService, $input, $database);
            } elseif (strpos($path, '/payments/confirm-payment') !== false) {
                handleConfirmPayment($stripeService, $input, $database);
            } elseif (strpos($path, '/payments/webhook') !== false) {
                handleStripeWebhook($stripeService);
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Payment endpoint not found'
                ]);
            }
            break;
            
        case 'GET':
            if (strpos($path, '/payments/history') !== false) {
                handlePaymentHistory($stripeService, $_GET);
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Payment endpoint not found'
                ]);
            }
            break;
            
        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'Method not allowed'
            ]);
            break;
    }
} catch (Exception $e) {
    error_log("Payment API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error'
    ]);
}

/**
 * Create a Stripe Payment Intent
 */
function handleCreatePaymentIntent($stripeService, $input, $database) {
    header('Content-Type: application/json');
    
    // Validate input
    if (!isset($input['video_id']) || !isset($input['user_id']) || !isset($input['amount'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Missing required fields: video_id, user_id, amount'
        ]);
        return;
    }
    
    $videoId = (int)$input['video_id'];
    $userId = (int)$input['user_id'];
    $amount = (float)$input['amount'];
    
    // Validate amount
    if ($amount <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid amount'
        ]);
        return;
    }
    
    try {
        // Check if user already purchased this video
        $db = $database->getConnection();
        $stmt = $db->prepare("SELECT id FROM purchases WHERE video_id = ? AND user_id_new = ?");
        $stmt->execute([$videoId, $userId]);
        
        if ($stmt->fetch()) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Video already purchased'
            ]);
            return;
        }
        
        // Get video details for metadata
        $stmt = $db->prepare("SELECT title, description FROM videos WHERE id = ?");
        $stmt->execute([$videoId]);
        $video = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$video) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Video not found'
            ]);
            return;
        }
        
        // Create payment intent
        $metadata = [
            'video_id' => $videoId,
            'user_id' => $userId,
            'video_title' => $video['title'],
            'platform' => 'VideoHub'
        ];
        
        $result = $stripeService->createPaymentIntent($amount, 'usd', $metadata);
        
        if ($result['success']) {
            // Store payment record in database
            $paymentId = $stripeService->storePaymentRecord(
                $result['payment_intent_id'],
                $videoId,
                $userId,
                $amount
            );
            
            if ($paymentId) {
                echo json_encode([
                    'success' => true,
                    'client_secret' => $result['client_secret'],
                    'payment_intent_id' => $result['payment_intent_id']
                ]);
            } else {
                http_response_code(500);
                echo json_encode([
                    'success' => false,
                    'message' => 'Failed to record payment'
                ]);
            }
        } else {
            http_response_code(400);
            echo json_encode($result);
        }
        
    } catch (Exception $e) {
        error_log("Create Payment Intent Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Payment creation failed'
        ]);
    }
}

/**
 * Confirm payment and create purchase record
 */
function handleConfirmPayment($stripeService, $input, $database) {
    header('Content-Type: application/json');
    
    // Validate input
    if (!isset($input['payment_intent_id']) || !isset($input['video_id']) || !isset($input['user_id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Missing required fields'
        ]);
        return;
    }
    
    $paymentIntentId = $input['payment_intent_id'];
    $videoId = (int)$input['video_id'];
    $userId = (int)$input['user_id'];
    
    try {
        // Confirm payment with Stripe
        $confirmResult = $stripeService->confirmPayment($paymentIntentId);
        
        if ($confirmResult['success'] && $confirmResult['status'] === 'succeeded') {
            // Update payment status
            $stripeService->updatePaymentStatus($paymentIntentId, 'succeeded');
            
            echo json_encode([
                'success' => true,
                'message' => 'Payment confirmed successfully',
                'payment_status' => 'succeeded'
            ]);
        } else {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Payment confirmation failed',
                'details' => $confirmResult
            ]);
        }
        
    } catch (Exception $e) {
        error_log("Confirm Payment Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Payment confirmation failed'
        ]);
    }
}

/**
 * Handle Stripe webhooks
 */
function handleStripeWebhook($stripeService) {
    $payload = file_get_contents('php://input');
    $sigHeader = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
    
    try {
        $result = $stripeService->handleWebhook($payload, $sigHeader);
        
        if ($result) {
            http_response_code(200);
            echo json_encode(['success' => true]);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false]);
        }
        
    } catch (Exception $e) {
        error_log("Webhook Error: " . $e->getMessage());
        http_response_code(400);
        echo json_encode(['success' => false]);
    }
}

/**
 * Get payment history for a user
 */
function handlePaymentHistory($stripeService, $params) {
    header('Content-Type: application/json');
    
    if (!isset($params['user_id'])) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'User ID required'
        ]);
        return;
    }
    
    $userId = (int)$params['user_id'];
    
    try {
        $payments = $stripeService->getUserPayments($userId);
        
        echo json_encode([
            'success' => true,
            'data' => $payments
        ]);
        
    } catch (Exception $e) {
        error_log("Payment History Error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to fetch payment history'
        ]);
    }
}
?>
