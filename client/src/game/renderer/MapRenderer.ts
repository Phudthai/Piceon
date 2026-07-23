import { Application, Container, Graphics } from 'pixi.js';
import { tileToScreen, TILE_WIDTH, TILE_HEIGHT } from './isometric';

export interface MapData {
  name: string;
  displayName: string;
  width: number;
  height: number;
  tileSize: number;
  tiles: number[][];
  walkable: boolean[][];
  npcPositions?: Array<{ id: string; name: string; x: number; y: number }>;
}

// Tile type → color mapping
const TILE_COLORS: Record<number, number> = {
  1: 0x4a7c3f, // grass
  2: 0x6b6b6b, // wall/stone
  3: 0x8b6914, // building
  4: 0x3498db, // water/fountain
  5: 0x7f8c8d, // rocks
};

export class MapRenderer {
  private groundLayer: Container;
  private entityLayer: Container;
  private effectLayer: Container;

  constructor(
    private app: Application,
    private mapData: MapData
  ) {
    this.groundLayer = new Container();
    this.entityLayer = new Container();
    this.effectLayer = new Container();

    this.app.stage.addChild(this.groundLayer);
    this.app.stage.addChild(this.entityLayer);
    this.app.stage.addChild(this.effectLayer);

    this.renderGround();
  }

  private renderGround(): void {
    const { width, height, tiles } = this.mapData;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tileType = tiles[y][x];
        const color = TILE_COLORS[tileType] ?? 0x333333;
        const { x: sx, y: sy } = tileToScreen(x, y);

        const tile = new Graphics();
        // Draw isometric diamond
        tile.poly([
          sx, sy - TILE_HEIGHT / 2,                    // top
          sx + TILE_WIDTH / 2, sy,                     // right
          sx, sy + TILE_HEIGHT / 2,                    // bottom
          sx - TILE_WIDTH / 2, sy,                     // left
        ]);
        tile.fill({ color });
        tile.stroke({ width: 1, color: 0x000000, alpha: 0.15 });

        this.groundLayer.addChild(tile);
      }
    }
  }

  get entities(): Container {
    return this.entityLayer;
  }

  get effects(): Container {
    return this.effectLayer;
  }

  /** Sort entities in entityLayer by their Y position for correct depth */
  sortEntities(): void {
    this.entityLayer.children.sort((a, b) => a.y - b.y);
  }

  destroy(): void {
    this.groundLayer.destroy({ children: true });
    this.entityLayer.destroy({ children: true });
    this.effectLayer.destroy({ children: true });
  }
}
