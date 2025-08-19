<?php
/**
 * Transaction Model for VideoHub
 * Handles all payment and transaction data across the platform
 */

class Transaction {
    private $conn;
    private $table_name = "transaction_history";

    public $id;
    public $transaction_id;
    public $transaction_type;
    public $user_id;
    public $user_name;
    public $user_email;
    public $user_role;
    public $video_id;
    public $video_title;
    public $creator_id;
    public $creator_name;
    public $amount;
    public $currency;
    public $payment_method;
    public $payment_provider;
    public $stripe_payment_intent_id;
    public $stripe_customer_id;
    public $external_transaction_id;
    public $status;
    public $description;
    public $metadata;
    public $platform_fee;
    public $processing_fee;
    public $creator_earnings;
    public $transaction_date;
    public $completed_at;
    public $created_at;
    public $updated_at;

    public function __construct($db) {
        $this->conn = $db;
    }

    /**
     * Get all transactions with filters and pagination
     */
    public function getAllTransactions($filters = []) {
        // Simplified query that works with existing database schema
        $query = "
            SELECT 
                'stripe' as data_source,
                CONCAT('STRIPE_', sp.payment_intent_id) as transaction_id,
                'video_purchase' as transaction_type,
                sp.user_id,
                u.name as buyer_name,
                u.email as buyer_email,
                u.role as buyer_role,
                sp.video_id,
                v.title as video_title,
                v.user_id as creator_id,
                vc.name as creator_name,
                vc.email as creator_email,
                (sp.amount / 100) as amount,
                'USD' as currency,
                'card' as payment_method,
                'stripe' as payment_provider,
                sp.payment_intent_id as stripe_payment_intent_id,
                CASE 
                    WHEN sp.status = 'succeeded' THEN 'completed'
                    WHEN sp.status = 'pending' THEN 'pending'
                    WHEN sp.status = 'failed' THEN 'failed'
                    WHEN sp.status = 'canceled' THEN 'cancelled'
                    ELSE 'pending'
                END as status,
                CONCAT('Stripe payment for video ID: ', sp.video_id) as description,
                sp.metadata,
                0.00 as platform_fee,
                0.00 as processing_fee,
                0.00 as creator_earnings,
                sp.created_at as transaction_date,
                sp.created_at as completed_at,
                sp.created_at,
                sp.updated_at
            FROM stripe_payments sp
            LEFT JOIN users u ON sp.user_id = u.id
            LEFT JOIN videos v ON sp.video_id = v.id
            LEFT JOIN users vc ON v.user_id = vc.id
            WHERE sp.payment_intent_id IS NOT NULL
            
            UNION ALL
            
            SELECT 
                'legacy' as data_source,
                CONCAT('PURCHASE_', p.id) as transaction_id,
                'video_purchase' as transaction_type,
                p.user_id_new as user_id,
                u.name as buyer_name,
                u.email as buyer_email,
                u.role as buyer_role,
                p.video_id,
                v.title as video_title,
                v.user_id as creator_id,
                vc.name as creator_name,
                vc.email as creator_email,
                p.amount,
                'USD' as currency,
                'card' as payment_method,
                'legacy' as payment_provider,
                NULL as stripe_payment_intent_id,
                CASE 
                    WHEN p.status = 'completed' THEN 'completed'
                    WHEN p.status = 'pending' THEN 'pending'
                    WHEN p.status = 'failed' THEN 'failed'
                    ELSE 'pending'
                END as status,
                CONCAT('Legacy purchase for video ID: ', p.video_id) as description,
                NULL as metadata,
                0.00 as platform_fee,
                0.00 as processing_fee,
                p.amount as creator_earnings,
                p.purchase_date as transaction_date,
                p.purchase_date as completed_at,
                p.created_at,
                p.updated_at
            FROM purchases p
            LEFT JOIN users u ON p.user_id_new = u.id
            LEFT JOIN videos v ON p.video_id = v.id
            LEFT JOIN users vc ON v.user_id = vc.id
            WHERE p.user_id_new IS NOT NULL
        ";

        // Wrap in subquery for filtering
        $query = "SELECT * FROM ($query) transactions";
        
        $conditions = [];
        $params = [];

        // Apply filters
        if (isset($filters['user_id']) && !empty($filters['user_id'])) {
            $conditions[] = "user_id = :user_id";
            $params[':user_id'] = $filters['user_id'];
        }

        if (isset($filters['video_id']) && !empty($filters['video_id'])) {
            $conditions[] = "video_id = :video_id";
            $params[':video_id'] = $filters['video_id'];
        }

        if (isset($filters['creator_id']) && !empty($filters['creator_id'])) {
            $conditions[] = "creator_id = :creator_id";
            $params[':creator_id'] = $filters['creator_id'];
        }

        if (isset($filters['status']) && !empty($filters['status'])) {
            $conditions[] = "status = :status";
            $params[':status'] = $filters['status'];
        }

        if (isset($filters['transaction_type']) && !empty($filters['transaction_type'])) {
            $conditions[] = "transaction_type = :transaction_type";
            $params[':transaction_type'] = $filters['transaction_type'];
        }

        if (isset($filters['payment_provider']) && !empty($filters['payment_provider'])) {
            $conditions[] = "payment_provider = :payment_provider";
            $params[':payment_provider'] = $filters['payment_provider'];
        }

        if (isset($filters['date_from']) && !empty($filters['date_from'])) {
            $conditions[] = "DATE(transaction_date) >= :date_from";
            $params[':date_from'] = $filters['date_from'];
        }

        if (isset($filters['date_to']) && !empty($filters['date_to'])) {
            $conditions[] = "DATE(transaction_date) <= :date_to";
            $params[':date_to'] = $filters['date_to'];
        }

        if (isset($filters['search']) && !empty($filters['search'])) {
            $conditions[] = "(
                buyer_name LIKE :search OR 
                buyer_email LIKE :search OR 
                transaction_id LIKE :search OR
                video_title LIKE :search OR
                creator_name LIKE :search
            )";
            $params[':search'] = '%' . $filters['search'] . '%';
        }

