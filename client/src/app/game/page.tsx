'use client';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { apiFetch } from '@/utils/api';
import { useSocket } from '@/hooks/useSocket';
import type {
  Character,
  StateDelta,
  ChatMessage as ChatMsg,
  CombatResult,
  PlayerStats,
  InventoryItem,
  ShopData,
  PlayerSkill,
  PlayerQuest,
  NpcDialog,
  PartyState,
  GuildState,
  BaseStats,
} from '@ro-game/shared';
import { baseExpRequired, jobExpRequired, MAX_BASE_LEVEL, MAX_JOB_LEVEL } from '@ro-game/shared';
import { StatBar } from '@/components/StatBar';
import { GameEngine } from '@/game/GameEngine';
import type { MapData } from '@/game/renderer/MapRenderer';
import { InventoryWindow } from '@/components/InventoryWindow';
import { EquipmentWindow } from '@/components/EquipmentWindow';
import { CharacterDetailWindow } from '@/components/CharacterDetailWindow';
import { ShopWindow } from '@/components/ShopWindow';
import { SkillWindow } from '@/components/SkillWindow';
import { SkillBar } from '@/components/SkillBar';
import { QuestWindow } from '@/components/QuestWindow';
import { NpcDialogWindow } from '@/components/NpcDialogWindow';
import { PartyWindow } from '@/components/PartyWindow';
import { GuildWindow } from '@/components/GuildWindow';
import { StatusWindow } from '@/components/StatusWindow';

import pronteraData from '../../../../data/maps/prontera.json';
import prtFild01Data from '../../../../data/maps/prt_fild01.json';
import prtFild02Data from '../../../../data/maps/prt_fild02.json';
import prtFild03Data from '../../../../data/maps/prt_fild03.json';

const MAP_DATA: Record<string, MapData> = {
  prontera: pronteraData as MapData,
  prt_fild01: prtFild01Data as MapData,
  prt_fild02: prtFild02Data as MapData,
  prt_fild03: prtFild03Data as MapData,
};

export default function GamePage() {
  // useSearchParams requires a Suspense boundary for static prerendering
  return (
    <Suspense fallback={<main style={centerStyle}><p>Loading game...</p></main>}>
      <GameContent />
    </Suspense>
  );
}

