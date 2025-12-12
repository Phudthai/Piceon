/**
 * Equipment Routes
 * Routes for managing player equipment instances
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const EquipmentController = require('../controllers/EquipmentController');

// All routes require authentication
router.use(authenticateToken);

// Equipment management
router.get('/', EquipmentController.getUserEquipment);
router.get('/:id', EquipmentController.getEquipmentById);
router.post('/create', EquipmentController.createEquipment);

// Equipment upgrades
router.put('/:id/upgrade', EquipmentController.upgradeLevel);
router.put('/:id/star', EquipmentController.upgradeStar);

// Equipment actions
router.put('/:id/equip', EquipmentController.toggleEquip);
router.put('/:id/lock', EquipmentController.toggleLock);

// Equipment deletion (sell)
router.delete('/:id', EquipmentController.sellEquipment);

module.exports = router;
