-- ============================================
-- Daily Rewards Schema
-- Created: 2025-12-12
-- ============================================

-- Drop existing table (for clean setup)
DROP TABLE IF EXISTS user_daily_rewards;

-- ============================================
-- Table: user_daily_rewards
-- Description: Track daily login rewards and streak
-- ============================================
CREATE TABLE user_daily_rewards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    
    -- Streak tracking
    streak_count INT DEFAULT 1 NOT NULL,  -- Current day (1-7)
    last_claimed_at DATE NULL,            -- Date of last claim (DATE only, no time)
    
    -- Statistics
    total_claims INT DEFAULT 0 NOT NULL,
    total_gold_earned INT DEFAULT 0 NOT NULL,
    total_gems_earned INT DEFAULT 0 NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign key
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_last_claimed (last_claimed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- END OF SCHEMA
-- ============================================
