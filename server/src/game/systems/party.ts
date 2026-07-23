/**
 * Party system.
 *
 * - Max 12 members per party
 * - Shared EXP when on same map (divided equally)
 * - Party leader can kick members
 * - If leader leaves, next member becomes leader
 */

import type { PartyState, PartyMember } from '@ro-game/shared';
import type { PlayerState } from '../GameState';
import { gameState } from '../GameState';

interface Party {
  id: string;
  leaderId: string;
  memberIds: Set<string>;
}

const MAX_PARTY_SIZE = 12;
const parties = new Map<string, Party>();
const playerParty = new Map<string, string>(); // characterId -> partyId
const pendingInvites = new Map<string, string>(); // invitee characterId -> inviter characterId
let nextPartyId = 1;

export function getPlayerPartyId(characterId: string): string | null {
  return playerParty.get(characterId) ?? null;
}

export function inviteToParty(inviterId: string, targetId: string): { success: boolean; error?: string } {
  // Can't invite if target already in party
  if (playerParty.has(targetId)) return { success: false, error: 'Player is already in a party' };

  let partyId = playerParty.get(inviterId);
  if (partyId) {
    const party = parties.get(partyId);
    if (!party) return { success: false, error: 'Party not found' };
    if (party.leaderId !== inviterId) return { success: false, error: 'Only the leader can invite' };
    if (party.memberIds.size >= MAX_PARTY_SIZE) return { success: false, error: 'Party is full' };
  }

  pendingInvites.set(targetId, inviterId);
  return { success: true };
}

export function acceptInvite(characterId: string): { success: boolean; partyId?: string; error?: string } {
  const inviterId = pendingInvites.get(characterId);
  if (!inviterId) return { success: false, error: 'No pending invite' };
  pendingInvites.delete(characterId);

  let partyId = playerParty.get(inviterId);

  if (!partyId) {
    // Create new party
    partyId = `party_${nextPartyId++}`;
    const party: Party = { id: partyId, leaderId: inviterId, memberIds: new Set([inviterId]) };
    parties.set(partyId, party);
    playerParty.set(inviterId, partyId);
  }

  const party = parties.get(partyId)!;
  if (party.memberIds.size >= MAX_PARTY_SIZE) return { success: false, error: 'Party is full' };

  party.memberIds.add(characterId);
  playerParty.set(characterId, partyId);

  return { success: true, partyId };
}

export function declineInvite(characterId: string): void {
  pendingInvites.delete(characterId);
}

export function leaveParty(characterId: string): { disbanded: boolean; partyId?: string } {
  const partyId = playerParty.get(characterId);
  if (!partyId) return { disbanded: false };

  const party = parties.get(partyId);
  if (!party) return { disbanded: false };

  party.memberIds.delete(characterId);
  playerParty.delete(characterId);

  if (party.memberIds.size === 0) {
    parties.delete(partyId);
    return { disbanded: true, partyId };
  }

  // Transfer leadership if leader left
  if (party.leaderId === characterId) {
    party.leaderId = party.memberIds.values().next().value as string;
  }

  return { disbanded: false, partyId };
}

export function kickFromParty(leaderId: string, targetId: string): { success: boolean; error?: string } {
  const partyId = playerParty.get(leaderId);
  if (!partyId) return { success: false, error: 'Not in a party' };

  const party = parties.get(partyId);
  if (!party || party.leaderId !== leaderId) return { success: false, error: 'Only leader can kick' };
  if (!party.memberIds.has(targetId)) return { success: false, error: 'Player not in your party' };

  party.memberIds.delete(targetId);
  playerParty.delete(targetId);

  return { success: true };
}

export function getPartyState(partyId: string): PartyState | null {
  const party = parties.get(partyId);
  if (!party) return null;

  const members: PartyMember[] = [];
  for (const memberId of party.memberIds) {
    const player = gameState.getPlayer(memberId);
    if (player) {
      members.push({
        characterId: player.characterId,
        name: player.name,
        class: player.class,
        hp: player.hp,
        maxHp: player.maxHp,
        baseLevel: player.baseLevel,
        mapName: player.mapName,
      });
    }
  }

  return { partyId: party.id, leaderId: party.leaderId, members };
}

export function getPartyMemberIds(partyId: string): string[] {
  const party = parties.get(partyId);
  if (!party) return [];
  return Array.from(party.memberIds);
}

/** Get party members on the same map for EXP sharing */
export function getPartyMembersOnMap(characterId: string, mapName: string): PlayerState[] {
  const partyId = playerParty.get(characterId);
  if (!partyId) return [];

  const party = parties.get(partyId);
  if (!party) return [];

  const members: PlayerState[] = [];
  for (const memberId of party.memberIds) {
    const player = gameState.getPlayer(memberId);
    if (player && player.mapName === mapName && player.action !== 'dead') {
      members.push(player);
    }
  }
  return members;
}
