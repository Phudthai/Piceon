/**
 * Monster Spawn Manager.
 * Reads spawn zones from map data + monster definitions from JSON.
 * Creates MonsterInstances in GameState and handles respawning.
 */

import fs from 'fs';
import path from 'path';
import { gameState, generateMonsterId, type MonsterInstance } from '../GameState';
import type { MapData } from '../maps/MapLoader';
import { TICK_RATE } from '@ro-game/shared';

interface MonsterDefinition {
  id: number;
  name: string;
  displayName: string;
  level: number;
  hp: number;
  atk: number;
  def: number;
  matk: number;
  mdef: number;
  moveSpeed: number;
  attackRange: number;
  aiType: 'PASSIVE' | 'AGGRESSIVE' | 'ASSIST' | 'BOSS';
  baseExp: number;
  jobExp: number;
  respawnTime: number;
  zenyMin: number;
  zenyMax: number;
  drops: Array<{ itemId: number; rate: number }>;
}

// Shiny variant: rare spawn-time upgrade — tougher, but noticeably more rewarding
const SHINY_SPAWN_CHANCE = 0.03;
const SHINY_HP_MULT = 2;
const SHINY_ATK_MULT = 1.5;
const SHINY_DEF_MULT = 1.3;
const SHINY_REWARD_MULT = 3;

const monsterDefs = new Map<number, MonsterDefinition>();

/** Load monster definitions from JSON */
function loadMonsterDefinitions(): void {
  if (monsterDefs.size > 0) return;

  const filePath = path.resolve(__dirname, '../../../../data/monsters/monsters.json');
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const monsters: MonsterDefinition[] = JSON.parse(raw);
    for (const m of monsters) {
      monsterDefs.set(m.id, m);
    }
    console.log(`[SpawnManager] Loaded ${monsterDefs.size} monster definitions`);
  } catch (err) {
    console.error('[SpawnManager] Failed to load monster definitions:', err);
  }
}

export function getMonsterDef(id: number): MonsterDefinition | undefined {
  loadMonsterDefinitions();
  return monsterDefs.get(id);
}

/** Roll a fresh set of effective stats/rewards for a monster instance — a 3% chance
 * to come out "shiny" (tougher, but noticeably more rewarding). Callers just use
 * whatever numbers come back; downstream systems (combat, drops, EXP) are unaware
 * of shininess and read these as plain instance stats. */
function rollMonsterStats(def: MonsterDefinition): {
  isShiny: boolean;
  hp: number;
  atk: number;
  def: number;
  baseExp: number;
  jobExp: number;
  zenyMin: number;
  zenyMax: number;
  drops: Array<{ itemId: number; rate: number }>;
} {
  const isShiny = Math.random() < SHINY_SPAWN_CHANCE;
  if (!isShiny) {
    return {
      isShiny: false,
      hp: def.hp,
      atk: def.atk,
      def: def.def,
      baseExp: def.baseExp,
      jobExp: def.jobExp,
      zenyMin: def.zenyMin,
      zenyMax: def.zenyMax,
      drops: def.drops || [],
    };
  }

  return {
    isShiny: true,
    hp: Math.round(def.hp * SHINY_HP_MULT),
    atk: Math.round(def.atk * SHINY_ATK_MULT),
    def: Math.round(def.def * SHINY_DEF_MULT),
    baseExp: Math.round(def.baseExp * SHINY_REWARD_MULT),
    jobExp: Math.round(def.jobExp * SHINY_REWARD_MULT),
    zenyMin: Math.round(def.zenyMin * SHINY_REWARD_MULT),
    zenyMax: Math.round(def.zenyMax * SHINY_REWARD_MULT),
    drops: (def.drops || []).map((d) => ({ itemId: d.itemId, rate: Math.min(10000, Math.round(d.rate * SHINY_REWARD_MULT)) })),
  };
}

const spawnedMaps = new Set<string>();

/** Spawn monsters for a map exactly once (first time a player enters it) */
export function ensureMonstersSpawned(mapData: MapData): void {
  if (spawnedMaps.has(mapData.name)) return;
  spawnedMaps.add(mapData.name);
  spawnMonstersForMap(mapData);
}

