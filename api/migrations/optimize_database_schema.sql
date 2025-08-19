-- VideoHub Database Schema Optimization
-- This migration optimizes the database schema by removing redundant columns
-- and fixing inconsistencies in table structure for better performance

-- ==========================================
-- 1. OPTIMIZE USERS TABLE
-- ==========================================

-- Remove redundant columns and ensure proper structure
ALTER TABLE users DROP COLUMN IF EXISTS password_reset_token;
ALTER TABLE users DROP COLUMN IF EXISTS password_reset_expires;
ALTER TABLE users DROP COLUMN IF EXISTS remember_token;
ALTER TABLE users DROP COLUMN IF EXISTS avatar;
ALTER TABLE users DROP COLUMN IF EXISTS phone;
ALTER TABLE users DROP COLUMN IF EXISTS address;
ALTER TABLE users DROP COLUMN IF EXISTS city;
ALTER TABLE users DROP COLUMN IF EXISTS country;
ALTER TABLE users DROP COLUMN IF EXISTS postal_code;

-- Ensure required columns exist with proper constraints
ALTER TABLE users 
MODIFY COLUMN id INT AUTO_INCREMENT PRIMARY KEY,
MODIFY COLUMN name VARCHAR(255) NOT NULL,
MODIFY COLUMN email VARCHAR(255) NOT NULL UNIQUE,
MODIFY COLUMN password VARCHAR(255) NOT NULL,
MODIFY COLUMN role ENUM('admin', 'creator', 'viewer') NOT NULL DEFAULT 'viewer',
MODIFY COLUMN status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255) NULL,
MODIFY COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
MODIFY COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add indexes for performance
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_email (email);
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_role (role);
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_status (status);
ALTER TABLE users ADD INDEX IF NOT EXISTS idx_stripe_customer_id (stripe_customer_id);

-- ==========================================
-- 2. OPTIMIZE VIDEOS TABLE
-- ==========================================

-- Remove YouTube-specific redundant columns
ALTER TABLE videos DROP COLUMN IF EXISTS youtube_channel_id;
ALTER TABLE videos DROP COLUMN IF EXISTS youtube_channel_title;
ALTER TABLE videos DROP COLUMN IF EXISTS youtube_comments;
ALTER TABLE videos DROP COLUMN IF EXISTS is_youtube_synced;
ALTER TABLE videos DROP COLUMN IF EXISTS file_path;
ALTER TABLE videos DROP COLUMN IF EXISTS file_size;
ALTER TABLE videos DROP COLUMN IF EXISTS quality;
ALTER TABLE videos DROP COLUMN IF EXISTS tags;
ALTER TABLE videos DROP COLUMN IF EXISTS uploader_name;

-- Ensure proper structure with essential columns only
ALTER TABLE videos 
MODIFY COLUMN id INT AUTO_INCREMENT PRIMARY KEY,
MODIFY COLUMN title VARCHAR(255) NOT NULL,
MODIFY COLUMN description TEXT,
MODIFY COLUMN user_id INT NOT NULL,
MODIFY COLUMN price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
MODIFY COLUMN category VARCHAR(100),
ADD COLUMN IF NOT EXISTS youtube_id VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS youtube_thumbnail VARCHAR(500) NULL,
ADD COLUMN IF NOT EXISTS views INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS youtube_likes INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS status ENUM('active', 'inactive', 'pending') NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(500) NULL,
MODIFY COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
MODIFY COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add foreign key constraint and indexes
ALTER TABLE videos ADD CONSTRAINT IF NOT EXISTS fk_videos_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE videos ADD INDEX IF NOT EXISTS idx_user_id (user_id);
ALTER TABLE videos ADD INDEX IF NOT EXISTS idx_category (category);
ALTER TABLE videos ADD INDEX IF NOT EXISTS idx_status (status);
ALTER TABLE videos ADD INDEX IF NOT EXISTS idx_youtube_id (youtube_id);

-- ==========================================
-- 3. OPTIMIZE PURCHASES TABLE
-- ==========================================

-- Fix column name inconsistencies and remove redundant fields
ALTER TABLE purchases DROP COLUMN IF EXISTS viewer_id;
ALTER TABLE purchases DROP COLUMN IF EXISTS user_id_new;
ALTER TABLE purchases DROP COLUMN IF EXISTS earnings;
ALTER TABLE purchases DROP COLUMN IF EXISTS commission;

-- Ensure proper structure
ALTER TABLE purchases 
MODIFY COLUMN id INT AUTO_INCREMENT PRIMARY KEY,
ADD COLUMN IF NOT EXISTS user_id INT NOT NULL,
MODIFY COLUMN video_id INT NOT NULL,
MODIFY COLUMN amount DECIMAL(10,2) NOT NULL,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255) NULL,
ADD COLUMN IF NOT EXISTS status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
MODIFY COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
MODIFY COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- Add foreign key constraints and indexes
ALTER TABLE purchases ADD CONSTRAINT IF NOT EXISTS fk_purchases_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE purchases ADD CONSTRAINT IF NOT EXISTS fk_purchases_video_id 
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE;
ALTER TABLE purchases ADD INDEX IF NOT EXISTS idx_user_id (user_id);
ALTER TABLE purchases ADD INDEX IF NOT EXISTS idx_video_id (video_id);
ALTER TABLE purchases ADD INDEX IF NOT EXISTS idx_status (status);
ALTER TABLE purchases ADD INDEX IF NOT EXISTS idx_payment_intent_id (payment_intent_id);
ALTER TABLE purchases ADD INDEX IF NOT EXISTS idx_purchase_date (purchase_date);

-- ==========================================
-- 4. CREATE UNIFIED TRANSACTIONS VIEW
-- ==========================================

-- Create a view that combines purchases and stripe_payments for unified transaction display
CREATE OR REPLACE VIEW transactions AS
SELECT 
    p.id,
    p.user_id,
    p.video_id,
    p.amount,
    p.payment_method,
    p.status,
    p.purchase_date as transaction_date,
    v.title as video_title,
    v.youtube_thumbnail as video_thumbnail,
    u.name as user_name,
    'purchase' as transaction_type,
    p.payment_intent_id,
    p.transaction_id
FROM purchases p
LEFT JOIN videos v ON p.video_id = v.id
LEFT JOIN users u ON p.user_id = u.id

UNION ALL

SELECT 
    sp.id,
    sp.user_id,
    sp.video_id,
    sp.amount,
    'stripe' as payment_method,
    sp.status,
    sp.created_at as transaction_date,
    v.title as video_title,
    v.youtube_thumbnail as video_thumbnail,
    u.name as user_name,
    'stripe_payment' as transaction_type,
    sp.payment_intent_id,
    NULL as transaction_id
FROM stripe_payments sp
LEFT JOIN videos v ON sp.video_id = v.id
LEFT JOIN users u ON sp.user_id = u.id

ORDER BY transaction_date DESC;

-- ==========================================
-- 5. DROP UNNECESSARY TABLES
-- ==========================================

-- Remove tables that are no longer needed
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS video_analytics;
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS video_tags;
DROP TABLE IF EXISTS categories;

-- ==========================================
-- 6. ENSURE EMAIL VERIFICATION TABLE EXISTS
-- ==========================================

CREATE TABLE IF NOT EXISTS email_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_email (email),
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at)
);