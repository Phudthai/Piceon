/**
 * Item Store
 * Manages item inventory state with Zustand
 */

import { create } from 'zustand';
import itemService, { InventoryItem } from '@/services/item.service';

interface ItemStore {
  items: InventoryItem[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchInventory: (type?: string) => Promise<void>;
  useItem: (itemId: number, quantity: number, targetId?: number) => Promise<void>;
  clearError: () => void;
}

export const useItemStore = create<ItemStore>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchInventory: async (type?: string) => {
    set({ loading: true, error: null });
    try {
      const items = await itemService.getUserInventory(type);
      set({ items, loading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to fetch inventory',
        loading: false
      });
    }
  },

  useItem: async (itemId: number, quantity: number, targetId?: number) => {
    set({ loading: true, error: null });
    try {
      await itemService.useItem(itemId, quantity, targetId);

      // Update item quantity in store
      set(state => ({
        items: state.items.map(item => {
          if (item.id === itemId) {
            const newQuantity = item.quantity - quantity;
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
          }
          return item;
        }).filter(item => item.id !== itemId || item.quantity > 0),
        loading: false
      }));
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Failed to use item',
        loading: false
      });
      throw error;
    }
  },

  clearError: () => set({ error: null })
}));
