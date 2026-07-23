/**
 * Inventory & Equipment system.
 *
 * Handles:
 * - Loading inventory from DB → InventoryItem[]
 * - Equip/unequip with stat recalculation
 * - Use consumable items (HP/SP restore)
 * - Item stacking for pickups
 */

import { prisma } from '../../db';
import type { InventoryItem, EquipmentSlots } from '@ro-game/shared';
import { HP_BASE, HP_PER_LEVEL, HP_PER_VIT, SP_BASE, SP_PER_LEVEL, SP_PER_INT } from '@ro-game/shared';
import type { PlayerState } from '../GameState';
import { BASE_MAX_WEIGHT } from '../GameState';

/** Total carried weight (quantity * item weight, all rows including equipped) */
export function calcInventoryWeight(items: InventoryItem[]): number {
  return items.reduce((sum, item) => sum + item.weight * item.quantity, 0);
}

/** Load full inventory for a character from DB, joined with item data */
export async function loadInventory(characterId: string): Promise<InventoryItem[]> {
  const rows = await prisma.inventory.findMany({
    where: { characterId },
    include: { item: true, sockets: { include: { cardItem: true } } },
  });

  return rows.map((row) => ({
    inventoryId: row.id,
    itemId: row.item.id,
    name: row.item.name,
    type: row.item.type as InventoryItem['type'],
    subtype: row.item.subtype ?? undefined,
    description: row.item.description ?? undefined,
    quantity: row.quantity,
    equipped: row.equipped,
    atk: row.item.atk,
    def: row.item.def,
    matk: row.item.matk,
    mdef: row.item.mdef,
    weight: row.item.weight,
    price: row.item.price,
    sellPrice: row.item.sellPrice,
    equipSlot: row.item.equipSlot ?? undefined,
    levelReq: row.item.levelReq,
    range: row.item.range ?? undefined,
    cardSlots: row.item.cardSlots || undefined,
    runeSlots: row.item.runeSlots || undefined,
    refineLevel: row.refineLevel || undefined,
    sockets: row.sockets.length > 0
      ? row.sockets.map((s) => ({
          socketType: s.socketType,
          socketIndex: s.socketIndex,
          cardItemId: s.cardItemId,
          name: s.cardItem.name,
          cardStatBonus: (s.cardItem.cardStatBonus as InventoryItem['cardStatBonus']) ?? undefined,
          runeSkillId: s.cardItem.runeSkillId ?? undefined,
          runePercent: s.cardItem.runePercent ?? undefined,
        }))
      : undefined,
    cardStatBonus: (row.item.cardStatBonus as InventoryItem['cardStatBonus']) ?? undefined,
    runeSkillId: row.item.runeSkillId ?? undefined,
    runePercent: row.item.runePercent ?? undefined,
  }));
}

/** Get equipment slots from inventory */
export function getEquipmentSlots(items: InventoryItem[]): EquipmentSlots {
  const slots: EquipmentSlots = {
    weapon: null,
    offhand: null,
    head: null,
    body: null,
    garment: null,
    shoes: null,
    accessory1: null,
    accessory2: null,
  };

  for (const item of items) {
    if (!item.equipped || !item.equipSlot) continue;
    const slot = item.equipSlot as keyof EquipmentSlots;
    if (slot in slots) {
      slots[slot] = item;
    }
  }

  return slots;
}

/** Equip an item — returns updated inventory items or error message */
export async function equipItem(
  characterId: string,
  inventoryId: string,
  player: PlayerState
): Promise<{ success: boolean; error?: string; items?: InventoryItem[] }> {
  const invRow = await prisma.inventory.findFirst({
    where: { id: inventoryId, characterId },
    include: { item: true },
  });

  if (!invRow) return { success: false, error: 'Item not found in inventory' };
  if (invRow.equipped) return { success: false, error: 'Item already equipped' };
  if (!invRow.item.equipSlot) return { success: false, error: 'This item cannot be equipped' };
  if (invRow.item.type !== 'WEAPON' && invRow.item.type !== 'ARMOR') {
    return { success: false, error: 'This item cannot be equipped' };
  }
  if (player.baseLevel < invRow.item.levelReq) {
    return { success: false, error: `Required level: ${invRow.item.levelReq}` };
  }

  const slot = invRow.item.equipSlot;

  // Unequip current item in that slot (if any)
  await prisma.inventory.updateMany({
    where: { characterId, equipped: true, item: { equipSlot: slot } },
    data: { equipped: false },
  });

  // Equip new item
  await prisma.inventory.update({
    where: { id: inventoryId },
    data: { equipped: true },
  });

  // Reload and recalculate
  const items = await loadInventory(characterId);
  recalcEquipStats(player, items);

  return { success: true, items };
}

/** Unequip an item */
export async function unequipItem(
  characterId: string,
  inventoryId: string,
  player: PlayerState
): Promise<{ success: boolean; error?: string; items?: InventoryItem[] }> {
  const invRow = await prisma.inventory.findFirst({
    where: { id: inventoryId, characterId },
  });

  if (!invRow) return { success: false, error: 'Item not found' };
  if (!invRow.equipped) return { success: false, error: 'Item is not equipped' };

  await prisma.inventory.update({
    where: { id: inventoryId },
    data: { equipped: false },
  });

  const items = await loadInventory(characterId);
  recalcEquipStats(player, items);

  return { success: true, items };
}

