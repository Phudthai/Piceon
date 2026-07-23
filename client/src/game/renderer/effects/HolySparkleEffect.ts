import { Container, Graphics } from 'pixi.js';
import type { AttackEffect } from './AttackEffect';

interface Particle {
  graphic: Graphics;
  offsetX: number;
}

/** A handful of light particles drifting upward over the target (or caster, for self-buffs) */
export class HolySparkleEffect implements AttackEffect {
  public view: Container;
  public done = false;
  private lifetime = 0;
  private readonly DURATION = 500;
  private readonly particles: Particle[] = [];

  constructor(targetX: number, targetY: number, count: number = 5) {
    this.view = new Container();
    this.view.x = targetX;
    this.view.y = targetY;

    for (let i = 0; i < count; i++) {
      const graphic = new Graphics();
      graphic.circle(0, 0, 2.5).fill({ color: 0xfff4b0, alpha: 0.9 });
      this.view.addChild(graphic);
      this.particles.push({ graphic, offsetX: (Math.random() - 0.5) * 20 });
    }
  }

  update(deltaMS: number): void {
    this.lifetime += deltaMS;
    const progress = Math.min(1, this.lifetime / this.DURATION);

    for (const p of this.particles) {
      p.graphic.y = -10 - progress * 30;
      p.graphic.x = p.offsetX * progress;
      p.graphic.alpha = 1 - progress;
    }

    if (progress >= 1) this.done = true;
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
