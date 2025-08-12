-- VideoHub Database Setup Script
-- Run this script to create the necessary tables in your MySQL database

-- Create users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL UNIQUE,
  `role` enum('admin','creator','viewer') DEFAULT 'viewer',
  `status` enum('active','inactive','pending') DEFAULT 'active',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_role` (`role`),
  INDEX `idx_status` (`status`),
  INDEX `idx_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create videos table
CREATE TABLE IF NOT EXISTS `videos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text,
  `creator_id` int(11) NOT NULL,
  `price` decimal(10,2) DEFAULT 0.00,
  `category` varchar(50) DEFAULT '',
  `duration` varchar(10) DEFAULT '00:00',
  `upload_date` date DEFAULT NULL,
  `views` int(11) DEFAULT 0,
  `likes` int(11) DEFAULT 0,
  `status` enum('published','pending','rejected','draft') DEFAULT 'pending',
  `thumbnail` varchar(500) DEFAULT '',
  `earnings` decimal(10,2) DEFAULT 0.00,
  `tags` json,
  `file_size` varchar(20) DEFAULT '',
  `quality` varchar(10) DEFAULT '720p',
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  INDEX `idx_creator` (`creator_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_category` (`category`),
  INDEX `idx_upload_date` (`upload_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create purchases table
CREATE TABLE IF NOT EXISTS `purchases` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `viewer_id` int(11) NOT NULL,
  `video_id` int(11) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) DEFAULT 'card',
  `transaction_id` varchar(100) NOT NULL UNIQUE,
  `status` enum('completed','pending','failed','refunded') DEFAULT 'completed',
  `purchase_date` timestamp DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`viewer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`) ON DELETE CASCADE,
  INDEX `idx_viewer` (`viewer_id`),
  INDEX `idx_video` (`video_id`),
  INDEX `idx_status` (`status`),
  INDEX `idx_purchase_date` (`purchase_date`),
  UNIQUE KEY `idx_transaction` (`transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Create earnings table (for detailed earnings tracking)
CREATE TABLE IF NOT EXISTS `earnings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `creator_id` int(11) NOT NULL,
  `video_id` int(11) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `source` enum('video_sale','subscription','bonus') DEFAULT 'video_sale',
  `date` date NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`creator_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`video_id`) REFERENCES `videos` (`id`) ON DELETE SET NULL,
  INDEX `idx_creator` (`creator_id`),
  INDEX `idx_date` (`date`),
  INDEX `idx_source` (`source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert sample data
INSERT INTO `users` (`name`, `email`, `role`, `status`) VALUES
('John Smith', 'john@example.com', 'creator', 'active'),
('Sarah Davis', 'sarah@example.com', 'viewer', 'active'),
('Mike Johnson', 'mike@example.com', 'viewer', 'active'),
('Admin User', 'admin@videohub.com', 'admin', 'active'),
('David Wilson', 'david@example.com', 'creator', 'active'),
('Emma Brown', 'emma@example.com', 'viewer', 'active'),
('Lisa Anderson', 'lisa@example.com', 'creator', 'active'),
('James Taylor', 'james@example.com', 'viewer', 'active'),
('Maria Garcia', 'maria@example.com', 'viewer', 'active'),
('Robert Lee', 'robert@example.com', 'creator', 'active');

-- Insert sample videos
INSERT INTO `videos` (`title`, `description`, `creator_id`, `price`, `category`, `duration`, `upload_date`, `views`, `likes`, `status`, `thumbnail`, `earnings`, `tags`, `file_size`, `quality`) VALUES
('JavaScript Advanced Concepts', 'Deep dive into advanced JavaScript concepts including closures, prototypes, and async programming.', 1, 19.99, 'technology', '45:30', '2024-03-10', 1234, 89, 'published', 'https://d1csarkz8obe9u.cloudfront.net/posterpreviews/free-youtube-thumbnail-maker-online-design-template-b0d0e1050e510fc2784b90d522d5bbe5_screen.jpg?ts=1662402001', 342.50, '["javascript", "programming", "advanced", "closures"]', '245MB', '1080p'),
('React Hooks Tutorial', 'Complete guide to React Hooks with practical examples and best practices.', 1, 14.99, 'technology', '32:15', '2024-03-08', 856, 67, 'published', 'https://d1csarkz8obe9u.cloudfront.net/posterpreviews/free-youtube-thumbnail-maker-online-design-template-b0d0e1050e510fc2784b90d522d5bbe5_screen.jpg?ts=1662402001', 234.80, '["react", "hooks", "frontend", "javascript"]', '189MB', '1080p'),
('Node.js Best Practices', 'Learn industry best practices for building scalable Node.js applications.', 1, 24.99, 'technology', '38:20', '2024-03-12', 567, 45, 'pending', 'https://d1csarkz8obe9u.cloudfront.net/posterpreviews/free-youtube-thumbnail-maker-online-design-template-b0d0e1050e510fc2784b90d522d5bbe5_screen.jpg?ts=1662402001', 0, '["nodejs", "backend", "javascript", "api"]', '298MB', '1080p'),
('Web Design Fundamentals', 'Master the fundamentals of modern web design with practical exercises.', 5, 16.99, 'design', '42:10', '2024-03-05', 789, 52, 'published', 'https://via.placeholder.com/300x169/dc3545/ffffff?text=Web+Design', 186.50, '["design", "ui", "ux", "fundamentals"]', '312MB', '1080p'),
('Python Data Science', 'Introduction to data science using Python with pandas and matplotlib.', 7, 22.99, 'technology', '55:45', '2024-03-15', 423, 38, 'published', 'https://via.placeholder.com/300x169/28a745/ffffff?text=Python+DS', 145.20, '["python", "data science", "pandas", "matplotlib"]', '445MB', '1080p'),
('Mobile Photography', 'Professional mobile photography techniques and editing tips.', 10, 12.99, 'photography', '28:30', '2024-03-18', 1122, 94, 'published', 'https://via.placeholder.com/300x169/ffc107/000000?text=Mobile+Photo', 298.75, '["photography", "mobile", "editing", "tips"]', '234MB', '720p'),
('Digital Marketing Strategy', 'Comprehensive guide to digital marketing for small businesses.', 5, 18.99, 'business', '48:20', '2024-03-20', 665, 41, 'published', 'https://via.placeholder.com/300x169/17a2b8/ffffff?text=Digital+Marketing', 156.80, '["marketing", "digital", "business", "strategy"]', '367MB', '1080p'),
('Cooking Basics', 'Essential cooking techniques every home cook should know.', 10, 9.99, 'lifestyle', '35:15', '2024-03-22', 890, 76, 'published', 'https://via.placeholder.com/300x169/6f42c1/ffffff?text=Cooking+Basics', 67.90, '["cooking", "basics", "techniques", "food"]', '278MB', '720p');

-- Insert sample purchases
INSERT INTO `purchases` (`viewer_id`, `video_id`, `amount`, `payment_method`, `transaction_id`, `status`, `purchase_date`) VALUES
(2, 1, 19.99, 'card', 'txn_001_sarah_js', 'completed', '2024-03-11 14:30:00'),
(2, 2, 14.99, 'paypal', 'txn_002_sarah_react', 'completed', '2024-03-09 16:45:00'),
(3, 1, 19.99, 'card', 'txn_003_mike_js', 'completed', '2024-03-10 10:20:00'),
(3, 4, 16.99, 'card', 'txn_004_mike_design', 'completed', '2024-03-06 09:15:00'),
(6, 2, 14.99, 'card', 'txn_005_emma_react', 'completed', '2024-03-08 20:30:00'),
(6, 5, 22.99, 'paypal', 'txn_006_emma_python', 'completed', '2024-03-16 11:45:00'),
(8, 6, 12.99, 'card', 'txn_007_james_photo', 'completed', '2024-03-19 15:20:00'),
(9, 7, 18.99, 'card', 'txn_008_maria_marketing', 'completed', '2024-03-21 13:10:00'),
(2, 8, 9.99, 'paypal', 'txn_009_sarah_cooking', 'completed', '2024-03-23 18:30:00');

-- Insert sample earnings
INSERT INTO `earnings` (`creator_id`, `video_id`, `amount`, `source`, `date`) VALUES
(1, 1, 19.99, 'video_sale', '2024-03-11'),
(1, 2, 14.99, 'video_sale', '2024-03-09'),
(1, 1, 19.99, 'video_sale', '2024-03-10'),
(1, 2, 14.99, 'video_sale', '2024-03-08'),
(5, 4, 16.99, 'video_sale', '2024-03-06'),
(7, 5, 22.99, 'video_sale', '2024-03-16'),
(10, 6, 12.99, 'video_sale', '2024-03-19'),
(5, 7, 18.99, 'video_sale', '2024-03-21'),
(10, 8, 9.99, 'video_sale', '2024-03-23'),
(1, NULL, 50.00, 'bonus', '2024-03-15');