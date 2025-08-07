<?php
session_start();
require_once 'config.php';
require_once __DIR__ . '/../vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

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
            // If no action specified in POST, attempt login by default if email/password provided
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

    $stmt = $conn->prepare("SELECT id, name, email, password, role, email_verified FROM users WHERE email = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();

        if (password_verify($password, $user['password'])) {
            // Check if email is verified
            if ($user['email_verified']) {
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
                http_response_code(403);
                echo json_encode(['success' => false, 'message' => 'Please verify your email address first']);
            }
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
    $role = $input['role'] ?? 'viewer'; // Default role to 'viewer'

    // Validate email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        return;
    }

    $conn = getConnection();

    // Check if email already exists
    $check_stmt = $conn->prepare("SELECT id, email_verified, verification_token FROM users WHERE email = ?");
    $check_stmt->bind_param("s", $email);
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();

    if ($check_result->num_rows > 0) {
        $user = $check_result->fetch_assoc();
        if ($user['email_verified']) {
            http_response_code(409);
            echo json_encode(['success' => false, 'message' => 'Email already exists and is verified. Please login.']);
        } else {
            // Resend verification email for unverified account
            sendVerificationEmail($email, $user['verification_token']);
            echo json_encode([
                'success' => true,
                'message' => 'Verification email resent. Please check your email to verify and set your password.'
            ]);
        }
        $conn->close();
        return;
    }

    // Create new user without password
    $verification_token = bin2hex(random_bytes(32));

    $stmt = $conn->prepare("INSERT INTO users (name, email, role, verification_token, email_verified) VALUES (?, ?, ?, ?, 0)");
    $stmt->bind_param("ssss", $name, $email, $role, $verification_token);

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
    $conn = getConnection();
    $token = $input['token'] ?? '';

    if (empty($token)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Verification token is required']);
        $conn->close();
        return;
    }

    // Fetch user details using the token, only for unverified accounts
    $stmt = $conn->prepare("SELECT id, name, email, role FROM users WHERE verification_token = ? AND email_verified = 0");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid or expired verification token']);
        $conn->close();
        return;
    }

    $user = $result->fetch_assoc();

    // Prepare to update user record
    $update_stmt = $conn->prepare("UPDATE users SET email_verified = 1, verification_token = NULL WHERE id = ?");
    $update_stmt->bind_param("i", $user['id']);

    if ($update_stmt->execute()) {
        echo json_encode([
            'success' => true,
            'message' => 'Email verified successfully. You can now set your password.',
            'user' => [ // Returning basic user info for potential immediate use
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role']
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to verify email']);
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

    // Find user by token and ensure they are not yet verified
    $stmt = $conn->prepare("SELECT id, name, email, role FROM users WHERE verification_token = ? AND email_verified = 0");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);

        // Update password, mark email as verified, and clear the verification token
        $update_stmt = $conn->prepare("UPDATE users SET password = ?, email_verified = 1, verification_token = NULL WHERE id = ?");
        $update_stmt->bind_param("si", $hashed_password, $user['id']);

        if ($update_stmt->execute()) {
            // Log the user in immediately after setting password
            $_SESSION['user'] = [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role']
            ];
            echo json_encode([
                'success' => true,
                'message' => 'Password set successfully! You are now logged in.',
                'user' => $_SESSION['user']
            ]);
        } else {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to set password']);
        }
    } else {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid or expired verification token, or account already verified']);
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
            error_log("Attempting to send password reset email to: " . $email);
            if (sendPasswordResetEmail($email, $reset_token)) {
                error_log("Password reset email sent successfully to: " . $email);
                echo json_encode([
                    'success' => true,
                    'message' => 'Password reset link sent to your email'
                ]);
            } else {
                error_log("Failed to send password reset email to: " . $email);
                http_response_code(500);
                echo json_encode(['success' => false, 'message' => 'Failed to send reset email. Please try again or contact support.']);
            }
        } else {
            error_log("Failed to generate reset token for email: " . $email);
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Failed to generate reset token']);
        }
    } else {
        // For security, we don't reveal if an email exists or not.
        // If the email does not exist or is not verified, we pretend we sent the email.
        error_log("Password reset requested for non-existent or unverified email: " . $email);
        echo json_encode([
            'success' => true,
            'message' => 'If your account exists and is verified, a password reset link has been sent.'
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

    // Find user by reset token and ensure the token is still valid
    $stmt = $conn->prepare("SELECT id FROM users WHERE reset_token = ? AND reset_expires > NOW()");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 1) {
        $user = $result->fetch_assoc();
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);

        // Update password and clear reset token fields
        $update_stmt = $conn->prepare("UPDATE users SET password = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?");
        $update_stmt->bind_param("si", $hashed_password, $user['id']);

        if ($update_stmt->execute()) {
            echo json_encode([
                'success' => true,
                'message' => 'Password reset successfully! You can now login with your new password.'
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
    return sendEmail(
        $email,
        'Verify your email - Video Platform',
        getVerificationEmailTemplate($email, $token)
    );
}

function sendPasswordResetEmail($email, $token) {
    return sendEmail(
        $email,
        'Reset your password - Video Platform',
        getPasswordResetEmailTemplate($email, $token)
    );
}

function sendEmail($to, $subject, $body) {
    require_once __DIR__ . '/smtp_config.php'; // Assuming this file contains your SMTP credentials or constants

    $mail = new PHPMailer(true);

    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host       = getenv('SMTP_HOST') ?: DEFAULT_SMTP_HOST;
        $mail->SMTPAuth   = DEFAULT_SMTP_AUTH;
        $mail->Username   = getenv('SMTP_USERNAME') ?: DEFAULT_SMTP_USERNAME;
        $mail->Password   = getenv('SMTP_PASSWORD') ?: DEFAULT_SMTP_PASSWORD;
        $mail->SMTPSecure = getenv('SMTP_SECURE') ?: DEFAULT_SMTP_SECURE;
        $mail->Port       = getenv('SMTP_PORT') ?: DEFAULT_SMTP_PORT;

        // Additional settings for better compatibility and security
        $mail->SMTPOptions = array(
            'ssl' => array(
                'verify_peer' => false,
                'verify_peer_name' => false,
                'allow_self_signed' => true
            )
        );

        // Set timeout for better error handling
        $mail->Timeout = getenv('SMTP_TIMEOUT') ?: DEFAULT_SMTP_TIMEOUT;

        // Enable verbose debug output for troubleshooting if needed
        $mail->SMTPDebug = (getenv('APP_ENV') === 'production') ? 0 : 2; // Use 2 for development, 0 for production
        $mail->Debugoutput = function($str, $level) {
            error_log("SMTP Debug ($level): " . trim($str));
        };

        // Recipients
        $mail->setFrom(getenv('SMTP_FROM_EMAIL') ?: DEFAULT_SMTP_FROM_EMAIL, getenv('SMTP_FROM_NAME') ?: DEFAULT_SMTP_FROM_NAME);
        $mail->addAddress($to);
        $mail->addReplyTo(getenv('SMTP_FROM_EMAIL') ?: DEFAULT_SMTP_FROM_EMAIL, getenv('SMTP_FROM_NAME') ?: DEFAULT_SMTP_FROM_NAME);

        // Content
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $body;
        $mail->AltBody = strip_tags($body); // Plain text version

        // Log email attempt with detailed configuration
        error_log("Attempting to send email to: " . $to . " with subject: " . $subject);
        error_log("SMTP Configuration - Host: " . $mail->Host . ", Port: " . $mail->Port . ", Username: " . $mail->Username . ", Secure: " . $mail->SMTPSecure);

        $mail->send();
        error_log("Email sent successfully to: " . $to);
        return true;
    } catch (Exception $e) {
        error_log("Email sending failed to: " . $to);
        error_log("PHPMailer Error: {$mail->ErrorInfo}");
        error_log("Exception: " . $e->getMessage());
        error_log("SMTP Host: " . $mail->Host);
        error_log("SMTP Port: " . $mail->Port);
        error_log("SMTP Username: " . $mail->Username);
        error_log("Full error details: " . print_r($e, true));
        return false;
    }
}

function getVerificationEmailTemplate($email, $token) {
    $base_url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://" . $_SERVER['HTTP_HOST'];
    $verify_url = $base_url . "/verify-email.php?token=" . $token; // Assuming verify-email.php handles the token

    return "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Verify Your Email</title>
        <style>
            body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .btn { display: inline-block; background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>Welcome to Video Platform!</h1>
            </div>
            <div class='content'>
                <p>Thank you for signing up! To complete your registration, please verify your email address.</p>
                <p style='text-align: center;'>
                    <a href='$verify_url' class='btn'>Verify Email</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style='background: #f8f9fa; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 12px;'>$verify_url</p>
                <p><strong>Note:</strong> This link will expire in 24 hours for security reasons.</p>
            </div>
            <div class='footer'>
                <p>If you did not create an account, please ignore this email.</p>
                <p>&copy; 2024 Video Platform. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    ";
}

function getPasswordResetEmailTemplate($email, $token) {
    $base_url = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http") . "://" . $_SERVER['HTTP_HOST'];
    $reset_url = $base_url . "/reset-password.php?token=" . $token; // Assuming reset-password.php handles the token

    return "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>Reset Your Password</title>
        <style>
            body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #dc3545 0%, #fd79a8 100%); color: white; padding: 30px; text-align: center; }
            .content { padding: 30px; }
            .btn { display: inline-block; background: #dc3545; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
            .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>Password Reset Request</h1>
            </div>
            <div class='content'>
                <p>We received a request to reset your password for your Video Platform account.</p>
                <p style='text-align: center;'>
                    <a href='$reset_url' class='btn'>Reset Password</a>
                </p>
                <p>Or copy and paste this link into your browser:</p>
                <p style='background: #f8f9fa; padding: 15px; border-radius: 5px; word-break: break-all; font-family: monospace; font-size: 12px;'>$reset_url</p>
                <p><strong>Note:</strong> This link will expire in 1 hour for security reasons.</p>
                <p>If you did not request this password reset, please ignore this email. Your password will remain unchanged.</p>
            </div>
            <div class='footer'>
                <p>For security, this request was sent from IP: " . htmlspecialchars($_SERVER['REMOTE_ADDR'] ?? 'N/A') . "</p>
                <p>&copy; 2024 Video Platform. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    ";
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
        $stmt->bind_param("sssi", $name, $bio, $website, $user_id);

        if ($stmt->execute()) {
            // Update session data to reflect changes
            $_SESSION['user']['name'] = $name;
            // Potentially update other session variables if they change

            // Fetch the most up-to-date profile data from the database
            $profile_stmt = $conn->prepare("SELECT id, name, email, role, bio, website FROM users WHERE id = ?");
            $profile_stmt->bind_param("i", $user_id);
            $profile_stmt->execute();
            $profile_result = $profile_stmt->get_result();
            $profile = $profile_result->fetch_assoc();

            echo json_encode([
                'success' => true,
                'message' => 'Profile updated successfully',
                'user' => $profile // Return the full updated profile
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
    // Clear all session variables
    $_SESSION = array();

    // If you want to destroy the session, also delete the session cookie.
    // Note this will destroy the session, and not just the session data!
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }

    // Finally, destroy the session.
    session_destroy();
    echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
}

// getConnection() function is now defined in config.php

// Placeholder for smtp_config.php or define constants directly if not using a file
// Ensure these constants are defined or fetched from environment variables.
if (!defined('DEFAULT_SMTP_HOST')) define('DEFAULT_SMTP_HOST', 'smtp.example.com');
if (!defined('DEFAULT_SMTP_AUTH')) define('DEFAULT_SMTP_AUTH', true);
if (!defined('DEFAULT_SMTP_USERNAME')) define('DEFAULT_SMTP_USERNAME', 'user@example.com');
if (!defined('DEFAULT_SMTP_PASSWORD')) define('DEFAULT_SMTP_PASSWORD', 'password');
if (!defined('DEFAULT_SMTP_SECURE')) define('DEFAULT_SMTP_SECURE', 'tls');
if (!defined('DEFAULT_SMTP_PORT')) define('DEFAULT_SMTP_PORT', 587);
if (!defined('DEFAULT_SMTP_FROM_EMAIL')) define('DEFAULT_SMTP_FROM_EMAIL', 'noreply@example.com');
if (!defined('DEFAULT_SMTP_FROM_NAME')) define('DEFAULT_SMTP_FROM_NAME', 'Video Platform');
if (!defined('DEFAULT_SMTP_TIMEOUT')) define('DEFAULT_SMTP_TIMEOUT', 30);

?>