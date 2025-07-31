<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Error handler to ensure JSON responses
set_error_handler(function($severity, $message, $file, $line) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error: ' . $message]);
    exit();
});

// Exception handler
set_exception_handler(function($exception) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Exception: ' . $exception->getMessage()]);
    exit();
});

// Handle different request methods
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? $_POST['action'] ?? '';
} else {
    $action = $_GET['action'] ?? '';
}

switch ($action) {
    case 'store_tokens':
        handleStoreTokens();
        break;
    case 'get_tokens':
        handleGetTokens();
        break;
    case 'refresh_token':
        handleRefreshToken();
        break;
    case 'validate_token':
        handleValidateToken();
        break;
    case 'clear_tokens':
        handleClearTokens();
        break;
    case 'get_token_info':
        handleGetTokenInfo();
        break;
    default:
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid action: ' . $action]);
}

function handleStoreTokens() {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!isset($input['tokens'])) {
        echo json_encode(['success' => false, 'message' => 'No tokens provided']);
        return;
    }

    $tokens = $input['tokens'];
    $conn = getConnection();

    try {
        // Deactivate old tokens first
        $deactivate_stmt = $conn->prepare("UPDATE youtube_tokens SET is_active = FALSE WHERE token_type = 'global' AND is_active = TRUE");
        $deactivate_stmt->execute();

        // Store new global token
        $stmt = $conn->prepare("
            INSERT INTO youtube_tokens (
                token_type, access_token, refresh_token, expires_at, 
                scope, token_info, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, TRUE, NOW(), NOW())
        ");

        $expires_at = isset($tokens['expires_at']) ? $tokens['expires_at'] : 
                     date('Y-m-d H:i:s', time() + (isset($tokens['expires_in']) ? $tokens['expires_in'] : 3600));
        
        $scope = $tokens['scope'] ?? 'https://www.googleapis.com/auth/youtube';
        $token_info = json_encode([
            'created_at' => time(),
            'token_type' => $tokens['token_type'] ?? 'Bearer',
            'client_id' => $tokens['client_id'] ?? null
        ]);

        $stmt->bind_param("ssssss", 
            'global',
            $tokens['access_token'], 
            $tokens['refresh_token'], 
            $expires_at,
            $scope,
            $token_info
        );

        $stmt->execute();

        echo json_encode([
            'success' => true, 
            'message' => 'Global YouTube tokens stored successfully',
            'token_id' => $conn->insert_id
        ]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Failed to store tokens: ' . $e->getMessage()]);
    }

    $conn->close();
}

function handleGetTokens() {
    $conn = getConnection();

    try {
        // Get the most recent active global token
        $stmt = $conn->prepare("
            SELECT access_token, refresh_token, expires_at 
            FROM youtube_tokens          
            ORDER BY updated_at DESC 
            LIMIT 1
        ");
        
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $tokens = $result->fetch_assoc();
            
            // Check if token is expired (with 5-minute buffer)
            $expires_at = new DateTime($tokens['expires_at']);
            $now = new DateTime();
            $buffer = new DateInterval('PT5M'); // 5 minutes
            
            if ($expires_at->sub($buffer) <= $now) {
                // Token is expired or about to expire
                if (!empty($tokens['refresh_token'])) {
                    // Attempt to refresh the token
                    $refreshResult = refreshAccessToken($tokens['refresh_token'], $conn);
                    if ($refreshResult['success']) {
                        echo json_encode($refreshResult);
                        $conn->close();
                        return;
                    }
                }
                
                echo json_encode([
                    'success' => false, 
                    'message' => 'Token expired and refresh failed',
                    'expired' => true
                ]);
            } else {
                echo json_encode([
                    'success' => true, 
                    'tokens' => $tokens,
                    'expires_in' => $expires_at->getTimestamp() - time()
                ]);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'No active tokens found']);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Failed to get tokens: ' . $e->getMessage()]);
    }

    $conn->close();
}

function handleRefreshToken() {
    $input = json_decode(file_get_contents('php://input'), true);
    $refresh_token = $input['refresh_token'] ?? '';
    
    if (empty($refresh_token)) {
        echo json_encode(['success' => false, 'message' => 'Refresh token required']);
        return;
    }

    $conn = getConnection();
    $result = refreshAccessToken($refresh_token, $conn);
    echo json_encode($result);
    $conn->close();
}

function refreshAccessToken($refresh_token, $conn) {
    $client_id = '824425517340-c4g9ilvg3i7cddl75hvq1a8gromuc95n.apps.googleusercontent.com';
    $client_secret = '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';
    
    $post_data = http_build_query([
        'client_id' => $client_id,
        'client_secret' => $client_secret,
        'refresh_token' => $refresh_token,
        'grant_type' => 'refresh_token'
    ]);

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/x-www-form-urlencoded',
            'content' => $post_data
        ]
    ]);

    try {
        $response = file_get_contents('https://oauth2.googleapis.com/token', false, $context);
        
        if ($response === FALSE) {
            return ['success' => false, 'message' => 'Failed to contact Google OAuth server'];
        }

        $token_data = json_decode($response, true);

        if (isset($token_data['access_token'])) {
            // Update the database with new access token
            $expires_at = date('Y-m-d H:i:s', time() + ($token_data['expires_in'] ?? 3600));
            
            $stmt = $conn->prepare("
                UPDATE youtube_tokens 
                SET access_token = ?, expires_at = ?, updated_at = NOW() 
                WHERE refresh_token = ? AND is_active = TRUE
            ");
            
            $stmt->bind_param("sss", $token_data['access_token'], $expires_at, $refresh_token);
            $stmt->execute();

            return [
                'success' => true,
                'message' => 'Token refreshed successfully',
                'tokens' => [
                    'access_token' => $token_data['access_token'],
                    'refresh_token' => $refresh_token,
                    'expires_at' => $expires_at
                ]
            ];
        } else {
            return [
                'success' => false, 
                'message' => 'Token refresh failed: ' . ($token_data['error_description'] ?? 'Unknown error')
            ];
        }
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Token refresh error: ' . $e->getMessage()];
    }
}

