import { Container, Graphics, Text } from 'pixi.js';
import { tileToScreen } from './isometric';

export class DropSprite {
  public container: Container;
  private icon: Graphics;
  private label: Text;
  private _tileX: number;
  private _tileY: number;
  private bobOffset = 0;
  private bobSpeed = 0.03;

  constructor(
    public readonly id: string,
    public readonly itemId: number,
    public readonly itemName: string,
    tileX: number,
    tileY: number
  ) {
    this._tileX = tileX;
    this._tileY = tileY;

    this.container = new Container();

    // Drop icon (small sparkling square)
    this.icon = new Graphics();
    this.drawIcon();
    this.container.addChild(this.icon);

    // Item name label
    this.label = new Text({
      text: itemName,
      style: {
        fontSize: 9,
        fill: 0xffffff,
        fontFamily: 'sans-serif',
        stroke: { color: 0x000000, width: 2 },
      },
    });
    this.label.anchor.set(0.5, 1);
    this.label.y = -14;
    this.container.addChild(this.label);

    const pos = tileToScreen(tileX, tileY);
    this.container.x = pos.x;
    this.container.y = pos.y;
  }

  private drawIcon(): void {
    this.icon.clear();
    // Small bag/pouch shape
    this.icon.roundRect(-5, -8, 10, 8, 2);
    this.icon.fill({ color: 0xf39c12 });
    this.icon.stroke({ width: 1, color: 0x000000, alpha: 0.4 });
    // Sparkle dot
    this.icon.circle(3, -6, 1.5);
    this.icon.fill({ color: 0xffffff, alpha: 0.8 });
  }

  get tileX(): number { return this._tileX; }
  get tileY(): number { return this._tileY; }

  /** Gentle bobbing animation */
  update(): void {
    this.bobOffset += this.bobSpeed;
    this.icon.y = Math.sin(this.bobOffset) * 2;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
