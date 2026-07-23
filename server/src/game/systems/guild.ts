/**
 * Guild system.
 *
 * - Persisted in DB (Guild + GuildMember models)
 * - Leader can invite, promote officers, kick
 * - Guild chat channel
 * - Max 50 members
 */

import { prisma } from '../../db';
import type { GuildState, GuildMemberInfo } from '@ro-game/shared';
import { gameState } from '../GameState';

const MAX_GUILD_SIZE = 50;
const pendingGuildInvites = new Map<string, { guildId: string; inviterName: string }>(); // invitee -> guild

export async function createGuild(
  characterId: string,
  guildName: string
): Promise<{ success: boolean; error?: string; guildState?: GuildState }> {
  // Check if already in guild
  const existing = await prisma.guildMember.findUnique({
    where: { characterId },
  });
  if (existing) return { success: false, error: 'Already in a guild' };

  // Check name uniqueness
  const nameExists = await prisma.guild.findUnique({ where: { name: guildName } });
  if (nameExists) return { success: false, error: 'Guild name already taken' };

  const guild = await prisma.guild.create({
    data: {
      name: guildName,
      leaderId: characterId,
      members: {
        create: { characterId, rank: 'LEADER' },
      },
    },
  });

  const guildState = await getGuildState(guild.id);
  return { success: true, guildState: guildState! };
}

export function inviteToGuild(
  inviterId: string,
  inviterName: string,
  targetId: string,
  guildId: string
): void {
  pendingGuildInvites.set(targetId, { guildId, inviterName });
}

export async function acceptGuildInvite(
  characterId: string
): Promise<{ success: boolean; error?: string; guildState?: GuildState }> {
  const invite = pendingGuildInvites.get(characterId);
  if (!invite) return { success: false, error: 'No pending guild invite' };
  pendingGuildInvites.delete(characterId);

  // Check guild exists and has room
  const guild = await prisma.guild.findUnique({
    where: { id: invite.guildId },
    include: { _count: { select: { members: true } } },
  });
  if (!guild) return { success: false, error: 'Guild no longer exists' };
  if (guild._count.members >= MAX_GUILD_SIZE) return { success: false, error: 'Guild is full' };

  // Check not already in a guild
  const existing = await prisma.guildMember.findUnique({ where: { characterId } });
  if (existing) return { success: false, error: 'Already in a guild' };

  await prisma.guildMember.create({
    data: { characterId, guildId: invite.guildId, rank: 'MEMBER' },
  });

  const guildState = await getGuildState(invite.guildId);
  return { success: true, guildState: guildState! };
}

export function declineGuildInvite(characterId: string): void {
  pendingGuildInvites.delete(characterId);
}

export async function leaveGuild(
  characterId: string
): Promise<{ success: boolean; error?: string; guildId?: string; disbanded?: boolean }> {
  const membership = await prisma.guildMember.findUnique({
    where: { characterId },
    include: { guild: true },
  });
  if (!membership) return { success: false, error: 'Not in a guild' };

  const guildId = membership.guildId;

  if (membership.guild.leaderId === characterId) {
    // Leader leaving — check if there are other members
    const otherMembers = await prisma.guildMember.findMany({
      where: { guildId, NOT: { characterId } },
      orderBy: { joinedAt: 'asc' },
    });

    if (otherMembers.length === 0) {
      // Disband guild
      await prisma.guildMember.deleteMany({ where: { guildId } });
      await prisma.guild.delete({ where: { id: guildId } });
      return { success: true, guildId, disbanded: true };
    }

    // Transfer leadership to next member
    const newLeader = otherMembers[0];
    await prisma.guild.update({
      where: { id: guildId },
      data: { leaderId: newLeader.characterId },
    });
    await prisma.guildMember.update({
      where: { id: newLeader.id },
      data: { rank: 'LEADER' },
    });
  }

  await prisma.guildMember.delete({ where: { characterId } });
  return { success: true, guildId };
}

export async function getGuildState(guildId: string): Promise<GuildState | null> {
  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    include: {
      members: {
        include: { character: { select: { id: true, name: true, class: true, baseLevel: true } } },
      },
    },
  });
  if (!guild) return null;

  const members: GuildMemberInfo[] = guild.members.map((m) => ({
    characterId: m.character.id,
    name: m.character.name,
    class: m.character.class,
    baseLevel: m.character.baseLevel,
    rank: m.rank,
    online: gameState.getPlayer(m.character.id) !== null,
  }));

  return {
    guildId: guild.id,
    guildName: guild.name,
    leaderId: guild.leaderId,
    level: guild.level,
    members,
  };
}

export async function getPlayerGuildId(characterId: string): Promise<string | null> {
  const membership = await prisma.guildMember.findUnique({
    where: { characterId },
    select: { guildId: true },
  });
  return membership?.guildId ?? null;
}
