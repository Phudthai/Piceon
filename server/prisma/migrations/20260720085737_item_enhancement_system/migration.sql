-- AlterEnum
ALTER TYPE "ItemType" ADD VALUE 'RUNE';

-- AlterTable
ALTER TABLE "inventory" ADD COLUMN     "refine_level" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "items" ADD COLUMN     "card_stat_bonus" JSONB,
ADD COLUMN     "range" INTEGER,
ADD COLUMN     "rune_percent" INTEGER,
ADD COLUMN     "rune_skill_id" INTEGER;

-- CreateTable
CREATE TABLE "inventory_sockets" (
    "id" TEXT NOT NULL,
    "inventory_id" TEXT NOT NULL,
    "socket_index" INTEGER NOT NULL,
    "card_item_id" INTEGER NOT NULL,

    CONSTRAINT "inventory_sockets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "inventory_sockets_inventory_id_socket_index_key" ON "inventory_sockets"("inventory_id", "socket_index");

-- AddForeignKey
ALTER TABLE "inventory_sockets" ADD CONSTRAINT "inventory_sockets_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "inventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_sockets" ADD CONSTRAINT "inventory_sockets_card_item_id_fkey" FOREIGN KEY ("card_item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
