/**
 * Base Model Class
 * Provides common database operations for all models
 */

const { executeQuery } = require('../config/database');

class BaseModel {
  constructor(tableName) {
    this.table = tableName;
  }

  /**
   * Find all records with optional conditions
   * @param {Object} options - Query options (where, limit, offset, orderBy)
   * @returns {Promise<Array>} Array of records
   */
  async findAll(options = {}) {
    const { where = {}, limit, offset, orderBy = 'id DESC' } = options;

    let sql = `SELECT * FROM ${this.table}`;
    const params = [];

    // WHERE clause
    if (Object.keys(where).length > 0) {
      const conditions = Object.keys(where).map(key => `${key} = ?`);
      sql += ` WHERE ${conditions.join(' AND ')}`;
      params.push(...Object.values(where));
    }

    // ORDER BY
    if (orderBy) {
      sql += ` ORDER BY ${orderBy}`;
    }

    // LIMIT and OFFSET
    if (limit) {
      sql += ` LIMIT ?`;
      params.push(limit);

      if (offset) {
        sql += ` OFFSET ?`;
        params.push(offset);
      }
    }

    return await executeQuery(sql, params);
  }

  /**
   * Find a single record by ID
   * @param {number} id - Record ID
   * @returns {Promise<Object|null>} Single record or null
   */
  async findById(id) {
    const sql = `SELECT * FROM ${this.table} WHERE id = ? LIMIT 1`;
    const results = await executeQuery(sql, [id]);
    return results[0] || null;
  }

  /**
   * Find a single record by conditions
   * @param {Object} where - Conditions object
   * @returns {Promise<Object|null>} Single record or null
   */
  async findOne(where = {}) {
    const conditions = Object.keys(where).map(key => `${key} = ?`);
    const sql = `SELECT * FROM ${this.table} WHERE ${conditions.join(' AND ')} LIMIT 1`;
    const results = await executeQuery(sql, Object.values(where));
    return results[0] || null;
  }

  /**
   * Create a new record
   * @param {Object} data - Record data
   * @returns {Promise<Object>} Created record with ID
   */
  async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');

    const sql = `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders})`;
    const result = await executeQuery(sql, values);

    return {
      id: result.insertId,
      ...data
    };
  }

  /**
   * Update a record by ID
   * @param {number} id - Record ID
   * @param {Object} data - Data to update
   * @returns {Promise<boolean>} Success status
   */
  async update(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(key => `${key} = ?`).join(', ');

    const sql = `UPDATE ${this.table} SET ${setClause} WHERE id = ?`;
    const result = await executeQuery(sql, [...values, id]);

    return result.affectedRows > 0;
  }

  /**
   * Delete a record by ID
   * @param {number} id - Record ID
   * @returns {Promise<boolean>} Success status
   */
  async delete(id) {
    const sql = `DELETE FROM ${this.table} WHERE id = ?`;
    const result = await executeQuery(sql, [id]);
    return result.affectedRows > 0;
  }

  /**
   * Count records with optional conditions
   * @param {Object} where - Conditions object
   * @returns {Promise<number>} Count
   */
  async count(where = {}) {
    let sql = `SELECT COUNT(*) as count FROM ${this.table}`;
    const params = [];

    if (Object.keys(where).length > 0) {
      const conditions = Object.keys(where).map(key => `${key} = ?`);
      sql += ` WHERE ${conditions.join(' AND ')}`;
      params.push(...Object.values(where));
    }

    const result = await executeQuery(sql, params);
    return result[0].count;
  }

  /**
   * Execute a custom SQL query
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise} Query result
   */
  async executeQuery(sql, params = []) {
    return await executeQuery(sql, params);
  }
}

module.exports = BaseModel;
