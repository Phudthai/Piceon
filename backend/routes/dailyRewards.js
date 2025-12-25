/**
 * Daily Rewards Routes
 */

const express = require('express');
const router = express.Router();
const DailyRewardController = require('../controllers/DailyRewardController');
const { authenticateToken } = require('../middleware/auth');

// All routes require authentication
router.use(authenticateToken);

// GET /api/daily-rewards/status - Get current reward status
router.get('/status', (req, res) => DailyRewardController.getStatus(req, res));

// POST /api/daily-rewards/claim - Claim today's reward
router.post('/claim', (req, res) => DailyRewardController.claim(req, res));

// GET /api/daily-rewards/rewards - Get all reward configurations
router.get('/rewards', (req, res) => DailyRewardController.getRewards(req, res));

module.exports = router;
