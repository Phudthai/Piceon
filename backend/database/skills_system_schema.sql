-- ============================================
-- Piceon - Skills System Schema
-- Created: 2025-11-20
-- ============================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS character_template_skills;
DROP TABLE IF EXISTS character_skills;

-- ============================================
-- Character Skills Table
-- ============================================
CREATE TABLE character_skills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    skill_type ENUM('active', 'passive') NOT NULL,
    category ENUM(
        -- Offensive Active
        'single_damage', 'aoe_damage', 'multi_target', 'execute', 'bleed',
        -- Defensive Active
        'heal', 'shield', 'taunt',
        -- Support/Buff Active
        'buff_atk', 'buff_def', 'speed_buff', 'revive',
        -- Debuff Active
        'debuff_atk', 'debuff_def', 'stun', 'silence', 'poison',
        -- Combat Passive
        'crit_chance', 'crit_damage', 'lifesteal', 'counter_attack', 'dodge',
        -- Stat Passive
        'atk_boost', 'def_boost', 'hp_boost',
        -- Special Passive
        'hp_regen', 'last_stand', 'first_strike'
    ) NOT NULL,
    power INT DEFAULT 100 COMMENT 'Damage multiplier or effect strength (100 = 100%)',
    value INT DEFAULT 0 COMMENT 'Heal amount, buff%, duration, etc.',
    target ENUM('self', 'single_enemy', 'all_enemies', 'ally', 'all_allies', 'random_enemies') DEFAULT 'single_enemy',
    trigger_rate INT DEFAULT 100 COMMENT 'Chance to trigger (1-100)',
    cooldown INT DEFAULT 0 COMMENT 'Turns before skill can be used again',
    duration INT DEFAULT 0 COMMENT 'Effect duration in turns (for buffs/debuffs)',
    priority INT DEFAULT 5 COMMENT 'Execution order (1 = highest priority)',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_skill_type (skill_type),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Character-Skill Relationship Table