/** Use a consumable item (HP/SP potions, etc.) */
export async function useItem(
  characterId: string,
  inventoryId: string,
  player: PlayerState
): Promise<{ success: boolean; error?: string; items?: InventoryItem[] }> {
  const invRow = await prisma.inventory.findFirst({
    where: { id: inventoryId, characterId },
    include: { item: true },
  });

  if (!invRow) return { success: false, error: 'Item not found' };
  if (invRow.item.type !== 'CONSUMABLE') return { success: false, error: 'Cannot use this item' };
  if (player.action === 'dead') return { success: false, error: 'Cannot use items while dead' };

  // Apply consumable effect (description-based HP restore for now)
  const hpMatch = invRow.item.description?.match(/Restores (\d+) HP/);
  const spMatch = invRow.item.description?.match(/Restores (\d+) SP/);

  if (hpMatch) {
    const restoreAmount = parseInt(hpMatch[1], 10);
    player.hp = Math.min(player.hp + restoreAmount, player.maxHp);
    player.dirty = true;
  }
  if (spMatch) {
    const restoreAmount = parseInt(spMatch[1], 10);
    player.sp = Math.min(player.sp + restoreAmount, player.maxSp);
    player.dirty = true;
  }

  // Decrease quantity or remove
  if (invRow.quantity > 1) {
    await prisma.inventory.update({
      where: { id: inventoryId },
      data: { quantity: invRow.quantity - 1 },
    });
  } else {
    await prisma.inventory.delete({ where: { id: inventoryId } });
  }

  const items = await loadInventory(characterId);
  return { success: true, items };
}

/** Add item to inventory (stacking if possible) */
export async function addItemToInventory(
  characterId: string,
  itemId: number,
  quantity: number
): Promise<void> {
  // Try to stack with existing non-equipped entry
  const existing = await prisma.inventory.findFirst({
    where: { characterId, itemId, equipped: false },
  });

  if (existing) {
    await prisma.inventory.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    await prisma.inventory.create({
      data: { characterId, itemId, quantity },
    });
  }
}

const REFINE_ATK_PER_LEVEL = 2;
const REFINE_DEF_PER_LEVEL = 1;

/** Recalculate player stats from equipped items — weapon ATK/range, armor DEF, refine
 * bonuses, and socketed card/rune bonuses (stat/ATK/DEF and skill-damage%) */
export function recalcEquipStats(player: PlayerState, items: InventoryItem[]): void {
  let weaponAtk = 0;
  let weaponRange = 1;
  let armorDef = 0;
  let weaponMatk = 0;
  let armorMdef = 0;
  let bonusStr = 0;
  let bonusAgi = 0;
  let bonusVit = 0;
  let bonusInt = 0;
  let bonusDex = 0;
  let bonusLuk = 0;
  let skillBonusAll = 0;
  const skillBonusById: Record<number, number> = {};

  for (const item of items) {
    if (!item.equipped) continue;

    if (item.type === 'WEAPON') {
      weaponAtk += item.atk + (item.refineLevel ?? 0) * REFINE_ATK_PER_LEVEL;
      weaponRange = item.range ?? 1;
      weaponMatk += item.matk;
    } else if (item.type === 'ARMOR') {
      armorDef += item.def + (item.refineLevel ?? 0) * REFINE_DEF_PER_LEVEL;
      armorMdef += item.mdef;
    }

    for (const socket of item.sockets ?? []) {
      const stat = socket.cardStatBonus;
      if (stat) {
        bonusStr += stat.str ?? 0;
        bonusAgi += stat.agi ?? 0;
        bonusVit += stat.vit ?? 0;
        bonusInt += stat.int ?? 0;
        bonusDex += stat.dex ?? 0;
        bonusLuk += stat.luk ?? 0;
        weaponAtk += stat.atk ?? 0;
        armorDef += stat.def ?? 0;
        weaponMatk += stat.matk ?? 0;
        armorMdef += stat.mdef ?? 0;
      }
      if (socket.runePercent) {
        if (socket.runeSkillId == null) {
          skillBonusAll += socket.runePercent;
        } else {
          skillBonusById[socket.runeSkillId] = (skillBonusById[socket.runeSkillId] ?? 0) + socket.runePercent;
        }
      }
    }
  }

  player.weaponAtk = weaponAtk;
  player.weaponRange = weaponRange;
  player.armorDef = armorDef;
  player.weaponMatk = weaponMatk;
  player.armorMdef = armorMdef;
  player.bonusStr = bonusStr;
  player.bonusAgi = bonusAgi;
  player.bonusVit = bonusVit;
  player.bonusInt = bonusInt;
  player.bonusDex = bonusDex;
  player.bonusLuk = bonusLuk;
  player.skillDamageBonus = { all: skillBonusAll, bySkillId: skillBonusById };

  // Recalculate HP/SP (VIT/INT bonuses from cards feed in here too)
  player.maxHp = HP_BASE + player.baseLevel * HP_PER_LEVEL + (player.vit + bonusVit) * HP_PER_VIT;
  player.maxSp = SP_BASE + player.baseLevel * SP_PER_LEVEL + (player.int + bonusInt) * SP_PER_INT;
  player.hp = Math.min(player.hp, player.maxHp);
  player.sp = Math.min(player.sp, player.maxSp);
  player.currentWeight = calcInventoryWeight(items);
  player.maxWeight = BASE_MAX_WEIGHT + player.passiveBonus.weight;
  player.dirty = true;
}