function GameContent() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [localStatus, setLocalStatus] = useState<string | undefined>(undefined);
  const [notifications, setNotifications] = useState<Array<{ id: number; type: string; message: string }>>([]);
  const notifIdRef = useRef(0);

  // Inventory & Equipment & Shop state
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [maxWeight, setMaxWeight] = useState<number>(2000);
  const [showInventory, setShowInventory] = useState(false);
  const [showEquipment, setShowEquipment] = useState(false);
  const [showCharacterDetail, setShowCharacterDetail] = useState(false);
  const [shopData, setShopData] = useState<ShopData | null>(null);
  const [skills, setSkills] = useState<PlayerSkill[]>([]);
  const [skillPoints, setSkillPoints] = useState(0);
  const [showSkills, setShowSkills] = useState(false);
  const [skillBar, setSkillBar] = useState<Array<number | null>>([null, null, null, null, null, null, null, null, null]);

  // Quest & NPC state (Phase 7)
  const [quests, setQuests] = useState<PlayerQuest[]>([]);
  const [showQuests, setShowQuests] = useState(false);
  const [npcDialog, setNpcDialog] = useState<NpcDialog | null>(null);

  // Party & Guild state (Phase 6)
  const [party, setParty] = useState<PartyState | null>(null);
  const [partyInvite, setPartyInvite] = useState<string | null>(null);
  const [showParty, setShowParty] = useState(false);
  const [guild, setGuild] = useState<GuildState | null>(null);
  const [guildInvite, setGuildInvite] = useState<{ from: string; guildName: string } | null>(null);
  const [showGuild, setShowGuild] = useState(false);

  // Death state — overlay blocks input until respawn
  const [isDead, setIsDead] = useState(false);

  // Status window (stat allocation)
  const [baseStats, setBaseStats] = useState<BaseStats | null>(null);
  const [statPoints, setStatPoints] = useState(0);
  const [showStatus, setShowStatus] = useState(false);

  // Full-state delta that arrived while the engine was (re)initializing (map warp)
  const pendingDeltaRef = useRef<StateDelta | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const { loadFromStorage } = useAuthStore();

  const characterId = searchParams.get('characterId') || '';

  // Add notification with auto-dismiss
  const addNotification = useCallback((type: string, message: string) => {
    const id = ++notifIdRef.current;
    setNotifications((prev) => [...prev.slice(-4), { id, type, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  // ─── Socket event handlers ───────────────────────

  const applyDelta = useCallback((engine: GameEngine, data: StateDelta) => {
    if (!characterId) return;

    for (const [id, playerState] of Object.entries(data.players)) {
      if (id === characterId) {
        // Reconcile local position if server disagrees strongly (e.g. spawn rescue)
        engine.reconcileLocalPosition(playerState.x, playerState.y);
        setLocalStatus(playerState.status);
        continue;
      }
      if (playerState.action === 'dead') {
        engine.removePlayer(id);
      } else {
        engine.updatePlayer(id, playerState.name, playerState.x, playerState.y, undefined, playerState.class, playerState.status);
      }
    }

    for (const [id, monsterState] of Object.entries(data.monsters)) {
      engine.updateMonster(id, monsterState);
    }

    for (const [id, dropState] of Object.entries(data.drops)) {
      engine.updateDrop(id, dropState);
    }
  }, [characterId]);

  const handleStateDelta = useCallback((data: StateDelta) => {
    const engine = engineRef.current;
    if (!engine) {
      // Engine is re-initializing (map warp) — keep the latest full snapshot
      pendingDeltaRef.current = data;
      return;
    }
    applyDelta(engine, data);
  }, [applyDelta]);

  const handleChatMessage = useCallback((msg: ChatMsg) => {
    setChatMessages((prev) => [...prev.slice(-49), msg]);
  }, []);

  const handleNotification = useCallback((data: { type: string; message: string }) => {
    addNotification(data.type, data.message);
  }, [addNotification]);

  const handlePlayerStats = useCallback((data: PlayerStats) => {
    // zeny is omitted when the server doesn't know it — keep the last value
    setStats((prev) => ({ ...data, zeny: data.zeny ?? prev?.zeny ?? 0 }));
    if (data.statPoints !== undefined) setStatPoints(data.statPoints);
    if (data.skillPoints !== undefined) setSkillPoints(data.skillPoints);
  }, []);

  const handleStatsUpdate = useCallback((data: BaseStats & { statPoints: number }) => {
    const { statPoints: points, ...statValues } = data;
    setBaseStats(statValues);
    setStatPoints(points);
  }, []);

  const handleCombatResult = useCallback((data: CombatResult) => {
    engineRef.current?.showCombatResult(data);
  }, []);

  const handleMonsterDie = useCallback((data: { monsterId: string; killerId: string; x: number; y: number; zenyGained: number }) => {
    engineRef.current?.showZenyGain(data.x, data.y, data.zenyGained);
    engineRef.current?.removeMonster(data.monsterId);
  }, []);

  const handleItemDropped = useCallback((data: { dropId: string; itemId: number; x: number; y: number }) => {
    engineRef.current?.addDrop(data.dropId, data.itemId, data.x, data.y);
  }, []);

  const handleItemPicked = useCallback((data: { dropId: string; playerId: string }) => {
    engineRef.current?.removeDrop(data.dropId);
  }, []);

  const handleLevelUp = useCallback((data: { type: 'base' | 'job'; newLevel: number }) => {
    const label = data.type === 'base' ? 'Base' : 'Job';
    addNotification('info', `${label} Level Up! Lv.${data.newLevel}`);
  }, [addNotification]);

  const handleInventoryLoad = useCallback((data: { items: InventoryItem[]; maxWeight?: number }) => {
    setInventory(data.items);
    if (data.maxWeight !== undefined) setMaxWeight(data.maxWeight);
  }, []);

  const handleInventoryUpdate = useCallback((data: { items: InventoryItem[]; maxWeight?: number }) => {
    setInventory(data.items);
    if (data.maxWeight !== undefined) setMaxWeight(data.maxWeight);
  }, []);

  const handleShopOpen = useCallback((data: ShopData) => {
    setShopData(data);
  }, []);

  const handleSkillsLoad = useCallback((data: { skills: PlayerSkill[]; skillPoints: number }) => {
    setSkills(data.skills);
    setSkillPoints(data.skillPoints);
    // Auto-assign first usable skills to bar
    const usable = data.skills.filter((s) => s.type !== 'PASSIVE');
    setSkillBar((prev) => {
      const newBar = [...prev];
      for (let i = 0; i < usable.length && i < 9; i++) {
        if (!newBar[i]) newBar[i] = usable[i].skillId;
      }
      return newBar;
    });
  }, []);

  const handleSkillsUpdate = useCallback((data: { skills: PlayerSkill[]; skillPoints: number }) => {
    setSkills(data.skills);
    setSkillPoints(data.skillPoints);
  }, []);

  const handleQuestsLoad = useCallback((data: { quests: PlayerQuest[] }) => {
    setQuests(data.quests);
  }, []);

  const handleQuestsUpdate = useCallback((data: { quests: PlayerQuest[] }) => {
    setQuests(data.quests);
    // Refresh dialog quest state is handled server-side on next npc:talk
  }, []);

  const handleNpcDialog = useCallback((data: NpcDialog) => {
    setNpcDialog(data);
  }, []);

  const handlePlayerDead = useCallback(() => {
    setIsDead(true);
  }, []);

  const handleMapChange = useCallback((data: { mapName: string; x: number; y: number }) => {
    // New character object retriggers the engine useEffect → map reload
    setNpcDialog(null);
    setShopData(null);
    setIsDead(false); // respawn warps back to the save point
    setCharacter((prev) =>
      prev ? { ...prev, mapName: data.mapName, posX: data.x, posY: data.y } : prev
    );
    addNotification('info', `Entering ${MAP_DATA[data.mapName]?.displayName ?? data.mapName}`);
  }, [addNotification]);

  const handlePlayerLeave = useCallback((data: { playerId: string }) => {
    engineRef.current?.removePlayer(data.playerId);
  }, []);

  const handlePartyUpdate = useCallback((data: PartyState | null) => {
    setParty(data);
    setPartyInvite(null);
  }, []);

  const handlePartyInvited = useCallback((data: { from: string }) => {
    setPartyInvite(data.from);
    setShowParty(true);
  }, []);

  const handleGuildUpdate = useCallback((data: GuildState | null) => {
    setGuild(data);
    setGuildInvite(null);
  }, []);

  const handleGuildInvited = useCallback((data: { from: string; guildName: string }) => {
    setGuildInvite(data);
    setShowGuild(true);
  }, []);

  const {
    sendMove, sendChat, sendAttack, sendPickup,
    sendEquip, sendUnequip, sendUseItem,
    sendRefineItem, sendSocketItem, sendUnsocketItem,
    sendShopBuy, sendShopSell,
    sendLearnSkill, sendUseSkill,
    sendNpcTalk, sendQuestAccept, sendQuestComplete, sendRespawn, sendAllocateStats,
    sendPartyInvite, sendPartyAccept, sendPartyDecline, sendPartyLeave, sendPartyKick,
    sendGuildCreate, sendGuildInvite, sendGuildAccept, sendGuildDecline, sendGuildLeave,
  } = useSocket({
    characterId,
    onStateDelta: handleStateDelta,
    onChatMessage: handleChatMessage,
    onNotification: handleNotification,
    onPlayerStats: handlePlayerStats,
    onCombatResult: handleCombatResult,
    onMonsterDie: handleMonsterDie,
    onItemDropped: handleItemDropped,
    onItemPicked: handleItemPicked,
    onLevelUp: handleLevelUp,
    onInventoryLoad: handleInventoryLoad,
    onInventoryUpdate: handleInventoryUpdate,
    onShopOpen: handleShopOpen,
    onSkillsLoad: handleSkillsLoad,
    onSkillsUpdate: handleSkillsUpdate,
    onQuestsLoad: handleQuestsLoad,
    onQuestsUpdate: handleQuestsUpdate,
    onNpcDialog: handleNpcDialog,
    onMapChange: handleMapChange,
    onPlayerLeave: handlePlayerLeave,
    onPlayerDead: handlePlayerDead,
    onStatsUpdate: handleStatsUpdate,
    onPartyUpdate: handlePartyUpdate,
    onPartyInvited: handlePartyInvited,
    onGuildUpdate: handleGuildUpdate,
    onGuildInvited: handleGuildInvited,
  });

  // Load auth
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Load character data
  useEffect(() => {
    if (!characterId) {
      router.push('/character-select');
      return;
    }

    apiFetch<Character>(`/characters/${characterId}`)
      .then((c) => {
        setCharacter(c);
        setStats({
          hp: c.hp, maxHp: c.maxHp,
          sp: c.sp, maxSp: c.maxSp,
          baseExp: c.baseExp, jobExp: c.jobExp,
          baseLevel: c.baseLevel, jobLevel: c.jobLevel,
          zeny: c.zeny,
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [characterId, router]);

  // Initialize game engine
  useEffect(() => {
    if (!character || !containerRef.current) return;

    const mapData = MAP_DATA[character.mapName];
    if (!mapData) {
      setError(`Map "${character.mapName}" not found`);
      return;
    }

    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    const engine = new GameEngine({
      container,
      width,
      height,
      mapData,
      playerName: character.name,
      characterId,
      playerClass: character.class,
      startX: Math.floor(character.posX),
      startY: Math.floor(character.posY),
      onMoveRequest: (path) => {
        const target = path[path.length - 1];
        sendMove(target.x, target.y);
      },
      onAttackRequest: (targetId) => {
        sendAttack(targetId);
      },
      onPickupRequest: (dropId) => {
        sendPickup(dropId);
      },
      onNpcTalk: (npcId) => {
        sendNpcTalk(npcId);
      },
    });

    let cancelled = false;
    engine.init().then(() => {
      if (cancelled) return; // effect cleaned up during init — engine already aborted itself
      engineRef.current = engine;
      // Apply the map snapshot that arrived during init (warp flow)
      if (pendingDeltaRef.current) {
        applyDelta(engine, pendingDeltaRef.current);
        pendingDeltaRef.current = null;
      }
    });

    const handleResize = () => {
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 600;
      engine.resize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelled = true;
      window.removeEventListener('resize', handleResize);
      engine.destroy();
      engineRef.current = null;
    };
  }, [character, characterId, sendMove, sendAttack, sendPickup, sendNpcTalk, applyDelta]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'i' || e.key === 'I') {
        setShowInventory((v) => !v);
        setShowEquipment(false);
        setShopData(null);
      }
      if (e.key === 'e' || e.key === 'E') {
        setShowEquipment((v) => !v);
        setShowInventory(false);
        setShopData(null);
      }
      if (e.key === 's' || e.key === 'S') {
        setShowSkills((v) => !v);
        setShowInventory(false);
        setShowEquipment(false);
        setShopData(null);
      }
      if (e.key === 'q' || e.key === 'Q') {
        setShowQuests((v) => !v);
      }
      if (e.key === 'a' || e.key === 'A') {
        setShowStatus((v) => !v);
      }
      if (e.key === 'c' || e.key === 'C') {
        setShowCharacterDetail((v) => !v);
      }
      if (e.key === 'p' || e.key === 'P') {
        setShowParty((v) => !v);
        setShowGuild(false);
      }
      if (e.key === 'g' || e.key === 'G') {
        setShowGuild((v) => !v);
        setShowParty(false);
      }
      if (e.key === 'Escape') {
        setShowInventory(false);
        setShowEquipment(false);
        setShowSkills(false);
        setShowQuests(false);
        setShowParty(false);
        setShowGuild(false);
        setShowStatus(false);
        setShowCharacterDetail(false);
        setShopData(null);
        setNpcDialog(null);
      }
      // Skill bar hotkeys 1-9
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 9) {
        const skillId = skillBar[num - 1];
        if (skillId) sendUseSkill(skillId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [skillBar, sendUseSkill]);

  // Chat submit
  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendChat('all', chatInput.trim());
    setChatInput('');
  };

  if (loading) {
    return <main style={centerStyle}><p>Loading game...</p></main>;
  }

  if (error) {
    return (
      <main style={centerStyle}>
        <p style={{ color: '#ff6b6b' }}>Error: {error}</p>
        <button onClick={() => router.push('/character-select')} style={btnStyle}>Back to Character Select</button>
      </main>
    );
  }

  // Use live stats from server, fallback to character data
  const hp = stats?.hp ?? character?.hp ?? 0;
  const maxHp = stats?.maxHp ?? character?.maxHp ?? 0;
  const sp = stats?.sp ?? character?.sp ?? 0;
  const maxSp = stats?.maxSp ?? character?.maxSp ?? 0;
  const baseLevel = stats?.baseLevel ?? character?.baseLevel ?? 1;
  const jobLevel = stats?.jobLevel ?? character?.jobLevel ?? 1;
  const baseExp = stats?.baseExp ?? character?.baseExp ?? 0;
  const jobExp = stats?.jobExp ?? character?.jobExp ?? 0;
  const atk = stats?.atk;
  const matk = stats?.matk;
  const hit = stats?.hit;
  const flee = stats?.flee;
  const critChance = stats?.critChance;
  const def = stats?.def;
  const mdef = stats?.mdef;
  const aspd = stats?.aspd;
  const effectiveStats = stats?.effectiveStats;
  const statPreview = stats?.statPreview;
  const zeny = stats?.zeny ?? character?.zeny ?? 0;

  const baseExpPct = baseLevel >= MAX_BASE_LEVEL ? 1 : baseExp / baseExpRequired(baseLevel + 1);
  const jobExpPct = jobLevel >= MAX_JOB_LEVEL ? 1 : jobExp / jobExpRequired(jobLevel + 1);

  return (
    <main style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {/* HUD - Top Left */}
      <div style={hudStyle}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <span style={{ fontWeight: 'bold' }}>{character?.name}</span>
          <span style={{ color: '#aaa', fontSize: 12 }}>
            Base Lv.{baseLevel} / Job Lv.{jobLevel} {character?.class}
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <StatBar label="HP" text={`${hp}/${maxHp}`} pct={maxHp > 0 ? hp / maxHp : 0} color="#e94560" />
          <StatBar label="SP" text={`${sp}/${maxSp}`} pct={maxSp > 0 ? sp / maxSp : 0} color="#3498db" />
          <StatBar
            label="Base"
            text={baseLevel >= MAX_BASE_LEVEL ? 'MAX' : `${Math.floor(baseExpPct * 100)}%`}
            pct={baseExpPct}
            color="#2ecc71"
          />
          <StatBar
            label="Job"
            text={jobLevel >= MAX_JOB_LEVEL ? 'MAX' : `${Math.floor(jobExpPct * 100)}%`}
            pct={jobExpPct}
            color="#5dade2"
          />
        </div>
        <div style={{ fontSize: 12 }}>
          <span style={{ color: '#f1c40f' }}>Zeny {zeny}</span>
        </div>
        {localStatus && (
          <div style={{ marginTop: 2 }}>
            <span
              style={{
                fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5,
                padding: '2px 8px', borderRadius: 4, background: 'rgba(155,89,182,0.25)',
                border: '1px solid #9b59b6', color: '#e8d5f0',
              }}
            >
              {localStatus}
            </span>
          </div>
        )}
      </div>

      {/* Map name - Top Right */}
      <div style={{ position: 'absolute', top: 8, right: 16, color: '#888', fontSize: 13, zIndex: 10 }}>
        {MAP_DATA[character?.mapName || '']?.displayName || character?.mapName}
      </div>

      {/* Quick buttons - Bottom Right */}
      <div style={quickBtnContainerStyle}>
        <button
          onClick={() => { setShowInventory((v) => !v); setShowEquipment(false); setShowSkills(false); setShopData(null); }}
          style={{ ...quickBtnStyle, borderColor: showInventory ? '#f39c12' : '#555' }}
          title="Inventory (I)"
        >
          INV
        </button>
        <button
          onClick={() => { setShowEquipment((v) => !v); setShowInventory(false); setShowSkills(false); setShopData(null); }}
          style={{ ...quickBtnStyle, borderColor: showEquipment ? '#f39c12' : '#555' }}
          title="Equipment (E)"
        >
          EQ
        </button>
        <button
          onClick={() => { setShowSkills((v) => !v); setShowInventory(false); setShowEquipment(false); setShopData(null); }}
          style={{ ...quickBtnStyle, borderColor: showSkills ? '#f39c12' : '#555' }}
          title="Skills (S)"
        >
          SKL
        </button>
        <button
          onClick={() => setShowStatus((v) => !v)}
          style={{ ...quickBtnStyle, borderColor: showStatus ? '#f39c12' : '#555' }}
          title="Status (A)"
        >
          STA{statPoints > 0 ? ` +${statPoints}` : ''}
        </button>
        <button
          onClick={() => setShowQuests((v) => !v)}
          style={{ ...quickBtnStyle, borderColor: showQuests ? '#f39c12' : '#555' }}
          title="Quests (Q)"
        >
          QST
        </button>
        <button
          onClick={() => { setShowParty((v) => !v); setShowGuild(false); }}
          style={{ ...quickBtnStyle, borderColor: showParty ? '#f39c12' : '#555' }}
          title="Party (P)"
        >
          PTY
        </button>
        <button
          onClick={() => { setShowGuild((v) => !v); setShowParty(false); }}
          style={{ ...quickBtnStyle, borderColor: showGuild ? '#f39c12' : '#555' }}
          title="Guild (G)"
        >
          GLD
        </button>
      </div>

      {/* Notifications - Top Center */}
      <div style={notifContainerStyle}>
        {notifications.map((n) => (
          <div key={n.id} style={{
            ...notifStyle,
            borderColor: n.type === 'error' ? '#e74c3c' : n.type === 'warning' ? '#f39c12' : '#2ecc71',
          }}>
            {n.message}
          </div>
        ))}
      </div>

      {/* Inventory Window */}
      {showInventory && (
        <InventoryWindow
          items={inventory}
          maxWeight={maxWeight}
          onEquip={sendEquip}
          onUnequip={sendUnequip}
          onUseItem={sendUseItem}
          onRefine={sendRefineItem}
          onSocket={sendSocketItem}
          onUnsocket={sendUnsocketItem}
          onClose={() => setShowInventory(false)}
        />
      )}

      {/* Equipment Window */}
      {showEquipment && (
        <EquipmentWindow
          items={inventory}
          onUnequip={sendUnequip}
          onClose={() => setShowEquipment(false)}
        />
      )}

      {/* Character Detail Window — equipment + full stat overview, read-only */}
      {showCharacterDetail && (
        <CharacterDetailWindow
          items={inventory}
          effectiveStats={effectiveStats ?? baseStats}
          baseLevel={baseLevel}
          jobLevel={jobLevel}
          hp={hp}
          maxHp={maxHp}
          sp={sp}
          maxSp={maxSp}
          atk={atk}
          matk={matk}
          hit={hit}
          flee={flee}
          critChance={critChance}
          def={def}
          mdef={mdef}
          aspd={aspd}
          onClose={() => setShowCharacterDetail(false)}
        />
      )}

      {/* Shop Window */}
      {shopData && (
        <ShopWindow
          shop={shopData}
          inventory={inventory}
          zeny={zeny}
          onBuy={sendShopBuy}
          onSell={sendShopSell}
          onClose={() => setShopData(null)}
        />
      )}

      {/* Skill Window */}
      {showSkills && (
        <SkillWindow
          learnedSkills={skills}
          skillPoints={skillPoints}
          characterClass={character?.class || ''}
          onLearn={sendLearnSkill}
          onClose={() => setShowSkills(false)}
        />
      )}

      {/* Death overlay — covers the canvas so no input reaches the game */}
      {isDead && (
        <div style={deathOverlayStyle}>
          <div style={{ fontSize: 42, fontWeight: 'bold', color: '#e94560' }}>You Died</div>
          <div style={{ fontSize: 14, color: '#aaa' }}>Your journey ends here... for now.</div>
          <button onClick={sendRespawn} style={respawnBtnStyle}>
            Respawn at Prontera
          </button>
        </div>
      )}

      {/* Status Window */}
      {showStatus && baseStats && (
        <StatusWindow
          stats={baseStats}
          statPoints={statPoints}
          hp={hp}
          maxHp={maxHp}
          sp={sp}
          maxSp={maxSp}
          baseLevel={baseLevel}
          jobLevel={jobLevel}
          atk={atk}
          matk={matk}
          hit={hit}
          flee={flee}
          critChance={critChance}
          statPreview={statPreview}
          onAllocate={(stat) => {
            const alloc: BaseStats = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 };
            alloc[stat] = 1;
            sendAllocateStats(alloc);
          }}
          onClose={() => setShowStatus(false)}
        />
      )}

      {/* Quest Window */}
      {showQuests && (
        <QuestWindow quests={quests} onClose={() => setShowQuests(false)} />
      )}

      {/* NPC Dialog */}
      {npcDialog && (
        <NpcDialogWindow
          dialog={npcDialog}
          quests={quests}
          onAcceptQuest={(questId) => { sendQuestAccept(questId); setNpcDialog(null); }}
          onCompleteQuest={(questId) => { sendQuestComplete(questId); setNpcDialog(null); }}
          onClose={() => setNpcDialog(null)}
        />
      )}

      {/* Party Window */}
      {showParty && (
        <PartyWindow
          party={party}
          myId={characterId}
          pendingInvite={partyInvite}
          onInvite={sendPartyInvite}
          onAccept={sendPartyAccept}
          onDecline={() => { sendPartyDecline(); setPartyInvite(null); }}
          onLeave={sendPartyLeave}
          onKick={sendPartyKick}
          onClose={() => setShowParty(false)}
        />
      )}

      {/* Guild Window */}
      {showGuild && (
        <GuildWindow
          guild={guild}
          myId={characterId}
          pendingInvite={guildInvite}
          onCreate={sendGuildCreate}
          onInvite={sendGuildInvite}
          onAccept={sendGuildAccept}
          onDecline={() => { sendGuildDecline(); setGuildInvite(null); }}
          onLeave={sendGuildLeave}
          onClose={() => setShowGuild(false)}
        />
      )}

      {/* Skill Bar */}
      <SkillBar
        skills={skills}
        skillBar={skillBar}
        onUseSkill={sendUseSkill}
        onSetSlot={(slot, skillId) => {
          setSkillBar((prev) => {
            const newBar = [...prev];
            newBar[slot] = skillId;
            return newBar;
          });
        }}
      />

      {/* Chat Box - Bottom Left */}
      <div style={chatBoxStyle}>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12 }}>
          {chatMessages.map((msg, i) => (
            <div key={i}>
              <span style={{ color: '#e94560', fontWeight: 'bold' }}>{msg.from}: </span>
              <span>{msg.message}</span>
            </div>
          ))}
        </div>
        <form onSubmit={handleChatSubmit} style={{ display: 'flex', gap: 4 }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Press Enter to chat..."
            style={chatInputStyle}
          />
        </form>
      </div>

      {/* Game Canvas (engine appends its own canvas here) */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </main>
  );
}

const centerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  minHeight: '100vh', gap: 16,
};

const btnStyle: React.CSSProperties = {
  padding: '10px 20px', borderRadius: 6, border: '1px solid #444',
  background: 'transparent', color: '#aaa', fontSize: 14, cursor: 'pointer',
};

const hudStyle: React.CSSProperties = {
  position: 'absolute', top: 8, left: 16, zIndex: 10,
  background: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: '8px 16px',
  display: 'flex', flexDirection: 'column', gap: 4,
};

const chatBoxStyle: React.CSSProperties = {
  position: 'absolute', bottom: 8, left: 8, zIndex: 10,
  width: 360, height: 180,
  background: 'rgba(0,0,0,0.75)', borderRadius: 8, padding: 8,
  display: 'flex', flexDirection: 'column', gap: 4,
  color: '#ddd',
};

const chatInputStyle: React.CSSProperties = {
  flex: 1, padding: '6px 10px', borderRadius: 4,
  border: '1px solid #444', background: '#16213e', color: '#eee', fontSize: 12,
};

const notifContainerStyle: React.CSSProperties = {
  position: 'absolute', top: 50, left: '50%', transform: 'translateX(-50%)',
  zIndex: 20, display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center',
};

const notifStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.85)', borderRadius: 6, padding: '6px 16px',
  fontSize: 13, color: '#fff', borderLeft: '3px solid',
};

const quickBtnContainerStyle: React.CSSProperties = {
  position: 'absolute', bottom: 12, right: 16, zIndex: 10,
  display: 'flex', gap: 6,
};

const deathOverlayStyle: React.CSSProperties = {
  position: 'absolute', inset: 0, zIndex: 50,
  background: 'rgba(10,0,0,0.75)',
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  gap: 16,
};

const respawnBtnStyle: React.CSSProperties = {
  padding: '12px 32px', borderRadius: 8, border: '1px solid #e94560',
  background: 'rgba(233,69,96,0.15)', color: '#e94560', cursor: 'pointer',
  fontSize: 16, fontWeight: 'bold',
};

const quickBtnStyle: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 4, border: '1px solid #555',
  background: 'rgba(0,0,0,0.7)', color: '#ccc', cursor: 'pointer',
  fontSize: 12, fontWeight: 'bold',
};
