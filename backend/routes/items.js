/**
 * Item Inventory Routes
 * Routes for managing player item inventory (materials, consumables, special items)
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const ItemInventoryController = require('../controllers/ItemInventoryController');

// Catalog (public)
router.get('/catalog', ItemInventoryController.getCatalog);

// All other routes require authentication
router.use(authenticateToken);

// Inventory routes
router.get('/inventory', ItemInventoryController.getInventory);
router.get('/inventory/type/:type', ItemInventoryController.getInventoryByType);
router.get('/inventory/:itemId', ItemInventoryController.getItemDetails);

// Item management
router.post('/inventory/add', ItemInventoryController.addItem);
router.post('/inventory/remove', ItemInventoryController.removeItem);
router.post('/inventory/use', ItemInventoryController.useItem);

module.exports = router;
