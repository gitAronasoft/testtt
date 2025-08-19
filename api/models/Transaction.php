<?php
/**
 * Transaction Model for VideoHub
 * Unified model for handling both purchases and stripe payments
 */

class Transaction {
    private $conn;
    private $view_name = "transactions";

    public $id;
    public $user_id;
    public $video_id;
    public $amount;
    public $payment_method;
    public $status;
    public $transaction_date;
    public $video_title;
    public $video_thumbnail;
    public $user_name;
    public $transaction_type;
    public $payment_intent_id;
    public $transaction_id;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Get all transactions with optional filters - ONLY Stripe transactions for admin
    public function read($filters = []) {
        // For admin panel, show only Stripe transactions with complete user info
        $query = "SELECT 
            sp.id,
            sp.payment_intent_id as transaction_id,
            sp.video_id,
            sp.user_id,
            sp.amount,
            sp.status,
            sp.created_at as transaction_date,
            sp.metadata,
            u.name as user_name,
            u.email as user_email,
            v.title as video_title,
            v.thumbnail as video_thumbnail,
            'stripe' as transaction_type,
            'card' as payment_method,
            sp.payment_intent_id
        FROM stripe_payments sp
        LEFT JOIN users u ON sp.user_id = u.id
        LEFT JOIN videos v ON sp.video_id = v.id";
        
        $conditions = [];
        $params = [];

        if (isset($filters['user_id']) && !empty($filters['user_id'])) {
            $conditions[] = "sp.user_id = :user_id";
            $params[':user_id'] = $filters['user_id'];
        }

        if (isset($filters['video_id']) && !empty($filters['video_id'])) {
            $conditions[] = "sp.video_id = :video_id";
            $params[':video_id'] = $filters['video_id'];
        }

        if (isset($filters['status']) && !empty($filters['status'])) {
            $conditions[] = "sp.status = :status";
            $params[':status'] = $filters['status'];
        }

        if (isset($filters['date_from']) && !empty($filters['date_from'])) {
            $conditions[] = "sp.created_at >= :date_from";
            $params[':date_from'] = $filters['date_from'];
        }

        if (isset($filters['date_to']) && !empty($filters['date_to'])) {
            $conditions[] = "sp.created_at <= :date_to";
            $params[':date_to'] = $filters['date_to'];
        }

        if (isset($filters['search']) && !empty($filters['search'])) {
            $conditions[] = "(v.title LIKE :search OR u.name LIKE :search OR u.email LIKE :search OR sp.payment_intent_id LIKE :search)";
            $params[':search'] = '%' . $filters['search'] . '%';
        }

        if (!empty($conditions)) {
            $query .= " WHERE " . implode(" AND ", $conditions);
        }

        $query .= " ORDER BY sp.created_at DESC";

        // Add pagination
        if (isset($filters['limit'])) {
            $offset = isset($filters['offset']) ? $filters['offset'] : 0;
            $query .= " LIMIT :offset, :limit";
            $params[':offset'] = $offset;
            $params[':limit'] = $filters['limit'];
        }

        $stmt = $this->conn->prepare($query);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        
        $stmt->execute();
        return $stmt;
    }

    // Get transaction statistics - ONLY for Stripe transactions
    public function getStats($filters = []) {
        $baseQuery = "SELECT 
            COUNT(*) as total_transactions,
            COALESCE(SUM(amount), 0) as total_amount,
            COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END), 0) as completed_amount,
            COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as completed_transactions,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
            COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
            COUNT(CASE WHEN status = 'canceled' THEN 1 END) as canceled_transactions
            FROM stripe_payments sp";

        $conditions = [];
        $params = [];

        if (isset($filters['user_id']) && !empty($filters['user_id'])) {
            $conditions[] = "sp.user_id = :user_id";
            $params[':user_id'] = $filters['user_id'];
        }

        if (isset($filters['date_from']) && !empty($filters['date_from'])) {
            $conditions[] = "sp.created_at >= :date_from";
            $params[':date_from'] = $filters['date_from'];
        }

        if (isset($filters['date_to']) && !empty($filters['date_to'])) {
            $conditions[] = "sp.created_at <= :date_to";
            $params[':date_to'] = $filters['date_to'];
        }

        if (!empty($conditions)) {
            $baseQuery .= " WHERE " . implode(" AND ", $conditions);
        }

        $stmt = $this->conn->prepare($baseQuery);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    // Count transactions for pagination - ONLY Stripe transactions
    public function count($filters = []) {
        $query = "SELECT COUNT(*) as total FROM stripe_payments sp";
        $conditions = [];
        $params = [];

        if (isset($filters['user_id']) && !empty($filters['user_id'])) {
            $conditions[] = "sp.user_id = :user_id";
            $params[':user_id'] = $filters['user_id'];
        }

        if (isset($filters['video_id']) && !empty($filters['video_id'])) {
            $conditions[] = "sp.video_id = :video_id";
            $params[':video_id'] = $filters['video_id'];
        }

        if (isset($filters['status']) && !empty($filters['status'])) {
            $conditions[] = "sp.status = :status";
            $params[':status'] = $filters['status'];
        }

        if (isset($filters['date_from']) && !empty($filters['date_from'])) {
            $conditions[] = "sp.created_at >= :date_from";
            $params[':date_from'] = $filters['date_from'];
        }

        if (isset($filters['date_to']) && !empty($filters['date_to'])) {
            $conditions[] = "sp.created_at <= :date_to";
            $params[':date_to'] = $filters['date_to'];
        }

        if (isset($filters['search']) && !empty($filters['search'])) {
            $query = "SELECT COUNT(*) as total FROM stripe_payments sp 
                     LEFT JOIN users u ON sp.user_id = u.id 
                     LEFT JOIN videos v ON sp.video_id = v.id";
            $conditions[] = "(v.title LIKE :search OR u.name LIKE :search OR u.email LIKE :search OR sp.payment_intent_id LIKE :search)";
            $params[':search'] = '%' . $filters['search'] . '%';
        }

        if (!empty($conditions)) {
            $query .= " WHERE " . implode(" AND ", $conditions);
        }

        $stmt = $this->conn->prepare($query);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        
        $stmt->execute();
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        return $result['total'];
    }

    // Get recent transactions
    public function getRecent($limit = 10, $user_id = null) {
        $query = "SELECT * FROM " . $this->view_name;
        $params = [];

        if ($user_id) {
            $query .= " WHERE user_id = :user_id";
            $params[':user_id'] = $user_id;
        }

        $query .= " ORDER BY transaction_date DESC LIMIT :limit";
        $params[':limit'] = $limit;

        $stmt = $this->conn->prepare($query);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value, is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        
        $stmt->execute();
        return $stmt;
    }

    // Get single transaction by ID and type
    public function readOne($id, $type = 'purchase') {
        if ($type === 'purchase') {
            $query = "SELECT * FROM purchases WHERE id = :id LIMIT 1";
        } else {
            $query = "SELECT * FROM stripe_payments WHERE id = :id LIMIT 1";
        }

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($row) {
            $this->id = $row['id'];
            $this->user_id = $row['user_id'];
            $this->video_id = $row['video_id'];
            $this->amount = $row['amount'];
            $this->status = $row['status'];
            $this->transaction_date = $row['created_at'] ?? $row['purchase_date'] ?? null;
            $this->payment_method = $row['payment_method'] ?? 'stripe';
            $this->payment_intent_id = $row['payment_intent_id'] ?? null;
            $this->transaction_id = $row['transaction_id'] ?? null;
            return true;
        }

        return false;
    }


}
?>