import { BLOCK_BY_ID, BLOCKS, WALLS, WORLD_H, WORLD_W } from "../constants";
import { placeStructures } from "./structures";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hashNoise(x, seed = 1) {
  const value = Math.sin((x + seed) * 127.1) * 43758.5453;
  return value - Math.floor(value);
}

function smoothNoise(x, seed = 1) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);

  return hashNoise(i, seed) * (1 - u) + hashNoise(i + 1, seed) * u;
}

function fbmNoise(x, seed = 1, octaves = 4) {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let total = 0;

  for (let i = 0; i < octaves; i++) {
    value += smoothNoise(x * frequency, seed + i * 101) * amplitude;
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }

  return value / total;
}

function getBiome(x, seed = 1) {
  const climate = fbmNoise(x * 0.008, seed + 900, 3);
  const moisture = fbmNoise(x * 0.012, seed + 1300, 3);

  if (climate < 0.18) return "beach";
  if (climate > 0.78 && moisture < 0.55) return "desert";
  if (moisture > 0.68) return "forest";
  if (climate > 0.62) return "hills";
  return "plains";
}

function terrainHeight(x, seed = 1, biome = getBiome(x, seed)) {
  const n1 = smoothNoise(x * 0.045, seed) * 11;
  const n2 = smoothNoise(x * 0.11, seed + 100) * 5;
  const n3 = smoothNoise(x * 0.018, seed + 500) * 17;
  const base = biome === "beach" ? 34 : biome === "hills" ? 24 : 29;
  const roughness = biome === "beach" ? 0.38 : biome === "hills" ? 1.25 : 1;

  return clamp(Math.floor(base + (n1 + n2 + n3) * roughness), 11, WORLD_H - 8);
}

function createWaterLevels() {
  return Array.from({ length: WORLD_H }, () => Array(WORLD_W).fill(-1));
}

function inWorld(x, y) {
  return x >= 0 && y >= 0 && x < WORLD_W && y < WORLD_H;
}

function setBlock(world, x, y, block) {
  if (inWorld(x, y)) world[y][x] = block.id;
}

function isWater(world, x, y) {
  return inWorld(x, y) && world[y][x] === BLOCKS.water.id;
}

function isSolidBlock(world, x, y) {
  return inWorld(x, y) && Boolean(BLOCK_BY_ID[world[y][x]]?.solid);
}

function findSurfaceY(world, x) {
  if (x < 0 || x >= WORLD_W) return WORLD_H - 1;

  for (let y = 0; y < WORLD_H; y++) {
    if (world[y][x] !== BLOCKS.air.id) return y;
  }

  return WORLD_H - 1;
}

function isDrySurface(world, x, y, allowedBlocks) {
  if (!inWorld(x, y) || !allowedBlocks.has(world[y][x])) return false;
  if (isWater(world, x, y) || isWater(world, x, y - 1)) return false;
  return isSolidBlock(world, x, y);
}

function fillColumn(world, walls, x, height, biome) {
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
          ? BLOCKS.grass.id
          : depth < 5
            ? BLOCKS.dirt.id
            : BLOCKS.stone.id;
      walls[y][x] = depth < 5 ? WALLS.dirtBack.id : WALLS.stoneBack.id;
    }
  }
}

function clearWaterData(waterLevels, waterSources, x, y) {
  if (!inWorld(x, y)) return;
  waterLevels[y][x] = -1;
  waterSources.delete(`${x},${y}`);
}

function addWater(world, walls, waterLevels, waterSources, x, y, level = 0) {
  if (!inWorld(x, y)) return;
  world[y][x] = BLOCKS.water.id;
  walls[y][x] = WALLS.dirtBack.id;
  waterLevels[y][x] = level;
  if (level === 0) waterSources.add(`${x},${y}`);
}

function fillGroundBelow(world, walls, waterLevels, waterSources, x, startY) {
  for (let y = startY; y < WORLD_H; y++) {
    const depth = y - startY;
    world[y][x] =
      depth < 2 ? BLOCKS.sand.id : depth < 5 ? BLOCKS.dirt.id : BLOCKS.stone.id;
    walls[y][x] = depth < 5 ? WALLS.dirtBack.id : WALLS.stoneBack.id;
    clearWaterData(waterLevels, waterSources, x, y);
  }
}

function clearColumnAbove(world, walls, waterLevels, waterSources, x, fromY, toY) {
  for (let y = Math.max(0, fromY); y < toY; y++) {
    if (!inWorld(x, y)) continue;
    world[y][x] = BLOCKS.air.id;
    walls[y][x] = WALLS.empty.id;
    clearWaterData(waterLevels, waterSources, x, y);
  }
}

