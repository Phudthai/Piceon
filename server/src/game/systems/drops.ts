/**
 * Drop system.
 * On monster death: roll drop table, create DropInstances on the map.
 * Drop rate in 0.01% units: 10000 = 100%, 100 = 1%.
 */

import { gameState, generateDropId, type MonsterInstance, type DropInstance } from '../GameState';
import { TICK_RATE } from '@ro-game/shared';

const DROP_DESPAWN_SECONDS = 60;
const DROP_OWNER_SECONDS = 10; // owner has priority for 10 seconds

export function generateDrops(
  monster: MonsterInstance,
  killerId: string
): DropInstance[] {
  const drops: DropInstance[] = [];

  for (const dropEntry of monster.drops) {
    // Roll: rate is in 0.01% units, so compare against 10000
    const roll = Math.floor(Math.random() * 10000);
    if (roll < dropEntry.rate) {
      const drop: DropInstance = {
        id: generateDropId(),
        itemId: dropEntry.itemId,
        mapName: monster.mapName,
        x: monster.x,
        y: monster.y,
        despawnTimer: DROP_DESPAWN_SECONDS * TICK_RATE,
        ownerId: killerId,
        ownerTimer: DROP_OWNER_SECONDS * TICK_RATE,
        dirty: true,
      };
      drops.push(drop);
      gameState.addDrop(drop);
    }
  }

  return drops;
}

/** Tick: decrease drop timers, remove expired drops */
export function tickDrops(mapName: string): string[] {
  const removed: string[] = [];
  const drops = gameState.getDropsInMap(mapName);

  for (const drop of drops) {
    drop.despawnTimer--;
    if (drop.ownerTimer > 0) drop.ownerTimer--;

    if (drop.despawnTimer <= 0) {
      gameState.removeDrop(mapName, drop.id);
      removed.push(drop.id);
    }
  }

  return removed;
}

/** Roll a Steal-style attempt against a monster's own drop table — on success, the
 * item goes straight to the stealer's bag (no floor drop, monster is not killed).
 * No "already stolen from" restriction (kept simple, hobby scope) — gated only by
 * the skill's own cooldown. */
export function attemptSteal(monster: MonsterInstance, chancePct: number): { itemId: number } | null {
  if (Math.random() * 100 > chancePct) return null;
  if (monster.drops.length === 0) return null;
  const entry = monster.drops[Math.floor(Math.random() * monster.drops.length)];
  return { itemId: entry.itemId };
}

/** Check if a player can pick up a drop */
export function canPickup(
  drop: DropInstance,
  characterId: string
): boolean {
  // Owner has priority during ownerTimer
  if (drop.ownerTimer > 0 && drop.ownerId !== characterId) {
    return false;
  }
  return true;
}
