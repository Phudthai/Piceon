/**
 * Character Routes
 * /api/characters
 */

const express = require('express');
const router = express.Router();
const CharacterController = require('../controllers/CharacterController');
const { optionalAuth } = require('../middleware/auth');

// All routes are public (optionalAuth allows both authenticated and guest access)
router.get('/templates', optionalAuth, CharacterController.getAllTemplates);
router.get('/templates/:id', optionalAuth, CharacterController.getTemplateById);
router.get('/templates/:id/skills', optionalAuth, CharacterController.getCharacterSkills);
router.get('/templates/:id/skills/unlocked', optionalAuth, CharacterController.getUnlockedSkills);
router.get('/templates/rarity/:rarity', optionalAuth, CharacterController.getByRarity);
router.get('/templates/type/:type', optionalAuth, CharacterController.getByType);
router.get('/stats', optionalAuth, CharacterController.getStats);

module.exports = router;
