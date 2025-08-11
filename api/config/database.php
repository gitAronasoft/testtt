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
    private $connection;
    
    public function __construct() {
        // Database configuration - using SQLite for development
        $this->db_name = $_ENV['DB_NAME'] ?? __DIR__ . '/../../database/videoshare.db';
    }
    
    /**
     * Get database connection
     * @return PDO|null
     */
    public function getConnection() {
        $this->connection = null;
        
        try {
            $dsn = "sqlite:" . $this->db_name;
            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ];
            
            $this->connection = new PDO($dsn, null, null, $options);
            
            // Enable foreign key constraints
            $this->connection->exec("PRAGMA foreign_keys = ON");
            
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