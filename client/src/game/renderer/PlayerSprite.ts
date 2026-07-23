import { Container, Graphics, Text } from 'pixi.js';
import { tileToScreen } from './isometric';

export type Direction = 'down' | 'up' | 'left' | 'right';
export type Action = 'idle' | 'walk' | 'attack' | 'dead';

const STATUS_RING_COLOR: Record<string, number> = {
  stun: 0xcccccc,
  freeze: 0x66ddff,
  root: 0x8b5a2b,
  silence: 0x9b59b6,
  poison: 0x2ecc71,
  blind: 0x333333,
  petrify: 0x999999,
};

export class PlayerSprite {
  public container: Container;
  private body: Graphics;
  private nameText: Text;
  private statusRing: Graphics;
  private _status: string | undefined;
  private _tileX: number;
  private _tileY: number;

  // Interpolation for smooth movement
  private currentScreenX = 0;
  private currentScreenY = 0;
  private targetScreenX = 0;
  private targetScreenY = 0;
  private moveSpeed = 0.1; // lerp factor

  constructor(
    public readonly id: string,
    public readonly name: string,
    tileX: number,
    tileY: number,
    private color: number = 0xe94560,
    private isLocalPlayer: boolean = false,
    public characterClass: string = ''
  ) {
    this._tileX = tileX;
    this._tileY = tileY;

    this.container = new Container();

    // Simple character representation (circle + triangle body)
    this.body = new Graphics();
    this.drawBody();
    this.container.addChild(this.body);

    // Status ring (stun/freeze/poison/etc.) — hidden until setStatus() is called
    this.statusRing = new Graphics();
    this.statusRing.visible = false;
    this.container.addChild(this.statusRing);

    // Name label
    this.nameText = new Text({
      text: name,
      style: {
        fontSize: 11,
        fill: isLocalPlayer ? 0x00ff88 : 0xffffff,
        fontFamily: 'sans-serif',
        stroke: { color: 0x000000, width: 2 },
      },
    });
    this.nameText.anchor.set(0.5, 1);
    this.nameText.y = -28;
    this.container.addChild(this.nameText);

    // Set initial position
    const pos = tileToScreen(tileX, tileY);
    this.currentScreenX = pos.x;
    this.currentScreenY = pos.y;
    this.targetScreenX = pos.x;
    this.targetScreenY = pos.y;
    this.container.x = pos.x;
    this.container.y = pos.y;
  }

  private drawBody(): void {
    this.body.clear();
    // Body (oval)
    this.body.ellipse(0, -8, 8, 12);
    this.body.fill({ color: this.color });
    this.body.stroke({ width: 1, color: 0x000000, alpha: 0.3 });
    // Head (circle)
    this.body.circle(0, -22, 6);
    this.body.fill({ color: this.color });
    this.body.stroke({ width: 1, color: 0x000000, alpha: 0.3 });
  }

  /** Update the visible status ring, and dim the sprite while stealthed */
  setStatus(status: string | undefined): void {
    if (status === this._status) return;
    this._status = status;

    this.container.alpha = status === 'stealth' ? 0.35 : 1;

    if (!status || status === 'stealth') {
      this.statusRing.visible = false;
      return;
    }

    this.statusRing.clear();
    this.statusRing.circle(0, -14, 16);
    this.statusRing.stroke({ width: 2, color: STATUS_RING_COLOR[status] ?? 0xffffff, alpha: 0.9 });
    this.statusRing.visible = true;
  }

  get tileX(): number {
    return this._tileX;
  }
  get tileY(): number {
    return this._tileY;
  }

  /** Move to a new tile position with smooth interpolation */
  moveTo(tileX: number, tileY: number): void {
    this._tileX = tileX;
    this._tileY = tileY;
    const pos = tileToScreen(tileX, tileY);
    this.targetScreenX = pos.x;
    this.targetScreenY = pos.y;
  }

  /** Snap immediately to tile position */
  snapTo(tileX: number, tileY: number): void {
    this._tileX = tileX;
    this._tileY = tileY;
    const pos = tileToScreen(tileX, tileY);
    this.currentScreenX = pos.x;
    this.currentScreenY = pos.y;
    this.targetScreenX = pos.x;
    this.targetScreenY = pos.y;
    this.container.x = pos.x;
    this.container.y = pos.y;
  }

  /** Call every frame to interpolate position */
  update(): void {
    this.currentScreenX += (this.targetScreenX - this.currentScreenX) * this.moveSpeed;
    this.currentScreenY += (this.targetScreenY - this.currentScreenY) * this.moveSpeed;
    this.container.x = this.currentScreenX;
    this.container.y = this.currentScreenY;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
