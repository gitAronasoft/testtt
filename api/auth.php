<?php
require_once 'config.php';

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

    $conn = getConnection();

    // Check if email already exists
    $check_email = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $check_email->bind_param("s", $email);
    $check_email->execute();
    $result = $check_email->get_result();

    if ($result->num_rows > 0) {
        echo json_encode(['success' => false, 'message' => 'Email already exists']);
        $conn->close();
        return;
    }

    // Hash password and insert user
    $user_id = uniqid();
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    $insert_user = $conn->prepare("INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)");
    $insert_user->bind_param("sssss", $user_id, $name, $email, $hashed_password, $role);

    if ($insert_user->execute()) {
        $_SESSION['user'] = [
            'id' => $user_id,
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
    } else {
        echo json_encode(['success' => false, 'message' => 'Registration failed']);
    }

    $conn->close();
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

    $conn = getConnection();

    // Get user from database
    $get_user = $conn->prepare("SELECT id, name, email, password, role, created_at FROM users WHERE email = ?");
    $get_user->bind_param("s", $email);
    $get_user->execute();
    $result = $get_user->get_result();

    if ($result->num_rows > 0) {
        $user = $result->fetch_assoc();

        // Verify password
        if (password_verify($password, $user['password'])) {
            // Login successful
            $_SESSION['user'] = [
                'id' => $user['id'],
                'name' => $user['name'],
                'email' => $user['email'],
                'role' => $user['role'],
                'created_at' => $user['created_at']
            ];

            // Set a cookie for session persistence
            setcookie('user_id', $user['id'], time() + 86400, '/', '', false, true);

            echo json_encode([
                'success' => true,
                'message' => 'Login successful',
                'user' => $_SESSION['user'],
                'redirect_url' => $user['role'] === 'viewer' ? 'dashboard.html?panel=videos' : 'dashboard.html'
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
    }

    $conn->close();
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