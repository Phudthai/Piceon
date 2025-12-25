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
  const [showStageDetail, setShowStageDetail] = useState<number | null>(null);

  useEffect(() => {
    loadStages();
    loadActiveTeam();
  }, []);

  const handleStageClick = (stageId: number, isUnlocked: boolean) => {
    if (!isUnlocked) return;
    setShowStageDetail(stageId);
  };

  const handleStartBattle = async (stageId: number) => {
    if (!activeTeam || !activeTeam.characters || activeTeam.characters.length === 0) {
      alert('Please set up an active team first!');
      return;
    }

    setSelectedStage(stageId);
    setShowStageDetail(null);
    setShowBattleScene(true);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-400 border-green-500/50 bg-green-900/20';
      case 'Normal': return 'text-blue-400 border-blue-500/50 bg-blue-900/20';
      case 'Hard': return 'text-orange-400 border-orange-500/50 bg-orange-900/20';
      case 'Expert': return 'text-red-400 border-red-500/50 bg-red-900/20';
      default: return 'text-gray-400 border-gray-500/50 bg-gray-900/20';
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

  const getActiveTeamPower = () => {
    if (!activeTeam || !activeTeam.characters) return 0;
    return activeTeam.characters.reduce((total, slot) => {
      const char = slot.character;
      // Simple power calculation approximation for display
      return total + (char.current_atk + char.current_def + Math.floor(char.current_hp / 10));
    }, 0);
  };

  const selectedStageData = stages.find(s => s.id === showStageDetail);

  return (
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center bg-fixed bg-no-repeat">
      <div className="min-h-screen bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
        <nav className="max-w-7xl mx-auto mb-8 flex justify-between items-center bg-black/40 backdrop-blur-md p-4 rounded-xl border border-white/10 sticky top-4 z-40">
          <Link to="/" className="text-white text-2xl font-bold flex items-center gap-2">
            <span>🎮</span> Piceon
          </Link>
          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-lg border border-white/5">
              <span className="text-yellow-400">💎 {user?.gems}</span>
            </div>
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-lg border border-white/5">
              <span className="text-amber-400">🪙 {user?.gold}</span>
            </div>
            <Link to="/team" className="text-white hover:text-purple-300 transition">⚔️ Team</Link>
            <Link to="/gacha" className="text-white hover:text-purple-300 transition">🎲 Gacha</Link>
            <Link to="/inventory" className="text-white hover:text-purple-300 transition">📦 Inventory</Link>
            <button onClick={logout} className="text-red-400 hover:text-red-300 transition">Logout</button>
          </div>
        </nav>

        <div className="max-w-5xl mx-auto">
          {/* Hero Section: Active Team */}
          <div className="bg-gradient-to-r from-indigo-900/80 to-purple-900/80 backdrop-blur-md rounded-2xl p-6 mb-12 border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
                  ⚔️ Battle Ready
                </h2>
                <p className="text-purple-200 mb-4">Current Active Team</p>
                
                {activeTeam ? (
                  <div>
                    <div className="text-2xl font-bold text-white mb-1">{activeTeam.name}</div>
                    <div className="text-yellow-400 font-mono text-sm">
                      ⚡ Team Power: {getActiveTeamPower().toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="text-red-300">No active team selected!</div>
                )}
              </div>

              {/* Team Avatars */}
              <div className="flex -space-x-4">
                {activeTeam?.characters && activeTeam.characters.length > 0 ? (
                  activeTeam.characters.map((slot) => (
                    <div key={slot.character.id} className="relative group">
                      <div className="w-16 h-16 rounded-full border-2 border-purple-400 bg-gray-800 overflow-hidden shadow-lg transform group-hover:-translate-y-2 transition duration-300">
                         {/* Placeholder for character image */}
                         <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-900 text-2xl">
                           {slot.character.type === 'Warrior' && '⚔️'}
                           {slot.character.type === 'Mage' && '🔮'}
                           {slot.character.type === 'Archer' && '🏹'}
                           {slot.character.type === 'Tank' && '🛡️'}
                           {slot.character.type === 'Assassin' && '🗡️'}
                         </div>
                      </div>
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition text-xs text-white whitespace-nowrap bg-black/80 px-2 py-1 rounded pointer-events-none z-20">
                        Lv.{slot.character.level}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-400 italic">Empty Team</div>
                )}
              </div>

              <Link 
                to="/team" 
                className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-bold transition flex items-center gap-2"
              >
                ⚙️ Edit Team
              </Link>
            </div>
          </div>

          {/* Stage Map Path */}
          <div className="relative py-8">
            {/* Connecting Line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-green-500 via-blue-500 to-red-500 opacity-30 -translate-x-1/2 rounded-full"></div>

            <div className="space-y-12 relative z-10">
              {stages.map((stage, index) => {
                const isLeft = index % 2 === 0;
                const isUnlocked = stage.is_unlocked;
                
                return (
                  <div 
                    key={stage.id} 
                    className={`flex items-center gap-8 ${isLeft ? 'flex-row' : 'flex-row-reverse'}`}
                  >
                    {/* Stage Node */}
                    <div className={`w-1/2 flex ${isLeft ? 'justify-end' : 'justify-start'}`}>
                      <button
                        onClick={() => handleStageClick(stage.id, isUnlocked)}
                        disabled={!isUnlocked}
                        className={`
                          group relative w-full max-w-sm p-6 rounded-2xl border transition-all duration-300 transform hover:scale-105 text-left
                          ${isUnlocked 
                            ? 'bg-black/40 backdrop-blur-md border-white/10 hover:border-purple-500/50 hover:shadow-[0_0_30px_rgba(168,85,247,0.3)] cursor-pointer' 
                            : 'bg-gray-900/60 border-gray-800 opacity-60 cursor-not-allowed grayscale'}
                        `}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-4xl font-black ${isUnlocked ? 'text-white/20 group-hover:text-purple-500/40' : 'text-gray-700'} transition-colors`}>
                            {String(stage.stage_number).padStart(2, '0')}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getDifficultyColor(stage.difficulty)}`}>
                            {stage.difficulty}
                          </span>
                        </div>
                        
                        <h3 className={`text-xl font-bold mb-1 ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                          {stage.name}
                        </h3>
                        
                        {stage.times_completed > 0 && (
                          <div className="absolute top-4 right-4 text-green-400 text-xl animate-pulse">
                            ✅
                          </div>
                        )}

                        <div className="text-sm text-gray-400 mt-2 flex items-center gap-2">
                          <span>💪 Rec. Power: {stage.recommended_power}</span>
                        </div>
                      </button>
                    </div>

                    {/* Center Point */}
                    <div className="relative">
                      <div className={`w-8 h-8 rounded-full border-4 z-20 relative flex items-center justify-center
                        ${isUnlocked 
                          ? stage.times_completed > 0 ? 'bg-green-500 border-green-300' : 'bg-purple-600 border-purple-400 animate-pulse' 
                          : 'bg-gray-700 border-gray-600'}
                      `}>
                        {stage.times_completed > 0 && <span className="text-white text-xs">✓</span>}
                      </div>
                    </div>

                    {/* Empty Space for Balance */}
                    <div className="w-1/2"></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Stage Detail Modal */}
      {showStageDetail && selectedStageData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setShowStageDetail(null)}>
          <div 
            className="bg-gray-900 border border-white/10 rounded-2xl max-w-lg w-full p-8 relative shadow-2xl transform transition-all scale-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowStageDetail(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border mb-3 ${getDifficultyColor(selectedStageData.difficulty)}`}>
                {selectedStageData.difficulty}
              </span>
              <h2 className="text-3xl font-bold text-white mb-2">{selectedStageData.name}</h2>
              <p className="text-gray-400">{selectedStageData.description}</p>
            </div>

            <div className="bg-black/30 rounded-xl p-4 mb-8 border border-white/5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-400">Recommended Power</span>
                <span className="text-yellow-400 font-mono font-bold">{selectedStageData.recommended_power}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Enemies</span>
                <span className="text-red-400 font-bold">3 - 5 Waves</span>
              </div>
            </div>

            <button
              onClick={() => handleStartBattle(selectedStageData.id)}
              disabled={isBattling}
              className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-xl font-bold py-4 rounded-xl shadow-lg hover:shadow-red-900/50 transition transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {isBattling ? 'Preparing Battle...' : '⚔️ START BATTLE'}
            </button>
          </div>
        </div>
      )}

      {/* Battle Scene Overlay */}
      {showBattleScene && selectedStage && (
        <div className="fixed inset-0 z-[60] bg-black">
          <BattleScene stageId={selectedStage} onBattleEnd={handleBattleEnd} />
        </div>
      )}

      {/* Battle Result Modal */}
      {battleResult && !showBattleScene && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-fadeIn" onClick={closeBattleResult}>
          <div
            className={`rounded-2xl p-10 max-w-md w-full text-center border-2 shadow-[0_0_50px_rgba(0,0,0,0.5)] transform animate-bounce-in ${
              battleResult.result === 'Victory'
                ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/50'
                : 'bg-gradient-to-br from-gray-900 to-gray-800 border-red-500/50'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-8xl mb-6 animate-bounce">
              {battleResult.result === 'Victory' ? '🏆' : '💀'}
            </div>
            
            <h2 className={`text-5xl font-black mb-2 tracking-wider ${
              battleResult.result === 'Victory' 
                ? 'text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-lg' 
                : 'text-red-500'
            }`}>
              {battleResult.result === 'Victory' ? 'VICTORY!' : 'DEFEAT'}
            </h2>
            
            <p className="text-gray-400 mb-8 text-lg">{battleResult.stage}</p>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
               <div className="bg-black/40 rounded-lg p-4">
                 <div className="text-gray-500 text-xs uppercase tracking-widest mb-1">Turns</div>
                 <div className="text-2xl font-mono text-white">{battleResult.turns}</div>
               </div>
               <div className="bg-black/40 rounded-lg p-4">
                 <div className="text-gray-500 text-xs uppercase tracking-widest mb-1">Status</div>
                 <div className={`${battleResult.result === 'Victory' ? 'text-green-400' : 'text-red-400'} text-lg font-bold`}>
                   {battleResult.result === 'Victory' ? 'CLEARED' : 'FAILED'}
                 </div>
               </div>
            </div>

            {battleResult.result === 'Victory' && (
              <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-xl p-6 mb-8">
                <h3 className="text-yellow-500 font-bold mb-4 uppercase tracking-widest text-sm">Rewards Obtained</h3>
                <div className="flex justify-center gap-8">
                  <div className="text-center">
                    <div className="text-3xl mb-1">🪙</div>
                    <div className="text-yellow-400 font-bold text-xl">+{battleResult.rewards.gold}</div>
                    <div className="text-xs text-yellow-500/70">Gold</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl mb-1">⭐</div>
                    <div className="text-blue-400 font-bold text-xl">+{battleResult.rewards.exp}</div>
                    <div className="text-xs text-blue-500/70">EXP</div>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={closeBattleResult}
              className="w-full bg-white text-black font-black py-4 rounded-xl hover:bg-gray-200 transition transform hover:scale-[1.02]"
            >
              CONTINUE
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bounceIn {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animate-bounce-in {
          animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
      `}</style>
    </div>
  );
}
