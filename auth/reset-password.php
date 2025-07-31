
<?php
require_once '../config.php';
require_once '../auth.php';

header('Content-Type: application/json');

try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

$auth = new Auth($pdo);
$input = json_decode(file_get_contents('php://input'), true);
$action = $input['action'] ?? '';

switch ($action) {
    case 'request_reset':
        $email = $input['email'] ?? '';
        
        if (empty($email)) {
            echo json_encode(['success' => false, 'message' => 'Email is required']);
            break;
        }
        
        $token = $auth->generatePasswordResetToken($email);
        
        if ($token) {
            $emailSent = $auth->sendPasswordResetEmail($email, $token);
            if ($emailSent) {
                echo json_encode(['success' => true, 'message' => 'Password reset email sent']);
            } else {
                echo json_encode(['success' => false, 'message' => 'Failed to send email']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'Email not found or account uses Google sign-in']);
        }
        break;
        
    case 'validate_token':
        $token = $input['token'] ?? '';
        
        if (empty($token)) {
            echo json_encode(['success' => false, 'message' => 'Token is required']);
            break;
        }
        
        $tokenData = $auth->validateResetToken($token);
        
        if ($tokenData) {
            echo json_encode(['success' => true, 'email' => $tokenData['email']]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid or expired token']);
        }
        break;
        
    case 'reset_password':
        $token = $input['token'] ?? '';
        $password = $input['password'] ?? '';
        $confirmPassword = $input['confirm_password'] ?? '';
        
        if (empty($token) || empty($password) || empty($confirmPassword)) {
            echo json_encode(['success' => false, 'message' => 'All fields are required']);
            break;
        }
        
        if ($password !== $confirmPassword) {
            echo json_encode(['success' => false, 'message' => 'Passwords do not match']);
            break;
        }
        
        if (strlen($password) < 8) {
            echo json_encode(['success' => false, 'message' => 'Password must be at least 8 characters']);
            break;
        }
        
        $result = $auth->resetPassword($token, $password);
        
        if ($result) {
            echo json_encode(['success' => true, 'message' => 'Password reset successfully']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Failed to reset password']);
        }
        break;
        
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}
?>
