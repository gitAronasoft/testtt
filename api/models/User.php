<?php
/**
 * User Model for VideoHub
 */

class User {
    private $conn;
    private $table_name = "users";

    public $id;
    public $name;
    public $email;
    public $role;
    public $status;
    public $email_verified_at;
    public $created_at;
    public $updated_at;

    public function __construct($db) {
        $this->conn = $db;
    }

    // Get all users with optional filters
    public function read($filters = []) {
        $this->createEmailVerifiedColumnIfNotExists();
        $query = "SELECT id, name, email, role, status, email_verified_at, created_at, updated_at FROM " . $this->table_name;
        $conditions = [];
        $params = [];

        if (isset($filters['role']) && !empty($filters['role'])) {
            $conditions[] = "role = :role";
            $params[':role'] = $filters['role'];
        }

        if (isset($filters['status']) && !empty($filters['status'])) {
            $conditions[] = "status = :status";
            $params[':status'] = $filters['status'];
        }

        if (isset($filters['search']) && !empty($filters['search'])) {
            $conditions[] = "(name LIKE :search OR email LIKE :search)";
            $params[':search'] = '%' . $filters['search'] . '%';
        }

        if (!empty($conditions)) {
            $query .= " WHERE " . implode(" AND ", $conditions);
        }

        $query .= " ORDER BY created_at DESC";

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

    // Get single user by ID
    public function readOne() {
        $this->createEmailVerifiedColumnIfNotExists();
        $query = "SELECT id, name, email, role, status, email_verified_at, created_at, updated_at FROM " . $this->table_name . " WHERE id = ? LIMIT 0,1";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);
        $stmt->execute();

        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            $this->name = $row['name'];
            $this->email = $row['email'];
            $this->role = $row['role'];
            $this->status = $row['status'];
            $this->email_verified_at = $row['email_verified_at'];
            $this->created_at = $row['created_at'];
            $this->updated_at = $row['updated_at'];
            return true;
        }

        return false;
    }

    // Create user
    public function create() {
        $query = "INSERT INTO " . $this->table_name . " SET name=:name, email=:email, role=:role, status=:status, created_at=NOW(), updated_at=NOW()";

        $stmt = $this->conn->prepare($query);

        // Sanitize
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->email = htmlspecialchars(strip_tags($this->email));
        $this->role = htmlspecialchars(strip_tags($this->role));
        $this->status = htmlspecialchars(strip_tags($this->status));

        // Bind values
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":email", $this->email);
        $stmt->bindParam(":role", $this->role);
        $stmt->bindParam(":status", $this->status);

        if ($stmt->execute()) {
            $this->id = $this->conn->lastInsertId();
            return true;
        }

        return false;
    }

    // Update user
    public function update() {
        $query = "UPDATE " . $this->table_name . " SET name=:name, email=:email, role=:role, status=:status, updated_at=NOW() WHERE id=:id";

        $stmt = $this->conn->prepare($query);

        // Sanitize
        $this->name = htmlspecialchars(strip_tags($this->name));
        $this->email = htmlspecialchars(strip_tags($this->email));
        $this->role = htmlspecialchars(strip_tags($this->role));
        $this->status = htmlspecialchars(strip_tags($this->status));
        $this->id = htmlspecialchars(strip_tags($this->id));

        // Bind values
        $stmt->bindParam(":name", $this->name);
        $stmt->bindParam(":email", $this->email);
        $stmt->bindParam(":role", $this->role);
        $stmt->bindParam(":status", $this->status);
        $stmt->bindParam(":id", $this->id);

        if ($stmt->execute()) {
            return true;
        }

        return false;
    }

    // Delete user
    public function delete() {
        $query = "DELETE FROM " . $this->table_name . " WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(1, $this->id);

        if ($stmt->execute()) {
            return true;
        }

        return false;
    }

    // Get total count for pagination
    public function count($filters = []) {
        $query = "SELECT COUNT(*) as total FROM " . $this->table_name;
        $conditions = [];
        $params = [];

        if (isset($filters['role']) && !empty($filters['role'])) {
            $conditions[] = "role = :role";
            $params[':role'] = $filters['role'];
        }

        if (isset($filters['status']) && !empty($filters['status'])) {
            $conditions[] = "status = :status";
            $params[':status'] = $filters['status'];
        }

        if (isset($filters['search']) && !empty($filters['search'])) {
            $conditions[] = "(name LIKE :search OR email LIKE :search)";
            $params[':search'] = '%' . $filters['search'] . '%';
        }

        if (!empty($conditions)) {
            $query .= " WHERE " . implode(" AND ", $conditions);
        }

        $stmt = $this->conn->prepare($query);
        
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        $stmt->execute();
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $row['total'];
    }
    
    /**
     * Create email_verified_at column if it doesn't exist
     */
    public function createEmailVerifiedColumnIfNotExists() {
        try {
            // Check if column exists
            $stmt = $this->conn->prepare("SHOW COLUMNS FROM " . $this->table_name . " LIKE 'email_verified_at'");
            $stmt->execute();
            
            if ($stmt->rowCount() === 0) {
                // Column doesn't exist, create it
                $alterQuery = "ALTER TABLE " . $this->table_name . " ADD COLUMN email_verified_at DATETIME NULL";
                $this->conn->exec($alterQuery);
                error_log("Added email_verified_at column to users table");
            }
        } catch (PDOException $e) {
            error_log("Error checking/creating email_verified_at column: " . $e->getMessage());
        }
    }
    
    /**
     * Check if user email is verified
     */
    public function isEmailVerified() {
        return $this->email_verified_at !== null;
    }
    
    /**
     * Mark email as verified
     */
    public function markEmailVerified() {
        $query = "UPDATE " . $this->table_name . " SET email_verified_at = NOW() WHERE id = ?";
        $stmt = $this->conn->prepare($query);
        
        if ($stmt->execute([$this->id])) {
            $this->email_verified_at = date('Y-m-d H:i:s');
            return true;
        }
        
        return false;
    }
}
?>