/**
 * Single source of truth for a player's derived combat stats (ATK, MATK, Hit, Flee,
 * Crit chance, DEF, MDEF), computed from base stats + card/passive bonuses + equipment
 * + active buffs/debuffs. Reused by combat resolution (combat.ts), magic skill damage
 * (skills.ts), and the status-window payload/tooltip preview (socket/index.ts).
 *
 * Formulas mirror the RO-style doc comment at the top of combat.ts:
 *   ATK  = STR + WeaponATK + (STR/10)^2 (melee) or DEX + WeaponATK + (DEX/10)^2 (ranged)
 *   MATK = INT + (INT/7)^2 + WeaponMATK
 *   Hit  = DEX + BaseLevel, Flee = AGI + BaseLevel
 *   Crit = LUK/3
 */

import type { PlayerState } from '../GameState';
import { getEffectiveStat } from './effects';
import { HP_PER_VIT, calcAspd, type BaseStats, type PlayerStats } from '@ro-game/shared';

export interface DerivedStats {
  atk: number;
  matk: number;
  hit: number;
  flee: number;
  critChance: number;
  def: number;
  mdef: number;
  /** Attack speed — RO-style value (100 at AGI=1, asymptotic toward 190), from calcAspd */
  aspd: number;
  /** Base stats + socketed card bonuses + passive skill bonuses — the "true" stat
   *  total shown on the Character Detail sheet, distinct from the raw allocatable
   *  base stat shown on the Status window. */
  effectiveStats: BaseStats;
}

export function computeDerivedStats(player: PlayerState): DerivedStats {
  const effStr = player.str + player.bonusStr + player.passiveBonus.str;
  const effAgi = player.agi + player.bonusAgi + player.passiveBonus.agi;
  const effVit = player.vit + player.bonusVit + player.passiveBonus.vit;
  const effInt = player.int + player.bonusInt + player.passiveBonus.int;
  const effDex = player.dex + player.bonusDex + player.passiveBonus.dex;
  const effLuk = player.luk + player.bonusLuk + player.passiveBonus.luk;

  const hitMod = getEffectiveStat(player, 'hit');
  const atkMod = getEffectiveStat(player, 'atk');
  const critMod = getEffectiveStat(player, 'critRate');
  const defMod = getEffectiveStat(player, 'def');
  const fleeMod = getEffectiveStat(player, 'flee');

  const isRanged = player.weaponRange > 1;
  const primaryStat = isRanged ? effDex : effStr;
  const primaryBonus = Math.floor(primaryStat / 10) ** 2;
  const atk = (primaryStat + player.weaponAtk + primaryBonus + player.passiveBonus.atk) * (1 + atkMod.pct / 100) + atkMod.flat;

  const matk = effInt + Math.floor(effInt / 7) ** 2 + player.weaponMatk + player.passiveBonus.matk;

  const hit = effDex + player.baseLevel + hitMod.flat + hitMod.pct;
  const flee = effAgi + player.baseLevel + fleeMod.flat + fleeMod.pct;
  const critChance = effLuk / 3 + player.passiveBonus.critRate + critMod.flat + critMod.pct;

  const def = Math.max(
    0,
    (Math.floor(effVit * 0.5) + player.armorDef + player.passiveBonus.def) * (1 + defMod.pct / 100) + defMod.flat
  );
  const mdef = player.armorMdef;
  const aspd = calcAspd(effAgi);

  const effectiveStats: BaseStats = {
    str: effStr, agi: effAgi, vit: effVit, int: effInt, dex: effDex, luk: effLuk,
  };

  return { atk, matk, hit, flee, critChance, def, mdef, aspd, effectiveStats };
}

/** Builds the full player:stats payload — base HP/SP/EXP/levels plus derived combat
 * stats and per-stat marginal-gain previews, all computed from computeDerivedStats above.
 * Every player:stats emit site (socket/index.ts, skillEffects.ts, monsterDeath.ts,
 * GameLoop.ts) should go through this helper so the Status window never sees
 * stale/undefined derived stats after any transition. */
export function buildPlayerStatsPayload(
  player: PlayerState,
  extra: { zeny?: number; statPoints?: number; skillPoints?: number } = {}
): PlayerStats {
  const derived = computeDerivedStats(player);
  const withStatPlusOne = (key: 'str' | 'agi' | 'vit' | 'int' | 'dex' | 'luk') =>
    computeDerivedStats({ ...player, [key]: player[key] + 1 });

  return {
    hp: player.hp,
    maxHp: player.maxHp,
    sp: player.sp,
    maxSp: player.maxSp,
    baseExp: player.baseExp,
    jobExp: player.jobExp,
    baseLevel: player.baseLevel,
    jobLevel: player.jobLevel,
    ...extra,
    atk: derived.atk,
    matk: derived.matk,
    hit: derived.hit,
    flee: derived.flee,
    critChance: derived.critChance,
    def: derived.def,
    mdef: derived.mdef,
    aspd: derived.aspd,
    effectiveStats: derived.effectiveStats,
    statPreview: {
      str: withStatPlusOne('str').atk - derived.atk,
      agi: withStatPlusOne('agi').flee - derived.flee,
      vit: HP_PER_VIT,
      int: withStatPlusOne('int').matk - derived.matk,
      dex: withStatPlusOne('dex').hit - derived.hit,
      luk: withStatPlusOne('luk').critChance - derived.critChance,
    },
  };
}
