
<?php
session_start();
require_once '../api/config.php';

// Check if user is admin
if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
    echo '<script>
        window.opener.postMessage({type: "YOUTUBE_AUTH_ERROR", error: "Admin access required"}, window.location.origin);
        window.close();
    </script>';
    exit();
}

if (isset($_GET['code'])) {
    $code = $_GET['code'];
    $client_id = '824425517340-c4g9ilvg3i7cddl75hvq1a8gromuc95n.apps.googleusercontent.com';
    $client_secret = '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';
    $redirect_uri = $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'] . '/oauth/youtube';

    // Exchange authorization code for access token
    $token_url = 'https://oauth2.googleapis.com/token';
    $token_data = [
        'client_id' => $client_id,
        'client_secret' => $client_secret,
        'code' => $code,
        'grant_type' => 'authorization_code',
        'redirect_uri' => $redirect_uri
    ];

    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => $token_url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query($token_data),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/x-www-form-urlencoded'
        ]
    ]);

    $response = curl_exec($curl);
    $http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);

    if ($http_code === 200) {
        $token_response = json_decode($response, true);

        if (isset($token_response['access_token'])) {
            // Store tokens in database
            $conn = getConnection();
            
            // Create table if it doesn't exist (using new global structure)
            $create_table = "
            CREATE TABLE IF NOT EXISTS youtube_tokens (
                id INT AUTO_INCREMENT PRIMARY KEY,
                token_type ENUM('global', 'backup') DEFAULT 'global',
                access_token TEXT NOT NULL,
                refresh_token TEXT,
                expires_at DATETIME NOT NULL,
                scope TEXT,
                token_info JSON,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY unique_token_type (token_type, is_active)
            )";
            $conn->query($create_table);
            
            // Deactivate existing global tokens
            $deactivate_sql = "UPDATE youtube_tokens SET is_active = 0 WHERE token_type = 'global'";
            $conn->query($deactivate_sql);
            
            // Insert new global token
            $expires_at = date('Y-m-d H:i:s', time() + $token_response['expires_in']);
            
            $insert_sql = "INSERT INTO youtube_tokens (token_type, access_token, refresh_token, expires_at, scope, is_active) VALUES (?, ?, ?, ?, ?, ?)";
            $insert_stmt = $conn->prepare($insert_sql);
            $token_type = 'global';
            $is_active = 1;
            $insert_stmt->bind_param("sssssi", 
                $token_type,
                $token_response['access_token'],
                $token_response['refresh_token'] ?? '',
                $expires_at,
                $token_response['scope'] ?? 'https://www.googleapis.com/auth/youtube',
                $is_active
            );
            
            if ($insert_stmt->execute()) {
                $conn->close();
                echo '<script>
                    window.opener.postMessage({type: "YOUTUBE_AUTH_SUCCESS"}, window.location.origin);
                    window.close();
                </script>';
            } else {
                $conn->close();
                echo '<script>
                    window.opener.postMessage({type: "YOUTUBE_AUTH_ERROR", error: "Failed to store tokens"}, window.location.origin);
                    window.close();
                </script>';
            }
        } else {
            echo '<script>
                window.opener.postMessage({type: "YOUTUBE_AUTH_ERROR", error: "No access token received"}, window.location.origin);
                window.close();
            </script>';
        }
    } else {
        echo '<script>
            window.opener.postMessage({type: "YOUTUBE_AUTH_ERROR", error: "Token exchange failed"}, window.location.origin);
            window.close();
        </script>';
    }
} elseif (isset($_GET['error'])) {
    echo '<script>
        window.opener.postMessage({type: "YOUTUBE_AUTH_ERROR", error: "' . htmlspecialchars($_GET['error']) . '"}, window.location.origin);
        window.close();
    </script>';
} else {
    echo '<script>
        window.opener.postMessage({type: "YOUTUBE_AUTH_ERROR", error: "No authorization code received"}, window.location.origin);
        window.close();
    </script>';
}
?>
