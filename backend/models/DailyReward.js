/**
 * Daily Reward Model
 * Handles daily login rewards and streak tracking
 */

const BaseModel = require('./BaseModel');
const User = require('./User');

// Reward configuration for each day
const REWARD_CONFIG = {
  1: { gold: 100, gems: 0 },
  2: { gold: 150, gems: 0 },
  3: { gold: 200, gems: 10 },
  4: { gold: 300, gems: 0 },
  5: { gold: 400, gems: 20 },
  6: { gold: 500, gems: 30 },
  7: { gold: 1000, gems: 50 }
};

class DailyReward extends BaseModel {
  constructor() {
    super('user_daily_rewards');
  }

  /**
   * Get reward configuration for a specific day
   * @param {number} day - Day number (1-7)
   * @returns {Object} Reward config { gold, gems }
   */
  getRewardConfig(day) {
    return REWARD_CONFIG[day] || REWARD_CONFIG[1];
  }

  /**
   * Get all reward configurations
   * @returns {Object} All reward configs
   */
  getAllRewards() {
    return REWARD_CONFIG;
  }

  /**
   * Get or create user's daily reward record
   * @param {number} userId - User ID
   * @returns {Promise<Object>} User's daily reward record
   */
  async getOrCreateUserRecord(userId) {
    let record = await this.findOne({ user_id: userId });
    
    if (!record) {
      record = await this.create({
        user_id: userId,
        streak_count: 1,
        last_claimed_at: null,
        total_claims: 0,
        total_gold_earned: 0,
        total_gems_earned: 0
      });
    }
    
    return record;
  }

  /**
   * Check if user can claim today's reward
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Status object with canClaim, streak, nextReward, etc.
   */
  async getUserRewardStatus(userId) {
    const record = await this.getOrCreateUserRecord(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let canClaim = true;
    let currentStreak = record.streak_count;
    
    if (record.last_claimed_at) {
      const lastClaimed = new Date(record.last_claimed_at);
      lastClaimed.setHours(0, 0, 0, 0);
      
      const diffTime = today.getTime() - lastClaimed.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        // Already claimed today
        canClaim = false;
      } else if (diffDays === 1) {
        // Consecutive day - continue streak
        currentStreak = record.streak_count >= 7 ? 1 : record.streak_count + 1;
      } else {
        // Streak broken - reset to day 1
        currentStreak = 1;
      }
    }
    
    const nextReward = this.getRewardConfig(currentStreak);
    const claimedDays = this.getClaimedDaysForDisplay(record, currentStreak, canClaim);
    
    return {
      canClaim,
      currentDay: currentStreak,
      nextReward,
      lastClaimedAt: record.last_claimed_at,
      totalClaims: record.total_claims,
      totalGoldEarned: record.total_gold_earned,
      totalGemsEarned: record.total_gems_earned,
      allRewards: REWARD_CONFIG,
      claimedDays
    };
  }

  /**
   * Get which days should show as claimed for UI
   * @param {Object} record - User's daily reward record
   * @param {number} currentStreak - Current streak count
   * @param {boolean} canClaim - Can claim today
   * @returns {Array<number>} Array of claimed day numbers
   */
  getClaimedDaysForDisplay(record, currentStreak, canClaim) {
    if (!record.last_claimed_at) {
      return [];
    }
    
    // If can't claim today, show days 1 to currentStreak as claimed
    if (!canClaim) {
      return Array.from({ length: currentStreak }, (_, i) => i + 1);
    }
    
    // If can claim today and currentStreak > 1, show days 1 to (currentStreak-1) as claimed
    if (currentStreak > 1) {
      return Array.from({ length: currentStreak - 1 }, (_, i) => i + 1);
    }
    
    // New streak starting, no days claimed yet
    return [];
  }

  /**
   * Claim daily reward
   * @param {number} userId - User ID
   * @returns {Promise<Object>} Result with reward details
   */
  async claimDailyReward(userId) {
    const status = await this.getUserRewardStatus(userId);
    
    if (!status.canClaim) {
      throw new Error('Already claimed today\'s reward');
    }
    
    const reward = status.nextReward;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    
    // Get the record to update
    const record = await this.getOrCreateUserRecord(userId);
    
    // Update user's resources
    await User.addResources(userId, {
      gold: reward.gold,
      gems: reward.gems
    });
    
    // Update daily reward record
    await this.update(record.id, {
      streak_count: status.currentDay,
      last_claimed_at: todayStr,
      total_claims: record.total_claims + 1,
      total_gold_earned: record.total_gold_earned + reward.gold,
      total_gems_earned: record.total_gems_earned + reward.gems
    });
    
    // Get updated user profile
    const updatedUser = await User.getProfile(userId);
    
    return {
      success: true,
      day: status.currentDay,
      reward,
      nextDay: status.currentDay >= 7 ? 1 : status.currentDay + 1,
      user: updatedUser
    };
  }
}

module.exports = new DailyReward();
