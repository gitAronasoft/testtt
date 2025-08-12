<?php
/**
 * YouTube OAuth2 Callback Handler
 * Handles the OAuth2 authorization code exchange
 */

require_once __DIR__ . '/../config/database.php';

// OAuth2 configuration
$clientId = '824425517340-c4g9ilvg3i7cddl75hvq1a8gromuc95n.apps.googleusercontent.com';
$clientSecret = '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';
$redirectUri = 'http://localhost:5000/api/oauth/youtube.php';

try {
    if (isset($_GET['code'])) {
        // Exchange authorization code for tokens
        $code = $_GET['code'];
        
        $tokenUrl = 'https://oauth2.googleapis.com/token';
        $postData = [
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'code' => $code,
            'grant_type' => 'authorization_code',
            'redirect_uri' => $redirectUri
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
                // Save tokens to database
                $database = new Database();
                $db = $database->getConnection();
                
                $userId = 7; // In production, get from authenticated session
                $accessToken = $tokenData['access_token'];
                $refreshToken = $tokenData['refresh_token'] ?? null;
                $expiresIn = $tokenData['expires_in'] ?? 3600;
                $expiresAt = date('Y-m-d H:i:s', time() + $expiresIn);
                
                // Create table if not exists
                $createTableSQL = "CREATE TABLE IF NOT EXISTS youtube_tokens (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    access_token TEXT,
                    refresh_token TEXT,
                    expires_at DATETIME,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    UNIQUE KEY unique_user (user_id)
                )";
                $db->exec($createTableSQL);
                
                // Insert or update tokens
                $stmt = $db->prepare("
                    INSERT INTO youtube_tokens (user_id, access_token, refresh_token, expires_at) 
                    VALUES (?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    access_token = VALUES(access_token),
                    refresh_token = COALESCE(VALUES(refresh_token), refresh_token),
                    expires_at = VALUES(expires_at),
                    updated_at = CURRENT_TIMESTAMP
                ");
                
                if ($stmt->execute([$userId, $accessToken, $refreshToken, $expiresAt])) {
                    // Send success message to parent window
                    echo '<script>
                        if (window.opener) {
                            window.opener.postMessage({
                                type: "YOUTUBE_AUTH_SUCCESS",
                                tokens: {
                                    access_token: "' . $accessToken . '",
                                    refresh_token: "' . ($refreshToken ?: '') . '",
                                    expires_at: "' . $expiresAt . '"
                                }
                            }, "*");
                            window.close();
                        } else {
                            document.body.innerHTML = "<h3>Authentication successful! You can close this window.</h3>";
                        }
                    </script>';
                } else {
                    throw new Exception('Failed to save tokens to database');
                }
            } else {
                throw new Exception('No access token in response');
            }
        } else {
            throw new Exception('Token exchange failed: HTTP ' . $httpCode);
        }
        
    } elseif (isset($_GET['error'])) {
        // Handle OAuth error
        $error = $_GET['error'];
        $errorDescription = $_GET['error_description'] ?? '';
        
        echo '<script>
            if (window.opener) {
                window.opener.postMessage({
                    type: "YOUTUBE_AUTH_ERROR",
                    error: "' . htmlspecialchars($error) . '",
                    description: "' . htmlspecialchars($errorDescription) . '"
                }, "*");
                window.close();
            } else {
                document.body.innerHTML = "<h3>Authentication failed: ' . htmlspecialchars($error) . '</h3>";
            }
        </script>';
    } else {
        throw new Exception('No authorization code or error received');
    }
    
} catch (Exception $e) {
    echo '<script>
        if (window.opener) {
            window.opener.postMessage({
                type: "YOUTUBE_AUTH_ERROR",
                error: "oauth_error",
                description: "' . htmlspecialchars($e->getMessage()) . '"
            }, "*");
            window.close();
        } else {
            document.body.innerHTML = "<h3>Error: ' . htmlspecialchars($e->getMessage()) . '</h3>";
        }
    </script>';
}
?>