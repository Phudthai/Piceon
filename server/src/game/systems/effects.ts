/**
 * Buff/debuff/status effect manager.
 *
 * Effects are timed, in-memory-only modifiers (ActiveEffect, see GameState.ts) applied
 * to a player or monster by a BUFF/DEBUFF-type skill. Stat modifiers are read live by
 * combat.ts via getEffectiveStat(); status conditions (stun/freeze/root/silence/etc.)
 * gate movement/attack/skill-use in GameLoop.ts and skills.ts via hasStatus().
 */

import type { ActiveEffect, PlayerState, MonsterInstance } from '../GameState';

type Effected = PlayerState | MonsterInstance;

/** Damage/heal-over-time ticks once per second (20 ticks at 20 ticks/sec) */
const DOT_TICK_INTERVAL = 20;

export function hasStatus(entity: Effected, status: NonNullable<ActiveEffect['status']>): boolean {
  return entity.activeEffects.some((e) => e.status === status);
}

/** Sum of all active flat/percent modifiers for a given stat */
export function getEffectiveStat(entity: Effected, stat: NonNullable<ActiveEffect['stat']>): { flat: number; pct: number } {
  let flat = 0;
  let pct = 0;
  for (const e of entity.activeEffects) {
    if (e.stat !== stat) continue;
    flat += e.amountFlat ?? 0;
    pct += e.amountPct ?? 0;
  }
  return { flat, pct };
}

/** Apply a new effect, replacing any existing effect from the same skill (refresh, no stacking) */
export function applyEffect(entity: Effected, effect: ActiveEffect): void {
  entity.activeEffects = entity.activeEffects.filter((e) => e.skillId !== effect.skillId);
  entity.activeEffects.push(effect);
  entity.dirty = true;
}

export function removeStatus(entity: Effected, status: NonNullable<ActiveEffect['status']>): void {
  const before = entity.activeEffects.length;
  entity.activeEffects = entity.activeEffects.filter((e) => e.status !== status);
  if (entity.activeEffects.length !== before) entity.dirty = true;
}

/** First active status, for the client visual (one ring/icon shown at a time) */
export function getPrimaryStatus(entity: Effected): ActiveEffect['status'] | undefined {
  return entity.activeEffects.find((e) => e.status)?.status;
}

/** Decrement durations, apply DOT/HoT ticks, expire effects. Called once per game tick
 * for every player and monster. */
export function tickEffects(entity: Effected, tickCount: number, isPlayer: boolean): void {
  if (entity.activeEffects.length === 0) return;

  const remaining: ActiveEffect[] = [];
  let changed = false;

  for (const e of entity.activeEffects) {
    e.remainingTicks--;
    if (e.remainingTicks <= 0) {
      changed = true;
      continue;
    }
    remaining.push(e);

    if (tickCount % DOT_TICK_INTERVAL === 0) {
      // Inlined HP math (mirrors combat.ts applyDamageToMonster/applyDamageToPlayer)
      // to avoid a circular import — combat.ts needs to import getEffectiveStat from here.
      if (e.tickDamage) {
        entity.hp = Math.max(0, entity.hp - e.tickDamage);
        entity.dirty = true;
      }
      if (e.healPerTick && isPlayer) {
        const p = entity as PlayerState;
        p.hp = Math.min(p.hp + e.healPerTick, p.maxHp);
        p.dirty = true;
      }
    }
  }

  if (changed) {
    entity.activeEffects = remaining;
    entity.dirty = true;
  }
}

/** Decrement per-skill cooldowns by one tick (players only) */
export function tickCooldowns(player: PlayerState): void {
  for (const skillId of Object.keys(player.skillCooldowns)) {
    const id = Number(skillId);
    if (player.skillCooldowns[id] > 0) {
      player.skillCooldowns[id]--;
      if (player.skillCooldowns[id] <= 0) delete player.skillCooldowns[id];
    }
  }
}
