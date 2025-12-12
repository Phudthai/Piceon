/**
 * Inventory Store
 * Player character inventory state management
 */

import { create } from 'zustand';
import { inventoryService } from '@/services/inventory.service';
import { useAuthStore } from './useAuthStore';
import type {
  PlayerCharacter,
  InventoryStats,
  InventoryFilters,
} from '@/types';

interface InventoryState {
  characters: PlayerCharacter[];
  stats: InventoryStats | null;
  selectedCharacter: PlayerCharacter | null;
  filters: InventoryFilters;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchInventory: (filters?: InventoryFilters) => Promise<void>;
  fetchCharacter: (id: number) => Promise<void>;
  toggleLock: (id: number, locked: boolean) => Promise<void>;
  toggleFavorite: (id: number, favorite: boolean) => Promise<void>;
  deleteCharacter: (id: number) => Promise<number>;
  upgradeCharacter: (id: number) => Promise<void>;
  setFilters: (filters: InventoryFilters) => void;
  setSelectedCharacter: (character: PlayerCharacter | null) => void;
  clearError: () => void;
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  characters: [],
  stats: null,
  selectedCharacter: null,
  filters: {},
  isLoading: false,
  error: null,

  /**
   * Fetch inventory
   */
  fetchInventory: async (filters) => {
    set({ isLoading: true, error: null });

    try {
      const data = await inventoryService.getInventory(filters);
      set({
        characters: data.characters,
        stats: data.stats,
        filters: filters || {},
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch inventory',
        isLoading: false,
      });
    }
  },

  /**
   * Fetch specific character
   */
  fetchCharacter: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const character = await inventoryService.getCharacter(id);
      set({ selectedCharacter: character, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch character',
        isLoading: false,
      });
    }
  },

  /**
   * Toggle lock status
   */
  toggleLock: async (id, locked) => {
    try {
      await inventoryService.toggleLock(id, locked);

      // Update local state
      const { characters, selectedCharacter } = get();
      set({
        characters: characters.map((char) =>
          char.id === id ? { ...char, is_locked: locked } : char
        ),
        selectedCharacter:
          selectedCharacter?.id === id
            ? { ...selectedCharacter, is_locked: locked }
            : selectedCharacter,
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to toggle lock' });
      throw error;
    }
  },

  /**
   * Toggle favorite status
   */
  toggleFavorite: async (id, favorite) => {
    try {
      await inventoryService.toggleFavorite(id, favorite);

      // Update local state
      const { characters, selectedCharacter } = get();
      set({
        characters: characters.map((char) =>
          char.id === id ? { ...char, is_favorite: favorite } : char
        ),
        selectedCharacter:
          selectedCharacter?.id === id
            ? { ...selectedCharacter, is_favorite: favorite }
            : selectedCharacter,
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to toggle favorite' });
      throw error;
    }
  },

  /**
   * Delete character and return gold reward
   */
  deleteCharacter: async (id) => {
    try {
      const result = await inventoryService.deleteCharacter(id);

      // Update local state
      const { characters } = get();
      set({
        characters: characters.filter((char) => char.id !== id),
        selectedCharacter: null,
      });

      // Update user gold
      const authStore = useAuthStore.getState();
      authStore.updateUserResources({
        gold: (authStore.user?.gold || 0) + result.goldReward,
      });

      return result.goldReward;
    } catch (error: any) {
      set({ error: error.message || 'Failed to delete character' });
      throw error;
    }
  },

  /**
   * Upgrade character
   */
  upgradeCharacter: async (id) => {
    try {
      const result = await inventoryService.upgradeCharacter(id);

      // Update local state
      const { characters, selectedCharacter } = get();
      set({
        characters: characters.map((char) =>
          char.id === id ? result.character : char
        ),
        selectedCharacter:
          selectedCharacter?.id === id ? result.character : selectedCharacter,
      });

      // Update user gold
      const authStore = useAuthStore.getState();
      authStore.updateUserResources({
        gold: (authStore.user?.gold || 0) - result.cost,
      });
    } catch (error: any) {
      set({ error: error.message || 'Failed to upgrade character' });
      throw error;
    }
  },

  /**
   * Set filters
   */
  setFilters: (filters) => {
    set({ filters });
  },

  /**
   * Set selected character
   */
  setSelectedCharacter: (character) => {
    set({ selectedCharacter: character });
  },

  /**
   * Clear error
   */
  clearError: () => {
    set({ error: null });
  },
}));
