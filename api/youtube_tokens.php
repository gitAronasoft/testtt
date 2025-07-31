<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check authentication
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Not authenticated']);
    exit();
}

$user_id = $_SESSION['user']['id'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

switch ($action) {
    case 'store_tokens':
        handleStoreTokens($user_id);
        break;
    case 'get_tokens':
        handleGetTokens($user_id);
        break;
    case 'clear_tokens':
        handleClearTokens($user_id);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function handleStoreTokens($user_id) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!isset($input['tokens'])) {
        echo json_encode(['success' => false, 'message' => 'No tokens provided']);
        return;
    }
    
    $tokens = $input['tokens'];
    $conn = getConnection();
    
    try {
        $stmt = $conn->prepare("
            INSERT INTO youtube_tokens (user_id, access_token, refresh_token, expires_at, updated_at) 
            VALUES (?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE 
            access_token = VALUES(access_token),
            refresh_token = VALUES(refresh_token),
            expires_at = VALUES(expires_at),
            updated_at = NOW()
        ");
        
        $stmt->bind_param("ssss", 
            $user_id, 
            $tokens['access_token'], 
            $tokens['refresh_token'], 
            $tokens['expires_at']
        );
        
        $stmt->execute();
        
        echo json_encode(['success' => true, 'message' => 'Tokens stored successfully']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Failed to store tokens: ' . $e->getMessage()]);
    }
    
    $conn->close();
}

function handleGetTokens($user_id) {
    $conn = getConnection();
    
    try {
        $stmt = $conn->prepare("SELECT access_token, refresh_token, expires_at FROM youtube_tokens WHERE user_id = ?");
        $stmt->bind_param("s", $user_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $tokens = $result->fetch_assoc();
            echo json_encode(['success' => true, 'tokens' => $tokens]);
        } else {
            echo json_encode(['success' => false, 'message' => 'No tokens found']);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Failed to get tokens: ' . $e->getMessage()]);
    }
    
    $conn->close();
}

function handleClearTokens($user_id) {
    $conn = getConnection();
    
    try {
        $stmt = $conn->prepare("DELETE FROM youtube_tokens WHERE user_id = ?");
        $stmt->bind_param("s", $user_id);
        $stmt->execute();
        
        echo json_encode(['success' => true, 'message' => 'Tokens cleared successfully']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Failed to clear tokens: ' . $e->getMessage()]);
    }
    
    $conn->close();
}
?>
