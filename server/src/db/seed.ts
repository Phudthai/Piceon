import { PrismaClient, type CharacterClass } from '@prisma/client';
import bcrypt from 'bcrypt';
import fs from 'fs';
import path from 'path';
import { BCRYPT_ROUNDS } from '@ro-game/shared';

const prisma = new PrismaClient();
const dataDir = path.resolve(__dirname, '../../../data');

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(path.join(dataDir, filePath), 'utf-8'));
}

async function main() {
  console.log('Seeding database...');

  // Seed Items
  const items = readJson<Array<Record<string, unknown>>>('items/items.json');
  for (const item of items) {
    const fields = {
      name: item.name as string,
      type: item.type as 'WEAPON' | 'ARMOR' | 'CARD' | 'RUNE' | 'CONSUMABLE' | 'QUEST_ITEM' | 'ETC',
      subtype: (item.subtype as string) || null,
      description: (item.description as string) || null,
      atk: (item.atk as number) || 0,
      def: (item.def as number) || 0,
      matk: (item.matk as number) || 0,
      mdef: (item.mdef as number) || 0,
      cardSlots: (item.cardSlots as number) || 0,
      runeSlots: (item.runeSlots as number) || 0,
      weight: (item.weight as number) || 0,
      price: (item.price as number) || 0,
      sellPrice: (item.sellPrice as number) || 0,
      levelReq: (item.levelReq as number) || 1,
      equipSlot: (item.equipSlot as string) || null,
      range: (item.range as number) ?? null,
      cardStatBonus: (item.cardStatBonus as object) ?? undefined,
      runeSkillId: (item.runeSkillId as number) ?? null,
      runePercent: (item.runePercent as number) ?? null,
    };
    await prisma.item.upsert({
      where: { id: item.id as number },
      update: fields,
      create: { id: item.id as number, ...fields },
    });
  }
  console.log(`  Seeded ${items.length} items`);

  // Seed Monsters
  const monsters = readJson<Array<Record<string, unknown>>>('monsters/monsters.json');
  for (const mon of monsters) {
    const monFields = {
      name: mon.name as string,
      displayName: mon.displayName as string,
      level: mon.level as number,
      hp: mon.hp as number,
      sp: (mon.sp as number) || 0,
      atk: mon.atk as number,
      def: (mon.def as number) || 0,
      matk: (mon.matk as number) || 0,
      mdef: (mon.mdef as number) || 0,
      moveSpeed: mon.moveSpeed as number,
      attackRange: mon.attackRange as number,
      aiType: mon.aiType as 'PASSIVE' | 'AGGRESSIVE' | 'ASSIST' | 'BOSS',
      baseExp: mon.baseExp as number,
      jobExp: mon.jobExp as number,
      respawnTime: mon.respawnTime as number,
      zenyMin: (mon.zenyMin as number) || 0,
      zenyMax: (mon.zenyMax as number) || 0,
    };
    await prisma.monsterDefinition.upsert({
      where: { id: mon.id as number },
      update: monFields,
      create: { id: mon.id as number, ...monFields },
    });

    // Seed drops
    const drops = (mon.drops as Array<{ itemId: number; rate: number }>) || [];
    for (const drop of drops) {
      await prisma.monsterDrop.upsert({
        where: { monsterId_itemId: { monsterId: mon.id as number, itemId: drop.itemId } },
        update: { rate: drop.rate },
        create: { monsterId: mon.id as number, itemId: drop.itemId, rate: drop.rate },
      });
    }
  }
  console.log(`  Seeded ${monsters.length} monsters with drops`);

  // Seed Maps
  const mapFiles = ['maps/prontera.json', 'maps/prt_fild01.json', 'maps/prt_fild02.json', 'maps/prt_fild03.json'];
  for (const file of mapFiles) {
    const mapData = readJson<Record<string, unknown>>(file);
    const map = await prisma.mapDefinition.upsert({
      where: { name: mapData.name as string },
      update: {},
      create: {
        name: mapData.name as string,
        displayName: mapData.displayName as string,
        width: mapData.width as number,
        height: mapData.height as number,
        dataFile: file,
      },
    });

    // Seed warp points
    const warps = (mapData.warpPoints as Array<Record<string, unknown>>) || [];
    for (const warp of warps) {
      const existing = await prisma.warpPoint.findFirst({
        where: { mapId: map.id, fromX: warp.fromX as number, fromY: warp.fromY as number },
      });
      if (!existing) {
        await prisma.warpPoint.create({
          data: {
            mapId: map.id,
            fromX: warp.fromX as number,
            fromY: warp.fromY as number,
            toMap: warp.toMap as string,
            toX: warp.toX as number,
            toY: warp.toY as number,
          },
        });
      }
    }

    // Seed monster spawns
    const spawns = (mapData.monsterSpawns as Array<Record<string, unknown>>) || [];
    for (const spawn of spawns) {
      const existing = await prisma.monsterSpawn.findFirst({
        where: { mapId: map.id, monsterId: spawn.monsterId as number },
      });
      if (!existing) {
        await prisma.monsterSpawn.create({
          data: {
            mapId: map.id,
            monsterId: spawn.monsterId as number,
            maxCount: spawn.maxCount as number,
            areaX1: (spawn.areaX1 as number) || 0,
            areaY1: (spawn.areaY1 as number) || 0,
            areaX2: (spawn.areaX2 as number) || 100,
            areaY2: (spawn.areaY2 as number) || 100,
          },
        });
      }
    }
  }
  console.log(`  Seeded ${mapFiles.length} maps`);

  // Seed Skills
  const skillFiles = [
    'skills/universal.json', 'skills/swordsman.json', 'skills/mage.json', 'skills/archer.json',
    'skills/thief.json', 'skills/acolyte.json', 'skills/merchant.json',
  ];
  let skillCount = 0;
  for (const file of skillFiles) {
    const skills = readJson<Array<Record<string, unknown>>>(file);
    for (const skill of skills) {
      const fields = {
        name: skill.name as string,
        type: skill.type as 'ACTIVE' | 'PASSIVE' | 'BUFF' | 'DEBUFF' | 'HEAL',
        maxLevel: skill.maxLevel as number,
        targetType: skill.targetType as string,
        spCost: (skill.spCost as number) || 0,
        cooldown: (skill.cooldown as number) || 0,
        castTime: (skill.castTime as number) || 0,
        range: (skill.range as number) || 0,
        classRequired: (skill.classRequired as CharacterClass) || null,
        description: (skill.description as string) || null,
      };
      await prisma.skill.upsert({
        where: { id: skill.id as number },
        update: fields,
        create: { id: skill.id as number, ...fields },
      });
      skillCount++;
    }
  }
  console.log(`  Seeded ${skillCount} skills`);

  // Seed Quests
  const quests = readJson<Array<Record<string, unknown>>>('quests/quests.json');
  for (const quest of quests) {
    await prisma.quest.upsert({
      where: { id: quest.id as number },
      update: {
        objectives: quest.objectives as object[],
        rewards: quest.rewards as object,
      },
      create: {
        id: quest.id as number,
        name: quest.name as string,
        description: (quest.description as string) || null,
        levelReq: (quest.levelReq as number) || 1,
        objectives: quest.objectives as object[],
        rewards: quest.rewards as object,
      },
    });
  }
  console.log(`  Seeded ${quests.length} quests`);

  // Seed test user (dev only) — login: test@test.com / test1234
  // No character is created here — characters are made through the normal
  // character-creation flow (client or POST /api/characters) after logging in.
  const passwordHash = await bcrypt.hash('test1234', BCRYPT_ROUNDS);
  await prisma.user.upsert({
    where: { email: 'test@test.com' },
    update: {},
    create: { email: 'test@test.com', username: 'testuser', passwordHash },
  });
  console.log('  Seeded test user: test@test.com / test1234 (no character)');

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    // grantStarterKit (via ../game/systems/starterKit) transitively imports the shared
    // db module, which opens a persistent ioredis connection as a module-load side
    // effect — without an explicit exit, that open socket keeps this script's process
    // alive indefinitely after main() finishes.
    process.exit(0);
  });
