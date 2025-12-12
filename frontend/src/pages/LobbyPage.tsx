import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEffect, useState } from 'react';
import api from '@/services/api';

export default function LobbyPage() {
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [inventoryRes, teamsRes, progressRes] = await Promise.all([
        api.get('/inventory'),
        api.get('/teams'),
        api.get('/battles/progress')
      ]);

      setStats({
        characterCount: inventoryRes.data.data.characters?.length || 0,
        teamCount: teamsRes.data.data?.length || 0,
        stagesCleared: progressRes.data.data?.length || 0
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      {/* Header */}
      <nav className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <div className="text-white text-3xl font-bold">🎮 Piceon</div>
        <div className="flex gap-4 items-center">
          <span className="text-yellow-400 font-bold">💎 {user?.gems}</span>
          <span className="text-amber-400 font-bold">🪙 {user?.gold}</span>
          <button onClick={logout} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg">
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Welcome back, {user?.username}!</h1>
          <p className="text-gray-300 text-lg">Choose your adventure</p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 text-center">
            <div className="text-4xl mb-2">📦</div>
            <div className="text-3xl font-bold text-white">{stats?.characterCount || 0}</div>
            <div className="text-gray-300">Characters</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 text-center">
            <div className="text-4xl mb-2">⚔️</div>
            <div className="text-3xl font-bold text-white">{stats?.teamCount || 0}</div>
            <div className="text-gray-300">Teams</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 text-center">
            <div className="text-4xl mb-2">🏆</div>
            <div className="text-3xl font-bold text-white">{stats?.stagesCleared || 0}</div>
            <div className="text-gray-300">Stages Cleared</div>
          </div>
        </div>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Gacha */}
          <Link
            to="/gacha"
            className="bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg p-8 hover:scale-105 transition transform shadow-2xl"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">🎲</div>
              <h2 className="text-2xl font-bold text-white mb-2">Gacha</h2>
              <p className="text-purple-100">Summon new characters</p>
              <div className="mt-4 text-sm text-purple-200">
                Normal: 🪙 100 | Premium: 💎 300
              </div>
            </div>
          </Link>

          {/* Inventory */}
          <Link
            to="/inventory"
            className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg p-8 hover:scale-105 transition transform shadow-2xl"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">📦</div>
              <h2 className="text-2xl font-bold text-white mb-2">Inventory</h2>
              <p className="text-blue-100">Manage your characters</p>
              <div className="mt-4 text-sm text-blue-200">
                Upgrade • Lock • Sell
              </div>
            </div>
          </Link>

          {/* Team Formation */}
          <Link
            to="/team"
            className="bg-gradient-to-br from-green-600 to-teal-600 rounded-lg p-8 hover:scale-105 transition transform shadow-2xl"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">⚔️</div>
              <h2 className="text-2xl font-bold text-white mb-2">Team Formation</h2>
              <p className="text-green-100">Build your battle team</p>
              <div className="mt-4 text-sm text-green-200">
                5 character slots
              </div>
            </div>
          </Link>

          {/* Battle */}
          <Link
            to="/battle"
            className="bg-gradient-to-br from-red-600 to-orange-600 rounded-lg p-8 hover:scale-105 transition transform shadow-2xl"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">⚡</div>
              <h2 className="text-2xl font-bold text-white mb-2">Battle</h2>
              <p className="text-red-100">Fight through stages</p>
              <div className="mt-4 text-sm text-red-200">
                6 stages • Earn rewards
              </div>
            </div>
          </Link>

          {/* Equipment */}
          <Link
            to="/equipment"
            className="bg-gradient-to-br from-amber-600 to-orange-600 rounded-lg p-8 hover:scale-105 transition transform shadow-2xl"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">⚔️</div>
              <h2 className="text-2xl font-bold text-white mb-2">Equipment</h2>
              <p className="text-amber-100">Manage your gear</p>
              <div className="mt-4 text-sm text-amber-200">
                Upgrade • Enhance • Equip
              </div>
            </div>
          </Link>

          {/* Items */}
          <Link
            to="/items"
            className="bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg p-8 hover:scale-105 transition transform shadow-2xl"
          >
            <div className="text-center">
              <div className="text-6xl mb-4">📦</div>
              <h2 className="text-2xl font-bold text-white mb-2">Items</h2>
              <p className="text-cyan-100">Your materials & consumables</p>
              <div className="mt-4 text-sm text-cyan-200">
                Materials • Consumables • Use
              </div>
            </div>
          </Link>

          {/* Coming Soon - Daily Rewards */}
          <div className="bg-gradient-to-br from-yellow-600 to-amber-600 rounded-lg p-8 opacity-50 cursor-not-allowed shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">🎁</div>
              <h2 className="text-2xl font-bold text-white mb-2">Daily Rewards</h2>
              <p className="text-yellow-100">Coming Soon</p>
              <div className="mt-4 text-sm text-yellow-200">
                Login bonuses
              </div>
            </div>
          </div>

          {/* Coming Soon - Profile */}
          <div className="bg-gradient-to-br from-gray-600 to-slate-600 rounded-lg p-8 opacity-50 cursor-not-allowed shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">📊</div>
              <h2 className="text-2xl font-bold text-white mb-2">Profile</h2>
              <p className="text-gray-100">Coming Soon</p>
              <div className="mt-4 text-sm text-gray-200">
                Stats & achievements
              </div>
            </div>
          </div>
        </div>

        {/* Quick Info */}
        <div className="mt-8 bg-white/5 backdrop-blur-md rounded-lg p-6 text-center">
          <p className="text-gray-300 text-sm">
            🎮 <strong>New to Piceon?</strong> Start by summoning characters in <Link to="/gacha" className="text-purple-400 hover:text-purple-300">Gacha</Link>,
            then build your team in <Link to="/team" className="text-green-400 hover:text-green-300">Team Formation</Link>,
            and challenge stages in <Link to="/battle" className="text-red-400 hover:text-red-300">Battle</Link>!
          </p>
        </div>
      </div>
    </div>
  );
}
