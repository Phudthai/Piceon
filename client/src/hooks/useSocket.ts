'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents, InventoryItem, ShopData, PlayerSkill, PartyState, GuildState, PlayerQuest, NpcDialog, BaseStats } from '@ro-game/shared';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3002';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface UseSocketOptions {
  characterId: string;
  onStateDelta?: (data: Parameters<ServerToClientEvents['state:delta']>[0]) => void;
  onChatMessage?: (data: Parameters<ServerToClientEvents['chat:message']>[0]) => void;
  onNotification?: (data: Parameters<ServerToClientEvents['notification']>[0]) => void;
  onLevelUp?: (data: Parameters<ServerToClientEvents['level:up']>[0]) => void;
  onCombatResult?: (data: Parameters<ServerToClientEvents['combat:result']>[0]) => void;
  onPlayerStats?: (data: Parameters<ServerToClientEvents['player:stats']>[0]) => void;
  onMonsterDie?: (data: Parameters<ServerToClientEvents['monster:die']>[0]) => void;
  onItemDropped?: (data: Parameters<ServerToClientEvents['item:dropped']>[0]) => void;
  onItemPicked?: (data: Parameters<ServerToClientEvents['item:picked']>[0]) => void;
  onInventoryLoad?: (data: { items: InventoryItem[] }) => void;
  onInventoryUpdate?: (data: { items: InventoryItem[] }) => void;
  onShopOpen?: (data: ShopData) => void;
  onSkillsLoad?: (data: { skills: PlayerSkill[]; skillPoints: number }) => void;
  onSkillsUpdate?: (data: { skills: PlayerSkill[]; skillPoints: number }) => void;
  onPartyUpdate?: (data: PartyState | null) => void;
  onPartyInvited?: (data: { from: string }) => void;
  onGuildUpdate?: (data: GuildState | null) => void;
  onGuildInvited?: (data: { from: string; guildName: string }) => void;
  onQuestsLoad?: (data: { quests: PlayerQuest[] }) => void;
  onQuestsUpdate?: (data: { quests: PlayerQuest[] }) => void;
  onNpcDialog?: (data: NpcDialog) => void;
  onMapChange?: (data: { mapName: string; x: number; y: number }) => void;
  onPlayerLeave?: (data: { playerId: string }) => void;
  onPlayerDead?: () => void;
  onStatsUpdate?: (data: BaseStats & { statPoints: number }) => void;
}

