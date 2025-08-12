<?php
/**
 * Database Configuration for VideoHub
 */

class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    public $conn;
    
    public function __construct() {
        // Use environment variables if available, fallback to original values
        $this->host = getenv('DB_HOST') ?: 'srv637.hstgr.io';
        $this->db_name = getenv('DB_NAME') ?: 'u742355347_youtube';
        $this->username = getenv('DB_USERNAME') ?: 'u742355347_youtube';
        $this->password = getenv('DB_PASSWORD') ?: 'Arona1@1@1@1';
    }

    public function getConnection() {
        $this->conn = null;

        try {
            $this->conn = new PDO(
                "mysql:host=" . $this->host . ";dbname=" . $this->db_name . ";charset=utf8",
                $this->username,
                $this->password
            );
            
            // Set PDO error mode to exception
            $this->conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // Set default fetch mode to associative array
            $this->conn->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            
        } catch(PDOException $exception) {
            error_log("Connection error: " . $exception->getMessage());
            throw new Exception("Database connection failed");
        }

        return $this->conn;
    }
}
?>