/**
 * Team Model
 * Handles player team management
 */

const BaseModel = require('./BaseModel');
const PlayerCharacter = require('./PlayerCharacter');

class Team extends BaseModel {
  constructor() {
    super('player_teams');
  }

  /**
   * Get user's teams
   * @param {number} userId - User ID
   * @returns {Promise<Array>} Array of teams
   */
  async getUserTeams(userId) {
    const sql = `SELECT * FROM ${this.table} WHERE user_id = ? ORDER BY is_active DESC, created_at DESC`;
    return await this.executeQuery(sql, [userId]);
  }

  /**
   * Get active team for user
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Active team
   */
  async getActiveTeam(userId) {
    const sql = `SELECT * FROM ${this.table} WHERE user_id = ? AND is_active = TRUE LIMIT 1`;
    const results = await this.executeQuery(sql, [userId]);
    return results[0] || null;
  }

  /**
   * Get team with character details
   * @param {number} teamId - Team ID
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} Team with character data
   */
  async getTeamWithCharacters(teamId, userId) {
    const team = await this.findOne({ id: teamId, user_id: userId });
    if (!team) return null;

    // Get character details for each slot
    const characters = [];
    for (let i = 1; i <= 5; i++) {
      const charId = team[`slot_${i}`];
      if (charId) {
        const char = await PlayerCharacter.getPlayerCharacter(charId, userId);
        characters.push({ slot: i, character: char });
      }
    }

    return {
      ...team,
      characters
    };
  }

  /**
   * Create new team
   * @param {number} userId - User ID
   * @param {Object} teamData - Team data
   * @returns {Promise<Object>} Created team
   */
  async createTeam(userId, teamData) {
    const { name = 'Team 1', slots = {} } = teamData;

    const data = {
      user_id: userId,
      name,
      slot_1: slots.slot_1 || null,
      slot_2: slots.slot_2 || null,
      slot_3: slots.slot_3 || null,
      slot_4: slots.slot_4 || null,
      slot_5: slots.slot_5 || null,
      is_active: false
    };

    return await this.create(data);
  }

  /**
   * Update team
   * @param {number} teamId - Team ID
   * @param {number} userId - User ID
   * @param {Object} updates - Team updates
   * @returns {Promise<boolean>} Success status
   */
  async updateTeam(teamId, userId, updates) {
    // Verify ownership
    const team = await this.findOne({ id: teamId, user_id: userId });
    if (!team) return false;

    const data = {};
    if (updates.name) data.name = updates.name;
    if (updates.slots) {
      data.slot_1 = updates.slots.slot_1 !== undefined ? updates.slots.slot_1 : team.slot_1;
      data.slot_2 = updates.slots.slot_2 !== undefined ? updates.slots.slot_2 : team.slot_2;
      data.slot_3 = updates.slots.slot_3 !== undefined ? updates.slots.slot_3 : team.slot_3;
      data.slot_4 = updates.slots.slot_4 !== undefined ? updates.slots.slot_4 : team.slot_4;
      data.slot_5 = updates.slots.slot_5 !== undefined ? updates.slots.slot_5 : team.slot_5;
    }

    return await this.update(teamId, data);
  }

  /**
   * Set active team
   * @param {number} teamId - Team ID
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async setActiveTeam(teamId, userId) {
    // Deactivate all teams for user
    await this.executeQuery(`UPDATE ${this.table} SET is_active = FALSE WHERE user_id = ?`, [userId]);

    // Activate specified team
    const sql = `UPDATE ${this.table} SET is_active = TRUE WHERE id = ? AND user_id = ?`;
    const result = await this.executeQuery(sql, [teamId, userId]);

    return result.affectedRows > 0;
  }

  /**
   * Delete team
   * @param {number} teamId - Team ID
   * @param {number} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteTeam(teamId, userId) {
    const sql = `DELETE FROM ${this.table} WHERE id = ? AND user_id = ?`;
    const result = await this.executeQuery(sql, [teamId, userId]);
    return result.affectedRows > 0;
  }

  /**
   * Calculate team power
   * @param {number} teamId - Team ID
   * @param {number} userId - User ID
   * @returns {Promise<number>} Total team power
   */
  async calculateTeamPower(teamId, userId) {
    const team = await this.getTeamWithCharacters(teamId, userId);
    if (!team) return 0;

    let totalPower = 0;
    for (const slot of team.characters) {
      if (slot.character) {
        const char = slot.character;
        // Calculate total stats including equipment
        const totalStats = await PlayerCharacter.calculateTotalStats(char);
        // Power = ATK + DEF + (HP / 10)
        totalPower += totalStats.atk + totalStats.def + Math.floor(totalStats.hp / 10);
      }
    }

    return totalPower;
  }

  /**
   * Validate team composition
   * @param {Object} slots - Team slots
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Validation result
   */
  async validateTeam(slots, userId) {
    const characterIds = Object.values(slots).filter(id => id !== null && id !== undefined);

    // Check for duplicates
    const uniqueIds = [...new Set(characterIds)];
    if (uniqueIds.length !== characterIds.length) {
      return { valid: false, error: 'Cannot use the same character multiple times' };
    }

    // Verify ownership of all characters
    for (const charId of characterIds) {
      const char = await PlayerCharacter.getPlayerCharacter(charId, userId);
      if (!char) {
        return { valid: false, error: `Character ${charId} not found in your inventory` };
      }
    }

    return { valid: true };
  }
}

module.exports = new Team();
