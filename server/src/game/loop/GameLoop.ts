/**
 * Server game loop — 20 ticks per second (50ms interval).
 *
 * Each tick:
 * 1. Process player movement
 * 2. Process player attacks on monsters
 * 3. Run monster AI (move, aggro, attack players)
 * 4. Process monster attacks on players
 * 5. Handle monster deaths (drops, EXP)
 * 6. Handle monster respawns
 * 7. Tick drops (despawn timers)
 * 8. Broadcast state deltas
 */

import { Server } from 'socket.io';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  PlayerState as SharedPlayerState,
  MonsterState as SharedMonsterState,
  DropState as SharedDropState,
} from '@ro-game/shared';
import { TICK_RATE, TICK_INTERVAL_MS, PLAYER_MOVE_TICKS, attackCooldownTicksForAgi } from '@ro-game/shared';
import { gameState } from '../GameState';
import { advanceMove, computeServerPath, findApproachTile } from '../systems/movement';
import { processMonsterAI, onMonsterAttacked } from '../systems/ai';
import {
  calcPlayerVsMonster,
  calcMonsterVsPlayer,
  applyDamageToMonster,
  applyDamageToPlayer,
} from '../systems/combat';
import { tickDrops } from '../systems/drops';
import { respawnMonster } from '../monsters/SpawnManager';
import { loadMap } from '../maps/MapLoader';
import { getWarpAt, warpPlayer } from '../systems/warp';
import { handleMonsterDeath } from '../systems/monsterDeath';
import { tickEffects, tickCooldowns, hasStatus, getEffectiveStat, getPrimaryStatus } from '../systems/effects';
import { resolvePendingCast } from '../systems/skills';
import { broadcastSkillResult } from '../systems/skillEffects';
import { buildPlayerStatsPayload } from '../systems/derivedStats';
import type { PlayerState, MonsterInstance } from '../GameState';

/** True while immobilized by a status effect — blocks movement and attacking */
function isImmobilized(entity: PlayerState | MonsterInstance): boolean {
  return hasStatus(entity, 'stun') || hasStatus(entity, 'freeze') || hasStatus(entity, 'root') || hasStatus(entity, 'petrify');
}

// Monster attack speed: ticks between attacks (lower = faster). Player attack speed is
// AGI-derived (see attackCooldownTicksForAgi) — monsters keep this fixed value.
const MONSTER_ATTACK_SPEED = 15; // 0.75 seconds

export class GameLoop {
  private intervalId: NodeJS.Timeout | null = null;
  private tickCount = 0;

  constructor(
    private io: Server<ClientToServerEvents, ServerToClientEvents>
  ) {}

  start(): void {
    if (this.intervalId) return;
    console.log(`[GameLoop] Starting at ${TICK_RATE} ticks/sec`);
    this.intervalId = setInterval(() => this.tick(), TICK_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[GameLoop] Stopped');
    }
  }

