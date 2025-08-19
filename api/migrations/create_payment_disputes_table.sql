-- Create payment disputes table for handling Stripe disputes
CREATE TABLE IF NOT EXISTS payment_disputes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    stripe_dispute_id VARCHAR(255) UNIQUE NOT NULL,
    charge_id VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    reason VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    evidence_details TEXT,
    evidence_due_by DATETIME,
    is_charge_refundable BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_stripe_dispute_id (stripe_dispute_id),
    INDEX idx_charge_id (charge_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Add webhook event log table
CREATE TABLE IF NOT EXISTS webhook_events (
    id INT PRIMARY KEY AUTO_INCREMENT,
    stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processing_attempts INT DEFAULT 0,
    last_processing_error TEXT,
    event_data JSON,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    
    INDEX idx_stripe_event_id (stripe_event_id),
    INDEX idx_event_type (event_type),
    INDEX idx_processed (processed),
    INDEX idx_received_at (received_at)
);

-- Update existing tables to support webhook data
ALTER TABLE stripe_payments 
ADD COLUMN IF NOT EXISTS requires_action BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS failure_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS failure_message TEXT;

-- Ensure purchases table has payment_intent_id
ALTER TABLE purchases 
ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255),
ADD INDEX IF NOT EXISTS idx_payment_intent_id (payment_intent_id);