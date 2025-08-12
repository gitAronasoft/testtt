<?php
/**
 * Payment Processing API Endpoints for VideoHub
 * Handles video purchases and payment processing
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/User.php';

// Get database connection
$database = new Database();
$db = $database->getConnection();

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path_parts = explode('/', trim($path, '/'));

// Parse input data
$input = json_decode(file_get_contents('php://input'), true);

try {
    switch ($method) {
        case 'POST':
            if (isset($path_parts[2]) && $path_parts[2] === 'purchase') {
                // Process video purchase
                $videoId = $input['video_id'] ?? null;
                $userId = $input['user_id'] ?? null;
                $paymentMethod = $input['payment_method'] ?? 'card';
                $paymentDetails = $input['payment_details'] ?? [];
                
                if (!$videoId || !$userId) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Video ID and User ID are required'
                    ]);
                    return;
                }
                
                // Check if video exists
                $stmt = $db->prepare("SELECT id, title, price, user_id as creator_id FROM videos WHERE id = ?");
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
                
                // Check if user already purchased this video
                $stmt = $db->prepare("SELECT id FROM purchases WHERE video_id = ? AND user_id_new = ?");
                $stmt->execute([$videoId, $userId]);
                $existingPurchase = $stmt->fetch();
                
                if ($existingPurchase) {
                    http_response_code(409);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Video already purchased'
                    ]);
                    return;
                }
                
                // Simulate payment processing
                $paymentSuccess = processPayment($paymentMethod, $paymentDetails, $video['price']);
                
                if (!$paymentSuccess['success']) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Payment failed: ' . $paymentSuccess['message']
                    ]);
                    return;
                }
                
                // Create purchase record
                $stmt = $db->prepare("
                    INSERT INTO purchases (video_id, user_id_new, amount, purchased_at) 
                    VALUES (?, ?, ?, NOW())
                ");
                
                $stmt->execute([$videoId, $userId, $video['price']]);
                $purchaseId = $db->lastInsertId();
                
                // Create earnings record for creator (if earnings table exists)
                try {
                    $stmt = $db->prepare("
                        INSERT INTO earnings (creator_id, video_id, amount, date) 
                        VALUES (?, ?, ?, CURDATE())
                    ");
                    $creatorEarnings = $video['price'] * 0.8; // 80% to creator, 20% platform fee
                    $stmt->execute([$video['creator_id'], $videoId, $creatorEarnings]);
                } catch (Exception $e) {
                    // Earnings table might not exist, continue without it
                    error_log("Could not create earnings record: " . $e->getMessage());
                }
                
                http_response_code(201);
                echo json_encode([
                    'success' => true,
                    'message' => 'Purchase completed successfully',
                    'data' => [
                        'purchase_id' => $purchaseId,
                        'video_title' => $video['title'],
                        'amount' => $video['price'],
                        'payment_method' => $paymentMethod
                    ]
                ]);
                
            } elseif (isset($path_parts[2]) && $path_parts[2] === 'verify-payment') {
                // Verify payment status by purchase ID
                $purchaseId = $input['purchase_id'] ?? null;
                
                if (!$purchaseId) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Purchase ID is required'
                    ]);
                    return;
                }
                
                $stmt = $db->prepare("SELECT * FROM purchases WHERE id = ?");
                $stmt->execute([$purchaseId]);
                $purchase = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if (!$purchase) {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Purchase not found'
                    ]);
                    return;
                }
                
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'amount' => $purchase['amount'],
                        'purchase_date' => $purchase['purchased_at']
                    ]
                ]);
                
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Payment endpoint not found'
                ]);
            }
            break;
            
        case 'GET':
            if (isset($path_parts[2]) && $path_parts[2] === 'check-access') {
                // Check if user has access to a video
                $videoId = $_GET['video_id'] ?? null;
                $userId = $_GET['user_id'] ?? null;
                
                if (!$videoId || !$userId) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Video ID and User ID are required'
                    ]);
                    return;
                }
                
                $stmt = $db->prepare("SELECT id FROM purchases WHERE video_id = ? AND user_id_new = ?");
                $stmt->execute([$videoId, $userId]);
                $purchase = $stmt->fetch();
                
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'has_access' => !!$purchase,
                    'message' => $purchase ? 'User has access to this video' : 'Purchase required to access video'
                ]);
                
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
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}

/**
 * Simulate payment processing
 * In a real application, this would integrate with payment providers like Stripe, PayPal, etc.
 */
function processPayment($method, $details, $amount) {
    // Simulate different payment scenarios
    if ($amount <= 0) {
        return ['success' => false, 'message' => 'Invalid amount'];
    }
    
    switch ($method) {
        case 'card':
            // Simulate card validation
            if (empty($details['card_number']) || empty($details['expiry']) || empty($details['cvv'])) {
                return ['success' => false, 'message' => 'Invalid card details'];
            }
            
            // Simulate card processing (always success for demo)
            return ['success' => true, 'message' => 'Card payment processed successfully'];
            
        case 'paypal':
            // Simulate PayPal processing
            if (empty($details['paypal_email'])) {
                return ['success' => false, 'message' => 'PayPal email required'];
            }
            
            return ['success' => true, 'message' => 'PayPal payment processed successfully'];
            
        case 'crypto':
            // Simulate crypto payment
            if (empty($details['wallet_address'])) {
                return ['success' => false, 'message' => 'Wallet address required'];
            }
            
            return ['success' => true, 'message' => 'Crypto payment processed successfully'];
            
        default:
            return ['success' => false, 'message' => 'Unsupported payment method'];
    }
}
?>