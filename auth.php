<?php
require_once 'config.php';

class Auth {
    private $pdo;

    public function __construct() {
        $this->pdo = getDB();
        if (session_status() == PHP_SESSION_NONE) {
            session_start();
        }
    }

    public function register($email, $password, $name, $role = 'viewer') {
        if (!$this->pdo) return false;

        try {
            $hashedPassword = password_hash($password, PASSWORD_DEFAULT);

            $stmt = $this->pdo->prepare("INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)");
            $result = $stmt->execute([$email, $hashedPassword, $name, $role]);

            if ($result) {
                $userId = $this->pdo->lastInsertId();
                $this->setUserSession($userId, $name, $email, $role);
                return $userId;
            }

            return false;
        } catch (PDOException $e) {
            error_log('Registration error: ' . $e->getMessage());
            return false;
        }
    }

    public function login($email, $password) {
        if (!$this->pdo) return false;

        try {
            $stmt = $this->pdo->prepare("SELECT * FROM users WHERE email = ?");
            $stmt->execute([$email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($user && password_verify($password, $user['password'])) {
                $this->setUserSession($user['id'], $user['name'], $user['email'], $user['role']);
                return true;
            }

            return false;
        } catch (PDOException $e) {
            error_log('Login error: ' . $e->getMessage());
            return false;
        }
    }

    private function setUserSession($id, $name, $email, $role) {
        $_SESSION['user_id'] = $id;
        $_SESSION['user_name'] = $name;
        $_SESSION['user_email'] = $email;
        $_SESSION['user_role'] = $role;
    }

    public function generatePasswordResetToken($email) {
        try {
            $stmt = $this->pdo->prepare("SELECT id FROM users WHERE email = ? AND password IS NOT NULL");
            $stmt->execute([$email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user) {
                return false;
            }

            $token = bin2hex(random_bytes(32));
            $expiresAt = date('Y-m-d H:i:s', strtotime('+1 hour'));

            // Create password_reset_tokens table if it doesn't exist
            $this->pdo->exec("CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token VARCHAR(255) NOT NULL,
                expires_at DATETIME NOT NULL,
                used BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )");

            $stmt = $this->pdo->prepare("INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)");
            $stmt->execute([$user['id'], $token, $expiresAt]);

            return $token;
        } catch(PDOException $e) {
            error_log('Password reset token error: ' . $e->getMessage());
            return false;
        }
    }

    public function validateResetToken($token) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT prt.id, prt.user_id, u.email 
                FROM password_reset_tokens prt 
                JOIN users u ON prt.user_id = u.id 
                WHERE prt.token = ? AND prt.expires_at > datetime('now') AND prt.used = 0
            ");
            $stmt->execute([$token]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch(PDOException $e) {
            error_log('Token validation error: ' . $e->getMessage());
            return false;
        }
    }

    public function resetPassword($token, $newPassword) {
        try {
            $tokenData = $this->validateResetToken($token);
            if (!$tokenData) {
                return false;
            }

            $hashedPassword = password_hash($newPassword, PASSWORD_DEFAULT);

            // Update password
            $stmt = $this->pdo->prepare("UPDATE users SET password = ? WHERE id = ?");
            $stmt->execute([$hashedPassword, $tokenData['user_id']]);

            // Mark token as used
            $stmt = $this->pdo->prepare("UPDATE password_reset_tokens SET used = 1 WHERE id = ?");
            $stmt->execute([$tokenData['id']]);

            return true;
        } catch(PDOException $e) {
            error_log('Reset password error: ' . $e->getMessage());
            return false;
        }
    }

    public function logout() {
        session_destroy();
        return true;
    }

    public function isLoggedIn() {
        return isset($_SESSION['user_id']);
    }

    public function getCurrentUser() {
        if (!$this->isLoggedIn() || !$this->pdo) return null;

        try {
            $stmt = $this->pdo->prepare("SELECT * FROM users WHERE id = ?");
            $stmt->execute([$_SESSION['user_id']]);
            return $stmt->fetch(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            error_log('Get user error: ' . $e->getMessage());
            return null;
        }
    }

    public function hasRole($roles) {
        if (!$this->isLoggedIn()) return false;

        $roles = is_array($roles) ? $roles : [$roles];
        return in_array($_SESSION['user_role'], $roles);
    }

    public function requireRole($roles) {
        if (!$this->hasRole($roles)) {
            header('HTTP/1.1 403 Forbidden');
            die('Access denied');
        }
    }
}
?>