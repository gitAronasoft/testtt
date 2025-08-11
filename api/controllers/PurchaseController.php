<?php
/**
 * Purchase Controller for VideoShare Platform
 */

require_once __DIR__ . '/../config/database.php';

class PurchaseController {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Purchase a video
     */
    public function purchaseVideo($userId, $videoId) {
        try {
            // Check if video exists
            $videoStmt = $this->db->prepare("SELECT id, price, creator_id FROM videos WHERE id = ? AND status = 'active'");
            $videoStmt->bind_param("i", $videoId);
            $videoStmt->execute();
            $videoResult = $videoStmt->get_result();
            
            if ($videoResult->num_rows === 0) {
                return $this->sendError('Video not found', 404);
            }
            
            $video = $videoResult->fetch_assoc();
            
            // Check if user already purchased this video
            $purchaseStmt = $this->db->prepare("SELECT id FROM purchases WHERE user_id = ? AND video_id = ? AND status = 'completed'");
            $purchaseStmt->bind_param("ii", $userId, $videoId);
            $purchaseStmt->execute();
            $purchaseResult = $purchaseStmt->get_result();
            
            if ($purchaseResult->num_rows > 0) {
                return $this->sendError('Video already purchased', 409);
            }
            
            // Check user wallet balance
            $walletStmt = $this->db->prepare("SELECT balance FROM wallets WHERE user_id = ?");
            $walletStmt->bind_param("i", $userId);
            $walletStmt->execute();
            $walletResult = $walletStmt->get_result();
            
            if ($walletResult->num_rows === 0) {
                return $this->sendError('Wallet not found', 404);
            }
            
            $wallet = $walletResult->fetch_assoc();
            
            if ($wallet['balance'] < $video['price']) {
                return $this->sendError('Insufficient wallet balance', 400);
            }
            
            // Start transaction
            $this->db->getConnection()->autocommit(FALSE);
            
            try {
                // Create purchase record
                $transactionId = uniqid('txn_');
                $insertPurchase = $this->db->prepare("INSERT INTO purchases (user_id, video_id, amount, transaction_id, status) VALUES (?, ?, ?, ?, 'completed')");
                $insertPurchase->bind_param("iids", $userId, $videoId, $video['price'], $transactionId);
                $insertPurchase->execute();
                
                // Deduct from buyer's wallet
                $updateBuyerWallet = $this->db->prepare("UPDATE wallets SET balance = balance - ? WHERE user_id = ?");
                $updateBuyerWallet->bind_param("di", $video['price'], $userId);
                $updateBuyerWallet->execute();
                
                // Add to creator's wallet
                $updateCreatorWallet = $this->db->prepare("UPDATE wallets SET balance = balance + ? WHERE user_id = ?");
                $updateCreatorWallet->bind_param("di", $video['price'], $video['creator_id']);
                $updateCreatorWallet->execute();
                
                // Increment video view count
                $updateViews = $this->db->prepare("UPDATE videos SET view_count = view_count + 1 WHERE id = ?");
                $updateViews->bind_param("i", $videoId);
                $updateViews->execute();
                
                // Commit transaction
                $this->db->getConnection()->commit();
                $this->db->getConnection()->autocommit(TRUE);
                
                return $this->sendSuccess([
                    'purchase' => [
                        'transaction_id' => $transactionId,
                        'amount' => $video['price'],
                        'video_id' => $videoId
                    ]
                ], 'Video purchased successfully');
                
            } catch (Exception $e) {
                // Rollback transaction
                $this->db->getConnection()->rollback();
                $this->db->getConnection()->autocommit(TRUE);
                throw $e;
            }
            
        } catch (Exception $e) {
            return $this->sendError('Purchase failed: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get user purchases
     */
    public function getUserPurchases($userId) {
        try {
            $stmt = $this->db->prepare("SELECT p.*, v.title, v.description, u.name as creator_name 
                                       FROM purchases p 
                                       JOIN videos v ON p.video_id = v.id 
                                       JOIN users u ON v.creator_id = u.id 
                                       WHERE p.user_id = ? AND p.status = 'completed' 
                                       ORDER BY p.created_at DESC");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $purchases = [];
            while ($row = $result->fetch_assoc()) {
                $purchases[] = $row;
            }
            
            return $this->sendSuccess(['purchases' => $purchases]);
            
        } catch (Exception $e) {
            return $this->sendError('Failed to get purchases: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get creator earnings
     */
    public function getCreatorEarnings($creatorId) {
        try {
            // Get total earnings
            $earningsStmt = $this->db->prepare("SELECT SUM(p.amount) as total_earnings, COUNT(p.id) as total_sales 
                                               FROM purchases p 
                                               JOIN videos v ON p.video_id = v.id 
                                               WHERE v.creator_id = ? AND p.status = 'completed'");
            $earningsStmt->bind_param("i", $creatorId);
            $earningsStmt->execute();
            $earningsResult = $earningsStmt->get_result();
            $earnings = $earningsResult->fetch_assoc();
            
            // Get recent sales
            $salesStmt = $this->db->prepare("SELECT p.*, v.title, u.name as buyer_name 
                                            FROM purchases p 
                                            JOIN videos v ON p.video_id = v.id 
                                            JOIN users u ON p.user_id = u.id 
                                            WHERE v.creator_id = ? AND p.status = 'completed' 
                                            ORDER BY p.created_at DESC 
                                            LIMIT 10");
            $salesStmt->bind_param("i", $creatorId);
            $salesStmt->execute();
            $salesResult = $salesStmt->get_result();
            
            $sales = [];
            while ($row = $salesResult->fetch_assoc()) {
                $sales[] = $row;
            }
            
            return $this->sendSuccess([
                'total_earnings' => $earnings['total_earnings'] ?? 0,
                'total_sales' => $earnings['total_sales'] ?? 0,
                'recent_sales' => $sales
            ]);
            
        } catch (Exception $e) {
            return $this->sendError('Failed to get earnings: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Send success response
     */
    private function sendSuccess($data, $message = 'Success') {
        return [
            'success' => true,
            'message' => $message,
            'data' => $data
        ];
    }
    
    /**
     * Send error response
     */
    private function sendError($message, $code = 400) {
        return [
            'success' => false,
            'error' => $message,
            'code' => $code
        ];
    }
}
?>