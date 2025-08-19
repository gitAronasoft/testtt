<?php
/**
 * Authentication and Authorization Middleware for VideoHub
 * Provides secure server-side access control for all protected API endpoints
 */

class AuthMiddleware {
    private $db;
    
    public function __construct($database) {
        $this->db = $database;
    }
    
    /**
     * Verify user authentication from Bearer token
     * @return array|false User data if authenticated, false otherwise
     */
    public function authenticate() {
        // Get Authorization header
        $headers = getallheaders();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        
        if (empty($authHeader) || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            return false;
        }
        
        $token = $matches[1];
        
        try {
            // Verify token against database
            $stmt = $this->db->prepare("
                SELECT u.id, u.name, u.email, u.role, u.status, u.email_verified_at 
                FROM users u 
                JOIN user_sessions s ON u.id = s.user_id 
                WHERE s.token = ? AND s.expires_at > NOW() AND u.status = 'active'
            ");
            $stmt->execute([$token]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$user) {
                error_log("Authentication failed: Invalid or expired token");
                return false;
            }
            
            // Verify email is verified
            if (empty($user['email_verified_at'])) {
                error_log("Authentication failed: Email not verified for user " . $user['email']);
                return false;
            }
            
            error_log("Authentication successful for user: " . $user['email'] . " (role: " . $user['role'] . ")");
            return $user;
            
        } catch (PDOException $e) {
            error_log("Authentication error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Check if authenticated user has required role
     * @param array $user User data from authenticate()
     * @param string $requiredRole Required role ('admin', 'creator', 'viewer')
     * @return bool
     */
    public function authorize($user, $requiredRole) {
        if (!$user || !isset($user['role'])) {
            error_log("Authorization failed: No user data");
            return false;
        }
        
        $userRole = $user['role'];
        
        // Strict role checking - no role elevation
        if ($userRole !== $requiredRole) {
            error_log("Authorization failed: User {$user['email']} (role: {$userRole}) attempted to access {$requiredRole} resource");
            return false;
        }
        
        error_log("Authorization successful: User {$user['email']} accessing {$requiredRole} resource");
        return true;
    }
    
    /**
     * Combined authentication and authorization check
     * @param string $requiredRole Required role for access
     * @return array|false User data if authorized, false otherwise
     */
    public function requireRole($requiredRole) {
        $user = $this->authenticate();
        
        if (!$user) {
            $this->sendUnauthorizedResponse("Authentication required");
            return false;
        }
        
        if (!$this->authorize($user, $requiredRole)) {
            $this->sendForbiddenResponse("Insufficient permissions. Required role: {$requiredRole}");
            return false;
        }
        
        return $user;
    }
    
    /**
     * Send 401 Unauthorized response
     */
    public function sendUnauthorizedResponse($message = "Authentication required") {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => 'Unauthorized',
            'message' => $message
        ]);
        exit;
    }
    
    /**
     * Send 403 Forbidden response
     */
    public function sendForbiddenResponse($message = "Access forbidden") {
        http_response_code(403);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false,
            'error' => 'Forbidden',
            'message' => $message
        ]);
        exit;
    }
}
?>