/**
 * Equipment Controller
 * Manages player equipment instances (non-stackable)
 */

const BaseController = require('./BaseController');
const Equipment = require('../models/Equipment');
const PlayerCharacter = require('../models/PlayerCharacter');
const User = require('../models/User');

class EquipmentController extends BaseController {
  /**
   * Get user's equipment
   * GET /api/equipment
   */
  getUserEquipment = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const equipment = await Equipment.getUserEquipment(userId);

    return this.success(res, equipment, `Retrieved ${equipment.length} equipment`);
  });

  /**
   * Get equipment by ID
   * GET /api/equipment/:id
   */
  getEquipmentById = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const equipment = await Equipment.getEquipmentById(id, userId);

    if (!equipment) {
      return this.notFound(res, 'Equipment not found');
    }

    return this.success(res, equipment, 'Equipment retrieved');
  });

  /**
   * Create equipment (from drops/rewards)
   * POST /api/equipment/create
   */
  createEquipment = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { equipment_template_id } = req.body;

    if (!equipment_template_id) {
      return this.validationError(res, [{ msg: 'equipment_template_id is required' }]);
    }

    try {
      const equipmentId = await Equipment.createEquipment(userId, equipment_template_id);
      const newEquipment = await Equipment.getEquipmentById(equipmentId, userId);

      return this.success(res, newEquipment, 'Equipment created', 201);
    } catch (error) {
      return this.error(res, error.message, 400);
    }
  });

  /**
   * Upgrade equipment level
   * PUT /api/equipment/:id/upgrade
   */
  upgradeLevel = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
      const newLevel = await Equipment.upgradeLevel(id, userId);
      const updatedEquipment = await Equipment.getEquipmentById(id, userId);

      return this.success(res, updatedEquipment, `Equipment upgraded to level ${newLevel}`);
    } catch (error) {
      return this.error(res, error.message, 400);
    }
  });

  /**
   * Upgrade equipment stars
   * PUT /api/equipment/:id/star
   */
  upgradeStar = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
      const newStars = await Equipment.upgradeStar(id, userId);
      const updatedEquipment = await Equipment.getEquipmentById(id, userId);

      return this.success(res, updatedEquipment, `Equipment upgraded to ${newStars} stars`);
    } catch (error) {
      return this.error(res, error.message, 400);
    }
  });

  /**
   * Equip/unequip equipment
   * PUT /api/equipment/:id/equip
   */
  toggleEquip = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { character_id } = req.body;

    // Get equipment details
    const equipment = await Equipment.getEquipmentById(id, userId);
    if (!equipment) {
      return this.notFound(res, 'Equipment not found');
    }

    // If equipping (character_id provided)
    if (character_id) {
      // Verify character ownership
      const character = await PlayerCharacter.getPlayerCharacter(character_id, userId);
      if (!character) {
        return this.notFound(res, 'Character not found');
      }

      // Unequip any existing equipment of same type from this character
      const equipmentType = equipment.equipment_type;
      const slotColumn = `equipment_${equipmentType}_id`;

      const currentEquippedId = character[slotColumn];
      if (currentEquippedId) {
        // Unequip current equipment
        await Equipment.toggleEquip(currentEquippedId, userId, null);
      }

      // Equip new equipment
      await Equipment.toggleEquip(id, userId, character_id);

      // Update character's equipment slot
      await PlayerCharacter.update(character_id, {
        [slotColumn]: id
      });

      return this.success(
        res,
        { id, character_id, equipment_type: equipmentType },
        `Equipment equipped to ${character.name}`
      );
    } else {
      // Unequipping
      await Equipment.toggleEquip(id, userId, null);

      // Remove from character's equipment slot
      if (equipment.equipped_character_id) {
        const slotColumn = `equipment_${equipment.equipment_type}_id`;
        await PlayerCharacter.update(equipment.equipped_character_id, {
          [slotColumn]: null
        });
      }

      return this.success(res, { id }, 'Equipment unequipped');
    }
  });

  /**
   * Lock/unlock equipment
   * PUT /api/equipment/:id/lock
   */
  toggleLock = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
      await Equipment.toggleLock(id, userId);
      const updatedEquipment = await Equipment.getEquipmentById(id, userId);

      return this.success(
        res,
        updatedEquipment,
        updatedEquipment.is_locked ? 'Equipment locked' : 'Equipment unlocked'
      );
    } catch (error) {
      return this.error(res, error.message, 400);
    }
  });

  /**
   * Sell equipment
   * DELETE /api/equipment/:id
   */
  sellEquipment = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    try {
      const sellPrice = await Equipment.sellEquipment(id, userId);

      // Add gold to user
      await User.addResources(userId, { gold: sellPrice });

      return this.success(
        res,
        { id, gold_earned: sellPrice },
        `Equipment sold for ${sellPrice} gold`
      );
    } catch (error) {
      return this.error(res, error.message, 400);
    }
  });
}

module.exports = new EquipmentController();
