/**
 * Inventory Routes
 * /api/inventory
 */

const express = require('express');
const router = express.Router();
const InventoryController = require('../controllers/InventoryController');
const { authenticateToken } = require('../middleware/auth');
const {
  characterLockValidation,
  characterFavoriteValidation
} = require('../middleware/validation');

// All inventory routes require authentication
router.use(authenticateToken);

// Inventory management
router.get('/', InventoryController.getInventory);
router.get('/stats', InventoryController.getStats);
router.get('/filter', InventoryController.filterInventory);
router.get('/:id', InventoryController.getCharacter);

// Character actions
router.put('/:id/lock', characterLockValidation, InventoryController.toggleLock);
router.put('/:id/favorite', characterFavoriteValidation, InventoryController.toggleFavorite);
router.put('/:id/upgrade', InventoryController.upgradeCharacter);
router.delete('/:id', InventoryController.deleteCharacter);

module.exports = router;