export function useSocket(options: UseSocketOptions) {
  const socketRef = useRef<GameSocket | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || !options.characterId) return;

    const socket: GameSocket = io(`${SOCKET_URL}/game`, {
      auth: { token, characterId: options.characterId },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected');
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err.message);
    });

    // Register event handlers
    if (options.onStateDelta) socket.on('state:delta', options.onStateDelta);
    if (options.onChatMessage) socket.on('chat:message', options.onChatMessage);
    if (options.onNotification) socket.on('notification', options.onNotification);
    if (options.onLevelUp) socket.on('level:up', options.onLevelUp);
    if (options.onCombatResult) socket.on('combat:result', options.onCombatResult);
    if (options.onPlayerStats) socket.on('player:stats', options.onPlayerStats);
    if (options.onMonsterDie) socket.on('monster:die', options.onMonsterDie);
    if (options.onItemDropped) socket.on('item:dropped', options.onItemDropped);
    if (options.onItemPicked) socket.on('item:picked', options.onItemPicked);
    if (options.onInventoryLoad) socket.on('inventory:load', options.onInventoryLoad);
    if (options.onInventoryUpdate) socket.on('inventory:update', options.onInventoryUpdate);
    if (options.onShopOpen) socket.on('shop:open', options.onShopOpen);
    if (options.onSkillsLoad) socket.on('skills:load', options.onSkillsLoad);
    if (options.onSkillsUpdate) socket.on('skills:update', options.onSkillsUpdate);
    if (options.onPartyUpdate) socket.on('party:update', options.onPartyUpdate);
    if (options.onPartyInvited) socket.on('party:invited', options.onPartyInvited);
    if (options.onGuildUpdate) socket.on('guild:update', options.onGuildUpdate);
    if (options.onGuildInvited) socket.on('guild:invited', options.onGuildInvited);
    if (options.onQuestsLoad) socket.on('quests:load', options.onQuestsLoad);
    if (options.onQuestsUpdate) socket.on('quests:update', options.onQuestsUpdate);
    if (options.onNpcDialog) socket.on('npc:dialog', options.onNpcDialog);
    if (options.onMapChange) socket.on('map:change', options.onMapChange);
    if (options.onPlayerLeave) socket.on('player:leave', options.onPlayerLeave);
    if (options.onPlayerDead) socket.on('player:dead', options.onPlayerDead);
    if (options.onStatsUpdate) socket.on('stats:update', options.onStatsUpdate);

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [options.characterId]);

  const sendMove = useCallback((targetX: number, targetY: number) => {
    socketRef.current?.emit('player:move', { targetX, targetY });
  }, []);

  const sendChat = useCallback((channel: 'all' | 'party' | 'guild' | 'whisper', message: string, to?: string) => {
    socketRef.current?.emit('chat:send', { channel, message, to });
  }, []);

  const sendAttack = useCallback((targetId: string) => {
    socketRef.current?.emit('player:attack', { targetId });
  }, []);

  const sendPickup = useCallback((dropId: string) => {
    socketRef.current?.emit('item:pickup', { dropId });
  }, []);

  const sendEquip = useCallback((inventoryId: string) => {
    socketRef.current?.emit('item:equip', { inventoryId });
  }, []);

  const sendUnequip = useCallback((inventoryId: string) => {
    socketRef.current?.emit('item:unequip', { inventoryId });
  }, []);

  const sendUseItem = useCallback((inventoryId: string) => {
    socketRef.current?.emit('item:use', { inventoryId });
  }, []);

  const sendShopBuy = useCallback((npcId: string, itemId: number, quantity: number) => {
    socketRef.current?.emit('shop:buy', { npcId, itemId, quantity });
  }, []);

  const sendShopSell = useCallback((inventoryId: string, quantity: number) => {
    socketRef.current?.emit('shop:sell', { inventoryId, quantity });
  }, []);

  const sendRefineItem = useCallback((inventoryId: string, useProtection: boolean) => {
    socketRef.current?.emit('item:refine', { inventoryId, useProtection });
  }, []);

  const sendSocketItem = useCallback((inventoryId: string, socketType: 'CARD' | 'RUNE', socketIndex: number, cardInventoryId: string) => {
    socketRef.current?.emit('item:socket', { inventoryId, socketType, socketIndex, cardInventoryId });
  }, []);

  const sendUnsocketItem = useCallback((inventoryId: string, socketType: 'CARD' | 'RUNE', socketIndex: number) => {
    socketRef.current?.emit('item:unsocket', { inventoryId, socketType, socketIndex });
  }, []);

  const sendLearnSkill = useCallback((skillId: number) => {
    socketRef.current?.emit('skill:learn', { skillId });
  }, []);

  const sendUseSkill = useCallback((skillId: number, targetId?: string) => {
    socketRef.current?.emit('skill:use', { skillId, targetId });
  }, []);

  const sendRespawn = useCallback(() => {
    socketRef.current?.emit('player:respawn');
  }, []);

  const sendAllocateStats = useCallback((alloc: BaseStats) => {
    socketRef.current?.emit('stats:allocate', alloc);
  }, []);

  const sendNpcTalk = useCallback((npcId: string) => {
    socketRef.current?.emit('npc:talk', { npcId });
  }, []);

  const sendQuestAccept = useCallback((questId: number) => {
    socketRef.current?.emit('quest:accept', { questId });
  }, []);

  const sendQuestComplete = useCallback((questId: number) => {
    socketRef.current?.emit('quest:complete', { questId });
  }, []);

  const sendPartyInvite = useCallback((targetName: string) => {
    socketRef.current?.emit('party:invite', { targetName });
  }, []);

  const sendPartyAccept = useCallback(() => {
    socketRef.current?.emit('party:accept');
  }, []);

  const sendPartyDecline = useCallback(() => {
    socketRef.current?.emit('party:decline');
  }, []);

  const sendPartyLeave = useCallback(() => {
    socketRef.current?.emit('party:leave');
  }, []);

  const sendPartyKick = useCallback((targetId: string) => {
    socketRef.current?.emit('party:kick', { targetId });
  }, []);

  const sendGuildCreate = useCallback((guildName: string) => {
    socketRef.current?.emit('guild:create', { guildName });
  }, []);

  const sendGuildInvite = useCallback((targetName: string) => {
    socketRef.current?.emit('guild:invite', { targetName });
  }, []);

  const sendGuildAccept = useCallback(() => {
    socketRef.current?.emit('guild:accept');
  }, []);

  const sendGuildDecline = useCallback(() => {
    socketRef.current?.emit('guild:decline');
  }, []);

  const sendGuildLeave = useCallback(() => {
    socketRef.current?.emit('guild:leave');
  }, []);

  return {
    sendMove, sendChat, sendAttack, sendPickup,
    sendEquip, sendUnequip, sendUseItem,
    sendShopBuy, sendShopSell,
    sendRefineItem, sendSocketItem, sendUnsocketItem,
    sendLearnSkill, sendUseSkill,
    sendNpcTalk, sendQuestAccept, sendQuestComplete, sendRespawn, sendAllocateStats,
    sendPartyInvite, sendPartyAccept, sendPartyDecline, sendPartyLeave, sendPartyKick,
    sendGuildCreate, sendGuildInvite, sendGuildAccept, sendGuildDecline, sendGuildLeave,
    socket: socketRef,
  };
}
