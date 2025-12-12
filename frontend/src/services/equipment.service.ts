/**
 * Equipment Service
 * Handles all equipment-related API calls
 */

import apiService from './api';

export interface Equipment {
  id: number;
  user_id: number;
  equipment_template_id: number;
  level: number;
  stars: number;
  exp: number;
  current_primary_stat: number;
  sub_stat_1_type?: 'atk' | 'def' | 'hp' | 'crit_rate' | 'crit_dmg' | 'speed';
  sub_stat_1_value?: number;
  sub_stat_2_type?: 'atk' | 'def' | 'hp' | 'crit_rate' | 'crit_dmg' | 'speed';
  sub_stat_2_value?: number;
  sub_stat_3_type?: 'atk' | 'def' | 'hp' | 'crit_rate' | 'crit_dmg' | 'speed';
  sub_stat_3_value?: number;
  is_equipped: boolean;
  equipped_character_id?: number;
  is_locked: boolean;
  obtained_at: string;
  // Template data
  name: string;
  equipment_type: 'weapon' | 'armor' | 'accessory' | 'artifact';
  primary_stat: 'atk' | 'def' | 'hp';
  base_value: number;
  growth_rate: number;
  max_level: number;
  max_stars: number;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
  description: string;
  icon: string;
}

class EquipmentService {
  /**
   * Get all user's equipment
   */
  async getUserEquipment(): Promise<Equipment[]> {
    const response = await apiService.get('/equipment');
    return response.data.data || [];
  }

  /**
   * Get equipment by ID
   */
  async getEquipmentById(equipmentId: number): Promise<Equipment> {
    const response = await apiService.get(`/equipment/${equipmentId}`);
    return response.data.data!;
  }

  /**
   * Create equipment (from drops/rewards)
   */
  async createEquipment(equipmentTemplateId: number): Promise<Equipment> {
    const response = await apiService.post('/equipment/create', {
      equipment_template_id: equipmentTemplateId
    });
    return response.data.data!;
  }

  /**
   * Upgrade equipment level
   */
  async upgradeLevel(equipmentId: number): Promise<Equipment> {
    const response = await apiService.put(`/equipment/${equipmentId}/upgrade`);
    return response.data.data!;
  }

  /**
   * Upgrade equipment stars
   */
  async upgradeStar(equipmentId: number): Promise<Equipment> {
    const response = await apiService.put(`/equipment/${equipmentId}/star`);
    return response.data.data!;
  }

  /**
   * Equip to character
   */
  async equipToCharacter(equipmentId: number, characterId: number): Promise<void> {
    await apiService.put(`/equipment/${equipmentId}/equip`, {
      character_id: characterId
    });
  }

  /**
   * Unequip from character
   */
  async unequip(equipmentId: number): Promise<void> {
    await apiService.put(`/equipment/${equipmentId}/equip`, {
      character_id: null
    });
  }

  /**
   * Toggle lock status
   */
  async toggleLock(equipmentId: number): Promise<Equipment> {
    const response = await apiService.put(`/equipment/${equipmentId}/lock`);
    return response.data.data!;
  }

  /**
   * Sell equipment
   */
  async sellEquipment(equipmentId: number): Promise<{ id: number; gold_earned: number }> {
    const response = await apiService.delete(`/equipment/${equipmentId}`);
    return response.data.data!;
  }
}

export default new EquipmentService();
