/** Flat stat modifier applied for a duration (self-buff or monster-debuff) */
export interface BuffEffect {
  durationTicks: number;
  stat?: 'atk' | 'def' | 'flee' | 'hit' | 'moveSpeed' | 'critRate';
  amountPct?: number;
  amountFlat?: number;
}

/** Always-on bonus folded in while a PASSIVE skill is learned */
export interface PassiveEffect {
  stat: 'str' | 'agi' | 'vit' | 'int' | 'dex' | 'luk' | 'atk' | 'matk' | 'def' | 'critRate' | 'weight' | 'shopBuyPct' | 'shopSellPct' | 'refineSuccessPct' | 'zenyBonusPct';
  perLevel: number;
}

/** Skill definition (from data files) */
export interface SkillDef {
  id: number;
  name: string;
  type: 'ACTIVE' | 'PASSIVE' | 'BUFF' | 'DEBUFF' | 'HEAL';
  maxLevel: number;
  targetType: 'self' | 'single' | 'aoe';
  spCost: number;
  cooldown: number;
  castTime: number;
  range: number;
  /** null means available to every class; otherwise restricted to this one class */
  classRequired: string | null;
  description: string;
  /** May reference atk/level, and (as of Phase 1) def/hpPercent of the target */
  damageFormula?: string;
  /** HEAL-type only; replaces the flat 5+level*5 default when present */
  healFormula?: string;
  /** targetType 'aoe' only — Chebyshev radius */
  aoeRadius?: number;
  /** targetType 'aoe' only — 'target' (centered on the clicked target) or 'self' (centered on caster) */
  aoeCenter?: 'target' | 'self';
  buffEffect?: BuffEffect;
  statusEffect?: 'stun' | 'freeze' | 'root' | 'silence' | 'poison' | 'blind' | 'petrify' | 'stealth';
  statusDurationTicks?: number;
  /** poison-style damage-over-time, applied once per second while the status is active */
  statusTickDamage?: number;
  /** heal-over-time, same tick cadence as statusTickDamage */
  healPerTick?: number;
  passiveEffect?: PassiveEffect;
  /** tiles to push the target back on a successful hit */
  knockbackTiles?: number;
  /** 0-100 chance to steal an item/zeny instead of (or alongside) dealing damage */
  stealChance?: number;
  /** When stealChance is set: steal zeny instead of an item from the target's drop table */
  stealsZeny?: boolean;
  /** spCost is interpreted as a zeny cost instead of an SP cost */
  costsZenyInstead?: boolean;
  /** Ruwach-style: clears 'stealth' from any player within aoeRadius of the caster */
  revealsStealth?: boolean;
  /** Redemptio-style: revives a dead ally (targetId is a characterId) within a grace window, at revivePct HP */
  revivesPlayer?: boolean;
  revivePct?: number;
  /** Self-targeted instant teleport to a random walkable tile within `range` tiles */
  selfBlink?: boolean;
  /** Saves the caster's current position as their recall point (Warp Portal-style) */
  savesRecallPoint?: boolean;
  /** Recalls the caster to their previously saved point */
  recallsToSavedPoint?: boolean;
  /** Overrides weapon-based melee/ranged classification for this skill's damage calc
   *  (e.g. a "Throw Spear" skill should be ranged/DEX-based even though a Spear is a
   *  melee-range weapon). When unset, falls back to the equipped weapon's classification
   *  (weaponRange > 1 = ranged), same rule used for normal attacks. 'magic' uses the
   *  caster's MATK (INT-based) instead of STR/DEX, and reduces the target's MDEF instead
   *  of DEF. */
  damageType?: 'melee' | 'ranged' | 'magic';
}

/** Player's learned skill (sent from server) */
export interface PlayerSkill {
  skillId: number;
  name: string;
  type: SkillDef['type'];
  level: number;
  maxLevel: number;
  spCost: number;
  cooldown: number;
  range: number;
  description: string;
  targetType: string;
}

/** Skill bar slot assignment */
export interface SkillBarSlot {
  slot: number; // 1-9
  skillId: number;
}
