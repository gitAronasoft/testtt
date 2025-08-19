<?php
/**
 * pubsub_callback.php
 * Handles PubSubHubbub callbacks for YouTube Data API v3 push notifications
 */

// 1. Handle verification request (GET) from PubSubHubbub hub
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['hub_challenge'])) {
    // Required for verifying subscription/unsubscription
    header('Content-Type: text/plain');
    echo $_GET['hub_challenge'];
    exit;
}

// 2. Handle POST notifications from YouTube
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $rawPostData = file_get_contents('php://input');

    // Optional: Log raw XML for debugging
    file_put_contents(__DIR__ . '/pubsub_debug.log', date('c') . "\n" . $rawPostData . "\n\n", FILE_APPEND);

    // // Parse XML
    // $xml = @simplexml_load_string($rawPostData, 'SimpleXMLElement', LIBXML_NOCDATA);
    // if ($xml === false) {
    //     http_response_code(400);
    //     exit('Invalid XML');
    // }

    // // Register namespace to access YouTube-specific tags
    // $xml->registerXPathNamespace('yt', 'http://www.youtube.com/xml/schemas/2015');

    // // Extract entries (there may be multiple in a feed)
    // foreach ($xml->entry as $entry) {
    //     $videoId = (string) $entry->children('yt', true)->videoId;
    //     $channelId = (string) $entry->children('yt', true)->channelId;
    //     $title = (string) $entry->title;
    //     $published = (string) $entry->published;

    //     // Here you can store the data in your database or trigger other actions
    //     file_put_contents(__DIR__ . '/pubsub_events.log',
    //         date('c') . " - New/Updated Video:\n" .
    //         "Video ID: $videoId\n" .
    //         "Channel ID: $channelId\n" .
    //         "Title: $title\n" .
    //         "Published: $published\n\n",
    //         FILE_APPEND
    //     );
    // }

    http_response_code(204); // No content
    exit;
}

// 3. Invalid method
http_response_code(405);
exit('Method Not Allowed');
