/**
 * Item enhancement system: refine (+N), and card/rune socketing.
 *
 * Refine: success chance decreases each level (100/90/80/70% for +1..+4, then
 * 60/50/40/30/20/10% for +5..+10). No destruction risk below +5. At +5 and
 * above, a failed attempt destroys the item unless a Blessed Charm is
 * consumed to protect it (protection only prevents destruction, it does not
 * guarantee success).
 *
 * Sockets: CARD items grant a flat stat/atk/def bonus; RUNE items grant a
 * skill-damage percent bonus (either global or targeting one specific skill).
 * Both are consumed permanently when socketed — removing a socket destroys
 * the card/rune (no safe-removal tool in this version).
 */

import { prisma } from '../../db';
import type { InventoryItem } from '@ro-game/shared';
import type { PlayerState } from '../GameState';
import { loadInventory, recalcEquipStats } from './inventory';

const ENCHANT_STONE_ITEM_ID = 22;
const BLESSED_CHARM_ITEM_ID = 23;
const MAX_REFINE_LEVEL = 10;
const BREAK_RISK_LEVEL = 5;
const ZENY_COST_PER_LEVEL = 500;
const STONE_COST_PER_LEVEL = 1;

const REFINE_SUCCESS_RATE: Record<number, number> = {
  1: 100, 2: 90, 3: 80, 4: 70,
  5: 60, 6: 50, 7: 40, 8: 30, 9: 20, 10: 10,
};

type RefineResult =
  | { success: true; error?: undefined; newLevel: number; items: InventoryItem[]; zeny: number }
  | { success: false; error: string; destroyed?: boolean; items?: InventoryItem[]; zeny?: number };

/** Attempt to refine an equipment item by one level */
export async function refineItem(
  characterId: string,
  inventoryId: string,
  useProtection: boolean,
  player: PlayerState
): Promise<RefineResult> {
  const invRow = await prisma.inventory.findFirst({
    where: { id: inventoryId, characterId },
    include: { item: true },
  });
  if (!invRow) return { success: false, error: 'Item not found' };
  if (invRow.item.type !== 'WEAPON' && invRow.item.type !== 'ARMOR') {
    return { success: false, error: 'Only weapons and armor can be refined' };
  }

  const targetLevel = invRow.refineLevel + 1;
  if (targetLevel > MAX_REFINE_LEVEL) {
    return { success: false, error: `Already at max refine (+${MAX_REFINE_LEVEL})` };
  }

  const zenyCost = targetLevel * ZENY_COST_PER_LEVEL;
  const stoneCost = targetLevel * STONE_COST_PER_LEVEL;
  const risky = targetLevel >= BREAK_RISK_LEVEL;

  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { zeny: true },
  });
  if (!character || character.zeny < zenyCost) {
    return { success: false, error: `Not enough Zeny (need ${zenyCost})` };
  }

  const stoneRow = await prisma.inventory.findFirst({
    where: { characterId, itemId: ENCHANT_STONE_ITEM_ID, equipped: false },
  });
  if (!stoneRow || stoneRow.quantity < stoneCost) {
    return { success: false, error: `Not enough Enchant Stones (need ${stoneCost})` };
  }

  let charmRow: { id: string; quantity: number } | null = null;
  if (risky && useProtection) {
    charmRow = await prisma.inventory.findFirst({
      where: { characterId, itemId: BLESSED_CHARM_ITEM_ID, equipped: false },
      select: { id: true, quantity: true },
    });
    if (!charmRow) {
      return { success: false, error: 'No Blessed Charm to protect this attempt' };
    }
  }

  // Consume zeny + stones (+ charm, if protecting) up front — refine materials are spent on any attempt
  const zenyAfter = character.zeny - zenyCost;
  await prisma.character.update({ where: { id: characterId }, data: { zeny: zenyAfter } });
  await consumeItem(stoneRow.id, stoneRow.quantity, stoneCost);
  if (charmRow) await consumeItem(charmRow.id, charmRow.quantity, 1);

  const roll = Math.random() * 100;
  // Upgrade Weapon (Merchant passive) adds a flat bonus to the base success rate
  const successRate = Math.min(100, (REFINE_SUCCESS_RATE[targetLevel] ?? 10) + player.passiveBonus.refineSuccessPct);
  const succeeded = roll < successRate;

  if (succeeded) {
    await prisma.inventory.update({ where: { id: inventoryId }, data: { refineLevel: targetLevel } });
    const items = await loadInventory(characterId);
    recalcEquipStats(player, items);
    return { success: true, newLevel: targetLevel, items, zeny: zenyAfter };
  }

  if (risky && !useProtection) {
    // Destroyed — the Inventory row (and any sockets on it) are gone
    await prisma.inventory.delete({ where: { id: inventoryId } });
    const items = await loadInventory(characterId);
    recalcEquipStats(player, items);
    return { success: false, error: 'Refine failed — the item was destroyed', destroyed: true, items, zeny: zenyAfter };
  }

  const items = await loadInventory(characterId);
  return { success: false, error: 'Refine failed', destroyed: false, items, zeny: zenyAfter };
}

