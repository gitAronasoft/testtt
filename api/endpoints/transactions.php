<?php
/**
 * Transaction History API for VideoHub Admin Panel
 * Provides comprehensive transaction data for all users
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Transaction.php';

header('Content-Type: application/json');

// Get database connection
$database = new Database();
$db = $database->getConnection();
$transaction = new Transaction($db);

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path_parts = explode('/', trim($path, '/'));

try {
    switch ($method) {
        case 'GET':
            if (isset($path_parts[2]) && $path_parts[2] === 'stats') {
                // Get transaction statistics: /api/transactions/stats
                getTransactionStats($transaction);
            } elseif (isset($path_parts[2]) && $path_parts[2] === 'revenue') {
                // Get revenue over time: /api/transactions/revenue
                getRevenueOverTime($transaction);
            } elseif (isset($path_parts[2]) && !empty($path_parts[2])) {
                // Get specific transaction: /api/transactions/{id}
                getTransactionById($transaction, $path_parts[2]);
            } else {
                // Get all transactions: /api/transactions
                getAllTransactions($transaction);
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
    error_log("Transaction API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Internal server error'
    ]);
}

/**
 * Get all transactions with filtering and pagination
 */
function getAllTransactions($transaction) {
    $filters = [];
    
    // Extract filters from query parameters
    if (isset($_GET['user_id'])) $filters['user_id'] = $_GET['user_id'];
    if (isset($_GET['video_id'])) $filters['video_id'] = $_GET['video_id'];
    if (isset($_GET['creator_id'])) $filters['creator_id'] = $_GET['creator_id'];
    if (isset($_GET['status'])) $filters['status'] = $_GET['status'];
    if (isset($_GET['transaction_type'])) $filters['transaction_type'] = $_GET['transaction_type'];
    if (isset($_GET['payment_provider'])) $filters['payment_provider'] = $_GET['payment_provider'];
    if (isset($_GET['date_from'])) $filters['date_from'] = $_GET['date_from'];
    if (isset($_GET['date_to'])) $filters['date_to'] = $_GET['date_to'];
    if (isset($_GET['search'])) $filters['search'] = $_GET['search'];
    
    // Pagination
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? min(100, max(10, intval($_GET['limit']))) : 25;
    $offset = ($page - 1) * $limit;
    
    $filters['limit'] = $limit;
    $filters['offset'] = $offset;
    
    try {
        $stmt = $transaction->getAllTransactions($filters);
        $transactions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Format transactions for display
        $formattedTransactions = array_map(function($t) {
            return [
                'id' => $t['id'],
                'transaction_id' => $t['transaction_id'],
                'transaction_type' => $t['transaction_type'],
                'transaction_type_display' => ucwords(str_replace('_', ' ', $t['transaction_type'])),
                'user_id' => $t['user_id'],
                'buyer_name' => $t['buyer_name'] ?: 'Unknown User',
                'buyer_email' => $t['buyer_email'] ?: '',
                'buyer_role' => $t['buyer_role'] ?: 'viewer',
                'video_id' => $t['video_id'],
                'video_title' => $t['video_title'] ?: 'Unknown Video',
                'creator_name' => $t['creator_name'] ?: 'Unknown Creator',
                'creator_email' => $t['creator_email'] ?: '',
                'amount' => floatval($t['amount']),
                'amount_formatted' => '$' . number_format($t['amount'], 2),
                'currency' => $t['currency'] ?: 'USD',
                'payment_method' => $t['payment_method'] ?: 'Unknown',
                'payment_provider' => $t['payment_provider'] ?: 'Unknown',
                'stripe_payment_intent_id' => $t['stripe_payment_intent_id'],
                'stripe_customer_id' => $t['stripe_customer_id'],
                'status' => $t['status'],
                'status_display' => ucfirst($t['status']),
                'status_class' => getStatusClass($t['status']),
                'description' => $t['description'],
                'platform_fee' => floatval($t['platform_fee'] ?: 0),
                'processing_fee' => floatval($t['processing_fee'] ?: 0),
                'creator_earnings' => floatval($t['creator_earnings'] ?: 0),
                'transaction_date' => $t['transaction_date'],
                'transaction_date_formatted' => formatDate($t['transaction_date']),
                'completed_at' => $t['completed_at'],
                'created_at' => $t['created_at'],
                'updated_at' => $t['updated_at'],
                'data_source' => $t['data_source'] ?: 'legacy'
            ];
        }, $transactions);
        
        // Get total count for pagination (simplified approach)
        $totalTransactions = count($formattedTransactions);
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => [
                'transactions' => $formattedTransactions,
                'pagination' => [
                    'page' => $page,
                    'limit' => $limit,
                    'total' => $totalTransactions,
                    'has_more' => count($formattedTransactions) >= $limit
                ]
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Error fetching transactions: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to fetch transactions'
        ]);
    }
}

