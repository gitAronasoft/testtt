<?php
/**
 * Authentication API Endpoints for VideoHub
 */

require_once __DIR__ . '/../config/cors.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../models/EmailVerification.php';
require_once __DIR__ . '/../services/EmailService.php';
require_once __DIR__ . '/../services/GoogleAuthService.php'; // Assuming GoogleAuthService is in this path

// Get database connection
$database = new Database();
$db = $database->getConnection();

// Initialize objects
$user = new User($db);
$emailVerification = new EmailVerification($db);
$emailService = new EmailService();
$googleAuthService = new GoogleAuthService(); // Initialize GoogleAuthService

// Ensure email_verified_at column exists
$user->createEmailVerifiedColumnIfNotExists();

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Handle subfolder deployments - extract path after /api/auth
if (preg_match('/.*\/api\/auth(.*)/', $path, $matches)) {
    $auth_path = $matches[1] ?: '/';
} else {
    $auth_path = $path;
}

$path_parts = explode('/', trim($auth_path, '/'));

// Subfolder-compatible path parsing completed

try {
    switch ($method) {
        case 'POST':
            // Handle action-based requests (direct endpoint calls)
            $data = json_decode(file_get_contents("php://input"), true);

            if (isset($data['action'])) {
                $action = $data['action'];

                switch ($action) {
                    case 'google-login':
                        if (empty($data['credential'])) {
                            http_response_code(400);
                            echo json_encode([
                                'success' => false,
                                'message' => 'Google credential (token) is required'
                            ]);
                            exit;
                        }

                        // Verify Google JWT token
                        $googleUserData = $googleAuthService->verifyGoogleToken($data['credential']);

                        if (!$googleUserData || !isset($googleUserData['email'])) {
                            http_response_code(401);
                            echo json_encode([
                                'success' => false,
                                'message' => 'Invalid Google credential'
                            ]);
                            exit;
                        }

                        // Check if user already exists with this email
                        $stmt = $db->prepare("SELECT id, name, email, role, email_verified_at, status FROM users WHERE email = ?");
                        $stmt->execute([$googleUserData['email']]);
                        $existingUser = $stmt->fetch(PDO::FETCH_ASSOC);

                        $userName = $googleUserData['name'] ?? $googleUserData['email']; // Use name from Google or fallback to email
                        $userEmail = $googleUserData['email'];
                        $userVerified = $googleUserData['email_verified'] ?? false; // Google usually provides this
                        $userPicture = $googleUserData['picture'] ?? null;

                        if ($existingUser) {
                            // Check if user is not revoked/banned
                            $userStatus = $existingUser['status'] ?? 'active';
                            if ($userStatus === 'revoked' || $userStatus === 'banned') {
                                http_response_code(403);
                                echo json_encode([
                                    'success' => false,
                                    'message' => 'Your account has been suspended. Please contact support.'
                                ]);
                                exit;
                            }
                            
                            // User exists, log them in
                            $userId = $existingUser['id'];
                            $userRole = $existingUser['role'];
                            $emailVerified = $existingUser['email_verified_at'] !== null;

                            // Update user if necessary (e.g., picture, name)
                            // For simplicity, we'll just use existing user data and session
                        } else {
                            // User does not exist, create a new one
                            $role = 'viewer'; // Default role for new users
                            $hashedPassword = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT); // Set a random password as it's not used for login

                            $createUserStmt = $db->prepare("
                                INSERT INTO users (name, email, password, role, email_verified_at) 
                                VALUES (?, ?, ?, ?, ?)
                            ");

                            // Set email_verified_at based on Google's verification status
                            $verifiedAt = $userVerified ? date('Y-m-d H:i:s') : null;

                            if ($createUserStmt->execute([$userName, $userEmail, $hashedPassword, $role, $verifiedAt])) {
                                $userId = $db->lastInsertId();
                                $emailVerified = $userVerified;
                                $userRole = $role;
                            } else {
                                http_response_code(500);
                                echo json_encode([
                                    'success' => false,
                                    'message' => 'Failed to create user account from Google data'
                                ]);
                                exit;
                            }
                        }

                        // Generate session token
                        $token = bin2hex(random_bytes(32));

                        // Store session in database
                        try {
                            $sessionStmt = $db->prepare("
                                INSERT INTO user_sessions (user_id, token, expires_at) 
                                VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))
                                ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at)
                            ");
                            $sessionStmt->execute([$userId, $token]);
                        } catch (PDOException $e) {
                            // If sessions table doesn't exist, create it
                            $db->exec("
                                CREATE TABLE IF NOT EXISTS user_sessions (
                                    id INT AUTO_INCREMENT PRIMARY KEY,
                                    user_id INT NOT NULL,
                                    token VARCHAR(255) NOT NULL UNIQUE,
                                    expires_at DATETIME NOT NULL,
                                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                                )
                            ");
                            $sessionStmt = $db->prepare("
                                INSERT INTO user_sessions (user_id, token, expires_at) 
                                VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))
                            ");
                            $sessionStmt->execute([$userId, $token]);
                        }

                        http_response_code(200);
                        echo json_encode([
                            'success' => true,
                            'message' => 'Google login successful',
                            'data' => [
                                'user' => [
                                    'id' => $userId,
                                    'name' => $userName,
                                    'email' => $userEmail,
                                    'role' => $userRole,
                                    'email_verified' => $emailVerified
                                ],
                                'token' => $token
                            ]
                        ]);
                        exit;

                    case 'google-signup':
                        if (empty($data['credential'])) {
                            http_response_code(400);
                            echo json_encode([
                                'success' => false,
                                'message' => 'Google credential (token) is required'
                            ]);
                            exit;
                        }

                        // Verify Google JWT token
                        $googleUserData = $googleAuthService->verifyGoogleToken($data['credential']);

                        if (!$googleUserData || !isset($googleUserData['email'])) {
                            http_response_code(401);
                            echo json_encode([
                                'success' => false,
                                'message' => 'Invalid Google credential'
                            ]);
                            exit;
                        }

                        $userName = $googleUserData['name'] ?? $googleUserData['email'];
                        $userEmail = $googleUserData['email'];
                        $userVerified = $googleUserData['email_verified'] ?? false;
                        $userPicture = $googleUserData['picture'] ?? null;

                        // Check if email already exists
                        $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
                        $stmt->execute([$userEmail]);
                        if ($stmt->fetch()) {
                            http_response_code(400);
                            echo json_encode([
                                'success' => false,
                                'message' => 'Email already registered. Please log in instead.'
                            ]);
                            exit;
                        }

                        // Create a new user
                        $role = 'viewer'; // Default role for new users
                        $hashedPassword = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT); // Set a random password

                        $createUserStmt = $db->prepare("
                            INSERT INTO users (name, email, password, role, email_verified_at) 
                            VALUES (?, ?, ?, ?, ?)
                        ");

                        $verifiedAt = $userVerified ? date('Y-m-d H:i:s') : null;

                        if ($createUserStmt->execute([$userName, $userEmail, $hashedPassword, $role, $verifiedAt])) {
                            $userId = $db->lastInsertId();

                            // Generate session token for the newly created user
                            $token = bin2hex(random_bytes(32));
                            $sessionStmt = $db->prepare("
                                INSERT INTO user_sessions (user_id, token, expires_at) 
                                VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))
                            ");
                            $sessionStmt->execute([$userId, $token]);

                            http_response_code(201);
                            echo json_encode([
                                'success' => true,
                                'message' => 'Google signup successful!',
                                'data' => [
                                    'user' => [
                                        'id' => $userId,
                                        'name' => $userName,
                                        'email' => $userEmail,
                                        'role' => $role,
                                        'email_verified' => $userVerified
                                    ],
                                    'token' => $token
                                ]
                            ]);
                            exit;
                        } else {
                            http_response_code(500);
                            echo json_encode([
                                'success' => false,
                                'message' => 'Google signup failed'
                            ]);
                        }
                        break;

                    case 'verify-email':
                        if (empty($data['token'])) {
                            http_response_code(400);
                            echo json_encode([
                                'success' => false,
                                'message' => 'Verification token is required'
                            ]);
                            exit;
                        }

                        try {
                            $verificationResult = $emailVerification->verifyToken($data['token']);

                            if ($verificationResult) {
                                // Update user email verification status
                                $userId = $verificationResult['user_id'];
                                $user->markEmailVerified($userId);

                                http_response_code(200);
                                echo json_encode([
                                    'success' => true,
                                    'message' => 'Email verified successfully!',
                                    'data' => [
                                        'user_id' => $verificationResult['user_id'],
                                        'email' => $verificationResult['email']
                                    ]
                                ]);
                            } else {
                                http_response_code(400);
                                echo json_encode([
                                    'success' => false,
                                    'message' => 'Invalid or expired verification token'
                                ]);
                            }
                        } catch (Exception $e) {
                            error_log('Email verification error: ' . $e->getMessage());
                            http_response_code(500);
                            echo json_encode([
                                'success' => false,
                                'message' => 'Server error occurred'
                            ]);
                        }
                        exit;

                    case 'resend-verification':
                        if (empty($data['email'])) {
                            http_response_code(400);
                            echo json_encode([
                                'success' => false,
                                'message' => 'Email is required'
                            ]);
                            exit;
                        }

                        try {
                            // Find user by email  
                            $user->createEmailVerifiedColumnIfNotExists();
                            $stmt = $db->prepare("SELECT id, name, email, email_verified_at FROM users WHERE email = ?");
                            $stmt->execute([$data['email']]);
                            $userData = $stmt->fetch(PDO::FETCH_ASSOC);

                            if (!$userData) {
                                http_response_code(404);
                                echo json_encode([
                                    'success' => false,
                                    'message' => 'User not found'
                                ]);
                                exit;
                            }

                            if ($userData['email_verified_at']) {
                                http_response_code(400);
                                echo json_encode([
                                    'success' => false,
                                    'message' => 'Email is already verified'
                                ]);
                                exit;
                            }

                            // Create new verification token
                            $token = $emailVerification->createToken($userData['id'], $userData['email']);

                            if ($token) {
                                // Send verification email
                                $emailSent = $emailService->sendVerificationEmail($userData['email'], $userData['name'], $token);

                                if ($emailSent) {
                                    echo json_encode([
                                        'success' => true,
                                        'message' => 'Verification email sent successfully!'
                                    ]);
                                } else {
                                    echo json_encode([
                                        'success' => true,
                                        'message' => 'Verification token created, but email could not be sent. Please contact support.'
                                    ]);
                                }
                            } else {
                                http_response_code(500);
                                echo json_encode([
                                    'success' => false,
                                    'message' => 'Failed to create verification token'
                                ]);
                            }
                        } catch (Exception $e) {
                            error_log('Resend verification error: ' . $e->getMessage());
                            http_response_code(500);
                            echo json_encode([
                                'success' => false,
                                'message' => 'Server error occurred'
                            ]);
                        }
                        exit;
                }
            }

            if ((isset($path_parts[0]) && $path_parts[0] === 'login') || (isset($path_parts[1]) && $path_parts[1] === 'login')) {
                // Handle login
                $data = json_decode(file_get_contents("php://input"), true);

                if (empty($data['email']) || empty($data['password'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Email and password are required'
                    ]);
                    break;
                }

                // Check if user exists and password is correct
                $stmt = $db->prepare("SELECT id, name, email, role, password, email_verified, email_verified_at, status FROM users WHERE email = ?");
                $stmt->execute([$data['email']]);
                $userData = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($userData && password_verify($data['password'], $userData['password'])) {
                    // Check if email is verified and user is not revoked
                    $emailVerified = $userData['email_verified'] == 1 && $userData['status'] !== 'inactive';
                    $userStatus = $userData['status'] ?? 'active';
                    
                    if (!$emailVerified) {
                        http_response_code(403);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Please verify your email before logging in',
                            'verification_required' => true
                        ]);
                        break;
                    }
                    
                    if ($userStatus === 'revoked' || $userStatus === 'suspended') {
                        http_response_code(403);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Your account has been suspended. Please contact support.'
                        ]);
                        break;
                    }

                    // Generate session token
                    $token = bin2hex(random_bytes(32));

                    // Store session in database (create sessions table if needed)
                    try {
                        $sessionStmt = $db->prepare("
                            INSERT INTO user_sessions (user_id, token, expires_at) 
                            VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))
                            ON DUPLICATE KEY UPDATE token = VALUES(token), expires_at = VALUES(expires_at)
                        ");
                        $sessionStmt->execute([$userData['id'], $token]);
                    } catch (PDOException $e) {
                        // If sessions table doesn't exist, create it
                        $db->exec("
                            CREATE TABLE IF NOT EXISTS user_sessions (
                                id INT AUTO_INCREMENT PRIMARY KEY,
                                user_id INT NOT NULL,
                                token VARCHAR(255) NOT NULL UNIQUE,
                                expires_at DATETIME NOT NULL,
                                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                            )
                        ");
                        $sessionStmt = $db->prepare("
                            INSERT INTO user_sessions (user_id, token, expires_at) 
                            VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))
                        ");
                        $sessionStmt->execute([$userData['id'], $token]);
                    }

                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'message' => 'Login successful',
                        'data' => [
                            'user' => [
                                'id' => $userData['id'],
                                'name' => $userData['name'],
                                'email' => $userData['email'],
                                'role' => $userData['role'],
                                'email_verified' => $emailVerified
                            ],
                            'token' => $token
                        ]
                    ]);
                } else {
                    http_response_code(401);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Invalid email or password'
                    ]);
                }

            } elseif ((isset($path_parts[0]) && $path_parts[0] === 'register') || (isset($path_parts[1]) && $path_parts[1] === 'register')) {
                // Handle registration
                $data = json_decode(file_get_contents("php://input"), true);

                if (empty($data['firstName']) || empty($data['lastName']) || 
                    empty($data['email']) || empty($data['password'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'All fields are required'
                    ]);
                    break;
                }

                // Check if email already exists
                $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
                $stmt->execute([$data['email']]);
                if ($stmt->fetch()) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Email already registered'
                    ]);
                    break;
                }

                // Hash password and create user
                $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
                $userName = $data['firstName'] . ' ' . $data['lastName'];
                $role = $data['userType'] ?? 'viewer';

                $stmt = $db->prepare("
                    INSERT INTO users (name, email, password, role) 
                    VALUES (?, ?, ?, ?)
                ");

                if ($stmt->execute([$userName, $data['email'], $hashedPassword, $role])) {
                    $userId = $db->lastInsertId();

                    // Create email verification token
                    $verificationToken = $emailVerification->createToken($userId, $data['email']);

                    if ($verificationToken) {
                        // Send verification email
                        $emailSent = $emailService->sendVerificationEmail($data['email'], $userName, $verificationToken);

                        $message = 'Registration successful! ';
                        if ($emailSent) {
                            $message .= 'Please check your email to verify your account.';
                        } else {
                            $message .= 'However, we could not send the verification email. Please contact support.';
                        }
                    } else {
                        $message = 'Registration successful, but verification token creation failed.';
                    }

                    http_response_code(201);
                    echo json_encode([
                        'success' => true,
                        'message' => $message,
                        'data' => [
                            'user' => [
                                'id' => $userId,
                                'name' => $userName,
                                'email' => $data['email'],
                                'role' => $role,
                                'email_verified' => false
                            ],
                            'verification_required' => true
                        ]
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Registration failed'
                    ]);
                }

            } elseif ((isset($path_parts[0]) && $path_parts[0] === 'verify-email') || (isset($path_parts[1]) && $path_parts[1] === 'verify-email') || (isset($path_parts[2]) && $path_parts[2] === 'verify-email')) {
                // Handle email verification
                $data = json_decode(file_get_contents("php://input"), true);

                if (empty($data['token'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Verification token is required'
                    ]);
                    break;
                }

                $verificationResult = $emailVerification->verifyToken($data['token']);

                if ($verificationResult) {
                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'message' => 'Email verified successfully!',
                        'data' => [
                            'user_id' => $verificationResult['user_id'],
                            'email' => $verificationResult['email']
                        ]
                    ]);
                } else {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Invalid or expired verification token'
                    ]);
                }

            } elseif (isset($path_parts[2]) && $path_parts[2] === 'resend-verification') {
                // Handle resending verification email
                $data = json_decode(file_get_contents("php://input"), true);

                if (empty($data['email'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Email is required'
                    ]);
                    break;
                }

                // Find user by email  
                $user->createEmailVerifiedColumnIfNotExists();
                $stmt = $db->prepare("SELECT id, name, email, email_verified_at FROM users WHERE email = ?");
                $stmt->execute([$data['email']]);
                $userData = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$userData) {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'message' => 'User not found'
                    ]);
                    break;
                }

                if ($userData['email_verified_at'] !== null) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Email is already verified'
                    ]);
                    break;
                }

                // Create new verification token
                $verificationToken = $emailVerification->createToken($userData['id'], $userData['email']);

                if ($verificationToken) {
                    // Send verification email
                    $emailSent = $emailService->sendVerificationEmail($userData['email'], $userData['name'], $verificationToken);

                    if ($emailSent) {
                        http_response_code(200);
                        echo json_encode([
                            'success' => true,
                            'message' => 'Verification email sent successfully!'
                        ]);
                    } else {
                        http_response_code(500);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Failed to send verification email'
                        ]);
                    }
                } else {
                    http_response_code(500);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Failed to create verification token'
                    ]);
                }

            } elseif ((isset($path_parts[0]) && $path_parts[0] === 'forgot-password') || (isset($path_parts[1]) && $path_parts[1] === 'forgot-password') || (isset($path_parts[2]) && $path_parts[2] === 'forgot-password')) {
                // Handle forgot password
                $data = json_decode(file_get_contents("php://input"), true);

                if (empty($data['email'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Email is required'
                    ]);
                    break;
                }

                // Find user by email
                $stmt = $db->prepare("SELECT id, name, email FROM users WHERE email = ?");
                $stmt->execute([$data['email']]);
                $userData = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$userData) {
                    // Don't reveal if email exists - return success for security
                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'message' => 'If this email is registered, you will receive a password reset link.'
                    ]);
                    break;
                }

                // Create password reset token (using same token system as email verification)
                $resetToken = $emailVerification->createPasswordResetToken($userData['id'], $userData['email']);

                if ($resetToken) {
                    // Send password reset email
                    $emailSent = $emailService->sendPasswordResetEmail($userData['email'], $userData['name'], $resetToken);

                    if ($emailSent) {
                        http_response_code(200);
                        echo json_encode([
                            'success' => true,
                            'message' => 'Password reset link sent to your email address.'
                        ]);
                    } else {
                        http_response_code(200);
                        echo json_encode([
                            'success' => true,
                            'message' => 'If this email is registered, you will receive a password reset link.'
                        ]);
                    }
                } else {
                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'message' => 'If this email is registered, you will receive a password reset link.'
                    ]);
                }

            } elseif ((isset($path_parts[0]) && $path_parts[0] === 'reset-password') || (isset($path_parts[1]) && $path_parts[1] === 'reset-password') || (isset($path_parts[2]) && $path_parts[2] === 'reset-password')) {
                // Handle password reset
                $data = json_decode(file_get_contents("php://input"), true);

                if (empty($data['token']) || empty($data['password'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Reset token and new password are required'
                    ]);
                    break;
                }

                // Verify reset token
                $resetResult = $emailVerification->verifyPasswordResetToken($data['token']);

                if ($resetResult) {
                    // Update user password
                    $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);
                    $stmt = $db->prepare("UPDATE users SET password = ? WHERE id = ?");
                    
                    if ($stmt->execute([$hashedPassword, $resetResult['user_id']])) {
                        // Invalidate all existing sessions for this user
                        $sessionStmt = $db->prepare("DELETE FROM user_sessions WHERE user_id = ?");
                        $sessionStmt->execute([$resetResult['user_id']]);

                        // Mark reset token as used
                        $emailVerification->markTokenAsUsed($data['token']);

                        http_response_code(200);
                        echo json_encode([
                            'success' => true,
                            'message' => 'Password reset successfully! You can now log in with your new password.',
                            'data' => [
                                'user_id' => $resetResult['user_id'],
                                'email' => $resetResult['email']
                            ]
                        ]);
                    } else {
                        http_response_code(500);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Failed to update password'
                        ]);
                    }
                } else {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Invalid or expired reset token'
                    ]);
                }

            } elseif ((isset($path_parts[0]) && $path_parts[0] === 'change-password') || (isset($path_parts[1]) && $path_parts[1] === 'change-password') || (isset($path_parts[2]) && $path_parts[2] === 'change-password')) {
                // Handle password change
                if (!isset($data['user_id']) || !isset($data['current_password']) || !isset($data['new_password'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Missing required fields'
                    ]);
                    exit;
                }

                // Verify current password
                $stmt = $db->prepare("SELECT password FROM users WHERE id = ?");
                $stmt->execute([$data['user_id']]);
                $user_data = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$user_data || !password_verify($data['current_password'], $user_data['password'])) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Current password is incorrect'
                    ]);
                    exit;
                }

                // Update password
                $new_password_hash = password_hash($data['new_password'], PASSWORD_DEFAULT);
                $stmt = $db->prepare("UPDATE users SET password = ? WHERE id = ?");
                
                if ($stmt->execute([$new_password_hash, $data['user_id']])) {
                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'message' => 'Password updated successfully'
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Failed to update password'
                    ]);
                }

            } elseif ((isset($path_parts[0]) && $path_parts[0] === 'logout') || (isset($path_parts[1]) && $path_parts[1] === 'logout') || (isset($path_parts[2]) && $path_parts[2] === 'logout')) {
                // Handle logout
                $headers = getallheaders();
                $authHeader = $headers['Authorization'] ?? '';

                if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                    $token = $matches[1];

                    // Delete session from database
                    $stmt = $db->prepare("DELETE FROM user_sessions WHERE token = ?");
                    $stmt->execute([$token]);
                    
                    // Also delete any expired sessions for cleanup
                    $cleanupStmt = $db->prepare("DELETE FROM user_sessions WHERE expires_at < NOW()");
                    $cleanupStmt->execute();
                }

                http_response_code(200);
                echo json_encode([
                    'success' => true,
                    'message' => 'Logout successful'
                ]);

            } else {
                // Handle direct /api/auth requests (for Google auth)
                if (end($path_parts) === 'auth' && count($path_parts) >= 2) {
                    // This is a direct call to /api/auth, which should be handled by action-based logic above
                    // If we reach here, it means no valid action was provided
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Invalid or missing action parameter'
                    ]);
                } else {
                    http_response_code(404);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Auth endpoint not found'
                    ]);
                }
            }
            break;

        case 'GET':
            if ((isset($path_parts[0]) && $path_parts[0] === 'verify') || (isset($path_parts[1]) && $path_parts[1] === 'verify')) {
                // Handle session verification for auth guard
                $headers = getallheaders();
                $authHeader = $headers['Authorization'] ?? '';

                if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                    $token = $matches[1];

                    // Verify session token
                    $stmt = $db->prepare("
                        SELECT u.id, u.name, u.email, u.role, u.status, s.expires_at 
                        FROM user_sessions s 
                        JOIN users u ON s.user_id = u.id 
                        WHERE s.token = ? AND s.expires_at > NOW()
                    ");
                    $stmt->execute([$token]);
                    $sessionData = $stmt->fetch(PDO::FETCH_ASSOC);

                    if ($sessionData) {
                        // Check if user is active
                        $userStatus = $sessionData['status'] ?? 'active';
                        if ($userStatus === 'revoked' || $userStatus === 'banned') {
                            http_response_code(403);
                            echo json_encode([
                                'success' => false,
                                'message' => 'Account suspended'
                            ]);
                            break;
                        }

                        // Return user data
                        http_response_code(200);
                        echo json_encode([
                            'success' => true,
                            'message' => 'Session valid',
                            'data' => [
                                'user' => [
                                    'id' => $sessionData['id'],
                                    'name' => $sessionData['name'],
                                    'email' => $sessionData['email'],
                                    'role' => $sessionData['role']
                                ]
                            ]
                        ]);
                    } else {
                        http_response_code(401);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Invalid or expired session'
                        ]);
                    }
                } else {
                    http_response_code(401);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Authorization token required'
                    ]);
                }
                break;

            } elseif (isset($path_parts[2]) && $path_parts[2] === 'verify-email') {
                // Handle email verification via GET (for URL clicks)
                $token = $_GET['token'] ?? '';

                if (empty($token)) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Verification token is required'
                    ]);
                    break;
                }

                $verificationResult = $emailVerification->verifyToken($token);

                if ($verificationResult) {
                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'message' => 'Email verified successfully!',
                        'data' => [
                            'user_id' => $verificationResult['user_id'],
                            'email' => $verificationResult['email']
                        ]
                    ]);
                } else {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Invalid or expired verification token'
                    ]);
                }

            } elseif (isset($path_parts[2]) && $path_parts[2] === 'verify') {
                // Handle token verification
                $headers = getallheaders();
                $authHeader = $headers['Authorization'] ?? '';

                if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
                    $token = $matches[1];

                    // Check if session is valid
                    $stmt = $db->prepare("
                        SELECT u.id, u.name, u.email, u.role 
                        FROM users u 
                        JOIN user_sessions s ON u.id = s.user_id 
                        WHERE s.token = ? AND s.expires_at > NOW()
                    ");
                    $stmt->execute([$token]);
                    $userData = $stmt->fetch(PDO::FETCH_ASSOC);

                    if ($userData) {
                        http_response_code(200);
                        echo json_encode([
                            'success' => true,
                            'data' => [
                                'user' => $userData
                            ]
                        ]);
                    } else {
                        http_response_code(401);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Invalid or expired token'
                        ]);
                    }
                } else {
                    http_response_code(401);
                    echo json_encode([
                        'success' => false,
                        'message' => 'No token provided'
                    ]);
                }
            } else {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Auth endpoint not found'
                ]);
            }
            break;

        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'Method not allowed'
            ]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}
?>