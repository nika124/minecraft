import { BLOCKS, WALLS, WORLD_H, WORLD_W } from "../constants";
import { hashNoise } from "./noise";
import {
  addWater,
  clamp,
  clearColumnAbove,
  clearWaterData,
  fillGroundBelow,
  findSurfaceY,
} from "./utils";

export function addLake(
  world,
  walls,
  waterLevels,
  waterSources,
  heights,
  centerX,
  seed,
) {
  const lakeWidth = 13 + Math.floor(hashNoise(centerX, seed + 55) * 12);
  const waterRadius = Math.floor(lakeWidth * 0.76);
  const lakeDepth = 3 + Math.floor(hashNoise(centerX, seed + 77) * 4);
  const left = Math.max(2, centerX - lakeWidth - 4);
  const right = Math.min(WORLD_W - 3, centerX + lakeWidth + 4);
  const terrain = heights.slice(left, right + 1);
  const minY = Math.min(...terrain);
  const maxY = Math.max(...terrain);
  const centerY = heights[centerX];

  if (maxY - minY > 6 || centerY < maxY - 2) return false;

  const waterTopY = clamp(centerY + 1, 18, WORLD_H - 9);
  const rimY = waterTopY - 1;

  for (let x = centerX - lakeWidth; x <= centerX + lakeWidth; x++) {
    if (x < 2 || x >= WORLD_W - 2) continue;

    const distance = Math.abs(x - centerX);
    const normalized = distance / lakeWidth;
    const waterT = clamp(distance / waterRadius, 0, 1);
    const oldSurfaceY = heights[x];

    if (distance > waterRadius) {
      const rimLift = normalized > 0.92 ? 2 : 1;
      const bankY = rimY - rimLift + Math.floor(hashNoise(x, seed + 4100) * 2);

      clearColumnAbove(
        world,
        walls,
        waterLevels,
        waterSources,
        x,
        Math.min(oldSurfaceY, bankY),
        bankY,
      );
      world[bankY][x] = BLOCKS.sand.id;
      walls[bankY][x] = WALLS.dirtBack.id;
      clearWaterData(waterLevels, waterSources, x, bankY);
      fillGroundBelow(world, walls, waterLevels, waterSources, x, bankY + 1);
      heights[x] = findSurfaceY(world, x);
      continue;
    }

    const centerBias = 1 - waterT * waterT;
    const shallowShelf = waterT > 0.72;
    const bottomY = clamp(
      waterTopY + (shallowShelf ? 1 : 1 + Math.round(centerBias * lakeDepth)),
      waterTopY + 1,
      WORLD_H - 3,
    );

    clearColumnAbove(
      world,
      walls,
      waterLevels,
      waterSources,
      x,
      Math.min(oldSurfaceY, waterTopY - 1),
      waterTopY,
    );

    for (let y = waterTopY; y <= bottomY; y++) {
      addWater(
        world,
        walls,
        waterLevels,
        waterSources,
        x,
        y,
        y === waterTopY ? 0 : Math.min(7, y - waterTopY),
      );
    }

    fillGroundBelow(world, walls, waterLevels, waterSources, x, bottomY + 1);
    heights[x] = findSurfaceY(world, x);
  }

  for (let x = centerX - lakeWidth - 4; x <= centerX + lakeWidth + 4; x++) {
    if (x < 2 || x >= WORLD_W - 2 || Math.abs(x - centerX) <= lakeWidth + 1) {
      continue;
    }

    const surfaceY = heights[x];
    if (surfaceY > waterTopY + 2 || surfaceY < waterTopY - 4) continue;
    if (world[surfaceY][x] === BLOCKS.grass.id) {
      world[surfaceY][x] = BLOCKS.sand.id;
    }
  }

  return true;
}
