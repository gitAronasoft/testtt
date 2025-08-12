<?php
/**
 * YouTube Tokens API for VideoHub
 * Handles OAuth tokens storage and refresh logic
 */

require_once __DIR__ . '/config/cors.php';
require_once __DIR__ . '/config/database.php';

// Get database connection
$database = new Database();
$db = $database->getConnection();

// Get request method and input
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true);

// Client credentials (in production, store these securely)
$clientId = '824425517340-c4g9ilvg3i7cddl75hvq1a8gromuc95n.apps.googleusercontent.com';
$clientSecret = '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';

try {
    // Create youtube_tokens table if it doesn't exist
    $createTableSQL = "CREATE TABLE IF NOT EXISTS youtube_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,  
        access_token TEXT,
        refresh_token TEXT,
        expires_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user (user_id)
    )";
    
    try {
        $db->exec($createTableSQL);
    } catch (PDOException $e) {
        // Table might already exist, continue
        error_log("YouTube tokens table creation: " . $e->getMessage());
    }

    switch ($method) {
        case 'GET':
            if (isset($_GET['action']) && $_GET['action'] === 'get_tokens') {
                // Get tokens for current user (for demo, use user ID 7)              
                
                $stmt = $db->prepare("SELECT * FROM youtube_tokens ORDER BY updated_at DESC LIMIT 1");
                $stmt->execute();
                $token = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($token) {
                    // Check if token is expired
                    $expiresAt = new DateTime($token['expires_at']);
                    $now = new DateTime();
                    
                    if ($now >= $expiresAt) {
                        http_response_code(200);
                        echo json_encode([
                            'success' => false,
                            'expired' => true,
                            'refresh_token' => $token['refresh_token'],
                            'message' => 'Token expired'
                        ]);
                    } else {
                        http_response_code(200);
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
                    http_response_code(200);
                    echo json_encode([
                        'success' => false,
                        'message' => 'No tokens found'
                    ]);
                }
            }
            break;
            
        case 'POST':
            if ($input['action'] === 'save_tokens') {
                // Save new tokens            
                $accessToken = $input['access_token'];
                $refreshToken = $input['refresh_token'];
                $expiresIn = $input['expires_in'] ?? 3600; // Default 1 hour
                
                $expiresAt = date('Y-m-d H:i:s', time() + $expiresIn);
                
                // Insert or update tokens
                $stmt = $db->prepare("
                    INSERT INTO youtube_tokens (access_token, refresh_token, expires_at) 
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    access_token = VALUES(access_token),
                    refresh_token = VALUES(refresh_token),
                    expires_at = VALUES(expires_at),
                    updated_at = CURRENT_TIMESTAMP
                ");
                
                if ($stmt->execute([$accessToken, $refreshToken, $expiresAt])) {
                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'message' => 'Tokens saved successfully'
                    ]);
                } else {
                    throw new Exception('Failed to save tokens');
                }
                
            } elseif ($input['action'] === 'refresh_token') {
                // Refresh access token
                $refreshToken = $input['refresh_token'];
                
                // Make request to Google OAuth2 token endpoint
                $tokenUrl = 'https://oauth2.googleapis.com/token';
                $postData = [
                    'client_id' => $clientId,
                    'client_secret' => $clientSecret,
                    'refresh_token' => $refreshToken,
                    'grant_type' => 'refresh_token'
                ];
                
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $tokenUrl);
                curl_setopt($ch, CURLOPT_POST, true);
                curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'Content-Type: application/x-www-form-urlencoded'
                ]);
                
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);
                
                if ($httpCode === 200) {
                    $tokenData = json_decode($response, true);
                    
                    if (isset($tokenData['access_token'])) {                     
                        $newAccessToken = $tokenData['access_token'];
                        $expiresIn = $tokenData['expires_in'] ?? 3600;
                        $expiresAt = date('Y-m-d H:i:s', time() + $expiresIn);
                        
                        // Update access token in database
                        $stmt = $db->prepare("
                            UPDATE youtube_tokens 
                            SET access_token = ?, expires_at = ?, updated_at = CURRENT_TIMESTAMP");
                        
                        if ($stmt->execute([$newAccessToken, $expiresAt])) {
                            http_response_code(200);
                            echo json_encode([
                                'success' => true,
                                'tokens' => [
                                    'access_token' => $newAccessToken,
                                    'refresh_token' => $refreshToken,
                                    'expires_at' => $expiresAt
                                ]
                            ]);
                        } else {
                            throw new Exception('Failed to update tokens in database');
                        }
                    } else {
                        throw new Exception('Invalid response from Google OAuth2');
                    }
                } else {
                    throw new Exception('Failed to refresh token: HTTP ' . $httpCode);
                }
                
            } elseif ($input['action'] === 'clear_tokens') {
                // Clear tokens (sign out)           
                
                $stmt = $db->prepare("DELETE FROM youtube_tokens");
                if ($stmt->execute()) {
                    http_response_code(200);
                    echo json_encode([
                        'success' => true,
                        'message' => 'Tokens cleared successfully'
                    ]);
                } else {
                    throw new Exception('Failed to clear tokens');
                }
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
        'message' => $e->getMessage()
    ]);
}
?>