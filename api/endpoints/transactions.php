<?php
/**
 * Transactions API Endpoints for VideoHub
 * Handles both viewer and admin transaction views
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';

// Get database connection
$database = new Database();
$db = $database->getConnection();

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path_parts = explode('/', trim($path, '/'));

// Check if this is an admin request
$isAdminRequest = in_array('admin', $path_parts);

// Function declarations first
function getAllTransactions($db) {
    try {
        // Query to get all transactions with user and video details
        $query = "
            SELECT 
                sp.id,
                sp.payment_intent_id,
                sp.video_id,
                sp.user_id,
                sp.amount,
                sp.status,
                sp.metadata,
                sp.created_at,
                sp.updated_at,
                u.name as user_name,
                u.email as user_email,
                v.title as video_title,
                COALESCE(p.payment_method, 'stripe') as payment_method,
                p.transaction_id,
                spl.ip_address,
                spl.event_data
            FROM stripe_payments sp
            LEFT JOIN users u ON sp.user_id = u.id
            LEFT JOIN videos v ON sp.video_id = v.id
            LEFT JOIN purchases p ON sp.payment_intent_id = p.payment_intent_id
            LEFT JOIN stripe_payment_logs spl ON sp.payment_intent_id = spl.payment_intent_id
            UNION ALL
            SELECT 
                p.id,
                p.payment_intent_id,
                p.video_id,
                p.viewer_id as user_id,
                p.amount,
                CASE 
                    WHEN p.payment_intent_id IS NOT NULL THEN 'succeeded'
                    ELSE 'legacy'
                END as status,
                NULL as metadata,
                p.purchase_date as created_at,
                p.purchase_date as updated_at,
                u.name as user_name,
                u.email as user_email,
                v.title as video_title,
                p.payment_method,
                p.transaction_id,
                NULL as ip_address,
                NULL as event_data
            FROM purchases p
            LEFT JOIN users u ON p.viewer_id = u.id
            LEFT JOIN videos v ON p.video_id = v.id
            WHERE p.payment_intent_id IS NULL
            ORDER BY created_at DESC
        ";
        
        $stmt = $db->prepare($query);
        $stmt->execute();
        $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Process transactions to add failure reasons for failed transactions
        foreach ($transactions as &$transaction) {
            if ($transaction['status'] === 'failed' && $transaction['event_data']) {
                $eventData = json_decode($transaction['event_data'], true);
                if (isset($eventData['last_payment_error']['message'])) {
                    $transaction['failure_reason'] = $eventData['last_payment_error']['message'];
                }
            }
        }
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => $transactions,
            'total' => count($transactions)
        ]);
        
    } catch (Exception $e) {
        throw $e;
    }
}

function getUserTransactions($db) {
    try {
        // Get user ID from session or token
        $userId = null;
        
        // Try to get from session first
        session_start();
        if (isset($_SESSION['user_id'])) {
            $userId = $_SESSION['user_id'];
        } else {
            // Try to get from Authorization header
            $headers = getallheaders();
            if (isset($headers['Authorization'])) {
                $token = str_replace('Bearer ', '', $headers['Authorization']);
                // In a real implementation, you would decode and verify the JWT token
                // For now, we'll try to get from GET parameters as fallback
                if (isset($_GET['user_id'])) {
                    $userId = $_GET['user_id'];
                }
            }
        }
        
        if (!$userId) {
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'message' => 'User not authenticated'
            ]);
            return;
        }
        
        // Query to get user's transactions only
        $query = "
            SELECT 
                sp.id,
                sp.payment_intent_id,
                sp.video_id,
                sp.user_id,
                sp.amount,
                sp.status,
                sp.metadata,
                sp.created_at,
                sp.updated_at,
                v.title as video_title,
                COALESCE(p.payment_method, 'stripe') as payment_method,
                p.transaction_id,
                spl.event_data
            FROM stripe_payments sp
            LEFT JOIN videos v ON sp.video_id = v.id
            LEFT JOIN purchases p ON sp.payment_intent_id = p.payment_intent_id
            LEFT JOIN stripe_payment_logs spl ON sp.payment_intent_id = spl.payment_intent_id
            WHERE sp.user_id = ?
            UNION ALL
            SELECT 
                p.id,
                p.payment_intent_id,
                p.video_id,
                p.viewer_id as user_id,
                p.amount,
                CASE 
                    WHEN p.payment_intent_id IS NOT NULL THEN 'succeeded'
                    ELSE 'legacy'
                END as status,
                NULL as metadata,
                p.purchase_date as created_at,
                p.purchase_date as updated_at,
                v.title as video_title,
                p.payment_method,
                p.transaction_id,
                NULL as event_data
            FROM purchases p
            LEFT JOIN videos v ON p.video_id = v.id
            WHERE p.viewer_id = ? AND p.payment_intent_id IS NULL
            ORDER BY created_at DESC
        ";
        
        $stmt = $db->prepare($query);
        $stmt->execute([$userId, $userId]);
        $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Process transactions to add failure reasons
        foreach ($transactions as &$transaction) {
            if ($transaction['status'] === 'failed' && $transaction['event_data']) {
                $eventData = json_decode($transaction['event_data'], true);
                if (isset($eventData['last_payment_error']['message'])) {
                    $transaction['failure_reason'] = $eventData['last_payment_error']['message'];
                }
            }
        }
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => $transactions,
            'total' => count($transactions)
        ]);
        
    } catch (Exception $e) {
        throw $e;
    }
}

function processRefund($db, $transactionId) {
    try {
        // Get transaction details
        $query = "SELECT * FROM stripe_payments WHERE id = ?";
        $stmt = $db->prepare($query);
        $stmt->execute([$transactionId]);
        $transaction = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$transaction) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Transaction not found'
            ]);
            return;
        }
        
        if ($transaction['status'] !== 'succeeded') {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Only successful transactions can be refunded'
            ]);
            return;
        }
        
        // In a real implementation, you would process the refund through Stripe API
        // For now, we'll simulate the refund process
        
        // Update transaction status to refunded
        $updateQuery = "UPDATE stripe_payments SET status = 'refunded', updated_at = CURRENT_TIMESTAMP WHERE id = ?";
        $updateStmt = $db->prepare($updateQuery);
        $updateStmt->execute([$transactionId]);
        
        // Log the refund action
        $logQuery = "INSERT INTO stripe_payment_logs (payment_intent_id, event_type, event_data, created_at) 
                     VALUES (?, 'refund.created', ?, CURRENT_TIMESTAMP)";
        $logStmt = $db->prepare($logQuery);
        $logStmt->execute([
            $transaction['payment_intent_id'],
            json_encode([
                'refund_id' => 're_' . uniqid(),
                'amount' => $transaction['amount'],
                'reason' => 'requested_by_customer',
                'status' => 'succeeded'
            ])
        ]);
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Refund processed successfully'
        ]);
        
    } catch (Exception $e) {
        throw $e;
    }
}

function exportTransactions($db) {
    try {
        // Get all transactions
        $query = "
            SELECT 
                sp.payment_intent_id as 'Transaction ID',
                DATE(sp.created_at) as 'Date',
                u.name as 'User Name',
                u.email as 'User Email',
                v.title as 'Video Title',
                sp.amount as 'Amount',
                sp.status as 'Status',
                COALESCE(p.payment_method, 'stripe') as 'Payment Method'
            FROM stripe_payments sp
            LEFT JOIN users u ON sp.user_id = u.id
            LEFT JOIN videos v ON sp.video_id = v.id
            LEFT JOIN purchases p ON sp.payment_intent_id = p.payment_intent_id
            ORDER BY sp.created_at DESC
        ";
        
        $stmt = $db->prepare($query);
        $stmt->execute();
        $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Generate CSV
        header('Content-Type: text/csv');
        header('Content-Disposition: attachment; filename="transactions_' . date('Y-m-d') . '.csv"');
        
        $output = fopen('php://output', 'w');
        
        // Write headers
        if (!empty($transactions)) {
            fputcsv($output, array_keys($transactions[0]));
            
            // Write data
            foreach ($transactions as $transaction) {
                fputcsv($output, $transaction);
            }
        }
        
        fclose($output);
        
    } catch (Exception $e) {
        throw $e;
    }
}

// Main request handling
try {
    switch ($method) {
        case 'GET':
            if ($isAdminRequest) {
                // Admin: Get all transactions
                if (isset($path_parts[3]) && $path_parts[3] === 'export') {
                    // Export transactions as CSV
                    exportTransactions($db);
                } else {
                    // Get all transactions for admin
                    getAllTransactions($db);
                }
            } else {
                // Viewer: Get user's transactions only
                getUserTransactions($db);
            }
            break;
            
        case 'POST':
            if ($isAdminRequest && isset($path_parts[3]) && is_numeric($path_parts[3]) && isset($path_parts[4]) && $path_parts[4] === 'refund') {
                // Admin: Process refund
                processRefund($db, $path_parts[3]);
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Endpoint not found'
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