import { Graphics } from 'pixi.js';
import type { AttackEffect } from './AttackEffect';

/** A short arc swipe near the target, oriented from attacker toward target */
export class MeleeSlashEffect implements AttackEffect {
  public view: Graphics;
  public done = false;
  private lifetime = 0;
  private readonly DURATION = 250;

  constructor(fromX: number, fromY: number, toX: number, toY: number, color: number = 0xf1f1f1) {
    const angle = Math.atan2(toY - fromY, toX - fromX);

    this.view = new Graphics();
    this.view.arc(0, 0, 18, -0.9, 0.9);
    this.view.stroke({ width: 4, color, alpha: 0.9 });
    this.view.x = toX;
    this.view.y = toY - 16;
    this.view.rotation = angle;
  }

  update(deltaMS: number): void {
    this.lifetime += deltaMS;
    const progress = this.lifetime / this.DURATION;
    this.view.alpha = Math.max(0, 1 - progress);
    this.view.scale.set(1 + progress * 0.4);
    if (progress >= 1) this.done = true;
  }

  destroy(): void {
    this.view.destroy();
  }
}
