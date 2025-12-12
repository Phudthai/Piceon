/**
 * Item Modal Component
 * Detailed view with use functionality for consumables
 */

import React, { useState } from 'react';
import { InventoryItem } from '@/services/item.service';
import { useItemStore } from '@/stores/useItemStore';
import Button from '@/components/ui/Button';

interface ItemModalProps {
  item: InventoryItem;
  onClose: () => void;
}

const ItemModal: React.FC<ItemModalProps> = ({ item, onClose }) => {
  const [useQuantity, setUseQuantity] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const { useItem, fetchInventory } = useItemStore();

  // Rarity colors
  const rarityColors: Record<string, string> = {
    Common: 'from-gray-700 to-gray-900',
    Rare: 'from-blue-700 to-blue-900',
    Epic: 'from-purple-700 to-purple-900',
    Legendary: 'from-yellow-700 to-yellow-900',
    Mythic: 'from-red-700 to-red-900'
  };

  const categoryIcons: Record<string, string> = {
    exp_potion: '📖',
    level_stone: '💎',
    enhancement_stone: '🔨',
    star_stone: '⭐',
    character_soul: '👻',
    elemental_essence: '🔥',
    stamina_potion: '⚡',
    gold_boost: '🪙',
    exp_boost: '📈',
    gacha_ticket: '🎫',
    inventory_expansion: '📦'
  };

  const getIcon = () => {
    return categoryIcons[item.category] || '📦';
  };

  const canUse = item.item_type === 'consumable' || item.item_type === 'special';

  const handleUse = async () => {
    if (useQuantity < 1 || useQuantity > item.quantity) {
      alert('Invalid quantity!');
      return;
    }

    setIsProcessing(true);
    try {
      await useItem(item.id, useQuantity);
      await fetchInventory();
      alert(`Used ${useQuantity}x ${item.name}!`);

      // Close modal if all items used
      if (useQuantity >= item.quantity) {
        onClose();
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to use item');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-gradient-to-b ${rarityColors[item.rarity]} rounded-lg max-w-md w-full`}>
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <span className="text-5xl">{getIcon()}</span>
              <div>
                <h2 className="text-white font-bold text-xl">{item.name}</h2>
                <p className="text-white/80 text-sm capitalize">{item.rarity} {item.item_type}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:text-gray-300 text-2xl">
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Quantity */}
          <div className="bg-black/30 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-white font-bold">Quantity</span>
              <span className="text-white text-xl font-bold">x{item.quantity}</span>
            </div>
            <div className="text-gray-400 text-xs mt-1">
              Max Stack: {item.max_stack}
            </div>
          </div>

          {/* Description */}
          <div className="bg-black/30 rounded-lg p-4">
            <h3 className="text-white font-bold mb-2">Description</h3>
            <p className="text-white/80 text-sm">{item.description}</p>
          </div>

          {/* Category */}
          <div className="bg-black/30 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-white font-bold">Category</span>
              <span className="text-white capitalize">{item.category.replace(/_/g, ' ')}</span>
            </div>
          </div>

          {/* Sell Price */}
          <div className="bg-black/30 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-white font-bold">Sell Price</span>
              <span className="text-amber-400">🪙 {item.sell_price}</span>
            </div>
          </div>

          {/* Use Item Section (for consumables/special) */}
          {canUse && (
            <div className="bg-green-900/30 border border-green-500 rounded-lg p-4">
              <h3 className="text-white font-bold mb-3">Use Item</h3>

              {/* Quantity Selector */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={() => setUseQuantity(Math.max(1, useQuantity - 1))}
                  disabled={isProcessing}
                  className="bg-gray-700 hover:bg-gray-600 text-white w-10 h-10 rounded font-bold"
                >
                  -
                </button>
                <input
                  type="number"
                  value={useQuantity}
                  onChange={(e) => setUseQuantity(Math.min(item.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                  disabled={isProcessing}
                  className="bg-black/40 text-white text-center w-20 h-10 rounded font-bold"
                  min="1"
                  max={item.quantity}
                />
                <button
                  onClick={() => setUseQuantity(Math.min(item.quantity, useQuantity + 1))}
                  disabled={isProcessing}
                  className="bg-gray-700 hover:bg-gray-600 text-white w-10 h-10 rounded font-bold"
                >
                  +
                </button>
                <button
                  onClick={() => setUseQuantity(item.quantity)}
                  disabled={isProcessing}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-3 h-10 rounded text-sm"
                >
                  Max
                </button>
              </div>

              {/* Use Button */}
              <Button
                onClick={handleUse}
                disabled={isProcessing}
                className="w-full"
              >
                {isProcessing ? 'Using...' : `Use ${useQuantity}x ${item.name}`}
              </Button>
            </div>
          )}

          {/* Materials Info */}
          {item.item_type === 'material' && (
            <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4">
              <p className="text-blue-200 text-sm text-center">
                Materials are used for upgrades and enhancements
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemModal;
