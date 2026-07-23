export enum CharacterClass {
  NOVICE = 'NOVICE',
  SWORDSMAN = 'SWORDSMAN',
  MAGE = 'MAGE',
  ARCHER = 'ARCHER',
  THIEF = 'THIEF',
  ACOLYTE = 'ACOLYTE',
  MERCHANT = 'MERCHANT',
  KNIGHT = 'KNIGHT',
  WIZARD = 'WIZARD',
  HUNTER = 'HUNTER',
  ASSASSIN = 'ASSASSIN',
  PRIEST = 'PRIEST',
  BLACKSMITH = 'BLACKSMITH',
}

export interface CharacterStats {
  str: number;
  agi: number;
  vit: number;
  int: number;
  dex: number;
  luk: number;
}

export interface CharacterPosition {
  mapName: string;
  x: number;
  y: number;
}

export interface Character {
  id: string;
  userId: string;
  name: string;
  class: CharacterClass;
  baseLevel: number;
  jobLevel: number;
  baseExp: number;
  jobExp: number;
  str: number;
  agi: number;
  vit: number;
  int: number;
  dex: number;
  luk: number;
  hp: number;
  maxHp: number;
  sp: number;
  maxSp: number;
  statPoints: number;
  skillPoints: number;
  zeny: number;
  mapName: string;
  posX: number;
  posY: number;
}

export interface CharacterSummary {
  id: string;
  name: string;
  class: CharacterClass;
  baseLevel: number;
  jobLevel: number;
}

export interface CreateCharacterRequest {
  name: string;
  class: CharacterClass;
}

export interface SpendStatPointsRequest {
  str?: number;
  agi?: number;
  vit?: number;
  int?: number;
  dex?: number;
  luk?: number;
}
