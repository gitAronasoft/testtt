<?php
// Database configuration - supports both PostgreSQL (Replit) and MySQL
if (isset($_ENV['DATABASE_URL'])) {
    // PostgreSQL configuration for Replit
    $database_url = parse_url($_ENV['DATABASE_URL']);
    define('DB_TYPE', 'postgresql');
    define('DB_HOST', $database_url['host']);
    define('DB_USER', $database_url['user']);
    define('DB_PASS', $database_url['pass']);
    define('DB_NAME', ltrim($database_url['path'], '/'));
    define('DB_PORT', $database_url['port']);
} else {
    // MySQL configuration (local development)
    define('DB_TYPE', 'mysql');
    define('DB_HOST', 'srv637.hstgr.io');
    define('DB_USER', 'u742355347_youtube');
    define('DB_PASS', 'Arona1@1@1@1');
    define('DB_NAME', 'u742355347_youtube');
    define('DB_PORT', 3306);
}

// Create connection based on database type
function getConnection() {
    if (DB_TYPE === 'postgresql') {
        try {
            $dsn = "pgsql:host=" . DB_HOST . ";port=" . DB_PORT . ";dbname=" . DB_NAME;
            $pdo = new PDO($dsn, DB_USER, DB_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]);
            return $pdo;
        } catch (PDOException $e) {
            die("PostgreSQL Connection failed: " . $e->getMessage());
        }
    } else {
        // MySQL connection
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);

        if ($conn->connect_error) {
            die("MySQL Connection failed: " . $conn->connect_error);
        }

        $conn->set_charset("utf8");
        return $conn;
    }
}

// Initialize database tables
function initializeDatabase() {
    if (DB_TYPE === 'postgresql') {
        initializePostgreSQL();
    } else {
        initializeMySQL();
    }
}

function initializePostgreSQL() {
    $pdo = getConnection();

    // Create users table
    $users_table = "
    CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) CHECK (role IN ('admin', 'editor', 'viewer')) NOT NULL DEFAULT 'viewer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";

    // Create videos table
    $videos_table = "
    CREATE TABLE IF NOT EXISTS videos (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) DEFAULT 0.00,
        uploader_id VARCHAR(50) NOT NULL,
        views INTEGER DEFAULT 0,
        file_path VARCHAR(500),
        category VARCHAR(100),
        youtube_id VARCHAR(255),
        youtube_thumbnail VARCHAR(500),
        is_youtube_synced BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE
    )";

    // Create purchases table
    $purchases_table = "
    CREATE TABLE IF NOT EXISTS purchases (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        video_id INTEGER NOT NULL,
        purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
        UNIQUE (user_id, video_id)
    )";

    try {
        $pdo->exec($users_table);
        echo "Users table created successfully\n";

        $pdo->exec($videos_table);
        echo "Videos table created successfully\n";

        $pdo->exec($purchases_table);
        echo "Purchases table created successfully\n";

        // Insert default users
        insertDefaultUsers($pdo);

    } catch (PDOException $e) {
        echo "Error creating tables: " . $e->getMessage() . "\n";
    }
}

function initializeMySQL() {
    $conn = getConnection();

    // Create users table
    $users_table = "
    CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'editor', 'viewer') NOT NULL DEFAULT 'viewer',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )";

    // Create videos table
    $videos_table = "
    CREATE TABLE IF NOT EXISTS videos (
        id INT AUTO_INCREMENT PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            price DECIMAL(10,2) DEFAULT 0.00,
            uploader_id VARCHAR(50) NOT NULL,
            views INT DEFAULT 0,
            file_path VARCHAR(500),
            category VARCHAR(100),
            youtube_id VARCHAR(50) UNIQUE,
            youtube_thumbnail VARCHAR(500),
            youtube_channel_id VARCHAR(50),
            youtube_channel_title VARCHAR(255),
            youtube_views INT DEFAULT 0,
            youtube_likes INT DEFAULT 0,
            youtube_comments INT DEFAULT 0,
            is_youtube_synced BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE
    )";

    // Create purchases table
    $purchases_table = "
    CREATE TABLE IF NOT EXISTS purchases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        video_id INT NOT NULL,
        purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
        UNIQUE KEY unique_purchase (user_id, video_id)
    )";

    // Create youtube_tokens table
    $youtube_tokens_table = "
    CREATE TABLE IF NOT EXISTS youtube_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_token (user_id)
    )";

    if ($conn->query($users_table) === TRUE) {
        echo "Users table created successfully\n";
    }

    if ($conn->query($videos_table) === TRUE) {
        echo "Videos table created successfully\n";
    }

    if ($conn->query($purchases_table) === TRUE) {
        echo "Purchases table created successfully\n";
    }

    if ($conn->query($youtube_tokens_table) === TRUE) {
        echo "YouTube tokens table created successfully\n";
    }

    insertDefaultUsers($conn);
    $conn->close();
}

function insertDefaultUsers($connection) {
    $users_data = [
        ['admin_001', 'Admin User', 'admin@example.com', 'admin123', 'admin'],
        ['creator_001', 'Content Creator', 'creator@example.com', 'creator123', 'editor'],
        ['viewer_001', 'Video Viewer', 'viewer@example.com', 'viewer123', 'viewer']
    ];

    if (DB_TYPE === 'postgresql') {
        foreach ($users_data as $user) {
            try {
                $stmt = $connection->prepare("SELECT id FROM users WHERE email = ?");
                $stmt->execute([$user[2]]);

                if ($stmt->rowCount() == 0) {
                    $stmt = $connection->prepare("INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)");
                    $hashed_password = password_hash($user[3], PASSWORD_DEFAULT);
                    $stmt->execute([$user[0], $user[1], $user[2], $hashed_password, $user[4]]);
                }
            } catch (PDOException $e) {
                echo "Error inserting user: " . $e->getMessage() . "\n";
            }
        }
    } else {
        foreach ($users_data as $user) {
            $check = $connection->prepare("SELECT id FROM users WHERE email = ?");
            $check->bind_param("s", $user[2]);
            $check->execute();
            $result = $check->get_result();

            if ($result->num_rows == 0) {
                $stmt = $connection->prepare("INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)");
                $hashed_password = password_hash($user[3], PASSWORD_DEFAULT);
                $stmt->bind_param("sssss", $user[0], $user[1], $user[2], $hashed_password, $user[4]);
                $stmt->execute();
            }
        }
    }

    echo "Default users created\n";
}

// Database query helper function
function executeQuery($query, $params = []) {
    $connection = getConnection();

    if (DB_TYPE === 'postgresql') {
        try {
            $stmt = $connection->prepare($query);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            throw new Exception("Query failed: " . $e->getMessage());
        }
    } else {
        // For MySQL, you'd need to adapt the query and use mysqli methods
        // This is a simplified version - you might need to adjust based on your specific queries
        $result = $connection->query($query);
        return $result;
    }
}
?>