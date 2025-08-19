-- Fix purchases table structure
-- Add missing user_id column and fix column naming issues

-- First, check if we need to rename viewer_id to user_id or add user_id
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS user_id INT;

-- Update user_id from viewer_id if it exists
UPDATE purchases SET user_id = viewer_id WHERE viewer_id IS NOT NULL AND user_id IS NULL;

-- Update user_id from user_id_new if it exists
UPDATE purchases SET user_id = user_id_new WHERE user_id_new IS NOT NULL AND user_id IS NULL;

-- Now drop the old columns
ALTER TABLE purchases DROP COLUMN IF EXISTS viewer_id;
ALTER TABLE purchases DROP COLUMN IF EXISTS user_id_new;

-- Ensure proper NOT NULL constraint
ALTER TABLE purchases MODIFY COLUMN user_id INT NOT NULL;
ALTER TABLE purchases MODIFY COLUMN video_id INT NOT NULL;

-- Add foreign key constraints
ALTER TABLE purchases ADD CONSTRAINT fk_purchases_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE purchases ADD CONSTRAINT fk_purchases_video_id 
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE CASCADE;

-- Add missing indexes
ALTER TABLE purchases ADD INDEX IF NOT EXISTS idx_user_id (user_id);
ALTER TABLE purchases ADD INDEX IF NOT EXISTS idx_video_id (video_id);
ALTER TABLE purchases ADD INDEX IF NOT EXISTS idx_status (status);
ALTER TABLE purchases ADD INDEX IF NOT EXISTS idx_payment_intent_id (payment_intent_id);
ALTER TABLE purchases ADD INDEX IF NOT EXISTS idx_purchase_date (purchase_date);

-- Ensure proper columns exist
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'stripe';
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255) NULL;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS status ENUM('pending', 'completed', 'failed', 'refunded') NOT NULL DEFAULT 'pending';
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE purchases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;