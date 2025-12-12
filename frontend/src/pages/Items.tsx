/**
 * Items Page
 * Displays user's items with tabs for materials, consumables, special
 */

import React, { useEffect, useState } from 'react';
import { useItemStore } from '@/stores/useItemStore';
import { InventoryItem } from '@/services/item.service';
import ItemCard from '@/components/items/ItemCard';
import ItemModal from '@/components/items/ItemModal';
import Loading from '@/components/ui/Loading';

const Items: React.FC = () => {
  const { items, loading, error, fetchInventory } = useItemStore();
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'material' | 'consumable' | 'special'>('all');

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Filter items by active tab
  const filteredItems = activeTab === 'all'
    ? items
    : items.filter(item => item.item_type === activeTab);

  // Count by type
  const counts = {
    all: items.length,
    material: items.filter(i => i.item_type === 'material').length,
    consumable: items.filter(i => i.item_type === 'consumable').length,
    special: items.filter(i => i.item_type === 'special').length
  };

  if (loading && items.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <Loading message="Loading items..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black pb-20">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-4 sticky top-0 z-10">
        <h1 className="text-white text-2xl font-bold text-center mb-4">Items</h1>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded whitespace-nowrap ${
              activeTab === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            All Items ({counts.all})
          </button>
          <button
            onClick={() => setActiveTab('material')}
            className={`px-4 py-2 rounded whitespace-nowrap ${
              activeTab === 'material'
                ? 'bg-primary text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            🔨 Materials ({counts.material})
          </button>
          <button
            onClick={() => setActiveTab('consumable')}
            className={`px-4 py-2 rounded whitespace-nowrap ${
              activeTab === 'consumable'
                ? 'bg-primary text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            ⚡ Consumables ({counts.consumable})
          </button>
          <button
            onClick={() => setActiveTab('special')}
            className={`px-4 py-2 rounded whitespace-nowrap ${
              activeTab === 'special'
                ? 'bg-primary text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            ✨ Special ({counts.special})
          </button>
        </div>

        {/* Count */}
        <div className="text-center mt-3">
          <span className="text-gray-300 text-sm">
            {filteredItems.length} {activeTab === 'all' ? 'items' : `${activeTab}s`}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 p-4 rounded mb-4">
            {error}
          </div>
        )}

        {filteredItems.length === 0 ? (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-2xl mb-2">No items found</p>
            <p className="text-sm">
              {activeTab === 'all'
                ? 'Get items from battles, gacha, or rewards!'
                : `No ${activeTab}s in your inventory`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Item Modal */}
      {selectedItem && (
        <ItemModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
};

export default Items;
