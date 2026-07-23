/**
 * Skill system.
 *
 * Skills are loaded from data/skills/*.json.
 * Players learn skills using skill points (gained on job level up).
 * Using skills costs SP, has cooldown, and applies damage/heal/buff effects.
 */

import type { CharacterClass } from '@prisma/client';
import { prisma } from '../../db';
import type { PlayerSkill, SkillDef } from '@ro-game/shared';
import { TICK_RATE, scaledCastTicks } from '@ro-game/shared';
import type { PlayerState, MonsterInstance, ActiveEffect } from '../GameState';
import { gameState, BASE_MAX_WEIGHT } from '../GameState';
import { applyDamageToMonster } from './combat';
import { computeDerivedStats } from './derivedStats';
import { onMonsterAttacked } from './ai';
import { applyEffect, hasStatus, removeStatus } from './effects';
import { applyKnockback, randomBlinkTile } from './movement';
import { attemptSteal } from './drops';

import universalSkills from '../../../../data/skills/universal.json';
import swordsmanSkills from '../../../../data/skills/swordsman.json';
import mageSkills from '../../../../data/skills/mage.json';
import archerSkills from '../../../../data/skills/archer.json';
import thiefSkills from '../../../../data/skills/thief.json';
import acolyteSkills from '../../../../data/skills/acolyte.json';
import merchantSkills from '../../../../data/skills/merchant.json';

// Build skill definition map
const skillDefs = new Map<number, SkillDef>();
for (const s of [
  ...universalSkills, ...swordsmanSkills,
  ...mageSkills, ...archerSkills, ...thiefSkills, ...acolyteSkills, ...merchantSkills,
] as SkillDef[]) {
  skillDefs.set(s.id, s);
}

/** Get all skill definitions for a class (including universal skills every class can learn) */
export function getSkillDefsForClass(characterClass: string): SkillDef[] {
  const results: SkillDef[] = [];
  for (const def of skillDefs.values()) {
    if (def.classRequired == null || def.classRequired === characterClass) {
      results.push(def);
    }
  }
  return results;
}

/** Fold learned PASSIVE skills' bonuses into the player's passiveBonus fields —
 * mirrors recalcEquipStats in inventory.ts (full recompute from current state,
 * called on join and whenever learned skills change). */
export function recalcPassiveStats(player: PlayerState, playerSkills: PlayerSkill[]): void {
  const bonus = {
    str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0,
    atk: 0, matk: 0, def: 0, critRate: 0, weight: 0, shopBuyPct: 0, shopSellPct: 0, refineSuccessPct: 0, zenyBonusPct: 0,
  };

  for (const ps of playerSkills) {
    if (ps.type !== 'PASSIVE') continue;
    const def = skillDefs.get(ps.skillId);
    const pe = def?.passiveEffect;
    if (!pe) continue;
    bonus[pe.stat] += pe.perLevel * ps.level;
  }

  player.passiveBonus = bonus;
  player.maxWeight = BASE_MAX_WEIGHT + bonus.weight;
  player.dirty = true;
}

/** Load player's learned skills from DB */
export async function loadPlayerSkills(characterId: string): Promise<PlayerSkill[]> {
  const rows = await prisma.characterSkill.findMany({
    where: { characterId },
    include: { skill: true },
  });

  return rows.map((row) => {
    const def = skillDefs.get(row.skill.id);
    return {
      skillId: row.skill.id,
      name: row.skill.name,
      type: row.skill.type as PlayerSkill['type'],
      level: row.level,
      maxLevel: row.skill.maxLevel,
      spCost: def?.spCost ?? row.skill.spCost,
      cooldown: def?.cooldown ?? row.skill.cooldown,
      range: def?.range ?? row.skill.range,
      description: row.skill.description ?? '',
      targetType: def?.targetType ?? row.skill.targetType,
    };
  });
}

