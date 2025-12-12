/**
 * Gacha Model
 * Handles gacha banners and pull history
 */

const BaseModel = require('./BaseModel');

class Gacha extends BaseModel {
  constructor() {
    super('gacha_banners');
  }

  /**
   * Get all active banners
   * @returns {Promise<Array>} Array of active banners
   */
  async getActiveBanners() {
    const sql = `
      SELECT * FROM ${this.table}
      WHERE is_active = TRUE
      AND (end_date IS NULL OR end_date > NOW())
      ORDER BY type, id
    `;

    return await this.executeQuery(sql);
  }

  /**
   * Get banner by ID
   * @param {number} bannerId - Banner ID
   * @returns {Promise<Object|null>} Banner object
   */
  async getBannerById(bannerId) {
    return await this.findById(bannerId);
  }

  /**
   * Get banner by type
   * @param {string} type - Banner type ('Normal' or 'Premium')
   * @returns {Promise<Object|null>} Banner object
   */
  async getBannerByType(type) {
    return await this.findOne({ type, is_active: true });
  }

  /**
   * Create gacha history record
   * @param {Object} pullData - Pull data
   * @returns {Promise<Object>} Created history record
   */
  async createHistory(pullData) {
    const {
      userId,
      bannerId,
      pullType,
      costType,
      costAmount,
      charactersObtained,
      wasPityTriggered
    } = pullData;

    const GachaHistory = require('./GachaHistory');
    return await GachaHistory.create({
      user_id: userId,
      banner_id: bannerId,
      pull_type: pullType,
      cost_type: costType,
      cost_amount: costAmount,
      characters_obtained: JSON.stringify(charactersObtained),
      was_pity_triggered: wasPityTriggered || false
    });
  }

  /**
   * Get user's gacha history
   * @param {number} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Array of pull history
   */
  async getUserHistory(userId, options = {}) {
    const { limit = 50, offset = 0 } = options;

    const GachaHistory = require('./GachaHistory');
    const sql = `
      SELECT
        gh.*,
        gb.name as banner_name,
        gb.type as banner_type
      FROM gacha_history gh
      JOIN ${this.table} gb ON gh.banner_id = gb.id
      WHERE gh.user_id = ?
      ORDER BY gh.pulled_at DESC
      LIMIT ? OFFSET ?
    `;

    return await this.executeQuery(sql, [userId, limit, offset]);
  }

  /**
   * Get pull statistics for a user
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Pull statistics
   */
  async getUserPullStats(userId) {
    const sql = `
      SELECT
        COUNT(*) as total_pulls,
        SUM(CASE WHEN pull_type = 'Single' THEN 1 ELSE 0 END) as single_pulls,
        SUM(CASE WHEN pull_type = '10x' THEN 1 ELSE 0 END) as multi_pulls,
        SUM(CASE WHEN cost_type = 'Gems' THEN cost_amount ELSE 0 END) as total_gems_spent,
        SUM(CASE WHEN cost_type = 'Gold' THEN cost_amount ELSE 0 END) as total_gold_spent,
        SUM(was_pity_triggered) as pity_triggers
      FROM gacha_history
      WHERE user_id = ?
    `;

    const results = await this.executeQuery(sql, [userId]);
    return results[0] || null;
  }

