<?php
/**
 * Users API endpoints
 * Handles user profile management and user-related operations
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
$userId = isset($segments[3]) && is_numeric($segments[3]) ? intval($segments[3]) : null;
$action = isset($segments[4]) ? $segments[4] : null;

switch ($method) {
    case 'GET':
        if ($userId && $action === 'videos') {
            handleGetUserVideos($pdo, $userId);
        } elseif ($userId && $action === 'purchases') {
            handleGetUserPurchases($pdo, $userId);
        } elseif ($userId && $action === 'wallet') {
            handleGetUserWallet($pdo, $userId);
        } elseif ($userId && $action === 'earnings') {
            handleGetUserEarnings($pdo, $userId);
        } elseif ($userId) {
            handleGetUser($pdo, $userId);
        } else {
            handleGetUsers($pdo);
        }
        break;
    case 'PUT':
        if ($userId) {
            handleUpdateUser($pdo, $userId);
        } else {
            sendError('User ID is required', 400);
        }
        break;
    case 'DELETE':
        if ($userId) {
            handleDeleteUser($pdo, $userId);
        } else {
            sendError('User ID is required', 400);
        }
        break;
    default:
        sendError('Method not allowed', 405);
}

/**
 * Get users with filtering and pagination (admin only)
 */
function handleGetUsers($pdo) {
    $user = requireAuth($pdo, ['admin']);
    $params = getQueryParams();
    
    $whereConditions = [];
    $queryParams = [];
    
    // Filter by role
    if (!empty($_GET['role'])) {
        $whereConditions[] = "role = ?";
        $queryParams[] = $_GET['role'];
    }
    
    // Filter by status
    if (!empty($_GET['status'])) {
        $whereConditions[] = "status = ?";
        $queryParams[] = $_GET['status'];
    }
    
    // Search functionality
    if (!empty($params['search'])) {
        $whereConditions[] = "(name LIKE ? OR email LIKE ?)";
        $searchTerm = '%' . $params['search'] . '%';
        $queryParams[] = $searchTerm;
        $queryParams[] = $searchTerm;
    }
    
    $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';
    
    try {
        // Count total records
        $countSql = "SELECT COUNT(*) as total FROM users $whereClause";
        $stmt = $pdo->prepare($countSql);
        $stmt->execute($queryParams);
        $total = $stmt->fetch()['total'];
        
        // Get users
        $sql = "
            SELECT 
                u.id, u.email, u.name, u.role, u.status, u.email_verified, 
                u.avatar_url, u.created_at, u.last_login,
                w.balance, w.total_earned, w.total_spent,
                COUNT(DISTINCT v.id) as video_count,
                COUNT(DISTINCT p.id) as purchase_count
            FROM users u
            LEFT JOIN user_wallets w ON u.id = w.user_id
            LEFT JOIN videos v ON u.id = v.creator_id AND v.status != 'removed'
            LEFT JOIN video_purchases p ON u.id = p.user_id AND p.payment_status = 'completed'
            $whereClause
            GROUP BY u.id
            ORDER BY u.{$params['sort']} {$params['order']}
            LIMIT {$params['limit']} OFFSET {$params['offset']}
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($queryParams);
        $users = $stmt->fetchAll();
        
        $pagination = createPaginationMeta($total, $params['page'], $params['limit']);
        
        sendResponse([
            'users' => $users,
            'pagination' => $pagination
        ], 'Users retrieved successfully');
        
    } catch (PDOException $e) {
        logError('Get users error: ' . $e->getMessage());
        sendError('Failed to retrieve users', 500);
    }
}

/**
 * Get single user by ID
 */
function handleGetUser($pdo, $userId) {
    $currentUser = getCurrentUser($pdo);
    
    // Users can only view their own profile unless they're admin
    if (!$currentUser || ($currentUser['id'] !== $userId && $currentUser['role'] !== 'admin')) {
        sendError('Not authorized to view this user', 403);
    }
    
    try {
        $sql = "
            SELECT 
                u.id, u.email, u.name, u.role, u.status, u.email_verified, 
                u.avatar_url, u.bio, u.created_at, u.last_login,
                w.balance, w.total_earned, w.total_spent,
                COUNT(DISTINCT v.id) as video_count,
                COUNT(DISTINCT p.id) as purchase_count
            FROM users u
            LEFT JOIN user_wallets w ON u.id = w.user_id
            LEFT JOIN videos v ON u.id = v.creator_id AND v.status != 'removed'
            LEFT JOIN video_purchases p ON u.id = p.user_id AND p.payment_status = 'completed'
            WHERE u.id = ?
            GROUP BY u.id
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        if (!$user) {
            sendError('User not found', 404);
        }
        
        sendResponse($user, 'User retrieved successfully');
        
    } catch (PDOException $e) {
        logError('Get user error: ' . $e->getMessage());
        sendError('Failed to retrieve user', 500);
    }
}

/**
 * Update user profile
 */
