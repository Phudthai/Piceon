import { Container, Graphics, Text } from 'pixi.js';
import { tileToScreen } from './isometric';

/** Static NPC visual: gold-tinted figure with a name label and "!" marker */
export class NpcSprite {
  public container: Container;
  private body: Graphics;
  private nameText: Text;

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly tileX: number,
    public readonly tileY: number,
    private color: number = 0xf1c40f
  ) {
    this.container = new Container();

    this.body = new Graphics();
    // Body (oval)
    this.body.ellipse(0, -8, 8, 12);
    this.body.fill({ color: this.color });
    this.body.stroke({ width: 1, color: 0x000000, alpha: 0.3 });
    // Head (circle)
    this.body.circle(0, -22, 6);
    this.body.fill({ color: this.color });
    this.body.stroke({ width: 1, color: 0x000000, alpha: 0.3 });
    this.container.addChild(this.body);

    this.nameText = new Text({
      text: name,
      style: {
        fontSize: 11,
        fill: 0xf9e79f,
        fontFamily: 'sans-serif',
        stroke: { color: 0x000000, width: 2 },
      },
    });
    this.nameText.anchor.set(0.5, 1);
    this.nameText.y = -28;
    this.container.addChild(this.nameText);

    const pos = tileToScreen(tileX, tileY);
    this.container.x = pos.x;
    this.container.y = pos.y;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
