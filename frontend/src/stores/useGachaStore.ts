/**
 * Gacha Store
 * Gacha system state management
 */

import { create } from 'zustand';
import { gachaService } from '@/services/gacha.service';
import { useAuthStore } from './useAuthStore';
import type {
  GachaBanner,
  GachaPullResult,
  GachaHistory,
  GachaStats,
} from '@/types';

interface GachaState {
  banners: GachaBanner[];
  selectedBanner: GachaBanner | null;
  pullResult: GachaPullResult | null;
  history: GachaHistory[];
  stats: GachaStats | null;
  isLoading: boolean;
  isPulling: boolean;
  error: string | null;

  // Actions
  fetchBanners: () => Promise<void>;
  selectBanner: (banner: GachaBanner | null) => void;
  performSinglePull: (bannerId: number) => Promise<GachaPullResult>;
  performMultiPull: (bannerId: number) => Promise<GachaPullResult>;
  fetchHistory: (page?: number, limit?: number) => Promise<void>;
  fetchStats: () => Promise<void>;
  clearPullResult: () => void;
  clearError: () => void;
}

export const useGachaStore = create<GachaState>((set, get) => ({
  banners: [],
  selectedBanner: null,
  pullResult: null,
  history: [],
  stats: null,
  isLoading: false,
  isPulling: false,
  error: null,

  /**
   * Fetch active banners
   */
  fetchBanners: async () => {
    set({ isLoading: true, error: null });

    try {
      const banners = await gachaService.getBanners();
      set({ banners, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch banners',
        isLoading: false,
      });
    }
  },

  /**
   * Select a banner
   */
  selectBanner: (banner) => {
    set({ selectedBanner: banner });
  },

  /**
   * Perform single pull
   */
  performSinglePull: async (bannerId) => {
    set({ isPulling: true, error: null, pullResult: null });

    try {
      const result = await gachaService.singlePull(bannerId);
      set({ pullResult: result, isPulling: false });

      // Update user resources
      const authStore = useAuthStore.getState();
      if (result.costType === 'Gems') {
        authStore.updateUserResources({
          gems: (authStore.user?.gems || 0) - result.costAmount,
          pity_counter: result.pityCounter,
        });
      } else {
        authStore.updateUserResources({
          gold: (authStore.user?.gold || 0) - result.costAmount,
          pity_counter: result.pityCounter,
        });
      }

      return result;
    } catch (error: any) {
      set({
        error: error.message || 'Pull failed',
        isPulling: false,
      });
      throw error;
    }
  },

  /**
   * Perform 10x pull
   */
  performMultiPull: async (bannerId) => {
    set({ isPulling: true, error: null, pullResult: null });

    try {
      const result = await gachaService.multiPull(bannerId);
      set({ pullResult: result, isPulling: false });

      // Update user resources
      const authStore = useAuthStore.getState();
      if (result.costType === 'Gems') {
        authStore.updateUserResources({
          gems: (authStore.user?.gems || 0) - result.costAmount,
          pity_counter: result.pityCounter,
        });
      } else {
        authStore.updateUserResources({
          gold: (authStore.user?.gold || 0) - result.costAmount,
          pity_counter: result.pityCounter,
        });
      }

      return result;
    } catch (error: any) {
      set({
        error: error.message || 'Pull failed',
        isPulling: false,
      });
      throw error;
    }
  },

  /**
   * Fetch gacha history
   */
  fetchHistory: async (page = 1, limit = 20) => {
    set({ isLoading: true, error: null });

    try {
      const data = await gachaService.getHistory(page, limit);
      set({ history: data.history, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch history',
        isLoading: false,
      });
    }
  },

  /**
   * Fetch gacha statistics
   */
  fetchStats: async () => {
    set({ isLoading: true, error: null });

    try {
      const stats = await gachaService.getStats();
      set({ stats, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch stats',
        isLoading: false,
      });
    }
  },

  /**
   * Clear pull result
   */
  clearPullResult: () => {
    set({ pullResult: null });
  },

  /**
   * Clear error
   */
  clearError: () => {
    set({ error: null });
  },
}));
