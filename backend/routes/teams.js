/**
 * Team Routes
 * /api/teams
 */

const express = require('express');
const router = express.Router();
const TeamController = require('../controllers/TeamController');
const { authenticateToken } = require('../middleware/auth');

// All team routes require authentication
router.use(authenticateToken);

// Team CRUD
router.get('/', TeamController.getTeams);
router.get('/active', TeamController.getActiveTeam);
router.get('/:id', TeamController.getTeamById);
router.post('/', TeamController.createTeam);
router.put('/:id', TeamController.updateTeam);
router.delete('/:id', TeamController.deleteTeam);

// Team actions
router.put('/:id/activate', TeamController.setActiveTeam);
router.get('/:id/power', TeamController.getTeamPower);

module.exports = router;
