/**
 * Starter kit: armor/garment/shoes + a class-appropriate weapon, granted pre-equipped
 * to a character at creation time so new players aren't stuck barehanded (see: Archer
 * without a bow doing 1 damage forever — DEX only matters once a ranged weapon is worn).
 */

import type { CharacterClass } from '@prisma/client';
import { prisma } from '../../db';

const STARTER_ARMOR_ITEM_ID = 200; // Cotton Shirt (body)
const STARTER_GARMENT_ITEM_ID = 203; // Hood
const STARTER_SHOES_ITEM_ID = 202; // Sandals

/** Only the 6 classes selectable at character creation need an entry — 2nd job
 * classes (KNIGHT, WIZARD, ...) are reached via job change, keeping whatever
 * weapon the player already has equipped. */
const STARTER_WEAPON_BY_CLASS: Partial<Record<CharacterClass, number>> = {
  SWORDSMAN: 102, // Sword
  MAGE: 103, // Rod
  ARCHER: 104, // Bow
  THIEF: 100, // Knife
  ACOLYTE: 106, // Mace
  MERCHANT: 107, // Axe
};

/** Grants a freshly created character its starter kit, all pre-equipped. Called once,
 * right after the Character row is created — never call this on an existing character. */
export async function grantStarterKit(characterId: string, characterClass: CharacterClass): Promise<void> {
  const weaponItemId = STARTER_WEAPON_BY_CLASS[characterClass];
  const itemIds = [STARTER_ARMOR_ITEM_ID, STARTER_GARMENT_ITEM_ID, STARTER_SHOES_ITEM_ID, weaponItemId].filter(
    (id): id is number => id != null
  );

  await prisma.inventory.createMany({
    data: itemIds.map((itemId) => ({ characterId, itemId, quantity: 1, equipped: true })),
  });
}
