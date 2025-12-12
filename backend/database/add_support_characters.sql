-- ============================================
-- Add Support/Healer Characters
-- To cover remaining skills (ID 32-38)
-- Created: 2025-11-21
-- ============================================

-- ============================================
-- Add New Character Templates
-- ============================================

-- RARE Support/Healer Characters (3 skills each)
-- Character 21: Holy Priest (Rare Healer)
INSERT INTO character_templates (name, type, rarity, base_hp, base_atk, base_def) VALUES
('Holy Priest', 'Mage', 'Rare', 150, 40, 35);

-- Character 22: Battle Cleric (Rare Support)
INSERT INTO character_templates (name, type, rarity, base_hp, base_atk, base_def) VALUES
('Battle Cleric', 'Tank', 'Rare', 200, 45, 50);

-- EPIC Support Characters (3 skills each)
-- Character 23: Divine Healer (Epic Healer)
INSERT INTO character_templates (name, type, rarity, base_hp, base_atk, base_def) VALUES
('Divine Healer', 'Mage', 'Epic', 180, 50, 40);

-- Character 24: War Priest (Epic Support)
INSERT INTO character_templates (name, type, rarity, base_hp, base_atk, base_def) VALUES
('War Priest', 'Warrior', 'Epic', 220, 60, 45);

-- LEGENDARY Support (4 skills)
-- Character 25: Archangel (Legendary Support/Healer)
INSERT INTO character_templates (name, type, rarity, base_hp, base_atk, base_def) VALUES
('Archangel', 'Mage', 'Legendary', 250, 70, 50);

-- ============================================
-- Assign Skills to New Characters
-- ============================================

-- Rare Holy Priest (id: 21) - Healer focus
-- 3 skills: Heal + Group Heal + HP Regen
INSERT INTO character_template_skills (character_template_id, skill_id, skill_slot, unlock_level) VALUES
(21, 32, 1, 1),  -- Heal (active)
(21, 33, 2, 5),  -- Group Heal (active)
(21, 37, 3, 10); -- HP Regeneration (passive)

-- Rare Battle Cleric (id: 22) - Tank/Support hybrid
-- 3 skills: Guardian Shield + Weaken + Counter Strike
INSERT INTO character_template_skills (character_template_id, skill_id, skill_slot, unlock_level) VALUES
(22, 20, 1, 1),  -- Guardian Shield (reuse - active shield skill)
(22, 35, 2, 5),  -- Weaken (debuff_atk)
(22, 38, 3, 10); -- Counter Strike (passive)

-- Epic Divine Healer (id: 23) - Advanced Healer
-- 3 skills: Group Heal + Revive + HP Regen
INSERT INTO character_template_skills (character_template_id, skill_id, skill_slot, unlock_level) VALUES
(23, 33, 1, 1),  -- Group Heal (active)
(23, 34, 2, 5),  -- Revive (active)
(23, 37, 3, 10); -- HP Regeneration (passive)

-- Epic War Priest (id: 24) - Support/Debuffer
-- 3 skills: Armor Break + Weaken + Counter Strike
INSERT INTO character_template_skills (character_template_id, skill_id, skill_slot, unlock_level) VALUES
(24, 36, 1, 1),  -- Armor Break (debuff_def)
(24, 35, 2, 5),  -- Weaken (debuff_atk)
(24, 38, 3, 10); -- Counter Strike (passive)

-- Legendary Archangel (id: 25) - Ultimate Support
-- 4 skills: Group Heal + Revive + Heal + HP Regen
INSERT INTO character_template_skills (character_template_id, skill_id, skill_slot, unlock_level) VALUES
(25, 33, 1, 1),  -- Group Heal (active)
(25, 34, 2, 5),  -- Revive (active)
(25, 32, 3, 10), -- Heal (active)
(25, 37, 4, 15); -- HP Regeneration (passive)

-- ============================================
-- Verification Queries
-- ============================================

-- Count total characters
-- SELECT COUNT(*) as total_characters FROM character_templates;

-- Check which skills are used
-- SELECT
--     cs.id,
--     cs.name,
--     cs.skill_type,
--     cs.category,
--     COUNT(DISTINCT cts.character_template_id) as used_by_characters
-- FROM character_skills cs
-- LEFT JOIN character_template_skills cts ON cs.id = cts.skill_id
-- GROUP BY cs.id
-- ORDER BY cs.id;

-- Check new characters' skills
-- SELECT
--     ct.id,
--     ct.name,
--     ct.rarity,
--     cs.name as skill_name,
--     cs.skill_type,
--     cts.skill_slot,
--     cts.unlock_level
-- FROM character_templates ct
-- JOIN character_template_skills cts ON ct.id = cts.character_template_id
-- JOIN character_skills cs ON cts.skill_id = cs.id
-- WHERE ct.id >= 21
-- ORDER BY ct.id, cts.skill_slot;