/** Learn or level up a skill */
export async function learnSkill(
  characterId: string,
  skillId: number,
  characterClass: string
): Promise<{ success: boolean; error?: string; skills?: PlayerSkill[]; skillPoints?: number }> {
  const def = skillDefs.get(skillId);
  if (!def) return { success: false, error: 'Skill not found' };

  // Check class requirement
  if (def.classRequired != null && def.classRequired !== characterClass) {
    return { success: false, error: 'Cannot learn this skill with your class' };
  }

  // Check skill points
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { skillPoints: true },
  });
  if (!character || character.skillPoints < 1) {
    return { success: false, error: 'Not enough skill points' };
  }

  // Check current level
  const existing = await prisma.characterSkill.findFirst({
    where: { characterId, skillId },
  });

  if (existing && existing.level >= def.maxLevel) {
    return { success: false, error: 'Skill already at max level' };
  }

  // Learn or level up
  if (existing) {
    await prisma.characterSkill.update({
      where: { id: existing.id },
      data: { level: existing.level + 1 },
    });
  } else {
    // Ensure skill exists in DB skills table
    await prisma.skill.upsert({
      where: { id: skillId },
      update: {},
      create: {
        id: skillId,
        name: def.name,
        type: def.type,
        maxLevel: def.maxLevel,
        targetType: def.targetType,
        damageType: def.damageType ?? null,
        spCost: def.spCost,
        cooldown: def.cooldown,
        castTime: def.castTime,
        range: def.range,
        classRequired: def.classRequired as CharacterClass | null,
        description: def.description,
      },
    });

    await prisma.characterSkill.create({
      data: { characterId, skillId, level: 1 },
    });
  }

  // Deduct skill point
  await prisma.character.update({
    where: { id: characterId },
    data: { skillPoints: character.skillPoints - 1 },
  });

  const skills = await loadPlayerSkills(characterId);
  return { success: true, skills, skillPoints: character.skillPoints - 1 };
}

export interface SkillHit {
  targetMonsterId: string;
  damage: number;
  isDead: boolean;
}

/** Use a skill — returns damage dealt (for active skills). `hits` carries one entry
 * per monster struck (single-target skills return a 1-element array); callers are
 * responsible for broadcasting `combat:result` per hit and invoking monster-death
 * handling (drops/EXP/zeny) for any hit where `isDead` is true. */
export interface UseSkillMapData {
  width: number;
  height: number;
  walkable: boolean[][];
}

export interface UseSkillResult {
  success: boolean;
  error?: string;
  hits?: SkillHit[];
  healed?: number;
  recall?: { mapName: string; x: number; y: number };
  stolenItemId?: number;
  stolenZeny?: number;
  revivedCharacterId?: string;
  /** true when the skill has a nonzero (ASPD-scaled) cast time and was scheduled rather
   *  than resolved immediately — callers should not broadcast a result yet. */
  casting?: boolean;
  castTicks?: number;
}

/** Validates and starts a skill use: checks silence/cooldown/cost, then either resolves
 * the skill immediately (castTime === 0, true for every skill in today's data) or
 * schedules it as a PendingCast to be resolved later by GameLoop via resolvePendingCast. */
