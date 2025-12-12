-- ============================================
-- Battle System Database Schema
-- Created: 2025-11-19
-- ============================================

-- ============================================
-- Table: player_teams
-- Description: Player team configurations
-- ============================================
CREATE TABLE IF NOT EXISTS player_teams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(50) DEFAULT 'Team 1' NOT NULL,
    is_active BOOLEAN DEFAULT FALSE,

    -- Team slots (character IDs)
    slot_1 INT NULL,
    slot_2 INT NULL,
    slot_3 INT NULL,
    slot_4 INT NULL,
    slot_5 INT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (slot_1) REFERENCES player_characters(id) ON DELETE SET NULL,
    FOREIGN KEY (slot_2) REFERENCES player_characters(id) ON DELETE SET NULL,
    FOREIGN KEY (slot_3) REFERENCES player_characters(id) ON DELETE SET NULL,
    FOREIGN KEY (slot_4) REFERENCES player_characters(id) ON DELETE SET NULL,
    FOREIGN KEY (slot_5) REFERENCES player_characters(id) ON DELETE SET NULL,

    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_is_active (is_active),

    -- Constraints
    CONSTRAINT unique_active_team_per_user UNIQUE (user_id, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: battle_stages
-- Description: Available battle stages/levels
-- ============================================
CREATE TABLE IF NOT EXISTS battle_stages (
    id INT PRIMARY KEY AUTO_INCREMENT,
    stage_number INT NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Requirements
    required_stage INT NULL,
    required_level INT DEFAULT 1,

    -- Difficulty
    difficulty ENUM('Easy', 'Normal', 'Hard', 'Expert') DEFAULT 'Normal',
    recommended_power INT NOT NULL,

    -- Enemies
    enemy_count INT DEFAULT 5,
    enemy_level_min INT DEFAULT 1,
    enemy_level_max INT DEFAULT 5,

    -- Rewards
    base_gold_reward INT DEFAULT 100,
    base_exp_reward INT DEFAULT 50,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign keys
    FOREIGN KEY (required_stage) REFERENCES battle_stages(id) ON DELETE SET NULL,

    -- Indexes
    INDEX idx_stage_number (stage_number),
    INDEX idx_difficulty (difficulty),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: battles
-- Description: Battle records and history
-- ============================================
CREATE TABLE IF NOT EXISTS battles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    stage_id INT NOT NULL,
    team_id INT NOT NULL,

    -- Battle results
    result ENUM('Victory', 'Defeat') NOT NULL,
    turns INT DEFAULT 0,

    -- Team stats (snapshot)
    team_power INT NOT NULL,
    team_hp_remaining INT DEFAULT 0,

    -- Rewards
    gold_earned INT DEFAULT 0,
    exp_earned INT DEFAULT 0,

    -- Battle details (JSON)
    battle_log JSON NULL,

    -- Timestamps
    battled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stage_id) REFERENCES battle_stages(id) ON DELETE RESTRICT,
    FOREIGN KEY (team_id) REFERENCES player_teams(id) ON DELETE RESTRICT,

    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_stage_id (stage_id),
    INDEX idx_result (result),
    INDEX idx_battled_at (battled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: player_progress
-- Description: Player stage completion tracking
-- ============================================
CREATE TABLE IF NOT EXISTS player_progress (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    stage_id INT NOT NULL,

    -- Progress stats
    times_completed INT DEFAULT 0,
    best_turns INT NULL,
    first_cleared_at TIMESTAMP NULL,
    last_cleared_at TIMESTAMP NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (stage_id) REFERENCES battle_stages(id) ON DELETE CASCADE,

    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_stage_id (stage_id),

    -- Constraints
    CONSTRAINT unique_user_stage UNIQUE (user_id, stage_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Initial Data: Sample Battle Stages
-- ============================================
INSERT INTO battle_stages (stage_number, name, description, difficulty, recommended_power, enemy_count, enemy_level_min, enemy_level_max, base_gold_reward, base_exp_reward) VALUES
(1, 'Forest Outskirts', 'A peaceful forest path with weak monsters', 'Easy', 500, 3, 1, 2, 100, 50),
(2, 'Goblin Camp', 'A small goblin encampment', 'Easy', 800, 4, 2, 3, 150, 75),
(3, 'Dark Woods', 'Dense forest filled with danger', 'Normal', 1200, 5, 3, 5, 250, 125),
(4, 'Bandit Hideout', 'A well-defended bandit stronghold', 'Normal', 1800, 5, 5, 7, 400, 200),
(5, 'Ancient Ruins', 'Mysterious ruins guarded by undead', 'Hard', 2500, 5, 7, 10, 600, 300),
(6, 'Dragon Lair', 'The legendary dragon''s domain', 'Expert', 4000, 1, 15, 15, 1500, 750);

-- Update required stages (progression)
UPDATE battle_stages SET required_stage = 1 WHERE stage_number = 2;
UPDATE battle_stages SET required_stage = 2 WHERE stage_number = 3;
UPDATE battle_stages SET required_stage = 3 WHERE stage_number = 4;
UPDATE battle_stages SET required_stage = 4 WHERE stage_number = 5;
UPDATE battle_stages SET required_stage = 5 WHERE stage_number = 6;

-- ============================================
-- Future Tables (Phase 2+)
-- ============================================

-- Daily Rewards
-- CREATE TABLE daily_rewards (...)

-- Quests
-- CREATE TABLE quests (...)
-- CREATE TABLE player_quests (...)

-- Achievements
-- CREATE TABLE achievements (...)
-- CREATE TABLE player_achievements (...)

-- Shop
-- CREATE TABLE shop_items (...)
-- CREATE TABLE shop_purchases (...)

-- ============================================
-- END OF BATTLE SYSTEM SCHEMA
-- ============================================
