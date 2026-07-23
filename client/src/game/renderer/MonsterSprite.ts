import { Container, Graphics, Text } from 'pixi.js';
import { tileToScreen } from './isometric';

const STATUS_RING_COLOR: Record<string, number> = {
  stun: 0xcccccc,
  freeze: 0x66ddff,
  root: 0x8b5a2b,
  silence: 0x9b59b6,
  poison: 0x2ecc71,
  blind: 0x333333,
  petrify: 0x999999,
};

export class MonsterSprite {
  public container: Container;
  private body: Graphics;
  private hpBar: Graphics;
  private nameText: Text;
  private statusRing: Graphics;
  private _status: string | undefined;
  private _tileX: number;
  private _tileY: number;
  private currentScreenX = 0;
  private currentScreenY = 0;
  private targetScreenX = 0;
  private targetScreenY = 0;
  public maxHp: number;
  public hp: number;

  constructor(
    public readonly id: string,
    public readonly definitionId: number,
    public readonly displayName: string,
    tileX: number,
    tileY: number,
    hp: number,
    maxHp: number,
    public readonly isShiny: boolean = false
  ) {
    this._tileX = tileX;
    this._tileY = tileY;
    this.hp = hp;
    this.maxHp = maxHp;

    this.container = new Container();

    // Monster body (distinct from player — diamond shape)
    this.body = new Graphics();
    this.drawBody();
    this.container.addChild(this.body);

    // HP bar
    this.hpBar = new Graphics();
    this.updateHpBar();
    this.container.addChild(this.hpBar);

    // Status ring (stun/freeze/poison/etc.) — hidden until setStatus() is called
    this.statusRing = new Graphics();
    this.statusRing.visible = false;
    this.container.addChild(this.statusRing);

    // Name (shiny variants get a gold label + star prefix so they stand out)
    this.nameText = new Text({
      text: isShiny ? `★ ${displayName}` : displayName,
      style: {
        fontSize: 10,
        fill: isShiny ? 0xffd700 : 0xffcc00,
        fontFamily: 'sans-serif',
        fontWeight: isShiny ? 'bold' : 'normal',
        stroke: { color: 0x000000, width: 2 },
      },
    });
    this.nameText.anchor.set(0.5, 1);
    this.nameText.y = -30;
    this.container.addChild(this.nameText);

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
    // Monster body — slightly different shape (rounded rect); shiny variants render gold
    this.body.roundRect(-10, -20, 20, 20, 4);
    this.body.fill({ color: this.isShiny ? 0xffd700 : 0xff6b6b });
    this.body.stroke({ width: this.isShiny ? 2 : 1, color: this.isShiny ? 0xfff4b0 : 0x000000, alpha: this.isShiny ? 0.9 : 0.4 });
    // Eyes
    this.body.circle(-4, -14, 2);
    this.body.circle(4, -14, 2);
    this.body.fill({ color: 0x000000 });
  }

  updateHpBar(): void {
    this.hpBar.clear();
    const width = 24;
    const height = 3;
    const y = -24;

    // Background
    this.hpBar.rect(-width / 2, y, width, height);
    this.hpBar.fill({ color: 0x333333 });

    // HP fill
    const ratio = Math.max(0, this.hp / this.maxHp);
    const color = ratio > 0.5 ? 0x2ecc71 : ratio > 0.25 ? 0xf1c40f : 0xe74c3c;
    this.hpBar.rect(-width / 2, y, width * ratio, height);
    this.hpBar.fill({ color });
  }

  /** Update the visible status ring */
  setStatus(status: string | undefined): void {
    if (status === this._status) return;
    this._status = status;

    if (!status) {
      this.statusRing.visible = false;
      return;
    }

    this.statusRing.clear();
    this.statusRing.circle(0, -10, 16);
    this.statusRing.stroke({ width: 2, color: STATUS_RING_COLOR[status] ?? 0xffffff, alpha: 0.9 });
    this.statusRing.visible = true;
  }

  get tileX(): number { return this._tileX; }
  get tileY(): number { return this._tileY; }

  moveTo(tileX: number, tileY: number): void {
    this._tileX = tileX;
    this._tileY = tileY;
    const pos = tileToScreen(tileX, tileY);
    this.targetScreenX = pos.x;
    this.targetScreenY = pos.y;
  }

  setHp(hp: number, maxHp: number): void {
    this.hp = hp;
    this.maxHp = maxHp;
    this.updateHpBar();
  }

  update(): void {
    this.currentScreenX += (this.targetScreenX - this.currentScreenX) * 0.1;
    this.currentScreenY += (this.targetScreenY - this.currentScreenY) * 0.1;
    this.container.x = this.currentScreenX;
    this.container.y = this.currentScreenY;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
