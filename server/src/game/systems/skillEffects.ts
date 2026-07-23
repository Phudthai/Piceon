/**
 * Shared skill-result broadcasting: recall handling, per-hit combat:result emission +
 * monster-death handling, revive notifications, and stolen item/zeny notifications.
 *
 * Used by both the instant-cast path (skill:use socket handler, castTime === 0) and the
 * deferred-cast resolution path (GameLoop, when a PendingCast's remainingTicks hits 0) —
 * extracted so the two paths don't duplicate ~40 lines of broadcast logic.
 */

import type { Namespace } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '@ro-game/shared';
import type { PlayerState, MapRoom } from '../GameState';
import { warpPlayer } from './warp';
import { handleMonsterDeath } from './monsterDeath';
import { addItemToInventory, loadInventory } from './inventory';
import { buildPlayerStatsPayload } from './derivedStats';
import type { UseSkillResult } from './skills';

type GameNamespace = Namespace<ClientToServerEvents, ServerToClientEvents>;

export function broadcastSkillResult(
  result: UseSkillResult,
  player: PlayerState,
  skillId: number,
  gameNs: GameNamespace,
  room: MapRoom
): void {
  const socket = gameNs.sockets.get(player.socketId);

  if (result.recall) {
    if (result.recall.mapName === player.mapName) {
      player.x = result.recall.x;
      player.y = result.recall.y;
      player.dirty = true;
    } else {
      warpPlayer(player, result.recall.mapName, result.recall.x, result.recall.y, gameNs);
    }
  }

  // Broadcast combat result per monster hit (single-target skills hit one; AOE hits several)
  for (const hit of result.hits ?? []) {
    gameNs.to(`map:${player.mapName}`).emit('combat:result', {
      attackerId: player.characterId,
      targetId: hit.targetMonsterId,
      damage: hit.damage,
      isCrit: false,
      isMiss: false,
      skillId,
    });

    if (hit.isDead) {
      const monster = room.monsters.get(hit.targetMonsterId);
      if (monster) handleMonsterDeath(monster, player, player.mapName, gameNs);
    }
  }

  if (result.revivedCharacterId) {
    const revived = room.players.get(result.revivedCharacterId);
    if (revived) {
      gameNs.sockets.get(revived.socketId)?.emit('player:revived', { hp: revived.hp, maxHp: revived.maxHp });
      gameNs.sockets.get(revived.socketId)?.emit('player:stats', buildPlayerStatsPayload(revived));
    }
    socket?.emit('notification', { type: 'info', message: 'Ally revived!' });
  }

  if (result.stolenItemId != null) {
    addItemToInventory(player.characterId, result.stolenItemId, 1)
      .then(() => loadInventory(player.characterId))
      .then((items) => socket?.emit('inventory:update', { items }))
      .catch((err) => console.error('[Skill] Steal item error:', err));
    socket?.emit('notification', { type: 'info', message: 'You stole an item!' });
  }

  // Send updated SP/zeny
  socket?.emit('player:stats', buildPlayerStatsPayload(player, {
    zeny: (result.stolenZeny || result.recall) ? player.zeny : undefined,
  }));
  if (result.stolenZeny) {
    socket?.emit('notification', { type: 'info', message: `Snatched ${result.stolenZeny} zeny!` });
  }
}
