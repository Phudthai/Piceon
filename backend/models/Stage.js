/**
 * Stage Model
 * Handles battle stages
 */

const BaseModel = require('./BaseModel');

class Stage extends BaseModel {
  constructor() {
    super('battle_stages');
  }

  /**
   * Get all active stages
   * @returns {Promise<Array>} Array of stages
   */
  async getAllStages() {
    const sql = `SELECT * FROM ${this.table} WHERE is_active = TRUE ORDER BY stage_number ASC`;
    return await this.executeQuery(sql);
  }

  /**
   * Get stage by ID
   * @param {number} stageId - Stage ID
   * @returns {Promise<Object|null>} Stage data
   */
  async getStageById(stageId) {
    return await this.findById(stageId);
  }

  /**
   * Get stage by stage number
   * @param {number} stageNumber - Stage number
   * @returns {Promise<Object|null>} Stage data
   */
  async getStageByNumber(stageNumber) {
    return await this.findOne({ stage_number: stageNumber, is_active: true });
  }

  /**
   * Get available stages for user (based on progress)
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of available stages
   */
  async getAvailableStages(userId) {
    const sql = `
      SELECT
        s.*,
        pp.times_completed,
        pp.best_turns,
        CASE
          WHEN s.required_stage IS NULL THEN TRUE
          WHEN EXISTS (
            SELECT 1 FROM player_progress
            WHERE user_id = ? AND stage_id = s.required_stage AND times_completed > 0
          ) THEN TRUE
          ELSE FALSE
        END as is_unlocked
      FROM ${this.table} s
      LEFT JOIN player_progress pp ON s.id = pp.stage_id AND pp.user_id = ?
      WHERE s.is_active = TRUE
      ORDER BY s.stage_number ASC
    `;

    return await this.executeQuery(sql, [userId, userId]);
  }

  /**
   * Check if stage is unlocked for user
   * @param {number} stageId - Stage ID
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Is unlocked
   */
  async isStageUnlocked(stageId, userId) {
    const stage = await this.findById(stageId);
    if (!stage) return false;

    // First stage is always unlocked
    if (!stage.required_stage) return true;

    // Check if required stage is completed
    const sql = `
      SELECT COUNT(*) as count
      FROM player_progress
      WHERE user_id = ? AND stage_id = ? AND times_completed > 0
    `;

    const result = await this.executeQuery(sql, [userId, stage.required_stage]);
    return result[0].count > 0;
  }
}

module.exports = new Stage();
