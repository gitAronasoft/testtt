<?php
/**
 * Statistics API Endpoint for VideoHub
 * Provides dashboard statistics for all user roles
 */

header('Content-Type: application/json');
require_once __DIR__ . '/../config/cors.php';

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/Transaction.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/Video.php';
require_once __DIR__ . '/../services/AuthService.php';

try {
    // Initialize database connection
    $database = new Database();
    $db = $database->getConnection();

    // Initialize models and services
    $transaction = new Transaction($db);
    $user = new User($db);
    $video = new Video($db);
    $authService = new AuthService($db);

    // Get and validate auth token
    $token = $authService->getBearerToken();
    if (!$token) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Access token required']);
        exit;
    }

    $authUser = $authService->validateToken($token);
    if (!$authUser) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
        exit;
    }

    switch ($_SERVER['REQUEST_METHOD']) {
        case 'GET':
            $stats = [];
            
            // Role-based statistics
            switch ($authUser['role']) {
                case 'admin':
                    // Admin gets platform-wide statistics
                    $stats = [
                        // User statistics
                        'total_users' => $user->count(),
                        'active_users' => $user->count(['status' => 'active']),
                        'creators' => $user->count(['role' => 'creator']),
                        'viewers' => $user->count(['role' => 'viewer']),
                        
                        // Video statistics
                        'total_videos' => $video->count(),
                        'active_videos' => $video->count(['status' => 'active']),
                        
                        // Transaction statistics
                        'transaction_stats' => $transaction->getStats(),
                        
                        // Recent activity
                        'recent_transactions' => $transaction->getRecent(10)->fetchAll(),
                        'recent_users' => $user->read(['limit' => 10])->fetchAll(),
                        'recent_videos' => $video->read(['limit' => 10])->fetchAll()
                    ];
                    break;
                    
                case 'creator':
                    // Creator gets their video and earnings statistics
                    $userTransactionStats = $transaction->getStats(['user_id' => $authUser['id']]);
                    $userVideos = $video->count(['uploader_id' => $authUser['id']]);
                    
                    $stats = [
                        'total_videos' => $userVideos,
                        'total_earnings' => $userTransactionStats['completed_amount'] ?? 0,
                        'pending_earnings' => $userTransactionStats['pending_transactions'] ?? 0,
                        'completed_sales' => $userTransactionStats['completed_transactions'] ?? 0,
                        'failed_transactions' => $userTransactionStats['failed_transactions'] ?? 0,
                        
                        // Creator's recent activity
                        'recent_transactions' => $transaction->getRecent(10, $authUser['id'])->fetchAll(),
                        'recent_videos' => $video->read([
                            'uploader_id' => $authUser['id'], 
                            'limit' => 10
                        ])->fetchAll()
                    ];
                    break;
                    
                case 'viewer':
                    // Viewer gets their purchase history statistics
                    $userTransactionStats = $transaction->getStats(['user_id' => $authUser['id']]);
                    
                    $stats = [
                        'total_purchases' => $userTransactionStats['total_transactions'] ?? 0,
                        'total_spent' => $userTransactionStats['total_amount'] ?? 0,
                        'successful_purchases' => $userTransactionStats['completed_transactions'] ?? 0,
                        'failed_purchases' => $userTransactionStats['failed_transactions'] ?? 0,
                        
                        // Viewer's recent activity
                        'recent_purchases' => $transaction->getRecent(10, $authUser['id'])->fetchAll()
                    ];
                    break;
                    
                default:
                    http_response_code(403);
                    echo json_encode(['success' => false, 'message' => 'Access denied']);
                    exit;
            }

            echo json_encode([
                'success' => true,
                'data' => $stats,
                'user_role' => $authUser['role']
            ]);
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