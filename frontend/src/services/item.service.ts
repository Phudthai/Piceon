/**
 * Item Service
 * Handles all item inventory API calls (materials, consumables, special)
 */

import apiService from './api';

export interface Item {
  id: number;
  name: string;
  item_type: 'material' | 'consumable' | 'special';
  category: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
  description: string;
  icon: string;
  max_stack: number;
  sell_price: number;
  created_at: string;
}

export interface InventoryItem extends Item {
  quantity: number;
  obtained_at: string;
}

class ItemService {
  /**
   * Get user's item inventory
   */
  async getUserInventory(type?: string): Promise<InventoryItem[]> {
    const url = type ? `/items/inventory?type=${type}` : '/items/inventory';
    const response = await apiService.get(url);
    return response.data.data || [];
  }

  /**
   * Get inventory by specific type
   */
  async getInventoryByType(type: 'material' | 'consumable' | 'special'): Promise<InventoryItem[]> {
    const response = await apiService.get(`/items/inventory/type/${type}`);
    return response.data.data || [];
  }

  /**
   * Get item details
   */
  async getItemDetails(itemId: number): Promise<InventoryItem> {
    const response = await apiService.get(`/items/inventory/${itemId}`);
    return response.data.data!;
  }

  /**
   * Get items catalog
   */
  async getCatalog(type?: string, category?: string): Promise<Item[]> {
    let url = '/items/catalog';
    const params = [];
    if (type) params.push(`type=${type}`);
    if (category) params.push(`category=${category}`);
    if (params.length > 0) url += `?${params.join('&')}`;

    const response = await apiService.get(url);
    return response.data.data || [];
  }

  /**
   * Add item to inventory (admin/rewards)
   */
  async addItem(itemId: number, quantity: number = 1): Promise<InventoryItem> {
    const response = await apiService.post('/items/inventory/add', {
      item_id: itemId,
      quantity
    });
    return response.data.data!;
  }

  /**
   * Remove item from inventory
   */
  async removeItem(itemId: number, quantity: number = 1): Promise<void> {
    await apiService.post('/items/inventory/remove', {
      item_id: itemId,
      quantity
    });
  }

  /**
   * Use consumable item
   */
  async useItem(itemId: number, quantity: number = 1, targetId?: number): Promise<any> {
    const response = await apiService.post('/items/inventory/use', {
      item_id: itemId,
      quantity,
      target_id: targetId
    });
    return response.data.data!;
  }
}

export default new ItemService();
