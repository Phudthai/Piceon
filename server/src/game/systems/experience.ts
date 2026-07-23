/**
 * EXP and level-up system.
 *
 * EXP tables follow simplified RO scaling:
 *   Base EXP to level N = 9 * (N-1)^2 + 20 * (N-1)
 *   Job EXP to level N = 5 * (N-1)^2 + 15 * (N-1)
 *
 * On level up:
 *   Base level: +3 stat points, recalculate HP/SP
 *   Job level: +1 skill point
 */

import {
  HP_BASE, HP_PER_LEVEL, HP_PER_VIT, SP_BASE, SP_PER_LEVEL, SP_PER_INT,
  MAX_BASE_LEVEL, MAX_JOB_LEVEL, baseExpRequired, jobExpRequired,
} from '@ro-game/shared';
import { prisma } from '../../db';
import type { PlayerState } from '../GameState';

export interface LevelUpResult {
  type: 'base' | 'job';
  newLevel: number;
}

const STAT_POINTS_PER_LEVEL = 3;
const SKILL_POINTS_PER_LEVEL = 1;

/** Award EXP to a player and process any level ups */
export function awardExp(
  player: PlayerState,
  baseExp: number,
  jobExp: number
): LevelUpResult[] {
  const results: LevelUpResult[] = [];

  // Add base EXP
  player.baseExp += baseExp;

  // Check base level ups
  while (player.baseLevel < MAX_BASE_LEVEL) {
    const required = baseExpRequired(player.baseLevel + 1);
    if (player.baseExp < required) break;

    player.baseExp -= required;
    player.baseLevel++;

    // Award stat points and recalculate HP/SP
    player.maxHp = HP_BASE + player.baseLevel * HP_PER_LEVEL + player.vit * HP_PER_VIT;
    player.maxSp = SP_BASE + player.baseLevel * SP_PER_LEVEL + player.int * SP_PER_INT;
    player.hp = player.maxHp; // Full heal on level up
    player.sp = player.maxSp;

    results.push({ type: 'base', newLevel: player.baseLevel });
  }

  // Add job EXP
  player.jobExp += jobExp;

  // Check job level ups
  while (player.jobLevel < MAX_JOB_LEVEL) {
    const required = jobExpRequired(player.jobLevel + 1);
    if (player.jobExp < required) break;

    player.jobExp -= required;
    player.jobLevel++;

    results.push({ type: 'job', newLevel: player.jobLevel });
  }

  player.dirty = true;
  return results;
}

/**
 * Persist level-up rewards: +3 stat points per base level, +1 skill point per
 * job level, plus the new levels/exp/HP/SP (crash-safe — don't wait for
 * disconnect). Points are DB-authoritative; returns the new totals.
 */
export async function grantLevelUpPoints(
  player: PlayerState,
  levelUps: LevelUpResult[]
): Promise<{ statPoints: number; skillPoints: number }> {
  const baseLevels = levelUps.filter((lu) => lu.type === 'base').length;
  const jobLevels = levelUps.filter((lu) => lu.type === 'job').length;

  const updated = await prisma.character.update({
    where: { id: player.characterId },
    data: {
      statPoints: { increment: baseLevels * STAT_POINTS_PER_LEVEL },
      skillPoints: { increment: jobLevels * SKILL_POINTS_PER_LEVEL },
      baseLevel: player.baseLevel,
      jobLevel: player.jobLevel,
      baseExp: player.baseExp,
      jobExp: player.jobExp,
      maxHp: player.maxHp,
      maxSp: player.maxSp,
      hp: player.hp,
      sp: player.sp,
    },
    select: { statPoints: true, skillPoints: true },
  });

  return updated;
}
