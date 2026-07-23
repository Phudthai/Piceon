export type SocketType = 'CARD' | 'RUNE';

/** A card or rune socketed into an equipment item */
export interface ItemSocket {
  socketType: SocketType;
  socketIndex: number;
  cardItemId: number;
  name: string;
  cardStatBonus?: Partial<Record<'str' | 'agi' | 'vit' | 'int' | 'dex' | 'luk' | 'atk' | 'def' | 'matk' | 'mdef', number>>;
  runeSkillId?: number | null;
  runePercent?: number;
}

/** Client-facing inventory item (sent from server) */
export interface InventoryItem {
  inventoryId: string; // DB inventory row ID
  itemId: number;
  name: string;
  type: 'WEAPON' | 'ARMOR' | 'CONSUMABLE' | 'ETC' | 'CARD' | 'RUNE' | 'QUEST_ITEM';
  subtype?: string;
  description?: string;
  quantity: number;
  equipped: boolean;
  atk: number;
  def: number;
  matk: number;
  mdef: number;
  weight: number;
  price: number;
  sellPrice: number;
  equipSlot?: string;
  levelReq: number;
  /** Weapon attack range in tiles (Chebyshev distance); undefined/absent = melee range 1 */
  range?: number;
  /** Max card sockets this item has */
  cardSlots?: number;
  /** Max rune sockets this item has */
  runeSlots?: number;
  /** Current refine level (+N), weapons/armor only */
  refineLevel?: number;
  /** Cards/runes currently socketed into this item */
  sockets?: ItemSocket[];
  /** Stat bonus granted when this item is itself a CARD (unsocketed, in inventory) */
  cardStatBonus?: Partial<Record<'str' | 'agi' | 'vit' | 'int' | 'dex' | 'luk' | 'atk' | 'def', number>>;
  /** Skill-damage bonus when this item is itself a RUNE (unsocketed, in inventory) */
  runeSkillId?: number | null;
  runePercent?: number;
}

/** Equipment slots mapped to inventory item (null = empty) */
export interface EquipmentSlots {
  weapon: InventoryItem | null;
  offhand: InventoryItem | null;
  head: InventoryItem | null;
  body: InventoryItem | null;
  garment: InventoryItem | null;
  shoes: InventoryItem | null;
  accessory1: InventoryItem | null;
  accessory2: InventoryItem | null;
}

/** NPC shop item listing */
export interface ShopItem {
  itemId: number;
  name: string;
  type: string;
  description?: string;
  price: number;
  atk: number;
  def: number;
  matk: number;
}

/** NPC shop definition */
export interface ShopData {
  npcId: string;
  shopName: string;
  items: ShopItem[];
}
