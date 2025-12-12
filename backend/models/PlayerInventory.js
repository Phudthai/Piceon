/**
 * Player Inventory Model
 * Handles stackable items (materials, consumables, special items)
 */

const BaseModel = require('./BaseModel');

class PlayerInventory extends BaseModel {
  constructor() {
    super('player_inventory');
  }

  /**
   * Get user's inventory with item details
   */
  async getUserInventory(userId) {
    const sql = `
      SELECT
        pi.*,
        i.name,
        i.item_type,
        i.category,
        i.rarity,
        i.description,
        i.icon,
        i.max_stack,
        i.sell_price
      FROM ${this.table} pi
      JOIN items i ON pi.item_id = i.id
      WHERE pi.user_id = ?
      ORDER BY i.item_type, i.category, i.rarity DESC
    `;
    return await this.executeQuery(sql, [userId]);
  }

  /**
   * Get user's items by type
   */
  async getUserItemsByType(userId, itemType) {
    const sql = `
      SELECT
        pi.*,
        i.name,
        i.item_type,
        i.category,
        i.rarity,
        i.description,
        i.icon
      FROM ${this.table} pi
      JOIN items i ON pi.item_id = i.id
      WHERE pi.user_id = ? AND i.item_type = ?
      ORDER BY i.rarity DESC, i.name
    `;
    return await this.executeQuery(sql, [userId, itemType]);
  }

  /**
   * Add item to inventory (or increase quantity)
   */
  async addItem(userId, itemId, quantity = 1) {
    const sql = `
      INSERT INTO ${this.table} (user_id, item_id, quantity)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        quantity = quantity + VALUES(quantity),
        updated_at = CURRENT_TIMESTAMP
    `;
    return await this.executeQuery(sql, [userId, itemId, quantity]);
  }

  /**
   * Remove item from inventory (or decrease quantity)
   */
  async removeItem(userId, itemId, quantity = 1) {
    // Get current quantity
    const current = await this.findOne({ user_id: userId, item_id: itemId });

    if (!current) {
      throw new Error('Item not found in inventory');
    }

    if (current.quantity < quantity) {
      throw new Error('Insufficient quantity');
    }

    if (current.quantity === quantity) {
      // Delete the record
      const deleteSql = `DELETE FROM ${this.table} WHERE user_id = ? AND item_id = ?`;
      return await this.executeQuery(deleteSql, [userId, itemId]);
    } else {
      // Decrease quantity
      const updateSql = `
        UPDATE ${this.table}
        SET quantity = quantity - ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND item_id = ?
      `;
      return await this.executeQuery(updateSql, [quantity, userId, itemId]);
    }
  }

  /**
   * Check if user has enough items
   */
  async hasItem(userId, itemId, quantity = 1) {
    const item = await this.findOne({ user_id: userId, item_id: itemId });
    return item && item.quantity >= quantity;
  }

  /**
   * Get item quantity
   */
  async getItemQuantity(userId, itemId) {
    const item = await this.findOne({ user_id: userId, item_id: itemId });
    return item ? item.quantity : 0;
  }

  /**
   * Use consumable item
   */
  async useConsumable(userId, itemId, quantity = 1) {
    // Verify item is consumable
    const checkSql = `
      SELECT i.item_type FROM items i
      WHERE i.id = ? AND i.item_type = 'consumable'
    `;
    const item = await this.executeQuery(checkSql, [itemId]);

    if (!item || item.length === 0) {
      throw new Error('Item is not consumable');
    }

    // Remove from inventory
    return await this.removeItem(userId, itemId, quantity);
  }
}

module.exports = new PlayerInventory();