/**
 * Get transaction statistics
 */
function getTransactionStats($transaction) {
    $filters = [];
    
    if (isset($_GET['date_from'])) $filters['date_from'] = $_GET['date_from'];
    if (isset($_GET['date_to'])) $filters['date_to'] = $_GET['date_to'];
    
    try {
        $stats = $transaction->getTransactionStats($filters);
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => [
                'total_transactions' => intval($stats['total_transactions']),
                'total_revenue' => floatval($stats['total_revenue']),
                'total_revenue_formatted' => '$' . number_format($stats['total_revenue'], 2),
                'avg_transaction' => floatval($stats['avg_transaction']),
                'avg_transaction_formatted' => '$' . number_format($stats['avg_transaction'], 2),
                'completed_transactions' => intval($stats['completed_transactions']),
                'pending_transactions' => intval($stats['pending_transactions']),
                'failed_transactions' => intval($stats['failed_transactions']),
                'refunded_transactions' => intval($stats['refunded_transactions']),
                'unique_customers' => intval($stats['unique_customers']),
                'videos_purchased' => intval($stats['videos_purchased']),
                'success_rate' => $stats['total_transactions'] > 0 ? 
                    round(($stats['completed_transactions'] / $stats['total_transactions']) * 100, 1) : 0
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Error fetching transaction stats: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to fetch transaction statistics'
        ]);
    }
}

/**
 * Get revenue over time for charts
 */
function getRevenueOverTime($transaction) {
    $period = isset($_GET['period']) ? $_GET['period'] : '30days';
    
    try {
        $revenueData = $transaction->getRevenueOverTime($period);
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'data' => [
                'period' => $period,
                'revenue_data' => $revenueData
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("Error fetching revenue data: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to fetch revenue data'
        ]);
    }
}

/**
 * Get specific transaction by ID
 */
function getTransactionById($transaction, $transactionId) {
    try {
        $transactionData = $transaction->getTransactionById($transactionId);
        
        if ($transactionData) {
            // Format transaction data
            $formatted = [
                'transaction_id' => $transactionData['transaction_id'],
                'transaction_type' => $transactionData['transaction_type'],
                'transaction_type_display' => ucwords(str_replace('_', ' ', $transactionData['transaction_type'])),
                'buyer_name' => $transactionData['buyer_name'] ?: 'Unknown User',
                'buyer_email' => $transactionData['buyer_email'] ?: '',
                'video_title' => $transactionData['video_title'] ?: 'Unknown Video',
                'creator_name' => $transactionData['creator_name'] ?: 'Unknown Creator',
                'creator_email' => $transactionData['creator_email'] ?: '',
                'amount' => floatval($transactionData['amount']),
                'amount_formatted' => '$' . number_format($transactionData['amount'], 2),
                'currency' => $transactionData['currency'] ?: 'USD',
                'payment_method' => $transactionData['payment_method'] ?: 'Unknown',
                'payment_provider' => $transactionData['payment_provider'] ?: 'Unknown',
                'stripe_payment_intent_id' => $transactionData['stripe_payment_intent_id'],
                'status' => $transactionData['status'],
                'status_display' => ucfirst($transactionData['status']),
                'status_class' => getStatusClass($transactionData['status']),
                'metadata' => $transactionData['metadata'],
                'transaction_date' => $transactionData['transaction_date'],
                'transaction_date_formatted' => formatDate($transactionData['transaction_date']),
                'created_at' => $transactionData['created_at'],
                'updated_at' => $transactionData['updated_at']
            ];
            
            http_response_code(200);
            echo json_encode([
                'success' => true,
                'data' => $formatted
            ]);
        } else {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Transaction not found'
            ]);
        }
        
    } catch (Exception $e) {
        error_log("Error fetching transaction: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to fetch transaction'
        ]);
    }
}

/**
 * Helper function to get status CSS class
 */
function getStatusClass($status) {
    switch ($status) {
        case 'completed':
            return 'success';
        case 'pending':
            return 'warning';
        case 'failed':
            return 'danger';
        case 'cancelled':
            return 'secondary';
        case 'refunded':
            return 'info';
        case 'disputed':
            return 'danger';
        default:
            return 'secondary';
    }
}

/**
 * Helper function to format date
 */
function formatDate($dateString) {
    if (!$dateString) return '';
    return date('M d, Y g:i A', strtotime($dateString));
}
?>