-- ============================================
CREATE TABLE character_template_skills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    character_template_id INT NOT NULL,
    skill_id INT NOT NULL,
    skill_slot INT NOT NULL COMMENT 'Skill slot (1, 2, 3, 4)',
    unlock_level INT DEFAULT 1 COMMENT 'Level required to unlock this skill',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_template_id) REFERENCES character_templates(id) ON DELETE CASCADE,
    FOREIGN KEY (skill_id) REFERENCES character_skills(id) ON DELETE CASCADE,
    UNIQUE KEY unique_char_slot (character_template_id, skill_slot),
    INDEX idx_character (character_template_id),
    INDEX idx_skill (skill_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- Populate Skills Data
-- ============================================

-- WARRIOR SKILLS
INSERT INTO character_skills (name, skill_type, category, power, value, target, trigger_rate, cooldown, duration, priority, description) VALUES
('Power Strike', 'active', 'single_damage', 150, 0, 'single_enemy', 50, 2, 0, 5, 'Deals 150% damage to a single enemy'),
('Whirlwind', 'active', 'aoe_damage', 120, 0, 'all_enemies', 30, 3, 0, 4, 'Deals 120% damage to all enemies'),
('Battle Cry', 'active', 'buff_atk', 0, 30, 'all_allies', 40, 4, 2, 6, 'Increases all allies ATK by 30% for 2 turns'),
('Battle Stance', 'passive', 'atk_boost', 0, 15, 'self', 100, 0, 0, 10, 'Permanently increases ATK by 15%'),
('Iron Will', 'passive', 'hp_boost', 0, 25, 'self', 100, 0, 0, 10, 'Permanently increases Max HP by 25%'),
('Berserker Rage', 'passive', 'crit_chance', 0, 20, 'self', 100, 0, 0, 10, 'Increases critical hit chance by 20%');

-- MAGE SKILLS
INSERT INTO character_skills (name, skill_type, category, power, value, target, trigger_rate, cooldown, duration, priority, description) VALUES
('Fireball', 'active', 'single_damage', 180, 0, 'single_enemy', 60, 1, 0, 5, 'Hurls a fireball dealing 180% damage'),
('Flame Wave', 'active', 'aoe_damage', 120, 0, 'all_enemies', 30, 3, 0, 4, 'Waves of flame hit all enemies for 120% damage'),
('Ice Bolt', 'active', 'single_damage', 140, 0, 'single_enemy', 40, 2, 0, 5, 'Freezing bolt dealing 140% damage with chance to stun'),
('Arcane Focus', 'passive', 'crit_chance', 0, 20, 'self', 100, 0, 0, 10, 'Increases critical chance by 20%'),
('Mana Shield', 'passive', 'def_boost', 0, 20, 'self', 100, 0, 0, 10, 'Permanently increases DEF by 20%'),
('Arcane Mastery', 'passive', 'crit_damage', 0, 40, 'self', 100, 0, 0, 10, 'Increases critical damage by 40%');

-- ARCHER SKILLS
INSERT INTO character_skills (name, skill_type, category, power, value, target, trigger_rate, cooldown, duration, priority, description) VALUES
('Quick Shot', 'active', 'single_damage', 130, 0, 'single_enemy', 70, 1, 0, 7, 'Quick arrow dealing 130% damage'),
('Multi-Shot', 'active', 'multi_target', 100, 3, 'random_enemies', 40, 3, 0, 5, 'Shoots 3 arrows at random enemies'),
('Piercing Arrow', 'active', 'single_damage', 200, 0, 'single_enemy', 30, 4, 0, 5, 'Powerful shot ignoring 50% DEF, 200% damage'),
('Eagle Eye', 'passive', 'crit_chance', 0, 25, 'self', 100, 0, 0, 10, 'Increases critical chance by 25%'),
('Swift Reflexes', 'passive', 'dodge', 0, 15, 'self', 100, 0, 0, 10, 'Chance to dodge attacks (15%)'),
('Precision', 'passive', 'crit_damage', 0, 50, 'self', 100, 0, 0, 10, 'Increases critical damage by 50%');

-- TANK SKILLS
INSERT INTO character_skills (name, skill_type, category, power, value, target, trigger_rate, cooldown, duration, priority, description) VALUES
('Shield Bash', 'active', 'single_damage', 100, 1, 'single_enemy', 40, 2, 1, 5, 'Bashes enemy with shield, 100% damage with 1 turn stun'),
('Guardian Shield', 'active', 'shield', 0, 500, 'all_allies', 25, 4, 2, 8, 'Creates 500 HP shield for all allies for 2 turns'),
('Taunt', 'active', 'taunt', 0, 0, 'all_enemies', 50, 3, 2, 9, 'Forces all enemies to attack this tank for 2 turns'),
('Iron Skin', 'passive', 'def_boost', 0, 30, 'self', 100, 0, 0, 10, 'Permanently increases DEF by 30%'),
('Guardian Spirit', 'passive', 'hp_boost', 0, 40, 'self', 100, 0, 0, 10, 'Permanently increases Max HP by 40%'),
('Unyielding', 'passive', 'last_stand', 0, 1, 'self', 100, 0, 0, 10, 'Survive with 1 HP once per battle when receiving fatal damage');

-- ASSASSIN SKILLS
INSERT INTO character_skills (name, skill_type, category, power, value, target, trigger_rate, cooldown, duration, priority, description) VALUES
('Backstab', 'active', 'single_damage', 200, 0, 'single_enemy', 50, 2, 0, 5, 'Stealthy attack dealing 200% damage'),
('Shadow Strike', 'active', 'single_damage', 250, 0, 'single_enemy', 70, 2, 0, 5, 'Guaranteed critical hit dealing 250% damage'),
('Poison Blade', 'active', 'poison', 50, 0, 'single_enemy', 40, 3, 3, 5, 'Poisons enemy dealing 50% damage per turn for 3 turns'),
('Execute', 'active', 'execute', 300, 0, 'single_enemy', 20, 5, 0, 3, 'Deals massive damage based on missing enemy HP (up to 300%)'),
('Evasion', 'passive', 'dodge', 0, 25, 'self', 100, 0, 0, 10, 'Chance to dodge attacks (25%)'),
('Deadly Precision', 'passive', 'crit_damage', 0, 50, 'self', 100, 0, 0, 10, 'Increases critical damage by 50%'),
('Lifesteal', 'passive', 'lifesteal', 0, 20, 'self', 100, 0, 0, 10, 'Heals for 20% of damage dealt');

-- SUPPORT/UTILITY SKILLS (for future use)
INSERT INTO character_skills (name, skill_type, category, power, value, target, trigger_rate, cooldown, duration, priority, description) VALUES
('Heal', 'active', 'heal', 0, 40, 'ally', 50, 3, 0, 8, 'Heals an ally for 40% of their max HP'),
('Group Heal', 'active', 'heal', 0, 25, 'all_allies', 30, 5, 0, 8, 'Heals all allies for 25% of their max HP'),
('Revive', 'active', 'revive', 0, 50, 'ally', 100, 99, 0, 10, 'Revives a fallen ally with 50% HP (once per battle)'),
('Weaken', 'active', 'debuff_atk', 0, 30, 'single_enemy', 50, 2, 2, 6, 'Reduces enemy ATK by 30% for 2 turns'),
('Armor Break', 'active', 'debuff_def', 0, 40, 'single_enemy', 50, 2, 2, 6, 'Reduces enemy DEF by 40% for 2 turns'),
('HP Regeneration', 'passive', 'hp_regen', 0, 8, 'self', 100, 0, 0, 10, 'Regenerates 8% Max HP every turn'),
('Counter Strike', 'passive', 'counter_attack', 30, 0, 'self', 100, 0, 0, 10, '30% chance to counter attack when hit');

-- ============================================
-- Assign Skills to Characters
-- ============================================

-- COMMON CHARACTERS (2 skills each)
-- Rookie Warrior (id: 1)
INSERT INTO character_template_skills (character_template_id, skill_id, skill_slot, unlock_level) VALUES
(1, 1, 1, 1),  -- Power Strike (active)
(1, 4, 2, 1);  -- Battle Stance (passive)

-- Apprentice Mage (id: 2)
INSERT INTO character_template_skills (character_template_id, skill_id, skill_slot, unlock_level) VALUES
(2, 7, 1, 1),  -- Fireball (active)
(2, 10, 2, 1); -- Arcane Focus (passive)

-- Trainee Archer (id: 3)
INSERT INTO character_template_skills (character_template_id, skill_id, skill_slot, unlock_level) VALUES
(3, 13, 1, 1), -- Quick Shot (active)
(3, 16, 2, 1); -- Eagle Eye (passive)

-- Town Guard (id: 4)
INSERT INTO character_template_skills (character_template_id, skill_id, skill_slot, unlock_level) VALUES
(4, 19, 1, 1), -- Shield Bash (active)
(4, 22, 2, 1); -- Iron Skin (passive)

-- Street Thief (id: 5)
INSERT INTO character_template_skills (character_template_id, skill_id, skill_slot, unlock_level) VALUES
(5, 25, 1, 1), -- Backstab (active)
(5, 29, 2, 1); -- Evasion (passive)

-- RARE CHARACTERS (2-3 skills each)
-- Veteran Warrior (id: 6)
INSERT INTO character_template_skills (character_template_id, skill_id, skill_slot, unlock_level) VALUES
(6, 2, 1, 1),  -- Whirlwind (active)
(6, 1, 2, 1),  -- Power Strike (active)
(6, 4, 3, 5);  -- Battle Stance (passive, unlock at level 5)

-- Battle Mage (id: 7)
INSERT INTO character_template_skills (character_template_id, skill_id, skill_slot, unlock_level) VALUES
(7, 7, 1, 1),  -- Fireball (active)
(7, 8, 2, 1),  -- Flame Wave (active)
(7, 10, 3, 5); -- Arcane Focus (passive, unlock at level 5)

-- Elite Archer (id: 8)
INSERT INTO character_template_skills (character_template_id, skill_id, skill_slot, unlock_level) VALUES
(8, 14, 1, 1), -- Multi-Shot (active)
(8, 13, 2, 1), -- Quick Shot (active)
(8, 16, 3, 5); -- Eagle Eye (passive, unlock at level 5)

-- Royal Guard (id: 9)
INSERT INTO character_template_skills (character_template_id, skill_id, skill_slot, unlock_level) VALUES
(9, 20, 1, 1), -- Guardian Shield (active)
(9, 19, 2, 1), -- Shield Bash (active)
(9, 22, 3, 5); -- Iron Skin (passive, unlock at level 5)

-- Shadow Assassin (id: 10)
INSERT INTO character_template_skills (character_template_id, skill_id, skill_slot, unlock_level) VALUES
(10, 26, 1, 1), -- Shadow Strike (active)
(10, 27, 2, 1), -- Poison Blade (active)
(10, 29, 3, 5); -- Evasion (passive, unlock at level 5)

-- EPIC CHARACTERS (3 skills each)
-- Characters 11-15
INSERT INTO character_template_skills (character_template_id, skill_id, skill_slot, unlock_level) VALUES
-- Epic Warrior (id: 11)
(11, 2, 1, 1),  -- Whirlwind
(11, 3, 2, 1),  -- Battle Cry
(11, 6, 3, 10), -- Berserker Rage (passive)

-- Epic Mage (id: 12)
(12, 8, 1, 1),  -- Flame Wave
(12, 9, 2, 1),  -- Ice Bolt
(12, 12, 3, 10), -- Arcane Mastery (passive)

-- Epic Archer (id: 13)
(13, 15, 1, 1), -- Piercing Arrow
(13, 14, 2, 1), -- Multi-Shot
(13, 18, 3, 10), -- Precision (passive)

-- Epic Tank (id: 14)
(14, 21, 1, 1), -- Taunt
(14, 20, 2, 1), -- Guardian Shield
(14, 23, 3, 10), -- Guardian Spirit (passive)

-- Epic Assassin (id: 15)
(15, 26, 1, 1), -- Shadow Strike
(15, 27, 2, 1), -- Poison Blade
(15, 30, 3, 10); -- Deadly Precision (passive)

-- LEGENDARY CHARACTERS (4 skills each)
-- Characters 16-20
INSERT INTO character_template_skills (character_template_id, skill_id, skill_slot, unlock_level) VALUES
-- Legendary Warrior (id: 16)
(16, 2, 1, 1),  -- Whirlwind
(16, 3, 2, 1),  -- Battle Cry
(16, 5, 3, 10), -- Iron Will (passive)
(16, 6, 4, 15), -- Berserker Rage (passive)

-- Legendary Mage (id: 17)
(17, 8, 1, 1),  -- Flame Wave
(17, 9, 2, 1),  -- Ice Bolt
(17, 11, 3, 10), -- Mana Shield (passive)
(17, 12, 4, 15), -- Arcane Mastery (passive)

-- Legendary Archer (id: 18)
(18, 15, 1, 1), -- Piercing Arrow
(18, 14, 2, 1), -- Multi-Shot
(18, 17, 3, 10), -- Swift Reflexes (passive)
(18, 18, 4, 15), -- Precision (passive)

-- Legendary Tank (id: 19)
(19, 21, 1, 1), -- Taunt
(19, 20, 2, 1), -- Guardian Shield
(19, 23, 3, 10), -- Guardian Spirit (passive)
(19, 24, 4, 15), -- Unyielding (passive)

-- Legendary Assassin (id: 20)
(20, 28, 1, 1), -- Execute
(20, 27, 2, 1), -- Poison Blade
(20, 29, 3, 10), -- Evasion (passive)
(20, 31, 4, 15); -- Lifesteal (passive)

-- ============================================
-- Verification Queries
-- ============================================

-- Count skills by type
-- SELECT skill_type, COUNT(*) FROM character_skills GROUP BY skill_type;

-- Count skills by category
-- SELECT category, COUNT(*) FROM character_skills GROUP BY category;

-- Check character skill assignments
-- SELECT
--     ct.id, ct.name, ct.rarity,
--     COUNT(cts.skill_id) as skill_count
-- FROM character_templates ct
-- LEFT JOIN character_template_skills cts ON ct.id = cts.character_template_id
-- GROUP BY ct.id
-- ORDER BY ct.id;

-- View specific character's skills
-- SELECT
--     ct.name as character_name,
--     cs.name as skill_name,
--     cs.skill_type,
--     cs.category,
--     cts.skill_slot,
--     cts.unlock_level
-- FROM character_templates ct
-- JOIN character_template_skills cts ON ct.id = cts.character_template_id
-- JOIN character_skills cs ON cts.skill_id = cs.id
-- WHERE ct.id = 1
-- ORDER BY cts.skill_slot;
