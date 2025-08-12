<?php
/**
 * Purchases API Endpoints for VideoHub
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Purchase.php';

// Get database connection
$database = new Database();
$db = $database->getConnection();

// Initialize purchase object
$purchase = new Purchase($db);

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path_parts = explode('/', trim($path, '/'));

try {
    switch ($method) {
        case 'GET':
            if (isset($path_parts[2]) && is_numeric($path_parts[2])) {
                // Get specific purchase
                $purchase->id = $path_parts[2];
                if ($purchase->readOne()) {
                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'data' => [
                            'id' => $purchase->id,
                            'viewer_id' => $purchase->viewer_id,
                            'video_id' => $purchase->video_id,
                            'amount' => $purchase->amount,
                            'payment_method' => $purchase->payment_method,
                            'transaction_id' => $purchase->transaction_id,
                            'status' => $purchase->status,
                            'purchase_date' => $purchase->purchase_date
                        ]
                    ]);
                } else {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Purchase not found'
                    ]);
                }
            } else {
                // Get all purchases with filters
                $filters = [];
                
                if (isset($_GET['viewer_id'])) {
                    $filters['user_id'] = $_GET['viewer_id'];
                }
                
                if (isset($_GET['video_id'])) {
                    $filters['video_id'] = $_GET['video_id'];
                }
                
                if (isset($_GET['status'])) {
                    $filters['status'] = $_GET['status'];
                }
                
                if (isset($_GET['limit'])) {
                    $filters['limit'] = (int)$_GET['limit'];
                }
                
                if (isset($_GET['offset'])) {
                    $filters['offset'] = (int)$_GET['offset'];
                }

                // For demo purposes, return sample purchase data until database table is set up
                $purchases = [
                    [
                        'id' => 1,
                        'viewerId' => 2,
                        'videoId' => 1,
                        'amount' => 0,
                        'status' => 'completed',
                        'purchaseDate' => '2025-08-12',
                        'paymentMethod' => 'card'
                    ],
                    [
                        'id' => 2,
                        'viewerId' => 2,
                        'videoId' => 3,
                        'amount' => 60,
                        'status' => 'completed',
                        'purchaseDate' => '2025-08-11',
                        'paymentMethod' => 'paypal'
                    ]
                ];
                
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'data' => ['purchases' => $purchases]
                ]);
            }
            break;

        case 'POST':
            // Create new purchase
            $data = json_decode(file_get_contents("php://input"), true);
            
            if (!empty($data['viewer_id']) && !empty($data['video_id']) && !empty($data['amount'])) {
                $purchase->viewer_id = $data['viewer_id'];
                $purchase->video_id = $data['video_id'];
                $purchase->amount = $data['amount'];
                $purchase->payment_method = $data['payment_method'] ?? 'card';
                $purchase->transaction_id = $data['transaction_id'] ?? uniqid('txn_');
                $purchase->status = $data['status'] ?? 'completed';
                
                if ($purchase->create()) {
                    http_response_code(201);
                    echo json_encode([
                        'success' => true,
                        'message' => 'Purchase created successfully',
                        'data' => [
                            'id' => $purchase->id,
                            'transaction_id' => $purchase->transaction_id
                        ]
                    ]);
                } else {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Unable to create purchase'
                    ]);
                }
            } else {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Missing required fields: viewer_id, video_id, amount'
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
?>