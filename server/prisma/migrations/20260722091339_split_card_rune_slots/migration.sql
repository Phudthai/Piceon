-- Split the single generic "slots" pool on items into independent cardSlots/runeSlots
-- pools, and tag each InventorySocket row with which pool it belongs to.

-- 1. Add the new item columns, backfill from the old "slots" column (preserves current
--    total capacity as all-card, since runes are the newer mechanic and nothing should
--    lose sockets), then drop "slots".
ALTER TABLE "items" ADD COLUMN "card_slots" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "items" ADD COLUMN "rune_slots" INTEGER NOT NULL DEFAULT 0;
UPDATE "items" SET "card_slots" = "slots";
ALTER TABLE "items" DROP COLUMN "slots";

-- 2. Add the SocketType enum + column to inventory_sockets, backfill from the socketed
--    item's own type (CARD/RUNE), then enforce NOT NULL.
CREATE TYPE "SocketType" AS ENUM ('CARD', 'RUNE');
ALTER TABLE "inventory_sockets" ADD COLUMN "socket_type" "SocketType";
UPDATE "inventory_sockets" AS s
SET "socket_type" = i."type"::text::"SocketType"
FROM "items" AS i
WHERE i.id = s."card_item_id";
ALTER TABLE "inventory_sockets" ALTER COLUMN "socket_type" SET NOT NULL;

-- 3. Replace the flat (inventory_id, socket_index) unique index with one scoped per
--    socket type, so card-slot-0 and rune-slot-0 can coexist as distinct rows.
DROP INDEX "inventory_sockets_inventory_id_socket_index_key";
CREATE UNIQUE INDEX "inventory_sockets_inventory_id_socket_type_socket_index_key" ON "inventory_sockets"("inventory_id", "socket_type", "socket_index");
