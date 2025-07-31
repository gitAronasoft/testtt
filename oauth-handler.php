<?php

require_once 'vendor/autoload.php'; // Composer autoloader

// SET YOUR CONFIGURATION
define('CLIENT_ID', '824425517340-c4g9ilvg3i7cddl75hvq1a8gromuc95n.apps.googleusercontent.com');
define('CLIENT_SECRET', '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');
define('REDIRECT_URI', 'https://2733f99a-66a9-4862-80b8-e425887aaf93-00-2d3swh2tz1w71.pike.replit.dev/oauth-handler.php');  
define('TOKEN_PATH', __DIR__ . '/tokens.json');

// Step 1: Initialize Google Client
$client = new Google_Client();
$client->setClientId(CLIENT_ID);
$client->setClientSecret(CLIENT_SECRET);
$client->setRedirectUri(REDIRECT_URI);
$client->setAccessType('offline'); // Needed for refresh token
$client->setPrompt('consent'); // Force consent to ensure refresh token is returned
$client->addScope([
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.channel-memberships.creator',
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/youtube.force-ssl',
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtubepartner-channel-audit',
    'https://www.googleapis.com/auth/userinfo.email'
]);

// Step 2: Handle OAuth Callback
if (isset($_GET['code'])) {
    $token = $client->fetchAccessTokenWithAuthCode($_GET['code']);

    if (!isset($token['error'])) {
        file_put_contents(TOKEN_PATH, json_encode($token));
        echo "✅ Tokens saved successfully.<br><a href='oauth-handler.php'>Continue</a>";
        exit;
    } else {
        echo "❌ Error: " . htmlspecialchars($token['error_description']);
        exit;
    }
}

// Step 3: Load Token if Already Saved
if (file_exists(TOKEN_PATH)) {
    $accessToken = json_decode(file_get_contents(TOKEN_PATH), true);
    $client->setAccessToken($accessToken);

    // Step 4: Refresh if Expired
    if ($client->isAccessTokenExpired()) {
        $client->fetchAccessTokenWithRefreshToken($client->getRefreshToken());
        file_put_contents(TOKEN_PATH, json_encode($client->getAccessToken()));
        echo "🔁 Access token refreshed.<br>";
    } else {
        echo "🔓 Access token is still valid.<br>";
    }

    // Step 5: Make an API call
    $oauth = new Google_Service_Oauth2($client);
    $userinfo = $oauth->userinfo->get();
    echo "👤 Logged in as: " . htmlspecialchars($userinfo->email);
    exit;
}

// Step 6: Redirect to Google for Authorization
$authUrl = $client->createAuthUrl();
echo "<a href='$authUrl'>🔐 Login with Google</a>";
