import { Text } from 'pixi.js';

export class DamageText {
  public text: Text;
  private lifetime = 0;
  private readonly DURATION = 800; // ms
  public done = false;

  constructor(
    x: number,
    y: number,
    damage: number,
    isCrit: boolean,
    isMiss: boolean
  ) {
    let displayText: string;
    let color: number;
    let fontSize: number;

    if (isMiss) {
      displayText = 'MISS';
      color = 0xaaaaaa;
      fontSize = 12;
    } else if (isCrit) {
      displayText = `${damage}!`;
      color = 0xff4444;
      fontSize = 16;
    } else {
      displayText = `${damage}`;
      color = 0xffffff;
      fontSize = 13;
    }

    this.text = new Text({
      text: displayText,
      style: {
        fontSize,
        fill: color,
        fontFamily: 'sans-serif',
        fontWeight: isCrit ? 'bold' : 'normal',
        stroke: { color: 0x000000, width: 3 },
      },
    });
    this.text.anchor.set(0.5, 0.5);
    this.text.x = x + (Math.random() - 0.5) * 20;
    this.text.y = y - 20;
  }

  update(deltaMS: number): void {
    this.lifetime += deltaMS;
    const progress = this.lifetime / this.DURATION;

    // Float upward
    this.text.y -= deltaMS * 0.05;

    // Fade out in second half
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
