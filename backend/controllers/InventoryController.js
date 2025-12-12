/**
 * Inventory Controller
 * Handles player character inventory management
 */

const BaseController = require('./BaseController');
const PlayerCharacter = require('../models/PlayerCharacter');
const User = require('../models/User');

class InventoryController extends BaseController {
  /**
   * Get user's inventory
   * GET /api/inventory
   */
  getInventory = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { rarity, type, locked, favorite, sort = 'obtained_at', order = 'DESC' } = req.query;

    // Build filter object
    const filters = {};
    if (rarity) filters.rarity = rarity;
    if (type) filters.type = type;
    if (locked !== undefined) filters.locked = locked === 'true';
    if (favorite !== undefined) filters.favorite = favorite === 'true';

    let characters;
    if (Object.keys(filters).length > 0) {
      characters = await PlayerCharacter.filterCharacters(userId, filters);
    } else {
      const orderBy = `pc.${sort} ${order}`;
      characters = await PlayerCharacter.getUserCharacters(userId, { orderBy });
    }

    // Get inventory stats
    const stats = await PlayerCharacter.getInventoryStats(userId);

    return this.success(
      res,
      {
        characters,
        stats
      },
      `Retrieved ${characters.length} characters`
    );
  });

  /**
   * Get a specific character
   * GET /api/inventory/:id
   */
  getCharacter = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const character = await PlayerCharacter.getPlayerCharacter(id, userId);

    if (!character) {
      return this.notFound(res, 'Character not found in your inventory');
    }

    return this.success(res, character, 'Character retrieved');
  });

  /**
   * Lock/unlock a character
   * PUT /api/inventory/:id/lock
   */
  toggleLock = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { locked } = req.body;

    // Verify ownership
    const character = await PlayerCharacter.getPlayerCharacter(id, userId);
    if (!character) {
      return this.notFound(res, 'Character not found in your inventory');
    }

    // Toggle lock
    const success = await PlayerCharacter.toggleLock(id, userId, locked);

    if (!success) {
      return this.error(res, 'Failed to update lock status');
    }

    return this.success(
      res,
      { id, locked },
      locked ? 'Character locked' : 'Character unlocked'
    );
  });

  /**
   * Toggle favorite status
   * PUT /api/inventory/:id/favorite
   */
  toggleFavorite = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { favorite } = req.body;

    // Verify ownership
    const character = await PlayerCharacter.getPlayerCharacter(id, userId);
    if (!character) {
      return this.notFound(res, 'Character not found in your inventory');
    }

    // Toggle favorite
    const success = await PlayerCharacter.toggleFavorite(id, userId, favorite);

    if (!success) {
      return this.error(res, 'Failed to update favorite status');
    }

    return this.success(
      res,
      { id, favorite },
      favorite ? 'Added to favorites' : 'Removed from favorites'
    );
  });

  /**
   * Sell/delete a character
   * DELETE /api/inventory/:id
   */
  deleteCharacter = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
      // Delete character and get rewards
      const result = await PlayerCharacter.deleteCharacter(id, userId);

      // Add gold reward to user
      await User.addResources(userId, { gold: result.goldReward });

      return this.success(
        res,
        {
          character: result.character,
          goldReward: result.goldReward
        },
        `Character sold for ${result.goldReward} gold`
      );
    } catch (error) {
      if (error.message === 'Character not found') {
        return this.notFound(res, error.message);
      }
      if (error.message === 'Cannot delete locked character') {
        return this.error(res, error.message, 400);
      }
      throw error;
    }
  });

  /**
   * Upgrade a character
   * PUT /api/inventory/:id/upgrade
   */
  upgradeCharacter = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
      // Get current character
      const currentChar = await PlayerCharacter.getPlayerCharacter(id, userId);
      if (!currentChar) {
        return this.notFound(res, 'Character not found in your inventory');
      }

      // Calculate upgrade cost based on level
      const upgradeCost = Math.floor(100 * Math.pow(1.5, currentChar.level));

      // Check if user has enough gold
      const user = await User.findById(userId);
      if (user.gold < upgradeCost) {
        return this.error(res, `Insufficient gold. Need ${upgradeCost} gold`, 400);
      }

      // Perform upgrade
      const upgradedChar = await PlayerCharacter.upgradeCharacter(id, userId);

      // Deduct gold
      await User.deductResources(userId, { gold: upgradeCost });

      return this.success(
        res,
        {
          character: upgradedChar,
          cost: upgradeCost
        },
        `Character upgraded to level ${upgradedChar.level}`
      );
    } catch (error) {
      if (error.message === 'Character not found') {
        return this.notFound(res, error.message);
      }
      throw error;
    }
  });

  /**
   * Get inventory statistics
   * GET /api/inventory/stats
   */
  getStats = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const stats = await PlayerCharacter.getInventoryStats(userId);

    return this.success(res, stats, 'Inventory statistics retrieved');
  });

  /**
   * Filter inventory
   * GET /api/inventory/filter
   */
  filterInventory = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { rarity, type, locked, favorite } = req.query;

    const filters = {};
    if (rarity) filters.rarity = rarity;
    if (type) filters.type = type;
    if (locked !== undefined) filters.locked = locked === 'true';
    if (favorite !== undefined) filters.favorite = favorite === 'true';

    const characters = await PlayerCharacter.filterCharacters(userId, filters);

    return this.success(
      res,
      characters,
      `Found ${characters.length} matching characters`
    );
  });
}

module.exports = new InventoryController();
