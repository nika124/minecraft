import {
  BLOCK_BY_ID,
  BLOCKS,
  WALLS,
  WORLD_H,
  WORLD_W,
} from "../constants";
import { updateSkyCoverageColumn } from "../rendering";
import { clamp } from "../world";

const MAX_WATER_SPREAD = 7;

export const WATER_FLOW_STEP = 0.16;

export function createWaterLevels() {
  return Array.from({ length: WORLD_H }, () => Array(WORLD_W).fill(-1));
}

export function getWorldWaterLevels(worldData) {
  return worldData.waterLevels?.map((row) => [...row]) ?? createWaterLevels();
}

export function getWorldWaterSources(worldData) {
  return new Set(worldData.waterSources ?? []);
}

export function updateWaterFlow({
  worldRef,
  wallsRef,
  waterLevelsRef,
  waterSourcesRef,
  placedBlocksRef,
  skyCoverageRef,
}) {
  const world = worldRef.current;
  const levels = waterLevelsRef.current;
  const sources = waterSourcesRef.current;
  const changedColumns = new Set();

  const isInside = (x, y) => x >= 0 && y >= 0 && x < WORLD_W && y < WORLD_H;
  const keyOf = (x, y) => `${x},${y}`;
  const isSolid = (x, y) =>
    !isInside(x, y) || Boolean(BLOCK_BY_ID[world[y][x]]?.solid);
  const isWater = (x, y) =>
    isInside(x, y) && world[y][x] === BLOCKS.water.id;
  const isSource = (x, y) => sources.has(keyOf(x, y));
  const isOpenForWater = (x, y) =>
    isInside(x, y) &&
    (world[y][x] === BLOCKS.air.id || world[y][x] === BLOCKS.water.id);
  const isHorizontallySupported = (x, y) =>
    y === WORLD_H - 1 ||
    isSolid(x, y + 1) ||
    isWater(x, y + 1) ||
    wallsRef.current[y][x] !== WALLS.empty.id;

  const setWater = (x, y, level, source = false) => {
    if (!isOpenForWater(x, y)) return false;
    const nextLevel = clamp(level, 0, MAX_WATER_SPREAD);
    const key = keyOf(x, y);
    const existingLevel = levels[y][x];

    if (
      world[y][x] === BLOCKS.water.id &&
      existingLevel <= nextLevel &&
      isSource(x, y) === source
    ) {
      return false;
    }

    world[y][x] = BLOCKS.water.id;
    levels[y][x] = nextLevel;
    if (source) sources.add(key);
    changedColumns.add(x);
    return true;
  };

  const clearWater = (x, y) => {
    if (!isWater(x, y)) return;
    world[y][x] = BLOCKS.air.id;
    levels[y][x] = -1;
    sources.delete(keyOf(x, y));
    placedBlocksRef.current.delete(keyOf(x, y));
    changedColumns.add(x);
  };

  for (const key of [...sources]) {
    const [x, y] = key.split(",").map(Number);
    if (
      !isInside(x, y) ||
      world[y][x] !== BLOCKS.water.id ||
      levels[y][x] !== 0
    ) {
      sources.delete(key);
      continue;
    }
  }

  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      if (
        !isWater(x, y) &&
        isOpenForWater(x, y) &&
        isHorizontallySupported(x, y) &&
        isSource(x - 1, y) &&
        isSource(x + 1, y)
      ) {
        setWater(x, y, 0, true);
        continue;
      }

      if (!isWater(x, y) || isSource(x, y)) continue;
      if (!isHorizontallySupported(x, y)) continue;

      const sourceNeighbors =
        Number(isSource(x - 1, y)) + Number(isSource(x + 1, y));
      if (sourceNeighbors >= 2) setWater(x, y, 0, true);
    }
  }

  const waterCells = [];
  for (let y = WORLD_H - 1; y >= 0; y--) {
    for (let x = 0; x < WORLD_W; x++) {
      if (isWater(x, y)) {
        waterCells.push({
          x,
          y,
          level: levels[y][x],
          source: isSource(x, y),
        });
      }
    }
  }

  waterCells.sort((a, b) => a.level - b.level || b.y - a.y);

  for (const cell of waterCells) {
    const { x, y } = cell;
    if (!isWater(x, y)) continue;

    if (isOpenForWater(x, y + 1) && !isSolid(x, y + 1)) {
      setWater(x, y + 1, Math.min(levels[y][x] + 1, 1));
      continue;
    }

    if (!isHorizontallySupported(x, y) || levels[y][x] >= MAX_WATER_SPREAD)
      continue;

    for (const dx of [-1, 1]) {
      const nx = x + dx;
      const nextLevel = levels[y][x] + 1;
      if (!isOpenForWater(nx, y) || nextLevel > MAX_WATER_SPREAD) continue;
      if (isWater(nx, y) && levels[y][nx] <= nextLevel) continue;
      setWater(nx, y, nextLevel);
    }
  }

  for (let y = WORLD_H - 1; y >= 0; y--) {
    for (let x = 0; x < WORLD_W; x++) {
      if (!isWater(x, y) || isSource(x, y)) continue;

      let desired = Infinity;

      if (isWater(x, y - 1)) {
        desired = Math.min(desired, 1);
      }

      if (isHorizontallySupported(x, y)) {
        for (const dx of [-1, 1]) {
          const nx = x + dx;
          if (!isWater(nx, y)) continue;
          desired = Math.min(desired, levels[y][nx] + 1);
        }
      }

      if (desired <= MAX_WATER_SPREAD) {
        const nextLevel = clamp(desired, 1, MAX_WATER_SPREAD);
        if (nextLevel !== levels[y][x]) {
          levels[y][x] = nextLevel;
          changedColumns.add(x);
        }
        continue;
      }

      levels[y][x] += 1;
      if (levels[y][x] > MAX_WATER_SPREAD) {
        clearWater(x, y);
      } else {
        changedColumns.add(x);
      }
    }
  }

  for (const x of changedColumns) {
    updateSkyCoverageColumn(world, skyCoverageRef.current, x);
  }
}
