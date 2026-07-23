import type { Container } from 'pixi.js';

/** Common shape for all hand-rolled attack effects — mirrors DamageText's update/done/destroy lifecycle */
export interface AttackEffect {
  view: Container;
  done: boolean;
  update(deltaMS: number): void;
  destroy(): void;
}
