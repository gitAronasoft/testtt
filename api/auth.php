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
                case 'logout':
                    handleLogout();
                    break;
                case 'get_user':
                    handleGetUser();
                    break;
                default:
                    http_response_code(400);
                    echo json_encode(['success' => false, 'message' => 'Invalid action']);
            }
        } else {
            handleLogin($input);
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
    if (!isset($input['name']) || !isset($input['email']) || !isset($input['password'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Name, email and password required']);
        return;
    }

    $name = trim($input['name']);
    $email = trim($input['email']);
    $password = $input['password'];
    $role = $input['role'] ?? 'viewer';

    // Validate email
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid email format']);
        return;
    }

    $conn = getConnection();

    // Check if email already exists
    $check_stmt = $conn->prepare("SELECT id FROM users WHERE email = ?");
    $check_stmt->bind_param("s", $email);
    $check_stmt->execute();
    $check_result = $check_stmt->get_result();

    if ($check_result->num_rows > 0) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Email already exists']);
        $conn->close();
        return;
    }

    // Create new user
    $user_id = uniqid('user_', true);
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $conn->prepare("INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)");
    $stmt->bind_param("sssss", $user_id, $name, $email, $hashed_password, $role);

    if ($stmt->execute()) {
        // Set session
        $_SESSION['user'] = [
            'id' => $user_id,
            'name' => $name,
            'email' => $email,
            'role' => $role
        ];

        echo json_encode([
            'success' => true,
            'user' => $_SESSION['user'],
            'message' => 'Account created successfully'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Failed to create account']);
    }

    $conn->close();
}

function handleLogout() {
    session_destroy();
    echo json_encode(['success' => true, 'message' => 'Logged out successfully']);
}
?>