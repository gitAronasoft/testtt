<?php

// Replace with your actual credentials and redirect URI
$client_id = '824425517340-c4g9ilvg3i7cddl75hvq1a8gromuc95n.apps.googleusercontent.com';
$client_secret = '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';
$redirect_uri = 'http://localhost/oauth-handler.php'; // Must match your configured redirect URI

if (isset($_GET['code'])) {
    $authorization_code = $_GET['code'];

    // Google's token endpoint
    $token_endpoint = 'https://oauth2.googleapis.com/token';

    // Parameters for the POST request
    $post_data = array(
        'code' => $authorization_code,
        'client_id' => $client_id,
        'client_secret' => $client_secret,
        'redirect_uri' => $redirect_uri,
        'grant_type' => 'authorization_code'
    );

    // Initialize cURL
    $ch = curl_init($token_endpoint);

    // Set cURL options
    curl_setopt($ch, CURLOPT_POST, true); // Set as POST request
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($post_data)); // Set POST data
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // Return response as a string
    curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/x-www-form-urlencoded')); // Set header
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false); // For local testing, consider true in production

    // Execute cURL request
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    // Check for cURL errors
    if (curl_errno($ch)) {
        echo 'cURL Error: ' . curl_error($ch);
        exit();
    }

    // Close cURL session
    curl_close($ch);

    // Decode the JSON response
    $tokens = json_decode($response, true);

    // Check for successful token exchange
    if ($http_code == 200 && isset($tokens['access_token'])) {
        $access_token = $tokens['access_token'];
        $refresh_token = isset($tokens['refresh_token']) ? $tokens['refresh_token'] : null;

        echo "<h2>Successfully obtained tokens!</h2>";
        echo "Access Token: " . $access_token . "<br>";
        if ($refresh_token) {
            echo "Refresh Token: " . $refresh_token . "<br>";
        } else {
            echo "No refresh token received (may happen if access_type=offline was not used or user already granted access).<br>";
        }

        // TODO: Store the refresh token securely in a database for offline access
        // Example: saveRefreshTokenToDatabase($refresh_token);

        // You can now use the access token to make calls to Google APIs
        // Example: accessGoogleApiWithToken($access_token);

    } else {
        echo "<h2>Error exchanging authorization code for tokens.</h2>";
        echo "HTTP Code: " . $http_code . "<br>";
        echo "Response: " . $response . "<br>";
    }

} else {
    echo "No authorization code found in the URL. Please visit the authorization URL first.<br>";
    // You might want to redirect to the authorization URL here
}

?>