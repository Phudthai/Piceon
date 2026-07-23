/**
 * RO-style combat system.
 *
 * Physical damage:
 *   ATK = STR + WeaponATK + (STR/10)^2 (melee weapons)
 *      or DEX + WeaponATK + (DEX/10)^2 (ranged weapons, weaponRange > 1)
 *   Physical_Damage = ATK - DEF/2
 *   Crit: LUK/3 chance, 1.4x damage ignoring DEF
 *
 * Magic damage:
 *   MATK = INT + (INT/7)^2 + SkillLevel * Multiplier
 *   Magic_Damage = MATK - MDEF/2
 *
 * Hit/Flee:
 *   Hit = DEX + BaseLevel
 *   Flee = AGI + BaseLevel
 *   HitRate = 80 + Hit - Flee (clamped 5-95%)
 */

import {
  CRIT_MULTIPLIER,
  MIN_HIT_RATE,
  MAX_HIT_RATE,
  BASE_HIT_RATE,
} from '@ro-game/shared';
import type { PlayerState, MonsterInstance } from '../GameState';
import { getEffectiveStat } from './effects';
import { computeDerivedStats } from './derivedStats';

export interface DamageResult {
  damage: number;
  isCrit: boolean;
  isMiss: boolean;
}

// ─── Player → Monster ────────────────────────────────

export function calcPlayerVsMonster(
  attacker: PlayerState,
  target: MonsterInstance
): DamageResult {
  // Single source of truth for ATK/Hit/Crit — shared with skill damage (skills.ts) and
  // the status-window payload (socket/index.ts)
  const derived = computeDerivedStats(attacker);

  // Active buffs/debuffs (e.g. Armor Break -def) on the monster target
  const defMod = getEffectiveStat(target, 'def');

  // Hit/Flee check
  // Monsters have simplified flee based on level
  const flee = target.level; // simplified: monsters don't have AGI
  const hitRate = Math.min(Math.max(BASE_HIT_RATE + derived.hit - flee, MIN_HIT_RATE), MAX_HIT_RATE);

  if (Math.random() * 100 > hitRate) {
    return { damage: 0, isCrit: false, isMiss: true };
  }

  // Crit check: LUK/3 percent chance, plus any passive/buff crit-rate bonus (e.g. Double Attack, Rage)
  const isCrit = Math.random() * 100 < derived.critChance;

  // ATK = STR + WeaponATK + (STR/10)^2 for melee, or DEX + WeaponATK + (DEX/10)^2 for
  // ranged weapons (bow etc.) — mirrors RO's archer DEX-scaling mechanic. DEX's separate
  // contribution to hit rate above is unchanged either way.
  const atk = derived.atk;

  // Target DEF, reduced by any active DEF debuff (e.g. Armor Break, Guard Break)
  const targetDef = Math.max(0, target.def * (1 + defMod.pct / 100) + defMod.flat);

  let damage: number;
  if (isCrit) {
    // Crit ignores DEF, applies multiplier
    damage = Math.floor(atk * CRIT_MULTIPLIER);
  } else {
    // Physical_Damage = ATK - DEF/2
    damage = Math.max(1, Math.floor(atk - targetDef / 2));
  }

  // Add some variance (±10%)
  const variance = 0.9 + Math.random() * 0.2;
  damage = Math.max(1, Math.floor(damage * variance));

  return { damage, isCrit, isMiss: false };
}

// ─── Monster → Player ────────────────────────────────

export function calcMonsterVsPlayer(
  attacker: MonsterInstance,
  target: PlayerState
): DamageResult {
  // Hit/Flee check (passive agi bonus, e.g. Improve Dodge, and active Flee Boost-style buffs fold into flee)
  const hit = attacker.level * 2; // simplified monster hit
  const flee = computeDerivedStats(target).flee;
  const hitRate = Math.min(Math.max(BASE_HIT_RATE + hit - flee, MIN_HIT_RATE), MAX_HIT_RATE);

  if (Math.random() * 100 > hitRate) {
    return { damage: 0, isCrit: false, isMiss: true };
  }

  // Boss enrage: +50% ATK at <=30% HP
  let monsterAtk = attacker.atk;
  if (attacker.aiType === 'BOSS' && attacker.hp / attacker.maxHp <= 0.3) {
    monsterAtk = Math.floor(monsterAtk * 1.5);
  }

  // Active buffs/debuffs on the monster (e.g. Provoke +atk)
  const monsterAtkMod = getEffectiveStat(attacker, 'atk');
  monsterAtk = monsterAtk * (1 + monsterAtkMod.pct / 100) + monsterAtkMod.flat;

  // Player DEF from VIT (incl. card + passive bonus) + equipped armor DEF (base + refine + card + passive) + active DEF buffs (e.g. Angelus)
  const playerDef = computeDerivedStats(target).def;
  let damage = Math.max(1, Math.floor(monsterAtk - playerDef / 2));

  // Variance
  const variance = 0.9 + Math.random() * 0.2;
  damage = Math.max(1, Math.floor(damage * variance));

  return { damage, isCrit: false, isMiss: false };
}

// ─── Apply damage ────────────────────────────────────

export function applyDamageToMonster(
  monster: MonsterInstance,
  damage: number
): boolean {
  monster.hp = Math.max(0, monster.hp - damage);
  monster.dirty = true;
  return monster.hp <= 0;
}

export function applyDamageToPlayer(
  player: PlayerState,
  damage: number
): boolean {
  player.hp = Math.max(0, player.hp - damage);
  player.dirty = true;
  return player.hp <= 0;
}
