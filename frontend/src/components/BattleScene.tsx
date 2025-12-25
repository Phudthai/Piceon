import { useState, useEffect, useRef } from 'react';
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
  type?: string;
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
  casterId?: string; // For buff/debuff/heal skills
  caster?: string;
  amount?: number;
  buff?: string;
  debuff?: string;
  value?: number;
  duration?: number;
  hp_restored?: number;
}

interface BattleSceneProps {
  stageId: number;
  onBattleEnd: (result: any) => void;
}

interface FloatingText {
  id: number;
  text: string;
  type: 'damage' | 'heal' | 'crit' | 'miss' | 'skill' | 'buff' | 'debuff';
  targetId: string;
}

interface BattleLogEntry {
  turn: number;
  message: string;
  type: string;
  attacker?: string;
  target?: string;
  character?: string;
  isPlayerAction?: boolean; // true if action by player team
}

export default function BattleScene({ stageId, onBattleEnd }: BattleSceneProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [battleData, setBattleData] = useState<any>(null);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isSkipped, setIsSkipped] = useState(false);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [activeSkill, setActiveSkill] = useState<{ name: string; user: string } | null>(null);
  const [shakingTarget, setShakingTarget] = useState<string | null>(null);
  const [attackingSource, setAttackingSource] = useState<string | null>(null);
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);
  const [logVisible, setLogVisible] = useState(false); // Start hidden
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [activeEffects, setActiveEffects] = useState<Record<string, Array<{type: 'buff' | 'debuff', name: string}>>>({});

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

  // Auto-advance turns with AOE batching
  useEffect(() => {
    if (!battleData || isSkipped || currentTurn >= battleData.log.length) {
      return; // This is fine as it's inside useEffect, not before other hooks
    }

    const log = battleData.log[currentTurn];
    const delay = log.type === 'skill_used' ? 2000 : 1500;

    const timer = setTimeout(() => {
      // Check if this is a multi-target skill (damage, buff, debuff, heal)
      const isMultiTargetSkill = ['skill_damage', 'buff', 'debuff', 'heal'].includes(log.type || '') && log.skill;
      
      if (isMultiTargetSkill) {
        const aoeLogs = [log];
        let nextIdx = currentTurn + 1;
        
        // Gather all consecutive actions from the same skill in the same turn
        while (nextIdx < battleData.log.length) {
          const nextLog = battleData.log[nextIdx];
          // Check if same type, same skill, same turn, same caster
          const isSameSkill = nextLog.type === log.type && 
              nextLog.skill === log.skill && 
              nextLog.turn === log.turn &&
              (nextLog.attackerId === log.attackerId || nextLog.casterId === log.casterId);
          
          if (isSameSkill) {
            aoeLogs.push(nextLog);
            nextIdx++;
          } else {
            break;
          }
        }

        // Process all multi-target effects together
        if (aoeLogs.length > 1) {
          // This is AOE/Multi-target - process all at once
          processAOEAnimation(aoeLogs);
          
          setTimeout(() => {
            setCurrentTurn(nextIdx); // Skip to after all hits
            setActiveSkill(null);
            setShakingTarget(null);
            setAttackingSource(null);
          }, 1000);
        } else {
          // Single target skill
          processTurnAnimation(log);
          
          setTimeout(() => {
            setCurrentTurn((prev) => prev + 1);
            setActiveSkill(null);
            setShakingTarget(null);
            setAttackingSource(null);
          }, 1000);
        }
      } else {
        // Non-skill action or skill_used announcement
        processTurnAnimation(log);
        
        setTimeout(() => {
          setCurrentTurn((prev) => prev + 1);
          setActiveSkill(null);
          setShakingTarget(null);
          setAttackingSource(null);
        }, 1000);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [currentTurn, battleData, isSkipped]);

  // Check if battle is finished
  useEffect(() => {
    if (!battleData) return;
    
    if (currentTurn >= battleData.log.length || isSkipped) {
      setTimeout(() => {
        onBattleEnd(battleData);
      }, 1500);
    }
  }, [currentTurn, battleData, isSkipped, onBattleEnd]);

  // Auto-scroll battle log to bottom when new entries are added
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [battleLog]);

  const processAOEAnimation = (aoeLogs: BattleLog[]) => {
    // Add all to battle log
    aoeLogs.forEach(log => addToBattleLog(log));

    // Set attacker/caster
    if (aoeLogs[0].attackerId) {
      setAttackingSource(aoeLogs[0].attackerId);
    } else if (aoeLogs[0].casterId) {
      setAttackingSource(aoeLogs[0].casterId);
    } else if (aoeLogs[0].characterId) {
      setAttackingSource(aoeLogs[0].characterId);
    }

    // Show all effects at once based on type
    aoeLogs.forEach(log => {
      if (log.targetId) {
        let text = '';
        let type: FloatingText['type'] = 'damage';

        switch (log.type) {
          case 'skill_damage':
            text = `-${Math.abs(log.damage || 0)}`;
            type = 'damage';
            break;
          case 'heal':
            text = `+${Math.abs(log.amount || 0)}`;
            type = 'heal';
            break;
          case 'buff':
            text = `🛡️ ${log.buff?.replace(/_/g, ' ')}`;
            type = 'buff';
            break;
          case 'debuff':
            text = `💀 ${log.debuff?.replace(/_/g, ' ')}`;
            type = 'debuff';
            break;
        }

        if (text) {
          addFloatingText(log.targetId, text, type);
        }

        // Track buff/debuff
        if (log.type === 'buff' && log.buff && log.targetId) {
          setActiveEffects(prev => ({
            ...prev,
            [log.targetId!]: [...(prev[log.targetId!] || []), { type: 'buff', name: log.buff! }]
          }));
        } else if (log.type === 'debuff' && log.debuff && log.targetId) {
          setActiveEffects(prev => ({
            ...prev,
            [log.targetId!]: [...(prev[log.targetId!] || []), { type: 'debuff', name: log.debuff! }]
          }));
        }
      } else if (log.characterId && log.type === 'heal') {
        // Self heal
        const text = `+${Math.abs(log.amount || 0)}`;
        addFloatingText(log.characterId, text, 'heal');
      }
    });

    // Set first target shaking (for visual feedback)
    if (aoeLogs[0].targetId) {
      setShakingTarget(aoeLogs[0].targetId);
    }
  };

  const processTurnAnimation = (log: BattleLog) => {
    // Add to battle log
    addToBattleLog(log);

    // 1. Set Attacker Animation
    if (log.attackerId) {
      setAttackingSource(log.attackerId);
    } else if (log.characterId) {
      setAttackingSource(log.characterId);
    }

    // 2. Show Skill Banner
    if (log.type === 'skill_used') {
      setActiveSkill({ name: log.skill || 'Unknown Skill', user: log.character || 'Unknown' });
      return; // Wait for next turn for damage
    }

    // 3. Floating Text & Shake - FIXED to show on correct character
    let displayId: string | null = null;
    let text = '';
    let type: FloatingText['type'] = 'damage';

    if (log.type === 'damage' || log.type === 'skill_damage' || log.type === 'attack' || log.type === 'counter' || log.type === 'crit') {
      // Damage/Attack: Show on TARGET
      displayId = log.targetId || null;
      setShakingTarget(log.targetId || null);
      
      if (log.type === 'crit') {
        text = `CRIT -${Math.abs(log.damage || 0)}`;
        type = 'crit';
      } else {
        text = `-${Math.abs(log.damage || 0)}`;
        type = 'damage';
      }
    } else if (log.type === 'heal' || log.type === 'regen' || log.type === 'lifesteal' || log.type === 'last_stand') {
      // Heal: Show on CHARACTER who heals (could be self or target)
      displayId = log.characterId || log.targetId || null;
      text = `+${Math.abs(log.amount || log.hp_restored || 0)}`;
      type = 'heal';
    } else if (log.type === 'dodge') {
      // Dodge: Show on TARGET who dodged
      displayId = log.targetId || null;
      text = 'MISS';
      type = 'miss';
    } else if (log.type === 'buff') {
      // Buff: Show on TARGET who receives buff
      displayId = log.targetId || null;
      text = `🛡️ ${log.buff?.replace(/_/g, ' ')}`;
      type = 'buff';
    } else if (log.type === 'debuff') {
      // Debuff: Show on TARGET who receives debuff
      displayId = log.targetId || null;
      text = `💀 ${log.debuff?.replace(/_/g, ' ')}`;
      type = 'debuff';
    }

    if (displayId && text) {
      addFloatingText(displayId, text, type);
    }

    // Track buff/debuff for single-target skills too
    if (log.type === 'buff' && log.targetId && log.buff) {
      setActiveEffects(prev => ({
        ...prev,
        [log.targetId!]: [...(prev[log.targetId!] || []), { type: 'buff', name: log.buff! }]
      }));
    } else if (log.type === 'debuff' && log.targetId && log.debuff) {
      setActiveEffects(prev => ({
        ...prev,
        [log.targetId!]: [...(prev[log.targetId!] || []), { type: 'debuff', name: log.debuff! }]
      }));
    }
  };

  const addToBattleLog = (log: BattleLog) => {
    let message = '';
    let attacker = log.attacker || log.character;
    let target = log.target;
    let character = log.character;
    
    // Determine if this is a player action by checking if attacker/character/caster is in player team
    const isPlayerAction = log.attackerId?.startsWith('team_') || 
                           log.characterId?.startsWith('team_') || 
                           log.casterId?.startsWith('team_');
    
    if (log.type === 'skill_used') {
      message = `uses ${log.skill}!`;
    } else if (log.type === 'attack' || log.type === 'damage' || log.type === 'skill_damage') {
      message = `attacks ${log.target} for ${log.damage} damage!`;
    } else if (log.type === 'crit') {
      message = `CRITICAL HIT on ${log.target} for ${log.damage} damage!`;
    } else if (log.type === 'dodge') {
      message = `${log.target} dodged attack!`;
      attacker = log.attacker;
      character = log.target;
    } else if (log.type === 'heal') {
      message = `recovers ${log.amount} HP!`;
    } else if (log.type === 'buff') {
      message = `gains ${log.buff?.replace(/_/g, ' ')}!`;
      character = log.target;
    } else if (log.type === 'debuff') {
      message = `suffers ${log.debuff?.replace(/_/g, ' ')}!`;
      character = log.target;
    } else if (log.type === 'counter') {
      message = `counters ${log.target} for ${log.damage} damage!`;
    } else if (log.type === 'last_stand') {
      message = `refuses to fall! (Last Stand)`;
    }

    if (message) {
      setBattleLog(prev => [...prev, { 
        turn: log.turn, 
        message, 
        type: log.type || 'info',
        attacker,
        target,
        character,
        isPlayerAction
      }]);
    }
  };

  const addFloatingText = (targetId: string, text: string, type: FloatingText['type']) => {
    const id = Date.now();
    setFloatingTexts(prev => [...prev, { id, text, type, targetId }]);
    setTimeout(() => {
      setFloatingTexts(prev => prev.filter(ft => ft.id !== id));
    }, 1500);
  };

  const handleSkip = () => {
    setIsSkipped(true);
    setCurrentTurn(battleData.log.length);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50">
        <div className="text-white text-2xl animate-pulse">⚔️ Preparing Battle...</div>
      </div>
    );
  }

  if (!battleData) return null;

  const playerTeam = battleData.player_team || [];
  const enemies = battleData.enemies || [];

  const getCharacterCurrentHP = (uniqueId: string, initialHP: number, maxHP: number) => {
    const logEntry = battleData.log.slice(0, currentTurn + 1).reverse().find(
      (log: any) => log.targetId === uniqueId || (log.characterId === uniqueId && (log.type === 'heal' || log.type === 'last_stand'))
    );
    
    let current = initialHP;
    if (logEntry) {
      if (logEntry.targetId === uniqueId) {
        current = logEntry.remaining_hp;
      } else if (logEntry.characterId === uniqueId && logEntry.remaining_hp !== undefined) {
        current = logEntry.remaining_hp;
      }
    }
    
    return {
      current: Math.max(0, current),
      percent: Math.min(100, Math.max(0, (current / maxHP) * 100))
    };
  };

  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col z-50 overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2068&auto=format&fit=crop" 
          alt="Battle Background" 
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>
      </div>

      {/* Floating Battle Log Panel - Centered */}
      {logVisible && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 w-96 h-80">
          <div className="bg-black/80 backdrop-blur-md rounded-xl border border-white/10 h-full flex flex-col">
            {/* Header with Minimize Button */}
            <div className="flex justify-between items-center px-4 py-2 border-b border-white/10 bg-black/40">
              <h3 className="text-white font-bold text-sm">Battle Log</h3>
              <button
                onClick={() => setLogVisible(false)}
                className="w-6 h-6 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded text-white text-xs transition"
                title="Minimize"
              >
                −
              </button>
            </div>
            
            {/* Log Content */}
            <div ref={logContainerRef} className="flex-1 overflow-y-auto p-3 space-y-1">
              {battleLog.map((entry, idx) => {
                // Helper to colorize character names
                const renderMessage = () => {
                  const parts = [];
                  let currentMessage = entry.message;
                  
                  // Add character name with color
                  if (entry.character || entry.attacker) {
                    const mainChar = entry.character || entry.attacker;
                    const charColor = entry.isPlayerAction ? 'text-cyan-400' : 'text-red-400';
                    parts.push(
                      <span key="char" className={`font-bold ${charColor}`}>{mainChar}</span>
                    );
                    parts.push(<span key="space1"> </span>);
                  }
                  
                  // Add message
                  const messageText = currentMessage;
                  
                  // If there's a target name, colorize it
                  if (entry.target && messageText.includes(entry.target)) {
                    const targetIndex = messageText.indexOf(entry.target);
                    const beforeTarget = messageText.substring(0, targetIndex);
                    const afterTarget = messageText.substring(targetIndex + entry.target.length);
                    
                    // Target is enemy if player is attacking, or player if enemy is attacking
                    const targetColor = entry.isPlayerAction ? 'text-red-400' : 'text-cyan-400';
                    
                    parts.push(<span key="before">{beforeTarget}</span>);
                    parts.push(
                      <span key="target" className={`font-bold ${targetColor}`}>{entry.target}</span>
                    );
                    parts.push(<span key="after">{afterTarget}</span>);
                  } else {
                    parts.push(<span key="msg">{messageText}</span>);
                  }
                  
                  return <>{parts}</>;
                };
                
                return (
                  <div 
                    key={idx} 
                    className={`text-xs p-1.5 rounded border-l-2 ${
                      entry.type === 'crit' ? 'bg-orange-900/20 border-orange-500' :
                      entry.type === 'skill_used' ? 'bg-purple-900/20 border-purple-500' :
                      entry.type === 'heal' ? 'bg-green-900/20 border-green-500' :
                      entry.type === 'dodge' ? 'bg-cyan-900/20 border-cyan-500' :
                      entry.type === 'buff' ? 'bg-blue-900/20 border-blue-500' :
                      entry.type === 'debuff' ? 'bg-red-900/20 border-red-500' :
                      'bg-gray-900/20 border-gray-500'
                    } text-gray-200`}
                  >
                    <div className="text-[9px] text-gray-500">Turn {entry.turn}</div>
                    <div className="leading-tight">{renderMessage()}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Show Log Button (when hidden) - Bottom Left */}
      {!logVisible && (
        <button
          onClick={() => setLogVisible(true)}
          className="absolute bottom-8 left-8 z-30 bg-black/80 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 text-white text-sm hover:bg-black/90 transition"
        >
          📜 Battle Log
        </button>
      )}

      {/* Top HUD */}
      <div className="relative z-10 p-6 flex justify-between items-start">
        <div className="bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-white/10">
          <div className="text-gray-300 text-xs uppercase tracking-widest">Stage</div>
          <div className="text-white font-bold text-lg">{battleData.stage}</div>
        </div>

        <div className="flex flex-col items-center">
          <div className="text-yellow-500 font-black text-4xl drop-shadow-lg">
            TURN {Math.ceil((currentTurn + 1) / 2)}
          </div>
          <div className="text-gray-400 text-xs mt-1">
            Action {currentTurn + 1} / {battleData.log.length}
          </div>
        </div>

        <button
          onClick={handleSkip}
          className="bg-white/10 hover:bg-white/20 backdrop-blur-md px-6 py-2 rounded-full text-white text-sm font-bold border border-white/10 transition"
        >
          ⏩ SKIP
        </button>
      </div>

      {/* Central Action Area (Empty for now, could hold 3D models or sprites) */}
      <div className="flex-1 relative z-10 flex items-center justify-center">
        {/* Skill Banner */}
        {activeSkill && (
          <div className="absolute inset-x-0 top-1/4 flex flex-col items-center justify-center animate-slide-in">
            <div className="bg-gradient-to-r from-transparent via-black/80 to-transparent w-full py-4 text-center backdrop-blur-sm">
              <div className="text-purple-400 text-sm font-bold uppercase tracking-widest mb-1">{activeSkill.user} uses</div>
              <div className="text-yellow-400 text-5xl font-black italic drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]">
                {activeSkill.name}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom HUD - Player Team (Bottom Center) */}
      <div className="relative z-10 p-8 flex justify-center items-end">
        <div className="flex gap-4 items-end">
          {playerTeam.slice(0, 5).map((char: any) => {
            const hp = getCharacterCurrentHP(char.uniqueId, char.current_hp, char.max_hp || char.current_hp);
            const isAttacking = attackingSource === char.uniqueId;
            const isShaking = shakingTarget === char.uniqueId;
            const isDead = hp.current === 0;

            return (
              <div 
                key={char.uniqueId} 
                className={`relative group transition-all duration-300 ${isAttacking ? '-translate-y-8 scale-110 z-20' : ''} ${isShaking ? 'animate-shake' : ''} ${isDead ? 'grayscale opacity-50' : ''}`}
              >
                {/* Floating Text Anchor */}
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-full text-center pointer-events-none z-50">
                  {floatingTexts.filter(ft => ft.targetId === char.uniqueId).map(ft => (
                    <div 
                      key={ft.id} 
                      className={`text-3xl font-black drop-shadow-md animate-float-up whitespace-nowrap
                        ${ft.type === 'damage' ? 'text-red-500' : ''}
                        ${ft.type === 'crit' ? 'text-orange-500 text-4xl' : ''}
                        ${ft.type === 'heal' ? 'text-green-400' : ''}
                        ${ft.type === 'miss' ? 'text-gray-400' : ''}
                        ${ft.type === 'buff' ? 'text-blue-400 text-xl' : ''}
                        ${ft.type === 'debuff' ? 'text-purple-400 text-xl' : ''}
                      `}
                    >
                      {ft.text}
                    </div>
                  ))}
                </div>

                {/* Character Card */}
                <div className={`w-24 bg-gray-900/80 backdrop-blur-md rounded-xl border-2 overflow-hidden transition-colors
                  ${isAttacking ? 'border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.3)]' : 'border-gray-700'}
                  ${isShaking ? 'border-red-500 bg-red-900/30' : ''}
                `}>
                  {/* Portrait Placeholder */}
                  <div className="h-24 bg-gradient-to-b from-gray-700 to-gray-800 flex items-center justify-center text-4xl">
                    {char.type === 'Warrior' && '⚔️'}
                    {char.type === 'Mage' && '🔮'}
                    {char.type === 'Archer' && '🏹'}
                    {char.type === 'Tank' && '🛡️'}
                    {char.type === 'Assassin' && '🗡️'}
                  </div>
                  
                  {/* Info */}
                  <div className="p-2">
                    <div className="text-white text-xs font-bold truncate mb-1">{char.name}</div>
                    
                    {/* Buff/Debuff Icons */}
                    {activeEffects[char.uniqueId] && activeEffects[char.uniqueId].length > 0 && (
                      <div className="flex gap-0.5 mb-1 flex-wrap">
                        {activeEffects[char.uniqueId].slice(0, 3).map((effect, idx) => (
                          <span 
                            key={idx} 
                            className={`text-[10px] px-1 rounded ${
                              effect.type === 'buff' ? 'bg-blue-500/30 text-blue-300' : 'bg-red-500/30 text-red-300'
                            }`}
                            title={effect.name}
                          >
                            {effect.type === 'buff' ? '🛡️' : '💀'}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* HP Bar */}
                    <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${hp.percent < 30 ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${hp.percent}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-gray-400 text-right mt-1">{hp.current}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top HUD - Enemy Team (Top Center) */}
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10 p-8">
        <div className="flex gap-4 items-start flex-row-reverse">
          {enemies.slice(0, 5).map((char: any) => {
            const hp = getCharacterCurrentHP(char.uniqueId, char.current_hp, char.max_hp || char.current_hp);
            const isAttacking = attackingSource === char.uniqueId;
            const isShaking = shakingTarget === char.uniqueId;
            const isDead = hp.current === 0;

            return (
              <div 
                key={char.uniqueId} 
                className={`relative group transition-all duration-300 ${isAttacking ? 'translate-y-8 scale-110 z-20' : ''} ${isShaking ? 'animate-shake' : ''} ${isDead ? 'grayscale opacity-50' : ''}`}
              >
                {/* Floating Text Anchor */}
                <div className="absolute top-32 left-1/2 -translate-x-1/2 w-full text-center pointer-events-none z-50">
                  {floatingTexts.filter(ft => ft.targetId === char.uniqueId).map(ft => (
                    <div 
                      key={ft.id} 
                      className={`text-3xl font-black drop-shadow-md animate-float-up whitespace-nowrap
                        ${ft.type === 'damage' ? 'text-red-500' : ''}
                        ${ft.type === 'crit' ? 'text-orange-500 text-4xl' : ''}
                        ${ft.type === 'heal' ? 'text-green-400' : ''}
                        ${ft.type === 'miss' ? 'text-gray-400' : ''}
                        ${ft.type === 'buff' ? 'text-blue-400 text-xl' : ''}
                        ${ft.type === 'debuff' ? 'text-purple-400 text-xl' : ''}
                      `}
                    >
                      {ft.text}
                    </div>
                  ))}
                </div>

                {/* Character Card */}
                <div className={`w-24 bg-gray-900/80 backdrop-blur-md rounded-xl border-2 overflow-hidden transition-colors
                  ${isAttacking ? 'border-red-400 shadow-[0_0_20px_rgba(248,113,113,0.3)]' : 'border-red-900/50'}
                  ${isShaking ? 'border-red-500 bg-red-900/30' : ''}
                `}>
                  {/* Portrait Placeholder */}
                  <div className="h-24 bg-gradient-to-b from-red-900 to-gray-900 flex items-center justify-center text-4xl">
                    👾
                  </div>
                  
                  {/* Info */}
                  <div className="p-2">
                    <div className="text-white text-xs font-bold truncate mb-1">{char.name}</div>
                    
                    {/* Buff/Debuff Icons */}
                    {activeEffects[char.uniqueId] && activeEffects[char.uniqueId].length > 0 && (
                      <div className="flex gap-0.5 mb-1 flex-wrap">
                        {activeEffects[char.uniqueId].slice(0, 3).map((effect, idx) => (
                          <span 
                            key={idx} 
                            className={`text-[10px] px-1 rounded ${
                              effect.type === 'buff' ? 'bg-blue-500/30 text-blue-300' : 'bg-red-500/30 text-red-300'
                            }`}
                            title={effect.name}
                          >
                            {effect.type === 'buff' ? '🛡️' : '💀'}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* HP Bar */}
                    <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500 transition-all duration-300"
                        style={{ width: `${hp.percent}%` }}
                      ></div>
                    </div>
                    <div className="text-[10px] text-gray-400 text-right mt-1">{hp.current}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes float-up {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-50px) scale(1.2); opacity: 0; }
        }
        .animate-float-up {
          animation: float-up 1s ease-out forwards;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        @keyframes slide-in {
          0% { transform: translateX(-100%); opacity: 0; }
          100% { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in {
          animation: slide-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
      `}</style>
    </div>
  );
}
