<?php
/**
 * Email Verification Model for VideoHub
 */

class EmailVerification {
    private $conn;
    private $table_name = "email_verification_tokens";
    
    public $id;
    public $user_id;
    public $email;
    public $token;
    public $expires_at;
    public $verified_at;
    public $created_at;
    
    public function __construct($db) {
        $this->conn = $db;
        $this->createTableIfNotExists();
    }
    
    /**
     * Create email verification tokens table if it doesn't exist
     */
    private function createTableIfNotExists() {
        $query = "
            CREATE TABLE IF NOT EXISTS " . $this->table_name . " (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                email VARCHAR(255) NOT NULL,
                token VARCHAR(255) NOT NULL UNIQUE,
                expires_at DATETIME NOT NULL,
                verified_at DATETIME NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_token (token),
                INDEX idx_user_id (user_id),
                INDEX idx_expires_at (expires_at)
            )
        ";
        
        try {
            $this->conn->exec($query);
        } catch (PDOException $e) {
            error_log("Error creating email verification table: " . $e->getMessage());
        }
    }
    
    /**
     * Create verification token
     */
    public function createToken($user_id, $email) {
        // Delete any existing tokens for this user
        $this->deleteUserTokens($user_id);
        
        // Generate new token
        $token = bin2hex(random_bytes(32));
        
        // Set expiry (24 hours from now)
        $expires_at = date('Y-m-d H:i:s', strtotime('+24 hours'));
        
        $query = "
            INSERT INTO " . $this->table_name . " 
            (user_id, email, token, expires_at) 
            VALUES (?, ?, ?, ?)
        ";
        
        $stmt = $this->conn->prepare($query);
        
        if ($stmt->execute([$user_id, $email, $token, $expires_at])) {
            $this->id = $this->conn->lastInsertId();
            $this->user_id = $user_id;
            $this->email = $email;
            $this->token = $token;
            $this->expires_at = $expires_at;
            return $token;
        }
        
        return false;
    }
    
    /**
     * Verify token
     */
    public function verifyToken($token) {
        // First check our new email_verification_tokens table
        $query = "
            SELECT * FROM " . $this->table_name . " 
            WHERE token = ? AND expires_at > NOW() AND verified_at IS NULL
        ";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$token]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($row) {
            // Mark token as verified
            $updateQuery = "
                UPDATE " . $this->table_name . " 
                SET verified_at = NOW(),
                status = 'active'
                WHERE id = ?
            ";
            
            $updateStmt = $this->conn->prepare($updateQuery);
            $updateStmt->execute([$row['id']]);
            
            // Update user email verification status
            $userUpdateQuery = "
                UPDATE users 
                SET email_verified_at = NOW() 
                WHERE id = ?
            ";
            
            $userUpdateStmt = $this->conn->prepare($userUpdateQuery);
            $userUpdateStmt->execute([$row['user_id']]);
            
            return [
                'user_id' => $row['user_id'],
                'email' => $row['email']
            ];
        }
        
        // Fallback: Check old users table verification_token for backward compatibility
        $legacyQuery = "
            SELECT id, email, verification_token 
            FROM users 
            WHERE verification_token = ? AND email_verified_at IS NULL
        ";
        
        $legacyStmt = $this->conn->prepare($legacyQuery);
        $legacyStmt->execute([$token]);
        $legacyRow = $legacyStmt->fetch(PDO::FETCH_ASSOC);
        
        if ($legacyRow) {
            // Update user email verification status
            $userUpdateQuery = "
                UPDATE users 
                SET email_verified_at = NOW(), verification_token = NULL 
                WHERE id = ?
            ";
            
            $userUpdateStmt = $this->conn->prepare($userUpdateQuery);
            $userUpdateStmt->execute([$legacyRow['id']]);
            
            return [
                'user_id' => $legacyRow['id'],
                'email' => $legacyRow['email']
            ];
        }
        
        return false;
    }
    
    /**
     * Get token details
     */
    public function getToken($token) {
        $query = "
            SELECT * FROM " . $this->table_name . " 
            WHERE token = ?
        ";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$token]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * Delete user tokens
     */
    public function deleteUserTokens($user_id) {
        $query = "DELETE FROM " . $this->table_name . " WHERE user_id = ?";
        $stmt = $this->conn->prepare($query);
        return $stmt->execute([$user_id]);
    }
    
    /**
     * Create password reset token
     */
    public function createPasswordResetToken($user_id, $email) {
        // Delete any existing tokens for this user
        $this->deleteUserTokens($user_id);
        
        // Generate new token
        $token = bin2hex(random_bytes(32));
        
        // Set expiry (1 hour from now for password reset)
        $expires_at = date('Y-m-d H:i:s', strtotime('+1 hour'));
        
        $query = "
            INSERT INTO " . $this->table_name . " 
            (user_id, email, token, expires_at) 
            VALUES (?, ?, ?, ?)
        ";
        
        $stmt = $this->conn->prepare($query);
        
        if ($stmt->execute([$user_id, $email, $token, $expires_at])) {
            return $token;
        }
        
        return false;
    }
    
    /**
     * Verify password reset token
     */
    public function verifyPasswordResetToken($token) {
        $query = "
            SELECT * FROM " . $this->table_name . " 
            WHERE token = ? AND expires_at > NOW() AND verified_at IS NULL
        ";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$token]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($row) {
            return [
                'user_id' => $row['user_id'],
                'email' => $row['email'],
                'token_id' => $row['id']
            ];
        }
        
        return false;
    }
    
    /**
     * Mark token as used
     */
    public function markTokenAsUsed($token) {
        $query = "
            UPDATE " . $this->table_name . " 
            SET verified_at = NOW() 
            WHERE token = ?
        ";
        
        $stmt = $this->conn->prepare($query);
        return $stmt->execute([$token]);
    }
    
    /**
     * Delete expired tokens
     */
    public function deleteExpiredTokens() {
        $query = "DELETE FROM " . $this->table_name . " WHERE expires_at < NOW()";
        $stmt = $this->conn->prepare($query);
        return $stmt->execute();
    }
    
    /**
     * Check if user has verified email
     */
    public function isEmailVerified($user_id) {
        $query = "
            SELECT email_verified_at FROM users 
            WHERE id = ?
        ";
        
        $stmt = $this->conn->prepare($query);
        $stmt->execute([$user_id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $row && $row['email_verified_at'] !== null;
    }
}
?>