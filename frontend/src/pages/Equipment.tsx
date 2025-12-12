/**
 * Equipment Page
 * Displays user's equipment with filters and management
 */

import React, { useEffect, useState } from 'react';
import { useEquipmentStore } from '@/stores/useEquipmentStore';
import { Equipment as EquipmentType } from '@/services/equipment.service';
import EquipmentCard from '@/components/equipment/EquipmentCard';
import EquipmentModal from '@/components/equipment/EquipmentModal';
import Loading from '@/components/ui/Loading';

const Equipment: React.FC = () => {
  const { equipment, loading, error, fetchEquipment } = useEquipmentStore();
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentType | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterRarity, setFilterRarity] = useState<string>('all');

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  // Filter equipment
  const filteredEquipment = equipment.filter(eq => {
    if (filterType !== 'all' && eq.equipment_type !== filterType) return false;
    if (filterRarity !== 'all' && eq.rarity !== filterRarity) return false;
    return true;
  });

  // Group by equipped status
  const equippedEquipment = filteredEquipment.filter(eq => eq.is_equipped);
  const unequippedEquipment = filteredEquipment.filter(eq => !eq.is_equipped);

  if (loading && equipment.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <Loading message="Loading equipment..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black pb-20">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-4 sticky top-0 z-10">
        <h1 className="text-white text-2xl font-bold text-center mb-4">Equipment</h1>

        {/* Filters */}
        <div className="max-w-4xl mx-auto space-y-2">
          {/* Type Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded whitespace-nowrap ${
                filterType === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setFilterType('weapon')}
              className={`px-4 py-2 rounded whitespace-nowrap ${
                filterType === 'weapon'
                  ? 'bg-primary text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              î Weapons
            </button>
            <button
              onClick={() => setFilterType('armor')}
              className={`px-4 py-2 rounded whitespace-nowrap ${
                filterType === 'armor'
                  ? 'bg-primary text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              =· Armor
            </button>
            <button
              onClick={() => setFilterType('accessory')}
              className={`px-4 py-2 rounded whitespace-nowrap ${
                filterType === 'accessory'
                  ? 'bg-primary text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              =ç Accessories
            </button>
            <button
              onClick={() => setFilterType('artifact')}
              className={`px-4 py-2 rounded whitespace-nowrap ${
                filterType === 'artifact'
                  ? 'bg-primary text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              ( Artifacts
            </button>
          </div>

          {/* Rarity Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setFilterRarity('all')}
              className={`px-4 py-2 rounded whitespace-nowrap ${
                filterRarity === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              All Rarities
            </button>
            <button
              onClick={() => setFilterRarity('Common')}
              className={`px-4 py-2 rounded whitespace-nowrap ${
                filterRarity === 'Common'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Common
            </button>
            <button
              onClick={() => setFilterRarity('Rare')}
              className={`px-4 py-2 rounded whitespace-nowrap ${
                filterRarity === 'Rare'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Rare
            </button>
            <button
              onClick={() => setFilterRarity('Epic')}
              className={`px-4 py-2 rounded whitespace-nowrap ${
                filterRarity === 'Epic'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Epic
            </button>
            <button
              onClick={() => setFilterRarity('Legendary')}
              className={`px-4 py-2 rounded whitespace-nowrap ${
                filterRarity === 'Legendary'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Legendary
            </button>
            <button
              onClick={() => setFilterRarity('Mythic')}
              className={`px-4 py-2 rounded whitespace-nowrap ${
                filterRarity === 'Mythic'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Mythic
            </button>
          </div>
        </div>

        {/* Count */}
        <div className="text-center mt-3">
          <span className="text-gray-300 text-sm">
            {filteredEquipment.length} equipment
            {equippedEquipment.length > 0 && ` (${equippedEquipment.length} equipped)`}
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

        {filteredEquipment.length === 0 ? (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-2xl mb-2">No equipment found</p>
            <p className="text-sm">Try different filters or get equipment from battles!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Equipped Equipment */}
            {equippedEquipment.length > 0 && (
              <div>
                <h2 className="text-white text-xl font-bold mb-4"> Equipped</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {equippedEquipment.map(eq => (
                    <EquipmentCard
                      key={eq.id}
                      equipment={eq}
                      onClick={() => setSelectedEquipment(eq)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Unequipped Equipment */}
            {unequippedEquipment.length > 0 && (
              <div>
                {equippedEquipment.length > 0 && (
                  <h2 className="text-white text-xl font-bold mb-4">Inventory</h2>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {unequippedEquipment.map(eq => (
                    <EquipmentCard
                      key={eq.id}
                      equipment={eq}
                      onClick={() => setSelectedEquipment(eq)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Equipment Modal */}
      {selectedEquipment && (
        <EquipmentModal
          equipment={selectedEquipment}
          onClose={() => setSelectedEquipment(null)}
        />
      )}
    </div>
  );
};

export default Equipment;
