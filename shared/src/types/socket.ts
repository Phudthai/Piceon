export interface ClientToServerEvents {
  'player:move': (data: { targetX: number; targetY: number }) => void;
  'player:attack': (data: { targetId: string }) => void;
  'skill:use': (data: { skillId: number; targetId?: string; targetPos?: { x: number; y: number } }) => void;
  'skill:learn': (data: { skillId: number }) => void;
  'item:pickup': (data: { dropId: string }) => void;
  'item:equip': (data: { inventoryId: string }) => void;
  'item:unequip': (data: { inventoryId: string }) => void;
  'item:use': (data: { inventoryId: string }) => void;
  'shop:buy': (data: { npcId: string; itemId: number; quantity: number }) => void;
  'shop:sell': (data: { inventoryId: string; quantity: number }) => void;
  'item:refine': (data: { inventoryId: string; useProtection: boolean }) => void;
  'item:socket': (data: { inventoryId: string; socketType: 'CARD' | 'RUNE'; socketIndex: number; cardInventoryId: string }) => void;
  'item:unsocket': (data: { inventoryId: string; socketType: 'CARD' | 'RUNE'; socketIndex: number }) => void;
  'chat:send': (data: { channel: 'all' | 'party' | 'guild' | 'whisper'; message: string; to?: string }) => void;
  'party:invite': (data: { targetName: string }) => void;
  'party:accept': () => void;
  'party:decline': () => void;
  'party:leave': () => void;
  'party:kick': (data: { targetId: string }) => void;
  'guild:create': (data: { guildName: string }) => void;
  'guild:invite': (data: { targetName: string }) => void;
  'guild:accept': () => void;
  'guild:decline': () => void;
  'guild:leave': () => void;
  'npc:talk': (data: { npcId: string }) => void;
  'npc:choice': (data: { npcId: string; choice: number }) => void;
  'quest:accept': (data: { questId: number }) => void;
  'quest:complete': (data: { questId: number }) => void;
  'player:respawn': () => void;
  'stats:allocate': (data: StatAllocation) => void;
  'trade:request': (data: { targetId: string }) => void;
  'trade:offer': (data: { items: ItemStack[]; zeny: number }) => void;
  'trade:confirm': () => void;
}

export interface ServerToClientEvents {
  'state:delta': (data: StateDelta) => void;
  'player:stats': (data: PlayerStats) => void;
  'combat:result': (data: CombatResult) => void;
  'monster:die': (data: { monsterId: string; killerId: string; x: number; y: number; zenyGained: number }) => void;
  'item:dropped': (data: { dropId: string; itemId: number; x: number; y: number }) => void;
  'item:picked': (data: { dropId: string; playerId: string }) => void;
  'inventory:load': (data: { items: import('./inventory').InventoryItem[]; maxWeight?: number }) => void;
  'inventory:update': (data: { items: import('./inventory').InventoryItem[]; maxWeight?: number }) => void;
  'shop:open': (data: import('./inventory').ShopData) => void;
  'skills:load': (data: { skills: import('./skill').PlayerSkill[]; skillPoints: number }) => void;
  'skills:update': (data: { skills: import('./skill').PlayerSkill[]; skillPoints: number }) => void;
  'party:update': (data: import('./party').PartyState | null) => void;
  'party:invited': (data: { from: string }) => void;
  'guild:update': (data: import('./party').GuildState | null) => void;
  'guild:invited': (data: { from: string; guildName: string }) => void;
  'chat:message': (data: ChatMessage) => void;
  'npc:dialog': (data: NpcDialog) => void;
  'quests:load': (data: { quests: import('./quest').PlayerQuest[] }) => void;
  'quests:update': (data: { quests: import('./quest').PlayerQuest[] }) => void;
  'map:change': (data: { mapName: string; x: number; y: number }) => void;
  'player:leave': (data: { playerId: string }) => void;
  'player:dead': () => void;
  'player:revived': (data: { hp: number; maxHp: number }) => void;
  'stats:update': (data: BaseStats & { statPoints: number }) => void;
  'level:up': (data: { type: 'base' | 'job'; newLevel: number }) => void;
  'notification': (data: { type: 'info' | 'warning' | 'error'; message: string }) => void;
}

export interface ItemStack {
  itemId: number;
  quantity: number;
}

export interface StateDelta {
  players: Record<string, PlayerState>;
  monsters: Record<string, MonsterState>;
  drops: Record<string, DropState>;
}

/** Active status condition, shown as a visual ring/overlay on the entity's sprite */
export type StatusEffectKind = 'stun' | 'freeze' | 'root' | 'silence' | 'poison' | 'blind' | 'petrify' | 'stealth';

export interface PlayerState {
  id: string;
  name: string;
  class: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  action: 'idle' | 'walk' | 'attack' | 'cast' | 'dead';
  direction: number;
  status?: StatusEffectKind;
}

export interface MonsterState {
  id: string;
  definitionId: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  action: 'idle' | 'walk' | 'attack' | 'dead';
  isShiny?: boolean;
  status?: StatusEffectKind;
}

export interface DropState {
  id: string;
  itemId: number;
  x: number;
  y: number;
}

export interface PlayerStats {
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  baseExp: number;
  jobExp: number;
  baseLevel: number;
  jobLevel: number;
  /** Omitted when the server doesn't know the current zeny (client keeps its last value) */
  zeny?: number;
  /** Sent when point totals change (level up, allocation) */
  statPoints?: number;
  skillPoints?: number;
  /** Derived combat stats, computed server-side from base stats + equipment + passives */
  atk?: number;
  matk?: number;
  hit?: number;
  flee?: number;
  critChance?: number;
  def?: number;
  mdef?: number;
  /** Attack speed — RO-style value (100 at AGI=1, asymptotic toward 190) */
  aspd?: number;
  /** Base stats + socketed card bonuses + passive skill bonuses — the "true" total
   *  shown on the Character Detail sheet, distinct from the raw allocatable base stat
   *  shown on the Status window (which intentionally excludes card/passive bonuses). */
  effectiveStats?: BaseStats;
  /** Marginal gain from spending the next point on each stat (for the Status window tooltip) */
  statPreview?: {
    str: number; // ATK delta from +1 STR
    agi: number; // Flee delta from +1 AGI
    vit: number; // MaxHP delta from +1 VIT
    int: number; // MATK delta from +1 INT
    dex: number; // Hit delta from +1 DEX
    luk: number; // Crit% delta from +1 LUK
  };
}

export interface BaseStats {
  str: number;
  agi: number;
  vit: number;
  int: number;
  dex: number;
  luk: number;
}

/** Points to add to each stat (all ≥ 0) */
export type StatAllocation = BaseStats;

export interface CombatResult {
  attackerId: string;
  targetId: string;
  damage: number;
  isCrit: boolean;
  isMiss: boolean;
  skillId?: number;
}

export interface NpcDialog {
  npcId: string;
  npcName: string;
  text: string;
  quests: import('./quest').NpcQuestInfo[];
}

export interface ChatMessage {
  channel: 'all' | 'party' | 'guild' | 'whisper';
  from: string;
  message: string;
  timestamp: number;
}
