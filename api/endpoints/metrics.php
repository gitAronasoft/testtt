<?php
/**
 * Metrics API Endpoints for VideoHub
 * Provides real-time statistics and dashboard metrics
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

try {
    switch ($method) {
        case 'GET':
            if (isset($path_parts[2]) && $path_parts[2] === 'admin') {
                // Admin dashboard metrics
                $metrics = [];
                
                // Total users
                $stmt = $db->query("SELECT COUNT(*) as count FROM users");
                $metrics['totalUsers'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
                
                // Total videos
                $stmt = $db->query("SELECT COUNT(*) as count FROM videos");
                $metrics['totalVideos'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
                
                // Total purchases/sales
                $stmt = $db->query("SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as revenue FROM purchases");
                $purchaseData = $stmt->fetch(PDO::FETCH_ASSOC);
                $metrics['totalPurchases'] = $purchaseData['count'];
                $metrics['totalRevenue'] = number_format($purchaseData['revenue'], 2);
                
                // New users this month
                $stmt = $db->query("SELECT COUNT(*) as count FROM users WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)");
                $metrics['newUsersThisMonth'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
                
                // Active users (simplified - count users with recent purchases)
                $stmt = $db->query("SELECT COUNT(DISTINCT user_id_new) as count FROM purchases WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)");
                $metrics['activeUsers'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
                
                // Total views across all videos
                $stmt = $db->query("SELECT COALESCE(SUM(views), 0) as total FROM videos");
                $metrics['totalViews'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
                
                // Pending videos (simplified - count all videos, no complex review status)
                $stmt = $db->query("SELECT COUNT(*) as count FROM videos WHERE status IS NULL OR status = 'pending'");
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                $metrics['pendingVideos'] = $result ? $result['count'] : 0;
                
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'data' => $metrics
                ]);
                
            } elseif (isset($path_parts[2]) && $path_parts[2] === 'creator') {
                // Creator dashboard metrics
                $creatorId = $_GET['creator_id'] ?? null;
                
                if (!$creatorId) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Creator ID is required'
                    ]);
                    return;
                }
                
                $metrics = [];
                
                // Fix user_id data type issue by converting to int
                $stmt = $db->query("UPDATE videos SET user_id = CAST(user_id AS UNSIGNED) WHERE user_id REGEXP '^[0-9]+$'");
                
                // Total videos by creator
                $stmt = $db->prepare("SELECT COUNT(*) as count FROM videos WHERE CAST(user_id AS UNSIGNED) = ?");
                $stmt->execute([$creatorId]);
                $metrics['totalVideos'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
                
                // Total views by creator
                $stmt = $db->prepare("SELECT COALESCE(SUM(views), 0) as total FROM videos WHERE CAST(user_id AS UNSIGNED) = ?");
                $stmt->execute([$creatorId]);
                $metrics['totalViews'] = $stmt->fetch(PDO::FETCH_ASSOC)['total'];
                
                // Total earnings by creator from purchases table
                $stmt = $db->prepare("
                    SELECT COALESCE(SUM(p.amount), 0) as total 
                    FROM purchases p 
                    JOIN videos v ON p.video_id = v.id 
                    WHERE CAST(v.user_id AS UNSIGNED) = ?
                ");
                $stmt->execute([$creatorId]);
                $metrics['totalEarnings'] = number_format($stmt->fetch(PDO::FETCH_ASSOC)['total'], 2);
                
                // Subscribers (for now, count unique purchasers of this creator's videos)
                $stmt = $db->prepare("
                    SELECT COUNT(DISTINCT p.user_id_new) as count 
                    FROM purchases p 
                    JOIN videos v ON p.video_id = v.id 
                    WHERE CAST(v.user_id AS UNSIGNED) = ? AND p.user_id_new IS NOT NULL
                ");
                $stmt->execute([$creatorId]);
                $metrics['subscribers'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
                
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'data' => $metrics
                ]);
                
            } elseif (isset($path_parts[2]) && $path_parts[2] === 'viewer') {
                // Viewer dashboard metrics - General platform metrics (not user-specific)
                $metrics = [];
                
                // Total available videos for browsing
                $stmt = $db->query("SELECT COUNT(*) as count FROM videos");
                $metrics['totalVideosCount'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
                
                // Total platform purchases (shows activity)
                $stmt = $db->query("SELECT COUNT(*) as count FROM purchases");
                $metrics['totalPurchases'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
                
                // Total platform revenue (shows platform success)
                $stmt = $db->query("SELECT COALESCE(SUM(amount), 0) as total FROM purchases");
                $metrics['platformRevenue'] = number_format($stmt->fetch(PDO::FETCH_ASSOC)['total'], 2);
                
                // Total creators on platform
                $stmt = $db->query("SELECT COUNT(DISTINCT user_id) as count FROM videos WHERE user_id IS NOT NULL AND user_id != ''");
                $metrics['totalCreators'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
                
                // Get user-specific data if user ID provided
                $userId = $_GET['user_id'] ?? null;
                if ($userId) {
                    // User's purchased videos
                    $stmt = $db->prepare("SELECT COUNT(*) as count FROM purchases WHERE user_id_new = ?");
                    $stmt->execute([$userId]);
                    $metrics['userPurchases'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
                    
                    // User's total spent
                    $stmt = $db->prepare("SELECT COALESCE(SUM(amount), 0) as total FROM purchases WHERE user_id_new = ?");
                    $stmt->execute([$userId]);
                    $metrics['userSpent'] = number_format($stmt->fetch(PDO::FETCH_ASSOC)['total'], 2);
                } else {
                    $metrics['userPurchases'] = 0;
                    $metrics['userSpent'] = '0.00';
                }
                
                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'data' => $metrics
                ]);
                
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Metrics endpoint not found'
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