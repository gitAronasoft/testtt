<?php
/**
 * Stripe Payment Service for VideoHub
 * Handles all Stripe payment processing and webhook management
 */

require_once __DIR__ . '/../../vendor/autoload.php';

class StripeService {
    private $stripe;
    private $db;
    private $logger;

    public function __construct($database) {
        $this->db = $database->getConnection();
        
        // Get Stripe secret key from environment
        $stripeSecretKey = "sk_test_51MMBpLLzvpT6nLjbghXOEgosU07FYeXTUM5q4G5Q3lewgrQx0WZqVd5LsrLsuX80AL9xa6AJCeiXxyRynRLem33100J0m9m9Sf";
        
        if (!$stripeSecretKey) {
            throw new Exception('Stripe secret key not configured');
        }
        
        // Initialize Stripe
        \Stripe\Stripe::setApiKey($stripeSecretKey);
        
        // Initialize logging
        $this->initializeLogger();
    }

    private function initializeLogger() {
        $logDir = __DIR__ . '/../../logs';
        if (!file_exists($logDir)) {
            mkdir($logDir, 0755, true);
        }
        $this->logger = $logDir . '/stripe_payments.log';
    }

    private function log($message, $data = null) {
        $timestamp = date('Y-m-d H:i:s');
        $logEntry = "[{$timestamp}] {$message}";
        if ($data) {
            $logEntry .= " | Data: " . json_encode($data, JSON_UNESCAPED_SLASHES);
        }
        file_put_contents($this->logger, $logEntry . PHP_EOL, FILE_APPEND);
    }

    /**
     * Create a Payment Intent for one-time payment
     */
    public function createPaymentIntent($amount, $currency = 'usd', $metadata = []) {
        try {
            $this->log("Creating Payment Intent", ['amount' => $amount, 'currency' => $currency]);

            $paymentIntent = \Stripe\PaymentIntent::create([
                'amount' => $amount * 100, // Convert to cents
                'currency' => $currency,
                'metadata' => $metadata,
                'payment_method_types' => ['card'],
                'capture_method' => 'automatic',
            ]);

            $this->log("Payment Intent created successfully", ['id' => $paymentIntent->id]);

            return [
                'success' => true,
                'client_secret' => $paymentIntent->client_secret,
                'payment_intent_id' => $paymentIntent->id
            ];

        } catch (\Stripe\Exception\CardException $e) {
            $this->log("Card error", ['error' => $e->getError()->message]);
            return [
                'success' => false,
                'error' => $e->getError()->message
            ];
        } catch (\Stripe\Exception\RateLimitException $e) {
            $this->log("Rate limit error");
            return [
                'success' => false,
                'error' => 'Too many requests made to the API too quickly'
            ];
        } catch (\Stripe\Exception\InvalidRequestException $e) {
            $this->log("Invalid parameters", ['error' => $e->getMessage()]);
            return [
                'success' => false,
                'error' => 'Invalid parameters'
            ];
        } catch (\Stripe\Exception\AuthenticationException $e) {
            $this->log("Authentication failed");
            return [
                'success' => false,
                'error' => 'Authentication with Stripe failed'
            ];
        } catch (\Stripe\Exception\ApiConnectionException $e) {
            $this->log("Network error");
            return [
                'success' => false,
                'error' => 'Network communication with Stripe failed'
            ];
        } catch (\Stripe\Exception\ApiErrorException $e) {
            $this->log("Generic API error", ['error' => $e->getMessage()]);
            return [
                'success' => false,
                'error' => 'Payment processing error'
            ];
        }
    }

