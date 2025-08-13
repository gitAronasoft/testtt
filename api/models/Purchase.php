<?php
/**
 * Purchase Model for VideoHub
 */

class Purchase {
    private $conn;
    private $table_name = "purchases";

    public $id;
    public $viewer_id;
    public $video_id;
    public $amount;
    public $payment_method;
    public $transaction_id;
    public $status;
    public $purchase_date;
    public $created_at;
    public $updated_at;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Get all purchases with optional filters
    public function read($filters = []) {
        $query = "SELECT p.*, v.title as video_title, v.youtube_thumbnail as thumbnail, u.name as viewer_name
                  FROM " . $this->table_name . " p
                  LEFT JOIN videos v ON p.video_id = v.id
                  LEFT JOIN users u ON p.user_id = u.id";
        
        $conditions = [];
        $params = [];

        if (isset($filters['user_id']) && !empty($filters['user_id'])) {
            $conditions[] = "p.user_id = :user_id";
            $params[':user_id'] = $filters['user_id'];
        }

        if (isset($filters['video_id']) && !empty($filters['video_id'])) {
            $conditions[] = "p.video_id = :video_id";
            $params[':video_id'] = $filters['video_id'];
        }

        if (isset($filters['status']) && !empty($filters['status'])) {
            $conditions[] = "p.status = :status";
            $params[':status'] = $filters['status'];
        }

        if (!empty($conditions)) {
            $query .= " WHERE " . implode(" AND ", $conditions);
        }

        $query .= " ORDER BY p.purchase_date DESC";

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

    // Get single purchase by ID
    public function readOne() {
        $query = "SELECT p.*, v.title as video_title, v.youtube_thumbnail as thumbnail, u.name as viewer_name
                  FROM " . $this->table_name . " p
                  LEFT JOIN videos v ON p.video_id = v.id
                  LEFT JOIN users u ON p.user_id = u.id
                  WHERE p.id = ? LIMIT 0,1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $this->viewer_id = $row['viewer_id'];
            $this->video_id = $row['video_id'];
            $this->amount = $row['amount'];
            $this->payment_method = $row['payment_method'];
            $this->transaction_id = $row['transaction_id'];
            $this->status = $row['status'];
            $this->purchase_date = $row['purchase_date'];
            $this->created_at = $row['created_at'];
            $this->updated_at = $row['updated_at'];
            return true;
        }

        return false;
    }

    // Create purchase
    public function create() {
        $query = "INSERT INTO " . $this->table_name . " 
                  SET viewer_id=:viewer_id, video_id=:video_id, amount=:amount, 
                      payment_method=:payment_method, transaction_id=:transaction_id, 
                      status=:status, purchase_date=NOW(), created_at=NOW(), updated_at=NOW()";

        $stmt = $this->conn->prepare($query);

        // Sanitize
        $this->viewer_id = htmlspecialchars(strip_tags($this->viewer_id));
        $this->video_id = htmlspecialchars(strip_tags($this->video_id));
        $this->amount = htmlspecialchars(strip_tags($this->amount));
        $this->payment_method = htmlspecialchars(strip_tags($this->payment_method));
        $this->transaction_id = htmlspecialchars(strip_tags($this->transaction_id));
        $this->status = htmlspecialchars(strip_tags($this->status));

        // Bind values
        $stmt->bindParam(":viewer_id", $this->viewer_id);
        $stmt->bindParam(":video_id", $this->video_id);
        $stmt->bindParam(":amount", $this->amount);
        $stmt->bindParam(":payment_method", $this->payment_method);
        $stmt->bindParam(":transaction_id", $this->transaction_id);
        $stmt->bindParam(":status", $this->status);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }

        return false;
    }

    // Check if user has purchased a video
    public function hasPurchased($viewer_id, $video_id) {
        $query = "SELECT id FROM " . $this->table_name . " 
                  WHERE viewer_id = :viewer_id AND video_id = :video_id AND status = 'completed' 
                  LIMIT 1";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":viewer_id", $viewer_id);
        $stmt->bindParam(":video_id", $video_id);
        $stmt->execute();

        return $stmt->fetch(PDO::FETCH_ASSOC) !== false;
    }

    // Get total earnings for a creator
    public function getCreatorEarnings($creator_id) {
        $query = "SELECT COALESCE(SUM(p.amount), 0) as total_earnings
                  FROM " . $this->table_name . " p
                  JOIN videos v ON p.video_id = v.id
                  WHERE v.user_id = :creator_id";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(":creator_id", $creator_id);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        return $row['total_earnings'];
    }
}
?>