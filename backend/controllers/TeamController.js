/**
 * Team Controller
 * Handles team management endpoints
 */

const BaseController = require('./BaseController');
const Team = require('../models/Team');

class TeamController extends BaseController {
  /**
   * Get user's teams
   * GET /api/teams
   */
  getTeams = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const teams = await Team.getUserTeams(userId);

    return this.success(res, teams, `Retrieved ${teams.length} teams`);
  });

  /**
   * Get team by ID with character details
   * GET /api/teams/:id
   */
  getTeamById = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const team = await Team.getTeamWithCharacters(id, userId);

    if (!team) {
      return this.notFound(res, 'Team not found');
    }

    return this.success(res, team, 'Team retrieved successfully');
  });

  /**
   * Get active team
   * GET /api/teams/active
   */
  getActiveTeam = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const team = await Team.getActiveTeam(userId);

    if (!team) {
      return this.success(res, null, 'No active team set');
    }

    const teamWithChars = await Team.getTeamWithCharacters(team.id, userId);

    return this.success(res, teamWithChars, 'Active team retrieved');
  });

  /**
   * Create new team
   * POST /api/teams
   */
  createTeam = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { name, slots } = req.body;

    // Validate team composition
    if (slots) {
      const validation = await Team.validateTeam(slots, userId);
      if (!validation.valid) {
        return this.error(res, validation.error, 400);
      }
    }

    const team = await Team.createTeam(userId, { name, slots });

    return this.success(res, team, 'Team created successfully', 201);
  });

  /**
   * Update team
   * PUT /api/teams/:id
   */
  updateTeam = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, slots } = req.body;

    // Validate team composition if slots provided
    if (slots) {
      const validation = await Team.validateTeam(slots, userId);
      if (!validation.valid) {
        return this.error(res, validation.error, 400);
      }
    }

    const success = await Team.updateTeam(id, userId, { name, slots });

    if (!success) {
      return this.notFound(res, 'Team not found');
    }

    const updatedTeam = await Team.getTeamWithCharacters(id, userId);

    return this.success(res, updatedTeam, 'Team updated successfully');
  });

  /**
   * Set active team
   * PUT /api/teams/:id/activate
   */
  setActiveTeam = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const success = await Team.setActiveTeam(id, userId);

    if (!success) {
      return this.notFound(res, 'Team not found');
    }

    return this.success(res, { id }, 'Team activated successfully');
  });

  /**
   * Delete team
   * DELETE /api/teams/:id
   */
  deleteTeam = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const success = await Team.deleteTeam(id, userId);

    if (!success) {
      return this.notFound(res, 'Team not found');
    }

    return this.success(res, { id }, 'Team deleted successfully');
  });

  /**
   * Get team power
   * GET /api/teams/:id/power
   */
  getTeamPower = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;

    const power = await Team.calculateTeamPower(id, userId);

    if (power === 0) {
      return this.notFound(res, 'Team not found or empty');
    }

    return this.success(res, { teamId: id, power }, 'Team power calculated');
  });
}

module.exports = new TeamController();