    /**
     * Confirm a Payment Intent
     */
    public function confirmPayment($paymentIntentId) {
        try {
            $paymentIntent = \Stripe\PaymentIntent::retrieve($paymentIntentId);
            
            if ($paymentIntent->status === 'requires_payment_method') {
                return [
                    'success' => false,
                    'error' => 'Payment method required'
                ];
            }

            $this->log("Payment confirmed", ['payment_intent_id' => $paymentIntentId, 'status' => $paymentIntent->status]);

            return [
                'success' => true,
                'status' => $paymentIntent->status,
                'payment_intent' => $paymentIntent
            ];

        } catch (\Exception $e) {
            $this->log("Payment confirmation error", ['error' => $e->getMessage()]);
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Store payment transaction in database
     */
    public function storePaymentRecord($paymentIntentId, $videoId, $userId, $amount) {
        try {
            $stmt = $this->db->prepare("
                INSERT INTO stripe_payments 
                (payment_intent_id, video_id, user_id, amount, status, created_at) 
                VALUES (?, ?, ?, ?, 'pending', NOW())
            ");
            
            $result = $stmt->execute([$paymentIntentId, $videoId, $userId, $amount]);
            
            if ($result) {
                $paymentId = $this->db->lastInsertId();
                $this->log("Payment record stored", ['payment_id' => $paymentId, 'payment_intent_id' => $paymentIntentId]);
                return $paymentId;
            }
            
            return false;
            
        } catch (Exception $e) {
            $this->log("Database error storing payment", ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Update payment status in database
     */
    public function updatePaymentStatus($paymentIntentId, $status, $metadata = []) {
        try {
            $stmt = $this->db->prepare("
                UPDATE stripe_payments 
                SET status = ?, updated_at = NOW(), metadata = ? 
                WHERE payment_intent_id = ?
            ");
            
            $result = $stmt->execute([$status, json_encode($metadata), $paymentIntentId]);
            
            if ($result && $status === 'succeeded') {
                // Also create purchase record for successful payments
                $this->createPurchaseRecord($paymentIntentId);
            }
            
            $this->log("Payment status updated", ['payment_intent_id' => $paymentIntentId, 'status' => $status]);
            return $result;
            
        } catch (Exception $e) {
            $this->log("Error updating payment status", ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Create purchase record after successful payment
     */
    private function createPurchaseRecord($paymentIntentId) {
        try {
            // Get payment details
            $stmt = $this->db->prepare("SELECT * FROM stripe_payments WHERE payment_intent_id = ?");
            $stmt->execute([$paymentIntentId]);
            $payment = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$payment) {
                return false;
            }
            
            // Check if purchase already exists
            $stmt = $this->db->prepare("SELECT id FROM purchases WHERE video_id = ? AND user_id_new = ?");
            $stmt->execute([$payment['video_id'], $payment['user_id']]);
            $existingPurchase = $stmt->fetch();
            
            if ($existingPurchase) {
                $this->log("Purchase already exists", ['payment_intent_id' => $paymentIntentId]);
                return $existingPurchase['id'];
            }
            
            // Create new purchase record
            $stmt = $this->db->prepare("
                INSERT INTO purchases (video_id, user_id_new, amount, purchased_at, payment_intent_id) 
                VALUES (?, ?, ?, NOW(), ?)
            ");
            
            $result = $stmt->execute([
                $payment['video_id'],
                $payment['user_id'],
                $payment['amount'],
                $paymentIntentId
            ]);
            
            if ($result) {
                $purchaseId = $this->db->lastInsertId();
                $this->log("Purchase record created", ['purchase_id' => $purchaseId, 'payment_intent_id' => $paymentIntentId]);
                return $purchaseId;
            }
            
            return false;
            
        } catch (Exception $e) {
            $this->log("Error creating purchase record", ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Handle Stripe webhook events
     */
    public function handleWebhook($payload, $sigHeader) {
        $endpoint_secret = $_ENV['STRIPE_WEBHOOK_SECRET'] ?? getenv('STRIPE_WEBHOOK_SECRET');
        
        if (!$endpoint_secret) {
            $this->log("Webhook secret not configured");
            return false;
        }

        try {
            $event = \Stripe\Webhook::constructEvent($payload, $sigHeader, $endpoint_secret);
            $this->log("Webhook received", ['type' => $event->type, 'id' => $event->id]);

            switch ($event->type) {
                case 'payment_intent.succeeded':
                    $paymentIntent = $event->data->object;
                    $this->updatePaymentStatus($paymentIntent->id, 'succeeded', $paymentIntent->toArray());
                    break;
                    
                case 'payment_intent.payment_failed':
                    $paymentIntent = $event->data->object;
                    $this->updatePaymentStatus($paymentIntent->id, 'failed', $paymentIntent->toArray());
                    break;
                    
                case 'payment_intent.canceled':
                    $paymentIntent = $event->data->object;
                    $this->updatePaymentStatus($paymentIntent->id, 'canceled', $paymentIntent->toArray());
                    break;
                    
                default:
                    $this->log("Unhandled webhook event", ['type' => $event->type]);
            }

            return true;

        } catch (\UnexpectedValueException $e) {
            $this->log("Webhook signature verification failed", ['error' => $e->getMessage()]);
            return false;
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            $this->log("Webhook signature verification failed", ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Get payment details by Payment Intent ID
     */
    public function getPaymentDetails($paymentIntentId) {
        try {
            $stmt = $this->db->prepare("SELECT * FROM stripe_payments WHERE payment_intent_id = ?");
            $stmt->execute([$paymentIntentId]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $this->log("Error getting payment details", ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Get all payments for a user
     */
    public function getUserPayments($userId) {
        try {
            $stmt = $this->db->prepare("
                SELECT sp.*, v.title as video_title 
                FROM stripe_payments sp 
                LEFT JOIN videos v ON sp.video_id = v.id 
                WHERE sp.user_id = ? 
                ORDER BY sp.created_at DESC
            ");
            $stmt->execute([$userId]);
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $this->log("Error getting user payments", ['error' => $e->getMessage()]);
            return [];
        }
    }
}
?>