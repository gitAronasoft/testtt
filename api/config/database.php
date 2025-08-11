<?php
/**
 * Database Configuration for VideoShare Platform
 * Clean and secure database connection management
 */

class Database {
    private $host;
    private $db_name;
    private $username;
    private $password;
    private $port;
    private $connection;
    
    public function __construct() {
        // Database configuration - using MySQL for production
        $this->host = 'srv637.hstgr.io';
        $this->db_name = 'u742355347_youtube';
        $this->username = 'u742355347_youtube';
        $this->password = 'Arona1@1@1@1';
        $this->port = 3306;
    }
    
    /**
     * Get database connection
     * @return PDO|null
     */
    public function getConnection() {
        $this->connection = null;
        
        try {
            $dsn = "mysql:host={$this->host};port={$this->port};dbname={$this->db_name};charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
            ];
            
            $this->connection = new PDO($dsn, $this->username, $this->password, $options);
            
        } catch(PDOException $e) {
            error_log("Database connection error: " . $e->getMessage());
            return null;
        }
        
        return $this->connection;
    }
    
    /**
     * Close database connection
     */
    public function closeConnection() {
        $this->connection = null;
    }
    
    /**
     * Test database connection
     * @return bool
     */
    public function testConnection() {
        $conn = $this->getConnection();
        if ($conn === null) {
            return false;
        }
        
        try {
            $stmt = $conn->query("SELECT 1");
            return $stmt !== false;
        } catch (PDOException $e) {
            error_log("Database test failed: " . $e->getMessage());
            return false;
        }
    }
}
?>