  /**
   * Perform a single pull
   * @param {number} userId - User ID
   * @param {number} bannerId - Banner ID
   * @returns {Promise<Object>} Pull result
   */
  async performSinglePull(userId, bannerId) {
    const User = require('./User');
    const Character = require('./Character');
    const PlayerCharacter = require('./PlayerCharacter');

    // Get banner details
    const banner = await this.getBannerById(bannerId);
    if (!banner || !banner.is_active) {
      throw new Error('Banner not available');
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has enough resources
    const costType = banner.cost_gems > 0 ? 'Gems' : 'Gold';
    const costAmount = banner.cost_gems > 0 ? banner.cost_gems : banner.cost_gold;

    if (costType === 'Gems' && user.gems < costAmount) {
      throw new Error('Insufficient gems');
    }
    if (costType === 'Gold' && user.gold < costAmount) {
      throw new Error('Insufficient gold');
    }

    // Check pity system (every 90 pulls guarantees Legendary)
    const pityThreshold = parseInt(process.env.PITY_THRESHOLD) || 90;
    const newPityCounter = user.pity_counter + 1;
    const isPity = newPityCounter >= pityThreshold;

    // Get random character
    const character = await Character.getRandomCharacter(banner.type, isPity);

    // Add character to user's inventory
    const playerCharacter = await PlayerCharacter.addCharacter(userId, character.id);

    // Deduct resources
    const resources = costType === 'Gems' ? { gems: costAmount } : { gold: costAmount };
    await User.deductResources(userId, resources);

    // Update pity counter (reset if pity triggered)
    await User.updatePityCounter(userId, isPity ? 0 : newPityCounter);

    // Create history record
    await this.createHistory({
      userId,
      bannerId,
      pullType: 'Single',
      costType,
      costAmount,
      charactersObtained: [character.id],
      wasPityTriggered: isPity
    });

    // Get updated user data
    const updatedUser = await User.getProfile(userId);

    return {
      success: true,
      character,
      playerCharacter,
      isPity,
      pityCounter: isPity ? 0 : newPityCounter,
      costType,
      costAmount,
      user: updatedUser
    };
  }

  /**
   * Perform a 10x pull
   * @param {number} userId - User ID
   * @param {number} bannerId - Banner ID
   * @returns {Promise<Object>} Pull result
   */
  async performMultiPull(userId, bannerId) {
    const User = require('./User');
    const Character = require('./Character');
    const PlayerCharacter = require('./PlayerCharacter');

    // Get banner details
    const banner = await this.getBannerById(bannerId);
    if (!banner || !banner.is_active) {
      throw new Error('Banner not available');
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user has enough resources
    const costType = banner.multi_pull_gems > 0 ? 'Gems' : 'Gold';
    const costAmount = banner.multi_pull_gems > 0 ? banner.multi_pull_gems : banner.multi_pull_gold;

    if (costType === 'Gems' && user.gems < costAmount) {
      throw new Error('Insufficient gems');
    }
    if (costType === 'Gold' && user.gold < costAmount) {
      throw new Error('Insufficient gold');
    }

    // Check pity system
    const pityThreshold = parseInt(process.env.PITY_THRESHOLD) || 90;
    let newPityCounter = user.pity_counter + 10;
    let isPity = false;

    // If pity will be triggered during this 10x pull
    if (user.pity_counter + 10 >= pityThreshold) {
      isPity = true;
      newPityCounter = (user.pity_counter + 10) - pityThreshold;
    }

    // Get 10 random characters (guarantee Epic+ for Premium)
    const guaranteeEpic = banner.type === 'Premium';
    const characters = await Character.getMultipleRandomCharacters(10, banner.type, guaranteeEpic, isPity);

    // Add all characters to inventory
    const templateIds = characters.map(char => char.id);
    const playerCharacters = await PlayerCharacter.addMultipleCharacters(userId, templateIds);

    // Deduct resources
    const resources = costType === 'Gems' ? { gems: costAmount } : { gold: costAmount };
    await User.deductResources(userId, resources);

    // Update pity counter
    await User.updatePityCounter(userId, newPityCounter);

    // Create history record
    await this.createHistory({
      userId,
      bannerId,
      pullType: '10x',
      costType,
      costAmount,
      charactersObtained: templateIds,
      wasPityTriggered: isPity
    });

    // Get updated user data
    const updatedUser = await User.getProfile(userId);

    return {
      success: true,
      characters,
      playerCharacters,
      isPity,
      pityCounter: newPityCounter,
      costType,
      costAmount,
      user: updatedUser
    };
  }
}

// Gacha History Model (for history table)
class GachaHistory extends BaseModel {
  constructor() {
    super('gacha_history');
  }
}

module.exports = new Gacha();
module.exports.GachaHistory = new GachaHistory();
