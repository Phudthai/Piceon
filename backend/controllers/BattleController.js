/**
 * Battle Controller
 */

const BaseController = require('./BaseController');
const Battle = require('../models/Battle');
const Stage = require('../models/Stage');

class BattleController extends BaseController {
  getStages = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const stages = await Stage.getAvailableStages(userId);
    return this.success(res, stages, 'Stages retrieved');
  });

  getStageById = this.asyncHandler(async (req, res) => {
    const { id } = req.params;
    const stage = await Stage.getStageById(id);
    if (!stage) return this.notFound(res, 'Stage not found');
    return this.success(res, stage, 'Stage retrieved');
  });

  startBattle = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { stageId, stage_id } = req.body;
    const actualStageId = stageId || stage_id;

    if (!actualStageId) {
      return this.error(res, 'Stage ID is required', 400);
    }

    try {
      const result = await Battle.simulateBattle(userId, actualStageId);
      return this.success(res, result, result.result === 'Victory' ? '🎉 Victory!' : '💀 Defeat!');
    } catch (error) {
      return this.error(res, error.message, 400);
    }
  });

  getBattleHistory = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const { limit = 20 } = req.query;
    const history = await Battle.getUserBattleHistory(userId, parseInt(limit));
    return this.success(res, history, 'Battle history retrieved');
  });

  getProgress = this.asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const progress = await Battle.getUserProgress(userId);
    return this.success(res, progress, 'Progress retrieved');
  });
}

module.exports = new BattleController();
