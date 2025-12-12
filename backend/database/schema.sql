-- ============================================
-- Piceon - Idle RPG Game Database Schema
-- Created: 2025-01-14
-- ============================================

-- Drop existing tables (for clean setup)
DROP TABLE IF EXISTS gacha_history;
DROP TABLE IF EXISTS player_characters;
DROP TABLE IF EXISTS gacha_banners;
DROP TABLE IF EXISTS character_templates;
DROP TABLE IF EXISTS users;

-- ============================================
-- Table: users
-- Description: User accounts and resources
-- ============================================
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,

    -- Resources
    gems INT DEFAULT 300 NOT NULL,
    gold INT DEFAULT 10000 NOT NULL,
    inventory_slots INT DEFAULT 50 NOT NULL,

    -- Gacha pity system
    pity_counter INT DEFAULT 0 NOT NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: character_templates
-- Description: Master data for all characters
-- ============================================
CREATE TABLE character_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,

    -- Character classification
    type ENUM('Warrior', 'Mage', 'Archer', 'Tank', 'Assassin') NOT NULL,
    rarity ENUM('Common', 'Rare', 'Epic', 'Legendary') NOT NULL,

    -- Base stats
    base_atk INT NOT NULL,
    base_def INT NOT NULL,
    base_hp INT NOT NULL,

    -- Special ability
    special_ability VARCHAR(255),
    ability_description TEXT,

    -- Visual
    image_url VARCHAR(255) DEFAULT 'https://via.placeholder.com/150',

    -- Drop rates (percentage)
    drop_weight INT NOT NULL DEFAULT 100,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_rarity (rarity),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: player_characters
