import { Text } from 'pixi.js';

/** Floating gold "+Nz" text shown when a monster drops zeny — mirrors DamageText's lifecycle */
export class ZenyText {
  public text: Text;
  private lifetime = 0;
  private readonly DURATION = 900; // ms
  public done = false;

  constructor(x: number, y: number, zeny: number) {
    this.text = new Text({
      text: `+${zeny}z`,
      style: {
        fontSize: 12,
        fill: 0xf1c40f,
        fontFamily: 'sans-serif',
        fontWeight: 'bold',
        stroke: { color: 0x000000, width: 3 },
      },
    });
    this.text.anchor.set(0.5, 0.5);
    this.text.x = x + (Math.random() - 0.5) * 20;
    this.text.y = y - 5;
  }

  update(deltaMS: number): void {
    this.lifetime += deltaMS;
    const progress = this.lifetime / this.DURATION;

    this.text.y -= deltaMS * 0.04;

    if (progress > 0.5) {
      this.text.alpha = 1 - (progress - 0.5) * 2;
    }

    if (progress >= 1) {
      this.done = true;
    }
  }

  destroy(): void {
    this.text.destroy();
  }
}
