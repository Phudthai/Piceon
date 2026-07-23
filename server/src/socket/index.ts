import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import type { ClientToServerEvents, ServerToClientEvents } from '@ro-game/shared';
import { STARTING_POS_X, STARTING_POS_Y } from '@ro-game/shared';
import { buildPlayerStatsPayload } from '../game/systems/derivedStats';
import { prisma } from '../db';
import { gameState, type PlayerState, BASE_MAX_WEIGHT } from '../game/GameState';
import { loadMap } from '../game/maps/MapLoader';
import { ensureMonstersSpawned } from '../game/monsters/SpawnManager';
import { canPickup } from '../game/systems/drops';
import { buildFullState, warpPlayer } from '../game/systems/warp';
import { loadPlayerQuests, getNpcQuestInfo, acceptQuest, completeQuest } from '../game/systems/quests';
import {
  loadInventory,
  equipItem,
  unequipItem,
  useItem,
  addItemToInventory,
  recalcEquipStats,
} from '../game/systems/inventory';
import { getShopData, buyItem, sellItem } from '../game/systems/shop';
import { refineItem, socketItem, unsocketItem } from '../game/systems/enhancement';
import { computeServerPath, findApproachTile } from '../game/systems/movement';
import { allocateStatPoints } from '../game/systems/stats';
import { grantLevelUpPoints } from '../game/systems/experience';
import { loadPlayerSkills, learnSkill, useSkill, recalcPassiveStats } from '../game/systems/skills';
import { broadcastSkillResult } from '../game/systems/skillEffects';
import { removeStatus, hasStatus } from '../game/systems/effects';
import {
  inviteToParty, acceptInvite, declineInvite, leaveParty, kickFromParty,
  getPartyState, getPlayerPartyId, getPartyMemberIds,
} from '../game/systems/party';
import {
  createGuild, inviteToGuild, acceptGuildInvite, declineGuildInvite,
  leaveGuild, getGuildState, getPlayerGuildId,
} from '../game/systems/guild';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const NPC_TALK_RANGE = 4; // max Chebyshev distance to interact with an NPC

