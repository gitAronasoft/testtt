<?php
/**
 * Admin API endpoints
 * Handles administrative functions and platform management
 */

require_once __DIR__ . '/../config/config.php';

$database = new Database();
$pdo = $database->getConnection();

if (!$pdo) {
    sendError('Database connection failed', 500);
}

$method = $_SERVER['REQUEST_METHOD'];
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$segments = explode('/', trim($requestUri, '/'));
$action = isset($segments[3]) ? $segments[3] : null;

switch ($method) {
    case 'GET':
        switch ($action) {
            case 'dashboard':
                handleGetDashboardStats($pdo);
                break;
            case 'settings':
                handleGetPlatformSettings($pdo);
                break;
            case 'logs':
                handleGetAdminLogs($pdo);
                break;
            case 'analytics':
                handleGetPlatformAnalytics($pdo);
                break;
            default:
                sendError('Invalid endpoint', 404);
        }
        break;
    case 'POST':
        switch ($action) {
            case 'moderate-video':
                handleModerateVideo($pdo);
                break;
            case 'bulk-action':
                handleBulkAction($pdo);
                break;
            default:
                sendError('Invalid endpoint', 404);
        }
        break;
    case 'PUT':
        switch ($action) {
            case 'settings':
                handleUpdatePlatformSettings($pdo);
                break;
            default:
                sendError('Invalid endpoint', 404);
        }
        break;
    default:
        sendError('Method not allowed', 405);
}

/**
 * Get dashboard statistics
 */