-- Description: Characters owned by players (Inventory)
-- ============================================
CREATE TABLE player_characters (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    template_id INT NOT NULL,

    -- Character progression
    level INT DEFAULT 1 NOT NULL,
    experience INT DEFAULT 0 NOT NULL,

    -- Current stats (base + level bonuses)
    current_atk INT NOT NULL,
    current_def INT NOT NULL,
    current_hp INT NOT NULL,

    -- Inventory management
    is_locked BOOLEAN DEFAULT FALSE,
    is_favorite BOOLEAN DEFAULT FALSE,

    -- Timestamps
    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES character_templates(id) ON DELETE RESTRICT,

    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_template_id (template_id),
    INDEX idx_obtained_at (obtained_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: gacha_banners
-- Description: Available gacha pull options
-- ============================================
CREATE TABLE gacha_banners (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Banner type
    type ENUM('Normal', 'Premium') NOT NULL,

    -- Cost
    cost_gems INT DEFAULT 0,
    cost_gold INT DEFAULT 0,

    -- Multi-pull (10x)
    multi_pull_gems INT DEFAULT 0,
    multi_pull_gold INT DEFAULT 0,
    multi_pull_count INT DEFAULT 10,

    -- Banner status
    is_active BOOLEAN DEFAULT TRUE,

    -- Duration
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP NULL,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    -- Indexes
    INDEX idx_is_active (is_active),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Table: gacha_history
-- Description: Track all gacha pulls
-- ============================================
CREATE TABLE gacha_history (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    banner_id INT NOT NULL,

    -- Pull details
    pull_type ENUM('Single', '10x') NOT NULL,
    cost_type ENUM('Gems', 'Gold') NOT NULL,
    cost_amount INT NOT NULL,

    -- Results (JSON array of character IDs)
    characters_obtained JSON NOT NULL,

    -- Pity tracking
    was_pity_triggered BOOLEAN DEFAULT FALSE,

    -- Timestamp
    pulled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Foreign keys
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (banner_id) REFERENCES gacha_banners(id) ON DELETE RESTRICT,

    -- Indexes
    INDEX idx_user_id (user_id),
    INDEX idx_banner_id (banner_id),
    INDEX idx_pulled_at (pulled_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Initial Data: Default Gacha Banners
-- ============================================
INSERT INTO gacha_banners (name, description, type, cost_gems, cost_gold, multi_pull_gems, multi_pull_gold, is_active) VALUES
('Normal Gacha', 'Standard character pull using Gold', 'Normal', 0, 100, 0, 900, TRUE),
('Premium Gacha', 'Enhanced character pull using Gems with better rates', 'Premium', 300, 0, 2700, 0, TRUE);

-- ============================================
-- Sample Character Templates
-- ============================================

-- Common Characters
INSERT INTO character_templates (name, type, rarity, base_atk, base_def, base_hp, special_ability, ability_description, drop_weight) VALUES
('Rookie Warrior', 'Warrior', 'Common', 50, 30, 200, 'Power Strike', 'Deals 150% damage to single enemy', 1000),
('Apprentice Mage', 'Mage', 'Common', 60, 20, 150, 'Fire Bolt', 'Ranged magic attack', 1000),
('Trainee Archer', 'Archer', 'Common', 55, 25, 180, 'Quick Shot', 'Fast attack with low damage', 1000),
('Town Guard', 'Tank', 'Common', 40, 50, 250, 'Shield Bash', 'Stuns enemy for 1 turn', 1000),
('Street Thief', 'Assassin', 'Common', 65, 15, 160, 'Backstab', 'Critical hit from behind', 1000);

-- Rare Characters
INSERT INTO character_templates (name, type, rarity, base_atk, base_def, base_hp, special_ability, ability_description, drop_weight) VALUES
('Veteran Warrior', 'Warrior', 'Rare', 100, 60, 400, 'Whirlwind', 'AOE damage to all enemies', 350),
('Battle Mage', 'Mage', 'Rare', 120, 40, 300, 'Lightning Storm', 'Chain lightning attack', 350),
('Elite Archer', 'Archer', 'Rare', 110, 50, 360, 'Multi-Shot', 'Attacks 3 random enemies', 350),
('Royal Guard', 'Tank', 'Rare', 80, 100, 500, 'Iron Wall', 'Reduces all damage by 50%', 350),
('Shadow Assassin', 'Assassin', 'Rare', 130, 30, 320, 'Shadow Strike', 'Guaranteed critical hit', 350);

-- Epic Characters
INSERT INTO character_templates (name, type, rarity, base_atk, base_def, base_hp, special_ability, ability_description, drop_weight) VALUES
('Sword Master', 'Warrior', 'Epic', 200, 120, 800, 'Blade Dance', 'Multiple slashes with lifesteal', 65),
('Archmage', 'Mage', 'Epic', 240, 80, 600, 'Meteor Strike', 'Massive AOE magic damage', 65),
('Dragon Archer', 'Archer', 'Epic', 220, 100, 720, 'Dragon Arrow', 'Piercing shot that ignores defense', 65),
('Paladin', 'Tank', 'Epic', 160, 200, 1000, 'Divine Shield', 'Immunity and healing', 65),
('Phantom Blade', 'Assassin', 'Epic', 260, 60, 640, 'Phantom Strike', 'Teleport and instant kill chance', 65);

-- Legendary Characters
INSERT INTO character_templates (name, type, rarity, base_atk, base_def, base_hp, special_ability, ability_description, drop_weight) VALUES
('Demon Slayer', 'Warrior', 'Legendary', 400, 250, 1600, 'Demon Bane', 'Executes enemies below 30% HP', 7),
('Celestial Sage', 'Mage', 'Legendary', 480, 160, 1200, 'Time Stop', 'Freezes all enemies for 2 turns', 7),
('Heavenly Marksman', 'Archer', 'Legendary', 440, 200, 1440, 'Heaven\'s Arrow', 'One-shot kill on random enemy', 7),
('Immortal Guardian', 'Tank', 'Legendary', 320, 400, 2000, 'Undying Will', 'Cannot die for 3 turns', 7),
('Death Reaper', 'Assassin', 'Legendary', 520, 120, 1280, 'Soul Harvest', 'Kills grant permanent stat boost', 7);

-- ============================================
-- END OF SCHEMA
-- ============================================
