/**
 * Loads map data from JSON files in data/maps/.
 * Maps are cached in memory after first load.
 */

import fs from 'fs';
import path from 'path';

export interface MapData {
  name: string;
  displayName: string;
  width: number;
  height: number;
  tileSize: number;
  tiles: number[][];
  walkable: boolean[][];
  warpPoints: Array<{
    fromX: number;
    fromY: number;
    toMap: string;
    toX: number;
    toY: number;
  }>;
  npcPositions?: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
  }>;
  monsterSpawns: Array<{
    monsterId: number;
    name: string;
    maxCount: number;
    areaX1: number;
    areaY1: number;
    areaX2: number;
    areaY2: number;
  }>;
}

const mapCache = new Map<string, MapData>();
const DATA_DIR = path.resolve(__dirname, '../../../../data/maps');

export function loadMap(mapName: string): MapData | null {
  if (mapCache.has(mapName)) {
    return mapCache.get(mapName)!;
  }

  const filePath = path.join(DATA_DIR, `${mapName}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`[MapLoader] Map file not found: ${filePath}`);
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data: MapData = JSON.parse(raw);
    mapCache.set(mapName, data);
    console.log(`[MapLoader] Loaded map: ${data.displayName} (${data.width}x${data.height})`);
    return data;
  } catch (err) {
    console.error(`[MapLoader] Failed to load map ${mapName}:`, err);
    return null;
  }
}

export function getLoadedMaps(): string[] {
  return Array.from(mapCache.keys());
}
