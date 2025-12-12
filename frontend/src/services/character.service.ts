/**
 * Character Service
 * Character template queries
 */

import { apiService } from './api';
import type { CharacterTemplate, CharacterType, CharacterRarity } from '@/types';

export const characterService = {
  /**
   * Get all character templates
   */
  async getAllTemplates(filters?: {
    type?: CharacterType;
    rarity?: CharacterRarity;
  }): Promise<CharacterTemplate[]> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.rarity) params.append('rarity', filters.rarity);

    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await apiService.get<CharacterTemplate[]>(`/characters/templates${query}`);
    return response.data.data!;
  },

  /**
   * Get character template by ID
   */
  async getTemplateById(id: number): Promise<CharacterTemplate> {
    const response = await apiService.get<CharacterTemplate>(`/characters/templates/${id}`);
    return response.data.data!;
  },

  /**
   * Get characters by rarity
   */
  async getByRarity(rarity: CharacterRarity): Promise<CharacterTemplate[]> {
    const response = await apiService.get<CharacterTemplate[]>(
      `/characters/templates/rarity/${rarity}`
    );
    return response.data.data!;
  },

  /**
   * Get characters by type
   */
  async getByType(type: CharacterType): Promise<CharacterTemplate[]> {
    const response = await apiService.get<CharacterTemplate[]>(
      `/characters/templates/type/${type}`
    );
    return response.data.data!;
  },

  /**
   * Get character statistics
   */
  async getStats(): Promise<any> {
    const response = await apiService.get('/characters/stats');
    return response.data.data!;
  },

  /**
   * Get character skills
   */
  async getCharacterSkills(characterTemplateId: number, level: number = 1): Promise<any[]> {
    const response = await apiService.get(
      `/characters/templates/${characterTemplateId}/skills?level=${level}`
    );
    return response.data.data!;
  },

  /**
   * Get unlocked skills only
   */
  async getUnlockedSkills(characterTemplateId: number, level: number = 1): Promise<any[]> {
    const response = await apiService.get(
      `/characters/templates/${characterTemplateId}/skills/unlocked?level=${level}`
    );
    return response.data.data!;
  },
};
