
<?php
/**
 * YouTube Token Refresh Cron Job
 * This script should be run periodically (e.g., every hour) to refresh YouTube access tokens
 * Usage: php api/cron/refresh_youtube_tokens.php
 */

// Set script execution time limit
set_time_limit(300); // 5 minutes

// Include required files
require_once __DIR__ . '/../config/database.php';

class YouTubeTokenRefreshCron {
    private $db;
    private $clientId = '824425517340-c4g9ilvg3i7cddl75hvq1a8gromuc95n.apps.googleusercontent.com';
    private $clientSecret = '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';
    private $logFile;

    public function __construct() {
        try {
            $database = new Database();
            $this->db = $database->getConnection();
            $this->logFile = __DIR__ . '/../../logs/token_refresh.log';
            
            // Create logs directory if it doesn't exist
            $logDir = dirname($this->logFile);
            if (!is_dir($logDir)) {
                mkdir($logDir, 0755, true);
            }
            
        } catch (Exception $e) {
            $this->log('CRITICAL', 'Failed to initialize: ' . $e->getMessage());
            exit(1);
        }
    }

    /**
     * Main execution method
     */
    public function run() {
        $this->log('INFO', 'Starting YouTube token refresh cron job');
        
        try {
            // Get tokens that need refresh (expired or expiring within 5 minutes)
            $tokensToRefresh = $this->getTokensNeedingRefresh();
            
            if (empty($tokensToRefresh)) {
                $this->log('INFO', 'No tokens need refresh at this time');
                return;
            }

            $refreshedCount = 0;
            $failedCount = 0;

            foreach ($tokensToRefresh as $tokenRecord) {
                try {
                    $newAccessToken = $this->refreshAccessToken($tokenRecord['refresh_token']);
                    
                    if ($newAccessToken) {
                        $this->updateTokenInDatabase($tokenRecord['id'], $newAccessToken);
                        $refreshedCount++;
                        $this->log('INFO', "Successfully refreshed token for record ID: {$tokenRecord['id']}");
                    } else {
                        $failedCount++;
                        $this->log('ERROR', "Failed to refresh token for record ID: {$tokenRecord['id']}");
                    }
                    
                } catch (Exception $e) {
                    $failedCount++;
                    $this->log('ERROR', "Exception refreshing token for record ID {$tokenRecord['id']}: " . $e->getMessage());
                }
                
                // Small delay between requests to avoid rate limiting
                usleep(500000); // 0.5 seconds
            }

            $this->log('INFO', "Cron job completed. Refreshed: $refreshedCount, Failed: $failedCount");
            
        } catch (Exception $e) {
            $this->log('CRITICAL', 'Cron job failed: ' . $e->getMessage());
            exit(1);
        }
    }

    /**
     * Get tokens that need refresh (expired or expiring within 5 minutes)
     */
    private function getTokensNeedingRefresh() {
        try {
            $stmt = $this->db->prepare("
                SELECT id, refresh_token, expires_at 
                FROM youtube_tokens 
                WHERE refresh_token IS NOT NULL 
                AND refresh_token != ''
                AND (expires_at IS NULL OR expires_at <= DATE_ADD(NOW(), INTERVAL 5 MINUTE))
                ORDER BY expires_at ASC
            ");
            
            $stmt->execute();
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
            
        } catch (PDOException $e) {
            throw new Exception('Database query failed: ' . $e->getMessage());
        }
    }

    /**
     * Refresh access token using refresh token
     */
    private function refreshAccessToken($refreshToken) {
        $tokenUrl = 'https://oauth2.googleapis.com/token';
        
        $postData = [
            'client_id' => $this->clientId,
            'client_secret' => $this->clientSecret,
            'refresh_token' => $refreshToken,
            'grant_type' => 'refresh_token'
        ];

        $curl = curl_init();
        
        curl_setopt_array($curl, [
            CURLOPT_URL => $tokenUrl,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_ENCODING => '',
            CURLOPT_MAXREDIRS => 10,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
            CURLOPT_CUSTOMREQUEST => 'POST',
            CURLOPT_POSTFIELDS => http_build_query($postData),
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/x-www-form-urlencoded',
                'User-Agent: VideoHub-TokenRefresh/1.0'
            ],
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2
        ]);

        $response = curl_exec($curl);
        $httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
        $curlError = curl_error($curl);
        curl_close($curl);

        if ($curlError) {
            throw new Exception('cURL error: ' . $curlError);
        }

        if ($httpCode !== 200) {
            $this->log('ERROR', "Token refresh failed with HTTP code: $httpCode, Response: $response");
            return false;
        }

        $tokenData = json_decode($response, true);
        
        if (!$tokenData || !isset($tokenData['access_token'])) {
            $this->log('ERROR', 'Invalid response from Google OAuth2: ' . $response);
            return false;
        }

        return [
            'access_token' => $tokenData['access_token'],
            'expires_in' => $tokenData['expires_in'] ?? 3600
        ];
    }

    /**
     * Update token in database
     */
    private function updateTokenInDatabase($recordId, $tokenData) {
        try {
            $expiresAt = date('Y-m-d H:i:s', time() + $tokenData['expires_in']);
            
            $stmt = $this->db->prepare("
                UPDATE youtube_tokens 
                SET access_token = ?, 
                    expires_at = ?, 
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = ?
            ");
            
            if (!$stmt->execute([$tokenData['access_token'], $expiresAt, $recordId])) {
                throw new Exception('Failed to update token in database');
            }
            
        } catch (PDOException $e) {
            throw new Exception('Database update failed: ' . $e->getMessage());
        }
    }

    /**
     * Log messages with timestamp
     */
    private function log($level, $message) {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[$timestamp] [$level] $message" . PHP_EOL;
        
        // Write to log file
        file_put_contents($this->logFile, $logMessage, FILE_APPEND | LOCK_EX);
        
        // Also output to console if running from command line
        if (php_sapi_name() === 'cli') {
            echo $logMessage;
        }
    }

    /**
     * Clean up old log entries (keep last 30 days)
     */
    public function cleanupLogs() {
        if (file_exists($this->logFile)) {
            $lines = file($this->logFile);
            $cutoffDate = date('Y-m-d', strtotime('-30 days'));
            $filteredLines = [];
            
            foreach ($lines as $line) {
                if (preg_match('/^\[(\d{4}-\d{2}-\d{2})/', $line, $matches)) {
                    if ($matches[1] >= $cutoffDate) {
                        $filteredLines[] = $line;
                    }
                }
            }
            
            file_put_contents($this->logFile, implode('', $filteredLines));
        }
    }
}

// Run the cron job if this file is executed directly
if (php_sapi_name() === 'cli' || basename(__FILE__) === basename($_SERVER['SCRIPT_NAME'])) {
    try {
        $cronJob = new YouTubeTokenRefreshCron();
        $cronJob->run();
        
        // Clean up old logs once per day (you can adjust this logic)
        if (date('H') === '00') {
            $cronJob->cleanupLogs();
        }
        
    } catch (Exception $e) {
        error_log('YouTube Token Refresh Cron Job Error: ' . $e->getMessage());
        exit(1);
    }
}
?>
