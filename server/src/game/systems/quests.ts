/**
 * Quest system (Phase 7).
 *
 * Quest definitions live in data/quests/quests.json (seeded into the Quest table
 * for persistence/reference, but the JSON is the runtime source of truth).
 * Player progress is persisted in CharacterQuest.progress as JSON:
 *   { "kill_<monsterId>": <killCount> }
 *
 * Flow: accept at NPC → kill counts tracked on monster death → complete at the
 * same NPC once all objectives are met (rewards: EXP, zeny, items).
 */

import { prisma } from '../../db';
import type { QuestDef, PlayerQuest, QuestObjectiveProgress, NpcQuestInfo } from '@ro-game/shared';
import type { PlayerState } from '../GameState';
import { awardExp, type LevelUpResult } from './experience';
import { addItemToInventory } from './inventory';

import questDefsJson from '../../../../data/quests/quests.json';

const questDefs = new Map<number, QuestDef>();
for (const q of questDefsJson as QuestDef[]) {
  questDefs.set(q.id, q);
}

type ProgressMap = Record<string, number>;

function killKey(monsterId: number): string {
  return `kill_${monsterId}`;
}

function toPlayerQuest(
  def: QuestDef,
  status: 'IN_PROGRESS' | 'COMPLETED',
  progress: ProgressMap
): PlayerQuest {
  const objectives: QuestObjectiveProgress[] = def.objectives.map((obj) => ({
    ...obj,
    current: Math.min(progress[killKey(obj.monsterId)] ?? 0, obj.count),
  }));
  return {
    questId: def.id,
    name: def.name,
    description: def.description,
    npcId: def.npcId,
    status,
    objectives,
    rewards: def.rewards,
  };
}

function objectivesMet(def: QuestDef, progress: ProgressMap): boolean {
  return def.objectives.every((obj) => (progress[killKey(obj.monsterId)] ?? 0) >= obj.count);
}

/** Load all quests (in progress + completed) for a character */
export async function loadPlayerQuests(characterId: string): Promise<PlayerQuest[]> {
  const rows = await prisma.characterQuest.findMany({
    where: { characterId, status: { in: ['IN_PROGRESS', 'COMPLETED'] } },
  });

  const quests: PlayerQuest[] = [];
  for (const row of rows) {
    const def = questDefs.get(row.questId);
    if (!def) continue;
    quests.push(
      toPlayerQuest(
        def,
        row.status as 'IN_PROGRESS' | 'COMPLETED',
        (row.progress as ProgressMap) ?? {}
      )
    );
  }
  return quests;
}

/** Quest availability info for an NPC dialog */
export async function getNpcQuestInfo(
  npcId: string,
  characterId: string,
  baseLevel: number
): Promise<NpcQuestInfo[]> {
  const npcQuests = Array.from(questDefs.values()).filter((q) => q.npcId === npcId);
  if (npcQuests.length === 0) return [];

  const rows = await prisma.characterQuest.findMany({
    where: { characterId, questId: { in: npcQuests.map((q) => q.id) } },
  });
  const byQuestId = new Map(rows.map((r) => [r.questId, r]));

  const info: NpcQuestInfo[] = [];
  for (const def of npcQuests) {
    const row = byQuestId.get(def.id);
    if (!row) {
      info.push({
        questId: def.id,
        questName: def.name,
        canAccept: baseLevel >= def.levelReq,
        canComplete: false,
      });
    } else if (row.status === 'IN_PROGRESS') {
      info.push({
        questId: def.id,
        questName: def.name,
        canAccept: false,
        canComplete: objectivesMet(def, (row.progress as ProgressMap) ?? {}),
      });
    }
    // COMPLETED quests are not repeatable — omitted from dialog
  }
  return info;
}

/** Accept a quest from an NPC */
export async function acceptQuest(
  characterId: string,
  questId: number,
  baseLevel: number
): Promise<{ success: boolean; error?: string; quests?: PlayerQuest[] }> {
  const def = questDefs.get(questId);
  if (!def) return { success: false, error: 'Quest not found' };
  if (baseLevel < def.levelReq) {
    return { success: false, error: `Requires Base Level ${def.levelReq}` };
  }

  const existing = await prisma.characterQuest.findUnique({
    where: { characterId_questId: { characterId, questId } },
  });
  if (existing) {
    return { success: false, error: existing.status === 'COMPLETED' ? 'Quest already completed' : 'Quest already in progress' };
  }

  await prisma.characterQuest.create({
    data: { characterId, questId, status: 'IN_PROGRESS', progress: {} },
  });

  const quests = await loadPlayerQuests(characterId);
  return { success: true, quests };
}

/**
 * Record a monster kill for all in-progress quests that need it.
 * Returns the updated quest list, or null if no quest progress changed.
 */
export async function recordKill(
  characterId: string,
  monsterDefinitionId: number
): Promise<PlayerQuest[] | null> {
  const rows = await prisma.characterQuest.findMany({
    where: { characterId, status: 'IN_PROGRESS' },
  });
  if (rows.length === 0) return null;

  let changed = false;
  for (const row of rows) {
    const def = questDefs.get(row.questId);
    if (!def) continue;

    const needsThisKill = def.objectives.some(
      (obj) =>
        obj.type === 'kill' &&
        obj.monsterId === monsterDefinitionId &&
        (((row.progress as ProgressMap) ?? {})[killKey(obj.monsterId)] ?? 0) < obj.count
    );
    if (!needsThisKill) continue;

    const progress: ProgressMap = { ...((row.progress as ProgressMap) ?? {}) };
    const key = killKey(monsterDefinitionId);
    progress[key] = (progress[key] ?? 0) + 1;

    await prisma.characterQuest.update({
      where: { id: row.id },
      data: { progress },
    });
    changed = true;
  }

  return changed ? loadPlayerQuests(characterId) : null;
}

/** Turn in a completed quest at its NPC and grant rewards */
export async function completeQuest(
  characterId: string,
  questId: number,
  player: PlayerState
): Promise<{
  success: boolean;
  error?: string;
  quests?: PlayerQuest[];
  zeny?: number;
  levelUps?: LevelUpResult[];
}> {
  const def = questDefs.get(questId);
  if (!def) return { success: false, error: 'Quest not found' };

  const row = await prisma.characterQuest.findUnique({
    where: { characterId_questId: { characterId, questId } },
  });
  if (!row || row.status !== 'IN_PROGRESS') {
    return { success: false, error: 'Quest is not in progress' };
  }
  if (!objectivesMet(def, (row.progress as ProgressMap) ?? {})) {
    return { success: false, error: 'Objectives not yet complete' };
  }

  await prisma.characterQuest.update({
    where: { id: row.id },
    data: { status: 'COMPLETED', completedAt: new Date() },
  });

  // Rewards: zeny (DB), items (DB), EXP (in-memory state, persisted on disconnect)
  const updated = await prisma.character.update({
    where: { id: characterId },
    data: { zeny: { increment: def.rewards.zeny } },
    select: { zeny: true },
  });

  for (const reward of def.rewards.items) {
    await addItemToInventory(characterId, reward.itemId, reward.quantity);
  }

  const levelUps = awardExp(player, def.rewards.baseExp, def.rewards.jobExp);

  const quests = await loadPlayerQuests(characterId);
  return { success: true, quests, zeny: updated.zeny, levelUps };
}

export function getQuestDef(questId: number): QuestDef | null {
  return questDefs.get(questId) ?? null;
}
