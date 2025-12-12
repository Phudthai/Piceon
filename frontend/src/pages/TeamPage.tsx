import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useBattleStore } from '@/stores/useBattleStore';
import { useEffect, useState } from 'react';
import api from '@/services/api';

interface Character {
  id: number;
  name: string;
  type: string;
  rarity: string;
  level: number;
  current_atk: number;
  current_def: number;
  current_hp: number;
}

export default function TeamPage() {
  const { user, logout } = useAuthStore();
  const { teams, activeTeam, loadTeams, loadActiveTeam, createTeam, updateTeam, setActiveTeam, deleteTeam } = useBattleStore();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [teamSlots, setTeamSlots] = useState<{ [key: string]: number | null }>({
    slot_1: null,
    slot_2: null,
    slot_3: null,
    slot_4: null,
    slot_5: null
  });
  const [filterType, setFilterType] = useState<string>('All');
  const [filterRarity, setFilterRarity] = useState<string>('All');

  useEffect(() => {
    loadTeams();
    loadActiveTeam();
    loadCharacters();
  }, []);

  const loadCharacters = async () => {
    try {
      const response = await api.get('/inventory');
      setCharacters(response.data.data.characters || []);
    } catch (error) {
      console.error('Failed to load characters:', error);
    }
  };

  const handleSlotClick = (slot: string, charId: number | null) => {
    if (charId) {
      setTeamSlots({ ...teamSlots, [slot]: null });
    }
  };

  const handleCharacterClick = (char: Character) => {
    const emptySlot = Object.keys(teamSlots).find(key => teamSlots[key] === null);
    if (emptySlot) {
      setTeamSlots({ ...teamSlots, [emptySlot]: char.id });
    }
  };

  const handleEditTeam = (team: any) => {
    setSelectedTeam(team.id);
    setTeamSlots({
      slot_1: team.slot_1,
      slot_2: team.slot_2,
      slot_3: team.slot_3,
      slot_4: team.slot_4,
      slot_5: team.slot_5
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setSelectedTeam(null);
    setTeamSlots({ slot_1: null, slot_2: null, slot_3: null, slot_4: null, slot_5: null });
  };

  const handleSaveTeam = async () => {
    try {
      if (selectedTeam) {
        await updateTeam(selectedTeam, { slots: teamSlots });
        alert('Team updated!');
      } else {
        await createTeam('New Team', teamSlots);
        alert('Team created!');
      }
      setTeamSlots({ slot_1: null, slot_2: null, slot_3: null, slot_4: null, slot_5: null });
      setSelectedTeam(null);
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDeleteTeam = async (teamId: number, teamName: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${teamName}"?`);
    if (!confirmed) return;

    try {
      await deleteTeam(teamId);
      alert('Team deleted!');
      // If deleted team was being edited, clear the selection
      if (selectedTeam === teamId) {
        setSelectedTeam(null);
        setTeamSlots({ slot_1: null, slot_2: null, slot_3: null, slot_4: null, slot_5: null });
      }
    } catch (error: any) {
      alert(error.message);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'Legendary': return 'text-yellow-400 border-yellow-500';
      case 'Epic': return 'text-purple-400 border-purple-500';
      case 'Rare': return 'text-blue-400 border-blue-500';
      default: return 'text-gray-400 border-gray-500';
    }
  };

  const getCharById = (id: number | null) => characters.find(c => c.id === id);

  const filteredCharacters = characters.filter(char => {
    const typeMatch = filterType === 'All' || char.type === filterType;
    const rarityMatch = filterRarity === 'All' || char.rarity === filterRarity;
    return typeMatch && rarityMatch;
  });

  const characterTypes = ['All', ...Array.from(new Set(characters.map(c => c.type)))];
  const characterRarities = ['All', 'Common', 'Rare', 'Epic', 'Legendary'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
      <nav className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <Link to="/" className="text-white text-2xl font-bold">🎮 Piceon</Link>
        <div className="flex gap-4 items-center">
          <span className="text-yellow-400">💎 {user?.gems}</span>
          <span className="text-amber-400">🪙 {user?.gold}</span>
          <Link to="/battle" className="text-white hover:text-gray-300">⚔️ Battle</Link>
          <Link to="/gacha" className="text-white hover:text-gray-300">🎲 Gacha</Link>
          <Link to="/inventory" className="text-white hover:text-gray-300">📦 Inventory</Link>
          <button onClick={logout} className="text-red-300 hover:text-red-200">Logout</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">⚔️ Team Formation</h1>

        {/* Team Slots */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">
              {selectedTeam ? '✏️ Editing Team' : '➕ New Team'}
            </h2>
            {selectedTeam && (
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
              >
                ❌ Cancel
              </button>
            )}
          </div>
          <div className="grid grid-cols-5 gap-4 mb-4">
            {['slot_1', 'slot_2', 'slot_3', 'slot_4', 'slot_5'].map((slot, idx) => {
              const char = getCharById(teamSlots[slot]);
              return (
                <div
                  key={slot}
                  onClick={() => handleSlotClick(slot, teamSlots[slot])}
                  className={`border-2 rounded-lg p-4 cursor-pointer hover:bg-white/10 ${
                    char ? getRarityColor(char.rarity) : 'border-gray-600 border-dashed'
                  }`}
                >
                  {char ? (
                    <div className="text-center">
                      <div className="text-3xl mb-1">⚔️</div>
                      <div className="text-white text-xs font-bold truncate">{char.name}</div>
                      <div className="text-xs">Lv.{char.level}</div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500">
                      <div className="text-3xl mb-1">+</div>
                      <div className="text-xs">Slot {idx + 1}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button
            onClick={handleSaveTeam}
            className={`w-full font-bold py-3 rounded-lg ${
              selectedTeam
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-green-600 hover:bg-green-700'
            } text-white`}
          >
            {selectedTeam ? '💾 Update Team' : '➕ Create Team'}
          </button>
        </div>

        {/* Character Selection */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Select Characters</h2>

          {/* Filters */}
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <label className="text-white text-sm mb-1 block">Filter by Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full bg-white/10 text-white border border-gray-500 rounded px-3 py-2"
              >
                {characterTypes.map(type => (
                  <option key={type} value={type} className="bg-gray-800">{type}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="text-white text-sm mb-1 block">Filter by Rarity</label>
              <select
                value={filterRarity}
                onChange={(e) => setFilterRarity(e.target.value)}
                className="w-full bg-white/10 text-white border border-gray-500 rounded px-3 py-2"
              >
                {characterRarities.map(rarity => (
                  <option key={rarity} value={rarity} className="bg-gray-800">{rarity}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setFilterType('All'); setFilterRarity('All'); }}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
              >
                Clear Filters
              </button>
            </div>
          </div>

          <div className="text-white text-sm mb-2">
            Showing {filteredCharacters.length} of {characters.length} characters
          </div>

          <div className="grid grid-cols-5 gap-4 max-h-96 overflow-y-auto">
            {filteredCharacters.map(char => (
              <div
                key={char.id}
                onClick={() => handleCharacterClick(char)}
                className={`border-2 rounded-lg p-3 cursor-pointer hover:scale-105 transition ${getRarityColor(char.rarity)}`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-1">⚔️</div>
                  <div className="text-white text-xs font-bold truncate">{char.name}</div>
                  <div className="text-xs">Lv.{char.level}</div>
                  <div className="text-xs opacity-70">
                    <div>⚔️{char.current_atk}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Existing Teams */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4">My Teams</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {teams.map(team => (
              <div
                key={team.id}
                className={`border-2 rounded-lg p-4 ${
                  team.is_active ? 'border-green-500 bg-green-900/20' : 'border-gray-600'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-white font-bold">{team.name}</h3>
                  {team.is_active && <span className="text-green-400 text-sm">✅ Active</span>}
                </div>
                <div className="text-sm text-gray-300 mb-3">
                  {[team.slot_1, team.slot_2, team.slot_3, team.slot_4, team.slot_5].filter(s => s !== null).length} / 5 characters
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleEditTeam(team)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white py-2 rounded font-bold"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => setActiveTeam(team.id)}
                    disabled={team.is_active}
                    className={`py-2 rounded font-bold ${
                      team.is_active
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {team.is_active ? '✅ Active' : 'Set Active'}
                  </button>
                  <button
                    onClick={() => handleDeleteTeam(team.id, team.name)}
                    className="bg-red-600 hover:bg-red-700 text-white py-2 rounded font-bold"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
