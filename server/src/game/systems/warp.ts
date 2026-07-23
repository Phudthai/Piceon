/**
 * Warp system (Phase 7).
 *
 * Warp points are defined per-map in data/maps/*.json. When a player steps on
 * a warp tile, the game loop moves them to the destination map/position:
 * socket rooms are switched, both maps are notified, and the new map's full
 * state is sent to the warping player.
 */

import type { Namespace } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerState as SharedPlayerState,
  MonsterState as SharedMonsterState,
  DropState as SharedDropState,
  StateDelta,
} from '@ro-game/shared';
import { prisma } from '../../db';
import { gameState, type PlayerState } from '../GameState';
import { getPrimaryStatus } from './effects';
import { loadMap, type MapData } from '../maps/MapLoader';
import { ensureMonstersSpawned } from '../monsters/SpawnManager';

type GameNamespace = Namespace<ClientToServerEvents, ServerToClientEvents>;

export interface WarpDef {
  fromX: number;
  fromY: number;
  toMap: string;
  toX: number;
  toY: number;
}

/** Find a warp point at the given tile, if any */
export function getWarpAt(mapData: MapData, x: number, y: number): WarpDef | null {
  for (const warp of mapData.warpPoints) {
    if (warp.fromX === x && warp.fromY === y) return warp;
  }
  return null;
}

/**
 * Move a player to another map (warp points, respawn).
 * Handles game state, socket rooms, client notifications, and DB persistence.
 */
export function warpPlayer(
  player: PlayerState,
  toMap: string,
  toX: number,
  toY: number,
  gameNs: GameNamespace
): boolean {
  const targetMap = loadMap(toMap);
  if (!targetMap) {
    console.error(`[Warp] Target map not found: ${toMap}`);
    return false;
  }

  const fromMap = player.mapName;
  ensureMonstersSpawned(targetMap);
  gameState.movePlayerToMap(player.characterId, toMap, toX, toY);

  // Tell the old map this player is gone
  gameNs.to(`map:${fromMap}`).emit('player:leave', { playerId: player.characterId });

  // Switch socket rooms and send the new map to the warping player
  const socket = gameNs.sockets.get(player.socketId);
  if (socket) {
    socket.leave(`map:${fromMap}`);
    socket.join(`map:${toMap}`);
    socket.emit('map:change', { mapName: toMap, x: toX, y: toY });
    socket.emit('state:delta', buildFullState(toMap));
  }

  // Persist immediately so a crash/refresh doesn't strand the player
  prisma.character.update({
    where: { id: player.characterId },
    data: { mapName: toMap, posX: toX, posY: toY },
  }).catch((err) => console.error('[Warp] Save error:', err));

  console.log(`[Warp] ${player.name}: ${fromMap} → ${toMap} (${toX},${toY})`);
  return true;
}

/** Build the full visible state of a map (sent to a player entering it) */
export function buildFullState(mapName: string): StateDelta {
  const players: Record<string, SharedPlayerState> = {};
  for (const p of gameState.getPlayersInMap(mapName)) {
    players[p.characterId] = {
      id: p.characterId,
      name: p.name,
      class: p.class,
      x: p.x,
      y: p.y,
      hp: p.hp,
      maxHp: p.maxHp,
      action: p.action as SharedPlayerState['action'],
      direction: p.direction,
      status: getPrimaryStatus(p),
    };
  }

  const monsters: Record<string, SharedMonsterState> = {};
  for (const m of gameState.getMonstersInMap(mapName)) {
    if (m.action !== 'dead') {
      monsters[m.id] = {
        id: m.id,
        definitionId: m.definitionId,
        x: m.x,
        y: m.y,
        hp: m.hp,
        maxHp: m.maxHp,
        action: m.action as SharedMonsterState['action'],
        isShiny: m.isShiny || undefined,
        status: getPrimaryStatus(m),
      };
    }
  }

  const drops: Record<string, SharedDropState> = {};
  for (const d of gameState.getDropsInMap(mapName)) {
    drops[d.id] = { id: d.id, itemId: d.itemId, x: d.x, y: d.y };
  }

  return { players, monsters, drops };
}
