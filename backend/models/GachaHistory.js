/**
 * GachaHistory Model
 * Handles gacha pull history records
 */

const BaseModel = require('./BaseModel');

class GachaHistory extends BaseModel {
  constructor() {
    super('gacha_history');
  }

  /**
   * Get user's gacha history
   * @param {number} userId - User ID
   * @param {Object} options - Query options (limit, offset)
   * @returns {Promise<Array>} Array of pull history
   */
  async getUserHistory(userId, options = {}) {
    const { limit = 20, offset = 0 } = options;

    const sql = `
      SELECT
        gh.*,
        gb.name as banner_name,
        gb.type as banner_type
      FROM ${this.table} gh
      LEFT JOIN gacha_banners gb ON gh.banner_id = gb.id
      WHERE gh.user_id = ?
      ORDER BY gh.pulled_at DESC
      LIMIT ? OFFSET ?
    `;

    return await this.executeQuery(sql, [userId, limit, offset]);
  }

  /**
   * Get user's pull statistics
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
        SUM(CASE WHEN was_pity_triggered = TRUE THEN 1 ELSE 0 END) as pity_triggers
      FROM ${this.table}
      WHERE user_id = ?
    `;

    const result = await this.executeQuery(sql, [userId]);
    return result[0] || {
      total_pulls: 0,
      single_pulls: 0,
      multi_pulls: 0,
      total_gems_spent: 0,
      total_gold_spent: 0,
      pity_triggers: 0
    };
  }

  /**
   * Get total pull count for user
   * @param {number} userId - User ID
   * @returns {Promise<number>} Total pull count
   */
  async getTotalPullCount(userId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM ${this.table}
      WHERE user_id = ?
    `;

    const result = await this.executeQuery(sql, [userId]);
    return result[0]?.count || 0;
  }
}

module.exports = new GachaHistory();
