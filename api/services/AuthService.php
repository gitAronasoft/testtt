<?php
/**
 * AuthService for VideoHub
 * Handles session-based token validation and authentication
 */

class AuthService {
    private $conn;

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Extract Bearer token from request headers
     */
    public function getBearerToken() {
        $headers = getallheaders();
        
        if (isset($headers['Authorization'])) {
            $authHeader = $headers['Authorization'];
            if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                return $matches[1];
            }
        }
        
        return null;
    }

    /**
     * Validate session token and return user data
     */
    public function validateToken($token) {
        try {
            // Check if session is valid in user_sessions table
            $query = "
                SELECT u.id, u.name, u.email, u.role, u.status 
                FROM users u 
                JOIN user_sessions s ON u.id = s.user_id 
                WHERE s.token = :token AND s.expires_at > NOW() AND u.status = 'active'
            ";
            
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':token', $token);
            $stmt->execute();
            
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($user) {
                return [
                    'id' => $user['id'],
                    'name' => $user['name'],
                    'email' => $user['email'],
                    'role' => $user['role'],
                    'status' => $user['status']
                ];
            }
            
            return null;
            
        } catch (Exception $e) {
            error_log("Token validation error: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Generate session token for user
     */
    public function generateToken($user) {
        $token = bin2hex(random_bytes(32));
        
        try {
            // Store session in database
            $sessionStmt = $this->conn->prepare("
                INSERT INTO user_sessions (user_id, token, expires_at) 
                VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))
                ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at)
            ");
            $sessionStmt->execute([$user['id'], $token]);
            
            return $token;
        } catch (PDOException $e) {
            // If sessions table doesn't exist, create it
            $this->conn->exec("
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    token VARCHAR(255) NOT NULL UNIQUE,
                    expires_at DATETIME NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    INDEX idx_token (token),
                    INDEX idx_user_id (user_id),
                    INDEX idx_expires_at (expires_at)
                )
            ");
            
            $sessionStmt = $this->conn->prepare("
                INSERT INTO user_sessions (user_id, token, expires_at) 
                VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))
            ");
            $sessionStmt->execute([$user['id'], $token]);
            
            return $token;
        }
    }

    /**
     * Refresh token if it's close to expiry
     */
    public function refreshToken($token) {
        $user = $this->validateToken($token);
        if ($user) {
            // Check if token expires in next 2 hours
            $query = "SELECT expires_at FROM user_sessions WHERE token = :token";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':token', $token);
            $stmt->execute();
            
            $session = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($session && strtotime($session['expires_at']) - time() < 7200) {
                return $this->generateToken($user);
            }
        }
        return false;
    }

    /**
     * Check if user has required role
     */
    public function hasRole($user, $requiredRole) {
        if (!$user || !isset($user['role'])) {
            return false;
        }

        $roleHierarchy = [
            'viewer' => 1,
            'creator' => 2,
            'admin' => 3
        ];

        $userLevel = $roleHierarchy[$user['role']] ?? 0;
        $requiredLevel = $roleHierarchy[$requiredRole] ?? 999;

        return $userLevel >= $requiredLevel;
    }

    /**
     * Revoke/logout token
     */
    public function revokeToken($token) {
        try {
            $query = "DELETE FROM user_sessions WHERE token = :token";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(':token', $token);
            return $stmt->execute();
        } catch (Exception $e) {
            error_log("Token revocation error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Clean expired sessions
     */
    public function cleanExpiredSessions() {
        try {
            $query = "DELETE FROM user_sessions WHERE expires_at < NOW()";
            $stmt = $this->conn->prepare($query);
            return $stmt->execute();
        } catch (Exception $e) {
            error_log("Session cleanup error: " . $e->getMessage());
            return false;
        }
    }
}
?>