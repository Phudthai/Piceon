/**
 * User Model
 * Handles user accounts and authentication
 */

const BaseModel = require('./BaseModel');
const bcrypt = require('bcrypt');

class User extends BaseModel {
  constructor() {
    super('users');
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} User object or null
   */
  async findByEmail(email) {
    return await this.findOne({ email });
  }

  /**
   * Find user by username
   * @param {string} username - Username
   * @returns {Promise<Object|null>} User object or null
   */
  async findByUsername(username) {
    return await this.findOne({ username });
  }

  /**
   * Create a new user with hashed password
   * @param {Object} userData - User data (username, email, password)
   * @returns {Promise<Object>} Created user (without password)
   */
  async createUser(userData) {
    const { username, email, password } = userData;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with default resources
    const user = await this.create({
      username,
      email,
      password: hashedPassword,
      gems: process.env.STARTING_GEMS || 300,
      gold: process.env.STARTING_GOLD || 10000,
      inventory_slots: process.env.STARTING_INVENTORY_SLOTS || 50,
      pity_counter: 0
    });

    // Remove password from returned object
    delete user.password;
    return user;
  }

  /**
   * Verify password
   * @param {string} plainPassword - Plain text password
   * @param {string} hashedPassword - Hashed password from database
   * @returns {Promise<boolean>} Match result
   */
  async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * Get user profile (without password)
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} User profile
   */
  async getProfile(userId) {
    const sql = `
      SELECT id, username, email, gems, gold, inventory_slots, pity_counter, created_at, updated_at
      FROM ${this.table}
      WHERE id = ?
    `;
    const results = await this.executeQuery(sql, [userId]);
    return results[0] || null;
  }

  /**
   * Update user resources
   * @param {number} userId - User ID
   * @param {Object} resources - Resources to update (gems, gold)
   * @returns {Promise<boolean>} Success status
   */
  async updateResources(userId, resources) {
    const { gems, gold } = resources;
    const updates = {};

    if (gems !== undefined) updates.gems = gems;
    if (gold !== undefined) updates.gold = gold;

    return await this.update(userId, updates);
  }

  /**
   * Add resources to user
   * @param {number} userId - User ID
   * @param {Object} resources - Resources to add
   * @returns {Promise<boolean>} Success status
   */
  async addResources(userId, resources) {
    const { gems = 0, gold = 0 } = resources;

    const sql = `
      UPDATE ${this.table}
      SET gems = gems + ?, gold = gold + ?
      WHERE id = ?
    `;

    const result = await this.executeQuery(sql, [gems, gold, userId]);
    return result.affectedRows > 0;
  }

  /**
   * Deduct resources from user
   * @param {number} userId - User ID
   * @param {Object} resources - Resources to deduct
   * @returns {Promise<boolean>} Success status
   */
  async deductResources(userId, resources) {
    const { gems = 0, gold = 0 } = resources;

    // Check if user has enough resources
    const user = await this.findById(userId);
    if (!user) return false;

    if (user.gems < gems || user.gold < gold) {
      throw new Error('Insufficient resources');
    }

    const sql = `
      UPDATE ${this.table}
      SET gems = gems - ?, gold = gold - ?
      WHERE id = ?
    `;

    const result = await this.executeQuery(sql, [gems, gold, userId]);
    return result.affectedRows > 0;
  }

  /**
   * Update pity counter
   * @param {number} userId - User ID
   * @param {number} count - New pity count
   * @returns {Promise<boolean>} Success status
   */
  async updatePityCounter(userId, count) {
    return await this.update(userId, { pity_counter: count });
  }

  /**
   * Get user with character count
   * @param {number} userId - User ID
   * @returns {Promise<Object|null>} User with character count
   */
  async getUserWithStats(userId) {
    const sql = `
      SELECT
        u.id, u.username, u.email, u.gems, u.gold,
        u.inventory_slots, u.pity_counter,
        COUNT(pc.id) as character_count
      FROM ${this.table} u
      LEFT JOIN player_characters pc ON u.id = pc.user_id
      WHERE u.id = ?
      GROUP BY u.id
    `;

    const results = await this.executeQuery(sql, [userId]);
    return results[0] || null;
  }
}

module.exports = new User();
