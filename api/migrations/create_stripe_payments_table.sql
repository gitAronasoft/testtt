-- Create Stripe payments table for VideoHub
-- This table stores all Stripe payment transactions and their status

CREATE TABLE IF NOT EXISTS stripe_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_intent_id VARCHAR(255) NOT NULL UNIQUE,
    video_id INT NOT NULL,
    user_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_payment_intent (payment_intent_id),
    INDEX idx_video_user (video_id, user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Add payment_intent_id to purchases table if it doesn't exist
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255),
ADD INDEX IF NOT EXISTS idx_payment_intent_id (payment_intent_id);

-- Create payment logs table for detailed logging
CREATE TABLE IF NOT EXISTS stripe_payment_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    payment_intent_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    event_data JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_payment_intent (payment_intent_id),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at)
);