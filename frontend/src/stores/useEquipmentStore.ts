/**
 * Equipment Store
 * Manages equipment state with Zustand
 */

import { create } from 'zustand';
import equipmentService, { Equipment } from '@/services/equipment.service';

interface EquipmentStore {
  equipment: Equipment[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchEquipment: () => Promise<void>;
  upgradeLevel: (equipmentId: number) => Promise<void>;
  upgradeStar: (equipmentId: number) => Promise<void>;
  toggleLock: (equipmentId: number) => Promise<void>;
  sellEquipment: (equipmentId: number) => Promise<number>;
  equipToCharacter: (equipmentId: number, characterId: number) => Promise<void>;
  unequip: (equipmentId: number) => Promise<void>;
  clearError: () => void;
}

export const useEquipmentStore = create<EquipmentStore>((set, get) => ({
  equipment: [],
  loading: false,
  error: null,

  fetchEquipment: async () => {
    set({ loading: true, error: null });
    try {
      const equipment = await equipmentService.getUserEquipment();
      set({ equipment, loading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch equipment',
        loading: false
      });
    }
  },

  upgradeLevel: async (equipmentId: number) => {
    set({ loading: true, error: null });
    try {
      const updatedEquipment = await equipmentService.upgradeLevel(equipmentId);

      set(state => ({
        equipment: state.equipment.map(eq =>
          eq.id === equipmentId ? updatedEquipment : eq
        ),
        loading: false
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to upgrade equipment',
        loading: false
      });
      throw error;
    }
  },

  upgradeStar: async (equipmentId: number) => {
    set({ loading: true, error: null });
    try {
      const updatedEquipment = await equipmentService.upgradeStar(equipmentId);

      set(state => ({
        equipment: state.equipment.map(eq =>
          eq.id === equipmentId ? updatedEquipment : eq
        ),
        loading: false
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to upgrade stars',
        loading: false
      });
      throw error;
    }
  },

  toggleLock: async (equipmentId: number) => {
    try {
      const updatedEquipment = await equipmentService.toggleLock(equipmentId);

      set(state => ({
        equipment: state.equipment.map(eq =>
          eq.id === equipmentId ? updatedEquipment : eq
        )
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to toggle lock' });
      throw error;
    }
  },

  sellEquipment: async (equipmentId: number) => {
    set({ loading: true, error: null });
    try {
      const result = await equipmentService.sellEquipment(equipmentId);

      set(state => ({
        equipment: state.equipment.filter(eq => eq.id !== equipmentId),
        loading: false
      }));

      return result.gold_earned;
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to sell equipment',
        loading: false
      });
      throw error;
    }
  },

  equipToCharacter: async (equipmentId: number, characterId: number) => {
    try {
      await equipmentService.equipToCharacter(equipmentId, characterId);

      set(state => ({
        equipment: state.equipment.map(eq =>
          eq.id === equipmentId
            ? { ...eq, is_equipped: true, equipped_character_id: characterId }
            : eq
        )
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to equip' });
      throw error;
    }
  },

  unequip: async (equipmentId: number) => {
    try {
      await equipmentService.unequip(equipmentId);

      set(state => ({
        equipment: state.equipment.map(eq =>
          eq.id === equipmentId
            ? { ...eq, is_equipped: false, equipped_character_id: undefined }
            : eq
        )
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to unequip' });
      throw error;
    }
  },

  clearError: () => set({ error: null })
}));
