/**
 * NPC Shop system.
 *
 * Shops are defined in data/shops/shops.json.
 * Each shop has a list of itemIds it sells, keyed by npcId.
 * Buy: player pays item.price * quantity, item added to inventory.
 * Sell: player gets item.sellPrice * quantity, item removed from inventory.
 */

import { prisma } from '../../db';
import type { ShopData, ShopItem, InventoryItem } from '@ro-game/shared';
import { loadInventory, addItemToInventory, calcInventoryWeight } from './inventory';

import shopDefs from '../../../../data/shops/shops.json';
import itemDefs from '../../../../data/items/items.json';

interface ShopDef {
  npcId: string;
  shopName: string;
  mapName: string;
  x: number;
  y: number;
  items: number[];
}

interface ItemDef {
  id: number;
  name: string;
  type: string;
  description?: string;
  price: number;
  sellPrice: number;
  weight?: number;
  atk?: number;
  def?: number;
  matk?: number;
}

const shopMap = new Map<string, ShopDef>();
for (const shop of shopDefs as ShopDef[]) {
  shopMap.set(shop.npcId, shop);
}

const itemMap = new Map<number, ItemDef>();
for (const item of itemDefs as ItemDef[]) {
  itemMap.set(item.id, item);
}

/** Get shop data to send to client */
export function getShopData(npcId: string): ShopData | null {
  const shop = shopMap.get(npcId);
  if (!shop) return null;

  const items: ShopItem[] = [];
  for (const itemId of shop.items) {
    const item = itemMap.get(itemId);
    if (!item) continue;
    items.push({
      itemId: item.id,
      name: item.name,
      type: item.type,
      description: item.description,
      price: item.price,
      atk: item.atk ?? 0,
      def: item.def ?? 0,
      matk: item.matk ?? 0,
    });
  }

  return { npcId: shop.npcId, shopName: shop.shopName, items };
}

/** Get all shops on a given map */
export function getShopsForMap(mapName: string): ShopDef[] {
  const shops: ShopDef[] = [];
  for (const shop of shopMap.values()) {
    if (shop.mapName === mapName) shops.push(shop);
  }
  return shops;
}

/** Buy an item from an NPC shop. `shopBuyPct`/`shopSellPct` come from the player's
 * learned Discount/Overcharge passives (negative = cheaper, positive = pricier) —
 * see server/src/game/systems/skills.ts recalcPassiveStats. */
export async function buyItem(
  characterId: string,
  npcId: string,
  itemId: number,
  quantity: number,
  shopBuyPct: number = 0,
  maxWeight: number = Infinity
): Promise<{ success: boolean; error?: string; items?: InventoryItem[]; zeny?: number }> {
  if (quantity < 1 || quantity > 99) {
    return { success: false, error: 'Invalid quantity' };
  }

  const shop = shopMap.get(npcId);
  if (!shop) return { success: false, error: 'Shop not found' };

  if (!shop.items.includes(itemId)) {
    return { success: false, error: 'Item not sold in this shop' };
  }

  const item = itemMap.get(itemId);
  if (!item) return { success: false, error: 'Item not found' };

  const addedWeight = (item.weight ?? 0) * quantity;
  if (addedWeight > 0) {
    const currentItems = await loadInventory(characterId);
    if (calcInventoryWeight(currentItems) + addedWeight > maxWeight) {
      return { success: false, error: 'Too heavy to carry' };
    }
  }

  const totalCost = Math.max(0, Math.round(item.price * quantity * (1 + shopBuyPct / 100)));

  // Check zeny
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: { zeny: true },
  });
  if (!character) return { success: false, error: 'Character not found' };
  if (character.zeny < totalCost) {
    return { success: false, error: `Not enough Zeny (need ${totalCost})` };
  }

  // Deduct zeny
  const updated = await prisma.character.update({
    where: { id: characterId },
    data: { zeny: character.zeny - totalCost },
    select: { zeny: true },
  });

  // Add items to inventory
  await addItemToInventory(characterId, itemId, quantity);

  const items = await loadInventory(characterId);
  return { success: true, items, zeny: updated.zeny };
}

/** Sell an item from inventory */
export async function sellItem(
  characterId: string,
  inventoryId: string,
  quantity: number,
  shopSellPct: number = 0
): Promise<{ success: boolean; error?: string; items?: InventoryItem[]; zeny?: number }> {
  if (quantity < 1) return { success: false, error: 'Invalid quantity' };

  const invRow = await prisma.inventory.findFirst({
    where: { id: inventoryId, characterId },
    include: { item: true },
  });

  if (!invRow) return { success: false, error: 'Item not found' };
  if (invRow.equipped) return { success: false, error: 'Unequip item before selling' };
  if (invRow.quantity < quantity) return { success: false, error: 'Not enough quantity' };

  const totalValue = Math.max(0, Math.round(invRow.item.sellPrice * quantity * (1 + shopSellPct / 100)));

  // Remove or decrease quantity
  if (invRow.quantity === quantity) {
    await prisma.inventory.delete({ where: { id: inventoryId } });
  } else {
    await prisma.inventory.update({
      where: { id: inventoryId },
      data: { quantity: invRow.quantity - quantity },
    });
  }

  // Add zeny
  const updated = await prisma.character.update({
    where: { id: characterId },
    data: { zeny: { increment: totalValue } },
    select: { zeny: true },
  });

  const items = await loadInventory(characterId);
  return { success: true, items, zeny: updated.zeny };
}
