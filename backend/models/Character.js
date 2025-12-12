/**
 * Character Model
 * Handles character templates (master data)
 */

const BaseModel = require('./BaseModel');

class Character extends BaseModel {
  constructor() {
    super('character_templates');
  }

  /**
   * Get all characters
   * @param {Object} filters - Optional filters (type, rarity)
   * @returns {Promise<Array>} Array of characters
   */
  async getAllCharacters(filters = {}) {
    const { type, rarity, orderBy = 'rarity, name' } = filters;
    const where = {};

    if (type) where.type = type;
    if (rarity) where.rarity = rarity;

    return await this.findAll({ where, orderBy });
  }

  /**
   * Get character by ID
   * @param {number} id - Character template ID
   * @returns {Promise<Object|null>} Character template
   */
  async getCharacterById(id) {
    return await this.findById(id);
  }

  /**
   * Get characters by rarity
   * @param {string} rarity - Rarity level
   * @returns {Promise<Array>} Array of characters
   */
  async getCharactersByRarity(rarity) {
    return await this.findAll({ where: { rarity } });
  }

  /**
   * Get characters by type
   * @param {string} type - Character type
   * @returns {Promise<Array>} Array of characters
   */
  async getCharactersByType(type) {
    return await this.findAll({ where: { type } });
  }

  /**
   * Get random character based on weighted drop rates
   * @param {string} bannerType - 'Normal' or 'Premium'
   * @param {boolean} isPity - Whether pity is triggered
   * @returns {Promise<Object>} Random character
   */
  async getRandomCharacter(bannerType = 'Normal', isPity = false) {
    // Define drop rates based on banner type
    const dropRates = {
      Normal: {
        Common: 70,
        Rare: 25,
        Epic: 4.5,
        Legendary: 0.5
      },
      Premium: {
        Common: 50,
        Rare: 35,
        Epic: 13,
        Legendary: 2
      }
    };

    // If pity is triggered, guarantee Legendary
    if (isPity) {
      const legendaries = await this.getCharactersByRarity('Legendary');
      return legendaries[Math.floor(Math.random() * legendaries.length)];
    }

    // Get rarity based on drop rates
    const rates = dropRates[bannerType];
    const roll = Math.random() * 100;

    let rarity;
    let cumulative = 0;

    for (const [rarityLevel, rate] of Object.entries(rates)) {
      cumulative += rate;
      if (roll <= cumulative) {
        rarity = rarityLevel;
        break;
      }
    }

    // Get characters of determined rarity
    const characters = await this.getCharactersByRarity(rarity);

    // Return random character from the rarity pool
    return characters[Math.floor(Math.random() * characters.length)];
  }

  /**
   * Get multiple random characters (for 10x pull)
   * @param {number} count - Number of characters to get
   * @param {string} bannerType - 'Normal' or 'Premium'
   * @param {boolean} guaranteeEpic - Whether to guarantee at least 1 Epic+
   * @param {boolean} isPity - Whether pity is triggered
   * @returns {Promise<Array>} Array of random characters
   */
  async getMultipleRandomCharacters(count = 10, bannerType = 'Premium', guaranteeEpic = true, isPity = false) {
    const characters = [];

    // If pity is triggered, first pull is Legendary
    if (isPity) {
      const legendary = await this.getRandomCharacter(bannerType, true);
      characters.push(legendary);
      count--;
    }

    // Pull remaining characters
    for (let i = 0; i < count; i++) {
      const character = await this.getRandomCharacter(bannerType, false);
      characters.push(character);
    }

    // Guarantee at least one Epic or higher for 10x pulls
    if (guaranteeEpic && !isPity) {
      const hasEpicOrBetter = characters.some(
        char => char.rarity === 'Epic' || char.rarity === 'Legendary'
      );

      if (!hasEpicOrBetter) {
        // Replace first Common/Rare with Epic
        const replaceIndex = characters.findIndex(
          char => char.rarity === 'Common' || char.rarity === 'Rare'
        );

        if (replaceIndex !== -1) {
          const epicOrLegendary = await this.getRandomCharacterEpicOrHigher(bannerType);
          characters[replaceIndex] = epicOrLegendary;
        }
      }
    }

    return characters;
  }

  /**
   * Get random characters by count
   * @param {number} count - Number of characters
   * @param {string} bannerType - Banner type
   * @returns {Promise<Array>} Random characters
   */
  async getRandomCharactersByCount(count, bannerType = 'Normal') {
    const characters = [];
    for (let i = 0; i < count; i++) {
      const char = await this.getRandomCharacter(bannerType, false);
      characters.push(char);
    }
    return characters;
  }

  /**
   * Get random Epic or Legendary character
   * @param {string} bannerType - Banner type
   * @returns {Promise<Object>} Random Epic or Legendary character
   */
  async getRandomCharacterEpicOrHigher(bannerType) {
    // 80% Epic, 20% Legendary for guaranteed pull
    const roll = Math.random() * 100;
    const rarity = roll < 80 ? 'Epic' : 'Legendary';

    const characters = await this.getCharactersByRarity(rarity);
    return characters[Math.floor(Math.random() * characters.length)];
  }

  /**
   * Get character statistics
   * @returns {Promise<Object>} Character statistics
   */
  async getCharacterStats() {
    const sql = `
      SELECT
        rarity,
        COUNT(*) as count,
        AVG(base_atk) as avg_atk,
        AVG(base_def) as avg_def,
        AVG(base_hp) as avg_hp
      FROM ${this.table}
      GROUP BY rarity
      ORDER BY FIELD(rarity, 'Common', 'Rare', 'Epic', 'Legendary')
    `;

    return await this.executeQuery(sql);
  }
}

module.exports = new Character();
