/**
 * Equipment Model
 * Handles player equipment instances
 */

const BaseModel = require('./BaseModel');

class Equipment extends BaseModel {
  constructor() {
    super('player_equipment');
  }

  /**
   * Get user's equipment with details
   */
  async getUserEquipment(userId) {
    const sql = `
      SELECT
        pe.*,
        i.name,
        i.rarity,
        i.icon,
        i.sell_price,
        et.equipment_type,
        et.primary_stat,
        et.base_value,
        et.growth_rate,
        et.max_level,
        et.max_stars,
        ct.name as equipped_on_character
      FROM ${this.table} pe
      JOIN equipment_templates et ON pe.equipment_template_id = et.id
      JOIN items i ON et.item_id = i.id
      LEFT JOIN player_characters pc ON pe.equipped_character_id = pc.id
      LEFT JOIN character_templates ct ON pc.template_id = ct.id
      WHERE pe.user_id = ?
      ORDER BY pe.is_equipped DESC, i.rarity DESC, pe.level DESC, pe.stars DESC
    `;
    return await this.executeQuery(sql, [userId]);
  }

  /**
   * Get equipment by ID with details
   */
  async getEquipmentById(equipmentId, userId) {
    const sql = `
      SELECT
        pe.*,
        i.name,
        i.rarity,
        i.description,
        i.icon,
        i.sell_price,
        et.equipment_type,
        et.primary_stat,
        et.base_value,
        et.growth_rate,
        et.max_level,
        et.max_stars
      FROM ${this.table} pe
      JOIN equipment_templates et ON pe.equipment_template_id = et.id
      JOIN items i ON et.item_id = i.id
      WHERE pe.id = ? AND pe.user_id = ?
    `;
    const results = await this.executeQuery(sql, [equipmentId, userId]);
    return results[0] || null;
  }

