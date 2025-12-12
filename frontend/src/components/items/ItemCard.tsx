/**
 * Item Card Component
 * Displays stackable items (materials, consumables, special) with quantity
 */

import React from 'react';
import { InventoryItem } from '@/services/item.service';

interface ItemCardProps {
  item: InventoryItem;
  onClick: () => void;
}

const ItemCard: React.FC<ItemCardProps> = ({ item, onClick }) => {
  // Rarity colors
  const rarityColors: Record<string, string> = {
    Common: 'bg-gray-600 border-gray-500',
    Rare: 'bg-blue-600 border-blue-500',
    Epic: 'bg-purple-600 border-purple-500',
    Legendary: 'bg-yellow-600 border-yellow-500',
    Mythic: 'bg-red-600 border-red-500'
  };

  // Item type icons
  const typeIcons: Record<string, string> = {
    material: '™',
    consumable: '>ê',
    special: '('
  };

  // Category-specific icons
  const categoryIcons: Record<string, string> = {
    exp_potion: '=Ö',
    level_stone: '=Ž',
    enhancement_stone: '=(',
    star_stone: 'P',
    character_soul: '={',
    elemental_essence: '=%',
    stamina_potion: '¡',
    gold_boost: '>™',
    exp_boost: '=È',
    gacha_ticket: '<«',
    inventory_expansion: '=æ'
  };

  const getIcon = () => {
    return categoryIcons[item.category] || typeIcons[item.item_type] || '=æ';
  };

  return (
    <div
      onClick={onClick}
      className={`
        ${rarityColors[item.rarity]}
        border-2 rounded-lg p-4 cursor-pointer
        hover:brightness-110 transition-all duration-200
        hover:scale-105 hover:shadow-lg
        relative
      `}
    >
      {/* Quantity Badge */}
      <div className="absolute top-2 right-2 bg-black/70 text-white text-sm font-bold px-2 py-1 rounded">
        x{item.quantity}
      </div>

      {/* Item Icon */}
      <div className="text-center mb-2">
        <span className="text-4xl">{getIcon()}</span>
      </div>

      {/* Item Name */}
      <h3 className="text-white font-bold text-center mb-1 text-sm">
        {item.name}
      </h3>

      {/* Rarity */}
      <p className="text-white text-center text-xs opacity-80 mb-2">
        {item.rarity}
      </p>

      {/* Item Type Badge */}
      <div className="text-center">
        <span className="bg-black/40 text-white text-xs px-2 py-1 rounded capitalize">
          {item.item_type}
        </span>
      </div>

      {/* Max Stack Indicator */}
      <div className="mt-2 text-center">
        <span className="text-gray-300 text-xs">
          Max: {item.max_stack}
        </span>
      </div>
    </div>
  );
};

export default ItemCard;
