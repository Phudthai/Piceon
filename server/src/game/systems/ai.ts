/**
 * Monster AI system — runs each tick per monster.
 *
 * AI types (from RO spec):
 *  - PASSIVE:    Wanders randomly. Only attacks if attacked first.
 *  - AGGRESSIVE: Detects players within aggroRange (5 tiles). Chases and attacks.
 *  - ASSIST:     Calls nearby same-type monsters when attacked.
 *  - BOSS:       Aggressive + enrage at 30% HP (ATK +50%, speed +30%).
 */

import type { MonsterInstance, PlayerState } from '../GameState';
import { gameState } from '../GameState';
import { hasStatus } from './effects';
import { monsterMoveTicksForSpeed } from '@ro-game/shared';

const AGGRO_RANGE = 5;
const ASSIST_RANGE = 8;
const WANDER_CHANCE = 0.02; // 2% per tick (~every 2.5 seconds on average)
const BOSS_ENRAGE_THRESHOLD = 0.3;
const BOSS_ATK_MULTIPLIER = 1.5;

export function processMonsterAI(
  monster: MonsterInstance,
  walkable: boolean[][]
): void {
  if (monster.action === 'dead') return;

  // Decrease attack cooldown
  if (monster.attackCooldown > 0) monster.attackCooldown--;
  if (monster.moveCooldown > 0) monster.moveCooldown--;

  const players = gameState.getPlayersInMap(monster.mapName);
  const alivePlayers = players.filter((p) => p.action !== 'dead');

  // ─── Has aggro target ─────────────────────────────
  if (monster.aggroTarget) {
    const target = alivePlayers.find((p) => p.characterId === monster.aggroTarget);

    if (!target || target.action === 'dead') {
      // Target gone or dead, drop aggro
      monster.aggroTarget = null;
      monster.action = 'idle';
      monster.dirty = true;
      return;
    }

    const dist = chebyshev(monster.x, monster.y, target.x, target.y);

    if (dist <= monster.attackRange) {
      // In range → attack
      monster.action = 'attack';
      monster.dirty = true;
      // Combat is handled in combat system, not here
    } else {
      // Chase target — throttled to one tile per moveSpeed-derived interval
      monster.action = 'walk';
      if (monster.moveCooldown <= 0) {
        moveToward(monster, target.x, target.y, walkable);
        monster.moveCooldown = monsterMoveTicksForSpeed(monster.moveSpeed) - 1;
        monster.dirty = true;
      }
    }
    return;
  }

  // ─── No aggro target ──────────────────────────────

  switch (monster.aiType) {
    case 'AGGRESSIVE':
    case 'BOSS': {
      // Scan for players in range — stealthed players can't be newly aggro'd
      const visiblePlayers = alivePlayers.filter((p) => !hasStatus(p, 'stealth'));
      const closest = findClosestPlayer(monster, visiblePlayers, AGGRO_RANGE);
      if (closest) {
        monster.aggroTarget = closest.characterId;
        monster.dirty = true;
      } else {
        wander(monster, walkable);
      }
      break;
    }

    case 'PASSIVE':
    case 'ASSIST':
    default:
      wander(monster, walkable);
      break;
  }
}

/** When a monster is attacked, set aggro (and assist nearby same-type) */
export function onMonsterAttacked(
  monster: MonsterInstance,
  attackerId: string
): void {
  if (!monster.aggroTarget) {
    monster.aggroTarget = attackerId;
    monster.dirty = true;
  }

  // ASSIST: aggro nearby same-type monsters
  if (monster.aiType === 'ASSIST') {
    const nearbyMonsters = gameState.getMonstersInMap(monster.mapName);
    for (const m of nearbyMonsters) {
      if (
        m.id !== monster.id &&
        m.definitionId === monster.definitionId &&
        m.action !== 'dead' &&
        !m.aggroTarget &&
        chebyshev(m.x, m.y, monster.x, monster.y) <= ASSIST_RANGE
      ) {
        m.aggroTarget = attackerId;
        m.dirty = true;
      }
    }
  }
}

/**
 * Boss enrage check — call each tick.
 * At 30% HP: ATK +50%, moveSpeed +30%.
 * Uses a simple flag on the monster instance.
 */
export function checkBossEnrage(monster: MonsterInstance): void {
  if (monster.aiType !== 'BOSS') return;
  const hpRatio = monster.hp / monster.maxHp;
  if (hpRatio <= BOSS_ENRAGE_THRESHOLD) {
    // Enrage multipliers are applied in combat calc, not stored permanently
    // We track via a naming convention check in combat.ts
  }
}

// ─── Helpers ──────────────────────────────────────────

function chebyshev(x1: number, y1: number, x2: number, y2: number): number {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

function findClosestPlayer(
  monster: MonsterInstance,
  players: PlayerState[],
  range: number
): PlayerState | null {
  let closest: PlayerState | null = null;
  let closestDist = Infinity;

  for (const p of players) {
    const dist = chebyshev(monster.x, monster.y, p.x, p.y);
    if (dist <= range && dist < closestDist) {
      closest = p;
      closestDist = dist;
    }
  }

  return closest;
}

/** Move one step toward target position */
function moveToward(
  monster: MonsterInstance,
  targetX: number,
  targetY: number,
  walkable: boolean[][]
): void {
  const dx = Math.sign(targetX - monster.x);
  const dy = Math.sign(targetY - monster.y);

  const newX = monster.x + dx;
  const newY = monster.y + dy;

  if (isWalkable(walkable, newX, newY)) {
    monster.x = newX;
    monster.y = newY;
  } else if (dx !== 0 && isWalkable(walkable, monster.x + dx, monster.y)) {
    monster.x += dx;
  } else if (dy !== 0 && isWalkable(walkable, monster.x, monster.y + dy)) {
    monster.y += dy;
  }
}

/** Random wander: small chance to move 1 tile in random direction */
function wander(monster: MonsterInstance, walkable: boolean[][]): void {
  if (Math.random() > WANDER_CHANCE) return;

  const dirs = [
    { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
  ];
  const dir = dirs[Math.floor(Math.random() * dirs.length)];
  const newX = monster.x + dir.x;
  const newY = monster.y + dir.y;

  // Stay within spawn area
  if (
    newX >= monster.spawnArea.x1 && newX <= monster.spawnArea.x2 &&
    newY >= monster.spawnArea.y1 && newY <= monster.spawnArea.y2 &&
    isWalkable(walkable, newX, newY)
  ) {
    monster.x = newX;
    monster.y = newY;
    monster.action = 'walk';
    monster.dirty = true;
  }
}

function isWalkable(walkable: boolean[][], x: number, y: number): boolean {
  return walkable[y]?.[x] === true;
}
