/**
 * Isometric projection utilities.
 *
 * Tile coordinate (tileX, tileY) → screen pixel (screenX, screenY)
 * using diamond/isometric layout.
 */

export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32; // half of TILE_WIDTH for isometric

/** Convert tile coordinates to screen (pixel) coordinates */
export function tileToScreen(tileX: number, tileY: number): { x: number; y: number } {
  return {
    x: (tileX - tileY) * (TILE_WIDTH / 2),
    y: (tileX + tileY) * (TILE_HEIGHT / 2),
  };
}

/** Convert screen (pixel) coordinates to tile coordinates */
export function screenToTile(screenX: number, screenY: number): { x: number; y: number } {
  const tileX = (screenX / (TILE_WIDTH / 2) + screenY / (TILE_HEIGHT / 2)) / 2;
  const tileY = (screenY / (TILE_HEIGHT / 2) - screenX / (TILE_WIDTH / 2)) / 2;
  return { x: Math.floor(tileX), y: Math.floor(tileY) };
}

/** Depth sort key: entities with higher Y (or same Y + higher X) render on top */
export function depthSortKey(tileX: number, tileY: number, mapWidth: number): number {
  return tileY * mapWidth + tileX;
}
