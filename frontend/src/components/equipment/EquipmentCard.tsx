/**
 * Equipment Card Component
 * Displays equipment in grid view with rarity colors and stats
 */

import React from 'react';
import { Equipment } from '@/services/equipment.service';

interface EquipmentCardProps {
  equipment: Equipment;
  onClick: () => void;
}

const EquipmentCard: React.FC<EquipmentCardProps> = ({ equipment, onClick }) => {
  // Rarity colors
  const rarityColors: Record<string, string> = {
    Common: 'bg-gray-600 border-gray-500',
    Rare: 'bg-blue-600 border-blue-500',
    Epic: 'bg-purple-600 border-purple-500',
    Legendary: 'bg-yellow-600 border-yellow-500',
    Mythic: 'bg-red-600 border-red-500'
  };

  // Equipment type icons/emojis
  const typeIcons: Record<string, string> = {
    weapon: 'î',
    armor: '=·',
    accessory: '=ç',
    artifact: '('
  };

  // Primary stat display
  const statIcon: Record<string, string> = {
    atk: 'î',
    def: '=·',
    hp: 'd'
  };

  // Generate stars display
  const renderStars = () => {
    const stars = [];
    for (let i = 0; i < equipment.max_stars; i++) {
      stars.push(
        <span key={i} className={i < equipment.stars ? 'text-yellow-400' : 'text-gray-600'}>
          
        </span>
      );
    }
    return stars;
  };

  return (
    <div
      onClick={onClick}
      className={`
        ${rarityColors[equipment.rarity]}
        border-2 rounded-lg p-4 cursor-pointer
        hover:brightness-110 transition-all duration-200
        hover:scale-105 hover:shadow-lg
        relative
      `}
    >
      {/* Lock indicator */}
      {equipment.is_locked && (
        <div className="absolute top-2 left-2 text-yellow-400 text-xl">
          =
        </div>
      )}

      {/* Equipped indicator */}
      {equipment.is_equipped && (
        <div className="absolute top-2 right-2 text-green-400 text-xl">
          
        </div>
      )}

      {/* Equipment Type Icon */}
      <div className="text-center mb-2">
        <span className="text-4xl">{typeIcons[equipment.equipment_type]}</span>
      </div>

      {/* Equipment Name */}
      <h3 className="text-white font-bold text-center mb-1 text-sm">
        {equipment.name}
      </h3>

      {/* Rarity */}
      <p className="text-white text-center text-xs opacity-80 mb-2">
        {equipment.rarity}
      </p>

      {/* Level */}
      <div className="text-center mb-2">
        <span className="text-white text-sm font-bold">
          Lv {equipment.level}/{equipment.max_level}
        </span>
      </div>

      {/* Stars */}
      <div className="text-center mb-2 text-xs">
        {renderStars()}
      </div>

      {/* Primary Stat */}
      <div className="bg-black/30 rounded p-2 mb-2">
        <div className="text-center">
          <span className="text-white text-xs">
            {statIcon[equipment.primary_stat]} {equipment.primary_stat.toUpperCase()}
          </span>
          <div className="text-green-400 font-bold">
            +{equipment.current_primary_stat}
          </div>
        </div>
      </div>

      {/* Sub-stats (if any) */}
      {(equipment.sub_stat_1_type || equipment.sub_stat_2_type || equipment.sub_stat_3_type) && (
        <div className="bg-black/20 rounded p-2 text-xs">
          {equipment.sub_stat_1_type && (
            <div className="text-white flex justify-between">
              <span>{equipment.sub_stat_1_type.toUpperCase()}</span>
              <span className="text-blue-300">+{equipment.sub_stat_1_value}</span>
            </div>
          )}
          {equipment.sub_stat_2_type && (
            <div className="text-white flex justify-between">
              <span>{equipment.sub_stat_2_type.toUpperCase()}</span>
              <span className="text-blue-300">+{equipment.sub_stat_2_value}</span>
            </div>
          )}
          {equipment.sub_stat_3_type && (
            <div className="text-white flex justify-between">
              <span>{equipment.sub_stat_3_type.toUpperCase()}</span>
              <span className="text-blue-300">+{equipment.sub_stat_3_value}</span>
            </div>
          )}
        </div>
      )}

      {/* Equipment Type Badge */}
      <div className="mt-2 text-center">
        <span className="bg-black/40 text-white text-xs px-2 py-1 rounded">
          {equipment.equipment_type}
        </span>
      </div>
    </div>
  );
};

export default EquipmentCard;
