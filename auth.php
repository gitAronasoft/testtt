
<?php
require_once 'config.php';

class Auth {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
        session_start();
    }
    
    public function register($username, $email, $password, $role = 'viewer') {
        $hashedPassword = password_hash($password, PASSWORD_DEFAULT);
        
        try {
            $stmt = $this->pdo->prepare("INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)");
            $stmt->execute([$username, $email, $hashedPassword, $role]);
            return $this->pdo->lastInsertId();
        } catch(PDOException $e) {
            return false;
        }
    }
    
    public function login($username, $password) {
        $stmt = $this->pdo->prepare("SELECT id, username, email, password_hash, role FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user && password_verify($password, $user['password_hash'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];
            return $user;
        }
        return false;
    }
    
    public function logout() {
        session_destroy();
    }
    
    public function isLoggedIn() {
        return isset($_SESSION['user_id']);
    }
    
    public function getCurrentUser() {
        if (!$this->isLoggedIn()) return null;
        
        $stmt = $this->pdo->prepare("SELECT id, username, email, role FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    public function hasRole($roles) {
        if (!$this->isLoggedIn()) return false;
        
        $roles = is_array($roles) ? $roles : [$roles];
        return in_array($_SESSION['role'], $roles);
    }
    
    public function requireRole($roles) {
        if (!$this->hasRole($roles)) {
            header('HTTP/1.1 403 Forbidden');
            die('Access denied');
        }
    }
}
?>
