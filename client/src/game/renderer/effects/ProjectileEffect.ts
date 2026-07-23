import { Graphics } from 'pixi.js';
import type { AttackEffect } from './AttackEffect';

/** A colored bolt that travels from the attacker to the target, then flashes on arrival */
export class ProjectileEffect implements AttackEffect {
  public view: Graphics;
  public done = false;
  private lifetime = 0;
  private readonly TRAVEL_DURATION = 300;
  private readonly FLASH_DURATION = 100;
  private readonly fromX: number;
  private readonly fromY: number;
  private readonly toX: number;
  private readonly toY: number;

  constructor(fromX: number, fromY: number, toX: number, toY: number, color: number = 0x8855ff) {
    this.fromX = fromX;
    this.fromY = fromY - 16;
    this.toX = toX;
    this.toY = toY - 16;

    this.view = new Graphics();
    this.view.circle(0, 0, 5).fill({ color, alpha: 0.9 });
    this.view.x = this.fromX;
    this.view.y = this.fromY;
  }

  update(deltaMS: number): void {
    this.lifetime += deltaMS;
    const progress = Math.min(1, this.lifetime / this.TRAVEL_DURATION);
    this.view.x = this.fromX + (this.toX - this.fromX) * progress;
    this.view.y = this.fromY + (this.toY - this.fromY) * progress;

    if (this.lifetime > this.TRAVEL_DURATION) {
      const fadeProgress = (this.lifetime - this.TRAVEL_DURATION) / this.FLASH_DURATION;
      this.view.scale.set(1 + fadeProgress);
      this.view.alpha = Math.max(0, 1 - fadeProgress);
      if (fadeProgress >= 1) this.done = true;
    }
  }

  destroy(): void {
    this.view.destroy();
  }
}
