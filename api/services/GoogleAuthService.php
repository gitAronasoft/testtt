
<?php
/**
 * Google Authentication Service for VideoHub
 */

class GoogleAuthService {
    private $clientId = '824425517340-c4g9ilvg3i7cddl75hvq1a8gromuc95n.apps.googleusercontent.com';
    
    /**
     * Verify Google JWT token
     */
    public function verifyGoogleToken($credential) {
        // Decode the JWT token (basic implementation)
        $parts = explode('.', $credential);
        if (count($parts) !== 3) {
            error_log('Invalid JWT token format: expected 3 parts, got ' . count($parts));
            return false;
        }
        
        try {
            // Add padding if needed for base64 decoding
            $payload_encoded = $parts[1];
            $payload_encoded .= str_repeat('=', (4 - strlen($payload_encoded) % 4) % 4);
            
            // Decode the payload (second part)
            $payload = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload_encoded)), true);
            
            if (!$payload) {
                error_log('Failed to decode JWT payload');
                return false;
            }
            
            // Log payload for debugging (remove in production)
            error_log('JWT payload: ' . json_encode($payload));
            
            // Verify the token is for our client
            if (!isset($payload['aud']) || $payload['aud'] !== $this->clientId) {
                error_log('Invalid audience: expected ' . $this->clientId . ', got ' . ($payload['aud'] ?? 'none'));
                return false;
            }
            
            // Check token expiration
            if (!isset($payload['exp']) || $payload['exp'] < time()) {
                error_log('Token expired: ' . ($payload['exp'] ?? 'no exp') . ' < ' . time());
                return false;
            }
            
            // Return user data
            return [
                'email' => $payload['email'] ?? '',
                'name' => $payload['name'] ?? '',
                'given_name' => $payload['given_name'] ?? '',
                'family_name' => $payload['family_name'] ?? '',
                'picture' => $payload['picture'] ?? '',
                'email_verified' => $payload['email_verified'] ?? false
            ];
            
        } catch (Exception $e) {
            error_log('Google token verification error: ' . $e->getMessage());
            return false;
        }
    }
}
?>
