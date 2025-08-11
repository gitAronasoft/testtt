<?php
/**
 * Authentication utilities for VideoShare Platform
 * Handles JWT tokens, password hashing, and session management
 */

/**
 * Hash password securely
 * @param string $password
 * @return string
 */
function hashPassword($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

/**
 * Verify password against hash
 * @param string $password
 * @param string $hash
 * @return bool
 */
function verifyPassword($password, $hash) {
    return password_verify($password, $hash);
}

/**
 * Generate JWT token
 * @param array $payload
 * @return string
 */
function generateJWT($payload) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    
    $payload['iat'] = time();
    $payload['exp'] = time() + JWT_EXPIRATION;
    $payload = json_encode($payload);
    
    $base64Header = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64Payload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
    
    $signature = hash_hmac('sha256', $base64Header . "." . $base64Payload, JWT_SECRET, true);
    $base64Signature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    return $base64Header . "." . $base64Payload . "." . $base64Signature;
}

/**
 * Verify and decode JWT token
 * @param string $token
 * @return array|null
 */
function verifyJWT($token) {
    $parts = explode('.', $token);
    
    if (count($parts) !== 3) {
        return null;
    }
    
    list($header, $payload, $signature) = $parts;
    
    // Verify signature
    $expectedSignature = hash_hmac('sha256', $header . "." . $payload, JWT_SECRET, true);
    $expectedSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($expectedSignature));
    
    if ($signature !== $expectedSignature) {
        return null;
    }
    
    // Decode payload
    $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);
    
    if (!$payload) {
        return null;
    }
    
    // Check expiration
    if (isset($payload['exp']) && $payload['exp'] < time()) {
        return null;
    }
    
    return $payload;
}

/**
 * Get authorization header
 * @return string|null
 */
function getAuthorizationHeader() {
    $headers = apache_request_headers();
    
    if (isset($headers['Authorization'])) {
        return $headers['Authorization'];
    }
    
    if (isset($headers['authorization'])) {
        return $headers['authorization'];
    }
    
    return null;
}

/**
 * Extract JWT token from authorization header
 * @return string|null
 */
function getBearerToken() {
    $authHeader = getAuthorizationHeader();
    
    if ($authHeader && preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        return $matches[1];
    }
    
    return null;
}

/**
 * Get current authenticated user
 * @param PDO $pdo
 * @return array|null
 */
function getCurrentUser($pdo) {
    $token = getBearerToken();
    
    if (!$token) {
        return null;
    }
    
    $payload = verifyJWT($token);
    
    if (!$payload || !isset($payload['user_id'])) {
        return null;
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT id, email, name, role, status, email_verified, avatar_url, bio, created_at, last_login
            FROM users 
            WHERE id = ? AND status = 'active'
        ");
        $stmt->execute([$payload['user_id']]);
        
        return $stmt->fetch();
    } catch (PDOException $e) {
        logError('Failed to get current user: ' . $e->getMessage());
        return null;
    }
}

/**
 * Require authentication
 * @param PDO $pdo
 * @param array $allowedRoles
 * @return array
 */
function requireAuth($pdo, $allowedRoles = []) {
    $user = getCurrentUser($pdo);
    
    if (!$user) {
        sendError('Authentication required', 401);
    }
    
    if (!empty($allowedRoles) && !in_array($user['role'], $allowedRoles)) {
        sendError('Insufficient permissions', 403);
    }
    
    return $user;
}

/**
 * Create user session
 * @param PDO $pdo
 * @param int $userId
 * @return string
 */
function createUserSession($pdo, $userId) {
    $sessionToken = generateRandomString(64);
    $expiresAt = date('Y-m-d H:i:s', time() + JWT_EXPIRATION);
    $ipAddress = getClientIP();
    $userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';
    
    try {
        $stmt = $pdo->prepare("
            INSERT INTO user_sessions (user_id, session_token, ip_address, user_agent, expires_at)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$userId, $sessionToken, $ipAddress, $userAgent, $expiresAt]);
        
        return $sessionToken;
    } catch (PDOException $e) {
        logError('Failed to create user session: ' . $e->getMessage());
        return null;
    }
}

/**
 * Check login attempts
 * @param PDO $pdo
 * @param string $identifier
 * @return bool
 */
function checkLoginAttempts($pdo, $identifier) {
    // For simplicity in development, we'll always allow login attempts
    // In production, implement with Redis or database-based rate limiting
    return true;
}

/**
 * Record login attempt
 * @param string $identifier
 */
function recordLoginAttempt($identifier) {
    // For simplicity in development, we'll skip recording attempts
    // In production, implement with Redis or database-based rate limiting
}

/**
 * Clear login attempts
 * @param string $identifier
 */
function clearLoginAttempts($identifier) {
    // For simplicity in development, we'll skip clearing attempts
    // In production, implement with Redis or database-based rate limiting
}

/**
 * Update user last login
 * @param PDO $pdo
 * @param int $userId
 */
function updateLastLogin($pdo, $userId) {
    try {
        $stmt = $pdo->prepare("UPDATE users SET last_login = NOW() WHERE id = ?");
        $stmt->execute([$userId]);
    } catch (PDOException $e) {
        logError('Failed to update last login: ' . $e->getMessage());
    }
}

/**
 * Log admin action
 * @param PDO $pdo
 * @param int $adminId
 * @param string $action
 * @param string $targetType
 * @param int $targetId
 * @param array $details
 */
function logAdminAction($pdo, $adminId, $action, $targetType = null, $targetId = null, $details = []) {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, ip_address)
            VALUES (?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $adminId,
            $action,
            $targetType,
            $targetId,
            json_encode($details),
            getClientIP()
        ]);
    } catch (PDOException $e) {
        logError('Failed to log admin action: ' . $e->getMessage());
    }
}
?>