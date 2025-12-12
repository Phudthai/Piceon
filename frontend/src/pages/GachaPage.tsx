import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useState, useEffect } from 'react';
import api from '@/services/api';

interface Banner {
  id: number;
  name: string;
  description: string;
  type: 'Normal' | 'Premium';
  cost_gems: number;
  cost_gold: number;
  multi_pull_gems: number;
  multi_pull_gold: number;
}

interface Character {
  id: number;
  name: string;
  type: string;
  rarity: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  base_atk: number;
  base_def: number;
  base_hp: number;
}

export default function GachaPage() {
  const { user, logout, updateUser } = useAuthStore();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [selectedBanner, setSelectedBanner] = useState<number>(1);
  const [pulling, setPulling] = useState(false);
  const [result, setResult] = useState<Character[] | null>(null);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
    try {
      const response = await api.get('/gacha/banners');
      setBanners(response.data.data);
    } catch (error) {
      console.error('Failed to load banners:', error);
    }
  };

  const handlePull = async (isMulti: boolean = false) => {
    setPulling(true);
    setResult(null);
    try {
      const endpoint = isMulti ? '/gacha/pull-10' : '/gacha/pull';
      const response = await api.post(endpoint, { bannerId: selectedBanner });

      const characters = isMulti ? response.data.data.characters : [response.data.data.character];
      setResult(characters);

      // Update user resources
      updateUser({
        gems: response.data.data.user.gems,
        gold: response.data.data.user.gold
      });
    } catch (error: any) {
      alert(error.response?.data?.message || 'Pull failed');
    } finally {
      setPulling(false);
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

  const banner = banners.find(b => b.id === selectedBanner);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-pink-900 to-red-900 p-4">
      <nav className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <Link to="/" className="text-white text-2xl font-bold">🎮 Piceon</Link>
        <div className="flex gap-4 items-center">
          <span className="text-yellow-400">💎 {user?.gems}</span>
          <span className="text-amber-400">🪙 {user?.gold}</span>
          <Link to="/inventory" className="text-white hover:text-gray-300">📦 Inventory</Link>
          <button onClick={logout} className="text-red-300 hover:text-red-200">Logout</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">🎲 Gacha System</h1>

        {/* Banner Selection */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {banners.map(b => (
            <div
              key={b.id}
              onClick={() => setSelectedBanner(b.id)}
              className={`bg-white/10 backdrop-blur-md rounded-lg p-6 cursor-pointer transition ${
                selectedBanner === b.id ? 'ring-4 ring-yellow-400' : 'hover:bg-white/20'
              }`}
            >
              <h2 className="text-2xl font-bold text-white mb-2">{b.name}</h2>
              <p className="text-gray-300 mb-4">{b.description}</p>
              <div className="flex gap-4">
                <span className="text-sm">
                  Single: {b.cost_gems > 0 ? `💎 ${b.cost_gems}` : `🪙 ${b.cost_gold}`}
                </span>
                <span className="text-sm">
                  10x: {b.multi_pull_gems > 0 ? `💎 ${b.multi_pull_gems}` : `🪙 ${b.multi_pull_gold}`}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Pull Buttons */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => handlePull(false)}
            disabled={pulling}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-4 px-8 rounded-lg text-xl"
          >
            {pulling ? 'Pulling...' : `Single Pull ${banner?.cost_gems ? `💎 ${banner.cost_gems}` : `🪙 ${banner?.cost_gold}`}`}
          </button>
          <button
            onClick={() => handlePull(true)}
            disabled={pulling}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-4 px-8 rounded-lg text-xl"
          >
            {pulling ? 'Pulling...' : `10x Pull ${banner?.multi_pull_gems ? `💎 ${banner.multi_pull_gems}` : `🪙 ${banner?.multi_pull_gold}`}`}
          </button>
        </div>

        {/* Results */}
        {result && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">
              {result.length === 1 ? '✨ You got:' : '✨ Your pulls:'}
            </h2>
            <div className="grid md:grid-cols-5 gap-4">
              {result.map((char, idx) => (
                <div
                  key={idx}
                  className={`border-2 rounded-lg p-4 ${getRarityColor(char.rarity)}`}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-2">⚔️</div>
                    <h3 className="font-bold mb-1">{char.name}</h3>
                    <p className="text-sm opacity-80">{char.type}</p>
                    <p className="text-xs mt-2">{char.rarity}</p>
                    <div className="text-xs mt-2 opacity-70">
                      <div>⚔️ {char.base_atk}</div>
                      <div>🛡️ {char.base_def}</div>
                      <div>❤️ {char.base_hp}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
