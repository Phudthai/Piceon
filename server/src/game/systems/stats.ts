/**
 * Stat point allocation.
 *
 * Stat/skill points are DB-authoritative. Allocation validates against the DB,
 * applies increments, and recalculates MaxHP/MaxSP:
 *   MaxHP = 35 + (BaseLevel * 5) + (VIT * 8)
 *   MaxSP = 10 + (BaseLevel * 2) + (INT * 5)
 * Callers with an in-memory PlayerState must sync the returned values into it.
 */

import type { Character } from '@prisma/client';
import type { StatAllocation } from '@ro-game/shared';
import {
  HP_BASE, HP_PER_LEVEL, HP_PER_VIT,
  SP_BASE, SP_PER_LEVEL, SP_PER_INT,
} from '@ro-game/shared';
import { prisma } from '../../db';

const STATS = ['str', 'agi', 'vit', 'int', 'dex', 'luk'] as const;
const MAX_STAT = 99;

export async function allocateStatPoints(
  characterId: string,
  alloc: StatAllocation
): Promise<{ success: boolean; error?: string; character?: Character }> {
  for (const stat of STATS) {
    const v = alloc[stat];
    if (!Number.isInteger(v) || v < 0) {
      return { success: false, error: 'Invalid stat allocation' };
    }
  }

  const totalSpent = STATS.reduce((sum, stat) => sum + alloc[stat], 0);
  if (totalSpent < 1) return { success: false, error: 'Nothing to allocate' };

  const character = await prisma.character.findUnique({ where: { id: characterId } });
  if (!character) return { success: false, error: 'Character not found' };

  if (totalSpent > character.statPoints) {
    return {
      success: false,
      error: `Not enough stat points (have ${character.statPoints}, need ${totalSpent})`,
    };
  }

  for (const stat of STATS) {
    if (character[stat] + alloc[stat] > MAX_STAT) {
      return { success: false, error: `${stat.toUpperCase()} cannot exceed ${MAX_STAT}` };
    }
  }

  const newVit = character.vit + alloc.vit;
  const newInt = character.int + alloc.int;
  const newMaxHp = HP_BASE + character.baseLevel * HP_PER_LEVEL + newVit * HP_PER_VIT;
  const newMaxSp = SP_BASE + character.baseLevel * SP_PER_LEVEL + newInt * SP_PER_INT;

  const updated = await prisma.character.update({
    where: { id: characterId },
    data: {
      str: { increment: alloc.str },
      agi: { increment: alloc.agi },
      vit: { increment: alloc.vit },
      int: { increment: alloc.int },
      dex: { increment: alloc.dex },
      luk: { increment: alloc.luk },
      statPoints: { decrement: totalSpent },
      maxHp: newMaxHp,
      maxSp: newMaxSp,
      hp: Math.min(character.hp, newMaxHp),
      sp: Math.min(character.sp, newMaxSp),
    },
  });

  return { success: true, character: updated };
}
