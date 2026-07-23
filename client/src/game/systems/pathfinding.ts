/**
 * A* pathfinding on isometric tile grid.
 * Used client-side for path preview; server validates actual movement.
 */

interface Node {
  x: number;
  y: number;
  g: number; // cost from start
  h: number; // heuristic to end
  f: number; // g + h
  parent: Node | null;
}

const DIRECTIONS = [
  { x: 0, y: -1 }, // up
  { x: 1, y: 0 },  // right
  { x: 0, y: 1 },  // down
  { x: -1, y: 0 }, // left
  { x: 1, y: -1 }, // up-right
  { x: 1, y: 1 },  // down-right
  { x: -1, y: 1 }, // down-left
  { x: -1, y: -1 },// up-left
];

function heuristic(ax: number, ay: number, bx: number, by: number): number {
  // Chebyshev distance (allows diagonal)
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

export function findPath(
  walkable: boolean[][],
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  maxIterations: number = 1000
): Array<{ x: number; y: number }> {
  const height = walkable.length;
  const width = walkable[0].length;

  // Bounds check
  if (
    endX < 0 || endX >= width || endY < 0 || endY >= height ||
    !walkable[endY][endX]
  ) {
    return [];
  }

  const openList: Node[] = [];
  const closedSet = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;

  const startNode: Node = {
    x: startX, y: startY,
    g: 0, h: heuristic(startX, startY, endX, endY),
    f: heuristic(startX, startY, endX, endY),
    parent: null,
  };
  openList.push(startNode);

  let iterations = 0;

  while (openList.length > 0 && iterations < maxIterations) {
    iterations++;

    // Find node with lowest f
    let lowestIdx = 0;
    for (let i = 1; i < openList.length; i++) {
      if (openList[i].f < openList[lowestIdx].f) lowestIdx = i;
    }
    const current = openList[lowestIdx];

    // Reached goal
    if (current.x === endX && current.y === endY) {
      const path: Array<{ x: number; y: number }> = [];
      let node: Node | null = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path;
    }

    openList.splice(lowestIdx, 1);
    closedSet.add(key(current.x, current.y));

    for (const dir of DIRECTIONS) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;

      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      if (!walkable[ny][nx]) continue;
      if (closedSet.has(key(nx, ny))) continue;

      // Diagonal movement: check that both adjacent tiles are walkable
      if (dir.x !== 0 && dir.y !== 0) {
        if (!walkable[current.y + dir.y][current.x] || !walkable[current.y][current.x + dir.x]) {
          continue;
        }
      }

      const moveCost = (dir.x !== 0 && dir.y !== 0) ? 1.414 : 1;
      const g = current.g + moveCost;
      const h = heuristic(nx, ny, endX, endY);
      const f = g + h;

      const existingIdx = openList.findIndex((n) => n.x === nx && n.y === ny);
      if (existingIdx !== -1) {
        if (g < openList[existingIdx].g) {
          openList[existingIdx].g = g;
          openList[existingIdx].f = f;
          openList[existingIdx].parent = current;
        }
        continue;
      }

      openList.push({ x: nx, y: ny, g, h, f, parent: current });
    }
  }

  return []; // no path found
}
