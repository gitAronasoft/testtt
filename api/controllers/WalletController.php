<?php
/**
 * Wallet Controller for VideoShare Platform
 */

require_once __DIR__ . '/../config/database.php';

class WalletController {
    private $db;
    
    public function __construct() {
        $this->db = Database::getInstance();
    }
    
    /**
     * Get user wallet information
     */
    public function getWallet($userId) {
        try {
            $stmt = $this->db->prepare("SELECT balance FROM wallets WHERE user_id = ?");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                // Create wallet if not exists
                $createStmt = $this->db->prepare("INSERT INTO wallets (user_id, balance) VALUES (?, 0.00)");
                $createStmt->bind_param("i", $userId);
                $createStmt->execute();
                
                return $this->sendSuccess(['balance' => 0.00], 'Wallet created successfully');
            }
            
            $wallet = $result->fetch_assoc();
            return $this->sendSuccess($wallet, 'Wallet retrieved successfully');
            
        } catch (Exception $e) {
            return $this->sendError('Failed to get wallet: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Add funds to wallet (for demo purposes)
     */
    public function addFunds($userId, $amount) {
        try {
            if ($amount <= 0) {
                return $this->sendError('Amount must be positive', 400);
            }
            
            // Check if wallet exists
            $checkStmt = $this->db->prepare("SELECT id FROM wallets WHERE user_id = ?");
            $checkStmt->bind_param("i", $userId);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows === 0) {
                // Create wallet
                $createStmt = $this->db->prepare("INSERT INTO wallets (user_id, balance) VALUES (?, ?)");
                $createStmt->bind_param("id", $userId, $amount);
                $createStmt->execute();
                
                return $this->sendSuccess(['balance' => $amount], 'Wallet created and funds added');
            }
            
            // Add funds to existing wallet
            $stmt = $this->db->prepare("UPDATE wallets SET balance = balance + ? WHERE user_id = ?");
            $stmt->bind_param("di", $amount, $userId);
            $stmt->execute();
            
            // Get updated balance
            $balanceStmt = $this->db->prepare("SELECT balance FROM wallets WHERE user_id = ?");
            $balanceStmt->bind_param("i", $userId);
            $balanceStmt->execute();
            $balanceResult = $balanceStmt->get_result();
            $balance = $balanceResult->fetch_assoc()['balance'];
            
            return $this->sendSuccess(['balance' => $balance], 'Funds added successfully');
            
        } catch (Exception $e) {
            return $this->sendError('Failed to add funds: ' . $e->getMessage(), 500);
        }
    }
    
    /**
     * Get wallet transaction history
     */
    public function getTransactionHistory($userId) {
        try {
            $sql = "SELECT 
                        p.id,
                        p.amount,
                        p.status,
                        p.created_at,
                        v.title as video_title,
                        'purchase' as type
                    FROM purchases p
                    JOIN videos v ON p.video_id = v.id
                    WHERE p.user_id = ?
                    ORDER BY p.created_at DESC
                    LIMIT 20";
            
            $stmt = $this->db->prepare($sql);
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            
            $transactions = [];
            while ($row = $result->fetch_assoc()) {
                $transactions[] = $row;
            }
            
            return $this->sendSuccess(['transactions' => $transactions], 'Transaction history retrieved');
            
        } catch (Exception $e) {
            return $this->sendError('Failed to get transaction history: ' . $e->getMessage(), 500);
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