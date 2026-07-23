/**
 * Shared monster-death handling: zeny award, drops, EXP, level-up points, quest kill
 * tracking. Called whenever a monster's HP reaches 0, regardless of the damage source
 * (basic attack in GameLoop.ts, or a skill hit in skills.ts via the skill:use handler).
 */

import type { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@ro-game/shared';
import type { MonsterInstance, PlayerState } from '../GameState';
import { TICK_RATE } from '@ro-game/shared';
import { generateDrops } from './drops';
import { awardExp, grantLevelUpPoints } from './experience';
import { recordKill } from './quests';
import { buildPlayerStatsPayload } from './derivedStats';
import { prisma } from '../../db';

function randomInt(min: number, max: number): number {
  if (max <= min) return min;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function handleMonsterDeath(
  monster: MonsterInstance,
  killer: PlayerState,
  mapName: string,
  gameNs: ReturnType<Server<ClientToServerEvents, ServerToClientEvents>['of']>
): void {
  monster.action = 'dead';
  monster.deathTimer = monster.respawnTime * TICK_RATE;
  monster.aggroTarget = null;
  monster.dirty = true;

  // Award zeny (Golden Touch/Windfall-style passives boost the payout)
  const zenyGained = Math.round(randomInt(monster.zenyMin, monster.zenyMax) * (1 + killer.passiveBonus.zenyBonusPct / 100));

  // Broadcast monster death
  gameNs.to(`map:${mapName}`).emit('monster:die', {
    monsterId: monster.id,
    killerId: killer.characterId,
    x: monster.x,
    y: monster.y,
    zenyGained,
  });

  if (zenyGained > 0) {
    prisma.character
      .update({ where: { id: killer.characterId }, data: { zeny: { increment: zenyGained } }, select: { zeny: true } })
      .then((updated) => {
        gameNs.sockets.get(killer.socketId)?.emit('player:stats', buildPlayerStatsPayload(killer, { zeny: updated.zeny }));
      })
      .catch((err) => console.error('[Zeny] Award error:', err));
  }

  // Generate drops
  const drops = generateDrops(monster, killer.characterId);
  for (const drop of drops) {
    gameNs.to(`map:${mapName}`).emit('item:dropped', {
      dropId: drop.id,
      itemId: drop.itemId,
      x: drop.x,
      y: drop.y,
    });
  }

  // Award EXP
  const levelUps = awardExp(killer, monster.baseExp, monster.jobExp);

  // Send updated stats to killer
  const killerSocket = gameNs.sockets.get(killer.socketId);
  killerSocket?.emit('player:stats', buildPlayerStatsPayload(killer));

  // Notify level ups and grant stat/skill points
  for (const lu of levelUps) {
    killerSocket?.emit('level:up', lu);
    gameNs.to(`map:${mapName}`).emit('notification', {
      type: 'info',
      message: `${killer.name} reached ${lu.type === 'base' ? 'Base' : 'Job'} Level ${lu.newLevel}!`,
    });
  }

  if (levelUps.length > 0) {
    grantLevelUpPoints(killer, levelUps)
      .then((points) => {
        killerSocket?.emit('player:stats', buildPlayerStatsPayload(killer, {
          statPoints: points.statPoints, skillPoints: points.skillPoints,
        }));
      })
      .catch((err) => console.error('[LevelUp] Grant points error:', err));
  }

  // Track quest kill progress
  recordKill(killer.characterId, monster.definitionId)
    .then((quests) => {
      if (quests) killerSocket?.emit('quests:update', { quests });
    })
    .catch((err) => console.error('[Quest] recordKill error:', err));
}
