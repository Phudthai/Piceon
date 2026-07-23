import Redis from 'ioredis';
import { REFRESH_TTL_SECONDS } from '@ro-game/shared';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl);

redis.on('connect', () => {
  console.log('[Redis] Connected');
});

redis.on('error', (err) => {
  console.error('[Redis] Error:', err.message);
});

// ─── Refresh Token Helpers ──────────────────────────

export async function setRefreshToken(userId: string, token: string): Promise<void> {
  await redis.set(`refresh_token:${userId}`, token, 'EX', REFRESH_TTL_SECONDS);
}

export async function getRefreshToken(userId: string): Promise<string | null> {
  return redis.get(`refresh_token:${userId}`);
}

export async function deleteRefreshToken(userId: string): Promise<void> {
  await redis.del(`refresh_token:${userId}`);
}

// ─── Player Session Helpers ─────────────────────────

export async function setPlayerSession(characterId: string, data: object, ttl: number = 3600): Promise<void> {
  await redis.set(`session:${characterId}`, JSON.stringify(data), 'EX', ttl);
}

export async function getPlayerSession(characterId: string): Promise<object | null> {
  const raw = await redis.get(`session:${characterId}`);
  return raw ? JSON.parse(raw) : null;
}

export async function deletePlayerSession(characterId: string): Promise<void> {
  await redis.del(`session:${characterId}`);
}
