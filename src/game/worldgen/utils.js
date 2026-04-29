import {
  BLOCK_BY_ID,
  BLOCKS,
  SEA_LEVEL,
  WALLS,
  WORLD_H,
  WORLD_W,
} from "../constants";

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function createWaterLevels() {
  return Array.from({ length: WORLD_H }, () => Array(WORLD_W).fill(-1));
}

export function inWorld(x, y) {
  return x >= 0 && y >= 0 && x < WORLD_W && y < WORLD_H;
}

export function setBlock(world, x, y, block) {
  if (inWorld(x, y)) world[y][x] = block.id;
}

export function isWater(world, x, y) {
  return inWorld(x, y) && world[y][x] === BLOCKS.water.id;
}

export function isSolidBlock(world, x, y) {
  return inWorld(x, y) && Boolean(BLOCK_BY_ID[world[y][x]]?.solid);
}

export function findSurfaceY(world, x) {
  if (x < 0 || x >= WORLD_W) return WORLD_H - 1;

  for (let y = 0; y < WORLD_H; y++) {
    if (world[y][x] !== BLOCKS.air.id) return y;
  }

  return WORLD_H - 1;
}

export function isDrySurface(world, x, y, allowedBlocks) {
  if (!inWorld(x, y) || !allowedBlocks.has(world[y][x])) return false;
  if (isWater(world, x, y) || isWater(world, x, y - 1)) return false;
  return isSolidBlock(world, x, y);
}

export function clearWaterData(waterLevels, waterSources, x, y) {
  if (!inWorld(x, y)) return;
  waterLevels[y][x] = -1;
  waterSources.delete(`${x},${y}`);
}

export function addWater(
  world,
  walls,
  waterLevels,
  waterSources,
  x,
  y,
  level = 0,
  backdrop = null,
) {
  if (!inWorld(x, y)) return;
  world[y][x] = BLOCKS.water.id;
  walls[y][x] = (backdrop ?? (y >= SEA_LEVEL ? WALLS.deepStoneBack : WALLS.dirtBack)).id;
  waterLevels[y][x] = level;
  if (level === 0) waterSources.add(`${x},${y}`);
}

export function fillGroundBelow(
  world,
  walls,
  waterLevels,
  waterSources,
  x,
  startY,
) {
  for (let y = startY; y < WORLD_H; y++) {
    const depth = y - startY;
    world[y][x] =
      depth < 2 ? BLOCKS.sand.id : depth < 5 ? BLOCKS.dirt.id : BLOCKS.stone.id;
    walls[y][x] =
      y >= SEA_LEVEL
        ? WALLS.deepStoneBack.id
        : depth < 5
          ? WALLS.dirtBack.id
          : WALLS.stoneBack.id;
    clearWaterData(waterLevels, waterSources, x, y);
  }
}

export function clearColumnAbove(
  world,
  walls,
  waterLevels,
  waterSources,
  x,
  fromY,
  toY,
) {
  for (let y = Math.max(0, fromY); y < toY; y++) {
    if (!inWorld(x, y)) continue;
    world[y][x] = BLOCKS.air.id;
    walls[y][x] = WALLS.empty.id;
    clearWaterData(waterLevels, waterSources, x, y);
  }
}