export function useSkill(
  player: PlayerState,
  skillId: number,
  skillLevel: number,
  targetId: string | undefined,
  monsters: Map<string, MonsterInstance>,
  players?: Map<string, PlayerState>,
  mapData?: UseSkillMapData
): UseSkillResult {
  const def = skillDefs.get(skillId);
  if (!def) return { success: false, error: 'Skill not found' };

  if (hasStatus(player, 'silence')) {
    return { success: false, error: 'Silenced — cannot use skills' };
  }

  if ((player.skillCooldowns[skillId] ?? 0) > 0) {
    return { success: false, error: 'Skill is on cooldown' };
  }

  if (player.pendingCast) {
    return { success: false, error: 'Already casting' };
  }

  // SP (or, for costsZenyInstead skills, zeny) check
  const cost = def.spCost * skillLevel;
  if (def.costsZenyInstead) {
    if (player.zeny < cost) {
      return { success: false, error: 'Not enough Zeny' };
    }
    player.zeny -= cost;
    prisma.character
      .update({ where: { id: player.characterId }, data: { zeny: player.zeny } })
      .catch((err) => console.error('[Skill] Zeny cost persist error:', err));
  } else {
    if (player.sp < cost) {
      return { success: false, error: 'Not enough SP' };
    }
    player.sp -= cost;
  }
  player.dirty = true;

  if (def.cooldown > 0) {
    player.skillCooldowns[skillId] = Math.round(def.cooldown * TICK_RATE);
  }

  const effAgi = player.agi + player.bonusAgi + player.passiveBonus.agi;
  const castTicks = scaledCastTicks(def.castTime, effAgi);

  if (castTicks > 0) {
    player.pendingCast = { skillId, skillLevel, targetId, remainingTicks: castTicks, totalTicks: castTicks };
    player.action = 'cast';
    player.moveAction = null;
    player.attackTarget = null;
    player.dirty = true;
    return { success: true, casting: true, castTicks };
  }

  const result = executeSkillEffect(player, def, skillLevel, targetId, monsters, players, mapData);
  if (result.success) {
    player.action = 'cast';
    player.dirty = true;
  }
  return result;
}

/** Resolves an in-progress cast — called by GameLoop when PendingCast.remainingTicks hits 0.
 * Returns null if there was no pending cast or the skill def has since disappeared (should not
 * happen in practice). Target validity (alive/in-range) is re-checked inside executeSkillEffect,
 * so a target that died or moved away during the cast fails gracefully with no SP/zeny refund. */
export function resolvePendingCast(
  player: PlayerState,
  monsters: Map<string, MonsterInstance>,
  players: Map<string, PlayerState> | undefined,
  mapData: UseSkillMapData | undefined
): UseSkillResult | null {
  const pending = player.pendingCast;
  player.pendingCast = null;
  if (!pending) return null;
  const def = skillDefs.get(pending.skillId);
  if (!def) return null;
  return executeSkillEffect(player, def, pending.skillLevel, pending.targetId, monsters, players, mapData);
}

/** Applies a skill's actual effect (damage/heal/buff/steal/etc). Extracted from useSkill
 * so both the instant-cast path (castTime === 0) and the deferred-cast resolution path
 * (resolvePendingCast) share identical logic. */
