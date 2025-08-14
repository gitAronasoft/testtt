
<?php
/**
 * Cron Job Setup Instructions and Manual Test Script
 * This file provides instructions for setting up the cron job and allows manual testing
 */

echo "=== YouTube Token Refresh Cron Job Setup ===\n\n";

echo "1. To set up automatic token refresh, add this to your crontab:\n";
echo "   # Refresh YouTube tokens every hour\n";
echo "   0 * * * * /usr/bin/php " . __DIR__ . "/refresh_youtube_tokens.php\n\n";

echo "2. Alternative: Run every 30 minutes for more frequent checks:\n";
echo "   # Refresh YouTube tokens every 30 minutes\n";
echo "   */30 * * * * /usr/bin/php " . __DIR__ . "/refresh_youtube_tokens.php\n\n";

echo "3. To edit crontab (if you have access):\n";
echo "   crontab -e\n\n";

echo "4. To test manually, run:\n";
echo "   php " . __DIR__ . "/refresh_youtube_tokens.php\n\n";

echo "5. To check logs:\n";
echo "   tail -f " . __DIR__ . "/../../logs/token_refresh.log\n\n";

// Manual test option
if (isset($_GET['test']) || (isset($argv[1]) && $argv[1] === 'test')) {
    echo "=== RUNNING MANUAL TEST ===\n";
    require_once 'refresh_youtube_tokens.php';
}
?>
