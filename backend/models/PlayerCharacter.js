/**
 * PlayerCharacter Model
 * Handles characters owned by players (Inventory)
 */

const BaseModel = require('./BaseModel');

class PlayerCharacter extends BaseModel {
  constructor() {
    super('player_characters');
  }

  /**
   * Get all characters for a user
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of player characters with template data
   */
  async getUserCharacters(userId, options = {}) {
    const { orderBy = 'pc.obtained_at DESC', limit, offset } = options;

    let sql = `
      SELECT
        pc.*,
        ct.name, ct.type, ct.rarity, ct.image_url,
        ct.special_ability, ct.ability_description
      FROM ${this.table} pc
      JOIN character_templates ct ON pc.template_id = ct.id
      WHERE pc.user_id = ?
    `;

    const params = [userId];

    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }

    if (limit) {
      sql += ` LIMIT ?`;
      params.push(limit);

      if (offset) {
        sql += ` OFFSET ?`;
        params.push(offset);
      }
    }

    return await this.executeQuery(sql, params);
  }

  /**
   * Get a specific player character
   * @param {number} characterId - Player character ID
   * @param {number} userId - User ID (for ownership verification)
   * @returns {Promise<Object|null>} Player character
   */
  async getPlayerCharacter(characterId, userId) {
    const sql = `
      SELECT
        pc.*,
        ct.name, ct.type, ct.rarity, ct.image_url,
        ct.special_ability, ct.ability_description
      FROM ${this.table} pc
      JOIN character_templates ct ON pc.template_id = ct.id
      WHERE pc.id = ? AND pc.user_id = ?
    `;

    const results = await this.executeQuery(sql, [characterId, userId]);
    return results[0] || null;
  }

  /**
   * Add character to player inventory
   * @param {number} userId - User ID
   * @param {number} templateId - Character template ID
   * @returns {Promise<Object>} Created player character
   */
  async addCharacter(userId, templateId) {
    // Get character template to calculate stats
    const Character = require('./Character');
    const template = await Character.findById(templateId);

    if (!template) {
      throw new Error('Character template not found');
    }

    // Create player character with base stats
    return await this.create({
      user_id: userId,
      template_id: templateId,
      level: 1,
      experience: 0,
      current_atk: template.base_atk,
      current_def: template.base_def,
      current_hp: template.base_hp,
      is_locked: false,
      is_favorite: false
    });
  }

  /**
   * Add multiple characters to inventory (for gacha pulls)
   * @param {number} userId - User ID
   * @param {Array} templateIds - Array of character template IDs
   * @returns {Promise<Array>} Array of created player characters
   */
  async addMultipleCharacters(userId, templateIds) {
    const characters = [];

    for (const templateId of templateIds) {
      const character = await this.addCharacter(userId, templateId);
      characters.push(character);
    }

    return characters;
  }

  /**
   * Lock or unlock a character
   * @param {number} characterId - Player character ID
   * @param {number} userId - User ID
   * @param {boolean} locked - Lock status
   * @returns {Promise<boolean>} Success status
   */
  async toggleLock(characterId, userId, locked) {
    const sql = `
      UPDATE ${this.table}
      SET is_locked = ?
      WHERE id = ? AND user_id = ?
    `;

    const result = await this.executeQuery(sql, [locked, characterId, userId]);
    return result.affectedRows > 0;
  }

  /**
   * Toggle favorite status
   * @param {number} characterId - Player character ID
   * @param {number} userId - User ID
   * @param {boolean} favorite - Favorite status
   * @returns {Promise<boolean>} Success status
   */
  async toggleFavorite(characterId, userId, favorite) {
    const sql = `
      UPDATE ${this.table}
      SET is_favorite = ?
      WHERE id = ? AND user_id = ?
    `;

    const result = await this.executeQuery(sql, [favorite, characterId, userId]);
    return result.affectedRows > 0;
  }

  /**
   * Delete a character (sell/dismantle)
   * @param {number} characterId - Player character ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Result with rewards
   */
  async deleteCharacter(characterId, userId) {
    // Get character details first
    const character = await this.getPlayerCharacter(characterId, userId);

    if (!character) {
      throw new Error('Character not found');
    }

    if (character.is_locked) {
      throw new Error('Cannot delete locked character');
    }

    // Calculate sell rewards based on rarity
    const sellPrices = {
      Common: 50,
      Rare: 200,
      Epic: 1000,
      Legendary: 5000
    };

    const goldReward = sellPrices[character.rarity] || 0;

    // Delete character
    const sql = `DELETE FROM ${this.table} WHERE id = ? AND user_id = ?`;
    const result = await this.executeQuery(sql, [characterId, userId]);

    if (result.affectedRows === 0) {
      throw new Error('Failed to delete character');
    }

    return {
      success: true,
      goldReward,
      character
    };
  }

  /**
   * Upgrade character
   * @param {number} characterId - Player character ID
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Updated character
   */
  async upgradeCharacter(characterId, userId) {
    const character = await this.getPlayerCharacter(characterId, userId);

    if (!character) {
      throw new Error('Character not found');
    }

    // Calculate new stats (10% increase per level)
    const newLevel = character.level + 1;
    const statMultiplier = 1.1;

    const sql = `
      UPDATE ${this.table}
      SET
        level = ?,
        current_atk = FLOOR(current_atk * ?),
        current_def = FLOOR(current_def * ?),
        current_hp = FLOOR(current_hp * ?)
      WHERE id = ? AND user_id = ?
    `;

    await this.executeQuery(sql, [
      newLevel,
      statMultiplier,
      statMultiplier,
      statMultiplier,
      characterId,
      userId
    ]);

    return await this.getPlayerCharacter(characterId, userId);
  }

  /**
   * Get user's inventory statistics
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Inventory statistics
   */
  async getInventoryStats(userId) {
    const sql = `
      SELECT
        COUNT(*) as total_characters,
        COUNT(DISTINCT ct.rarity) as unique_rarities,
        COUNT(DISTINCT ct.type) as unique_types,
        SUM(CASE WHEN ct.rarity = 'Common' THEN 1 ELSE 0 END) as common_count,
        SUM(CASE WHEN ct.rarity = 'Rare' THEN 1 ELSE 0 END) as rare_count,
        SUM(CASE WHEN ct.rarity = 'Epic' THEN 1 ELSE 0 END) as epic_count,
        SUM(CASE WHEN ct.rarity = 'Legendary' THEN 1 ELSE 0 END) as legendary_count,
        AVG(pc.level) as avg_level,
        SUM(pc.is_locked) as locked_count,
        SUM(pc.is_favorite) as favorite_count
      FROM ${this.table} pc
      JOIN character_templates ct ON pc.template_id = ct.id
      WHERE pc.user_id = ?
    `;

    const results = await this.executeQuery(sql, [userId]);
    return results[0] || null;
  }

  /**
   * Filter characters by rarity or type
   * @param {number} userId - User ID
   * @param {Object} filters - Filters (rarity, type, locked, favorite)
   * @returns {Promise<Array>} Filtered characters
   */
  async filterCharacters(userId, filters = {}) {
    const { rarity, type, locked, favorite } = filters;

    let sql = `
      SELECT
        pc.*,
        ct.name, ct.type, ct.rarity, ct.image_url,
        ct.special_ability, ct.ability_description
      FROM ${this.table} pc
      JOIN character_templates ct ON pc.template_id = ct.id
      WHERE pc.user_id = ?
    `;

    const params = [userId];

    if (rarity) {
      sql += ` AND ct.rarity = ?`;
      params.push(rarity);
    }

    if (type) {
      sql += ` AND ct.type = ?`;
      params.push(type);
    }

    if (locked !== undefined) {
      sql += ` AND pc.is_locked = ?`;
      params.push(locked);
    }

    if (favorite !== undefined) {
      sql += ` AND pc.is_favorite = ?`;
      params.push(favorite);
    }

    sql += ` ORDER BY pc.obtained_at DESC`;

    return await this.executeQuery(sql, params);
  }

  /**
   * Calculate total stats including equipment bonuses
   * @param {Object} character - Character object with equipment slot IDs
   * @returns {Promise<Object>} Total stats { atk, def, hp }
   */
  async calculateTotalStats(character) {
    const Equipment = require('./Equipment');

    // Start with base character stats
    const totalStats = {
      atk: character.current_atk || 0,
      def: character.current_def || 0,
      hp: character.current_hp || 0
    };

    // Add equipment bonuses for each slot
    const equipmentSlots = ['weapon', 'armor', 'accessory', 'artifact'];

    for (const slot of equipmentSlots) {
      const equipmentId = character[`equipment_${slot}_id`];

      if (equipmentId) {
        const equipment = await Equipment.getEquipmentById(equipmentId, character.user_id);

        if (equipment) {
          // Add primary stat bonus
          const statType = equipment.primary_stat;
          if (statType === 'atk') {
            totalStats.atk += equipment.current_primary_stat;
          } else if (statType === 'def') {
            totalStats.def += equipment.current_primary_stat;
          } else if (statType === 'hp') {
            totalStats.hp += equipment.current_primary_stat;
          }

          // Add sub-stat bonuses
          for (let i = 1; i <= 3; i++) {
            const subStatType = equipment[`sub_stat_${i}_type`];
            const subStatValue = equipment[`sub_stat_${i}_value`] || 0;

            if (subStatType && subStatValue > 0) {
              if (subStatType === 'atk') {
                totalStats.atk += subStatValue;
              } else if (subStatType === 'def') {
                totalStats.def += subStatValue;
              } else if (subStatType === 'hp') {
                totalStats.hp += subStatValue;
              }
            }
          }
        }
      }
    }

    return totalStats;
  }

  /**
   * Get player character with total stats including equipment
   * @param {number} characterId - Player character ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Character with total stats
   */
  async getPlayerCharacterWithStats(characterId, userId) {
    const character = await this.getPlayerCharacter(characterId, userId);

    if (!character) {
      return null;
    }

    const totalStats = await this.calculateTotalStats(character);

    return {
      ...character,
      total_atk: totalStats.atk,
      total_def: totalStats.def,
      total_hp: totalStats.hp
    };
  }
}

module.exports = new PlayerCharacter();
