
-- YouTube Video Manager Database Schema

CREATE DATABASE IF NOT EXISTS youtube_manager;
USE youtube_manager;

-- Users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'editor', 'viewer') DEFAULT 'viewer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Channels table
CREATE TABLE channels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    channel_id VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    subscriber_count INT DEFAULT 0,
    video_count INT DEFAULT 0,
    view_count BIGINT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Videos table
CREATE TABLE videos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    channel_id VARCHAR(100) NOT NULL,
    video_id VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    thumbnail_url VARCHAR(500),
    duration VARCHAR(20),
    view_count BIGINT DEFAULT 0,
    like_count INT DEFAULT 0,
    published_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_channel_id (channel_id),
    INDEX idx_video_id (video_id)
);

-- Insert demo users
INSERT INTO users (username, email, password, role) VALUES
('admin', 'admin@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
('editor', 'editor@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'editor'),
('viewer', 'viewer@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'viewer');

-- Insert demo channel
INSERT INTO channels (user_id, channel_id, title, description, subscriber_count, video_count, view_count) VALUES
(1, 'UC_x5XG1OV2P6uZZ5FSM9Ttw', 'Demo YouTube Channel', 'This is a demo channel for testing', 1000, 10, 50000);

-- Insert demo videos
INSERT INTO videos (channel_id, video_id, title, description, duration, view_count, like_count, published_at) VALUES
('UC_x5XG1OV2P6uZZ5FSM9Ttw', 'dQw4w9WgXcQ', 'Getting Started with React', 'Learn the basics of React development', 'PT12M34S', 2300, 45, '2024-01-15 10:00:00'),
('UC_x5XG1OV2P6uZZ5FSM9Ttw', 'oHg5SJYRHA0', 'JavaScript Best Practices', 'Advanced JavaScript techniques', 'PT8M45S', 1800, 32, '2024-01-10 14:30:00'),
('UC_x5XG1OV2P6uZZ5FSM9Ttw', 'kJQP7kiw5Fk', 'CSS Grid Layout', 'Master CSS Grid for responsive design', 'PT15M22S', 3100, 67, '2024-01-05 09:15:00');