function handleUpdateUser($pdo, $userId) {
    $currentUser = requireAuth($pdo);
    $data = getRequestBody();
    
    // Users can only update their own profile unless they're admin
    if ($currentUser['id'] !== $userId && $currentUser['role'] !== 'admin') {
        sendError('Not authorized to update this user', 403);
    }
    
    $errors = validateProfileUpdate($data);
    if (!empty($errors)) {
        sendError('Validation failed', 400, $errors);
    }
    
    try {
        // Check if user exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        
        if (!$stmt->fetch()) {
            sendError('User not found', 404);
        }
        
        $updateFields = [];
        $updateParams = [];
        
        // Regular users can update: name, bio, avatar_url
        $allowedFields = ['name', 'bio', 'avatar_url'];
        
        // Admins can also update: email, role, status, email_verified
        if ($currentUser['role'] === 'admin') {
            $allowedFields = array_merge($allowedFields, ['email', 'role', 'status', 'email_verified']);
        }
        
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateFields[] = "$field = ?";
                $updateParams[] = $data[$field];
            }
        }
        
        if (empty($updateFields)) {
            sendError('No valid fields to update', 400);
        }
        
        $updateParams[] = $userId;
        
        $sql = "UPDATE users SET " . implode(', ', $updateFields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($updateParams);
        
        // Log admin action if admin updated another user
        if ($currentUser['role'] === 'admin' && $currentUser['id'] !== $userId) {
            logAdminAction($pdo, $currentUser['id'], 'update_user', 'user', $userId, $data);
        }
        
        sendResponse(null, 'User updated successfully');
        
    } catch (PDOException $e) {
        logError('Update user error: ' . $e->getMessage());
        sendError('Failed to update user', 500);
    }
}

/**
 * Delete/suspend user (admin only)
 */
function handleDeleteUser($pdo, $userId) {
    $currentUser = requireAuth($pdo, ['admin']);
    
    try {
        // Check if user exists
        $stmt = $pdo->prepare("SELECT id, role FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        if (!$user) {
            sendError('User not found', 404);
        }
        
        // Cannot delete admin users
        if ($user['role'] === 'admin') {
            sendError('Cannot delete admin users', 403);
        }
        
        // Soft delete - update status to suspended
        $stmt = $pdo->prepare("UPDATE users SET status = 'suspended' WHERE id = ?");
        $stmt->execute([$userId]);
        
        // Log admin action
        logAdminAction($pdo, $currentUser['id'], 'suspend_user', 'user', $userId);
        
        sendResponse(null, 'User suspended successfully');
        
    } catch (PDOException $e) {
        logError('Delete user error: ' . $e->getMessage());
        sendError('Failed to suspend user', 500);
    }
}

/**
 * Get user's videos
 */
function handleGetUserVideos($pdo, $userId) {
    $currentUser = getCurrentUser($pdo);
    $params = getQueryParams();
    
    // Check authorization
    if (!$currentUser || ($currentUser['id'] !== $userId && $currentUser['role'] !== 'admin')) {
        // For public viewing, only show published videos
        $statusFilter = "AND v.status = 'published'";
    } else {
        // Owner or admin can see all videos
        $statusFilter = isset($_GET['status']) ? "AND v.status = ?" : "";
    }
    
    try {
        $queryParams = [$userId];
        if ($statusFilter && isset($_GET['status'])) {
            $queryParams[] = $_GET['status'];
        }
        
        $sql = "
            SELECT 
                v.*,
                u.name as creator_name,
                COALESCE(AVG(r.rating), 0) as average_rating,
                COUNT(DISTINCT r.id) as rating_count,
                COUNT(DISTINCT p.id) as purchase_count
            FROM videos v
            JOIN users u ON v.creator_id = u.id
            LEFT JOIN video_ratings r ON v.id = r.video_id
            LEFT JOIN video_purchases p ON v.id = p.video_id AND p.payment_status = 'completed'
            WHERE v.creator_id = ? $statusFilter
            GROUP BY v.id
            ORDER BY v.{$params['sort']} {$params['order']}
            LIMIT {$params['limit']} OFFSET {$params['offset']}
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($queryParams);
        $videos = $stmt->fetchAll();
        
        sendResponse(['videos' => $videos], 'User videos retrieved successfully');
        
    } catch (PDOException $e) {
        logError('Get user videos error: ' . $e->getMessage());
        sendError('Failed to retrieve user videos', 500);
    }
}

/**
 * Get user's video purchases
 */
function handleGetUserPurchases($pdo, $userId) {
    $currentUser = requireAuth($pdo);
    
    // Users can only view their own purchases unless they're admin
    if ($currentUser['id'] !== $userId && $currentUser['role'] !== 'admin') {
        sendError('Not authorized to view purchases', 403);
    }
    
    $params = getQueryParams();
    
    try {
        $sql = "
            SELECT 
                p.*,
                v.title as video_title,
                v.thumbnail_url,
                v.duration,
                u.name as creator_name
            FROM video_purchases p
            JOIN videos v ON p.video_id = v.id
            JOIN users u ON v.creator_id = u.id
            WHERE p.user_id = ? AND p.payment_status = 'completed'
            ORDER BY p.purchased_at DESC
            LIMIT {$params['limit']} OFFSET {$params['offset']}
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$userId]);
        $purchases = $stmt->fetchAll();
        
        sendResponse(['purchases' => $purchases], 'User purchases retrieved successfully');
        
    } catch (PDOException $e) {
        logError('Get user purchases error: ' . $e->getMessage());
        sendError('Failed to retrieve purchases', 500);
    }
}

