<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        handleGetUser();
        break;
    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);
        if (isset($input['action'])) {
            switch ($input['action']) {
                case 'login':
                    handleLogin($input);
                    break;
                case 'signup':
                    handleSignup($input);
                    break;
                case 'verify_email':
                    handleVerifyEmail($input);
                    break;
                case 'set_password':
                    handleSetPassword($input);
                    break;
                case 'forgot_password':
                    handleForgotPassword($input);
                    break;
                case 'reset_password':
                    handleResetPassword($input);
                    break;
                case 'logout':
                    handleLogout();
                    break;
                case 'get_user':
                    handleGetUser();
                    break;
                case 'update_profile':
                    handleUpdateProfile($input);
                    break;
                default:
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Invalid action']);
            }
        } else {
            handleLogin($input);
        }
        break;
    case 'PUT':
        $input = json_decode(file_get_contents('php://input'), true);
        if (isset($input['action']) && $input['action'] === 'update_profile') {
            handleUpdateProfile($input);
        } else {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid PUT request']);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(['success' => false, 'message' => 'Method not allowed']);
}

function handleGetUser() {
    if (isset($_SESSION['user'])) {
        echo json_encode([
            'success' => true,
            'user' => $_SESSION['user']
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    }
}

function handleLogin($input) {
    if (!isset($input['email']) || !isset($input['password'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email and password required']);
        return;
    }

    $email = $input['email'];
    $password = $input['password'];

    $conn = getConnection();

    $stmt = $conn->prepare("SELECT id, name, email, password, role FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();

        if (password_verify($password, $user['password'])) {
            // Set session
            $_SESSION['user'] = [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role']
            ];

            echo json_encode([
                'success' => true,
                'user' => $_SESSION['user'],
                'message' => 'Login successful'
            ]);
        } else {
            http_response_code(401);
            echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
        }
    } else {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Invalid credentials']);
    }

    $conn->close();
}

function handleSignup($input) {
    if (!isset($input['name']) || !isset($input['email'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Name and email required']);
        return;
    }

    $name = trim($input['name']);
    $email = trim($input['email']);
    $role = $input['role'] ?? 'viewer';

    // Validate email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        return;
    }

    $conn = getConnection();

    // Check if email already exists
    $check_stmt = $conn->prepare("SELECT id, email_verified FROM users WHERE email = ?");
    $check_stmt->bind_param("s", $email);
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();

    if ($check_result->num_rows > 0) {
        $user = $check_result->fetch_assoc();
        if ($user['email_verified']) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Email already exists']);
            $conn->close();
            return;
        } else {
            // Resend verification email for unverified account
            sendVerificationEmail($email, $user['verification_token']);
            echo json_encode([
                'success' => true,
                'message' => 'Verification email resent. Please check your email.'
            ]);
            $conn->close();
            return;
        }
    }

    // Create new user without password
    $user_id = uniqid('user_', true);
    $verification_token = bin2hex(random_bytes(32));

    $stmt = $conn->prepare("INSERT INTO users (id, name, email, role, verification_token, email_verified) VALUES (?, ?, ?, ?, ?, 0)");
    $stmt->bind_param("sssss", $user_id, $name, $email, $role, $verification_token);

    if ($stmt->execute()) {
        // Send verification email
        if (sendVerificationEmail($email, $verification_token)) {
            echo json_encode([
                'success' => true,
                'message' => 'Account created! Please check your email to verify and set your password.'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to send verification email']);
        }
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create account']);
    }

    $conn->close();
}

function handleVerifyEmail($input) {
    if (!isset($input['token'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Verification token required']);
        return;
    }

    $token = $input['token'];
    $conn = getConnection();

    $stmt = $conn->prepare("SELECT id, name, email, role FROM users WHERE verification_token = ? AND email_verified = 0");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        echo json_encode([
            'success' => true,
            'user' => $user,
            'message' => 'Email verified successfully'
        ]);
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid or expired verification token']);
    }

    $conn->close();
}

function handleSetPassword($input) {
    if (!isset($input['token']) || !isset($input['password'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Token and password required']);
        return;
    }

    $token = $input['token'];
    $password = $input['password'];

    if (strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters']);
        return;
    }

    $conn = getConnection();

    $stmt = $conn->prepare("SELECT id, name, email, role FROM users WHERE verification_token = ? AND email_verified = 0");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);

        $update_stmt = $conn->prepare("UPDATE users SET password = ?, email_verified = 1, verification_token = NULL WHERE id = ?");
        $update_stmt->bind_param("ss", $hashed_password, $user['id']);

        if ($update_stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Password set successfully! You can now login.'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to set password']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid or expired verification token']);
    }

    $conn->close();
}

function handleForgotPassword($input) {
    if (!isset($input['email'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Email required']);
        return;
    }

    $email = trim($input['email']);

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        return;
    }

    $conn = getConnection();

    $stmt = $conn->prepare("SELECT id FROM users WHERE email = ? AND email_verified = 1");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $reset_token = bin2hex(random_bytes(32));
        $expires_at = date('Y-m-d H:i:s', strtotime('+1 hour'));

        $update_stmt = $conn->prepare("UPDATE users SET reset_token = ?, reset_expires = ? WHERE email = ?");
        $update_stmt->bind_param("sss", $reset_token, $expires_at, $email);

        if ($update_stmt->execute()) {
            if (sendPasswordResetEmail($email, $reset_token)) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Password reset link sent to your email'
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to send reset email']);
            }
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to generate reset token']);
        }
    } else {
        // Don't reveal if email exists for security
        echo json_encode([
            'success' => true,
            'message' => 'If the email exists, a reset link has been sent'
        ]);
    }

    $conn->close();
}

function handleResetPassword($input) {
    if (!isset($input['token']) || !isset($input['password'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Token and password required']);
        return;
    }

    $token = $input['token'];
    $password = $input['password'];

    if (strlen($password) < 6) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters']);
        return;
    }

    $conn = getConnection();

    $stmt = $conn->prepare("SELECT id FROM users WHERE reset_token = ? AND reset_expires > NOW()");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);

        $update_stmt = $conn->prepare("UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?");
        $update_stmt->bind_param("ss", $hashed_password, $user['id']);

        if ($update_stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Password reset successfully! You can now login.'
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to reset password']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid or expired reset token']);
    }

    $conn->close();
}

function sendVerificationEmail($email, $token) {
    $base_url = (isset($_SERVER['HTTPS']) ? "https" : "http") . "://" . $_SERVER['HTTP_HOST'];
    $verify_url = $base_url . "/verify-email.html?token=" . $token;
    
    $subject = "Verify your email - Video Platform";
    $message = "
    <html>
    <body>
        <h2>Welcome to Video Platform!</h2>
        <p>Please click the link below to verify your email and set your password:</p>
        <p><a href='$verify_url' style='background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Verify Email & Set Password</a></p>
        <p>Or copy and paste this link: $verify_url</p>
        <p>This link will expire in 24 hours.</p>
    </body>
    </html>
    ";
    
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= "From: noreply@videoplatform.com" . "\r\n";
    
    // For demo purposes, we'll log the email instead of actually sending it
    error_log("VERIFICATION EMAIL - To: $email, Subject: $subject, Link: $verify_url");
    
    return true; // Always return true for demo
}

function sendPasswordResetEmail($email, $token) {
    $base_url = (isset($_SERVER['HTTPS']) ? "https" : "http") . "://" . $_SERVER['HTTP_HOST'];
    $reset_url = $base_url . "/reset-password.html?token=" . $token;
    
    $subject = "Reset your password - Video Platform";
    $message = "
    <html>
    <body>
        <h2>Password Reset Request</h2>
        <p>Click the link below to reset your password:</p>
        <p><a href='$reset_url' style='background: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>Reset Password</a></p>
        <p>Or copy and paste this link: $reset_url</p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
    </body>
    </html>
    ";
    
    $headers = "MIME-Version: 1.0" . "\r\n";
    $headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
    $headers .= "From: noreply@videoplatform.com" . "\r\n";
    
    // For demo purposes, we'll log the email instead of actually sending it
    error_log("PASSWORD RESET EMAIL - To: $email, Subject: $subject, Link: $reset_url");
    
    return true; // Always return true for demo
}

function handleUpdateProfile($input) {
    if (!isset($_SESSION['user'])) {
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Not authenticated']);
        return;
    }

    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid input']);
        return;
    }

    $user_id = $_SESSION['user']['id'];
    $conn = getConnection();

    try {
        // Validate and sanitize input
        $name = isset($input['name']) ? trim($input['name']) : '';
        $bio = isset($input['bio']) ? trim($input['bio']) : '';
        $website = isset($input['website']) ? trim($input['website']) : '';

        if (empty($name)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Name is required']);
            return;
        }

        // Validate website URL if provided
        if (!empty($website) && !filter_var($website, FILTER_VALIDATE_URL)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'message' => 'Invalid website URL']);
            return;
        }

        // Update user profile
        $stmt = $conn->prepare("UPDATE users SET name = ?, bio = ?, website = ? WHERE id = ?");
        $stmt->bind_param("ssss", $name, $bio, $website, $user_id);

        if ($stmt->execute()) {
            // Update session data
            $_SESSION['user']['name'] = $name;

            // Get updated profile
            $stmt = $conn->prepare("SELECT id, name, email, role, bio, website FROM users WHERE id = ?");
            $stmt->bind_param("s", $user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $profile = $result->fetch_assoc();

            echo json_encode([
                'success' => true,
                'message' => 'Profile updated successfully',
                'user' => $profile
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to update profile']);
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
    } finally {
        $conn->close();
    }
}

function handleLogout() {
    session_destroy();
    echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
}
?>