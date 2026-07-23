/**
 * In-memory game state for all active players, monsters, and drops.
 * This is the authoritative state — Redis is used for persistence, not truth.
 */

import type { MoveAction } from './systems/movement';

/** Base carry capacity before Pushcart/Iron Grip passive bonuses (Phase 8) */
export const BASE_MAX_WEIGHT = 2000;

/** A timed stat modifier or status condition, applied to a player or monster by a
 * BUFF/DEBUFF-type skill. In-memory only — ephemeral, lost on disconnect/respawn,
 * same precedent as attackCooldown. */
export interface ActiveEffect {
  skillId: number;
  stat?: 'atk' | 'def' | 'flee' | 'hit' | 'moveSpeed' | 'critRate';
  amountPct?: number;
  amountFlat?: number;
  status?: 'stun' | 'freeze' | 'root' | 'silence' | 'poison' | 'blind' | 'petrify' | 'stealth';
  tickDamage?: number;
  healPerTick?: number;
  remainingTicks: number;
  sourceId: string;
}

/** An in-progress skill cast (castTime > 0, ASPD-scaled). Gates movement/attack/other
 *  skill use until it resolves. In-memory only, same precedent as attackCooldown. */
export interface PendingCast {
  skillId: number;
  skillLevel: number;
  targetId?: string; // monsterId or characterId depending on the skill's targetType
  remainingTicks: number;
  totalTicks: number;
}

export interface PlayerState {
  characterId: string;
  userId: string;
  socketId: string;
  name: string;
  class: string;
  mapName: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  baseLevel: number;
  jobLevel: number;
  baseExp: number;
  jobExp: number;
  str: number;
  agi: number;
  vit: number;
  int: number;
  dex: number;
  luk: number;
  weaponAtk: number;
  /** Basic-attack range in tiles (Chebyshev distance), from the equipped weapon */
  weaponRange: number;
  /** Armor DEF total from equipped armor (base + refine + card bonuses) */
  armorDef: number;
  /** MATK from equipped weapon + socketed card bonuses (analogous to weaponAtk) */
  weaponMatk: number;
  /** MDEF from equipped armor + socketed card bonuses (analogous to armorDef) */
  armorMdef: number;
  /** Flat stat bonuses from socketed cards (str/agi/vit/int/dex/luk) */
  bonusStr: number;
  bonusAgi: number;
  bonusVit: number;
  bonusInt: number;
  bonusDex: number;
  bonusLuk: number;
  /** Skill-damage bonus percent from socketed runes */
  skillDamageBonus: { all: number; bySkillId: Record<number, number> };
  /** Always-on bonuses from learned PASSIVE skills (Phase 3) — additive alongside
   * the bonusStr-style card fields above, both read together wherever those are used */
  passiveBonus: {
    str: number; agi: number; vit: number; int: number; dex: number; luk: number;
    atk: number; matk: number; def: number; critRate: number; weight: number;
    shopBuyPct: number; shopSellPct: number; refineSuccessPct: number; zenyBonusPct: number;
  };
  /** Timed buffs/debuffs/status conditions currently affecting this player */
  activeEffects: ActiveEffect[];
  /** Ticks remaining before each skill can be used again, keyed by skillId */
  skillCooldowns: Record<number, number>;
  /** Non-null while a castTime>0 skill is being cast; cleared when it resolves or the caster dies */
  pendingCast: PendingCast | null;
  /** In-memory mirror of Character.zeny, kept in sync wherever zeny changes are pushed to the client */
  zeny: number;
  /** Total item weight currently carried / carry capacity (Phase 8) */
  currentWeight: number;
  maxWeight: number;
  /** Saved recall point (Phase 6 Warp Portal); null until first saved */
  savedMapName: string | null;
  savedPosX: number | null;
  savedPosY: number | null;
  /** Tick count at time of death, for Redemptio's revive grace window (Phase 9) */
  deathTimestamp: number | null;
  action: 'idle' | 'walk' | 'attack' | 'cast' | 'dead';
  direction: number;
  moveAction: MoveAction | null;
  moveCooldown: number; // ticks until next movement step
  attackTarget: string | null; // monsterId being attacked
  attackCooldown: number; // ticks until next attack
  dirty: boolean;
}

export interface MonsterInstance {
  id: string; // unique runtime ID
  definitionId: number;
  name: string;
  displayName: string;
  mapName: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  matk: number;
  mdef: number;
  moveSpeed: number;
  moveCooldown: number; // ticks until next chase-movement step, mirrors PlayerState.moveCooldown
  attackRange: number;
  aiType: 'PASSIVE' | 'AGGRESSIVE' | 'ASSIST' | 'BOSS';
  level: number;
  baseExp: number;
  jobExp: number;
  respawnTime: number; // seconds
  zenyMin: number;
  zenyMax: number;
  /** Rare spawn-time variant: tougher stats, bigger rewards (see SpawnManager SHINY_* constants) */
  isShiny: boolean;
  /** Timed debuffs/status conditions currently affecting this monster */
  activeEffects: ActiveEffect[];
  aggroTarget: string | null; // characterId
  action: 'idle' | 'walk' | 'attack' | 'dead';
  attackCooldown: number;
  deathTimer: number; // ticks until respawn (-1 if alive)
  spawnArea: { x1: number; y1: number; x2: number; y2: number };
  dirty: boolean;
  drops: Array<{ itemId: number; rate: number }>;
}

