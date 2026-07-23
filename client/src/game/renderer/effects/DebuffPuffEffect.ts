import { Container, Graphics } from 'pixi.js';
import type { AttackEffect } from './AttackEffect';

interface Particle {
  graphic: Graphics;
  angle: number;
}

/** A small radial burst of fading particles centered on the target */
export class DebuffPuffEffect implements AttackEffect {
  public view: Container;
  public done = false;
  private lifetime = 0;
  private readonly DURATION = 400;
  private readonly particles: Particle[] = [];

  constructor(targetX: number, targetY: number, color: number = 0x9b59b6, count: number = 5) {
    this.view = new Container();
    this.view.x = targetX;
    this.view.y = targetY - 16;

    for (let i = 0; i < count; i++) {
      const graphic = new Graphics();
      graphic.circle(0, 0, 3).fill({ color, alpha: 0.85 });
      this.view.addChild(graphic);
      this.particles.push({ graphic, angle: (Math.PI * 2 * i) / count });
    }
  }

  update(deltaMS: number): void {
    this.lifetime += deltaMS;
    const progress = Math.min(1, this.lifetime / this.DURATION);
    const radius = 20 * progress;

    for (const p of this.particles) {
      p.graphic.x = Math.cos(p.angle) * radius;
      p.graphic.y = Math.sin(p.angle) * radius;
      p.graphic.alpha = 1 - progress;
    }

    if (progress >= 1) this.done = true;
  }

  destroy(): void {
    this.view.destroy({ children: true });
  }
}
