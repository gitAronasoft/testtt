<?php
/**
 * Videos API endpoints
 * Handles video CRUD operations, views, ratings, and purchases
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
$videoId = isset($segments[3]) && is_numeric($segments[3]) ? intval($segments[3]) : null;
$action = isset($segments[4]) ? $segments[4] : null;

switch ($method) {
    case 'GET':
        if ($videoId && $action === 'views') {
            handleGetVideoViews($pdo, $videoId);
        } elseif ($videoId && $action === 'ratings') {
            handleGetVideoRatings($pdo, $videoId);
        } elseif ($videoId) {
            handleGetVideo($pdo, $videoId);
        } else {
            handleGetVideos($pdo);
        }
        break;
    case 'POST':
        if ($videoId && $action === 'view') {
            handleRecordView($pdo, $videoId);
        } elseif ($videoId && $action === 'rate') {
            handleRateVideo($pdo, $videoId);
        } elseif ($videoId && $action === 'purchase') {
            handlePurchaseVideo($pdo, $videoId);
        } else {
            handleCreateVideo($pdo);
        }
        break;
    case 'PUT':
        if ($videoId) {
            handleUpdateVideo($pdo, $videoId);
        } else {
            sendError('Video ID is required', 400);
        }
        break;
    case 'DELETE':
        if ($videoId) {
            handleDeleteVideo($pdo, $videoId);
        } else {
            sendError('Video ID is required', 400);
        }
        break;
    default:
        sendError('Method not allowed', 405);
}

/**
 * Get videos with filtering and pagination
 */