async function consumeItem(inventoryId: string, currentQuantity: number, amount: number): Promise<void> {
  if (currentQuantity <= amount) {
    await prisma.inventory.delete({ where: { id: inventoryId } });
  } else {
    await prisma.inventory.update({ where: { id: inventoryId }, data: { quantity: currentQuantity - amount } });
  }
}

/** Socket a card/rune from inventory into an empty slot on an equipment item. `socketType`
 * is explicit from the client request (not inferred from index) so a CARD can never land
 * in a rune-designated slot or vice versa — card and rune sockets are independent pools. */
export async function socketItem(
  characterId: string,
  inventoryId: string,
  socketType: 'CARD' | 'RUNE',
  socketIndex: number,
  cardInventoryId: string,
  player: PlayerState
): Promise<{ success: boolean; error?: string; items?: InventoryItem[] }> {
  const targetRow = await prisma.inventory.findFirst({
    where: { id: inventoryId, characterId },
    include: { item: true, sockets: true },
  });
  if (!targetRow) return { success: false, error: 'Item not found' };

  const maxSlots = socketType === 'CARD' ? targetRow.item.cardSlots : targetRow.item.runeSlots;
  if (socketIndex < 0 || socketIndex >= maxSlots) {
    return { success: false, error: `Invalid ${socketType.toLowerCase()} socket slot` };
  }
  if (targetRow.sockets.some((s) => s.socketType === socketType && s.socketIndex === socketIndex)) {
    return { success: false, error: 'Slot already filled' };
  }

  const cardRow = await prisma.inventory.findFirst({
    where: { id: cardInventoryId, characterId },
    include: { item: true },
  });
  if (!cardRow) return { success: false, error: 'Card/rune not found' };
  if (cardRow.item.type !== socketType) {
    return { success: false, error: `Only ${socketType === 'CARD' ? 'cards' : 'runes'} can be socketed here` };
  }

  await prisma.inventorySocket.create({
    data: { inventoryId, socketType, socketIndex, cardItemId: cardRow.itemId },
  });
  await consumeItem(cardRow.id, cardRow.quantity, 1);

  const items = await loadInventory(characterId);
  recalcEquipStats(player, items);
  return { success: true, items };
}

/** Remove a card/rune from a socket — the card/rune is destroyed on removal */
export async function unsocketItem(
  characterId: string,
  inventoryId: string,
  socketType: 'CARD' | 'RUNE',
  socketIndex: number,
  player: PlayerState
): Promise<{ success: boolean; error?: string; items?: InventoryItem[] }> {
  const targetRow = await prisma.inventory.findFirst({
    where: { id: inventoryId, characterId },
  });
  if (!targetRow) return { success: false, error: 'Item not found' };

  const socket = await prisma.inventorySocket.findFirst({
    where: { inventoryId, socketType, socketIndex },
  });
  if (!socket) return { success: false, error: 'Slot is empty' };

  await prisma.inventorySocket.delete({ where: { id: socket.id } });

  const items = await loadInventory(characterId);
  recalcEquipStats(player, items);
  return { success: true, items };
}