type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export function setupSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>
): void {
  const gameNamespace = io.of('/game');

  // ─── Auth middleware ──────────────────────────────
  gameNamespace.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error('Authentication required'));

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
      socket.data.userId = decoded.userId;
      socket.data.email = decoded.email;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection handler ───────────────────────────
  gameNamespace.on('connection', async (socket: GameSocket) => {
    const userId = socket.data.userId as string;
    const characterId = socket.handshake.auth.characterId as string | undefined;

    if (!characterId) {
      socket.emit('notification', { type: 'error', message: 'No character selected' });
      socket.disconnect();
      return;
    }

    const character = await prisma.character.findFirst({
      where: { id: characterId, userId },
    });

    if (!character) {
      socket.emit('notification', { type: 'error', message: 'Character not found' });
      socket.disconnect();
      return;
    }

    const mapData = loadMap(character.mapName);
    if (!mapData) {
      socket.emit('notification', { type: 'error', message: 'Map not found' });
      socket.disconnect();
      return;
    }

    // Spawn monsters on first player join to this map
    ensureMonstersSpawned(mapData);

    // Rescue characters stranded out of bounds / on unwalkable tiles
    // (e.g. legacy rows saved with the old 150,150 spawn on a 40x40 map)
    let spawnX = Math.floor(character.posX);
    let spawnY = Math.floor(character.posY);
    if (!mapData.walkable[spawnY]?.[spawnX]) {
      spawnX = STARTING_POS_X;
      spawnY = STARTING_POS_Y;
      await prisma.character.update({
        where: { id: characterId },
        data: { posX: spawnX, posY: spawnY, mapName: character.mapName },
      });
    }

    // Died then refreshed instead of respawning — revive with full HP
    let joinHp = character.hp;
    let joinSp = character.sp;
    if (joinHp <= 0) {
      joinHp = character.maxHp;
      joinSp = character.maxSp;
      await prisma.character.update({
        where: { id: characterId },
        data: { hp: joinHp, sp: joinSp },
      });
    }

    // Load inventory (equip-derived stats are computed below via recalcEquipStats)
    const inventoryItems = await loadInventory(characterId);

    // Create player state
    const playerState: PlayerState = {
      characterId: character.id,
      userId,
      socketId: socket.id,
      name: character.name,
      class: character.class,
      mapName: character.mapName,
      x: spawnX,
      y: spawnY,
      hp: joinHp,
      maxHp: character.maxHp,
      sp: joinSp,
      maxSp: character.maxSp,
      baseLevel: character.baseLevel,
      jobLevel: character.jobLevel,
      baseExp: character.baseExp,
      jobExp: character.jobExp,
      str: character.str,
      agi: character.agi,
      vit: character.vit,
      int: character.int,
      dex: character.dex,
      luk: character.luk,
      weaponAtk: 0,
      weaponRange: 1,
      armorDef: 0,
      weaponMatk: 0,
      armorMdef: 0,
      bonusStr: 0,
      bonusAgi: 0,
      bonusVit: 0,
      bonusInt: 0,
      bonusDex: 0,
      bonusLuk: 0,
      skillDamageBonus: { all: 0, bySkillId: {} },
      passiveBonus: {
        str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0,
        atk: 0, matk: 0, def: 0, critRate: 0, weight: 0, shopBuyPct: 0, shopSellPct: 0, refineSuccessPct: 0, zenyBonusPct: 0,
      },
      activeEffects: [],
      skillCooldowns: {},
      pendingCast: null,
      zeny: character.zeny,
      currentWeight: 0,
      maxWeight: BASE_MAX_WEIGHT,
      savedMapName: character.savedMapName ?? null,
      savedPosX: character.savedPosX ?? null,
      savedPosY: character.savedPosY ?? null,
      deathTimestamp: null,
      action: 'idle',
      direction: 0,
      moveAction: null,
      moveCooldown: 0,
      attackTarget: null,
      attackCooldown: 0,
      dirty: true,
    };
    recalcEquipStats(playerState, inventoryItems);

    gameState.addPlayer(playerState);
    socket.join(`map:${character.mapName}`);
    socket.data.characterId = characterId;

    console.log(`[Socket] ${character.name} joined ${character.mapName}`);

    // Send full current state (players + monsters + drops)
    socket.emit('state:delta', buildFullState(character.mapName));

    // Send initial stats
    socket.emit('player:stats', buildPlayerStatsPayload(playerState, { zeny: character.zeny }));

    // Send inventory
    socket.emit('inventory:load', { items: inventoryItems, maxWeight: playerState.maxWeight });

    // Send skills
    const playerSkills = await loadPlayerSkills(characterId);
    socket.emit('skills:load', { skills: playerSkills, skillPoints: character.skillPoints });
    recalcPassiveStats(playerState, playerSkills);

    // Send quests
    const playerQuests = await loadPlayerQuests(characterId);
    socket.emit('quests:load', { quests: playerQuests });

    // Send base stats for the status window
    socket.emit('stats:update', {
      str: character.str, agi: character.agi, vit: character.vit,
      int: character.int, dex: character.dex, luk: character.luk,
      statPoints: character.statPoints,
    });

    // ─── Event: player:move ─────────────────────────
    socket.on('player:move', (data) => {
      const player = gameState.getPlayer(characterId);
      if (!player || player.action === 'dead') return;

      const currentMap = loadMap(player.mapName);
      if (!currentMap) return;

      if (
        data.targetX < 0 || data.targetX >= currentMap.width ||
        data.targetY < 0 || data.targetY >= currentMap.height ||
        !currentMap.walkable[data.targetY][data.targetX]
      ) return;

      // Stop attacking when moving
      player.attackTarget = null;

      player.moveAction = {
        characterId,
        path: computeServerPath(currentMap, player.x, player.y, data.targetX, data.targetY),
        currentStep: 0,
      };
      player.moveCooldown = 0; // step immediately for responsiveness
      player.action = 'walk';
      player.dirty = true;
    });

    // ─── Event: player:attack ───────────────────────
    socket.on('player:attack', (data) => {
      const player = gameState.getPlayer(characterId);
      if (!player || player.action === 'dead') return;

      // Verify monster exists on same map
      const monster = gameState.getMonster(player.mapName, data.targetId);
      if (!monster || monster.action === 'dead') return;

      player.attackTarget = data.targetId;
      player.dirty = true;
      removeStatus(player, 'stealth');

      // If out of weapon range, path to a tile within range instead of standing still
      const dist = Math.max(Math.abs(player.x - monster.x), Math.abs(player.y - monster.y));
      if (dist > player.weaponRange) {
        const currentMap = loadMap(player.mapName);
        if (currentMap) {
          const approachTile = findApproachTile(currentMap, player.x, player.y, monster.x, monster.y, player.weaponRange);
          player.moveAction = {
            characterId,
            path: computeServerPath(currentMap, player.x, player.y, approachTile.x, approachTile.y),
            currentStep: 0,
          };
          player.moveCooldown = 0;
          player.action = 'walk';
        }
      } else {
        player.moveAction = null;
        player.action = 'attack';
      }
    });

    // ─── Event: item:pickup ─────────────────────────
    socket.on('item:pickup', async (data) => {
      const player = gameState.getPlayer(characterId);
      if (!player || player.action === 'dead') return;

      const drop = gameState.getDrop(player.mapName, data.dropId);
      if (!drop) return;

      // No range check — pickup works from anywhere on the same map the client can
      // see/click the drop; only same-map + ownership priority (canPickup) gate it.

      if (!canPickup(drop, characterId)) {
        socket.emit('notification', { type: 'warning', message: 'Someone else has priority on this drop' });
        return;
      }

      // Remove drop and add to inventory
      gameState.removeDrop(player.mapName, data.dropId);

      // Notify all players the drop was picked up
      gameNamespace.to(`map:${player.mapName}`).emit('item:picked', {
        dropId: data.dropId,
        playerId: characterId,
      });

      // Add to DB inventory with stacking
      try {
        await addItemToInventory(characterId, drop.itemId, 1);
        const items = await loadInventory(characterId);
        socket.emit('inventory:update', { items });
      } catch (err) {
        console.error('[Pickup] DB error:', err);
      }
    });

    // ─── Event: item:equip ──────────────────────────
    socket.on('item:equip', async (data) => {
      const player = gameState.getPlayer(characterId);
      if (!player || player.action === 'dead') return;

      const result = await equipItem(characterId, data.inventoryId, player);
      if (!result.success) {
        socket.emit('notification', { type: 'warning', message: result.error || 'Cannot equip' });
        return;
      }

      socket.emit('inventory:update', { items: result.items! });
      socket.emit('player:stats', buildPlayerStatsPayload(player));
    });

    // ─── Event: item:unequip ────────────────────────
    socket.on('item:unequip', async (data) => {
      const player = gameState.getPlayer(characterId);
      if (!player || player.action === 'dead') return;

      const result = await unequipItem(characterId, data.inventoryId, player);
      if (!result.success) {
        socket.emit('notification', { type: 'warning', message: result.error || 'Cannot unequip' });
        return;
      }

      socket.emit('inventory:update', { items: result.items! });
      socket.emit('player:stats', buildPlayerStatsPayload(player));
    });

    // ─── Event: item:use ────────────────────────────
    socket.on('item:use', async (data) => {
      const player = gameState.getPlayer(characterId);
      if (!player || player.action === 'dead') return;

      const result = await useItem(characterId, data.inventoryId, player);
      if (!result.success) {
        socket.emit('notification', { type: 'warning', message: result.error || 'Cannot use item' });
        return;
      }

      socket.emit('inventory:update', { items: result.items! });
      socket.emit('player:stats', buildPlayerStatsPayload(player));
    });

    // ─── Event: shop:buy ────────────────────────────
    socket.on('shop:buy', async (data) => {
      const player = gameState.getPlayer(characterId);
      if (!player) return;

      const result = await buyItem(characterId, data.npcId, data.itemId, data.quantity, player.passiveBonus.shopBuyPct, player.maxWeight);
      if (!result.success) {
        socket.emit('notification', { type: 'warning', message: result.error || 'Cannot buy' });
        return;
      }

      socket.emit('inventory:update', { items: result.items! });
      socket.emit('player:stats', buildPlayerStatsPayload(player, { zeny: result.zeny! }));
    });

    // ─── Event: item:refine ─────────────────────────
    socket.on('item:refine', async (data) => {
      const player = gameState.getPlayer(characterId);
      if (!player || player.action === 'dead') return;

      const result = await refineItem(characterId, data.inventoryId, data.useProtection, player);

      socket.emit('notification', {
        type: result.success ? 'info' : result.destroyed ? 'error' : 'warning',
        message: result.success ? `Refine succeeded! Now +${result.newLevel}.` : result.error,
      });

      if (result.items) {
        socket.emit('inventory:update', { items: result.items });
        socket.emit('player:stats', buildPlayerStatsPayload(player, { zeny: result.zeny }));
      }
    });

    // ─── Event: item:socket ─────────────────────────
    socket.on('item:socket', async (data) => {
      const player = gameState.getPlayer(characterId);
      if (!player || player.action === 'dead') return;

      const result = await socketItem(characterId, data.inventoryId, data.socketType, data.socketIndex, data.cardInventoryId, player);
      if (!result.success) {
        socket.emit('notification', { type: 'warning', message: result.error || 'Cannot socket item' });
        return;
      }

      socket.emit('inventory:update', { items: result.items! });
      socket.emit('player:stats', buildPlayerStatsPayload(player));
    });

    // ─── Event: item:unsocket ───────────────────────
    socket.on('item:unsocket', async (data) => {
      const player = gameState.getPlayer(characterId);
      if (!player || player.action === 'dead') return;

      const result = await unsocketItem(characterId, data.inventoryId, data.socketType, data.socketIndex, player);
      if (!result.success) {
        socket.emit('notification', { type: 'warning', message: result.error || 'Cannot remove socket' });
        return;
      }

      socket.emit('inventory:update', { items: result.items! });
      socket.emit('player:stats', buildPlayerStatsPayload(player));
    });

    // ─── Event: shop:sell ───────────────────────────
    socket.on('shop:sell', async (data) => {
      const player = gameState.getPlayer(characterId);
      if (!player) return;

      const result = await sellItem(characterId, data.inventoryId, data.quantity, player.passiveBonus.shopSellPct);
      if (!result.success) {
        socket.emit('notification', { type: 'warning', message: result.error || 'Cannot sell' });
        return;
      }

      socket.emit('inventory:update', { items: result.items! });
      socket.emit('player:stats', buildPlayerStatsPayload(player, { zeny: result.zeny! }));
    });

    // ─── Event: skill:learn ─────────────────────────
    socket.on('skill:learn', async (data) => {
      const player = gameState.getPlayer(characterId);
      if (!player) return;

      const result = await learnSkill(characterId, data.skillId, player.class);
      if (!result.success) {
        socket.emit('notification', { type: 'warning', message: result.error || 'Cannot learn skill' });
        return;
      }

      recalcPassiveStats(player, result.skills!);
      socket.emit('skills:update', { skills: result.skills!, skillPoints: result.skillPoints! });
      socket.emit('notification', { type: 'info', message: 'Skill learned!' });
    });

    // ─── Event: skill:use ───────────────────────────
    socket.on('skill:use', (data) => {
      const player = gameState.getPlayer(characterId);
      if (!player || player.action === 'dead') return;

      // Find player's skill level
      const room = gameState.getRoom(player.mapName);
      // We need to look up skill level from DB or cache — for now use a simple approach
      // The skill level should ideally be cached in PlayerState, but for simplicity
      // we'll process it synchronously with a default level
      prisma.characterSkill.findFirst({
        where: { characterId, skillId: data.skillId },
      }).then((charSkill) => {
        if (!charSkill) {
          socket.emit('notification', { type: 'warning', message: 'You haven\'t learned this skill' });
          return;
        }

        const mapData = loadMap(player.mapName);
        const result = useSkill(player, data.skillId, charSkill.level, data.targetId, room.monsters, room.players, mapData ?? undefined);
        if (!result.success) {
          socket.emit('notification', { type: 'warning', message: result.error || 'Cannot use skill' });
          return;
        }

        // A nonzero (ASPD-scaled) cast time was scheduled — GameLoop resolves it and
        // broadcasts the result once casting completes; nothing to broadcast yet.
        if (result.casting) return;

        broadcastSkillResult(result, player, data.skillId, gameNamespace, room);
      }).catch((err) => {
        console.error('[Skill] Error:', err);
      });
    });

    // ─── Party events ───────────────────────────────
    socket.on('party:invite', (data) => {
      const player = gameState.getPlayer(characterId);
      if (!player) return;

      const target = findPlayerByName(data.targetName);
      if (!target) {
        socket.emit('notification', { type: 'warning', message: 'Player not found' });
        return;
      }

      const result = inviteToParty(characterId, target.characterId);
      if (!result.success) {
        socket.emit('notification', { type: 'warning', message: result.error! });
        return;
      }

      gameNamespace.sockets.get(target.socketId)?.emit('party:invited', { from: player.name });
      socket.emit('notification', { type: 'info', message: `Invited ${target.name} to party` });
    });

    socket.on('party:accept', () => {
      const result = acceptInvite(characterId);
      if (!result.success) {
        socket.emit('notification', { type: 'warning', message: result.error! });
        return;
      }

      // Broadcast party state to all members
      const state = getPartyState(result.partyId!);
      if (state) {
        for (const memberId of getPartyMemberIds(result.partyId!)) {
          const member = gameState.getPlayer(memberId);
          if (member) {
            gameNamespace.sockets.get(member.socketId)?.emit('party:update', state);
          }
        }
      }
    });

    socket.on('party:decline', () => {
      declineInvite(characterId);
    });

    socket.on('party:leave', () => {
      const result = leaveParty(characterId);
      socket.emit('party:update', null);

      if (result.partyId && !result.disbanded) {
        const state = getPartyState(result.partyId);
        for (const memberId of getPartyMemberIds(result.partyId)) {
          const member = gameState.getPlayer(memberId);
          if (member) {
            gameNamespace.sockets.get(member.socketId)?.emit('party:update', state);
          }
        }
      }
    });

    socket.on('party:kick', (data) => {
      const result = kickFromParty(characterId, data.targetId);
      if (!result.success) {
        socket.emit('notification', { type: 'warning', message: result.error! });
        return;
      }

      const kicked = gameState.getPlayer(data.targetId);
      if (kicked) {
        gameNamespace.sockets.get(kicked.socketId)?.emit('party:update', null);
        gameNamespace.sockets.get(kicked.socketId)?.emit('notification', { type: 'warning', message: 'You have been kicked from the party' });
      }

      const partyId = getPlayerPartyId(characterId);
      if (partyId) {
        const state = getPartyState(partyId);
        for (const memberId of getPartyMemberIds(partyId)) {
          const member = gameState.getPlayer(memberId);
          if (member) {
            gameNamespace.sockets.get(member.socketId)?.emit('party:update', state);
          }
        }
      }
    });

    // ─── Guild events ───────────────────────────────
    socket.on('guild:create', async (data) => {
      const result = await createGuild(characterId, data.guildName);
      if (!result.success) {
        socket.emit('notification', { type: 'warning', message: result.error! });
        return;
      }
      socket.emit('guild:update', result.guildState!);
      socket.emit('notification', { type: 'info', message: `Guild "${data.guildName}" created!` });
    });

    socket.on('guild:invite', async (data) => {
      const player = gameState.getPlayer(characterId);
      if (!player) return;

      const target = findPlayerByName(data.targetName);
      if (!target) {
        socket.emit('notification', { type: 'warning', message: 'Player not found' });
        return;
      }

      const guildId = await getPlayerGuildId(characterId);
      if (!guildId) {
        socket.emit('notification', { type: 'warning', message: 'You are not in a guild' });
        return;
      }

      inviteToGuild(characterId, player.name, target.characterId, guildId);
      const guild = await getGuildState(guildId);
      gameNamespace.sockets.get(target.socketId)?.emit('guild:invited', {
        from: player.name,
        guildName: guild?.guildName || '',
      });
      socket.emit('notification', { type: 'info', message: `Invited ${target.name} to guild` });
    });

    socket.on('guild:accept', async () => {
      const result = await acceptGuildInvite(characterId);
      if (!result.success) {
        socket.emit('notification', { type: 'warning', message: result.error! });
        return;
      }

      // Send guild state to all online members
      if (result.guildState) {
        for (const member of result.guildState.members) {
          const p = gameState.getPlayer(member.characterId);
          if (p) {
            gameNamespace.sockets.get(p.socketId)?.emit('guild:update', result.guildState);
          }
        }
      }
    });

    socket.on('guild:decline', () => {
      declineGuildInvite(characterId);
    });

    socket.on('guild:leave', async () => {
      const result = await leaveGuild(characterId);
      if (!result.success) {
        socket.emit('notification', { type: 'warning', message: result.error! });
        return;
      }

      socket.emit('guild:update', null);

      if (result.guildId && !result.disbanded) {
        const state = await getGuildState(result.guildId);
        if (state) {
          for (const member of state.members) {
            const p = gameState.getPlayer(member.characterId);
            if (p) {
              gameNamespace.sockets.get(p.socketId)?.emit('guild:update', state);
            }
          }
        }
      }
    });

    // ─── Event: stats:allocate ──────────────────────
    socket.on('stats:allocate', async (data) => {
      const player = gameState.getPlayer(characterId);
      if (!player || player.action === 'dead') return;

      const result = await allocateStatPoints(characterId, data);
      if (!result.success || !result.character) {
        socket.emit('notification', { type: 'warning', message: result.error || 'Cannot allocate stats' });
        return;
      }

      // Sync new stats into the authoritative in-memory state (combat uses these)
      const c = result.character;
      player.str = c.str;
      player.agi = c.agi;
      player.vit = c.vit;
      player.int = c.int;
      player.dex = c.dex;
      player.luk = c.luk;
      player.maxHp = c.maxHp;
      player.maxSp = c.maxSp;
      player.hp = Math.min(player.hp, c.maxHp);
      player.sp = Math.min(player.sp, c.maxSp);
      player.dirty = true;

      socket.emit('stats:update', {
        str: c.str, agi: c.agi, vit: c.vit, int: c.int, dex: c.dex, luk: c.luk,
        statPoints: c.statPoints,
      });
      socket.emit('player:stats', buildPlayerStatsPayload(player, { statPoints: c.statPoints }));
    });

    // ─── Event: player:respawn ──────────────────────
    socket.on('player:respawn', () => {
      const player = gameState.getPlayer(characterId);
      if (!player || player.action !== 'dead') return;

      // Revive at the save point (Prontera) with full HP/SP
      player.hp = player.maxHp;
      player.sp = player.maxSp;
      player.action = 'idle';
      player.attackTarget = null;
      player.moveAction = null;
      player.deathTimestamp = null;
      player.dirty = true;

      warpPlayer(player, 'prontera', STARTING_POS_X, STARTING_POS_Y, gameNamespace);

      socket.emit('player:stats', buildPlayerStatsPayload(player));
    });

    // ─── Event: npc:talk ────────────────────────────
    socket.on('npc:talk', async (data) => {
      const player = gameState.getPlayer(characterId);
      if (!player || player.action === 'dead') return;

      const currentMap = loadMap(player.mapName);
      const npc = currentMap?.npcPositions?.find((n) => n.id === data.npcId);
      if (!npc) return;

      const dist = Math.max(Math.abs(player.x - npc.x), Math.abs(player.y - npc.y));
      if (dist > NPC_TALK_RANGE) {
        socket.emit('notification', { type: 'warning', message: 'Too far away to talk' });
        return;
      }

      // Shop NPC → open shop window
      const shop = getShopData(data.npcId);
      if (shop) {
        socket.emit('shop:open', shop);
        return;
      }

      // Quest NPC → dialog with quest choices
      try {
        const quests = await getNpcQuestInfo(data.npcId, characterId, player.baseLevel);
        socket.emit('npc:dialog', {
          npcId: npc.id,
          npcName: npc.name,
          text: quests.length > 0
            ? 'Greetings, adventurer. The fields around Prontera grow more dangerous by the day. Care to lend a hand?'
            : 'Thank you for all your help, adventurer. The fields are safe... for now.',
          quests,
        });
      } catch (err) {
        console.error('[NPC] Dialog error:', err);
      }
    });

    // ─── Event: quest:accept ────────────────────────
    socket.on('quest:accept', async (data) => {
      const player = gameState.getPlayer(characterId);
      if (!player) return;

      const result = await acceptQuest(characterId, data.questId, player.baseLevel);
      if (!result.success) {
        socket.emit('notification', { type: 'warning', message: result.error! });
        return;
      }

      socket.emit('quests:update', { quests: result.quests! });
      socket.emit('notification', { type: 'info', message: 'Quest accepted!' });
    });

    // ─── Event: quest:complete ──────────────────────
    socket.on('quest:complete', async (data) => {
      const player = gameState.getPlayer(characterId);
      if (!player) return;

      const result = await completeQuest(characterId, data.questId, player);
      if (!result.success) {
        socket.emit('notification', { type: 'warning', message: result.error! });
        return;
      }

      socket.emit('quests:update', { quests: result.quests! });
      socket.emit('notification', { type: 'info', message: 'Quest complete! Rewards received.' });

      // Reward items changed the inventory
      const items = await loadInventory(characterId);
      socket.emit('inventory:update', { items });

      // Reward EXP/zeny changed stats
      socket.emit('player:stats', buildPlayerStatsPayload(player, { zeny: result.zeny! }));

      for (const lu of result.levelUps ?? []) {
        socket.emit('level:up', lu);
      }

      // Quest EXP can level up too — grant the points
      if (result.levelUps && result.levelUps.length > 0) {
        const points = await grantLevelUpPoints(player, result.levelUps);
        socket.emit('player:stats', buildPlayerStatsPayload(player, {
          statPoints: points.statPoints, skillPoints: points.skillPoints,
        }));
      }
    });

    // ─── Event: chat:send ───────────────────────────
    socket.on('chat:send', (data) => {
      const player = gameState.getPlayer(characterId);
      if (!player) return;

      const msg = {
        channel: data.channel,
        from: player.name,
        message: data.message.slice(0, 200),
        timestamp: Date.now(),
      };

      if (data.channel === 'all') {
        gameNamespace.to(`map:${player.mapName}`).emit('chat:message', msg);
      } else if (data.channel === 'party') {
        const partyId = getPlayerPartyId(characterId);
        if (partyId) {
          for (const memberId of getPartyMemberIds(partyId)) {
            const member = gameState.getPlayer(memberId);
            if (member) {
              gameNamespace.sockets.get(member.socketId)?.emit('chat:message', msg);
            }
          }
        }
      } else if (data.channel === 'guild') {
        getPlayerGuildId(characterId).then(async (guildId) => {
          if (!guildId) return;
          const guildState = await getGuildState(guildId);
          if (!guildState) return;
          for (const member of guildState.members) {
            const p = gameState.getPlayer(member.characterId);
            if (p) {
              gameNamespace.sockets.get(p.socketId)?.emit('chat:message', msg);
            }
          }
        });
      } else if (data.channel === 'whisper' && data.to) {
        const target = findPlayerByName(data.to);
        if (target) {
          gameNamespace.sockets.get(target.socketId)?.emit('chat:message', msg);
          socket.emit('chat:message', msg);
        }
      }
    });

    // ─── Disconnect ─────────────────────────────────
    socket.on('disconnect', async () => {
      const player = gameState.removePlayer(characterId);
      if (player) {
        await prisma.character.update({
          where: { id: characterId },
          data: {
            posX: player.x, posY: player.y, mapName: player.mapName,
            hp: player.hp, sp: player.sp,
            baseLevel: player.baseLevel, jobLevel: player.jobLevel,
            baseExp: player.baseExp, jobExp: player.jobExp,
          },
        }).catch((err) => console.error('[Socket] Save error:', err));

        socket.to(`map:${player.mapName}`).emit('player:leave', { playerId: characterId });
        socket.to(`map:${player.mapName}`).emit('notification', {
          type: 'info', message: `${player.name} left the map`,
        });

        console.log(`[Socket] ${player.name} disconnected`);
      }
    });
  });
}

// ─── Helpers ──────────────────────────────────────────

function findPlayerByName(name: string): PlayerState | null {
  for (const room of gameState.getActiveRooms()) {
    for (const player of room.players.values()) {
      if (player.name.toLowerCase() === name.toLowerCase()) return player;
    }
  }
  return null;
}

