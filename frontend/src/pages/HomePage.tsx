import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';

export default function HomePage() {
  const { isAuthenticated, user } = useAuthStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center">
        <h1 className="text-6xl font-bold text-white mb-4">
          🎮 Piceon
        </h1>
        <p className="text-2xl text-gray-200 mb-8">
          Idle RPG Adventure
        </p>

        {isAuthenticated && user ? (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">
              Welcome back, {user.username}!
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-yellow-500/20 rounded-lg p-4">
                <p className="text-yellow-200 text-sm">Gems</p>
                <p className="text-3xl font-bold text-yellow-400">💎 {user.gems}</p>
              </div>
              <div className="bg-amber-500/20 rounded-lg p-4">
                <p className="text-amber-200 text-sm">Gold</p>
                <p className="text-3xl font-bold text-amber-400">🪙 {user.gold}</p>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Link
                to="/gacha"
                className="px-8 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition"
              >
                🎲 Gacha
              </Link>
              <Link
                to="/inventory"
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
              >
                📦 Inventory
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-8">
            <p className="text-xl text-gray-200 mb-6">
              Start your adventure today!
            </p>
            <Link
              to="/login"
              className="inline-block px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition"
            >
              Login / Register
            </Link>
          </div>
        )}

        <div className="mt-12 text-gray-300 text-sm">
          <p>Phase 1: Character System | Gacha System | Inventory System</p>
        </div>
      </div>
    </div>
  );
}
