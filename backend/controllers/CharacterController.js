/**
 * Character Controller
 * Handles character templates and queries
 */

const BaseController = require('./BaseController');
const Character = require('../models/Character');
const Skill = require('../models/Skill');

class CharacterController extends BaseController {
  /**
   * Get all character templates
   * GET /api/characters/templates
   */
  getAllTemplates = this.asyncHandler(async (req, res) => {
    const { type, rarity } = req.query;

    const characters = await Character.getAllCharacters({ type, rarity });

    return this.success(
      res,
      characters,
      `Retrieved ${characters.length} character templates`
    );
  });

  /**
   * Get character template by ID
   * GET /api/characters/templates/:id
   */
  getTemplateById = this.asyncHandler(async (req, res) => {
    const { id } = req.params;

    const character = await Character.getCharacterById(id);

    if (!character) {
      return this.notFound(res, 'Character template not found');
    }

    return this.success(res, character, 'Character template retrieved');
  });

  /**
   * Get characters by rarity
   * GET /api/characters/templates/rarity/:rarity
   */
  getByRarity = this.asyncHandler(async (req, res) => {
    const { rarity } = req.params;

    const validRarities = ['Common', 'Rare', 'Epic', 'Legendary'];
    if (!validRarities.includes(rarity)) {
      return this.error(res, 'Invalid rarity. Must be Common, Rare, Epic, or Legendary', 400);
    }

    const characters = await Character.getCharactersByRarity(rarity);

    return this.success(
      res,
      characters,
      `Retrieved ${characters.length} ${rarity} characters`
    );
  });

  /**
   * Get characters by type
   * GET /api/characters/templates/type/:type
   */
  getByType = this.asyncHandler(async (req, res) => {
    const { type } = req.params;

    const validTypes = ['Warrior', 'Mage', 'Archer', 'Tank', 'Assassin'];
    if (!validTypes.includes(type)) {
      return this.error(res, 'Invalid type. Must be Warrior, Mage, Archer, Tank, or Assassin', 400);
    }

    const characters = await Character.getCharactersByType(type);

    return this.success(
      res,
      characters,
      `Retrieved ${characters.length} ${type} characters`
    );
  });

  /**
   * Get character statistics
   * GET /api/characters/stats
   */
  getStats = this.asyncHandler(async (req, res) => {
    const stats = await Character.getCharacterStats();

    return this.success(res, stats, 'Character statistics retrieved');
  });

  /**
   * Get character skills by template ID
   * GET /api/characters/templates/:id/skills
   */
  getCharacterSkills = this.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { level } = req.query;

    const character = await Character.getCharacterById(id);
    if (!character) {
      return this.notFound(res, 'Character template not found');
    }

    const characterLevel = level ? parseInt(level) : 1;
    const skills = await Skill.getCharacterSkills(id, characterLevel);

    return this.success(res, skills, `Retrieved ${skills.length} skills for character`);
  });

  /**
   * Get unlocked skills only
   * GET /api/characters/templates/:id/skills/unlocked
   */
  getUnlockedSkills = this.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { level } = req.query;

    const character = await Character.getCharacterById(id);
    if (!character) {
      return this.notFound(res, 'Character template not found');
    }

    const characterLevel = level ? parseInt(level) : 1;
    const skills = await Skill.getUnlockedSkills(id, characterLevel);

    return this.success(res, skills, `Retrieved ${skills.length} unlocked skills`);
  });
}

module.exports = new CharacterController();