function handleGetVideos($pdo) {
    $params = getQueryParams();
    $user = getCurrentUser($pdo);
    
    $whereConditions = [];
    $queryParams = [];
    
    // Base query - only published videos for non-creators/admins
    if (!$user || ($user['role'] !== 'creator' && $user['role'] !== 'admin')) {
        $whereConditions[] = "v.status = 'published'";
    }
    
    // Filter by creator
    if (!empty($_GET['creator_id'])) {
        $whereConditions[] = "v.creator_id = ?";
        $queryParams[] = intval($_GET['creator_id']);
    }
    
    // Filter by category
    if (!empty($_GET['category'])) {
        $whereConditions[] = "v.category = ?";
        $queryParams[] = $_GET['category'];
    }
    
    // Filter by status (admin/creator only)
    if (!empty($_GET['status']) && $user && in_array($user['role'], ['creator', 'admin'])) {
        $whereConditions[] = "v.status = ?";
        $queryParams[] = $_GET['status'];
    }
    
    // Search functionality
    if (!empty($params['search'])) {
        $searchQuery = sanitizeSearchQuery($params['search']);
        $whereConditions[] = "MATCH(v.title, v.description) AGAINST(? IN NATURAL LANGUAGE MODE)";
        $queryParams[] = $searchQuery;
    }
    
    // Creator's own videos
    if (!empty($_GET['my_videos']) && $user && $user['role'] === 'creator') {
        $whereConditions[] = "v.creator_id = ?";
        $queryParams[] = $user['id'];
    }
    
    $whereClause = !empty($whereConditions) ? 'WHERE ' . implode(' AND ', $whereConditions) : '';
    
    try {
        // Count total records
        $countSql = "
            SELECT COUNT(*) as total
            FROM videos v
            JOIN users u ON v.creator_id = u.id
            $whereClause
        ";
        $stmt = $pdo->prepare($countSql);
        $stmt->execute($queryParams);
        $total = $stmt->fetch()['total'];
        
        // Get videos
        $sql = "
            SELECT 
                v.*,
                u.name as creator_name,
                u.avatar_url as creator_avatar,
                COALESCE(AVG(r.rating), 0) as average_rating,
                COUNT(DISTINCT r.id) as rating_count,
                COUNT(DISTINCT p.id) as purchase_count
            FROM videos v
            JOIN users u ON v.creator_id = u.id
            LEFT JOIN video_ratings r ON v.id = r.video_id
            LEFT JOIN video_purchases p ON v.id = p.video_id AND p.payment_status = 'completed'
            $whereClause
            GROUP BY v.id
            ORDER BY v.{$params['sort']} {$params['order']}
            LIMIT {$params['limit']} OFFSET {$params['offset']}
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute($queryParams);
        $videos = $stmt->fetchAll();
        
        // Check if user has purchased each video
        if ($user) {
            $videoIds = array_column($videos, 'id');
            if (!empty($videoIds)) {
                $placeholders = str_repeat('?,', count($videoIds) - 1) . '?';
                $purchaseStmt = $pdo->prepare("
                    SELECT video_id 
                    FROM video_purchases 
                    WHERE user_id = ? AND video_id IN ($placeholders) AND payment_status = 'completed'
                ");
                $purchaseStmt->execute(array_merge([$user['id']], $videoIds));
                $purchasedVideos = array_column($purchaseStmt->fetchAll(), 'video_id');
                
                foreach ($videos as &$video) {
                    $video['is_purchased'] = in_array($video['id'], $purchasedVideos);
                }
            }
        }
        
        $pagination = createPaginationMeta($total, $params['page'], $params['limit']);
        
        sendResponse([
            'videos' => $videos,
            'pagination' => $pagination
        ], 'Videos retrieved successfully');
        
    } catch (PDOException $e) {
        logError('Get videos error: ' . $e->getMessage());
        sendError('Failed to retrieve videos', 500);
    }
}

/**
 * Get single video by ID
 */
function handleGetVideo($pdo, $videoId) {
    $user = getCurrentUser($pdo);
    
    try {
        $sql = "
            SELECT 
                v.*,
                u.name as creator_name,
                u.avatar_url as creator_avatar,
                u.bio as creator_bio,
                COALESCE(AVG(r.rating), 0) as average_rating,
                COUNT(DISTINCT r.id) as rating_count
            FROM videos v
            JOIN users u ON v.creator_id = u.id
            LEFT JOIN video_ratings r ON v.id = r.video_id
            WHERE v.id = ?
            GROUP BY v.id
        ";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$videoId]);
        $video = $stmt->fetch();
        
        if (!$video) {
            sendError('Video not found', 404);
        }
        
        // Check access permissions
        if ($video['status'] !== 'published') {
            if (!$user || ($user['id'] !== $video['creator_id'] && $user['role'] !== 'admin')) {
                sendError('Video not found', 404);
            }
        }
        
        // Check if user has purchased this video
        $video['is_purchased'] = false;
        if ($user) {
            $stmt = $pdo->prepare("
                SELECT id FROM video_purchases 
                WHERE user_id = ? AND video_id = ? AND payment_status = 'completed'
            ");
            $stmt->execute([$user['id'], $videoId]);
            $video['is_purchased'] = $stmt->fetch() !== false;
        }
        
        sendResponse($video, 'Video retrieved successfully');
        
    } catch (PDOException $e) {
        logError('Get video error: ' . $e->getMessage());
        sendError('Failed to retrieve video', 500);
    }
}

/**
 * Create new video
 */
function handleCreateVideo($pdo) {
    $user = requireAuth($pdo, ['creator']);
    $data = getRequestBody();
    
    $errors = validateVideoData($data);
    if (!empty($errors)) {
        sendError('Validation failed', 400, $errors);
    }
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO videos (creator_id, title, description, price, category, tags)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $user['id'],
            $data['title'],
            $data['description'],
            $data['price'] ?? 0,
            $data['category'] ?? 'other',
            json_encode($data['tags'] ?? [])
        ]);
        
        $videoId = $pdo->lastInsertId();
        
        // Get created video
        $stmt = $pdo->prepare("
            SELECT v.*, u.name as creator_name
            FROM videos v
            JOIN users u ON v.creator_id = u.id
            WHERE v.id = ?
        ");
        $stmt->execute([$videoId]);
        $video = $stmt->fetch();
        
        sendResponse($video, 'Video created successfully', 201);
        
    } catch (PDOException $e) {
        logError('Create video error: ' . $e->getMessage());
        sendError('Failed to create video', 500);
    }
}

