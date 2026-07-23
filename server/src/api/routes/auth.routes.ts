import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { BCRYPT_ROUNDS } from '@ro-game/shared';
import { prisma, setRefreshToken, getRefreshToken, deleteRefreshToken } from '../../db';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, verifyJWT } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { registerSchema, loginSchema, refreshSchema } from '../validators/auth.validator';

const router: ReturnType<typeof Router> = Router();

// POST /auth/register
router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, username, password } = req.body;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existing) {
      const field = existing.email === email ? 'email' : 'username';
      res.status(409).json({ error: `This ${field} is already taken` });
      return;
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
      data: { email, username, passwordHash },
    });

    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id });

    await setRefreshToken(user.id, refreshToken);

    res.status(201).json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, username: user.username },
    });
  } catch (err) {
    console.error('[Auth] Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/login
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const accessToken = generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({ userId: user.id });

    await setRefreshToken(user.id, refreshToken);

    res.json({
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, username: user.username },
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /auth/refresh
router.post('/refresh', validate(refreshSchema), async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    const payload = verifyRefreshToken(refreshToken);
    const stored = await getRefreshToken(payload.userId);

    if (!stored || stored !== refreshToken) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const newAccessToken = generateAccessToken({ userId: user.id, email: user.email });
    const newRefreshToken = generateRefreshToken({ userId: user.id });

    await setRefreshToken(user.id, newRefreshToken);

    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
  } catch {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// POST /auth/logout
router.post('/logout', verifyJWT, async (req: Request, res: Response) => {
  try {
    await deleteRefreshToken(req.user!.userId);
    res.status(204).send();
  } catch (err) {
    console.error('[Auth] Logout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
