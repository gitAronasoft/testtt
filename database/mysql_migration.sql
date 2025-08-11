-- VideoShare Platform MySQL Migration Script
-- Run this script on your MySQL database: u742355347_youtube

-- Users table - stores all user information
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role ENUM('viewer', 'creator', 'admin') DEFAULT 'viewer',
    status ENUM('active', 'suspended', 'pending') DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    avatar_url VARCHAR(500),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL,
    
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Videos table - stores video content information
CREATE TABLE IF NOT EXISTS videos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    creator_id INT NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    video_url VARCHAR(500),
    duration INT DEFAULT 0,
    file_size BIGINT DEFAULT 0,
    price DECIMAL(10, 2) DEFAULT 0.00,
    category VARCHAR(50),
    tags JSON,
    status ENUM('draft', 'published', 'flagged', 'removed') DEFAULT 'draft',
    view_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    published_at TIMESTAMP NULL,
    
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_creator_id (creator_id),
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_published_at (published_at),
    INDEX idx_created_at (created_at),
    FULLTEXT idx_search (title, description)
);

-- Video purchases - tracks video purchases by viewers
CREATE TABLE IF NOT EXISTS video_purchases (
    id INT PRIMARY KEY AUTO_INCREMENT,
    video_id INT NOT NULL,
    user_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_video (user_id, video_id),
    INDEX idx_user_id (user_id),
    INDEX idx_video_id (video_id),
    INDEX idx_payment_status (payment_status),
    INDEX idx_purchased_at (purchased_at)
);

-- Video views - tracks video view history
CREATE TABLE IF NOT EXISTS video_views (
    id INT PRIMARY KEY AUTO_INCREMENT,
    video_id INT NOT NULL,
    user_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    watch_duration INT DEFAULT 0,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_video_id (video_id),
    INDEX idx_user_id (user_id),
    INDEX idx_viewed_at (viewed_at)
);

-- User wallets - manages user balances and transactions
CREATE TABLE IF NOT EXISTS user_wallets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT UNIQUE NOT NULL,
    balance DECIMAL(10, 2) DEFAULT 0.00,
    total_earned DECIMAL(10, 2) DEFAULT 0.00,
    total_spent DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
);

-- Wallet transactions - detailed transaction history
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    wallet_id INT NOT NULL,
    type ENUM('credit', 'debit') NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description VARCHAR(255),
    reference_type ENUM('video_sale', 'purchase', 'payout', 'refund', 'admin_adjustment'),
    reference_id INT,
    status ENUM('pending', 'completed', 'failed') DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (wallet_id) REFERENCES user_wallets(id) ON DELETE CASCADE,
    INDEX idx_wallet_id (wallet_id),
    INDEX idx_type (type),
    INDEX idx_reference (reference_type, reference_id),
    INDEX idx_created_at (created_at)
);

-- Video ratings - stores user ratings and reviews
CREATE TABLE IF NOT EXISTS video_ratings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    video_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_video_rating (user_id, video_id),
    INDEX idx_video_id (video_id),
    INDEX idx_user_id (user_id),
    INDEX idx_rating (rating)
);

-- Platform settings - configuration and settings
CREATE TABLE IF NOT EXISTS platform_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_setting_key (setting_key)
);

-- Admin logs - track administrative actions
CREATE TABLE IF NOT EXISTS admin_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_user_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id INT,
    details JSON,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_admin_user_id (admin_user_id),
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
);

-- Insert demo users with hashed passwords
INSERT INTO users (email, password_hash, name, role, email_verified) VALUES
('creator@demo.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo Creator', 'creator', TRUE),
('viewer@demo.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo Viewer', 'viewer', TRUE),
('admin@demo.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Platform Admin', 'admin', TRUE)
ON DUPLICATE KEY UPDATE
password_hash = VALUES(password_hash),
name = VALUES(name),
role = VALUES(role);

-- Create wallets for demo users
INSERT INTO user_wallets (user_id, balance, total_earned) 
SELECT id, 
       CASE 
           WHEN role = 'creator' THEN 1250.00 
           WHEN role = 'viewer' THEN 500.00 
           ELSE 0.00 
       END,
       CASE 
           WHEN role = 'creator' THEN 2500.00 
           ELSE 0.00 
       END
FROM users 
WHERE email IN ('creator@demo.com', 'viewer@demo.com', 'admin@demo.com')
ON DUPLICATE KEY UPDATE
balance = VALUES(balance),
total_earned = VALUES(total_earned);

-- Insert sample videos for demo creator
INSERT INTO videos (creator_id, title, description, thumbnail_url, price, category, status, view_count, like_count, published_at) 
SELECT u.id, 'Introduction to Web Development', 'Learn the basics of HTML, CSS, and JavaScript in this comprehensive tutorial.', 'https://via.placeholder.com/400x225', 29.99, 'Education', 'published', 1250, 89, NOW() - INTERVAL 7 DAY
FROM users u WHERE u.email = 'creator@demo.com'
ON DUPLICATE KEY UPDATE title = VALUES(title);

INSERT INTO videos (creator_id, title, description, thumbnail_url, price, category, status, view_count, like_count, published_at) 
SELECT u.id, 'Advanced React Patterns', 'Master advanced React patterns and best practices for building scalable applications.', 'https://via.placeholder.com/400x225', 49.99, 'Technology', 'published', 890, 67, NOW() - INTERVAL 3 DAY
FROM users u WHERE u.email = 'creator@demo.com'
ON DUPLICATE KEY UPDATE title = VALUES(title);

-- Insert platform settings
INSERT INTO platform_settings (setting_key, setting_value, description) VALUES
('site_name', 'VideoShare', 'The name of the platform'),
('commission_rate', '0.15', 'Platform commission rate (15%)'),
('min_payout', '50.00', 'Minimum payout amount'),
('max_video_size', '2147483648', 'Maximum video file size in bytes (2GB)'),
('allowed_video_formats', '["mp4", "mov", "avi", "mkv"]', 'Allowed video file formats')
ON DUPLICATE KEY UPDATE
setting_value = VALUES(setting_value),
description = VALUES(description);