/**
 * Update video
 */
function handleUpdateVideo($pdo, $videoId) {
    $user = requireAuth($pdo, ['creator', 'admin']);
    $data = getRequestBody();
    
    try {
        // Check if video exists and user has permission
        $stmt = $pdo->prepare("SELECT creator_id FROM videos WHERE id = ?");
        $stmt->execute([$videoId]);
        $video = $stmt->fetch();
        
        if (!$video) {
            sendError('Video not found', 404);
        }
        
        if ($user['role'] !== 'admin' && $user['id'] !== $video['creator_id']) {
            sendError('Not authorized to update this video', 403);
        }
        
        $errors = validateVideoData($data);
        if (!empty($errors)) {
            sendError('Validation failed', 400, $errors);
        }
        
        $updateFields = [];
        $updateParams = [];
        
        $allowedFields = ['title', 'description', 'price', 'category', 'tags', 'status'];
        foreach ($allowedFields as $field) {
            if (isset($data[$field])) {
                $updateFields[] = "$field = ?";
                $updateParams[] = $field === 'tags' ? json_encode($data[$field]) : $data[$field];
            }
        }
        
        if (empty($updateFields)) {
            sendError('No valid fields to update', 400);
        }
        
        $updateParams[] = $videoId;
        
        $sql = "UPDATE videos SET " . implode(', ', $updateFields) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($updateParams);
        
        sendResponse(null, 'Video updated successfully');
        
    } catch (PDOException $e) {
        logError('Update video error: ' . $e->getMessage());
        sendError('Failed to update video', 500);
    }
}

/**
 * Delete video
 */
function handleDeleteVideo($pdo, $videoId) {
    $user = requireAuth($pdo, ['creator', 'admin']);
    
    try {
        // Check if video exists and user has permission
        $stmt = $pdo->prepare("SELECT creator_id FROM videos WHERE id = ?");
        $stmt->execute([$videoId]);
        $video = $stmt->fetch();
        
        if (!$video) {
            sendError('Video not found', 404);
        }
        
        if ($user['role'] !== 'admin' && $user['id'] !== $video['creator_id']) {
            sendError('Not authorized to delete this video', 403);
        }
        
        // Soft delete - update status instead of actual deletion
        $stmt = $pdo->prepare("UPDATE videos SET status = 'removed' WHERE id = ?");
        $stmt->execute([$videoId]);
        
        sendResponse(null, 'Video deleted successfully');
        
    } catch (PDOException $e) {
        logError('Delete video error: ' . $e->getMessage());
        sendError('Failed to delete video', 500);
    }
}

/**
 * Record video view
 */
function handleRecordView($pdo, $videoId) {
    $data = getRequestBody();
    $user = getCurrentUser($pdo);
    
    try {
        // Check if video exists and is published
        $stmt = $pdo->prepare("SELECT id FROM videos WHERE id = ? AND status = 'published'");
        $stmt->execute([$videoId]);
        
        if (!$stmt->fetch()) {
            sendError('Video not found', 404);
        }
        
        // Record view
        $stmt = $pdo->prepare("
            INSERT INTO video_views (video_id, user_id, ip_address, user_agent, watch_duration)
            VALUES (?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $videoId,
            $user ? $user['id'] : null,
            getClientIP(),
            $_SERVER['HTTP_USER_AGENT'] ?? '',
            $data['duration'] ?? 0
        ]);
        
        // Update view count
        $stmt = $pdo->prepare("UPDATE videos SET view_count = view_count + 1 WHERE id = ?");
        $stmt->execute([$videoId]);
        
        sendResponse(null, 'View recorded successfully');
        
    } catch (PDOException $e) {
        logError('Record view error: ' . $e->getMessage());
        sendError('Failed to record view', 500);
    }
}

