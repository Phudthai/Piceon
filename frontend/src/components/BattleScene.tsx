import { useState, useEffect } from 'react';
import api from '@/services/api';

interface Character {
  id: number;
  name: string;
  current_hp: number;
  current_atk: number;
  current_def: number;
  rarity: string;
  type: string;
}

interface BattleLog {
  turn: number;
  type?: string; // attack, skill_used, skill_damage, crit, dodge, counter, heal, buff, debuff, etc.
  attacker?: string;
  attackerId?: string;
  target?: string;
  targetId?: string;
  damage?: number;
  remaining_hp?: number;
  skill?: string;
  skillId?: number;
  character?: string;
  characterId?: string;
  amount?: number;
  buff?: string;
  debuff?: string;
  value?: number;
  duration?: number;
}

interface BattleSceneProps {
  stageId: number;
  onBattleEnd: (result: any) => void;
}

export default function BattleScene({ stageId, onBattleEnd }: BattleSceneProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [battleData, setBattleData] = useState<any>(null);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isSkipped, setIsSkipped] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Load battle data
  useEffect(() => {
    const startBattle = async () => {
      try {
        const response = await api.post('/battles/start', { stage_id: stageId });
        setBattleData(response.data.data);
        setIsLoading(false);
      } catch (error: any) {
        console.error('Failed to start battle:', error);
        alert(error.response?.data?.message || 'Failed to start battle');
        onBattleEnd(null);
      }
    };
    startBattle();
  }, [stageId]);

  // Auto-advance turns
  useEffect(() => {
    if (!battleData || isSkipped || currentTurn >= battleData.log.length) return;

    const timer = setTimeout(() => {
      setAnimating(true);
      setTimeout(() => {
        setAnimating(false);
        setCurrentTurn((prev) => prev + 1);
      }, 800); // Animation duration
    }, 1500); // Delay between turns

    return () => clearTimeout(timer);
  }, [currentTurn, battleData, isSkipped]);

  // Check if battle is finished
  useEffect(() => {
    if (!battleData) return;
    if (currentTurn >= battleData.log.length || isSkipped) {
      setTimeout(() => {
        onBattleEnd(battleData);
      }, 1000);
    }
  }, [currentTurn, battleData, isSkipped]);

  const handleSkip = () => {
    setIsSkipped(true);
    setCurrentTurn(battleData.log.length);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="text-white text-2xl">Loading Battle...</div>
      </div>
    );
  }

  if (!battleData) return null;

  const currentLog = battleData.log[currentTurn];
  const playerTeam = battleData.player_team || [];
  const enemies = battleData.enemies || [];

  // Calculate team HP bars
  const getTeamHP = (team: any[]) => {
    const total = team.reduce((sum: number, char: any) => sum + (char.current_hp || 0), 0);
    const current = team.reduce((sum: number, char: any) => {
      const logEntry = battleData.log.slice(0, currentTurn + 1).reverse().find(
        (log: any) => log.targetId === char.uniqueId
      );
      const hp = logEntry ? Math.max(0, logEntry.remaining_hp) : char.current_hp;
      return sum + hp;
    }, 0);
    return { total, current, percent: Math.max(0, (current / total) * 100) };
  };

  const playerHP = getTeamHP(playerTeam);
  const enemyHP = getTeamHP(enemies);

  // Get current HP for each character
  const getCharacterCurrentHP = (uniqueId: string, initialHP: number) => {
    const logEntry = battleData.log.slice(0, currentTurn + 1).reverse().find(
      (log: any) => log.targetId === uniqueId
    );
    return logEntry ? Math.max(0, logEntry.remaining_hp) : initialHP;
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-purple-900 via-blue-900 to-black flex flex-col z-50">
      {/* Header */}
      <div className="p-4 bg-black bg-opacity-50">
        <div className="flex justify-between items-center">
          <div className="text-white">
            <div className="text-sm text-gray-400">Stage: {battleData.stage}</div>
            <div className="text-lg font-bold">Attack {currentTurn + 1} / {battleData.log.length}</div>
            <div className="text-xs text-gray-400">Turn {Math.ceil((currentTurn + 1) / 2)} / {battleData.turns}</div>
          </div>
          <button
            onClick={handleSkip}
            className="px-6 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded"
          >
            Skip Battle
          </button>
        </div>
      </div>

      {/* Battle Arena */}
      <div className="flex-1 flex items-center justify-between px-12 relative">
        {/* Player Team Side */}
        <div className="w-1/3">
          <div className="text-white text-center mb-4">
            <div className="text-lg font-bold mb-2">Your Team</div>
            <div className="w-full bg-gray-700 rounded-full h-4 mb-2">
              <div
                className="bg-green-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(0, playerHP.percent)}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-300">
              {Math.round(playerHP.current)} / {playerHP.total} HP
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {playerTeam.slice(0, 5).map((char: any, idx: number) => (
              <div
                key={char.uniqueId || idx}
                className={`p-3 bg-blue-900 bg-opacity-50 rounded border-2 ${
                  currentLog?.attackerId === char.uniqueId
                    ? 'border-yellow-400 scale-110'
                    : currentLog?.targetId === char.uniqueId
                    ? 'border-red-400'
                    : 'border-blue-700'
                } transition-all duration-300`}
              >
                <div className="text-white text-sm font-bold truncate">{char.name}</div>
                <div className="text-xs text-gray-400">{char.type}</div>
                <div className="text-xs text-green-400">
                  HP: {getCharacterCurrentHP(char.uniqueId, char.current_hp)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Combat Log Center */}
        <div className="w-1/3 text-center">
          {currentLog && (
            <div
              className={`bg-black bg-opacity-70 p-6 rounded-lg border-2 ${
                animating ? 'border-yellow-400 scale-110' : 'border-gray-600'
              } transition-all duration-300`}
            >
              {/* Skill Used */}
              {currentLog.type === 'skill_used' && (
                <>
                  <div className="text-purple-400 text-xl font-bold mb-2">
                    {currentLog.character}
                  </div>
                  <div className="text-yellow-300 text-2xl mb-2">✨ {currentLog.skill}</div>
                  <div className="text-sm text-gray-400">Skill Activated!</div>
                </>
              )}

              {/* Skill Damage */}
              {currentLog.type === 'skill_damage' && (
                <>
                  <div className="text-yellow-400 text-xl font-bold mb-2">
                    {currentLog.attacker}
                  </div>
                  <div className="text-purple-300 text-lg mb-2">💫 {currentLog.skill}</div>
                  <div className="text-red-400 text-4xl font-bold mb-2">
                    -{Math.abs(currentLog.damage || 0)}
                  </div>
                  <div className="text-blue-400 text-xl font-bold">
                    {currentLog.target}
                  </div>
                  <div className="text-sm text-gray-400 mt-2">
                    HP: {Math.max(0, currentLog.remaining_hp || 0)}
                  </div>
                </>
              )}

              {/* Critical Hit */}
              {currentLog.type === 'crit' && (
                <>
                  <div className="text-yellow-400 text-xl font-bold mb-2">
                    {currentLog.attacker}
                  </div>
                  <div className="text-orange-300 text-2xl mb-2">💥 CRITICAL!</div>
                  <div className="text-red-500 text-5xl font-bold mb-2">
                    -{Math.abs(currentLog.damage || 0)}
                  </div>
                  <div className="text-blue-400 text-xl font-bold">
                    {currentLog.target}
                  </div>
                  <div className="text-sm text-gray-400 mt-2">
                    HP: {Math.max(0, currentLog.remaining_hp || 0)}
                  </div>
                </>
              )}

              {/* Dodge */}
              {currentLog.type === 'dodge' && (
                <>
                  <div className="text-gray-400 text-xl font-bold mb-2">
                    {currentLog.attacker}
                  </div>
                  <div className="text-cyan-300 text-3xl mb-2">💨 MISS!</div>
                  <div className="text-blue-400 text-xl font-bold">
                    {currentLog.target} dodged!
                  </div>
                </>
              )}

              {/* Counter Attack */}
              {currentLog.type === 'counter' && (
                <>
                  <div className="text-yellow-400 text-xl font-bold mb-2">
                    {currentLog.attacker}
                  </div>
                  <div className="text-orange-300 text-2xl mb-2">⚡ COUNTER!</div>
                  <div className="text-red-400 text-4xl font-bold mb-2">
                    -{Math.abs(currentLog.damage || 0)}
                  </div>
                  <div className="text-blue-400 text-xl font-bold">
                    {currentLog.target}
                  </div>
                  <div className="text-sm text-gray-400 mt-2">
                    HP: {Math.max(0, currentLog.remaining_hp || 0)}
                  </div>
                </>
              )}

              {/* Heal */}
              {(currentLog.type === 'heal' || currentLog.type === 'regen' || currentLog.type === 'lifesteal') && (
                <>
                  <div className="text-green-400 text-xl font-bold mb-2">
                    {currentLog.character || currentLog.target}
                  </div>
                  <div className="text-green-300 text-2xl mb-2">
                    {currentLog.type === 'lifesteal' ? '🩸 Lifesteal' : currentLog.type === 'regen' ? '💖 Regen' : '💚 Heal'}
                  </div>
                  <div className="text-green-400 text-4xl font-bold mb-2">
                    +{Math.abs(currentLog.amount || 0)}
                  </div>
                  <div className="text-sm text-gray-400 mt-2">
                    HP: {currentLog.remaining_hp || 0}
                  </div>
                </>
              )}

              {/* Buff */}
              {currentLog.type === 'buff' && (
                <>
                  <div className="text-blue-400 text-xl font-bold mb-2">
                    {currentLog.target}
                  </div>
                  <div className="text-blue-300 text-2xl mb-2">🛡️ Buff!</div>
                  <div className="text-yellow-300 text-lg">
                    {currentLog.buff?.replace(/_/g, ' ')}
                  </div>
                  <div className="text-sm text-gray-400 mt-2">
                    Duration: {currentLog.duration} turns
                  </div>
                </>
              )}

              {/* Debuff */}
              {currentLog.type === 'debuff' && (
                <>
                  <div className="text-red-400 text-xl font-bold mb-2">
                    {currentLog.target}
                  </div>
                  <div className="text-purple-300 text-2xl mb-2">💀 Debuff!</div>
                  <div className="text-red-300 text-lg">
                    {currentLog.debuff?.replace(/_/g, ' ')}
                  </div>
                  <div className="text-sm text-gray-400 mt-2">
                    Duration: {currentLog.duration} turns
                  </div>
                </>
              )}

              {/* Last Stand */}
              {currentLog.type === 'last_stand' && (
                <>
                  <div className="text-orange-400 text-xl font-bold mb-2">
                    {currentLog.character}
                  </div>
                  <div className="text-red-300 text-2xl mb-2">🔥 LAST STAND!</div>
                  <div className="text-green-400 text-3xl font-bold">
                    Revived with {currentLog.hp_restored} HP!
                  </div>
                </>
              )}

              {/* Normal Attack */}
              {currentLog.type === 'attack' && (
                <>
                  <div className="text-yellow-400 text-xl font-bold mb-2">
                    {currentLog.attacker}
                  </div>
                  <div className="text-white text-3xl mb-2">⚔️</div>
                  <div className="text-red-400 text-4xl font-bold mb-2">
                    -{Math.abs(currentLog.damage || 0)}
                  </div>
                  <div className="text-blue-400 text-xl font-bold">
                    {currentLog.target}
                  </div>
                  <div className="text-sm text-gray-400 mt-2">
                    HP: {Math.max(0, currentLog.remaining_hp || 0)}
                  </div>
                </>
              )}

              {/* Fallback for old logs without type */}
              {!currentLog.type && currentLog.attacker && (
                <>
                  <div className="text-yellow-400 text-xl font-bold mb-2">
                    {currentLog.attacker}
                  </div>
                  <div className="text-white text-3xl mb-2">⚔️</div>
                  <div className="text-red-400 text-4xl font-bold mb-2">
                    -{Math.abs(currentLog.damage || 0)}
                  </div>
                  <div className="text-blue-400 text-xl font-bold">
                    {currentLog.target}
                  </div>
                  <div className="text-sm text-gray-400 mt-2">
                    HP: {Math.max(0, currentLog.remaining_hp || 0)}
                  </div>
                </>
              )}
            </div>
          )}
          {!currentLog && currentTurn === 0 && (
            <div className="text-white text-2xl font-bold">Battle Start!</div>
          )}
        </div>

        {/* Enemy Team Side */}
        <div className="w-1/3">
          <div className="text-white text-center mb-4">
            <div className="text-lg font-bold mb-2">Enemies</div>
            <div className="w-full bg-gray-700 rounded-full h-4 mb-2">
              <div
                className="bg-red-500 h-4 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(0, enemyHP.percent)}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-300">
              {Math.round(enemyHP.current)} / {enemyHP.total} HP
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {enemies.slice(0, 5).map((char: any, idx: number) => (
              <div
                key={char.uniqueId || idx}
                className={`p-3 bg-red-900 bg-opacity-50 rounded border-2 ${
                  currentLog?.attackerId === char.uniqueId
                    ? 'border-yellow-400 scale-110'
                    : currentLog?.targetId === char.uniqueId
                    ? 'border-red-400'
                    : 'border-red-700'
                } transition-all duration-300`}
              >
                <div className="text-white text-sm font-bold truncate">{char.name}</div>
                <div className="text-xs text-gray-400">{char.type}</div>
                <div className="text-xs text-green-400">
                  HP: {getCharacterCurrentHP(char.uniqueId, char.current_hp)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer - Result Preview */}
      {(currentTurn >= battleData.log.length || isSkipped) && (
        <div className="p-4 bg-black bg-opacity-70 text-center">
          <div
            className={`text-3xl font-bold ${
              battleData.result === 'Victory' ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {battleData.result}!
          </div>
          {battleData.result === 'Victory' && (
            <div className="text-yellow-400 text-xl mt-2">
              +{battleData.rewards?.gold || 0} Gold | +{battleData.rewards?.exp || 0} EXP
            </div>
          )}
        </div>
      )}
    </div>
  );
}
