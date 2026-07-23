/**
 * Server-side movement system.
 * Validates player movement and updates position in the game state.
 */

import type { MapData } from '../maps/MapLoader';

export interface MoveAction {
  characterId: string;
  path: Array<{ x: number; y: number }>;
  currentStep: number;
}

const DIRECTIONS = [
  { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
  { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
];

/**
 * Validate that each step in a path is:
 * 1. Adjacent (including diagonal) to the previous step
 * 2. On a walkable tile
 */
export function validatePath(
  path: Array<{ x: number; y: number }>,
  startX: number,
  startY: number,
  mapData: MapData
): boolean {
  if (path.length === 0) return false;
  if (path.length > 50) return false; // max path length

  let prevX = startX;
  let prevY = startY;

  for (const step of path) {
    // Bounds check
    if (step.x < 0 || step.x >= mapData.width || step.y < 0 || step.y >= mapData.height) {
      return false;
    }

    // Walkability
    if (!mapData.walkable[step.y][step.x]) return false;

    // Adjacency (max 1 tile in any direction)
    const dx = Math.abs(step.x - prevX);
    const dy = Math.abs(step.y - prevY);
    if (dx > 1 || dy > 1 || (dx === 0 && dy === 0)) return false;

    // Diagonal: check both adjacent tiles are walkable (no corner cutting)
    if (dx === 1 && dy === 1) {
      if (!mapData.walkable[prevY + (step.y - prevY)][prevX] ||
          !mapData.walkable[prevY][prevX + (step.x - prevX)]) {
        return false;
      }
    }

    prevX = step.x;
    prevY = step.y;
  }

  return true;
}

/**
 * Advance a move action by one step.
 * Returns the new position or null if movement is complete.
 */
export function advanceMove(action: MoveAction): { x: number; y: number } | null {
  action.currentStep++;
  if (action.currentStep >= action.path.length) {
    return null; // movement complete
  }
  return action.path[action.currentStep];
}

/** A* pathfinding on the map's walkable grid (Chebyshev/8-directional movement) */
export function computeServerPath(
  map: { width: number; height: number; walkable: boolean[][] },
  startX: number, startY: number, endX: number, endY: number
): Array<{ x: number; y: number }> {
  interface Node { x: number; y: number; g: number; h: number; f: number; parent: Node | null; }
  const DIRS = [
    { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
    { x: 1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: -1, y: -1 },
  ];
  if (!map.walkable[endY]?.[endX]) return [{ x: startX, y: startY }];

  const openList: Node[] = [];
  const closedSet = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;
  const h = (x: number, y: number) => Math.max(Math.abs(x - endX), Math.abs(y - endY));

  openList.push({ x: startX, y: startY, g: 0, h: h(startX, startY), f: h(startX, startY), parent: null });

  let iter = 0;
  while (openList.length > 0 && iter < 1000) {
    iter++;
    let bestIdx = 0;
    for (let i = 1; i < openList.length; i++) { if (openList[i].f < openList[bestIdx].f) bestIdx = i; }
    const cur = openList[bestIdx];
    if (cur.x === endX && cur.y === endY) {
      const path: Array<{ x: number; y: number }> = [];
      let n: Node | null = cur;
      while (n) { path.unshift({ x: n.x, y: n.y }); n = n.parent; }
      return path;
    }
    openList.splice(bestIdx, 1);
    closedSet.add(key(cur.x, cur.y));
    for (const d of DIRS) {
      const nx = cur.x + d.x, ny = cur.y + d.y;
      if (nx < 0 || nx >= map.width || ny < 0 || ny >= map.height) continue;
      if (!map.walkable[ny][nx] || closedSet.has(key(nx, ny))) continue;
      if (d.x !== 0 && d.y !== 0) {
        // No corner-cutting on diagonal moves
        if (!map.walkable[cur.y][nx] || !map.walkable[ny][cur.x]) continue;
      }
      const g = cur.g + (d.x !== 0 && d.y !== 0 ? 1.4 : 1);
      const existing = openList.find((n) => n.x === nx && n.y === ny);
      if (existing && existing.g <= g) continue;
      const node: Node = { x: nx, y: ny, g, h: h(nx, ny), f: g + h(nx, ny), parent: cur };
      if (existing) {
        openList.splice(openList.indexOf(existing), 1);
      }
      openList.push(node);
    }
  }

  return [{ x: startX, y: startY }]; // no path found
}

/**
 * Find the walkable tile closest to (fromX,fromY) that is within `range` tiles
 * (Chebyshev distance) of the target (targetX,targetY). Returns the attacker's
 * current position unchanged if already within range.
 */
export function findApproachTile(
  mapData: { width: number; height: number; walkable: boolean[][] },
  fromX: number, fromY: number,
  targetX: number, targetY: number,
  range: number
): { x: number; y: number } {
  const currentDist = Math.max(Math.abs(fromX - targetX), Math.abs(fromY - targetY));
  if (currentDist <= range) return { x: fromX, y: fromY };

  let best: { x: number; y: number } | null = null;
  let bestDist = Infinity;

  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== range) continue; // ring at exactly `range`
      const tx = targetX + dx;
      const ty = targetY + dy;
      if (tx < 0 || tx >= mapData.width || ty < 0 || ty >= mapData.height) continue;
      if (!mapData.walkable[ty][tx]) continue;

      const dist = Math.max(Math.abs(tx - fromX), Math.abs(ty - fromY));
      if (dist < bestDist) {
        bestDist = dist;
        best = { x: tx, y: ty };
      }
    }
  }

  return best ?? { x: fromX, y: fromY };
}

/** Push an entity directly away from (fromX,fromY) by up to `tiles`, stopping at the
 * first unwalkable/out-of-bounds tile (used by knockback-flagged skills) */
export function applyKnockback(
  entityX: number,
  entityY: number,
  fromX: number,
  fromY: number,
  tiles: number,
  mapData: { width: number; height: number; walkable: boolean[][] }
): { x: number; y: number } {
  const dx = Math.sign(entityX - fromX);
  const dy = Math.sign(entityY - fromY);
  let x = entityX;
  let y = entityY;

  for (let i = 0; i < tiles; i++) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || nx >= mapData.width || ny < 0 || ny >= mapData.height) break;
    if (!mapData.walkable[ny][nx]) break;
    x = nx;
    y = ny;
  }

  return { x, y };
}

/** Pick a random walkable tile within `range` tiles of (fromX,fromY) — used by
 * self-blink skills (RO's Teleport is a random short-range hop, not directional) */
export function randomBlinkTile(
  fromX: number,
  fromY: number,
  range: number,
  mapData: { width: number; height: number; walkable: boolean[][] }
): { x: number; y: number } {
  const candidates: Array<{ x: number; y: number }> = [];
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      if (dx === 0 && dy === 0) continue;
      const x = fromX + dx;
      const y = fromY + dy;
      if (x < 0 || x >= mapData.width || y < 0 || y >= mapData.height) continue;
      if (mapData.walkable[y][x]) candidates.push({ x, y });
    }
  }
  if (candidates.length === 0) return { x: fromX, y: fromY };
  return candidates[Math.floor(Math.random() * candidates.length)];
}
