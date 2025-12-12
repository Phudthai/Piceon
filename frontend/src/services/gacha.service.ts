/**
 * Gacha Service
 * Gacha pulls and history
 */

import { apiService } from './api';
import type {
  GachaBanner,
  GachaPullResult,
  GachaHistory,
  GachaStats,
} from '@/types';

export const gachaService = {
  /**
   * Get all active banners
   */
  async getBanners(): Promise<GachaBanner[]> {
    const response = await apiService.get<GachaBanner[]>('/gacha/banners');
    return response.data.data!;
  },

  /**
   * Get banner by ID
   */
  async getBannerById(id: number): Promise<GachaBanner> {
    const response = await apiService.get<GachaBanner>(`/gacha/banners/${id}`);
    return response.data.data!;
  },

  /**
   * Perform a single pull
   */
  async singlePull(bannerId: number): Promise<GachaPullResult> {
    const response = await apiService.post<GachaPullResult>('/gacha/pull', { bannerId });
    return response.data.data!;
  },

  /**
   * Perform a 10x pull
   */
  async multiPull(bannerId: number): Promise<GachaPullResult> {
    const response = await apiService.post<GachaPullResult>('/gacha/pull-10', { bannerId });
    return response.data.data!;
  },

  /**
   * Get gacha history
   */
  async getHistory(page = 1, limit = 20): Promise<{
    history: GachaHistory[];
    page: number;
    limit: number;
  }> {
    const response = await apiService.get(
      `/gacha/history?page=${page}&limit=${limit}`
    );
    return response.data.data!;
  },

  /**
   * Get pull statistics
   */
  async getStats(): Promise<GachaStats> {
    const response = await apiService.get<GachaStats>('/gacha/stats');
    return response.data.data!;
  },
};
