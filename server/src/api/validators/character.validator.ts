import { z } from 'zod';

export const createCharacterSchema = z.object({
  name: z
    .string()
    .min(3, 'Name must be at least 3 characters')
    .max(24, 'Name must be at most 24 characters')
    .regex(/^[a-zA-Z0-9 _-]+$/, 'Name can only contain letters, numbers, spaces, hyphens, and underscores'),
  class: z.enum(['SWORDSMAN', 'MAGE', 'ARCHER', 'THIEF', 'ACOLYTE', 'MERCHANT'], {
    message: 'Choose one of the 6 starting classes',
  }),
});

export const spendStatPointsSchema = z
  .object({
    str: z.number().int().min(0).optional().default(0),
    agi: z.number().int().min(0).optional().default(0),
    vit: z.number().int().min(0).optional().default(0),
    int: z.number().int().min(0).optional().default(0),
    dex: z.number().int().min(0).optional().default(0),
    luk: z.number().int().min(0).optional().default(0),
  })
  .refine(
    (data) => data.str + data.agi + data.vit + data.int + data.dex + data.luk > 0,
    { message: 'Must spend at least 1 stat point' }
  );
