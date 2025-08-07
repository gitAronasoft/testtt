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

// Check authentication - only admins can STORE YouTube tokens, but all users can read them
$action = $_GET['action'] ?? json_decode(file_get_contents('php://input'), true)['action'] ?? '';

if (in_array($action, ['store_tokens', 'clear_tokens']) && (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin')) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Admin access required']);
    exit();
}

// All authenticated users can read tokens
if (!isset($_SESSION['user'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentication required']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? $input['action'] ?? '';

switch ($action) {
    case 'get_tokens':
        handleGetTokens();
        break;
    case 'store_tokens':
        handleStoreTokens($input);
        break;
    case 'clear_tokens':
        handleClearTokens();
        break;
    case 'refresh_token':
        handleRefreshToken($input);
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}

function handleGetTokens() {
    $conn = getConnection();

    $sql = "SELECT * FROM youtube_tokens WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows > 0) {
        $token = $result->fetch_assoc();

        // Check if token is expired
        $expires_at = strtotime($token['expires_at']);
        $current_time = time();

        if ($expires_at <= $current_time) {
            echo json_encode([
                'success' => false,
                'expired' => true,
                'refresh_token' => $token['refresh_token'],
                'message' => 'Token expired'
            ]);
        } else {
            echo json_encode([
                'success' => true,
                'tokens' => [
                    'access_token' => $token['access_token'],
                    'refresh_token' => $token['refresh_token'],
                    'expires_at' => $token['expires_at']
                ]
            ]);
        }
    } else {
        echo json_encode([
            'success' => false, 
            'message' => 'No YouTube tokens found. Please ask an admin to connect YouTube.',
            'requires_admin_setup' => true
        ]);
    }

    $conn->close();
}

function handleStoreTokens($input) {
    if (!isset($input['tokens'])) {
        echo json_encode(['success' => false, 'message' => 'Tokens data required']);
        return;
    }

    $tokens = $input['tokens'];
    $conn = getConnection();

    // Create table if it doesn't exist (using new global structure)
    $create_table = "
    CREATE TABLE IF NOT EXISTS youtube_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,        
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        expires_at DATETIME NOT NULL,        
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP       
    )";
    
    // Check if table exists and if it has user_id column (old structure)
    $check_table = $conn->query("SHOW TABLES LIKE 'youtube_tokens'");
    if ($check_table->num_rows > 0) {
        $check_columns = $conn->query("SHOW COLUMNS FROM youtube_tokens LIKE 'user_id'");
        if ($check_columns->num_rows > 0) {
            // Drop the old table with user_id structure
            $conn->query("DROP TABLE youtube_tokens");
        }
    }
    
    $conn->query($create_table);

    // Deactivate existing global tokens
    $deactivate_sql = "UPDATE youtube_tokens SET is_active = 0";
    $conn->query($deactivate_sql);

    // Insert new global token
    $expires_at = date('Y-m-d H:i:s', time() + ($tokens['expires_in'] ?? 3600));

    $insert_sql = "INSERT INTO youtube_tokens (access_token, refresh_token, expires_at, is_active) VALUES (?, ?, ?, ?)";
    $insert_stmt = $conn->prepare($insert_sql); 
    $is_active = 1;
    $insert_stmt->bind_param("sssi",    
        $tokens['access_token'],
        $tokens['refresh_token'] ?? '',
        $expires_at,       
        $is_active
    );

    if ($insert_stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Global tokens stored successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to store tokens']);
    }

    $conn->close();
}

function handleClearTokens() {
    $conn = getConnection();

    $sql = "UPDATE youtube_tokens SET is_active = 0";
    $stmt = $conn->prepare($sql);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'message' => 'Global tokens cleared successfully']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to clear tokens']);
    }

    $conn->close();
}

function handleRefreshToken($input) {
    if (!isset($input['refresh_token'])) {
        // Try to get refresh token from database if not provided
        $conn = getConnection();
        $sql = "SELECT refresh_token FROM youtube_tokens WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1";
        $stmt = $conn->prepare($sql);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows > 0) {
            $token = $result->fetch_assoc();
            $refresh_token = $token['refresh_token'];
        } else {
            echo json_encode(['success' => false, 'message' => 'No refresh token available']);
            return;
        }
        $conn->close();
    } else {
        $refresh_token = $input['refresh_token'];
    }

    if (empty($refresh_token)) {
        echo json_encode(['success' => false, 'message' => 'Refresh token is empty']);
        return;
    }

    $client_id = '824425517340-c4g9ilvg3i7cddl75hvq1a8gromuc95n.apps.googleusercontent.com';
    $client_secret = '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';

    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => 'https://oauth2.googleapis.com/token',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'client_id' => $client_id,
            'client_secret' => $client_secret,
            'refresh_token' => $refresh_token,
            'grant_type' => 'refresh_token'
        ]),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/x-www-form-urlencoded'
        ]
    ]);

    $response = curl_exec($curl);
    $http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($curl);
    curl_close($curl);

    if ($curl_error) {
        echo json_encode(['success' => false, 'message' => 'Network error: ' . $curl_error]);
        return;
    }

    if ($http_code === 200) {
        $token_data = json_decode($response, true);

        if (isset($token_data['access_token'])) {
            // Store the new token in database
            $conn = getConnection();
            
            // Deactivate existing tokens
            $deactivate_sql = "UPDATE youtube_tokens SET is_active = 0";
            $conn->query($deactivate_sql);
            
            // Insert new token
            $expires_at = date('Y-m-d H:i:s', time() + ($token_data['expires_in'] ?? 3600));
            $insert_sql = "INSERT INTO youtube_tokens (access_token, refresh_token, expires_at, is_active) VALUES (?, ?, ?, 1)";
            $stmt = $conn->prepare($insert_sql);
            $stmt->bind_param("sss", 
                $token_data['access_token'],
                $refresh_token, // Keep the same refresh token
                $expires_at
            );
            
            if ($stmt->execute()) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Token refreshed successfully',
                    'tokens' => [
                        'access_token' => $token_data['access_token'],
                        'refresh_token' => $refresh_token,
                        'expires_at' => $expires_at
                    ]
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Failed to store refreshed token']);
            }
            $conn->close();
        } else {
            echo json_encode(['success' => false, 'message' => 'Invalid token response from Google']);
        }
    } else {
        $error_response = json_decode($response, true);
        $error_message = isset($error_response['error_description']) ? $error_response['error_description'] : 'Token refresh failed';
        echo json_encode([
            'success' => false, 
            'message' => $error_message,
            'http_code' => $http_code,
            'response' => $response
        ]);
    }
}
?>