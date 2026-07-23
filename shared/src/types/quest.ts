// Quest system types (Phase 7)

/** A single quest objective — currently only kill objectives are supported */
export interface QuestObjective {
  type: 'kill';
  monsterId: number; // MonsterDefinition id
  monsterName: string; // display name for UI
  count: number; // required kills
}

export interface QuestRewardItem {
  itemId: number;
  quantity: number;
}

export interface QuestRewards {
  baseExp: number;
  jobExp: number;
  zeny: number;
  items: QuestRewardItem[];
}

/** Static quest definition (from data/quests/quests.json) */
export interface QuestDef {
  id: number;
  name: string;
  description: string;
  levelReq: number;
  npcId: string; // NPC that gives (and completes) this quest
  objectives: QuestObjective[];
  rewards: QuestRewards;
}

/** Objective with the player's current progress merged in */
export interface QuestObjectiveProgress extends QuestObjective {
  current: number;
}

export type PlayerQuestStatus = 'IN_PROGRESS' | 'COMPLETED';

/** A quest as seen by the player (definition + progress) */
export interface PlayerQuest {
  questId: number;
  name: string;
  description: string;
  npcId: string;
  status: PlayerQuestStatus;
  objectives: QuestObjectiveProgress[];
  rewards: QuestRewards;
}

/** Info attached to an NPC dialog about an available/active quest */
export interface NpcQuestInfo {
  questId: number;
  questName: string;
  canAccept: boolean; // not started yet and level requirement met
  canComplete: boolean; // in progress and all objectives met
}