/**
 * Get user's earnings data (creator only)
 */
function handleGetUserEarnings($pdo, $userId) {
    $currentUser = getCurrentUser($pdo);
    
    if (!$currentUser) {
        sendError('Authentication required', 401);
    }
    
    // Debug info - remove in production
    error_log("Current user: " . json_encode($currentUser));
    error_log("User ID from URL: " . $userId);
    
    // Only creators can view earnings, and only their own
    if ($currentUser['role'] !== 'creator' || intval($currentUser['id']) !== intval($userId)) {
        sendError('Not authorized to view earnings. User role: ' . $currentUser['role'] . ', User ID: ' . $currentUser['id'] . ', Requested ID: ' . $userId, 403);
    }
    
    try {
        // Get basic earnings metrics
        $stmt = $pdo->prepare("
            SELECT 
                w.balance as available_balance,
                w.total_earned,
                COALESCE(
                    (SELECT SUM(amount) 
                     FROM wallet_transactions wt 
                     WHERE wt.wallet_id = w.id 
                     AND wt.type = 'earning' 
                     AND MONTH(wt.created_at) = MONTH(CURRENT_DATE())
                     AND YEAR(wt.created_at) = YEAR(CURRENT_DATE())
                    ), 0
                ) as monthly_earnings,
                (SELECT COUNT(*) FROM videos WHERE creator_id = ? AND status = 'published') as total_videos,
                (SELECT COUNT(*) FROM video_purchases vp 
                 JOIN videos v ON vp.video_id = v.id 
                 WHERE v.creator_id = ? AND vp.payment_status = 'completed') as total_purchases
            FROM user_wallets w 
            WHERE w.user_id = ?
        ");
        $stmt->execute([$userId, $userId, $userId]);
        $metrics = $stmt->fetch();
        
        // Get recent purchases of creator's videos
        $stmt = $pdo->prepare("
            SELECT 
                vp.purchased_at as date,
                v.title as video_title,
                u.email as customer_email,
                vp.amount
            FROM video_purchases vp
            JOIN videos v ON vp.video_id = v.id
            JOIN users u ON vp.user_id = u.id
            WHERE v.creator_id = ? AND vp.payment_status = 'completed'
            ORDER BY vp.purchased_at DESC
            LIMIT 10
        ");
        $stmt->execute([$userId]);
        $recent_purchases = $stmt->fetchAll();
        
        // Get payout history
        $stmt = $pdo->prepare("
            SELECT 
                wt.created_at as date,
                wt.amount,
                wt.description as method,
                'completed' as status
            FROM wallet_transactions wt
            JOIN user_wallets w ON wt.wallet_id = w.id
            WHERE w.user_id = ? AND wt.type = 'payout'
            ORDER BY wt.created_at DESC
            LIMIT 10
        ");
        $stmt->execute([$userId]);
        $payout_history = $stmt->fetchAll();
        
        sendResponse([
            'metrics' => $metrics,
            'recent_purchases' => $recent_purchases,
            'payout_history' => $payout_history
        ], 'Earnings data retrieved successfully');
        
    } catch (PDOException $e) {
        logError('Get user earnings error: ' . $e->getMessage());
        sendError('Failed to retrieve earnings data', 500);
    }
}

/**
 * Get user's wallet information
 */
function handleGetUserWallet($pdo, $userId) {
    $currentUser = requireAuth($pdo);
    
    // Users can only view their own wallet unless they're admin
    if ($currentUser['id'] !== $userId && $currentUser['role'] !== 'admin') {
        sendError('Not authorized to view wallet', 403);
    }
    
    $params = getQueryParams();
    
    try {
        // Get wallet info
        $stmt = $pdo->prepare("
            SELECT * FROM user_wallets WHERE user_id = ?
        ");
        $stmt->execute([$userId]);
        $wallet = $stmt->fetch();
        
        if (!$wallet) {
            sendError('Wallet not found', 404);
        }
        
        // Get recent transactions
        $stmt = $pdo->prepare("
            SELECT * FROM wallet_transactions 
            WHERE wallet_id = ?
            ORDER BY created_at DESC
            LIMIT {$params['limit']} OFFSET {$params['offset']}
        ");
        $stmt->execute([$wallet['id']]);
        $transactions = $stmt->fetchAll();
        
        sendResponse([
            'wallet' => $wallet,
            'transactions' => $transactions
        ], 'Wallet information retrieved successfully');
        
    } catch (PDOException $e) {
        logError('Get user wallet error: ' . $e->getMessage());
        sendError('Failed to retrieve wallet information', 500);
    }
}
?>