<?php
// Configure session settings before starting
ini_set('session.cookie_lifetime', 86400);
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_samesite', 'Lax');
ini_set('session.use_strict_mode', 1);

// Start session
session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Credentials: true');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['action'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Invalid request']);
    exit();
}

$action = $input['action'];

switch ($action) {
    case 'register':
        handleRegister($input);
        break;
    case 'login':
        handleLogin($input);
        break;
    case 'logout':
        handleLogout();
        break;
    case 'get_user':
        handleGetUser();
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Unknown action']);
}

function handleRegister($data) {
    // Validate required fields
    $required = ['name', 'email', 'password', 'role'];
    foreach ($required as $field) {
        if (!isset($data[$field]) || empty(trim($data[$field]))) {
            echo json_encode(['success' => false, 'message' => 'All fields are required']);
            return;
        }
    }

    $name = trim($data['name']);
    $email = trim($data['email']);
    $password = $data['password'];
    $role = $data['role'];

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        return;
    }

    // Validate password length
    if (strlen($password) < 6) {
        echo json_encode(['success' => false, 'message' => 'Password must be at least 6 characters']);
        return;
    }

    // Validate role
    if (!in_array($role, ['viewer', 'editor'])) {
        echo json_encode(['success' => false, 'message' => 'Invalid role selected']);
        return;
    }

    // TODO: Database integration - check if email exists, hash password, insert user
    // For now, simulate successful registration
    $_SESSION['user'] = [
        'id' => uniqid(),
        'name' => $name,
        'email' => $email,
        'role' => $role,
        'created_at' => date('Y-m-d H:i:s')
    ];

    echo json_encode([
        'success' => true,
        'message' => 'Registration successful',
        'user' => $_SESSION['user']
    ]);
}

function handleLogin($data) {
    // Validate required fields
    if (!isset($data['email']) || !isset($data['password']) || 
        empty(trim($data['email'])) || empty(trim($data['password']))) {
        echo json_encode(['success' => false, 'message' => 'Email and password are required']);
        return;
    }

    $email = trim($data['email']);
    $password = $data['password'];

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        return;
    }

    // Predefined test users for different roles
    $testUsers = [
        'admin@example.com' => [
            'password' => 'admin123',
            'id' => 'admin_001',
            'name' => 'Admin User',
            'email' => 'admin@example.com',
            'role' => 'admin',
            'created_at' => '2024-01-01 10:00:00'
        ],
        'creator@example.com' => [
            'password' => 'creator123',
            'id' => 'creator_001',
            'name' => 'Content Creator',
            'email' => 'creator@example.com',
            'role' => 'editor',
            'created_at' => '2024-01-02 11:00:00'
        ],
        'viewer@example.com' => [
            'password' => 'viewer123',
            'id' => 'viewer_001',
            'name' => 'Video Viewer',
            'email' => 'viewer@example.com',
            'role' => 'viewer',
            'created_at' => '2024-01-03 12:00:00'
        ]
    ];

    // Check if user exists and password matches
    if (isset($testUsers[$email])) {
        $user = $testUsers[$email];
        if ($password === $user['password']) {
            // Login successful
            $_SESSION['user'] = [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'created_at' => $user['created_at']
            ];

            echo json_encode([
                'success' => true,
                'message' => 'Login successful',
                'user' => $_SESSION['user']
            ]);
            return;
        }
    }

    // Invalid credentials
    echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
}

function handleLogout() {
    session_destroy();
    echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
}

function handleGetUser() {
    if (isset($_SESSION['user'])) {
        echo json_encode([
            'success' => true,
            'user' => $_SESSION['user']
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    }
}
?>
