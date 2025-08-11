<?php
/**
 * Database Configuration for VideoShare Platform
 */

// Database configuration
define('DB_TYPE', 'mysql');
define('DB_HOST', 'srv637.hstgr.io');
define('DB_USER', 'u742355347_youtube');
define('DB_PASS', 'Arona1@1@1@1');
define('DB_NAME', 'u742355347_youtube');
define('DB_PORT', 3306);

class Database {
    private $connection;
    private static $instance = null;
    
    private function __construct() {
        $this->connect();
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }
    
    private function connect() {
        $this->connection = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);
        
        if ($this->connection->connect_error) {
            die("Connection failed: " . $this->connection->connect_error);
        }
        
        $this->connection->set_charset("utf8");
        
        // Only create additional tables if needed, don't recreate existing structure
        $this->createAdditionalTables();
    }
    

    
    private function createTables() {
        // Users table
        $usersTable = "CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            role ENUM('viewer', 'creator', 'admin') DEFAULT 'viewer',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )";
        
        // Videos table
        $videosTable = "CREATE TABLE IF NOT EXISTS videos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            file_path VARCHAR(500),
            thumbnail_path VARCHAR(500),
            creator_id INT,
            view_count INT DEFAULT 0,
            status ENUM('active', 'inactive', 'pending') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
        )";
        
        // Purchases table
        $purchasesTable = "CREATE TABLE IF NOT EXISTS purchases (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            video_id INT,
            amount DECIMAL(10,2) NOT NULL,
            transaction_id VARCHAR(255),
            status ENUM('completed', 'pending', 'failed') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
        )";
        
        // Wallets table
        $walletsTable = "CREATE TABLE IF NOT EXISTS wallets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT UNIQUE,
            balance DECIMAL(10,2) DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )";
        
        // Execute table creation
        $tables = [$usersTable, $videosTable, $purchasesTable, $walletsTable];
        
        foreach ($tables as $table) {
            if ($this->connection->query($table) === TRUE) {
                echo "Table created successfully\n";
            } else {
                echo "Error creating table: " . $this->connection->error . "\n";
            }
        }
        
        // Insert demo data
        $this->insertDemoData();
        
        // Add demo videos
        $this->createDemoVideos();
    }
    
    private function insertDemoData() {
        // Check if demo users already exist
        $checkStmt = $this->connection->prepare("SELECT COUNT(*) FROM users WHERE email IN (?, ?, ?)");
        $email1 = 'creator@demo.com';
        $email2 = 'viewer@demo.com';
        $email3 = 'admin@demo.com';
        $checkStmt->bind_param("sss", $email1, $email2, $email3);
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        $count = $result->fetch_row()[0];
        
        if ($count > 0) {
            return; // Demo users already exist
        }
        
        // Create demo users (using existing table structure)
        $demoUsers = [
            ['Demo Creator', 'creator@demo.com', password_hash('demo123', PASSWORD_DEFAULT), 'creator'],
            ['Demo Viewer', 'viewer@demo.com', password_hash('demo123', PASSWORD_DEFAULT), 'viewer'],
            ['Admin User', 'admin@demo.com', password_hash('admin123', PASSWORD_DEFAULT), 'admin']
        ];
        
        $stmt = $this->connection->prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)");
        
        foreach ($demoUsers as $user) {
            $stmt->bind_param("ssss", $user[0], $user[1], $user[2], $user[3]);
            $stmt->execute();
        }
        
        // Create wallets table if not exists and add wallets for users
        $this->connection->query("CREATE TABLE IF NOT EXISTS wallets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT UNIQUE,
            balance DECIMAL(10,2) DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )");
        
        $walletStmt = $this->connection->prepare("INSERT IGNORE INTO wallets (user_id, balance) SELECT id, 100.00 FROM users WHERE email IN (?, ?, ?)");
        $walletStmt->bind_param("sss", $email1, $email2, $email3);
        $walletStmt->execute();
        
        $stmt->close();
        $walletStmt->close();
        $checkStmt->close();
    }
    
    private function createDemoVideos() {
        // Check if demo videos already exist
        $checkStmt = $this->connection->prepare("SELECT COUNT(*) FROM videos");
        $checkStmt->execute();
        $result = $checkStmt->get_result();
        $count = $result->fetch_row()[0];
        
        if ($count > 0) {
            return; // Demo videos already exist
        }
        
        // Get creator ID
        $creatorStmt = $this->connection->prepare("SELECT id FROM users WHERE email = 'creator@demo.com'");
        $creatorStmt->execute();
        $creatorResult = $creatorStmt->get_result();
        
        if ($creatorResult->num_rows === 0) {
            return; // Creator not found
        }
        
        $creatorId = $creatorResult->fetch_assoc()['id'];
        
        // Demo videos data
        $demoVideos = [
            [
                'Advanced JavaScript Concepts',
                'Master advanced JavaScript patterns and modern ES6+ features including closures, promises, async/await, and more.',
                12.99,
                'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400',
                $creatorId,
                145
            ],
            [
                'React Hooks Deep Dive',
                'Complete guide to React Hooks - useState, useEffect, custom hooks and advanced patterns.',
                15.99,
                'https://images.unsplash.com/photo-1633356122102-3fe601e05bd2?w=400',
                $creatorId,
                89
            ],
            [
                'Node.js Backend Development',
                'Build scalable backend applications with Node.js, Express, and MongoDB.',
                18.99,
                'https://images.unsplash.com/photo-1627398242454-45a1465c2479?w=400',
                $creatorId,
                203
            ],
            [
                'Python Data Science Fundamentals',
                'Learn data analysis and visualization with Python, pandas, and matplotlib.',
                16.99,
                'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=400',
                $creatorId,
                67
            ],
            [
                'Mobile App Development with Flutter',
                'Create beautiful cross-platform mobile apps using Flutter and Dart.',
                22.99,
                'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400',
                $creatorId,
                134
            ],
            [
                'Database Design & SQL Mastery',
                'Master database design principles and advanced SQL queries for better applications.',
                14.99,
                'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400',
                $creatorId,
                98
            ]
        ];
        
        $stmt = $this->connection->prepare("INSERT INTO videos (title, description, price, thumbnail_path, creator_id, view_count, status) VALUES (?, ?, ?, ?, ?, ?, 'active')");
        
        foreach ($demoVideos as $video) {
            $stmt->bind_param("ssdsii", $video[0], $video[1], $video[2], $video[3], $video[4], $video[5]);
            $stmt->execute();
        }
        
        $stmt->close();
        $creatorStmt->close();
        $checkStmt->close();
    }
    
    private function createAdditionalTables() {
        // Only create tables that don't exist (users table already exists)
        
        // Videos table
        $this->connection->query("CREATE TABLE IF NOT EXISTS videos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            file_path VARCHAR(500),
            thumbnail_path VARCHAR(500),
            creator_id INT,
            view_count INT DEFAULT 0,
            status ENUM('active', 'inactive', 'pending') DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
        )");
        
        // Purchases table
        $this->connection->query("CREATE TABLE IF NOT EXISTS purchases (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            video_id INT,
            amount DECIMAL(10,2) NOT NULL,
            transaction_id VARCHAR(255),
            status ENUM('completed', 'pending', 'failed') DEFAULT 'completed',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE
        )");
        
        // Wallets table
        $this->connection->query("CREATE TABLE IF NOT EXISTS wallets (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT UNIQUE,
            balance DECIMAL(10,2) DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )");
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    public function query($sql) {
        return $this->connection->query($sql);
    }
    
    public function prepare($sql) {
        return $this->connection->prepare($sql);
    }
    
    public function escape($string) {
        return $this->connection->real_escape_string($string);
    }
    
    public function lastInsertId() {
        return $this->connection->insert_id;
    }
}
?>