/** Spawn all monsters for a map based on its spawn zones */
export function spawnMonstersForMap(mapData: MapData): void {
  loadMonsterDefinitions();

  for (const spawn of mapData.monsterSpawns) {
    const def = monsterDefs.get(spawn.monsterId);
    if (!def) {
      console.warn(`[SpawnManager] Unknown monster ID ${spawn.monsterId} in ${mapData.name}`);
      continue;
    }

    for (let i = 0; i < spawn.maxCount; i++) {
      const x = randomInt(spawn.areaX1, spawn.areaX2);
      const y = randomInt(spawn.areaY1, spawn.areaY2);

      // Make sure spawn position is walkable
      const spawnX = clampWalkable(mapData, x, spawn.areaX1, spawn.areaX2);
      const spawnY = clampWalkable(mapData, y, spawn.areaY1, spawn.areaY2, true);

      const rolled = rollMonsterStats(def);

      const monster: MonsterInstance = {
        id: generateMonsterId(),
        definitionId: def.id,
        name: def.name,
        displayName: def.displayName,
        mapName: mapData.name,
        x: spawnX,
        y: spawnY,
        hp: rolled.hp,
        maxHp: rolled.hp,
        atk: rolled.atk,
        def: rolled.def,
        matk: def.matk,
        mdef: def.mdef,
        moveSpeed: def.moveSpeed,
        moveCooldown: 0,
        attackRange: def.attackRange,
        aiType: def.aiType,
        level: def.level,
        baseExp: rolled.baseExp,
        jobExp: rolled.jobExp,
        respawnTime: def.respawnTime,
        zenyMin: rolled.zenyMin,
        zenyMax: rolled.zenyMax,
        isShiny: rolled.isShiny,
        activeEffects: [],
        aggroTarget: null,
        action: 'idle',
        attackCooldown: 0,
        deathTimer: -1,
        spawnArea: { x1: spawn.areaX1, y1: spawn.areaY1, x2: spawn.areaX2, y2: spawn.areaY2 },
        dirty: true,
        drops: rolled.drops,
      };

      gameState.addMonster(monster);
    }
  }

  const count = gameState.getMonstersInMap(mapData.name).length;
  console.log(`[SpawnManager] Spawned ${count} monsters on ${mapData.name}`);
}

/** Respawn a dead monster at a random position in its spawn area — re-rolls shiny each time */
export function respawnMonster(monster: MonsterInstance, mapData: MapData): void {
  const def = monsterDefs.get(monster.definitionId);
  if (!def) return;

  const rolled = rollMonsterStats(def);

  monster.x = randomInt(monster.spawnArea.x1, monster.spawnArea.x2);
  monster.y = randomInt(monster.spawnArea.y1, monster.spawnArea.y2);
  monster.hp = rolled.hp;
  monster.maxHp = rolled.hp;
  monster.atk = rolled.atk;
  monster.def = rolled.def;
  monster.baseExp = rolled.baseExp;
  monster.jobExp = rolled.jobExp;
  monster.zenyMin = rolled.zenyMin;
  monster.zenyMax = rolled.zenyMax;
  monster.isShiny = rolled.isShiny;
  monster.drops = rolled.drops;
  monster.action = 'idle';
  monster.aggroTarget = null;
  monster.attackCooldown = 0;
  monster.moveCooldown = 0;
  monster.deathTimer = -1;
  monster.dirty = true;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clampWalkable(mapData: MapData, pos: number, min: number, max: number, isY = false): number {
  // Simple: if not walkable, try nearby positions
  for (let offset = 0; offset <= 5; offset++) {
    const p = Math.min(Math.max(pos + offset, isY ? 1 : 1), isY ? mapData.height - 2 : mapData.width - 2);
    if (isY) {
      if (mapData.walkable[p]?.[Math.floor((min + max) / 2)]) return p;
    } else {
      if (mapData.walkable[Math.floor((min + max) / 2)]?.[p]) return p;
    }
  }
  return Math.floor((min + max) / 2);
}
