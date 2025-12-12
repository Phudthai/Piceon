import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useState, useEffect } from 'react';
import api from '@/services/api';
import CharacterModal from '@/components/CharacterModal';

interface PlayerCharacter {
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
}

export default function InventoryPage() {
  const { user, logout } = useAuthStore();
  const [characters, setCharacters] = useState<PlayerCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('obtained_at');
  const [selectedCharacter, setSelectedCharacter] = useState<PlayerCharacter | null>(null);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const response = await api.get('/inventory');
      setCharacters(response.data.data.characters || []);
    } catch (error) {
      console.error('Failed to load inventory:', error);
    } finally {
      setLoading(false);
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

  const filteredCharacters = characters.filter(char => {
    if (filter === 'all') return true;
    return char.rarity === filter;
  });

  const sortedCharacters = [...filteredCharacters].sort((a, b) => {
    switch (sortBy) {
      case 'level': return b.level - a.level;
      case 'rarity': {
        const rarityOrder = { Legendary: 4, Epic: 3, Rare: 2, Common: 1 };
        return rarityOrder[b.rarity] - rarityOrder[a.rarity];
      }
      case 'atk': return b.current_atk - a.current_atk;
      default: return new Date(b.obtained_at).getTime() - new Date(a.obtained_at).getTime();
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 p-4">
      <nav className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <Link to="/" className="text-white text-2xl font-bold">🎮 Piceon</Link>
        <div className="flex gap-4 items-center">
          <span className="text-yellow-400">💎 {user?.gems}</span>
          <span className="text-amber-400">🪙 {user?.gold}</span>
          <Link to="/gacha" className="text-white hover:text-gray-300">🎲 Gacha</Link>
          <button onClick={logout} className="text-red-300 hover:text-red-200">Logout</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">📦 Inventory ({characters.length})</h1>

        {/* Filters */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 mb-6 flex gap-4 flex-wrap">
          <div>
            <label className="text-white text-sm mr-2">Filter:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-gray-800 text-white px-3 py-1 rounded"
            >
              <option value="all">All Rarities</option>
              <option value="Legendary">Legendary</option>
              <option value="Epic">Epic</option>
              <option value="Rare">Rare</option>
              <option value="Common">Common</option>
            </select>
          </div>

          <div>
            <label className="text-white text-sm mr-2">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-gray-800 text-white px-3 py-1 rounded"
            >
              <option value="obtained_at">Recently Obtained</option>
              <option value="level">Level</option>
              <option value="rarity">Rarity</option>
              <option value="atk">Attack</option>
            </select>
          </div>
        </div>

        {/* Character Grid */}
        {loading ? (
          <div className="text-white text-center text-xl">Loading...</div>
        ) : sortedCharacters.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 text-center">
            <p className="text-white text-xl mb-4">No characters found!</p>
            <Link to="/gacha" className="text-blue-400 hover:text-blue-300">
              Go to Gacha to get your first character
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-4 lg:grid-cols-5 gap-4">
            {sortedCharacters.map(char => (
              <div
                key={char.id}
                onClick={() => setSelectedCharacter(char)}
                className={`border-2 rounded-lg p-4 ${getRarityColor(char.rarity)} hover:scale-105 transition cursor-pointer`}
              >
                <div className="text-center">
                  {char.is_favorite && <span className="text-red-500 text-xl">❤️</span>}
                  {char.is_locked && <span className="text-gray-400 text-xl">🔒</span>}
                  <div className="text-4xl mb-2">⚔️</div>
                  <h3 className="font-bold mb-1">{char.name}</h3>
                  <p className="text-sm opacity-80">{char.type}</p>
                  <p className="text-xs mt-1">{char.rarity}</p>
                  <p className="text-sm font-bold mt-2">Lv. {char.level}</p>
                  <div className="text-xs mt-2 opacity-70">
                    <div>⚔️ {char.current_atk}</div>
                    <div>🛡️ {char.current_def}</div>
                    <div>❤️ {char.current_hp}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Character Modal */}
      {selectedCharacter && (
        <CharacterModal
          character={selectedCharacter}
          onClose={() => setSelectedCharacter(null)}
          onUpdate={() => {
            loadInventory();
            setSelectedCharacter(null);
          }}
        />
      )}
    </div>
  );
}
