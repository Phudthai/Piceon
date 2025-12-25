/**
 * Daily Reward Controller
 * Handles daily login rewards API endpoints
 */

const BaseController = require('./BaseController');
const DailyReward = require('../models/DailyReward');

class DailyRewardController extends BaseController {
  /**
   * Get user's daily reward status
   * GET /api/daily-rewards/status
   */
  async getStatus(req, res) {
    try {
      const userId = req.user.id;
      const status = await DailyReward.getUserRewardStatus(userId);
      
      return this.success(res, status, 'Daily reward status retrieved');
    } catch (error) {
      console.error('Get daily reward status error:', error);
      return this.error(res, error.message || 'Failed to get daily reward status');
    }
  }

  /**
   * Claim daily reward
   * POST /api/daily-rewards/claim
   */
  async claim(req, res) {
    try {
      const userId = req.user.id;
      const result = await DailyReward.claimDailyReward(userId);
      
      return this.success(res, result, `Day ${result.day} reward claimed!`);
    } catch (error) {
      console.error('Claim daily reward error:', error);
      
      if (error.message === 'Already claimed today\'s reward') {
        return this.error(res, error.message, 400);
      }
      
      return this.error(res, error.message || 'Failed to claim daily reward');
    }
  }

  /**
   * Get all reward configurations
   * GET /api/daily-rewards/rewards
   */
  async getRewards(req, res) {
    try {
      const rewards = DailyReward.getAllRewards();
      
      return this.success(res, { rewards }, 'Reward configurations retrieved');
    } catch (error) {
      console.error('Get rewards error:', error);
      return this.error(res, error.message || 'Failed to get reward configurations');
    }
  }
}

module.exports = new DailyRewardController();
