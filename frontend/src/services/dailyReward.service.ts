/**
 * Daily Reward Service
 * API calls for daily rewards system
 */

import api from './api';
import type { DailyRewardStatus, DailyRewardClaimResult } from '@/types';

export const dailyRewardService = {
  /**
   * Get current daily reward status
   */
  getStatus: async (): Promise<DailyRewardStatus> => {
    const response = await api.get('/daily-rewards/status');
    return response.data.data;
  },

  /**
   * Claim today's reward
   */
  claim: async (): Promise<DailyRewardClaimResult> => {
    const response = await api.post('/daily-rewards/claim');
    return response.data.data;
  },

  /**
   * Get all reward configurations
   */
  getRewards: async () => {
    const response = await api.get('/daily-rewards/rewards');
    return response.data.data.rewards;
  }
};
