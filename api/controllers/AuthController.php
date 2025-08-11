<?php
/**
 * Authentication Controller for VideoShare Platform
 */

require_once __DIR__ . '/../config/database.php';

class AuthController {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * User login
     */
    public function login($email, $password) {
        try {
            // Validate input
            if (empty($email) || empty($password)) {
                return $this->sendError('Email and password are required', 400);
            }
            
            // Get user from database
            $stmt = $this->db->prepare("SELECT id, name, email, password_hash, role FROM users WHERE email = ? AND status = 'active'");
            $stmt->bind_param("s", $email);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                return $this->sendError('Invalid email or password', 401);
            }
            
            $user = $result->fetch_assoc();
            
            // Verify password
            if (!password_verify($password, $user['password_hash'])) {
                return $this->sendError('Invalid email or password', 401);
            }
            
            // Generate token (simple demo token)
            $token = $this->generateToken($user['id']);
            
            // Remove password from response
            unset($user['password_hash']);
            
            return $this->sendSuccess([
                'user' => $user,
                'token' => $token
            ], 'Login successful');
            
        } catch (Exception $e) {
            return $this->sendError('Login failed: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * User registration
     */
    public function register($name, $email, $password, $role = 'viewer') {
        try {
            // Validate input
            if (empty($name) || empty($email) || empty($password)) {
                return $this->sendError('Name, email and password are required', 400);
            }
            
            // Validate email format
            if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
                return $this->sendError('Invalid email format', 400);
            }
            
            // Validate role
            $validRoles = ['viewer', 'creator', 'admin'];
            if (!in_array($role, $validRoles)) {
                $role = 'viewer';
            }
            
            // Check if user already exists
            $stmt = $this->db->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->bind_param("s", $email);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows > 0) {
                return $this->sendError('User with this email already exists', 409);
            }
            
            // Hash password
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
            
            // Insert new user
            $stmt = $this->db->prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("ssss", $name, $email, $hashedPassword, $role);
            
            if ($stmt->execute()) {
                $userId = $this->db->lastInsertId();
                
                // Create wallet for new user
                $walletStmt = $this->db->prepare("INSERT INTO wallets (user_id, balance) VALUES (?, 100.00)");
                $walletStmt->bind_param("i", $userId);
                $walletStmt->execute();
                
                return $this->sendSuccess([
                    'user' => [
                        'id' => $userId,
                        'name' => $name,
                        'email' => $email,
                        'role' => $role
                    ]
                ], 'User registered successfully');
            } else {
                return $this->sendError('Registration failed', 500);
            }
            
        } catch (Exception $e) {
            return $this->sendError('Registration failed: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get user profile
     */
    public function getProfile($userId) {
        try {
            $stmt = $this->db->prepare("SELECT id, name, email, role, created_at FROM users WHERE id = ?");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                return $this->sendError('User not found', 404);
            }
            
            $user = $result->fetch_assoc();
            
            // Get wallet balance
            $walletStmt = $this->db->prepare("SELECT balance FROM wallets WHERE user_id = ?");
            $walletStmt->bind_param("i", $userId);
            $walletStmt->execute();
            $walletResult = $walletStmt->get_result();
            
            if ($walletResult->num_rows > 0) {
                $wallet = $walletResult->fetch_assoc();
                $user['wallet_balance'] = $wallet['balance'];
            } else {
                $user['wallet_balance'] = 0;
            }
            
            return $this->sendSuccess(['user' => $user]);
            
        } catch (Exception $e) {
            return $this->sendError('Failed to get profile: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Generate simple token
     */
    private function generateToken($userId) {
        return base64_encode($userId . ':' . time() . ':' . uniqid());
    }
    
    /**
     * Send success response
     */
    private function sendSuccess($data, $message = 'Success') {
        return [
            'success' => true,
            'message' => $message,
            'data' => $data
        ];
    }
    
    /**
     * Send error response
     */
    private function sendError($message, $code = 400) {
        return [
            'success' => false,
            'error' => $message,
            'code' => $code
        ];
    }
}
?>