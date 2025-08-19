<?php
/**
 * Transactions API Endpoint for VideoHub
 * Handles unified transaction data from both purchases and stripe payments
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../config/cors.php';

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Transaction.php';
require_once __DIR__ . '/../services/AuthService.php';

try {
    // Initialize database connection
    $database = new Database();
    $db = $database->getConnection();

    // Initialize models and services
    $transaction = new Transaction($db);
    $authService = new AuthService($db);

    // Get and validate auth token
    $token = $authService->getBearerToken();
    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Access token required']);
        exit;
    }

    $user = $authService->validateToken($token);
    if (!$user) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
        exit;
    }

    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            // Get query parameters
            $filters = [];
            
            // Role-based filtering
            if ($user['role'] === 'admin') {
                // Admin can see all transactions
                if (isset($_GET['user_id'])) {
                    $filters['user_id'] = (int)$_GET['user_id'];
                }
            } else {
                // Non-admin users can only see their own transactions
                $filters['user_id'] = $user['id'];
            }

            // Common filters
            if (isset($_GET['video_id'])) {
                $filters['video_id'] = (int)$_GET['video_id'];
            }
            
            if (isset($_GET['status'])) {
                $filters['status'] = $_GET['status'];
            }
            
            if (isset($_GET['payment_method'])) {
                $filters['payment_method'] = $_GET['payment_method'];
            }
            
            if (isset($_GET['transaction_type'])) {
                $filters['transaction_type'] = $_GET['transaction_type'];
            }
            
            if (isset($_GET['date_from'])) {
                $filters['date_from'] = $_GET['date_from'];
            }
            
            if (isset($_GET['date_to'])) {
                $filters['date_to'] = $_GET['date_to'];
            }
            
            if (isset($_GET['search'])) {
                $filters['search'] = $_GET['search'];
            }

            // Pagination
            $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
            $limit = isset($_GET['limit']) ? min(100, max(1, (int)$_GET['limit'])) : 20;
            $offset = ($page - 1) * $limit;
            
            $filters['limit'] = $limit;
            $filters['offset'] = $offset;

            // Get transactions
            $stmt = $transaction->read($filters);
            $transactions = $stmt->fetchAll();

            // Get total count for pagination
            $totalTransactions = $transaction->count($filters);
            $totalPages = ceil($totalTransactions / $limit);

            // Get statistics
            $stats = $transaction->getStats($filters);

            // Response
            echo json_encode([
                'success' => true,
                'data' => $transactions,
                'pagination' => [
                    'current_page' => $page,
                    'total_pages' => $totalPages,
                    'total_items' => $totalTransactions,
                    'items_per_page' => $limit
                ],
                'statistics' => $stats
            ]);
            break;

        case 'POST':
            // Only admin can create transactions manually (for testing purposes)
            if ($user['role'] !== 'admin') {
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Access denied']);
                exit;
            }

            $input = json_decode(file_get_contents('php://input'), true);
            
            if (!$input) {
                http_response_code(400);
                echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
                exit;
            }

            // Validate required fields
            $requiredFields = ['user_id', 'video_id', 'amount', 'payment_method'];
            foreach ($requiredFields as $field) {
                if (!isset($input[$field])) {
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => "Field '$field' is required"]);
                    exit;
                }
            }

            // Create purchase record (transactions are read-only view)
            require_once __DIR__ . '/../models/Purchase.php';
            $purchase = new Purchase($db);
            
            $purchase->user_id = $input['user_id'];
            $purchase->video_id = $input['video_id'];
            $purchase->amount = $input['amount'];
            $purchase->payment_method = $input['payment_method'];
            $purchase->transaction_id = $input['transaction_id'] ?? null;
            $purchase->status = $input['status'] ?? 'completed';

            if ($purchase->create()) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Transaction created successfully',
                    'transaction_id' => $purchase->id
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to create transaction']);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode(['success' => false, 'message' => 'Method not allowed']);
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