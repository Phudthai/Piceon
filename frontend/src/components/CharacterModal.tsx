import { useState, useEffect } from 'react';
import api from '@/services/api';
import { useAuthStore } from '@/stores/useAuthStore';
import { characterService } from '@/services/character.service';
import { useEquipmentStore } from '@/stores/useEquipmentStore';
import SkillCard from './ui/SkillCard';

interface Character {
  id: number;
  template_id: number;
  name: string;
  type: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  level: number;
  experience: number;
  current_atk: number;
  current_def: number;
  current_hp: number;
  is_locked: boolean;
  is_favorite: boolean;
  obtained_at: string;
  equipment_weapon_id?: number;
  equipment_armor_id?: number;
  equipment_accessory_id?: number;
  equipment_artifact_id?: number;
  total_atk?: number;
  total_def?: number;
  total_hp?: number;
}

interface CharacterModalProps {
  character: Character;
  onClose: () => void;
  onUpdate: () => void;
}

export default function CharacterModal({ character, onClose, onUpdate }: CharacterModalProps) {
  const { user, updateUser } = useAuthStore();
  const { equipment, fetchEquipment, unequip } = useEquipmentStore();
  const [upgrading, setUpgrading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [skills, setSkills] = useState<any[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [showEquipmentSelector, setShowEquipmentSelector] = useState<string | null>(null);

  const upgradeCost = Math.floor(100 * Math.pow(1.5, character.level));
  const canAfford = (user?.gold || 0) >= upgradeCost;

  // Get equipped items
  const equippedWeapon = equipment.find(e => e.id === character.equipment_weapon_id);
  const equippedArmor = equipment.find(e => e.id === character.equipment_armor_id);
  const equippedAccessory = equipment.find(e => e.id === character.equipment_accessory_id);
  const equippedArtifact = equipment.find(e => e.id === character.equipment_artifact_id);

  useEffect(() => {
    loadSkills();
    fetchEquipment();
  }, [character.template_id, character.level]);

  const loadSkills = async () => {
    try {
      const skillsData = await characterService.getCharacterSkills(character.template_id, character.level);
      setSkills(skillsData);
    } catch (error) {
      console.error('Failed to load skills:', error);
    } finally {
      setLoadingSkills(false);
    }
  };

  const handleUnequip = async (equipmentId: number) => {
    try {
      await unequip(equipmentId);
      onUpdate();
      await fetchEquipment();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to unequip');
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Legendary': return 'text-yellow-400 bg-yellow-900/30 border-yellow-500';
      case 'Epic': return 'text-purple-400 bg-purple-900/30 border-purple-500';
      case 'Rare': return 'text-blue-400 bg-blue-900/30 border-blue-500';
      default: return 'text-gray-400 bg-gray-900/30 border-gray-500';
    }
  };

  const handleUpgrade = async () => {
    if (!canAfford) {
      alert('Insufficient gold!');
      return;
    }

    setUpgrading(true);
    try {
      const response = await api.put(`/inventory/${character.id}/upgrade`);

      // Update user gold
      if (user) {
        updateUser({ gold: user.gold - upgradeCost });
      }

      alert(`✨ ${character.name} upgraded to Level ${response.data.data.character.level}!`);
      onUpdate();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Upgrade failed');
    } finally {
      setUpgrading(false);
    }
  };

  const handleToggleLock = async () => {
    setToggling(true);
    try {
      await api.put(`/inventory/${character.id}/lock`, { locked: !character.is_locked });
      onUpdate();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to toggle lock');
    } finally {
      setToggling(false);
    }
  };

  const handleToggleFavorite = async () => {
    setToggling(true);
    try {
      await api.put(`/inventory/${character.id}/favorite`, { favorite: !character.is_favorite });
      onUpdate();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to toggle favorite');
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (character.is_locked) {
      alert('Cannot delete locked character!');
      return;
    }

    if (!confirm(`Are you sure you want to sell ${character.name}?`)) {
      return;
    }

    try {
      const response = await api.delete(`/inventory/${character.id}`);
      const goldReward = response.data.data.goldReward;

      // Update user gold
      if (user) {
        updateUser({ gold: user.gold + goldReward });
      }

      alert(`Sold ${character.name} for ${goldReward} gold!`);
      onUpdate();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete character');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className={`bg-gray-900 rounded-lg p-6 max-w-md w-full border-2 ${getRarityColor(character.rarity)}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{character.name}</h2>
            <p className="text-gray-400">{character.type} • {character.rarity}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">×</button>
        </div>

        {/* Character Icon */}
        <div className="text-center mb-4">
          <div className="text-6xl mb-2">⚔️</div>
          <div className="text-3xl font-bold text-white mb-2">Level {character.level}</div>
        </div>

        {/* Stats */}
        <div className="bg-black/30 rounded-lg p-4 mb-4">
          <h3 className="text-white font-bold mb-2">Stats</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl">⚔️</div>
              <div className="text-white font-bold">
                {character.total_atk || character.current_atk}
                {character.total_atk && character.total_atk > character.current_atk && (
                  <span className="text-green-400 text-sm ml-1">
                    (+{character.total_atk - character.current_atk})
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400">ATK</div>
            </div>
            <div>
              <div className="text-2xl">🛡️</div>
              <div className="text-white font-bold">
                {character.total_def || character.current_def}
                {character.total_def && character.total_def > character.current_def && (
                  <span className="text-green-400 text-sm ml-1">
                    (+{character.total_def - character.current_def})
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400">DEF</div>
            </div>
            <div>
              <div className="text-2xl">❤️</div>
              <div className="text-white font-bold">
                {character.total_hp || character.current_hp}
                {character.total_hp && character.total_hp > character.current_hp && (
                  <span className="text-green-400 text-sm ml-1">
                    (+{character.total_hp - character.current_hp})
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400">HP</div>
            </div>
          </div>
        </div>

        {/* Equipment Slots */}
        <div className="bg-black/30 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-white font-bold">Equipment</h3>
            <a href="/equipment" className="text-xs text-blue-400 hover:text-blue-300">
              View All →
            </a>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {/* Weapon Slot */}
            <div className="bg-black/40 rounded-lg p-3 border border-gray-700 hover:border-gray-500 transition">
              <div className="text-xs text-gray-400 mb-1">⚔️ Weapon</div>
              {equippedWeapon ? (
                <div className="space-y-1">
                  <div className="text-white text-sm font-bold truncate">{equippedWeapon.name}</div>
                  <div className="text-xs text-green-400">+{equippedWeapon.current_primary_stat} {equippedWeapon.primary_stat.toUpperCase()}</div>
                  <button
                    onClick={() => handleUnequip(equippedWeapon.id)}
                    className="text-xs text-red-400 hover:text-red-300 mt-1"
                  >
                    Unequip
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-gray-500 text-sm">Empty</div>
                  <a href="/equipment" className="text-xs text-blue-400 hover:text-blue-300">
                    Equip →
                  </a>
                </div>
              )}
            </div>

            {/* Armor Slot */}
            <div className="bg-black/40 rounded-lg p-3 border border-gray-700 hover:border-gray-500 transition">
              <div className="text-xs text-gray-400 mb-1">🛡️ Armor</div>
              {equippedArmor ? (
                <div className="space-y-1">
                  <div className="text-white text-sm font-bold truncate">{equippedArmor.name}</div>
                  <div className="text-xs text-green-400">+{equippedArmor.current_primary_stat} {equippedArmor.primary_stat.toUpperCase()}</div>
                  <button
                    onClick={() => handleUnequip(equippedArmor.id)}
                    className="text-xs text-red-400 hover:text-red-300 mt-1"
                  >
                    Unequip
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-gray-500 text-sm">Empty</div>
                  <a href="/equipment" className="text-xs text-blue-400 hover:text-blue-300">
                    Equip →
                  </a>
                </div>
              )}
            </div>

            {/* Accessory Slot */}
            <div className="bg-black/40 rounded-lg p-3 border border-gray-700 hover:border-gray-500 transition">
              <div className="text-xs text-gray-400 mb-1">💍 Accessory</div>
              {equippedAccessory ? (
                <div className="space-y-1">
                  <div className="text-white text-sm font-bold truncate">{equippedAccessory.name}</div>
                  <div className="text-xs text-green-400">+{equippedAccessory.current_primary_stat} {equippedAccessory.primary_stat.toUpperCase()}</div>
                  <button
                    onClick={() => handleUnequip(equippedAccessory.id)}
                    className="text-xs text-red-400 hover:text-red-300 mt-1"
                  >
                    Unequip
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-gray-500 text-sm">Empty</div>
                  <a href="/equipment" className="text-xs text-blue-400 hover:text-blue-300">
                    Equip →
                  </a>
                </div>
              )}
            </div>

            {/* Artifact Slot */}
            <div className="bg-black/40 rounded-lg p-3 border border-gray-700 hover:border-gray-500 transition">
              <div className="text-xs text-gray-400 mb-1">✨ Artifact</div>
              {equippedArtifact ? (
                <div className="space-y-1">
                  <div className="text-white text-sm font-bold truncate">{equippedArtifact.name}</div>
                  <div className="text-xs text-green-400">+{equippedArtifact.current_primary_stat} {equippedArtifact.primary_stat.toUpperCase()}</div>
                  <button
                    onClick={() => handleUnequip(equippedArtifact.id)}
                    className="text-xs text-red-400 hover:text-red-300 mt-1"
                  >
                    Unequip
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-gray-500 text-sm">Empty</div>
                  <a href="/equipment" className="text-xs text-blue-400 hover:text-blue-300">
                    Equip →
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="bg-black/30 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
          <h3 className="text-white font-bold mb-2">Skills</h3>
          {loadingSkills ? (
            <div className="text-gray-400 text-center py-4">Loading skills...</div>
          ) : skills.length === 0 ? (
            <div className="text-gray-400 text-center py-4">No skills available</div>
          ) : (
            <div className="space-y-2">
              {skills.map(skill => (
                <SkillCard key={skill.id} skill={skill} compact={false} />
              ))}
            </div>
          )}
        </div>

        {/* Upgrade Section */}
        <div className="bg-green-900/30 border border-green-500 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-white font-bold">Upgrade</h3>
            <div className="text-amber-400">🪙 {upgradeCost}</div>
          </div>
          <p className="text-sm text-gray-300 mb-3">
            Level {character.level} → {character.level + 1}
          </p>
          <button
            onClick={handleUpgrade}
            disabled={upgrading || !canAfford}
            className={`w-full py-2 rounded-lg font-bold ${
              canAfford
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            {upgrading ? 'Upgrading...' : canAfford ? 'Upgrade Now' : 'Insufficient Gold'}
          </button>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={handleToggleLock}
            disabled={toggling}
            className={`py-2 rounded-lg font-bold ${
              character.is_locked
                ? 'bg-gray-600 hover:bg-gray-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {character.is_locked ? '🔒 Locked' : '🔓 Unlocked'}
          </button>
          <button
            onClick={handleToggleFavorite}
            disabled={toggling}
            className={`py-2 rounded-lg font-bold ${
              character.is_favorite
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-gray-600 hover:bg-gray-700 text-white'
            }`}
          >
            {character.is_favorite ? '❤️ Favorite' : '🤍 Add to Favorite'}
          </button>
        </div>

        {/* Delete Button */}
        <button
          onClick={handleDelete}
          disabled={character.is_locked}
          className={`w-full py-2 rounded-lg font-bold ${
            character.is_locked
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {character.is_locked ? '🔒 Cannot Sell (Locked)' : '💰 Sell Character'}
        </button>

        {/* Info */}
        <div className="mt-4 text-center text-xs text-gray-400">
          Obtained: {new Date(character.obtained_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