function handleValidateToken() {
    $conn = getConnection();
    
    try {
        $stmt = $conn->prepare("
            SELECT access_token, expires_at 
            FROM youtube_tokens 
            WHERE token_type = 'global' AND is_active = TRUE 
            ORDER BY updated_at DESC 
            LIMIT 1
        ");
        
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows > 0) {
            $token_data = $result->fetch_assoc();
            $access_token = $token_data['access_token'];
            
            // Validate token with Google
            $validation_url = "https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=" . urlencode($access_token);
            $validation_response = file_get_contents($validation_url);
            
            if ($validation_response !== FALSE) {
                $validation_data = json_decode($validation_response, true);
                
                if (isset($validation_data['scope'])) {
                    echo json_encode([
                        'success' => true,
                        'valid' => true,
                        'scope' => $validation_data['scope'],
                        'expires_in' => $validation_data['expires_in'] ?? 0
                    ]);
                } else {
                    echo json_encode(['success' => true, 'valid' => false, 'message' => 'Token invalid']);
                }
            } else {
                echo json_encode(['success' => false, 'message' => 'Failed to validate token']);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'No tokens to validate']);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Validation error: ' . $e->getMessage()]);
    }

    $conn->close();
}

function handleClearTokens() {
    $conn = getConnection();

    try {
        $stmt = $conn->prepare("UPDATE youtube_tokens SET is_active = FALSE WHERE token_type = 'global'");
        $stmt->execute();

        echo json_encode(['success' => true, 'message' => 'All tokens cleared successfully']);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Failed to clear tokens: ' . $e->getMessage()]);
    }

    $conn->close();
}

function handleGetTokenInfo() {
    $conn = getConnection();

    try {
        $stmt = $conn->prepare("
            SELECT token_type, expires_at, scope, created_at, updated_at 
            FROM youtube_tokens 
            WHERE is_active = TRUE 
            ORDER BY updated_at DESC
        ");
        
        $stmt->execute();
        $result = $stmt->get_result();
        $tokens = [];
        
        while ($row = $result->fetch_assoc()) {
            $tokens[] = $row;
        }

        echo json_encode(['success' => true, 'tokens' => $tokens]);
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'message' => 'Failed to get token info: ' . $e->getMessage()]);
    }

    $conn->close();
}
?>