        if (!empty($conditions)) {
            $query .= " WHERE " . implode(" AND ", $conditions);
        }

        $query .= " ORDER BY transaction_date DESC";

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

    /**
     * Get transaction statistics
     */
    public function getTransactionStats($filters = []) {
        $conditions = [];
        $params = [];

        $baseCondition = "1=1";
        
        if (isset($filters['date_from']) && !empty($filters['date_from'])) {
            $conditions[] = "DATE(transaction_date) >= :date_from";
            $params[':date_from'] = $filters['date_from'];
        }

        if (isset($filters['date_to']) && !empty($filters['date_to'])) {
            $conditions[] = "DATE(transaction_date) <= :date_to";
            $params[':date_to'] = $filters['date_to'];
        }

        $whereClause = empty($conditions) ? "" : "WHERE " . implode(" AND ", $conditions);

        $query = "
            SELECT 
                COUNT(*) as total_transactions,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as total_revenue,
                COALESCE(AVG(CASE WHEN status = 'completed' THEN amount ELSE NULL END), 0) as avg_transaction,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_transactions,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_transactions,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_transactions,
                COUNT(CASE WHEN status = 'refunded' THEN 1 END) as refunded_transactions,
                COUNT(DISTINCT user_id) as unique_customers,
                COUNT(DISTINCT video_id) as videos_purchased
            FROM (
                SELECT 
                    CASE 
                        WHEN sp.status = 'succeeded' THEN 'completed'
                        WHEN sp.status = 'pending' THEN 'pending'
                        WHEN sp.status = 'failed' THEN 'failed'
                        ELSE 'pending'
                    END as status,
                    (sp.amount / 100) as amount,
                    sp.user_id,
                    sp.video_id,
                    sp.created_at as transaction_date
                FROM stripe_payments sp
                WHERE sp.payment_intent_id IS NOT NULL
                
                UNION ALL
                
                SELECT 
                    p.status,
                    p.amount,
                    p.user_id_new as user_id,
                    p.video_id,
                    p.purchase_date as transaction_date
                FROM purchases p
                WHERE p.user_id_new IS NOT NULL
            ) transactions
            $whereClause
        ";

        $stmt = $this->conn->prepare($query);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }

