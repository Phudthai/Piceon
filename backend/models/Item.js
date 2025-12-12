/**
 * Item Model
 * Handles items master data
 */

const BaseModel = require('./BaseModel');

class Item extends BaseModel {
  constructor() {
    super('items');
  }

  /**
   * Get all items by type
   */
  async getItemsByType(itemType) {
    const sql = `SELECT * FROM ${this.table} WHERE item_type = ? ORDER BY rarity, name`;
    return await this.executeQuery(sql, [itemType]);
  }

  /**
   * Get items by category
   */
  async getItemsByCategory(category) {
    const sql = `SELECT * FROM ${this.table} WHERE category = ? ORDER BY rarity, name`;
    return await this.executeQuery(sql, [category]);
  }

  /**
   * Get equipment items with templates
   */
  async getEquipmentItems() {
    const sql = `
      SELECT
        i.*,
        et.equipment_type,
        et.primary_stat,
        et.base_value,
        et.growth_rate,
        et.max_level,
        et.max_stars
      FROM ${this.table} i
      JOIN equipment_templates et ON i.id = et.item_id
      WHERE i.item_type = 'equipment'
      ORDER BY et.equipment_type, i.rarity
    `;
    return await this.executeQuery(sql);
  }

  /**
   * Get item with equipment template
   */
  async getItemWithTemplate(itemId) {
    const sql = `
      SELECT
        i.*,
        et.id as template_id,
        et.equipment_type,
        et.primary_stat,
        et.base_value,
        et.growth_rate,
        et.max_level,
        et.max_stars
      FROM ${this.table} i
      LEFT JOIN equipment_templates et ON i.id = et.item_id
      WHERE i.id = ?
    `;
    const results = await this.executeQuery(sql, [itemId]);
    return results[0] || null;
  }

  /**
   * Get materials only
   */
  async getMaterials() {
    const sql = `SELECT * FROM ${this.table} WHERE item_type = 'material' ORDER BY category, rarity`;
    return await this.executeQuery(sql);
  }

  /**
   * Get consumables only
   */
  async getConsumables() {
    const sql = `SELECT * FROM ${this.table} WHERE item_type = 'consumable' ORDER BY rarity, name`;
    return await this.executeQuery(sql);
  }
}

module.exports = new Item();