  /**
   * Create new equipment for user (e.g., from gacha/drops)
   */
  async createEquipment(userId, equipmentTemplateId, initialStats = {}) {
    // Get template details
    const templateSql = `
      SELECT et.*, i.rarity
      FROM equipment_templates et
      JOIN items i ON et.item_id = i.id
      WHERE et.id = ?
    `;
    const template = await this.executeQuery(templateSql, [equipmentTemplateId]);

    if (!template || template.length === 0) {
      throw new Error('Equipment template not found');
    }

    const tmpl = template[0];

    // Calculate initial primary stat
    const currentPrimaryStat = tmpl.base_value;

    // Generate random sub-stats based on rarity
    const subStats = this.generateSubStats(tmpl.rarity);

    // Insert equipment
    const insertSql = `
      INSERT INTO ${this.table} (
        user_id,
        equipment_template_id,
        level,
        stars,
        current_primary_stat,
        sub_stat_1_type,
        sub_stat_1_value,
        sub_stat_2_type,
        sub_stat_2_value,
        sub_stat_3_type,
        sub_stat_3_value
      ) VALUES (?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await this.executeQuery(insertSql, [
      userId,
      equipmentTemplateId,
      currentPrimaryStat,
      subStats[0]?.type || null,
      subStats[0]?.value || 0,
      subStats[1]?.type || null,
      subStats[1]?.value || 0,
      subStats[2]?.type || null,
      subStats[2]?.value || 0
    ]);

    return result.insertId;
  }

  /**
   * Generate random sub-stats based on rarity
   */
  generateSubStats(rarity) {
    const raritySubStatCount = {
      Common: 0,
      Rare: 1,
      Epic: 2,
      Legendary: 3,
      Mythic: 3
    };

    const count = raritySubStatCount[rarity] || 0;
    const subStats = [];
    const usedTypes = new Set();

    const statTypes = ['atk', 'def', 'hp', 'crit_rate', 'crit_dmg', 'speed'];
    const statValueRanges = {
      atk: [5, 15],
      def: [3, 10],
      hp: [20, 50],
      crit_rate: [2, 8],
      crit_dmg: [5, 15],
      speed: [1, 5]
    };

    for (let i = 0; i < count; i++) {
      // Get available stat types
      const availableTypes = statTypes.filter(t => !usedTypes.has(t));
      if (availableTypes.length === 0) break;

      // Random type
      const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];
      usedTypes.add(type);

      // Random value within range
      const [min, max] = statValueRanges[type];
      const value = Math.floor(Math.random() * (max - min + 1)) + min;

      subStats.push({ type, value });
    }

    return subStats;
  }

  /**
   * Calculate equipment stats at current level and stars
   */
  calculateStats(equipment) {
    const { base_value, growth_rate, level, stars } = equipment;

    // Level multiplier: base * (growth_rate ^ level)
    const levelMultiplier = Math.pow(growth_rate, level);

    // Star multiplier: +10% per star
    const starMultiplier = 1 + (stars * 0.10);

    // Final stat
    const finalStat = Math.floor(base_value * levelMultiplier * starMultiplier);

    return {
      primary_stat: finalStat,
      level_bonus: Math.floor(base_value * (levelMultiplier - 1)),
      star_bonus: Math.floor(base_value * levelMultiplier * (starMultiplier - 1))
    };
  }

  /**
   * Upgrade equipment level
   */
  async upgradeLevel(equipmentId, userId) {
    const equipment = await this.getEquipmentById(equipmentId, userId);

    if (!equipment) {
      throw new Error('Equipment not found');
    }

    if (equipment.level >= equipment.max_level) {
      throw new Error('Equipment is already at max level');
    }

    // Calculate new stats
    const newLevel = equipment.level + 1;
    const newStats = this.calculateStats({
      ...equipment,
      level: newLevel
    });

    // Update equipment
    const updateSql = `
      UPDATE ${this.table}
      SET level = ?,
          current_primary_stat = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `;

    await this.executeQuery(updateSql, [
      newLevel,
      newStats.primary_stat,
      equipmentId,
      userId
    ]);

    return newLevel;
  }

  /**
   * Upgrade equipment stars
   */
  async upgradeStar(equipmentId, userId) {
    const equipment = await this.getEquipmentById(equipmentId, userId);

    if (!equipment) {
      throw new Error('Equipment not found');
    }

    if (equipment.stars >= equipment.max_stars) {
      throw new Error('Equipment is already at max stars');
    }

    // Calculate new stats
    const newStars = equipment.stars + 1;
    const newStats = this.calculateStats({
      ...equipment,
      stars: newStars
    });

    // Update equipment
    const updateSql = `
      UPDATE ${this.table}
      SET stars = ?,
          current_primary_stat = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `;

    await this.executeQuery(updateSql, [
      newStars,
      newStats.primary_stat,
      equipmentId,
      userId
    ]);

    return newStars;
  }

  /**
   * Equip/unequip equipment
   */
  async toggleEquip(equipmentId, userId, characterId = null) {
    const updateSql = `
      UPDATE ${this.table}
      SET is_equipped = ?,
          equipped_character_id = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `;

    const isEquipped = characterId !== null;
    return await this.executeQuery(updateSql, [isEquipped, characterId, equipmentId, userId]);
  }

  /**
   * Lock/unlock equipment
   */
  async toggleLock(equipmentId, userId) {
    const equipment = await this.getEquipmentById(equipmentId, userId);

    if (!equipment) {
      throw new Error('Equipment not found');
    }

    const updateSql = `
      UPDATE ${this.table}
      SET is_locked = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `;

    return await this.executeQuery(updateSql, [!equipment.is_locked, equipmentId, userId]);
  }

  /**
   * Sell equipment
   */
  async sellEquipment(equipmentId, userId) {
    const equipment = await this.getEquipmentById(equipmentId, userId);

    if (!equipment) {
      throw new Error('Equipment not found');
    }

    if (equipment.is_locked) {
      throw new Error('Cannot sell locked equipment');
    }

    if (equipment.is_equipped) {
      throw new Error('Cannot sell equipped equipment');
    }

    // Calculate sell price (base + level + star bonuses)
    const sellPrice = equipment.sell_price +
      (equipment.level * 100) +
      (equipment.stars * 500);

    // Delete equipment
    await this.delete(equipmentId);

    return sellPrice;
  }
}

module.exports = new Equipment();
