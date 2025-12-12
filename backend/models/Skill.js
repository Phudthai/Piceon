/**
 * Skill Model
 * Handles skill data and character skill relationships
 */

const BaseModel = require('./BaseModel');

class Skill extends BaseModel {
  constructor() {
    super('character_skills');
  }

  /**
   * Get all skills for a character template
   * @param {number} characterTemplateId - Character template ID
   * @param {number} characterLevel - Current character level (for unlock filtering)
   * @returns {Promise<Array>} Array of skills
   */
  async getCharacterSkills(characterTemplateId, characterLevel = 1) {
    const sql = `
      SELECT
        cs.*,
        cts.skill_slot,
        cts.unlock_level,
        CASE WHEN cts.unlock_level <= ? THEN TRUE ELSE FALSE END as is_unlocked
      FROM character_template_skills cts
      JOIN character_skills cs ON cts.skill_id = cs.id
      WHERE cts.character_template_id = ?
      ORDER BY cts.skill_slot ASC
    `;

    return await this.executeQuery(sql, [characterLevel, characterTemplateId]);
  }

  /**
   * Get unlocked skills only for a character
   * @param {number} characterTemplateId - Character template ID
   * @param {number} characterLevel - Current character level
   * @returns {Promise<Array>} Array of unlocked skills
   */
  async getUnlockedSkills(characterTemplateId, characterLevel) {
    const sql = `
      SELECT
        cs.*,
        cts.skill_slot,
        cts.unlock_level
      FROM character_template_skills cts
      JOIN character_skills cs ON cts.skill_id = cs.id
      WHERE cts.character_template_id = ?
        AND cts.unlock_level <= ?
      ORDER BY cts.skill_slot ASC
    `;

    return await this.executeQuery(sql, [characterTemplateId, characterLevel]);
  }

  /**
   * Get skill by ID
   * @param {number} skillId - Skill ID
   * @returns {Promise<Object|null>} Skill data
   */
  async getSkillById(skillId) {
    return await this.findById(skillId);
  }

  /**
   * Get all skills by type
   * @param {string} type - 'active' or 'passive'
   * @returns {Promise<Array>} Array of skills
   */
  async getSkillsByType(type) {
    return await this.findAll({ skill_type: type });
  }

  /**
   * Get all skills by category
   * @param {string} category - Skill category
   * @returns {Promise<Array>} Array of skills
   */
  async getSkillsByCategory(category) {
    return await this.findAll({ category });
  }
}

module.exports = new Skill();
