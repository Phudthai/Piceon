// Character defaults
export const MAX_CHARACTERS = 3;
export const STARTING_STAT_POINTS = 10;
export const STARTING_ZENY = 500;
export const STARTING_LEVEL = 1;
export const BASE_STAT_VALUE = 1;
export const STARTING_HP = 40;
export const STARTING_MAX_HP = 40;
export const STARTING_SP = 10;
export const STARTING_MAX_SP = 10;
export const STARTING_MAP = 'prontera';
// Prontera is 40x40 — spawn just south of the central fountain
export const STARTING_POS_X = 20;
export const STARTING_POS_Y = 23;

// Auth
export const BCRYPT_ROUNDS = 12;
export const JWT_EXPIRY = '1h';
export const REFRESH_EXPIRY = '7d';
export const REFRESH_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// Game loop
export const TICK_RATE = 20;
export const TICK_INTERVAL_MS = 1000 / TICK_RATE; // 50ms

// Movement — client prediction and server must use the same speed,
// otherwise reconciliation snaps the player around
export const PLAYER_MOVE_INTERVAL_MS = 150; // ms per tile
export const PLAYER_MOVE_TICKS = PLAYER_MOVE_INTERVAL_MS / TICK_INTERVAL_MS; // 3 ticks per tile

/** Monster moveSpeed (from data/monsters/monsters.json) is a multiplier relative to the
 *  player's base pace — 1.0 walks at the same tick interval as an unbuffed player, 1.5
 *  is 50% faster, 0.5 is half as fast. Mirrors the AGI→ASPD tick-interval pattern. */
export function monsterMoveTicksForSpeed(moveSpeed: number): number {
  return Math.max(1, Math.round(PLAYER_MOVE_TICKS / moveSpeed));
}

// Combat formulas
export const CRIT_MULTIPLIER = 1.4;
export const MIN_HIT_RATE = 5;
export const MAX_HIT_RATE = 95;
export const BASE_HIT_RATE = 80;

// HP/SP formulas
export const HP_PER_LEVEL = 5;
export const HP_PER_VIT = 8;
export const HP_BASE = 35;
export const SP_PER_LEVEL = 2;
export const SP_PER_INT = 5;
export const SP_BASE = 10;

// EXP / leveling
export const MAX_BASE_LEVEL = 99;
export const MAX_JOB_LEVEL = 50;

/** Base EXP required to reach the given level */
export function baseExpRequired(level: number): number {
  return 9 * (level - 1) ** 2 + 20 * (level - 1);
}

/** Job EXP required to reach the given level */
export function jobExpRequired(level: number): number {
  return 5 * (level - 1) ** 2 + 15 * (level - 1);
}

// ASPD (attack speed) — RO-inspired diminishing-returns curve.
// Reference point: effAGI=1 maps to ASPD_BASE, which reproduces today's fixed
// 10-tick (500ms) attack cooldown exactly, so low-AGI balance is unchanged.
export const ASPD_BASE = 100; // ASPD at effective AGI = 1 (anchor)
export const ASPD_CAP = 190; // asymptotic ceiling, never fully reached
export const ASPD_DELAY_MS_AT_BASE = 500; // attack delay (ms) at ASPD_BASE
export const ASPD_DELAY_MS_AT_CAP = 150; // design target delay (ms) as ASPD nears ASPD_CAP
export const MIN_ATTACK_COOLDOWN_TICKS = 2; // hard floor: 100ms, given 50ms tick resolution
export const MIN_CAST_TIME_TICKS = 2; // same floor rationale, applied to scaled skill cast time

/** AGI -> ASPD, sqrt-based diminishing returns. Monotonic, concave, asymptotic to ASPD_CAP. */
export function calcAspd(effAgi: number): number {
  const agi = Math.max(1, effAgi);
  return ASPD_CAP - (ASPD_CAP - ASPD_BASE) / Math.sqrt(agi);
}

/** ASPD -> attack delay in ms, linear between the two calibration points. */
function aspdToDelayMs(aspd: number): number {
  const slope = (ASPD_DELAY_MS_AT_BASE - ASPD_DELAY_MS_AT_CAP) / (ASPD_CAP - ASPD_BASE);
  return ASPD_DELAY_MS_AT_BASE - slope * (aspd - ASPD_BASE);
}

/** Effective AGI -> attack cooldown in ticks (what GameLoop assigns to player.attackCooldown). */
export function attackCooldownTicksForAgi(effAgi: number): number {
  const delayMs = aspdToDelayMs(calcAspd(effAgi));
  return Math.max(MIN_ATTACK_COOLDOWN_TICKS, Math.round(delayMs / TICK_INTERVAL_MS));
}

/** Effective AGI -> continuous speed multiplier (1.0 at AGI=1), used to scale skill castTime. */
export function aspdCastSpeedFactor(effAgi: number): number {
  const delayMs = aspdToDelayMs(calcAspd(effAgi));
  return ASPD_DELAY_MS_AT_BASE / delayMs;
}

/** Skill castTime (seconds) -> scaled cast ticks, gated by MIN_CAST_TIME_TICKS.
 *  castTime === 0 skills stay instant (returns 0). */
export function scaledCastTicks(castTimeSeconds: number, effAgi: number): number {
  if (castTimeSeconds <= 0) return 0;
  const ticks = Math.round((castTimeSeconds * TICK_RATE) / aspdCastSpeedFactor(effAgi));
  return Math.max(MIN_CAST_TIME_TICKS, ticks);
}
