import { Graphics } from 'pixi.js';
import type { AttackEffect } from './AttackEffect';

/** A thin fast streak from attacker to target — no arc, shorter travel time than ProjectileEffect */
export class ArrowEffect implements AttackEffect {
  public view: Graphics;
  public done = false;
  private lifetime = 0;
  private readonly DURATION = 150;
  private readonly fromX: number;
  private readonly fromY: number;
  private readonly toX: number;
  private readonly toY: number;

  constructor(fromX: number, fromY: number, toX: number, toY: number) {
    this.fromX = fromX;
    this.fromY = fromY - 16;
    this.toX = toX;
    this.toY = toY - 16;
    const angle = Math.atan2(this.toY - this.fromY, this.toX - this.fromX);

    this.view = new Graphics();
    this.view.moveTo(-8, 0).lineTo(8, 0);
    this.view.stroke({ width: 2, color: 0xd4c07a, alpha: 0.95 });
    this.view.x = this.fromX;
    this.view.y = this.fromY;
    this.view.rotation = angle;
  }

  update(deltaMS: number): void {
    this.lifetime += deltaMS;
    const progress = Math.min(1, this.lifetime / this.DURATION);
    this.view.x = this.fromX + (this.toX - this.fromX) * progress;
    this.view.y = this.fromY + (this.toY - this.fromY) * progress;
    if (progress >= 1) this.done = true;
  }

  destroy(): void {
    this.view.destroy();
  }
}
