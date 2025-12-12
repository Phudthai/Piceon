-- ============================================
-- Enhanced Inventory & Character System
-- Created: 2025-11-21
-- ============================================

-- ============================================
-- Items Master Table
-- ============================================
CREATE TABLE items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    item_type ENUM('equipment', 'material', 'consumable', 'special') NOT NULL,
    category VARCHAR(50) NOT NULL COMMENT 'weapon, armor, exp_potion, enhancement_stone, etc.',
    rarity ENUM('Common', 'Rare', 'Epic', 'Legendary', 'Mythic') DEFAULT 'Common',
    description TEXT,
    icon VARCHAR(100) DEFAULT 'default.png',
    max_stack INT DEFAULT 999 COMMENT 'Max stack size (1 for equipment)',
    sell_price INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type (item_type),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Equipment Templates
-- ============================================
CREATE TABLE equipment_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    item_id INT NOT NULL,
    equipment_type ENUM('weapon', 'armor', 'accessory', 'artifact') NOT NULL,
    primary_stat ENUM('atk', 'def', 'hp') NOT NULL,
    base_value INT NOT NULL COMMENT 'Base stat value at level 0',
    growth_rate DECIMAL(4,2) DEFAULT 1.05 COMMENT 'Stat growth per level (5% default)',
    max_level INT DEFAULT 20,
    max_stars INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    INDEX idx_type (equipment_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Player Inventory (Stackable items only)
-- ============================================
CREATE TABLE player_inventory (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT DEFAULT 1,
    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_item (user_id, item_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Player Equipment (Individual equipment instances)
-- ============================================
CREATE TABLE player_equipment (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    equipment_template_id INT NOT NULL,
    level INT DEFAULT 0,
    stars INT DEFAULT 0,
    exp INT DEFAULT 0,

    -- Current stat values (calculated)
    current_primary_stat INT NOT NULL,

    -- Sub-stats (0-3 random on obtain)
    sub_stat_1_type ENUM('atk', 'def', 'hp', 'crit_rate', 'crit_dmg', 'speed') DEFAULT NULL,
    sub_stat_1_value INT DEFAULT 0,
    sub_stat_2_type ENUM('atk', 'def', 'hp', 'crit_rate', 'crit_dmg', 'speed') DEFAULT NULL,
    sub_stat_2_value INT DEFAULT 0,
    sub_stat_3_type ENUM('atk', 'def', 'hp', 'crit_rate', 'crit_dmg', 'speed') DEFAULT NULL,
    sub_stat_3_value INT DEFAULT 0,

    is_equipped BOOLEAN DEFAULT FALSE,
    equipped_character_id INT DEFAULT NULL,
    is_locked BOOLEAN DEFAULT FALSE,

    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (equipment_template_id) REFERENCES equipment_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (equipped_character_id) REFERENCES player_characters(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_equipped (is_equipped),
    INDEX idx_character (equipped_character_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Add Equipment Slots to Characters
-- ============================================
ALTER TABLE player_characters
    ADD COLUMN equipment_weapon_id INT DEFAULT NULL AFTER is_favorite,
    ADD COLUMN equipment_armor_id INT DEFAULT NULL AFTER equipment_weapon_id,
    ADD COLUMN equipment_accessory_id INT DEFAULT NULL AFTER equipment_armor_id,
    ADD COLUMN equipment_artifact_id INT DEFAULT NULL AFTER equipment_accessory_id,
    ADD COLUMN stars INT DEFAULT 0 COMMENT 'Character ascension stars (0-5)' AFTER level,
    ADD COLUMN rank ENUM('E','D','C','B','A','S','SS','SSS') DEFAULT 'E' AFTER stars;

ALTER TABLE player_characters
    ADD CONSTRAINT fk_equipment_weapon FOREIGN KEY (equipment_weapon_id) REFERENCES player_equipment(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_equipment_armor FOREIGN KEY (equipment_armor_id) REFERENCES player_equipment(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_equipment_accessory FOREIGN KEY (equipment_accessory_id) REFERENCES player_equipment(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_equipment_artifact FOREIGN KEY (equipment_artifact_id) REFERENCES player_equipment(id) ON DELETE SET NULL;

-- ============================================
-- Populate Initial Items
-- ============================================

-- MATERIALS - EXP Items
INSERT INTO items (name, item_type, category, rarity, description, icon, max_stack, sell_price) VALUES
('EXP Potion (Small)', 'material', 'exp_potion', 'Common', 'Grants 500 EXP to a character', 'exp_small.png', 999, 50),
('EXP Potion (Medium)', 'material', 'exp_potion', 'Rare', 'Grants 2000 EXP to a character', 'exp_medium.png', 999, 200),
('EXP Potion (Large)', 'material', 'exp_potion', 'Epic', 'Grants 5000 EXP to a character', 'exp_large.png', 999, 500),
('Level Stone', 'material', 'level_stone', 'Epic', 'Instantly grants 1 level to a character', 'level_stone.png', 99, 1000);

-- MATERIALS - Enhancement Items
INSERT INTO items (name, item_type, category, rarity, description, icon, max_stack, sell_price) VALUES
('Enhancement Stone (Basic)', 'material', 'enhancement_stone', 'Common', 'Used to upgrade equipment (Lv 1-5)', 'enhance_basic.png', 999, 100),
('Enhancement Stone (Advanced)', 'material', 'enhancement_stone', 'Rare', 'Used to upgrade equipment (Lv 6-15)', 'enhance_advanced.png', 999, 300),
('Enhancement Stone (Master)', 'material', 'enhancement_stone', 'Epic', 'Used to upgrade equipment (Lv 16-20)', 'enhance_master.png', 999, 800),
('Star Stone', 'material', 'star_stone', 'Legendary', 'Used to upgrade equipment stars (★)', 'star_stone.png', 999, 2000);

-- MATERIALS - Character Advancement
INSERT INTO items (name, item_type, category, rarity, description, icon, max_stack, sell_price) VALUES
('Character Soul', 'material', 'character_soul', 'Epic', 'Used for character ascension', 'soul.png', 999, 500),
('Elemental Essence (Fire)', 'material', 'elemental_essence', 'Epic', 'Used for character evolution', 'essence_fire.png', 999, 800),
('Elemental Essence (Water)', 'material', 'elemental_essence', 'Epic', 'Used for character evolution', 'essence_water.png', 999, 800),
('Elemental Essence (Wind)', 'material', 'elemental_essence', 'Epic', 'Used for character evolution', 'essence_wind.png', 999, 800),
('Elemental Essence (Earth)', 'material', 'elemental_essence', 'Epic', 'Used for character evolution', 'essence_earth.png', 999, 800);

-- CONSUMABLES
INSERT INTO items (name, item_type, category, rarity, description, icon, max_stack, sell_price) VALUES
('Stamina Potion', 'consumable', 'stamina', 'Common', 'Restores 50 stamina', 'stamina.png', 99, 100),
('Gold Boost (1h)', 'consumable', 'boost', 'Rare', 'Increases gold rewards by 50% for 1 hour', 'gold_boost.png', 99, 500),
('EXP Boost (1h)', 'consumable', 'boost', 'Rare', 'Increases character EXP by 50% for 1 hour', 'exp_boost.png', 99, 500);

-- SPECIAL ITEMS
INSERT INTO items (name, item_type, category, rarity, description, icon, max_stack, sell_price) VALUES
('Normal Gacha Ticket', 'special', 'gacha_ticket', 'Common', 'Free normal gacha pull', 'ticket_normal.png', 99, 0),
('Premium Gacha Ticket', 'special', 'gacha_ticket', 'Rare', 'Free premium gacha pull', 'ticket_premium.png', 99, 0),
('Inventory Expansion', 'special', 'expansion', 'Rare', 'Expands inventory by 10 slots', 'inventory_expand.png', 99, 0);

-- ============================================
-- Populate Equipment Templates
-- ============================================

-- WEAPONS (ATK focused)
INSERT INTO items (name, item_type, category, rarity, description, icon, max_stack, sell_price) VALUES
('Iron Sword', 'equipment', 'weapon', 'Common', 'A basic iron sword', 'sword_common.png', 1, 100),
('Steel Blade', 'equipment', 'weapon', 'Rare', 'A sharp steel blade', 'sword_rare.png', 1, 500),
('Flame Sword', 'equipment', 'weapon', 'Epic', 'A sword imbued with flames', 'sword_epic.png', 1, 2000),
('Dragon Slayer', 'equipment', 'weapon', 'Legendary', 'Legendary blade that slays dragons', 'sword_legendary.png', 1, 10000),
('Excalibur', 'equipment', 'weapon', 'Mythic', 'The legendary holy sword', 'sword_mythic.png', 1, 50000);

INSERT INTO equipment_templates (item_id, equipment_type, primary_stat, base_value, growth_rate, max_level, max_stars) VALUES
(20, 'weapon', 'atk', 10, 1.05, 20, 5),  -- Iron Sword
(21, 'weapon', 'atk', 20, 1.05, 20, 5),  -- Steel Blade
(22, 'weapon', 'atk', 35, 1.05, 20, 5),  -- Flame Sword
(23, 'weapon', 'atk', 60, 1.05, 20, 5),  -- Dragon Slayer
(24, 'weapon', 'atk', 100, 1.05, 20, 5); -- Excalibur

-- ARMOR (DEF focused)
INSERT INTO items (name, item_type, category, rarity, description, icon, max_stack, sell_price) VALUES
('Leather Armor', 'equipment', 'armor', 'Common', 'Basic leather protection', 'armor_common.png', 1, 100),
('Chain Mail', 'equipment', 'armor', 'Rare', 'Sturdy chain mail armor', 'armor_rare.png', 1, 500),
('Plate Armor', 'equipment', 'armor', 'Epic', 'Heavy plate armor', 'armor_epic.png', 1, 2000),
('Dragon Scales', 'equipment', 'armor', 'Legendary', 'Armor made from dragon scales', 'armor_legendary.png', 1, 10000),
('Aegis Shield', 'equipment', 'armor', 'Mythic', 'Impenetrable divine armor', 'armor_mythic.png', 1, 50000);

INSERT INTO equipment_templates (item_id, equipment_type, primary_stat, base_value, growth_rate, max_level, max_stars) VALUES
(25, 'armor', 'def', 8, 1.05, 20, 5),   -- Leather Armor
(26, 'armor', 'def', 16, 1.05, 20, 5),  -- Chain Mail
(27, 'armor', 'def', 28, 1.05, 20, 5),  -- Plate Armor
(28, 'armor', 'def', 50, 1.05, 20, 5),  -- Dragon Scales
(29, 'armor', 'def', 80, 1.05, 20, 5);  -- Aegis Shield

-- ACCESSORIES (HP focused)
INSERT INTO items (name, item_type, category, rarity, description, icon, max_stack, sell_price) VALUES
('Health Ring', 'equipment', 'accessory', 'Common', 'Increases max HP', 'ring_common.png', 1, 100),
('Vitality Amulet', 'equipment', 'accessory', 'Rare', 'Greatly increases HP', 'amulet_rare.png', 1, 500),
('Life Crystal', 'equipment', 'accessory', 'Epic', 'Crystal of pure life force', 'crystal_epic.png', 1, 2000),
('Phoenix Feather', 'equipment', 'accessory', 'Legendary', 'Feather of rebirth', 'feather_legendary.png', 1, 10000),
('Immortal Soul', 'equipment', 'accessory', 'Mythic', 'Grants incredible vitality', 'soul_mythic.png', 1, 50000);

INSERT INTO equipment_templates (item_id, equipment_type, primary_stat, base_value, growth_rate, max_level, max_stars) VALUES
(30, 'accessory', 'hp', 50, 1.05, 20, 5),   -- Health Ring
(31, 'accessory', 'hp', 100, 1.05, 20, 5),  -- Vitality Amulet
(32, 'accessory', 'hp', 180, 1.05, 20, 5),  -- Life Crystal
(33, 'accessory', 'hp', 300, 1.05, 20, 5),  -- Phoenix Feather
(34, 'accessory', 'hp', 500, 1.05, 20, 5);  -- Immortal Soul

-- ARTIFACTS (Special effects)
INSERT INTO items (name, item_type, category, rarity, description, icon, max_stack, sell_price) VALUES
('Lucky Charm', 'equipment', 'artifact', 'Rare', 'Increases critical chance', 'artifact_rare.png', 1, 500),
('Shadow Cloak', 'equipment', 'artifact', 'Epic', 'Increases dodge chance', 'artifact_epic.png', 1, 2000),
('Berserker Mark', 'equipment', 'artifact', 'Legendary', 'Greatly increases critical damage', 'artifact_legendary.png', 1, 10000),
('Time Pendant', 'equipment', 'artifact', 'Mythic', 'Increases all stats and speed', 'artifact_mythic.png', 1, 50000);

INSERT INTO equipment_templates (item_id, equipment_type, primary_stat, base_value, growth_rate, max_level, max_stars) VALUES
(35, 'artifact', 'atk', 15, 1.05, 20, 5),  -- Lucky Charm (ATK + Crit)
(36, 'artifact', 'def', 20, 1.05, 20, 5),  -- Shadow Cloak (DEF + Dodge)
(37, 'artifact', 'atk', 40, 1.05, 20, 5),  -- Berserker Mark (ATK + Crit DMG)
(38, 'artifact', 'hp', 200, 1.05, 20, 5);  -- Time Pendant (HP + Speed)

-- ============================================
-- Verification Queries
-- ============================================

-- Check items by type
-- SELECT item_type, COUNT(*) as count FROM items GROUP BY item_type;

-- Check equipment templates
-- SELECT i.name, et.equipment_type, et.primary_stat, et.base_value, i.rarity
-- FROM equipment_templates et
-- JOIN items i ON et.item_id = i.id
-- ORDER BY et.equipment_type, i.rarity;

-- Check player_characters columns
-- DESCRIBE player_characters;