function handleGetDashboardStats($pdo) {
    $admin = requireAuth($pdo, ['admin']);
    
    try {
        // Get basic stats
        $stats = [];
        
        // Total users
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM users WHERE status = 'active'");
        $stats['total_users'] = $stmt->fetch()['count'];
        
        // Users by role
        $stmt = $pdo->query("
            SELECT role, COUNT(*) as count 
            FROM users 
            WHERE status = 'active' 
            GROUP BY role
        ");
        $stats['users_by_role'] = $stmt->fetchAll();
        
        // Total videos
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM videos WHERE status = 'published'");
        $stats['total_videos'] = $stmt->fetch()['count'];
        
        // Videos by status
        $stmt = $pdo->query("
            SELECT status, COUNT(*) as count 
            FROM videos 
            GROUP BY status
        ");
        $stats['videos_by_status'] = $stmt->fetchAll();
        
        // Platform revenue
        $stmt = $pdo->query("
            SELECT 
                SUM(amount) as total_revenue,
                COUNT(*) as total_transactions
            FROM video_purchases 
            WHERE payment_status = 'completed'
        ");
        $revenue = $stmt->fetch();
        $stats['platform_revenue'] = $revenue['total_revenue'] ?? 0;
        $stats['total_transactions'] = $revenue['total_transactions'] ?? 0;
        
        // Recent activity
        $stmt = $pdo->query("
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as new_users
            FROM users 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            LIMIT 30
        ");
        $stats['user_growth'] = $stmt->fetchAll();
        
        $stmt = $pdo->query("
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as new_videos
            FROM videos 
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(created_at)
            ORDER BY date DESC
            LIMIT 30
        ");
        $stats['video_growth'] = $stmt->fetchAll();
        
        // Top performing videos
        $stmt = $pdo->query("
            SELECT 
                v.id, v.title, v.view_count,
                u.name as creator_name,
                COUNT(p.id) as purchase_count,
                SUM(p.amount) as revenue
            FROM videos v
            JOIN users u ON v.creator_id = u.id
            LEFT JOIN video_purchases p ON v.id = p.video_id AND p.payment_status = 'completed'
            WHERE v.status = 'published'
            GROUP BY v.id
            ORDER BY v.view_count DESC
            LIMIT 10
        ");
        $stats['top_videos'] = $stmt->fetchAll();
        
        // Top creators
        $stmt = $pdo->query("
            SELECT 
                u.id, u.name, u.email,
                COUNT(DISTINCT v.id) as video_count,
                COUNT(DISTINCT p.id) as total_sales,
                SUM(p.amount) as total_revenue
            FROM users u
            LEFT JOIN videos v ON u.id = v.creator_id AND v.status = 'published'
            LEFT JOIN video_purchases p ON v.id = p.video_id AND p.payment_status = 'completed'
            WHERE u.role = 'creator' AND u.status = 'active'
            GROUP BY u.id
            ORDER BY total_revenue DESC
            LIMIT 10
        ");
        $stats['top_creators'] = $stmt->fetchAll();
        
        // System health
        $stats['system_health'] = [
            'database_status' => 'healthy',
            'total_storage_mb' => rand(15000, 25000), // Mock data
            'used_storage_mb' => rand(10000, 20000),
            'active_sessions' => rand(50, 200),
            'error_rate' => rand(0, 5) / 100
        ];
        
        sendResponse($stats, 'Dashboard statistics retrieved successfully');
        
    } catch (PDOException $e) {
        logError('Get dashboard stats error: ' . $e->getMessage());
        sendError('Failed to retrieve dashboard statistics', 500);
    }
}

/**
 * Get platform settings
 */
function handleGetPlatformSettings($pdo) {
    $admin = requireAuth($pdo, ['admin']);
    
    try {
        $stmt = $pdo->query("SELECT * FROM platform_settings ORDER BY setting_key");
        $settings = $stmt->fetchAll();
        
        // Convert to key-value format
        $formattedSettings = [];
        foreach ($settings as $setting) {
            $value = $setting['setting_value'];
            
            // Convert based on data type
            switch ($setting['data_type']) {
                case 'number':
                    $value = floatval($value);
                    break;
                case 'boolean':
                    $value = $value === 'true';
                    break;
                case 'json':
                    $value = json_decode($value, true);
                    break;
            }
            
            $formattedSettings[$setting['setting_key']] = [
                'value' => $value,
                'description' => $setting['description'],
                'data_type' => $setting['data_type'],
                'updated_at' => $setting['updated_at']
            ];
        }
        
        sendResponse($formattedSettings, 'Platform settings retrieved successfully');
        
    } catch (PDOException $e) {
        logError('Get platform settings error: ' . $e->getMessage());
        sendError('Failed to retrieve platform settings', 500);
    }
}

/**
 * Update platform settings
 */
function handleUpdatePlatformSettings($pdo) {
    $admin = requireAuth($pdo, ['admin']);
    $data = getRequestBody();
    
    $errors = validatePlatformSettings($data);
    if (!empty($errors)) {
        sendError('Validation failed', 400, $errors);
    }
    
    try {
        $pdo->beginTransaction();
        
        foreach ($data as $key => $value) {
            // Get current setting to determine data type
            $stmt = $pdo->prepare("SELECT data_type FROM platform_settings WHERE setting_key = ?");
            $stmt->execute([$key]);
            $setting = $stmt->fetch();
            
            if ($setting) {
                // Convert value to string for storage
                $stringValue = $value;
                if ($setting['data_type'] === 'boolean') {
                    $stringValue = $value ? 'true' : 'false';
                } elseif ($setting['data_type'] === 'json') {
                    $stringValue = json_encode($value);
                }
                
                // Update setting
                $stmt = $pdo->prepare("
                    UPDATE platform_settings 
                    SET setting_value = ?, updated_by = ? 
                    WHERE setting_key = ?
                ");
                $stmt->execute([$stringValue, $admin['id'], $key]);
            }
        }
        
        // Log admin action
        logAdminAction($pdo, $admin['id'], 'update_platform_settings', null, null, $data);
        
        $pdo->commit();
        
        sendResponse(null, 'Platform settings updated successfully');
        
    } catch (PDOException $e) {
        $pdo->rollback();
        logError('Update platform settings error: ' . $e->getMessage());
        sendError('Failed to update platform settings', 500);
    }
}

/**
 * Get admin logs
 */
function handleGetAdminLogs($pdo) {
    $admin = requireAuth($pdo, ['admin']);
    $params = getQueryParams();
    
    try {
        $whereConditions = [];
        $queryParams = [];
        
        // Filter by action
        if (!empty($_GET['action'])) {
            $whereConditions[] = "l.action = ?";
            $queryParams[] = $_GET['action'];
        }
        
        // Filter by admin
        if (!empty($_GET['admin_id'])) {
            $whereConditions[] = "l.admin_id = ?";
            $queryParams[] = $_GET['admin_id'];
        }
        
        // Date range filter
        if (!empty($_GET['from_date'])) {
            $whereConditions[] = "l.created_at >= ?";
            $queryParams[] = $_GET['from_date'];
        }
        
        if (!empty($_GET['to_date'])) {
            $whereConditions[] = "l.created_at <= ?";
            $queryParams[] = $_GET['to_date'];
        }
        
        $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';
        
        // Count total records
        $countSql = "
            SELECT COUNT(*) as total
            FROM admin_logs l
            JOIN users u ON l.admin_id = u.id
            $whereClause
        ";
        $stmt = $pdo->prepare($countSql);
        $stmt->execute($queryParams);
        $total = $stmt->fetch()['total'];
        
        // Get logs
        $sql = "
            SELECT 
                l.*,
                u.name as admin_name,
                u.email as admin_email
            FROM admin_logs l
            JOIN users u ON l.admin_id = u.id
            $whereClause
            ORDER BY l.created_at DESC
            LIMIT {$params['limit']} OFFSET {$params['offset']}
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($queryParams);
        $logs = $stmt->fetchAll();
        
        $pagination = createPaginationMeta($total, $params['page'], $params['limit']);
        
        sendResponse([
            'logs' => $logs,
            'pagination' => $pagination
        ], 'Admin logs retrieved successfully');
        
    } catch (PDOException $e) {
        logError('Get admin logs error: ' . $e->getMessage());
        sendError('Failed to retrieve admin logs', 500);
    }
}

/**
 * Moderate video content
 */
function handleModerateVideo($pdo) {
    $admin = requireAuth($pdo, ['admin']);
    $data = getRequestBody();
    
    if (empty($data['video_id']) || empty($data['action'])) {
        sendError('Video ID and action are required');
    }
    
    $videoId = $data['video_id'];
    $action = $data['action']; // approve, reject, flag
    $reason = $data['reason'] ?? '';
    
    try {
        // Check if video exists
        $stmt = $pdo->prepare("SELECT id, creator_id, title FROM videos WHERE id = ?");
        $stmt->execute([$videoId]);
        $video = $stmt->fetch();
        
        if (!$video) {
            sendError('Video not found', 404);
        }
        
        // Update video status based on action
        $newStatus = '';
        switch ($action) {
            case 'approve':
                $newStatus = 'published';
                break;
            case 'reject':
            case 'remove':
                $newStatus = 'removed';
                break;
            case 'flag':
                $newStatus = 'flagged';
                break;
            default:
                sendError('Invalid moderation action', 400);
        }
        
        $stmt = $pdo->prepare("UPDATE videos SET status = ? WHERE id = ?");
        $stmt->execute([$newStatus, $videoId]);
        
        // Log admin action
        logAdminAction($pdo, $admin['id'], "moderate_video_$action", 'video', $videoId, [
            'video_title' => $video['title'],
            'reason' => $reason,
            'new_status' => $newStatus
        ]);
        
        sendResponse(null, "Video $action action completed successfully");
        
    } catch (PDOException $e) {
        logError('Moderate video error: ' . $e->getMessage());
        sendError('Failed to moderate video', 500);
    }
}

/**
 * Handle bulk actions on users or videos
 */
function handleBulkAction($pdo) {
    $admin = requireAuth($pdo, ['admin']);
    $data = getRequestBody();
    
    if (empty($data['type']) || empty($data['action']) || empty($data['ids'])) {
        sendError('Type, action, and IDs are required');
    }
    
    $type = $data['type']; // users, videos
    $action = $data['action']; // suspend, activate, delete, publish, unpublish
    $ids = $data['ids'];
    
    if (!is_array($ids) || empty($ids)) {
        sendError('IDs must be a non-empty array');
    }
    
    try {
        $pdo->beginTransaction();
        
        $placeholders = str_repeat('?,', count($ids) - 1) . '?';
        
        if ($type === 'users' && in_array($action, ['suspend', 'activate'])) {
            $status = $action === 'suspend' ? 'suspended' : 'active';
            
            // Don't allow suspending admin users
            $stmt = $pdo->prepare("
                UPDATE users 
                SET status = ? 
                WHERE id IN ($placeholders) AND role != 'admin'
            ");
            $stmt->execute(array_merge([$status], $ids));
            
        } elseif ($type === 'videos' && in_array($action, ['publish', 'unpublish', 'remove'])) {
            $status = '';
            switch ($action) {
                case 'publish':
                    $status = 'published';
                    break;
                case 'unpublish':
                    $status = 'draft';
                    break;
                case 'remove':
                    $status = 'removed';
                    break;
            }
            
            $stmt = $pdo->prepare("
                UPDATE videos 
                SET status = ? 
                WHERE id IN ($placeholders)
            ");
            $stmt->execute(array_merge([$status], $ids));
            
        } else {
            $pdo->rollback();
            sendError('Invalid bulk action', 400);
        }
        
        // Log admin action
        logAdminAction($pdo, $admin['id'], "bulk_action_{$type}_{$action}", null, null, [
            'affected_count' => count($ids),
            'ids' => $ids
        ]);
        
        $pdo->commit();
        
        sendResponse(null, "Bulk $action completed successfully");
        
    } catch (PDOException $e) {
        $pdo->rollback();
        logError('Bulk action error: ' . $e->getMessage());
        sendError('Failed to perform bulk action', 500);
    }
}

/**
 * Get platform analytics
 */
function handleGetPlatformAnalytics($pdo) {
    $admin = requireAuth($pdo, ['admin']);
    
    try {
        $analytics = [];
        
        // Revenue analytics
        $stmt = $pdo->query("
            SELECT 
                DATE(purchased_at) as date,
                SUM(amount) as revenue,
                COUNT(*) as transactions
            FROM video_purchases 
            WHERE payment_status = 'completed' 
                AND purchased_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(purchased_at)
            ORDER BY date DESC
        ");
        $analytics['revenue_trend'] = $stmt->fetchAll();
        
        // User engagement
        $stmt = $pdo->query("
            SELECT 
                DATE(viewed_at) as date,
                COUNT(*) as total_views,
                COUNT(DISTINCT user_id) as unique_viewers
            FROM video_views 
            WHERE viewed_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
            GROUP BY DATE(viewed_at)
            ORDER BY date DESC
        ");
        $analytics['engagement_trend'] = $stmt->fetchAll();
        
        // Category performance
        $stmt = $pdo->query("
            SELECT 
                v.category,
                COUNT(*) as video_count,
                SUM(v.view_count) as total_views,
                COUNT(DISTINCT p.id) as total_purchases,
                SUM(p.amount) as total_revenue
            FROM videos v
            LEFT JOIN video_purchases p ON v.id = p.video_id AND p.payment_status = 'completed'
            WHERE v.status = 'published'
            GROUP BY v.category
            ORDER BY total_revenue DESC
        ");
        $analytics['category_performance'] = $stmt->fetchAll();
        
        sendResponse($analytics, 'Platform analytics retrieved successfully');
        
    } catch (PDOException $e) {
        logError('Get platform analytics error: ' . $e->getMessage());
        sendError('Failed to retrieve platform analytics', 500);
    }
}
?>