
<?php
session_start();
require_once '../api/config.php';

// Check if user is authenticated and is admin
if (!isset($_SESSION['user']) || $_SESSION['user']['role'] !== 'admin') {
    echo '<script>
        if (window.opener) {
            window.opener.postMessage({type: "YOUTUBE_AUTH_ERROR", error: "Admin access required"}, "*");
        }
        window.close();
    </script>';
    exit();
}

$client_id = '824425517340-c4g9ilvg3i7cddl75hvq1a8gromuc95n.apps.googleusercontent.com';
$client_secret = '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';
$redirect_uri = $_SERVER['REQUEST_SCHEME'] . '://' . $_SERVER['HTTP_HOST'] . '/oauth/youtube';

if (isset($_GET['code'])) {
    // Exchange code for tokens
    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => 'https://oauth2.googleapis.com/token',
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'client_id' => $client_id,
            'client_secret' => $client_secret,
            'code' => $_GET['code'],
            'grant_type' => 'authorization_code',
            'redirect_uri' => $redirect_uri
        ]),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/x-www-form-urlencoded'
        ]
    ]);

    $response = curl_exec($curl);
    $http_code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    curl_close($curl);

    if ($http_code === 200) {
        $token_data = json_decode($response, true);
        
        if (isset($token_data['access_token'])) {
            // Store tokens in database
            $conn = getConnection();
            
            // Deactivate existing tokens
            $deactivate_sql = "UPDATE youtube_tokens SET is_active = 0";
            $conn->query($deactivate_sql);
            
            // Insert new tokens
            $expires_at = date('Y-m-d H:i:s', time() + ($token_data['expires_in'] ?? 3600));
            $insert_sql = "INSERT INTO youtube_tokens (access_token, refresh_token, expires_at, is_active) VALUES (?, ?, ?, 1)";
            $stmt = $conn->prepare($insert_sql);
            $stmt->bind_param("sss", 
                $token_data['access_token'],
                $token_data['refresh_token'] ?? '',
                $expires_at
            );
            
            if ($stmt->execute()) {
                echo '<script>
                    if (window.opener) {
                        window.opener.postMessage({type: "YOUTUBE_AUTH_SUCCESS"}, "*");
                    }
                    window.close();
                </script>';
            } else {
                echo '<script>
                    if (window.opener) {
                        window.opener.postMessage({type: "YOUTUBE_AUTH_ERROR", error: "Failed to store tokens"}, "*");
                    }
                    window.close();
                </script>';
            }
            $conn->close();
        } else {
            echo '<script>
                if (window.opener) {
                    window.opener.postMessage({type: "YOUTUBE_AUTH_ERROR", error: "Invalid token response"}, "*");
                }
                window.close();
            </script>';
        }
    } else {
        echo '<script>
            if (window.opener) {
                window.opener.postMessage({type: "YOUTUBE_AUTH_ERROR", error: "Token exchange failed"}, "*");
            }
            window.close();
        </script>';
    }
} else if (isset($_GET['error'])) {
    echo '<script>
        if (window.opener) {
            window.opener.postMessage({type: "YOUTUBE_AUTH_ERROR", error: "' . htmlspecialchars($_GET['error']) . '"}, "*");
        }
        window.close();
    </script>';
} else {
    echo '<h3>YouTube OAuth</h3><p>Processing authentication...</p>';
}
?>
