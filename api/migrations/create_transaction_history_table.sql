-- Create comprehensive transaction history table for VideoHub
-- This table unifies all payment and transaction data across the platform

CREATE TABLE IF NOT EXISTS transaction_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Transaction identification
    transaction_id VARCHAR(255) UNIQUE NOT NULL,
    transaction_type ENUM('video_purchase', 'refund', 'dispute', 'chargeback', 'fee') DEFAULT 'video_purchase',
    
    -- User information
    user_id INT NOT NULL,
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    user_role ENUM('viewer', 'creator', 'admin') DEFAULT 'viewer',
    
    -- Video information (for video purchases)
    video_id INT NULL,
    video_title VARCHAR(255) NULL,
    creator_id INT NULL,
    creator_name VARCHAR(255) NULL,
    
    -- Payment details
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50),
    payment_provider ENUM('stripe', 'paypal', 'manual') DEFAULT 'stripe',
    
    -- Stripe/External payment details
    stripe_payment_intent_id VARCHAR(255) NULL,
    stripe_customer_id VARCHAR(255) NULL,
    external_transaction_id VARCHAR(255) NULL,
    
    -- Transaction status and metadata
    status ENUM('pending', 'completed', 'failed', 'cancelled', 'refunded', 'disputed') DEFAULT 'pending',
    description TEXT,
    metadata JSON NULL,
    
    -- Fee information (for creator earnings)
    platform_fee DECIMAL(10, 2) DEFAULT 0.00,
    processing_fee DECIMAL(10, 2) DEFAULT 0.00,
    creator_earnings DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Timestamps
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_user_id (user_id),
    INDEX idx_video_id (video_id),
    INDEX idx_creator_id (creator_id),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_status (status),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_stripe_payment_intent (stripe_payment_intent_id),
    
    -- Foreign key constraints
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (video_id) REFERENCES videos(id) ON DELETE SET NULL,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create view for easy transaction reporting
CREATE OR REPLACE VIEW transaction_summary AS
SELECT 
    th.*,
    u.name as buyer_name,
    u.email as buyer_email,
    c.name as creator_name,
    c.email as creator_email,
    v.title as video_title,
    v.price as video_price,
    CASE 
        WHEN th.transaction_type = 'video_purchase' THEN 'Video Purchase'
        WHEN th.transaction_type = 'refund' THEN 'Refund'
        WHEN th.transaction_type = 'dispute' THEN 'Dispute'
        WHEN th.transaction_type = 'chargeback' THEN 'Chargeback'
        WHEN th.transaction_type = 'fee' THEN 'Platform Fee'
        ELSE 'Other'
    END as transaction_type_display,
    CASE 
        WHEN th.status = 'completed' THEN 'Completed'
        WHEN th.status = 'pending' THEN 'Pending'
        WHEN th.status = 'failed' THEN 'Failed'
        WHEN th.status = 'cancelled' THEN 'Cancelled'
        WHEN th.status = 'refunded' THEN 'Refunded'
        WHEN th.status = 'disputed' THEN 'Disputed'
        ELSE 'Unknown'
    END as status_display
FROM transaction_history th
LEFT JOIN users u ON th.user_id = u.id
LEFT JOIN users c ON th.creator_id = c.id
LEFT JOIN videos v ON th.video_id = v.id
ORDER BY th.transaction_date DESC;

-- Migrate existing purchase data to transaction history
INSERT INTO transaction_history (
    transaction_id,
    transaction_type,
    user_id,
    user_name,
    user_email,
    video_id,
    video_title,
    creator_id,
    amount,
    payment_method,
    status,
    transaction_date,
    completed_at,
    created_at,
    updated_at
)
SELECT 
    CONCAT('PURCHASE_', p.id) as transaction_id,
    'video_purchase' as transaction_type,
    p.user_id_new as user_id,
    u.name as user_name,
    u.email as user_email,
    p.video_id,
    v.title as video_title,
    v.user_id as creator_id,
    p.amount,
    p.payment_method,
    CASE 
        WHEN p.status = 'completed' THEN 'completed'
        WHEN p.status = 'pending' THEN 'pending'
        WHEN p.status = 'failed' THEN 'failed'
        ELSE 'pending'
    END as status,
    p.purchase_date as transaction_date,
    p.purchase_date as completed_at,
    p.created_at,
    p.updated_at
FROM purchases p
LEFT JOIN users u ON p.user_id_new = u.id
LEFT JOIN videos v ON p.video_id = v.id
WHERE NOT EXISTS (
    SELECT 1 FROM transaction_history th 
    WHERE th.transaction_id = CONCAT('PURCHASE_', p.id)
);

-- Migrate existing Stripe payment data
INSERT INTO transaction_history (
    transaction_id,
    transaction_type,
    user_id,
    video_id,
    amount,
    currency,
    payment_method,
    payment_provider,
    stripe_payment_intent_id,
    stripe_customer_id,
    status,
    description,
    transaction_date,
    completed_at,
    created_at,
    updated_at
)
SELECT 
    sp.payment_intent_id as transaction_id,
    'video_purchase' as transaction_type,
    sp.user_id,
    sp.video_id,
    sp.amount / 100 as amount, -- Convert from cents
    sp.currency,
    'card' as payment_method,
    'stripe' as payment_provider,
    sp.payment_intent_id as stripe_payment_intent_id,
    sp.customer_id as stripe_customer_id,
    CASE 
        WHEN sp.status = 'succeeded' THEN 'completed'
        WHEN sp.status = 'pending' THEN 'pending'
        WHEN sp.status = 'failed' THEN 'failed'
        WHEN sp.status = 'canceled' THEN 'cancelled'
        ELSE 'pending'
    END as status,
    CONCAT('Stripe payment for video ID: ', sp.video_id) as description,
    sp.created_at as transaction_date,
    sp.created_at as completed_at,
    sp.created_at,
    sp.updated_at
FROM stripe_payments sp
WHERE NOT EXISTS (
    SELECT 1 FROM transaction_history th 
    WHERE th.stripe_payment_intent_id = sp.payment_intent_id
);