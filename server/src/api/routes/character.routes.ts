import { Router, Request, Response } from 'express';
import {
  MAX_CHARACTERS,
  STARTING_STAT_POINTS,
  STARTING_ZENY,
  STARTING_HP,
  STARTING_MAX_HP,
  STARTING_SP,
  STARTING_MAX_SP,
  STARTING_MAP,
  STARTING_POS_X,
  STARTING_POS_Y,
} from '@ro-game/shared';
import { prisma } from '../../db';
import { verifyJWT } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createCharacterSchema, spendStatPointsSchema } from '../validators/character.validator';
import { allocateStatPoints } from '../../game/systems/stats';
import { grantStarterKit } from '../../game/systems/starterKit';

const router: ReturnType<typeof Router> = Router();

// All routes require auth
router.use(verifyJWT);

// GET /characters — list user's characters
router.get('/', async (req: Request, res: Response) => {
  try {
    const characters = await prisma.character.findMany({
      where: { userId: req.user!.userId },
      select: {
        id: true,
        name: true,
        class: true,
        baseLevel: true,
        jobLevel: true,
      },
    });
    res.json(characters);
  } catch (err) {
    console.error('[Character] List error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /characters — create character
router.post('/', validate(createCharacterSchema), async (req: Request, res: Response) => {
  try {
    const { name, class: charClass } = req.body;

    const count = await prisma.character.count({
      where: { userId: req.user!.userId },
    });

    if (count >= MAX_CHARACTERS) {
      res.status(400).json({ error: `Maximum ${MAX_CHARACTERS} characters allowed` });
      return;
    }

    const existingName = await prisma.character.findUnique({ where: { name } });
    if (existingName) {
      res.status(409).json({ error: 'Character name is already taken' });
      return;
    }

    const character = await prisma.character.create({
      data: {
        userId: req.user!.userId,
        name,
        class: charClass,
        statPoints: STARTING_STAT_POINTS,
        zeny: STARTING_ZENY,
        hp: STARTING_HP,
        maxHp: STARTING_MAX_HP,
        sp: STARTING_SP,
        maxSp: STARTING_MAX_SP,
        mapName: STARTING_MAP,
        posX: STARTING_POS_X,
        posY: STARTING_POS_Y,
      },
    });

    await grantStarterKit(character.id, character.class);

    res.status(201).json(character);
  } catch (err) {
    console.error('[Character] Create error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /characters/:id — get full character data
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const characterId = req.params.id as string;
    const character = await prisma.character.findFirst({
      where: {
        id: characterId,
        userId: req.user!.userId,
      },
      include: {
        inventory: { include: { item: true } },
        characterSkills: { include: { skill: true } },
      },
    });

    if (!character) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    res.json(character);
  } catch (err) {
    console.error('[Character] Get error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /characters/:id/stats — spend stat points
router.put('/:id/stats', validate(spendStatPointsSchema), async (req: Request, res: Response) => {
  try {
    const { str, agi, vit, int, dex, luk } = req.body;
    const characterId = req.params.id as string;

    // Ownership check (allocateStatPoints itself is user-agnostic)
    const owned = await prisma.character.findFirst({
      where: { id: characterId, userId: req.user!.userId },
      select: { id: true },
    });
    if (!owned) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    const result = await allocateStatPoints(characterId, { str, agi, vit, int, dex, luk });
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }

    res.json(result.character);
  } catch (err) {
    console.error('[Character] Stat update error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
