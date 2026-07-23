/** Party member info */
export interface PartyMember {
  characterId: string;
  name: string;
  class: string;
  hp: number;
  maxHp: number;
  baseLevel: number;
  mapName: string;
}

/** Party state sent to members */
export interface PartyState {
  partyId: string;
  leaderId: string;
  members: PartyMember[];
}

/** Guild member info */
export interface GuildMemberInfo {
  characterId: string;
  name: string;
  class: string;
  baseLevel: number;
  rank: 'LEADER' | 'OFFICER' | 'MEMBER';
  online: boolean;
}

/** Guild state */
export interface GuildState {
  guildId: string;
  guildName: string;
  leaderId: string;
  level: number;
  members: GuildMemberInfo[];
}
