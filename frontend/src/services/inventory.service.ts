/**
 * Inventory Service
 * Player character inventory management
 */

import { apiService } from './api';
import type {
  PlayerCharacter,
  InventoryStats,
  InventoryFilters,
} from '@/types';

export const inventoryService = {
  /**
   * Get user's inventory
   */
  async getInventory(filters?: InventoryFilters): Promise<{
    characters: PlayerCharacter[];
    stats: InventoryStats;
  }> {
    const params = new URLSearchParams();
    if (filters?.rarity) params.append('rarity', filters.rarity);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.locked !== undefined) params.append('locked', String(filters.locked));
    if (filters?.favorite !== undefined) params.append('favorite', String(filters.favorite));
    if (filters?.sort) params.append('sort', filters.sort);
    if (filters?.order) params.append('order', filters.order);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiService.get(`/inventory${query}`);
    return response.data.data!;
  },

  /**
   * Get a specific character
   */
  async getCharacter(id: number): Promise<PlayerCharacter> {
    const response = await apiService.get<PlayerCharacter>(`/inventory/${id}`);
    return response.data.data!;
  },

  /**
   * Lock/unlock a character
   */
  async toggleLock(id: number, locked: boolean): Promise<void> {
    await apiService.put(`/inventory/${id}/lock`, { locked });
  },

  /**
   * Toggle favorite status
   */
  async toggleFavorite(id: number, favorite: boolean): Promise<void> {
    await apiService.put(`/inventory/${id}/favorite`, { favorite });
  },

  /**
   * Sell/delete a character
   */
  async deleteCharacter(id: number): Promise<{
    character: PlayerCharacter;
    goldReward: number;
  }> {
    const response = await apiService.delete(`/inventory/${id}`);
    return response.data.data!;
  },

  /**
   * Upgrade a character
   */
  async upgradeCharacter(id: number): Promise<{
    character: PlayerCharacter;
    cost: number;
  }> {
    const response = await apiService.put(`/inventory/${id}/upgrade`);
    return response.data.data!;
  },

  /**
   * Get inventory statistics
   */
  async getStats(): Promise<InventoryStats> {
    const response = await apiService.get<InventoryStats>('/inventory/stats');
    return response.data.data!;
  },

  /**
   * Filter inventory
   */
  async filterInventory(filters: InventoryFilters): Promise<PlayerCharacter[]> {
    const params = new URLSearchParams();
    if (filters.rarity) params.append('rarity', filters.rarity);
    if (filters.type) params.append('type', filters.type);
    if (filters.locked !== undefined) params.append('locked', String(filters.locked));
    if (filters.favorite !== undefined) params.append('favorite', String(filters.favorite));

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiService.get<PlayerCharacter[]>(`/inventory/filter${query}`);
    return response.data.data!;
  },
};