/**
 * Rate video
 */
function handleRateVideo($pdo, $videoId) {
    $user = requireAuth($pdo);
    $data = getRequestBody();
    
    $errors = validateVideoRating($data);
    if (!empty($errors)) {
        sendError('Validation failed', 400, $errors);
    }
    
    try {
        // Check if video exists
        $stmt = $pdo->prepare("SELECT id FROM videos WHERE id = ? AND status = 'published'");
        $stmt->execute([$videoId]);
        
        if (!$stmt->fetch()) {
            sendError('Video not found', 404);
        }
        
        // Insert or update rating
        $stmt = $pdo->prepare("
            INSERT INTO video_ratings (video_id, user_id, rating, review)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE rating = VALUES(rating), review = VALUES(review)
        ");
        
        $stmt->execute([
            $videoId,
            $user['id'],
            $data['rating'],
            $data['review'] ?? null
        ]);
        
        sendResponse(null, 'Rating submitted successfully');
        
    } catch (PDOException $e) {
        logError('Rate video error: ' . $e->getMessage());
        sendError('Failed to submit rating', 500);
    }
}

/**
 * Purchase video
 */
function handlePurchaseVideo($pdo, $videoId) {
    $user = requireAuth($pdo, ['viewer']);
    $data = getRequestBody();
    
    try {
        $pdo->beginTransaction();
        
        // Get video details
        $stmt = $pdo->prepare("
            SELECT id, creator_id, price, title 
            FROM videos 
            WHERE id = ? AND status = 'published'
        ");
        $stmt->execute([$videoId]);
        $video = $stmt->fetch();
        
        if (!$video) {
            $pdo->rollback();
            sendError('Video not found', 404);
        }
        
        // Check if already purchased
        $stmt = $pdo->prepare("
            SELECT id FROM video_purchases 
            WHERE user_id = ? AND video_id = ? AND payment_status = 'completed'
        ");
        $stmt->execute([$user['id'], $videoId]);
        
        if ($stmt->fetch()) {
            $pdo->rollback();
            sendError('Video already purchased', 409);
        }
        
        // Create purchase record
        $stmt = $pdo->prepare("
            INSERT INTO video_purchases (video_id, user_id, amount, payment_status, payment_method, transaction_id)
            VALUES (?, ?, ?, 'completed', ?, ?)
        ");
        
        $transactionId = 'demo_' . time() . '_' . $user['id'];
        $stmt->execute([
            $videoId,
            $user['id'],
            $video['price'],
            $data['payment_method'] ?? 'demo',
            $transactionId
        ]);
        
        // Calculate commission
        $commission = calculateCommission($video['price']);
        
        // Update creator wallet
        $stmt = $pdo->prepare("
            UPDATE user_wallets 
            SET balance = balance + ?, total_earned = total_earned + ?
            WHERE user_id = ?
        ");
        $stmt->execute([$commission['creator_earning'], $commission['creator_earning'], $video['creator_id']]);
        
        // Record wallet transaction for creator
        $stmt = $pdo->prepare("
            INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_type, reference_id)
            SELECT id, 'credit', ?, ?, 'video_sale', ?
            FROM user_wallets 
            WHERE user_id = ?
        ");
        $stmt->execute([
            $commission['creator_earning'],
            "Video sale: {$video['title']}",
            $videoId,
            $video['creator_id']
        ]);
        
        $pdo->commit();
        
        sendResponse([
            'transaction_id' => $transactionId,
            'amount' => $video['price'],
            'commission' => $commission
        ], 'Video purchased successfully');
        
    } catch (PDOException $e) {
        $pdo->rollback();
        logError('Purchase video error: ' . $e->getMessage());
        sendError('Failed to purchase video', 500);
    }
}
?>