export interface DropInstance {
  id: string;
  itemId: number;
  mapName: string;
  x: number;
  y: number;
  despawnTimer: number; // ticks until despawn
  ownerId: string | null; // character who killed monster (drop priority)
  ownerTimer: number; // ticks until anyone can pick up
  dirty: boolean;
}

export interface MapRoom {
  name: string;
  players: Map<string, PlayerState>;
  monsters: Map<string, MonsterInstance>;
  drops: Map<string, DropInstance>;
}

let nextMonsterId = 1;
let nextDropId = 1;

export function generateMonsterId(): string {
  return `mob_${nextMonsterId++}`;
}

export function generateDropId(): string {
  return `drop_${nextDropId++}`;
}

class GameState {
  private maps: Map<string, MapRoom> = new Map();
  private tickCount = 0;

  /** Incremented once per GameLoop tick — used to timestamp events like player death
   * (Redemptio's revival grace window) without depending on wall-clock time. */
  incrementTick(): number {
    return ++this.tickCount;
  }

  getTickCount(): number {
    return this.tickCount;
  }

  getRoom(mapName: string): MapRoom {
    let room = this.maps.get(mapName);
    if (!room) {
      room = { name: mapName, players: new Map(), monsters: new Map(), drops: new Map() };
      this.maps.set(mapName, room);
    }
    return room;
  }

  // ─── Players ────────────────────────────────────────

  addPlayer(player: PlayerState): void {
    const room = this.getRoom(player.mapName);
    room.players.set(player.characterId, player);
  }

  removePlayer(characterId: string): PlayerState | null {
    for (const room of this.maps.values()) {
      const player = room.players.get(characterId);
      if (player) {
        room.players.delete(characterId);
        return player;
      }
    }
    return null;
  }

  getPlayer(characterId: string): PlayerState | null {
    for (const room of this.maps.values()) {
      const player = room.players.get(characterId);
      if (player) return player;
    }
    return null;
  }

  getPlayerBySocket(socketId: string): PlayerState | null {
    for (const room of this.maps.values()) {
      for (const player of room.players.values()) {
        if (player.socketId === socketId) return player;
      }
    }
    return null;
  }

  /** Move a player to another map room (warp). Position is set to the destination. */
  movePlayerToMap(characterId: string, mapName: string, x: number, y: number): PlayerState | null {
    const player = this.removePlayer(characterId);
    if (!player) return null;
    player.mapName = mapName;
    player.x = x;
    player.y = y;
    player.moveAction = null;
    player.attackTarget = null;
    player.action = 'idle';
    player.dirty = true;
    this.addPlayer(player);
    return player;
  }

  getPlayersInMap(mapName: string): PlayerState[] {
    const room = this.maps.get(mapName);
    return room ? Array.from(room.players.values()) : [];
  }

  getActiveRooms(): MapRoom[] {
    return Array.from(this.maps.values()).filter(
      (r) => r.players.size > 0 || r.monsters.size > 0
    );
  }

  markDirty(characterId: string): void {
    const player = this.getPlayer(characterId);
    if (player) player.dirty = true;
  }

  getDirtyPlayers(mapName: string): PlayerState[] {
    const room = this.maps.get(mapName);
    if (!room) return [];
    const dirty: PlayerState[] = [];
    for (const player of room.players.values()) {
      if (player.dirty) { dirty.push(player); player.dirty = false; }
    }
    return dirty;
  }

  // ─── Monsters ───────────────────────────────────────

  addMonster(monster: MonsterInstance): void {
    const room = this.getRoom(monster.mapName);
    room.monsters.set(monster.id, monster);
  }

  getMonster(mapName: string, monsterId: string): MonsterInstance | null {
    return this.maps.get(mapName)?.monsters.get(monsterId) || null;
  }

  getMonstersInMap(mapName: string): MonsterInstance[] {
    const room = this.maps.get(mapName);
    return room ? Array.from(room.monsters.values()) : [];
  }

  getDirtyMonsters(mapName: string): MonsterInstance[] {
    const room = this.maps.get(mapName);
    if (!room) return [];
    const dirty: MonsterInstance[] = [];
    for (const m of room.monsters.values()) {
      if (m.dirty) { dirty.push(m); m.dirty = false; }
    }
    return dirty;
  }

  // ─── Drops ──────────────────────────────────────────

  addDrop(drop: DropInstance): void {
    const room = this.getRoom(drop.mapName);
    room.drops.set(drop.id, drop);
  }

  getDrop(mapName: string, dropId: string): DropInstance | null {
    return this.maps.get(mapName)?.drops.get(dropId) || null;
  }

  removeDrop(mapName: string, dropId: string): DropInstance | null {
    const room = this.maps.get(mapName);
    const drop = room?.drops.get(dropId);
    if (drop) { room!.drops.delete(dropId); return drop; }
    return null;
  }

  getDropsInMap(mapName: string): DropInstance[] {
    const room = this.maps.get(mapName);
    return room ? Array.from(room.drops.values()) : [];
  }

  getDirtyDrops(mapName: string): DropInstance[] {
    const room = this.maps.get(mapName);
    if (!room) return [];
    const dirty: DropInstance[] = [];
    for (const d of room.drops.values()) {
      if (d.dirty) { dirty.push(d); d.dirty = false; }
    }
    return dirty;
  }
}

export const gameState = new GameState();