    /**
     * Get revenue over time for charts
     */
    public function getRevenueOverTime($period = '30days') {
        $dateFormat = '%Y-%m-%d';
        $dateInterval = 'DAY';
        
        switch ($period) {
            case '7days':
                $days = 7;
                break;
            case '30days':
                $days = 30;
                break;
            case '90days':
                $days = 90;
                $dateFormat = '%Y-%u'; // Year-week
                $dateInterval = 'WEEK';
                break;
            case '1year':
                $days = 365;
                $dateFormat = '%Y-%m'; // Year-month
                $dateInterval = 'MONTH';
                break;
            default:
                $days = 30;
        }

        $query = "
            SELECT 
                DATE_FORMAT(transaction_date, '$dateFormat') as period,
                COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as revenue,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as transactions
            FROM (
                SELECT 
                    CASE 
                        WHEN sp.status = 'succeeded' THEN 'completed'
                        ELSE sp.status
                    END as status,
                    (sp.amount / 100) as amount,
                    sp.created_at as transaction_date
                FROM stripe_payments sp
                WHERE sp.created_at >= DATE_SUB(NOW(), INTERVAL $days DAY)
                
                UNION ALL
                
                SELECT 
                    p.status,
                    p.amount,
                    p.purchase_date as transaction_date
                FROM purchases p
                WHERE p.purchase_date >= DATE_SUB(NOW(), INTERVAL $days DAY)
            ) transactions
            GROUP BY period
            ORDER BY period ASC
        ";

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Get transaction details by ID
     */
    public function getTransactionById($transactionId) {
        $query = "
            SELECT 
                th.*,
                u.name as buyer_name,
                u.email as buyer_email,
                c.name as creator_name,
                c.email as creator_email,
                v.title as video_title,
                v.price as video_price
            FROM (
                SELECT 
                    CONCAT('STRIPE_', sp.payment_intent_id) as transaction_id,
                    'video_purchase' as transaction_type,
                    sp.user_id,
                    sp.video_id,
                    NULL as creator_id,
                    (sp.amount / 100) as amount,
                    sp.currency,
                    'card' as payment_method,
                    'stripe' as payment_provider,
                    sp.payment_intent_id as stripe_payment_intent_id,
                    sp.customer_id as stripe_customer_id,
                    NULL as external_transaction_id,
                    CASE 
                        WHEN sp.status = 'succeeded' THEN 'completed'
                        WHEN sp.status = 'pending' THEN 'pending'
                        WHEN sp.status = 'failed' THEN 'failed'
                        ELSE 'pending'
                    END as status,
                    sp.metadata,
                    sp.created_at as transaction_date,
                    sp.created_at,
                    sp.updated_at
                FROM stripe_payments sp
                WHERE CONCAT('STRIPE_', sp.payment_intent_id) = :transaction_id
                
                UNION ALL
                
                SELECT 
                    CONCAT('PURCHASE_', p.id) as transaction_id,
                    'video_purchase' as transaction_type,
                    p.user_id_new as user_id,
                    p.video_id,
                    NULL as creator_id,
                    p.amount,
                    'USD' as currency,
                    p.payment_method,
                    'legacy' as payment_provider,
                    NULL as stripe_payment_intent_id,
                    NULL as stripe_customer_id,
                    p.transaction_id as external_transaction_id,
                    p.status,
                    NULL as metadata,
                    p.purchase_date as transaction_date,
                    p.created_at,
                    p.updated_at
                FROM purchases p
                WHERE CONCAT('PURCHASE_', p.id) = :transaction_id
            ) th
            LEFT JOIN users u ON th.user_id = u.id
            LEFT JOIN users c ON th.creator_id = c.id
            LEFT JOIN videos v ON th.video_id = v.id
            LIMIT 1
        ";

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':transaction_id', $transactionId);
        $stmt->execute();
        
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}
?>