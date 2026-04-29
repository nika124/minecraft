import { BLOCKS, WALLS, WORLD_H, WORLD_W } from "../constants";
import { getBiome } from "./biomes";
import { addCactus } from "./cactus";
import { addLake } from "./lakes";
import { hashNoise } from "./noise";
import { addOres } from "./ores";
import { placeStructures } from "./structures";
import { fillColumn, terrainHeight } from "./terrain";
import { addTree } from "./trees";
import { createWaterLevels } from "./utils";

export function makeWorld(seed = Math.random() * 999999) {
  const world = Array.from({ length: WORLD_H }, () =>
    Array(WORLD_W).fill(BLOCKS.air.id),
  );
  const walls = Array.from({ length: WORLD_H }, () =>
    Array(WORLD_W).fill(WALLS.empty.id),
  );
  const waterLevels = createWaterLevels();
  const waterSources = new Set();
  const heights = Array(WORLD_W);
  const biomes = Array(WORLD_W);

  for (let x = 0; x < WORLD_W; x++) {
    const biome = getBiome(x, seed);
    const height = terrainHeight(x, seed, biome);
    biomes[x] = biome;
    heights[x] = height;
    fillColumn(world, walls, x, height, biome);
  }

  for (let x = 54; x < WORLD_W - 54; x += 72) {
    const biome = biomes[x];
    if (
      (biome === "plains" || biome === "forest" || biome === "beach") &&
      hashNoise(x, seed + 2000) > 0.38
    ) {
      addLake(world, walls, waterLevels, waterSources, heights, x, seed);
    }
  }

  for (let x = 18; x < WORLD_W - 18; x += 12) {
    const biome = biomes[x];
    const roll = hashNoise(x * 5.7, seed + 1700);

    if (biome === "forest" && roll > 0.28) {
      addTree(world, heights, x, seed, true);
    } else if ((biome === "plains" || biome === "hills") && roll > 0.68) {
      addTree(world, heights, x, seed);
    } else if (biome === "desert" && roll > 0.84) {
      addCactus(world, x, heights[x], seed);
    }
  }

  placeStructures(world, walls, heights, biomes, seed);
  addOres(world, seed);

  return { world, walls, waterLevels, waterSources, biomes };
}
