import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useBattleStore } from '@/stores/useBattleStore';
import { useEffect, useState } from 'react';
import BattleScene from '@/components/BattleScene';

export default function BattlePage() {
  const { user, logout, updateUser } = useAuthStore();
  const { stages, activeTeam, battleResult, isBattling, loadStages, loadActiveTeam, startBattle, clearBattleResult } = useBattleStore();
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [showBattleScene, setShowBattleScene] = useState(false);

  useEffect(() => {
    loadStages();
    loadActiveTeam();
  }, []);

  const handleBattle = async (stageId: number) => {
    if (!activeTeam || activeTeam.characters?.length === 0) {
      alert('Please set up an active team first!');
      return;
    }

    setSelectedStage(stageId);
    setShowBattleScene(true);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-400 bg-green-900/30';
      case 'Normal': return 'text-blue-400 bg-blue-900/30';
      case 'Hard': return 'text-orange-400 bg-orange-900/30';
      case 'Expert': return 'text-red-400 bg-red-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  const handleBattleEnd = (result: any) => {
    setShowBattleScene(false);
    if (result) {
      if (result.result === 'Victory') {
        updateUser({ gold: (user?.gold || 0) + result.rewards.gold });
        loadStages(); // Refresh to update progress
      }
      // Show result modal
      useBattleStore.setState({ battleResult: result });
    }
  };

  const closeBattleResult = () => {
    clearBattleResult();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-orange-900 to-yellow-900 p-4">
      <nav className="max-w-7xl mx-auto mb-8 flex justify-between items-center">
        <Link to="/" className="text-white text-2xl font-bold">🎮 Piceon</Link>
        <div className="flex gap-4 items-center">
          <span className="text-yellow-400">💎 {user?.gems}</span>
          <span className="text-amber-400">🪙 {user?.gold}</span>
          <Link to="/team" className="text-white hover:text-gray-300">⚔️ Team</Link>
          <Link to="/gacha" className="text-white hover:text-gray-300">🎲 Gacha</Link>
          <Link to="/inventory" className="text-white hover:text-gray-300">📦 Inventory</Link>
          <button onClick={logout} className="text-red-300 hover:text-red-200">Logout</button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-2 text-center">⚔️ Battle</h1>

        {/* Active Team Display */}
        {activeTeam && (
          <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 mb-6 text-center">
            <p className="text-white text-sm mb-2">Active Team: <strong>{activeTeam.name}</strong></p>
            <p className="text-gray-300 text-xs">
              {activeTeam.characters?.length || 0} / 5 characters
              {(!activeTeam.characters || activeTeam.characters.length === 0) && (
                <span className="text-red-400 ml-2">⚠️ Team is empty!</span>
              )}
            </p>
          </div>
        )}

        {/* Stages Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stages.map((stage) => (
            <div
              key={stage.id}
              className={`rounded-lg p-6 border-2 ${
                stage.is_unlocked
                  ? 'bg-white/10 backdrop-blur-md border-white/20'
                  : 'bg-gray-900/50 border-gray-700 opacity-50'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-bold text-white">{stage.name}</h3>
                  <p className="text-sm text-gray-300">Stage {stage.stage_number}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${getDifficultyColor(stage.difficulty)}`}>
                  {stage.difficulty}
                </span>
              </div>

              <p className="text-gray-300 text-sm mb-4">{stage.description}</p>

              <div className="text-xs text-gray-400 mb-4">
                <div>💪 Recommended: {stage.recommended_power}</div>
                {stage.times_completed > 0 && (
                  <div className="text-green-400">✅ Cleared {stage.times_completed}x</div>
                )}
              </div>

              {stage.is_unlocked ? (
                <button
                  onClick={() => handleBattle(stage.id)}
                  disabled={isBattling}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-bold py-2 rounded"
                >
                  {isBattling && selectedStage === stage.id ? 'Battling...' : '⚔️ Start Battle'}
                </button>
              ) : (
                <button disabled className="w-full bg-gray-600 text-gray-400 font-bold py-2 rounded cursor-not-allowed">
                  🔒 Locked
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Battle Scene */}
      {showBattleScene && selectedStage && (
        <BattleScene stageId={selectedStage} onBattleEnd={handleBattleEnd} />
      )}

      {/* Battle Result Modal */}
      {battleResult && !showBattleScene && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={closeBattleResult}>
          <div
            className={`rounded-lg p-8 max-w-md w-full text-center ${
              battleResult.result === 'Victory'
                ? 'bg-gradient-to-br from-yellow-600 to-orange-600'
                : 'bg-gradient-to-br from-gray-800 to-gray-900'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-6xl mb-4">{battleResult.result === 'Victory' ? '🎉' : '💀'}</div>
            <h2 className="text-3xl font-bold text-white mb-4">
              {battleResult.result === 'Victory' ? 'VICTORY!' : 'DEFEAT'}
            </h2>
            <p className="text-white mb-4">{battleResult.stage}</p>
            <p className="text-gray-200 mb-6">Turns: {battleResult.turns}</p>

            {battleResult.result === 'Victory' && (
              <div className="bg-black/30 rounded-lg p-4 mb-6">
                <h3 className="text-white font-bold mb-2">Rewards</h3>
                <div className="flex justify-center gap-6">
                  <div>
                    <div className="text-2xl">🪙</div>
                    <div className="text-yellow-400 font-bold">{battleResult.rewards.gold}</div>
                  </div>
                  <div>
                    <div className="text-2xl">⭐</div>
                    <div className="text-blue-400 font-bold">{battleResult.rewards.exp}</div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={closeBattleResult}
              className="bg-white text-black font-bold py-3 px-8 rounded-lg hover:bg-gray-200"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
