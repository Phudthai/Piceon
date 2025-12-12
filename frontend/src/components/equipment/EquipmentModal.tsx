/**
 * Equipment Modal Component
 * Detailed view with upgrade, lock, and sell actions
 */

import React, { useState } from 'react';
import { Equipment } from '@/services/equipment.service';
import { useEquipmentStore } from '@/stores/useEquipmentStore';
import { useAuthStore } from '@/stores/useAuthStore';
import Button from '@/components/ui/Button';

interface EquipmentModalProps {
  equipment: Equipment;
  onClose: () => void;
}

const EquipmentModal: React.FC<EquipmentModalProps> = ({ equipment, onClose }) => {
  const [showConfirmSell, setShowConfirmSell] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const { upgradeLevel, upgradeStar, toggleLock, sellEquipment } = useEquipmentStore();
  const { user, fetchProfile } = useAuthStore();

  // Rarity colors
  const rarityColors: Record<string, string> = {
    Common: 'from-gray-700 to-gray-900',
    Rare: 'from-blue-700 to-blue-900',
    Epic: 'from-purple-700 to-purple-900',
    Legendary: 'from-yellow-700 to-yellow-900',
    Mythic: 'from-red-700 to-red-900'
  };

  const typeIcons: Record<string, string> = {
    weapon: '⚔️',
    armor: '🛡️',
    accessory: '💍',
    artifact: '✨'
  };

  const statIcon: Record<string, string> = {
    atk: '⚔️',
    def: '🛡️',
    hp: '❤️'
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 0; i < equipment.max_stars; i++) {
      stars.push(
        <span key={i} className={i < equipment.stars ? 'text-yellow-400' : 'text-gray-600'}>
          ★
        </span>
      );
    }
    return stars;
  };

  const handleUpgradeLevel = async () => {
    if (equipment.level >= equipment.max_level) {
      alert('Equipment is at max level!');
      return;
    }

    setIsProcessing(true);
    try {
      await upgradeLevel(equipment.id);
      await fetchProfile();
      alert('Equipment upgraded successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to upgrade equipment');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpgradeStar = async () => {
    if (equipment.stars >= equipment.max_stars) {
      alert('Equipment is at max stars!');
      return;
    }

    setIsProcessing(true);
    try {
      await upgradeStar(equipment.id);
      await fetchProfile();
      alert('Star upgraded successfully!');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to upgrade star');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleLock = async () => {
    setIsProcessing(true);
    try {
      await toggleLock(equipment.id);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to toggle lock');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSell = async () => {
    setIsProcessing(true);
    try {
      const goldEarned = await sellEquipment(equipment.id);
      await fetchProfile();
      alert(`Equipment sold for ${goldEarned} gold!`);
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to sell equipment');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`bg-gradient-to-b ${rarityColors[equipment.rarity]} rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <span className="text-5xl">{typeIcons[equipment.equipment_type]}</span>
              <div>
                <h2 className="text-white font-bold text-xl">{equipment.name}</h2>
                <p className="text-white/80 text-sm">{equipment.rarity} {equipment.equipment_type}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:text-gray-300 text-2xl">
              ✕
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Level & Stars */}
          <div className="bg-black/30 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-bold">Level</span>
              <span className="text-white">{equipment.level} / {equipment.max_level}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white font-bold">Stars</span>
              <div className="text-lg">{renderStars()}</div>
            </div>
          </div>

          {/* Primary Stat */}
          <div className="bg-black/30 rounded-lg p-4">
            <h3 className="text-white font-bold mb-2">Primary Stat</h3>
            <div className="flex justify-between items-center">
              <span className="text-white">
                {statIcon[equipment.primary_stat]} {equipment.primary_stat.toUpperCase()}
              </span>
              <span className="text-green-400 font-bold text-xl">
                +{equipment.current_primary_stat}
              </span>
            </div>
            <div className="text-gray-400 text-xs mt-1">
              Base: {equipment.base_value} | Growth: {(equipment.growth_rate - 1) * 100}%/level
            </div>
          </div>

          {/* Sub-stats */}
          {(equipment.sub_stat_1_type || equipment.sub_stat_2_type || equipment.sub_stat_3_type) && (
            <div className="bg-black/30 rounded-lg p-4">
              <h3 className="text-white font-bold mb-2">Sub-stats</h3>
              <div className="space-y-1">
                {equipment.sub_stat_1_type && (
                  <div className="flex justify-between text-white">
                    <span>{equipment.sub_stat_1_type.toUpperCase()}</span>
                    <span className="text-blue-300">+{equipment.sub_stat_1_value}</span>
                  </div>
                )}
                {equipment.sub_stat_2_type && (
                  <div className="flex justify-between text-white">
                    <span>{equipment.sub_stat_2_type.toUpperCase()}</span>
                    <span className="text-blue-300">+{equipment.sub_stat_2_value}</span>
                  </div>
                )}
                {equipment.sub_stat_3_type && (
                  <div className="flex justify-between text-white">
                    <span>{equipment.sub_stat_3_type.toUpperCase()}</span>
                    <span className="text-blue-300">+{equipment.sub_stat_3_value}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div className="bg-black/30 rounded-lg p-4">
            <p className="text-white/80 text-sm">{equipment.description}</p>
          </div>

          {/* Status */}
          <div className="flex gap-2">
            {equipment.is_equipped && (
              <span className="bg-green-600 text-white text-sm px-3 py-1 rounded">
                Equipped
              </span>
            )}
            {equipment.is_locked && (
              <span className="bg-yellow-600 text-white text-sm px-3 py-1 rounded">
                🔒 Locked
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {/* Upgrade Level */}
            <Button
              onClick={handleUpgradeLevel}
              disabled={isProcessing || equipment.level >= equipment.max_level || equipment.is_equipped}
              className="w-full"
            >
              {equipment.level >= equipment.max_level ? 'Max Level' : 'Upgrade Level'}
            </Button>

            {/* Upgrade Star */}
            <Button
              onClick={handleUpgradeStar}
              disabled={isProcessing || equipment.stars >= equipment.max_stars || equipment.is_equipped}
              className="w-full"
            >
              {equipment.stars >= equipment.max_stars ? 'Max Stars' : 'Upgrade Star ⭐'}
            </Button>

            {/* Lock/Unlock */}
            <Button
              onClick={handleToggleLock}
              disabled={isProcessing || equipment.is_equipped}
              variant="secondary"
              className="w-full"
            >
              {equipment.is_locked ? '🔓 Unlock' : '🔒 Lock'}
            </Button>

            {/* Sell */}
            {!showConfirmSell ? (
              <Button
                onClick={() => setShowConfirmSell(true)}
                disabled={isProcessing || equipment.is_locked || equipment.is_equipped}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                🪙 Sell Equipment
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-white text-center text-sm">
                  Confirm sell? Cannot be undone!
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSell}
                    disabled={isProcessing}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    Confirm Sell
                  </Button>
                  <Button
                    onClick={() => setShowConfirmSell(false)}
                    disabled={isProcessing}
                    variant="secondary"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EquipmentModal;
