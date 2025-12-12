/**
 * Item Inventory Controller
 * Manages player inventory (stackable items: materials, consumables, special)
 */

const BaseController = require('./BaseController');
const PlayerInventory = require('../models/PlayerInventory');
const Item = require('../models/Item');

class ItemInventoryController extends BaseController {
  /**
   * Get user's item inventory
   * GET /api/items/inventory
   */
  getInventory = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { type } = req.query;

    const inventory = await PlayerInventory.getUserInventory(userId, type);

    return this.success(res, inventory, `Retrieved ${inventory.length} items`);
  });

  /**
   * Get inventory by item type
   * GET /api/items/inventory/type/:type
   */
  getInventoryByType = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { type } = req.params;

    const validTypes = ['material', 'consumable', 'special'];
    if (!validTypes.includes(type)) {
      return this.error(res, 'Invalid item type', 400);
    }

    const inventory = await PlayerInventory.getUserInventory(userId, type);

    return this.success(res, inventory, `Retrieved ${inventory.length} ${type}s`);
  });

  /**
   * Get item details by ID
   * GET /api/items/inventory/:itemId
   */
  getItemDetails = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { itemId } = req.params;

    const inventoryItem = await PlayerInventory.getInventoryItem(userId, parseInt(itemId));

    if (!inventoryItem) {
      return this.notFound(res, 'Item not found in inventory');
    }

    return this.success(res, inventoryItem, 'Item details retrieved');
  });

  /**
   * Add item to inventory (admin/reward system use)
   * POST /api/items/inventory/add
   */
  addItem = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { item_id, quantity = 1 } = req.body;

    if (!item_id || quantity < 1) {
      return this.validationError(res, [{ msg: 'Invalid item_id or quantity' }]);
    }

    // Verify item exists and is stackable
    const item = await Item.findById(item_id);
    if (!item) {
      return this.notFound(res, 'Item not found');
    }

    if (item.item_type === 'equipment') {
      return this.error(res, 'Equipment cannot be added through inventory. Use equipment endpoints.', 400);
    }

    await PlayerInventory.addItem(userId, item_id, quantity);
    const updatedItem = await PlayerInventory.getInventoryItem(userId, item_id);

    return this.success(res, updatedItem, `Added ${quantity}x ${item.name}`, 201);
  });

  /**
   * Remove item from inventory
   * POST /api/items/inventory/remove
   */
  removeItem = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { item_id, quantity = 1 } = req.body;

    if (!item_id || quantity < 1) {
      return this.validationError(res, [{ msg: 'Invalid item_id or quantity' }]);
    }

    try {
      await PlayerInventory.removeItem(userId, item_id, quantity);

      return this.success(res, { item_id, quantity }, `Removed ${quantity} item(s)`);
    } catch (error) {
      return this.error(res, error.message, 400);
    }
  });

  /**
   * Use consumable item
   * POST /api/items/inventory/use
   */
  useItem = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { item_id, quantity = 1, target_id } = req.body;

    if (!item_id || quantity < 1) {
      return this.validationError(res, [{ msg: 'Invalid item_id or quantity' }]);
    }

    // Get item details
    const inventoryItem = await PlayerInventory.getInventoryItem(userId, item_id);
    if (!inventoryItem) {
      return this.notFound(res, 'Item not found in inventory');
    }

    if (inventoryItem.item_type !== 'consumable' && inventoryItem.item_type !== 'special') {
      return this.error(res, 'This item cannot be used directly', 400);
    }

    if (inventoryItem.quantity < quantity) {
      return this.error(res, 'Insufficient quantity', 400);
    }

    try {
      const result = await PlayerInventory.useItem(userId, item_id, quantity, target_id);

      return this.success(res, result, `Used ${quantity}x ${inventoryItem.name}`);
    } catch (error) {
      return this.error(res, error.message, 400);
    }
  });

  /**
   * Get all available items (catalog)
   * GET /api/items/catalog
   */
  getCatalog = this.asyncHandler(async (req, res) => {
    const { type, category } = req.query;

    let items;
    if (type) {
      items = await Item.getItemsByType(type);
    } else if (category) {
      items = await Item.getItemsByCategory(category);
    } else {
      items = await Item.findAll();
    }

    return this.success(res, items, `Retrieved ${items.length} items from catalog`);
  });
}

module.exports = new ItemInventoryController();
