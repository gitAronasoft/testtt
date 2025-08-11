-- VideoShare Platform SQLite Database Schema
-- Simplified version for development and testing

PRAGMA foreign_keys = ON;

-- Users table - stores all user information
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role TEXT CHECK (role IN ('viewer', 'creator', 'admin')) DEFAULT 'viewer',
    status TEXT CHECK (status IN ('active', 'suspended', 'pending')) DEFAULT 'active',
    email_verified BOOLEAN DEFAULT 0,
    avatar_url VARCHAR(500),
    bio TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- Videos table - stores video content information
CREATE TABLE videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_id INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    video_url VARCHAR(500),
    duration INTEGER DEFAULT 0,
    file_size INTEGER DEFAULT 0,
    price DECIMAL(10, 2) DEFAULT 0.00,
    category VARCHAR(50),
    tags TEXT, -- JSON string
    status TEXT CHECK (status IN ('draft', 'published', 'flagged', 'removed')) DEFAULT 'draft',
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    published_at TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_videos_creator_id ON videos(creator_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_category ON videos(category);

-- Video purchases - tracks video purchases by viewers
CREATE TABLE video_purchases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_status TEXT CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')) DEFAULT 'pending',
    payment_method VARCHAR(50),
    transaction_id VARCHAR(100),
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, video_id)
);

-- Video views - tracks video view history
CREATE TABLE video_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    user_id INTEGER,
    ip_address VARCHAR(45),
    user_agent TEXT,
    watch_duration INTEGER DEFAULT 0,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- User wallets - manages user balances and transactions
CREATE TABLE user_wallets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    balance DECIMAL(10, 2) DEFAULT 0.00,
    total_earned DECIMAL(10, 2) DEFAULT 0.00,
    total_spent DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Wallet transactions - detailed transaction history
CREATE TABLE wallet_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_id INTEGER NOT NULL,
    type TEXT CHECK (type IN ('credit', 'debit')) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    description VARCHAR(255),
    reference_type TEXT CHECK (reference_type IN ('video_sale', 'purchase', 'payout', 'refund', 'admin_adjustment')),
    reference_id INTEGER,
    status TEXT CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (wallet_id) REFERENCES user_wallets(id) ON DELETE CASCADE
);

-- Video ratings and reviews
CREATE TABLE video_ratings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    video_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    review TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, video_id)
);

-- Platform settings - configurable platform settings
CREATE TABLE platform_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    data_type TEXT CHECK (data_type IN ('string', 'number', 'boolean', 'json')) DEFAULT 'string',
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- User sessions - manage user login sessions
CREATE TABLE user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Admin logs - track admin actions
CREATE TABLE admin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id INTEGER,
    details TEXT, -- JSON string
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert default platform settings
INSERT INTO platform_settings (setting_key, setting_value, data_type, description) VALUES
('platform_name', 'VideoShare', 'string', 'Platform name'),
('commission_rate', '10', 'number', 'Platform commission percentage'),
('min_payout_amount', '50', 'number', 'Minimum payout amount in dollars'),
('max_video_size', '500', 'number', 'Maximum video size in MB'),
('maintenance_mode', 'false', 'boolean', 'Platform maintenance mode'),
('email_verification_required', 'true', 'boolean', 'Require email verification for new users'),
('auto_payouts', 'true', 'boolean', 'Enable automatic payouts');

-- Insert demo admin user (password: admin123 - hashed)
INSERT INTO users (email, password_hash, name, role, status, email_verified) VALUES
('admin@demo.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Platform Admin', 'admin', 'active', 1);

-- Create wallet for admin user
INSERT INTO user_wallets (user_id, balance) VALUES (1, 0.00);

-- Insert demo creator and viewer accounts
INSERT INTO users (email, password_hash, name, role, status, email_verified) VALUES
('creator@demo.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo Creator', 'creator', 'active', 1),
('viewer@demo.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Demo Viewer', 'viewer', 'active', 1);

-- Create wallets for demo accounts
INSERT INTO user_wallets (user_id, balance) VALUES (2, 0.00), (3, 100.00);

-- Insert sample videos
INSERT INTO videos (creator_id, title, description, price, category, status, view_count) VALUES
(2, 'Introduction to Web Development', 'Learn the basics of HTML, CSS, and JavaScript in this comprehensive tutorial.', 9.99, 'education', 'published', 1250),
(2, 'Advanced React Patterns', 'Master advanced React patterns and hooks for building scalable applications.', 19.99, 'technology', 'published', 890),
(2, 'Building REST APIs with Node.js', 'Complete guide to creating robust REST APIs using Node.js and Express.', 14.99, 'technology', 'published', 750);