  private tick(): void {
    this.tickCount++;
    gameState.incrementTick();
    const rooms = gameState.getActiveRooms();
    const gameNs = this.io.of('/game');

    for (const room of rooms) {
      const mapData = loadMap(room.name);
      if (!mapData) continue;

      // 1. Process player movement (collect warps to apply after iteration —
      //    warping mutates room.players, which we must not do mid-loop)
      const warpingPlayers: Array<import('../GameState').PlayerState> = [];
      for (const player of room.players.values()) {
        tickEffects(player, this.tickCount, true);
        tickCooldowns(player);

        if (player.moveAction && !isImmobilized(player) && !player.pendingCast) {
          // Step every PLAYER_MOVE_TICKS ticks to match client prediction speed
          // (scaled by any active moveSpeed buff, e.g. Increase AGI)
          if (player.moveCooldown > 0) {
            player.moveCooldown--;
          } else {
            const speedMod = getEffectiveStat(player, 'moveSpeed');
            const moveTicks = Math.max(1, Math.round(PLAYER_MOVE_TICKS / (1 + speedMod.pct / 100)));
            player.moveCooldown = moveTicks - 1;
            const nextPos = advanceMove(player.moveAction);
            if (nextPos) {
              player.x = nextPos.x;
              player.y = nextPos.y;
              player.action = 'walk';
              player.dirty = true;

              if (getWarpAt(mapData, player.x, player.y)) {
                warpingPlayers.push(player);
              }
            } else {
              player.moveAction = null;
              player.action = 'idle';
              player.dirty = true;
            }
          }
        }

        // Decrease attack cooldown
        if (player.attackCooldown > 0) player.attackCooldown--;

        // Tick an in-progress skill cast (ASPD-scaled castTime), if any
        if (player.pendingCast) {
          player.pendingCast.remainingTicks--;
          if (player.pendingCast.remainingTicks <= 0) {
            if (player.action === 'dead') {
              // Caster died mid-cast — fizzle silently, no SP/zeny refund
              player.pendingCast = null;
            } else {
              const skillId = player.pendingCast.skillId;
              const castResult = resolvePendingCast(player, room.monsters, room.players, mapData);
              player.action = 'idle';
              player.dirty = true;
              if (castResult) broadcastSkillResult(castResult, player, skillId, gameNs, room);
            }
          }
        }
      }

      for (const player of warpingPlayers) {
        const warp = getWarpAt(mapData, player.x, player.y);
        if (warp) warpPlayer(player, warp.toMap, warp.toX, warp.toY, gameNs);
      }

      // 2. Process player attacks on monsters
      for (const player of room.players.values()) {
        if (!player.attackTarget || player.action === 'dead' || player.pendingCast) continue;
        if (player.attackCooldown > 0) continue;
        if (isImmobilized(player)) continue;

        const monster = room.monsters.get(player.attackTarget);
        if (!monster || monster.action === 'dead') {
          player.attackTarget = null;
          player.action = 'idle';
          player.dirty = true;
          continue;
        }

        // Check range (per equipped weapon — melee weapons default to 1 tile)
        const dist = Math.max(Math.abs(player.x - monster.x), Math.abs(player.y - monster.y));
        if (dist > player.weaponRange) {
          // Too far — approach if not already moving toward it
          if (!player.moveAction) {
            const mapData = loadMap(player.mapName);
            if (mapData) {
              const approachTile = findApproachTile(mapData, player.x, player.y, monster.x, monster.y, player.weaponRange);
              if (approachTile.x !== player.x || approachTile.y !== player.y) {
                player.moveAction = {
                  characterId: player.characterId,
                  path: computeServerPath(mapData, player.x, player.y, approachTile.x, approachTile.y),
                  currentStep: 0,
                };
                player.moveCooldown = 0;
                player.action = 'walk';
                player.dirty = true;
              }
            }
          }
          continue;
        }

        // Calculate and apply damage
        const result = calcPlayerVsMonster(player, monster);
        const effAgi = player.agi + player.bonusAgi + player.passiveBonus.agi;
        player.attackCooldown = attackCooldownTicksForAgi(effAgi);
        player.action = 'attack';
        player.dirty = true;

        // Broadcast combat result
        gameNs.to(`map:${room.name}`).emit('combat:result', {
          attackerId: player.characterId,
          targetId: monster.id,
          damage: result.damage,
          isCrit: result.isCrit,
          isMiss: result.isMiss,
        });

        if (!result.isMiss) {
          const isDead = applyDamageToMonster(monster, result.damage);
          onMonsterAttacked(monster, player.characterId);

          if (isDead) {
            handleMonsterDeath(monster, player, room.name, gameNs);
          }
        }
      }

      // 3. Run monster AI
      for (const monster of room.monsters.values()) {
        if (monster.action === 'dead') {
          // Handle respawn timer
          if (monster.deathTimer > 0) {
            monster.deathTimer--;
          } else if (monster.deathTimer === 0) {
            respawnMonster(monster, mapData);
          }
          continue;
        }

        tickEffects(monster, this.tickCount, false);
        if (isImmobilized(monster)) continue;

        processMonsterAI(monster, mapData.walkable);
      }

      // 4. Process monster attacks on players
      for (const monster of room.monsters.values()) {
        if (monster.action !== 'attack' || !monster.aggroTarget) continue;
        if (monster.attackCooldown > 0) continue;
        if (isImmobilized(monster)) continue;

        const target = room.players.get(monster.aggroTarget);
        if (!target || target.action === 'dead') {
          monster.aggroTarget = null;
          monster.action = 'idle';
          monster.dirty = true;
          continue;
        }

        const dist = Math.max(Math.abs(monster.x - target.x), Math.abs(monster.y - target.y));
        if (dist > monster.attackRange) continue;

        const result = calcMonsterVsPlayer(monster, target);
        monster.attackCooldown = MONSTER_ATTACK_SPEED;

        gameNs.to(`map:${room.name}`).emit('combat:result', {
          attackerId: monster.id,
          targetId: target.characterId,
          damage: result.damage,
          isCrit: result.isCrit,
          isMiss: result.isMiss,
        });

        if (!result.isMiss) {
          const isDead = applyDamageToPlayer(target, result.damage);
          const socket = gameNs.sockets.get(target.socketId);

          // Victim sees their HP drop on the HUD
          socket?.emit('player:stats', buildPlayerStatsPayload(target));

          if (isDead) {
            target.action = 'dead';
            target.attackTarget = null;
            target.moveAction = null;
            target.deathTimestamp = gameState.getTickCount();
            target.dirty = true;

            socket?.emit('player:dead');
            socket?.emit('notification', { type: 'warning', message: 'You have been defeated!' });
          }
        }
      }

      // 5. Tick drops
      tickDrops(room.name);

      // 6. Broadcast state deltas
      this.broadcastDeltas(room.name, gameNs);
    }
  }

  private broadcastDeltas(
    mapName: string,
    gameNs: ReturnType<Server<ClientToServerEvents, ServerToClientEvents>['of']>
  ): void {
    const dirtyPlayers = gameState.getDirtyPlayers(mapName);
    const dirtyMonsters = gameState.getDirtyMonsters(mapName);
    const dirtyDrops = gameState.getDirtyDrops(mapName);

    if (dirtyPlayers.length === 0 && dirtyMonsters.length === 0 && dirtyDrops.length === 0) {
      return; // nothing changed
    }

    const players: Record<string, SharedPlayerState> = {};
    for (const p of dirtyPlayers) {
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
    for (const m of dirtyMonsters) {
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

    const drops: Record<string, SharedDropState> = {};
    for (const d of dirtyDrops) {
      drops[d.id] = {
        id: d.id,
        itemId: d.itemId,
        x: d.x,
        y: d.y,
      };
    }

    gameNs.to(`map:${mapName}`).emit('state:delta', { players, monsters, drops });
  }
}
