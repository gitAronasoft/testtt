
<?php
require_once 'config.php';

class PaymentManager {
    private $pdo;
    
    public function __construct($pdo) {
        $this->pdo = $pdo;
    }
    
    public function createPaymentIntent($userId, $videoId, $amount) {
        // Using Stripe as example
        \Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);
        
        try {
            $paymentIntent = \Stripe\PaymentIntent::create([
                'amount' => $amount * 100, // Convert to cents
                'currency' => 'usd',
                'metadata' => [
                    'user_id' => $userId,
                    'video_id' => $videoId
                ]
            ]);
            
            // Store payment record
            $stmt = $this->pdo->prepare("INSERT INTO payments (user_id, video_id, amount, payment_method, transaction_id, status) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$userId, $videoId, $amount, 'stripe', $paymentIntent->id, 'pending']);
            
            return $paymentIntent->client_secret;
        } catch (Exception $e) {
            return false;
        }
    }
    
    public function confirmPayment($paymentIntentId) {
        try {
            \Stripe\Stripe::setApiKey(STRIPE_SECRET_KEY);
            $paymentIntent = \Stripe\PaymentIntent::retrieve($paymentIntentId);
            
            if ($paymentIntent->status === 'succeeded') {
                $userId = $paymentIntent->metadata->user_id;
                $videoId = $paymentIntent->metadata->video_id;
                
                // Update payment status
                $stmt = $this->pdo->prepare("UPDATE payments SET status = 'completed' WHERE transaction_id = ?");
                $stmt->execute([$paymentIntentId]);
                
                // Grant video access
                $this->grantVideoAccess($userId, $videoId);
                
                return true;
            }
        } catch (Exception $e) {
            return false;
        }
        
        return false;
    }
    
    public function grantVideoAccess($userId, $videoId, $duration = null) {
        $expiresAt = $duration ? date('Y-m-d H:i:s', time() + $duration) : null;
        
        $stmt = $this->pdo->prepare("
            INSERT INTO video_access (user_id, video_id, expires_at) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
            access_granted_at = CURRENT_TIMESTAMP, 
            expires_at = VALUES(expires_at)
        ");
        
        $stmt->execute([$userId, $videoId, $expiresAt]);
    }
    
    public function hasVideoAccess($userId, $videoId) {
        // Check if user has admin/editor role
        $stmt = $this->pdo->prepare("SELECT role FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($user && in_array($user['role'], ['admin', 'editor'])) {
            return true;
        }
        
        // Check if video is free
        $stmt = $this->pdo->prepare("SELECT is_free FROM videos WHERE id = ?");
        $stmt->execute([$videoId]);
        $video = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($video && $video['is_free']) {
            return true;
        }
        
        // Check if user has paid access
        $stmt = $this->pdo->prepare("
            SELECT * FROM video_access 
            WHERE user_id = ? AND video_id = ? 
            AND (expires_at IS NULL OR expires_at > NOW())
        ");
        $stmt->execute([$userId, $videoId]);
        
        return $stmt->fetch(PDO::FETCH_ASSOC) !== false;
    }
}
?>