function addLake(
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

function isAir(world, x, y) {
  return inWorld(x, y) && world[y][x] === BLOCKS.air.id;
}

function placeWood(world, x, y) {
  if (!inWorld(x, y)) return;

  const current = world[y][x];

  if (current === BLOCKS.air.id || current === BLOCKS.leaves.id) {
    world[y][x] = BLOCKS.wood.id;
  }
}

function placeLeaf(world, x, y, seed, chance = 1) {
  if (!isAir(world, x, y)) return;

  if (hashNoise(x * 14.13 + y * 6.71, seed) <= chance) {
    world[y][x] = BLOCKS.leaves.id;
  }
}

function placeLeafSolid(world, x, y) {
  if (isAir(world, x, y)) {
    world[y][x] = BLOCKS.leaves.id;
  }
}

function addLeafOval(world, centerX, centerY, radiusX, radiusY, seed) {
  for (let yy = centerY - radiusY; yy <= centerY + radiusY; yy++) {
    for (let xx = centerX - radiusX; xx <= centerX + radiusX; xx++) {
      if (!inWorld(xx, yy)) continue;

      const dx = (xx - centerX) / radiusX;
      const dy = (yy - centerY) / radiusY;
      const dist = dx * dx + dy * dy;

      if (dist <= 0.72) {
        placeLeafSolid(world, xx, yy);
      } else if (dist <= 1.05) {
        placeLeaf(world, xx, yy, seed + 100, 0.72);
      }
    }
  }
}

function protectTrunk(world, x, fromY, toY) {
  for (let y = fromY; y <= toY; y++) {
    placeWood(world, x, y);
  }
}

function addRoots(world, x, groundY, seed) {
  placeWood(world, x, groundY - 1);

  if (hashNoise(x, seed + 1) > 0.2) placeWood(world, x - 1, groundY - 1);
  if (hashNoise(x, seed + 2) > 0.2) placeWood(world, x + 1, groundY - 1);

  if (hashNoise(x, seed + 3) > 0.65) placeWood(world, x - 2, groundY - 1);
  if (hashNoise(x, seed + 4) > 0.65) placeWood(world, x + 2, groundY - 1);
}

function addOakTree(world, x, groundY, trunkHeight, seed) {
  const crownY = groundY - trunkHeight;

  // trunk first
  for (let y = crownY; y < groundY; y++) {
    placeWood(world, x, y);
  }

  addRoots(world, x, groundY, seed);

  // small branches
  const leftBranchY = crownY + 2;
  const rightBranchY = crownY + 3;

  placeWood(world, x - 1, leftBranchY);
  placeWood(world, x - 2, leftBranchY);
  placeWood(world, x + 1, rightBranchY);
  placeWood(world, x + 2, rightBranchY);

  // crown is mostly fixed, only edges are random
  addLeafOval(world, x, crownY - 1, 4, 3, seed + 10);
  addLeafOval(world, x - 2, crownY + 1, 3, 3, seed + 20);
  addLeafOval(world, x + 2, crownY + 1, 3, 3, seed + 30);
  addLeafOval(world, x, crownY + 2, 3, 2, seed + 40);

  // fill center so crown never becomes weird/empty
  for (let yy = crownY - 2; yy <= crownY + 2; yy++) {
    for (let xx = x - 2; xx <= x + 2; xx++) {
      placeLeafSolid(world, xx, yy);
    }
  }

  // draw trunk again after leaves so tree never becomes "almost only leaves"
  protectTrunk(world, x, crownY, groundY - 1);
}

function addTallOakTree(world, x, groundY, trunkHeight, seed) {
  const crownY = groundY - trunkHeight;

  for (let y = crownY; y < groundY; y++) {
    placeWood(world, x, y);

    // slightly thicker bottom
    if (y > groundY - 4) {
      if (hashNoise(y + x, seed + 50) > 0.35) placeWood(world, x - 1, y);
      if (hashNoise(y + x, seed + 60) > 0.35) placeWood(world, x + 1, y);
    }
  }

  addRoots(world, x, groundY, seed);

  // branches
  placeWood(world, x - 1, crownY + 3);
  placeWood(world, x - 2, crownY + 3);
  placeWood(world, x - 3, crownY + 2);

  placeWood(world, x + 1, crownY + 4);
  placeWood(world, x + 2, crownY + 4);
  placeWood(world, x + 3, crownY + 3);

  // crown
  addLeafOval(world, x, crownY - 2, 4, 3, seed + 100);
  addLeafOval(world, x - 3, crownY + 1, 3, 3, seed + 110);
  addLeafOval(world, x + 3, crownY + 1, 3, 3, seed + 120);
  addLeafOval(world, x, crownY + 2, 4, 3, seed + 130);

  // center fill
  for (let yy = crownY - 2; yy <= crownY + 3; yy++) {
    for (let xx = x - 2; xx <= x + 2; xx++) {
      placeLeafSolid(world, xx, yy);
    }
  }

  protectTrunk(world, x, crownY, groundY - 1);
}

function addPineTree(world, x, groundY, trunkHeight, seed) {
  const topY = groundY - trunkHeight;

  for (let y = topY; y < groundY; y++) {
    placeWood(world, x, y);
  }

  addRoots(world, x, groundY, seed);

  const layers = [
    { y: topY + 1, r: 2 },
    { y: topY + 3, r: 3 },
    { y: topY + 5, r: 4 },
    { y: topY + 7, r: 5 },
  ];

  for (const layer of layers) {
    for (let yy = layer.y - 1; yy <= layer.y + 1; yy++) {
      const rowShrink = Math.abs(yy - layer.y);
      const radius = layer.r - rowShrink;

      for (let xx = x - radius; xx <= x + radius; xx++) {
        const edge = Math.abs(xx - x) / Math.max(1, radius);

        if (edge < 0.75) {
          placeLeafSolid(world, xx, yy);
        } else {
          placeLeaf(world, xx, yy, seed + layer.y, 0.72);
        }
      }
    }
  }

  // pine point
  placeLeafSolid(world, x, topY - 1);
  placeLeafSolid(world, x - 1, topY);
  placeLeafSolid(world, x, topY);
  placeLeafSolid(world, x + 1, topY);

  protectTrunk(world, x, topY + 2, groundY - 1);
}

function addTree(world, heights, x, seed, tall = false) {
  if (x < 7 || x >= WORLD_W - 7) return;

  const groundY = heights[x];

  if (groundY <= 14 || groundY >= WORLD_H) return;

  if (!isDrySurface(world, x, groundY, new Set([BLOCKS.grass.id]))) return;

  for (let xx = x - 5; xx <= x + 5; xx++) {
    for (let yy = groundY - 3; yy <= groundY + 2; yy++) {
      if (isWater(world, xx, yy)) return;
    }
  }

  const typeRoll = hashNoise(x * 2.17, seed + 700);

  if (tall && typeRoll > 0.58) {
    const trunkHeight = 10 + Math.floor(hashNoise(x * 8.1, seed) * 3);
    addPineTree(world, x, groundY, trunkHeight, seed);
    return;
  }

  if (tall) {
    const trunkHeight = 8 + Math.floor(hashNoise(x * 8.1, seed) * 3);
    addTallOakTree(world, x, groundY, trunkHeight, seed);
    return;
  }

  const trunkHeight = 6 + Math.floor(hashNoise(x * 8.1, seed) * 2);
  addOakTree(world, x, groundY, trunkHeight, seed);
}

function addCactus(world, x, groundY, seed) {
  if (groundY <= 7 || !isDrySurface(world, x, groundY, new Set([BLOCKS.sand.id]))) {
    return;
  }
  const height = 3 + Math.floor(hashNoise(x * 2.3, seed) * 3);
  for (let y = groundY - height; y < groundY; y++) {
    setBlock(world, x, y, BLOCKS.leaves);
  }
}

function addOres(world, seed) {
  for (let i = 0; i < WORLD_W * 0.12; i++) {
    const centerX =
      4 + Math.floor(hashNoise(i * 9.71, seed + 3100) * (WORLD_W - 8));
    const centerY =
      32 + Math.floor(hashNoise(i * 6.13, seed + 3200) * (WORLD_H - 36));
    const radius = 1 + Math.floor(hashNoise(i * 3.91, seed + 3300) * 3);

    for (let y = centerY - radius; y <= centerY + radius; y++) {
      for (let x = centerX - radius; x <= centerX + radius; x++) {
        if (!inWorld(x, y) || world[y][x] !== BLOCKS.stone.id) continue;
        const distance = Math.hypot(x - centerX, y - centerY);
        if (distance <= radius + hashNoise(x * 4.2 + y, seed) * 0.7) {
          world[y][x] = BLOCKS.ore.id;
        }
      }
    }
  }
}

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
