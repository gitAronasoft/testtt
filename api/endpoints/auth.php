<?php
/**
 * Authentication API endpoints
 * Handles login, registration, logout, and password management
 */

require_once __DIR__ . '/../config/config.php';

$database = new Database();
$pdo = $database->getConnection();

if (!$pdo) {
    sendError('Database connection failed', 500);
}

$method = $_SERVER['REQUEST_METHOD'];
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$segments = explode('/', trim($requestUri, '/'));
$action = end($segments);

switch ($method) {
    case 'POST':
        switch ($action) {
            case 'login':
                handleLogin($pdo);
                break;
            case 'register':
                handleRegister($pdo);
                break;
            case 'logout':
                handleLogout($pdo);
                break;
            case 'forgot-password':
                handleForgotPassword($pdo);
                break;
            case 'reset-password':
                handleResetPassword($pdo);
                break;
            default:
                sendError('Invalid endpoint', 404);
        }
        break;
    case 'GET':
        switch ($action) {
            case 'verify':
                handleEmailVerification($pdo);
                break;
            case 'me':
                handleGetCurrentUser($pdo);
                break;
            default:
                sendError('Invalid endpoint', 404);
        }
        break;
    default:
        sendError('Method not allowed', 405);
}

/**
 * Handle user login
 */
function handleLogin($pdo) {
    $data = getRequestBody();
    
    if (empty($data['email']) || empty($data['password'])) {
        sendError('Email and password are required');
    }
    
    $email = $data['email'];
    $password = $data['password'];
    $identifier = getClientIP() . '_' . $email;
    
    // Check login attempts
    if (!checkLoginAttempts($pdo, $identifier)) {
        sendError('Too many login attempts. Please try again later.', 429);
    }
    
    try {
        $stmt = $pdo->prepare("
            SELECT id, email, password_hash, name, role, status, email_verified
            FROM users 
            WHERE email = ?
        ");
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        
        if (!$user || !verifyPassword($password, $user['password_hash'])) {
            recordLoginAttempt($identifier);
            sendError('Invalid email or password', 401);
        }
        
        if ($user['status'] !== 'active') {
            sendError('Account is not active', 403);
        }
        
        // Clear login attempts on successful login
        clearLoginAttempts($identifier);
        
        // Update last login
        updateLastLogin($pdo, $user['id']);
        
        // Generate JWT token
        $tokenPayload = [
            'user_id' => $user['id'],
            'email' => $user['email'],
            'role' => $user['role']
        ];
        $token = generateJWT($tokenPayload);
        
        // Create session
        $sessionToken = createUserSession($pdo, $user['id']);
        
        // Prepare response
        unset($user['password_hash']);
        
        sendResponse([
            'user' => $user,
            'token' => $token,
            'session_token' => $sessionToken
        ], 'Login successful');
        
    } catch (PDOException $e) {
        logError('Login error: ' . $e->getMessage());
        sendError('Login failed', 500);
    }
}

/**
 * Handle user registration
 */
function handleRegister($pdo) {
    $data = getRequestBody();
    
    // Validate input
    $errors = validateUserRegistration($data);
    if (!empty($errors)) {
        sendError('Validation failed', 400, $errors);
    }
    
    $email = $data['email'];
    $password = $data['password'];
    $name = $data['name'];
    $role = $data['role'] ?? 'viewer';
    
    try {
        // Check if email already exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
        $stmt->execute([$email]);
        
        if ($stmt->fetch()) {
            sendError('Email already registered', 409);
        }
        
        // Hash password
        $passwordHash = hashPassword($password);
        
        // Insert user
        $stmt = $pdo->prepare("
            INSERT INTO users (email, password_hash, name, role)
            VALUES (?, ?, ?, ?)
        ");
        $stmt->execute([$email, $passwordHash, $name, $role]);
        
        $userId = $pdo->lastInsertId();
        
        // Create wallet for user
        $stmt = $pdo->prepare("INSERT INTO user_wallets (user_id) VALUES (?)");
        $stmt->execute([$userId]);
        
        // Get created user
        $stmt = $pdo->prepare("
            SELECT id, email, name, role, status, email_verified, created_at
            FROM users 
            WHERE id = ?
        ");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();
        
        sendResponse($user, 'Registration successful', 201);
        
    } catch (PDOException $e) {
        logError('Registration error: ' . $e->getMessage());
        sendError('Registration failed', 500);
    }
}

/**
 * Handle user logout
 */
function handleLogout($pdo) {
    $user = getCurrentUser($pdo);
    
    if ($user) {
        try {
            // Remove user sessions
            $stmt = $pdo->prepare("DELETE FROM user_sessions WHERE user_id = ?");
            $stmt->execute([$user['id']]);
        } catch (PDOException $e) {
            logError('Logout error: ' . $e->getMessage());
        }
    }
    
    sendResponse(null, 'Logout successful');
}

/**
 * Get current authenticated user
 */
function handleGetCurrentUser($pdo) {
    $user = requireAuth($pdo);
    
    try {
        // Get user with wallet info
        $stmt = $pdo->prepare("
            SELECT u.*, w.balance, w.total_earned, w.total_spent
            FROM users u
            LEFT JOIN user_wallets w ON u.id = w.user_id
            WHERE u.id = ?
        ");
        $stmt->execute([$user['id']]);
        $userData = $stmt->fetch();
        
        sendResponse($userData, 'User data retrieved');
        
    } catch (PDOException $e) {
        logError('Get user error: ' . $e->getMessage());
        sendError('Failed to get user data', 500);
    }
}

/**
 * Handle forgot password
 */
function handleForgotPassword($pdo) {
    $data = getRequestBody();
    
    if (empty($data['email'])) {
        sendError('Email is required');
    }
    
    // For demo purposes, just return success
    // In production, this would send a reset email
    sendResponse(null, 'Password reset email sent (demo mode)');
}

/**
 * Handle password reset
 */
function handleResetPassword($pdo) {
    $data = getRequestBody();
    
    if (empty($data['token']) || empty($data['password'])) {
        sendError('Token and password are required');
    }
    
    // For demo purposes, just return success
    // In production, this would verify token and update password
    sendResponse(null, 'Password reset successful (demo mode)');
}

/**
 * Handle email verification
 */
function handleEmailVerification($pdo) {
    $token = $_GET['token'] ?? '';
    
    if (empty($token)) {
        sendError('Verification token is required');
    }
    
    // For demo purposes, just return success
    // In production, this would verify token and update email_verified status
    sendResponse(null, 'Email verification successful (demo mode)');
}
?>