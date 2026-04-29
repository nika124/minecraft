import { BLOCKS, SEA_LEVEL, WALLS, WORLD_H } from "../constants";
import { addWater } from "./utils";
import { getBiome } from "./biomes";
import { smoothNoise } from "./noise";
import { clamp } from "./utils";

export function terrainHeight(x, seed = 1, biome = getBiome(x, seed)) {
  const n1 = smoothNoise(x * 0.045, seed) * 11;
  const n2 = smoothNoise(x * 0.11, seed + 100) * 5;
  const n3 = smoothNoise(x * 0.018, seed + 500) * 17;
  const base = biome === "beach" ? 34 : biome === "hills" ? 24 : 29;
  const roughness = biome === "beach" ? 0.38 : biome === "hills" ? 1.25 : 1;

  return clamp(
    Math.floor(base + (n1 + n2 + n3) * roughness),
    11,
    WORLD_H - 8,
  );
}

export function fillColumn(world, walls, x, height, biome) {
  for (let y = height; y < WORLD_H; y++) {
    const depth = y - height;

    if (biome === "beach") {
      world[y][x] = depth < 7 ? BLOCKS.sand.id : BLOCKS.stone.id;
      walls[y][x] = depth < 7 ? WALLS.dirtBack.id : WALLS.stoneBack.id;
    } else if (biome === "desert") {
      world[y][x] = depth < 6 ? BLOCKS.sand.id : BLOCKS.stone.id;
      walls[y][x] = depth < 6 ? WALLS.dirtBack.id : WALLS.stoneBack.id;
    } else {
      world[y][x] =
        depth === 0
          ? height >= SEA_LEVEL
            ? BLOCKS.sand.id
            : BLOCKS.grass.id
          : depth < 5
            ? BLOCKS.dirt.id
            : BLOCKS.stone.id;
      walls[y][x] = depth < 5 ? WALLS.dirtBack.id : WALLS.stoneBack.id;
    }
  }
}

export function fillSeaLevel(world, walls, waterLevels, waterSources, x, height) {
  if (height <= SEA_LEVEL) return;

  for (let y = SEA_LEVEL; y < height; y++) {
    addWater(
      world,
      walls,
      waterLevels,
      waterSources,
      x,
      y,
      y === SEA_LEVEL ? 0 : Math.min(7, y - SEA_LEVEL),
      WALLS.deepStoneBack,
    );
  }
}
