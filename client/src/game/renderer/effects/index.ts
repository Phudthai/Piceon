import type { CombatResult } from '@ro-game/shared';
import type { AttackEffect } from './AttackEffect';
import { MeleeSlashEffect } from './MeleeSlashEffect';
import { ProjectileEffect } from './ProjectileEffect';
import { ArrowEffect } from './ArrowEffect';
import { DebuffPuffEffect } from './DebuffPuffEffect';
import { HolySparkleEffect } from './HolySparkleEffect';

export type { AttackEffect } from './AttackEffect';

export interface EffectSpec {
  kind: 'slash' | 'projectile' | 'arrow' | 'puff' | 'sparkle' | 'default';
  color?: number;
}

/** Skill id → effect spec (see data/skills/*.json for the authoritative id ranges) */
const SKILL_EFFECTS: Record<number, EffectSpec> = {
  // Swordsman (100-119)
  100: { kind: 'slash' }, // Bash
  101: { kind: 'slash' }, // Magnum Break
  102: { kind: 'puff' }, // Provoke
  104: { kind: 'slash' }, // Cleave
  // Mage (200-219)
  200: { kind: 'projectile', color: 0xff5500 }, // Fire Bolt
  201: { kind: 'projectile', color: 0x33ccff }, // Cold Bolt
  202: { kind: 'puff' }, // Frost Diver
  204: { kind: 'projectile', color: 0xf5e642 }, // Lightning Bolt
  205: { kind: 'projectile', color: 0xffffff }, // Soul Strike
  206: { kind: 'projectile', color: 0x8855ff }, // Arcane Missile
  207: { kind: 'projectile', color: 0xff5500 }, // Sightrasher
  208: { kind: 'projectile', color: 0xff5500 }, // Napalm Beat
  209: { kind: 'projectile', color: 0xff7700 }, // Fire Ball
  210: { kind: 'projectile', color: 0xf5e642 }, // Thunder Storm
  // Archer (300-319)
  300: { kind: 'arrow' }, // Double Strafe
  301: { kind: 'arrow' }, // Arrow Shower
  304: { kind: 'arrow' }, // Aimed Shot
  305: { kind: 'arrow' }, // Snipe
  306: { kind: 'arrow' }, // Quick Draw
  307: { kind: 'arrow' }, // Falcon Assault
  308: { kind: 'arrow' }, // Multiple Shot
  309: { kind: 'arrow' }, // Rain of Arrows
  // Thief (400-419)
  401: { kind: 'slash' }, // Envenom
  404: { kind: 'slash' }, // Backstab
  405: { kind: 'slash' }, // Sonic Blow
  406: { kind: 'slash' }, // Raid
  407: { kind: 'slash' }, // Grimtooth
  408: { kind: 'puff' }, // Venom Splasher
  // Acolyte (500-519)
  501: { kind: 'sparkle' }, // Blessing
  502: { kind: 'sparkle' }, // Increase AGI
  503: { kind: 'sparkle' }, // Angelus
  504: { kind: 'sparkle' }, // Holy Light
  505: { kind: 'sparkle' }, // Turn Undead
  // Merchant (600-619)
  600: { kind: 'slash' }, // Mammonite
  604: { kind: 'slash' }, // Cart Revolution
};

/** Fallback effect for basic (no-skillId) attacks, keyed by attacker class */
const CLASS_DEFAULT_EFFECTS: Record<string, EffectSpec> = {
  SWORDSMAN: { kind: 'slash' },
  KNIGHT: { kind: 'slash' },
  THIEF: { kind: 'slash' },
  ASSASSIN: { kind: 'slash' },
  MERCHANT: { kind: 'slash' },
  BLACKSMITH: { kind: 'slash' },
  ARCHER: { kind: 'arrow' },
  HUNTER: { kind: 'arrow' },
  MAGE: { kind: 'projectile', color: 0x8855ff },
  WIZARD: { kind: 'projectile', color: 0x8855ff },
  ACOLYTE: { kind: 'sparkle' },
  PRIEST: { kind: 'sparkle' },
};

/** Picks which visual effect to render for a combat result, by skillId first, then attacker class */
export function resolveEffect(result: CombatResult, attackerClass: string): EffectSpec {
  if (result.skillId != null) {
    const spec = SKILL_EFFECTS[result.skillId];
    if (spec) return spec;
  }
  return CLASS_DEFAULT_EFFECTS[attackerClass] ?? { kind: 'default' };
}

export function createAttackEffect(
  spec: EffectSpec,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): AttackEffect {
  switch (spec.kind) {
    case 'slash':
      return new MeleeSlashEffect(fromX, fromY, toX, toY);
    case 'projectile':
      return new ProjectileEffect(fromX, fromY, toX, toY, spec.color);
    case 'arrow':
      return new ArrowEffect(fromX, fromY, toX, toY);
    case 'puff':
      return new DebuffPuffEffect(toX, toY);
    case 'sparkle':
      return new HolySparkleEffect(toX, toY);
    default:
      return new DebuffPuffEffect(toX, toY, 0xcccccc, 1);
  }
}
