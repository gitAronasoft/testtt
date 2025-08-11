<?php
/**
 * Helper Functions for VideoShare Platform
 * Common utility functions used across the application
 */

/**
 * Generate UUID v4
 * @return string
 */
function generateUUID() {
    return sprintf('%04x%04x-%04x-%04x-%04x-%04x%04x%04x',
        mt_rand(0, 0xffff), mt_rand(0, 0xffff),
        mt_rand(0, 0xffff),
        mt_rand(0, 0x0fff) | 0x4000,
        mt_rand(0, 0x3fff) | 0x8000,
        mt_rand(0, 0xffff), mt_rand(0, 0xffff), mt_rand(0, 0xffff)
    );
}

/**
 * Sanitize input data
 * @param mixed $data
 * @return mixed
 */
function sanitizeInput($data) {
    if (is_array($data)) {
        foreach ($data as $key => $value) {
            $data[$key] = sanitizeInput($value);
        }
    } else {
        $data = trim($data);
        $data = stripslashes($data);
        $data = htmlspecialchars($data, ENT_QUOTES, 'UTF-8');
    }
    return $data;
}

/**
 * Get request body as array
 * @return array
 */
function getRequestBody() {
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        return [];
    }
    
    return sanitizeInput($data);
}

/**
 * Get query parameters with pagination
 * @return array
 */
function getQueryParams() {
    $params = [
        'page' => max(1, intval($_GET['page'] ?? 1)),
        'limit' => min(MAX_PAGE_SIZE, max(1, intval($_GET['limit'] ?? DEFAULT_PAGE_SIZE))),
        'search' => sanitizeInput($_GET['search'] ?? ''),
        'sort' => sanitizeInput($_GET['sort'] ?? 'created_at'),
        'order' => strtolower($_GET['order'] ?? 'desc') === 'asc' ? 'ASC' : 'DESC'
    ];
    
    $params['offset'] = ($params['page'] - 1) * $params['limit'];
    
    return $params;
}

/**
 * Format money amount
 * @param float $amount
 * @return string
 */
function formatMoney($amount) {
    return '$' . number_format($amount, 2);
}

/**
 * Format file size
 * @param int $size
 * @return string
 */
function formatFileSize($size) {
    $units = ['B', 'KB', 'MB', 'GB'];
    $i = 0;
    
    while ($size >= 1024 && $i < count($units) - 1) {
        $size /= 1024;
        $i++;
    }
    
    return round($size, 2) . ' ' . $units[$i];
}

/**
 * Format duration in seconds to readable format
 * @param int $seconds
 * @return string
 */
function formatDuration($seconds) {
    $hours = floor($seconds / 3600);
    $minutes = floor(($seconds % 3600) / 60);
    $seconds = $seconds % 60;
    
    if ($hours > 0) {
        return sprintf('%d:%02d:%02d', $hours, $minutes, $seconds);
    } else {
        return sprintf('%d:%02d', $minutes, $seconds);
    }
}

/**
 * Generate secure random string
 * @param int $length
 * @return string
 */
function generateRandomString($length = 32) {
    return bin2hex(random_bytes($length / 2));
}

/**
 * Calculate platform commission
 * @param float $amount
 * @param float $rate
 * @return array
 */
function calculateCommission($amount, $rate = DEFAULT_COMMISSION_RATE) {
    $commission = ($amount * $rate) / 100;
    $creatorEarning = $amount - $commission;
    
    return [
        'total_amount' => $amount,
        'commission_rate' => $rate,
        'commission_amount' => $commission,
        'creator_earning' => $creatorEarning
    ];
}

/**
 * Create pagination metadata
 * @param int $total
 * @param int $page
 * @param int $limit
 * @return array
 */
function createPaginationMeta($total, $page, $limit) {
    $totalPages = ceil($total / $limit);
    
    return [
        'current_page' => $page,
        'per_page' => $limit,
        'total_items' => $total,
        'total_pages' => $totalPages,
        'has_next' => $page < $totalPages,
        'has_prev' => $page > 1
    ];
}

/**
 * Get client IP address
 * @return string
 */
function getClientIP() {
    $headers = [
        'HTTP_CLIENT_IP',
        'HTTP_X_FORWARDED_FOR',
        'HTTP_X_FORWARDED',
        'HTTP_FORWARDED_FOR',
        'HTTP_FORWARDED',
        'REMOTE_ADDR'
    ];
    
    foreach ($headers as $header) {
        if (isset($_SERVER[$header]) && !empty($_SERVER[$header])) {
            $ips = explode(',', $_SERVER[$header]);
            return trim($ips[0]);
        }
    }
    
    return $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
}

/**
 * Generate unique filename
 * @param string $originalName
 * @param string $prefix
 * @return string
 */
function generateUniqueFilename($originalName, $prefix = '') {
    $extension = pathinfo($originalName, PATHINFO_EXTENSION);
    $timestamp = time();
    $random = generateRandomString(8);
    
    return $prefix . $timestamp . '_' . $random . '.' . $extension;
}

/**
 * Validate video file
 * @param array $file
 * @return array
 */
function validateVideoFile($file) {
    $errors = [];
    
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $errors[] = 'File upload error';
        return $errors;
    }
    
    if ($file['size'] > MAX_VIDEO_SIZE) {
        $errors[] = 'File size too large. Maximum allowed: ' . formatFileSize(MAX_VIDEO_SIZE);
    }
    
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($extension, ALLOWED_VIDEO_TYPES)) {
        $errors[] = 'Invalid file type. Allowed: ' . implode(', ', ALLOWED_VIDEO_TYPES);
    }
    
    return $errors;
}

/**
 * Clean old sessions
 * @param PDO $pdo
 */
function cleanExpiredSessions($pdo) {
    try {
        $stmt = $pdo->prepare("DELETE FROM user_sessions WHERE expires_at < NOW()");
        $stmt->execute();
    } catch (PDOException $e) {
        logError('Failed to clean expired sessions: ' . $e->getMessage());
    }
}
?>