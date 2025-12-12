/**
 * Gacha Routes
 * /api/gacha
 */

const express = require('express');
const router = express.Router();
const GachaController = require('../controllers/GachaController');
const { authenticateToken } = require('../middleware/auth');
const { gachaPullValidation } = require('../middleware/validation');

// Public routes
router.get('/banners', GachaController.getBanners);
router.get('/banners/:id', GachaController.getBannerById);

// Protected routes
router.post('/pull', authenticateToken, gachaPullValidation, GachaController.singlePull);
router.post('/pull-10', authenticateToken, gachaPullValidation, GachaController.multiPull);
router.get('/history', authenticateToken, GachaController.getHistory);
router.get('/stats', authenticateToken, GachaController.getStats);

module.exports = router;
