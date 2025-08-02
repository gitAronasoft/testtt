
<?php
session_start();
require_once '../api/config.php';

// Check if we have an authorization code
if (!isset($_GET['code'])) {
    echo '<script>
        window.opener.postMessage({type: "YOUTUBE_AUTH_ERROR", error: "No authorization code received"}, "*");
        window.close();
    </script>';
    exit();
}

$authCode = $_GET['code'];

// Exchange authorization code for tokens
$clientId = '824425517340-c4g9ilvg3i7cddl75hvq1a8gromuc95n.apps.googleusercontent.com';
$clientSecret = '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';
$redirectUri = (isset($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . '/oauth/youtube';

$tokenData = [
    'code' => $authCode,
    'client_id' => $clientId,
    'client_secret' => $clientSecret,
    'redirect_uri' => $redirectUri,
    'grant_type' => 'authorization_code'
];

$curl = curl_init();
curl_setopt_array($curl, [
    CURLOPT_URL => 'https://oauth2.googleapis.com/token',
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query($tokenData),
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/x-www-form-urlencoded'
    ]
]);

$response = curl_exec($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

if ($httpCode === 200) {
    $tokens = json_decode($response, true);
    
    if (isset($tokens['access_token'])) {
        // Store tokens in database
        $conn = getConnection();
        
        // Create table if not exists
        $createTable = "
        CREATE TABLE IF NOT EXISTS youtube_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,        
            access_token TEXT NOT NULL,
            refresh_token TEXT,
            expires_at DATETIME NOT NULL,        
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP       
        )";
        $conn->query($createTable);
        
        // Deactivate existing tokens
        $conn->query("UPDATE youtube_tokens SET is_active = 0");
        
        // Insert new tokens
        $expiresAt = date('Y-m-d H:i:s', time() + ($tokens['expires_in'] ?? 3600));
        $stmt = $conn->prepare("INSERT INTO youtube_tokens (access_token, refresh_token, expires_at, is_active) VALUES (?, ?, ?, 1)");
        $stmt->bind_param("sss", $tokens['access_token'], $tokens['refresh_token'] ?? '', $expiresAt);
        
        if ($stmt->execute()) {
            echo '<script>
                window.opener.postMessage({type: "YOUTUBE_AUTH_SUCCESS"}, "*");
                window.close();
            </script>';
        } else {
            echo '<script>
                window.opener.postMessage({type: "YOUTUBE_AUTH_ERROR", error: "Failed to store tokens"}, "*");
                window.close();
            </script>';
        }
        
        $conn->close();
    } else {
        echo '<script>
            window.opener.postMessage({type: "YOUTUBE_AUTH_ERROR", error: "Invalid token response"}, "*");
            window.close();
        </script>';
    }
} else {
    echo '<script>
        window.opener.postMessage({type: "YOUTUBE_AUTH_ERROR", error: "Token exchange failed"}, "*");
        window.close();
    </script>';
}
?>
