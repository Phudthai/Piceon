/**
 * Daily Reward Store
 * State management for daily rewards
 */

import { create } from 'zustand';
import { dailyRewardService } from '@/services/dailyReward.service';
import type { DailyRewardStatus, DailyRewardClaimResult } from '@/types';

interface DailyRewardState {
  status: DailyRewardStatus | null;
  isLoading: boolean;
  isClaiming: boolean;
  error: string | null;
  claimResult: DailyRewardClaimResult | null;

  // Actions
  fetchStatus: () => Promise<void>;
  claimReward: () => Promise<DailyRewardClaimResult>;
  clearError: () => void;
  clearClaimResult: () => void;
}

export const useDailyRewardStore = create<DailyRewardState>((set) => ({
  status: null,
  isLoading: false,
  isClaiming: false,
  error: null,
  claimResult: null,

  /**
   * Fetch current daily reward status
   */
  fetchStatus: async () => {
    set({ isLoading: true, error: null });

    try {
      const status = await dailyRewardService.getStatus();
      set({ status, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch daily reward status',
        isLoading: false
      });
    }
  },

  /**
   * Claim today's reward
   */
  claimReward: async () => {
    set({ isClaiming: true, error: null });

    try {
      const result = await dailyRewardService.claim();
      
      // Refresh status after claiming
      const status = await dailyRewardService.getStatus();
      
      set({
        claimResult: result,
        status,
        isClaiming: false
      });

      return result;
    } catch (error: any) {
      set({
        error: error.message || 'Failed to claim reward',
        isClaiming: false
      });
      throw error;
    }
  },

  /**
   * Clear error state
   */
  clearError: () => {
    set({ error: null });
  },

  /**
   * Clear claim result
   */
  clearClaimResult: () => {
    set({ claimResult: null });
  }
}));
