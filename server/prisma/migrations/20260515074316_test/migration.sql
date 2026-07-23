-- CreateEnum
CREATE TYPE "CharacterClass" AS ENUM ('NOVICE', 'SWORDSMAN', 'MAGE', 'ARCHER', 'THIEF', 'ACOLYTE', 'MERCHANT', 'KNIGHT', 'WIZARD', 'HUNTER', 'ASSASSIN', 'PRIEST', 'BLACKSMITH');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('WEAPON', 'ARMOR', 'CARD', 'CONSUMABLE', 'QUEST_ITEM', 'ETC');

-- CreateEnum
CREATE TYPE "SkillType" AS ENUM ('ACTIVE', 'PASSIVE', 'BUFF', 'DEBUFF', 'HEAL');

-- CreateEnum
CREATE TYPE "GuildRank" AS ENUM ('LEADER', 'OFFICER', 'MEMBER');

-- CreateEnum
CREATE TYPE "MonsterAI" AS ENUM ('PASSIVE', 'AGGRESSIVE', 'ASSIST', 'BOSS');

-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "characters" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "class" "CharacterClass" NOT NULL DEFAULT 'NOVICE',
    "base_level" INTEGER NOT NULL DEFAULT 1,
    "job_level" INTEGER NOT NULL DEFAULT 1,
    "base_exp" INTEGER NOT NULL DEFAULT 0,
    "job_exp" INTEGER NOT NULL DEFAULT 0,
    "str" INTEGER NOT NULL DEFAULT 1,
    "agi" INTEGER NOT NULL DEFAULT 1,
    "vit" INTEGER NOT NULL DEFAULT 1,
    "int" INTEGER NOT NULL DEFAULT 1,
    "dex" INTEGER NOT NULL DEFAULT 1,
    "luk" INTEGER NOT NULL DEFAULT 1,
    "hp" INTEGER NOT NULL DEFAULT 40,
    "max_hp" INTEGER NOT NULL DEFAULT 40,
    "sp" INTEGER NOT NULL DEFAULT 10,
    "max_sp" INTEGER NOT NULL DEFAULT 10,
    "stat_points" INTEGER NOT NULL DEFAULT 10,
    "skill_points" INTEGER NOT NULL DEFAULT 0,
    "zeny" INTEGER NOT NULL DEFAULT 500,
    "map_name" TEXT NOT NULL DEFAULT 'prontera',
    "pos_x" DOUBLE PRECISION NOT NULL DEFAULT 150,
    "pos_y" DOUBLE PRECISION NOT NULL DEFAULT 150,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "items" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ItemType" NOT NULL,
    "subtype" TEXT,
    "description" TEXT,
    "atk" INTEGER NOT NULL DEFAULT 0,
    "def" INTEGER NOT NULL DEFAULT 0,
    "matk" INTEGER NOT NULL DEFAULT 0,
    "mdef" INTEGER NOT NULL DEFAULT 0,
    "slots" INTEGER NOT NULL DEFAULT 0,
    "weight" INTEGER NOT NULL DEFAULT 0,
    "price" INTEGER NOT NULL DEFAULT 0,
    "sell_price" INTEGER NOT NULL DEFAULT 0,
    "level_req" INTEGER NOT NULL DEFAULT 1,
    "equip_slot" TEXT,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "item_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "slot" INTEGER,
    "equipped" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SkillType" NOT NULL,
    "max_level" INTEGER NOT NULL DEFAULT 10,
    "target_type" TEXT NOT NULL DEFAULT 'single',
    "damage_formula" TEXT,
    "sp_cost" INTEGER NOT NULL DEFAULT 0,
    "cooldown" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cast_time" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "range" INTEGER NOT NULL DEFAULT 1,
    "class_required" "CharacterClass",
    "description" TEXT,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_skills" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "skill_id" INTEGER NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "character_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guilds" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leader_id" TEXT NOT NULL,
    "emblem" TEXT,
    "castle_id" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guilds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_members" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "rank" "GuildRank" NOT NULL DEFAULT 'MEMBER',
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guild_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maps" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "data_file" TEXT NOT NULL,

    CONSTRAINT "maps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monster_definitions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "hp" INTEGER NOT NULL DEFAULT 100,
    "sp" INTEGER NOT NULL DEFAULT 0,
    "atk" INTEGER NOT NULL DEFAULT 10,
    "def" INTEGER NOT NULL DEFAULT 0,
    "matk" INTEGER NOT NULL DEFAULT 0,
    "mdef" INTEGER NOT NULL DEFAULT 0,
    "move_speed" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "attack_range" INTEGER NOT NULL DEFAULT 1,
    "ai_type" "MonsterAI" NOT NULL DEFAULT 'PASSIVE',
    "base_exp" INTEGER NOT NULL DEFAULT 10,
    "job_exp" INTEGER NOT NULL DEFAULT 5,
    "respawn_time" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "monster_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monster_drops" (
    "id" SERIAL NOT NULL,
    "monster_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    "rate" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "monster_drops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monster_spawns" (
    "id" SERIAL NOT NULL,
    "map_id" INTEGER NOT NULL,
    "monster_id" INTEGER NOT NULL,
    "max_count" INTEGER NOT NULL DEFAULT 5,
    "area_x1" INTEGER NOT NULL DEFAULT 0,
    "area_y1" INTEGER NOT NULL DEFAULT 0,
    "area_x2" INTEGER NOT NULL DEFAULT 100,
    "area_y2" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "monster_spawns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warp_points" (
    "id" SERIAL NOT NULL,
    "map_id" INTEGER NOT NULL,
    "from_x" INTEGER NOT NULL,
    "from_y" INTEGER NOT NULL,
    "to_map" TEXT NOT NULL,
    "to_x" INTEGER NOT NULL,
    "to_y" INTEGER NOT NULL,

    CONSTRAINT "warp_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quests" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level_req" INTEGER NOT NULL DEFAULT 1,
    "objectives" JSONB NOT NULL,
    "rewards" JSONB NOT NULL,

    CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "character_quests" (
    "id" TEXT NOT NULL,
    "character_id" TEXT NOT NULL,
    "quest_id" INTEGER NOT NULL,
    "status" "QuestStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "progress" JSONB NOT NULL DEFAULT '{}',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "character_quests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "characters_name_key" ON "characters"("name");

-- CreateIndex
CREATE INDEX "characters_user_id_idx" ON "characters"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "items_name_key" ON "items"("name");

-- CreateIndex
CREATE INDEX "inventory_character_id_idx" ON "inventory"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_character_id_item_id_slot_key" ON "inventory"("character_id", "item_id", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "character_skills_character_id_skill_id_key" ON "character_skills"("character_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "guilds_name_key" ON "guilds"("name");

-- CreateIndex
CREATE UNIQUE INDEX "guild_members_character_id_key" ON "guild_members"("character_id");

-- CreateIndex
CREATE UNIQUE INDEX "maps_name_key" ON "maps"("name");

-- CreateIndex
CREATE UNIQUE INDEX "monster_definitions_name_key" ON "monster_definitions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "monster_drops_monster_id_item_id_key" ON "monster_drops"("monster_id", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "quests_name_key" ON "quests"("name");

-- CreateIndex
CREATE UNIQUE INDEX "character_quests_character_id_quest_id_key" ON "character_quests"("character_id", "quest_id");

-- AddForeignKey
ALTER TABLE "characters" ADD CONSTRAINT "characters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_skills" ADD CONSTRAINT "character_skills_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_skills" ADD CONSTRAINT "character_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monster_drops" ADD CONSTRAINT "monster_drops_monster_id_fkey" FOREIGN KEY ("monster_id") REFERENCES "monster_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monster_drops" ADD CONSTRAINT "monster_drops_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monster_spawns" ADD CONSTRAINT "monster_spawns_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "maps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monster_spawns" ADD CONSTRAINT "monster_spawns_monster_id_fkey" FOREIGN KEY ("monster_id") REFERENCES "monster_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "warp_points" ADD CONSTRAINT "warp_points_map_id_fkey" FOREIGN KEY ("map_id") REFERENCES "maps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_quests" ADD CONSTRAINT "character_quests_character_id_fkey" FOREIGN KEY ("character_id") REFERENCES "characters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "character_quests" ADD CONSTRAINT "character_quests_quest_id_fkey" FOREIGN KEY ("quest_id") REFERENCES "quests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
