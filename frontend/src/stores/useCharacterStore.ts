/**
 * Character Store
 * Character templates state management
 */

import { create } from 'zustand';
import { characterService } from '@/services/character.service';
import type { CharacterTemplate, CharacterType, CharacterRarity } from '@/types';

interface CharacterState {
  characters: CharacterTemplate[];
  selectedCharacter: CharacterTemplate | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchAllTemplates: (filters?: { type?: CharacterType; rarity?: CharacterRarity }) => Promise<void>;
  fetchTemplateById: (id: number) => Promise<void>;
  fetchByRarity: (rarity: CharacterRarity) => Promise<void>;
  fetchByType: (type: CharacterType) => Promise<void>;
  setSelectedCharacter: (character: CharacterTemplate | null) => void;
  clearError: () => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  characters: [],
  selectedCharacter: null,
  isLoading: false,
  error: null,

  /**
   * Fetch all character templates
   */
  fetchAllTemplates: async (filters) => {
    set({ isLoading: true, error: null });

    try {
      const characters = await characterService.getAllTemplates(filters);
      set({ characters, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch characters',
        isLoading: false,
      });
    }
  },

  /**
   * Fetch character template by ID
   */
  fetchTemplateById: async (id) => {
    set({ isLoading: true, error: null });

    try {
      const character = await characterService.getTemplateById(id);
      set({ selectedCharacter: character, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch character',
        isLoading: false,
      });
    }
  },

  /**
   * Fetch characters by rarity
   */
  fetchByRarity: async (rarity) => {
    set({ isLoading: true, error: null });

    try {
      const characters = await characterService.getByRarity(rarity);
      set({ characters, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch characters',
        isLoading: false,
      });
    }
  },

  /**
   * Fetch characters by type
   */
  fetchByType: async (type) => {
    set({ isLoading: true, error: null });

    try {
      const characters = await characterService.getByType(type);
      set({ characters, isLoading: false });
    } catch (error: any) {
      set({
        error: error.message || 'Failed to fetch characters',
        isLoading: false,
      });
    }
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
