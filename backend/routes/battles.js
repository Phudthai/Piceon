/**
 * Battle Routes
 * /api/battles
 */

const express = require('express');
const router = express.Router();
const BattleController = require('../controllers/BattleController');
const { authenticateToken } = require('../middleware/auth');

// All battle routes require authentication
router.use(authenticateToken);

// Stages
router.get('/stages', BattleController.getStages);
router.get('/stages/:id', BattleController.getStageById);

// Battles
router.post('/start', BattleController.startBattle);
router.get('/history', BattleController.getBattleHistory);
router.get('/progress', BattleController.getProgress);

module.exports = router;