function executeSkillEffect(
  player: PlayerState,
  def: SkillDef,
  skillLevel: number,
  targetId: string | undefined,
  monsters: Map<string, MonsterInstance>,
  players?: Map<string, PlayerState>,
  mapData?: UseSkillMapData
): UseSkillResult {
  if (def.revealsStealth && players) {
    const radius = def.aoeRadius ?? 5;
    for (const other of players.values()) {
      if (other.characterId === player.characterId) continue;
      if (Math.max(Math.abs(other.x - player.x), Math.abs(other.y - player.y)) <= radius) {
        removeStatus(other, 'stealth');
      }
    }
    return { success: true };
  }

  if (def.revivesPlayer) {
    if (!targetId || !players) return { success: false, error: 'No target' };
    const target = players.get(targetId);
    if (!target) return { success: false, error: 'Target not found' };
    if (target.action !== 'dead' || target.deathTimestamp == null) {
      return { success: false, error: 'Target is not awaiting revival' };
    }
    const dist = Math.max(Math.abs(player.x - target.x), Math.abs(player.y - target.y));
    if (dist > def.range) {
      return { success: false, error: 'Target out of range' };
    }
    const REDEMPTIO_WINDOW_TICKS = TICK_RATE * 30; // 30-second grace window
    if (gameState.getTickCount() - target.deathTimestamp > REDEMPTIO_WINDOW_TICKS) {
      return { success: false, error: 'Too late — the revival window has passed' };
    }

    target.hp = Math.max(1, Math.round(target.maxHp * ((def.revivePct ?? 30) / 100)));
    target.action = 'idle';
    target.deathTimestamp = null;
    target.dirty = true;
    return { success: true, revivedCharacterId: target.characterId };
  }

  if (def.stealChance != null) {
    if (!targetId) return { success: false, error: 'No target' };
    const monster = monsters.get(targetId);
    if (!monster || monster.action === 'dead') {
      return { success: false, error: 'Target not found' };
    }
    const dist = Math.max(Math.abs(player.x - monster.x), Math.abs(player.y - monster.y));
    if (dist > def.range) {
      return { success: false, error: 'Target out of range' };
    }

    if (def.stealsZeny) {
      if (Math.random() * 100 <= def.stealChance) {
        const zeny = Math.floor(Math.random() * (monster.zenyMax - monster.zenyMin + 1)) + monster.zenyMin;
        if (zeny > 0) {
          player.zeny += zeny;
          prisma.character
            .update({ where: { id: player.characterId }, data: { zeny: { increment: zeny } } })
            .catch((err) => console.error('[Skill] Snatch zeny persist error:', err));
          return { success: true, stolenZeny: zeny };
        }
      }
      return { success: true };
    }

    const stolen = attemptSteal(monster, def.stealChance);
    return { success: true, stolenItemId: stolen?.itemId };
  }

  if (def.selfBlink && mapData) {
    const dest = randomBlinkTile(player.x, player.y, def.range || 3, mapData);
    player.x = dest.x;
    player.y = dest.y;
    player.dirty = true;
    return { success: true };
  }

  if (def.savesRecallPoint) {
    player.savedMapName = player.mapName;
    player.savedPosX = player.x;
    player.savedPosY = player.y;
    prisma.character
      .update({ where: { id: player.characterId }, data: { savedMapName: player.mapName, savedPosX: player.x, savedPosY: player.y } })
      .catch((err) => console.error('[Skill] Save recall point error:', err));
    return { success: true };
  }

  if (def.recallsToSavedPoint) {
    if (!player.savedMapName || player.savedPosX == null || player.savedPosY == null) {
      return { success: false, error: 'No recall point saved' };
    }
    // The actual position/map change is applied by the socket handler (it has access
    // to warpPlayer/gameNs for cross-map moves); we just signal where to go.
    return {
      success: true,
      recall: { mapName: player.savedMapName, x: player.savedPosX, y: player.savedPosY },
    };
  }

  // Handle by skill type
  if (def.type === 'HEAL') {
    // First Aid: heal 5 + level * 5 HP
    const healAmount = 5 + skillLevel * 5;
    player.hp = Math.min(player.hp + healAmount, player.maxHp);
    return { success: true, healed: healAmount };
  }

  if (def.type === 'ACTIVE' && def.damageFormula && targetId) {
    const targetMonster = monsters.get(targetId);
    if (!targetMonster || targetMonster.action === 'dead') {
      return { success: false, error: 'Target not found' };
    }

    // Range check (always from caster to the clicked target, even for self-centered AOE)
    const dist = Math.max(Math.abs(player.x - targetMonster.x), Math.abs(player.y - targetMonster.y));
    if (dist > def.range) {
      return { success: false, error: 'Target out of range' };
    }

    removeStatus(player, 'stealth');

    // Resolve the set of monsters actually struck
    let affected: MonsterInstance[];
    if (def.targetType === 'aoe') {
      const center = def.aoeCenter === 'self' ? { x: player.x, y: player.y } : { x: targetMonster.x, y: targetMonster.y };
      const radius = def.aoeRadius ?? 1;
      affected = Array.from(monsters.values()).filter(
        (m) => m.action !== 'dead' && Math.max(Math.abs(m.x - center.x), Math.abs(m.y - center.y)) <= radius
      );
    } else {
      affected = [targetMonster];
    }

    // Damage-type classification: explicit override on the skill (e.g. "magic" for
    // Mage bolts, or "ranged" for a "Throw Spear" skill forced ranged despite a melee
    // weapon), else falls back to the equipped weapon's range, same rule used for
    // normal attacks.
    const isMagic = def.damageType === 'magic';
    const useRanged = !isMagic && (def.damageType === 'ranged' || (def.damageType == null && player.weaponRange > 1));
    const effStr = player.str + player.bonusStr;
    const effDex = player.dex + player.bonusDex;
    const baseAtk = isMagic
      ? computeDerivedStats(player).matk
      : useRanged
        ? effDex + player.weaponAtk + Math.floor(effDex / 10) ** 2
        : effStr + player.weaponAtk + Math.floor(effStr / 10) ** 2;
    const runeBonusPct = (player.skillDamageBonus.bySkillId[def.id] ?? 0) + player.skillDamageBonus.all;

    const hits: SkillHit[] = [];
    for (const monster of affected) {
      const defenseValue = isMagic ? monster.mdef : monster.def;
      const formulaResult = evaluateFormula(def.damageFormula, {
        atk: baseAtk,
        level: skillLevel,
        def: defenseValue,
        hpPercent: Math.round((monster.hp / monster.maxHp) * 100),
      });
      const boostedResult = formulaResult * (1 + runeBonusPct / 100);
      const damage = Math.max(1, Math.floor(boostedResult) - defenseValue);

      const isDead = applyDamageToMonster(monster, damage);
      onMonsterAttacked(monster, player.characterId);
      hits.push({ targetMonsterId: monster.id, damage, isDead });

      if (def.knockbackTiles && !isDead && mapData) {
        const pos = applyKnockback(monster.x, monster.y, player.x, player.y, def.knockbackTiles, mapData);
        monster.x = pos.x;
        monster.y = pos.y;
        monster.dirty = true;
      }
    }

    return { success: true, hits };
  }

  if (def.type === 'BUFF' || def.type === 'DEBUFF') {
    if (!def.buffEffect && !def.statusEffect) {
      // No mechanical effect defined for this skill yet — consume SP only
      return { success: true };
    }

    const effect: ActiveEffect = {
      skillId: def.id,
      stat: def.buffEffect?.stat,
      amountPct: def.buffEffect?.amountPct,
      amountFlat: def.buffEffect?.amountFlat,
      status: def.statusEffect,
      tickDamage: def.statusTickDamage,
      healPerTick: def.healPerTick,
      remainingTicks: def.buffEffect?.durationTicks ?? def.statusDurationTicks ?? TICK_RATE * 10,
      sourceId: player.characterId,
    };

    if (def.targetType === 'self') {
      applyEffect(player, effect);
    } else {
      if (!targetId) return { success: false, error: 'No target' };
      const monster = monsters.get(targetId);
      if (!monster || monster.action === 'dead') {
        return { success: false, error: 'Target not found' };
      }
      const dist = Math.max(Math.abs(player.x - monster.x), Math.abs(player.y - monster.y));
      if (dist > def.range) {
        return { success: false, error: 'Target out of range' };
      }
      applyEffect(monster, effect);
    }

    return { success: true };
  }

  return { success: true };
}

/** Formula evaluator for skill damage: supports "atk * (1.0 + level * 0.3)" style
 * expressions over the atk/level/def/hpPercent variables. */
function evaluateFormula(
  formula: string,
  vars: { atk: number; level: number; def: number; hpPercent: number }
): number {
  try {
    const expr = formula
      .replace(/hpPercent/g, String(vars.hpPercent))
      .replace(/atk/g, String(vars.atk))
      .replace(/level/g, String(vars.level))
      .replace(/def/g, String(vars.def));

    // Safe eval: only allow numbers, operators, parens, dots
    if (!/^[\d\s+\-*/().]+$/.test(expr)) return vars.atk;

    // Use Function constructor for safe math evaluation
    return new Function(`return (${expr})`)() as number;
  } catch {
    return vars.atk;
  }
}
