import {
  BLOCK_BY_ID,
  BLOCKS,
  TILE,
  WALLS,
  WORLD_H,
  WORLD_W,
} from "./constants";

export function clamp(value, min, max) {
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

function setWall(walls, x, y, wall) {
  if (inWorld(x, y)) walls[y][x] = wall.id;
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

function addLake(
  world,
  walls,
  waterLevels,
  waterSources,
  heights,
  centerX,
  seed,
) {
  const lakeWidth = 12 + Math.floor(hashNoise(centerX, seed + 55) * 15);
  const lakeDepth = 4 + Math.floor(hashNoise(centerX, seed + 77) * 4);
  const left = Math.max(2, centerX - lakeWidth - 2);
  const right = Math.min(WORLD_W - 3, centerX + lakeWidth + 2);
  const terrain = heights.slice(left, right + 1);
  const minY = Math.min(...terrain);
  const maxY = Math.max(...terrain);

  if (maxY - minY > 8) return false;

  const centerY = heights[centerX];
  const averageY = Math.round(
    terrain.reduce((total, y) => total + y, 0) / terrain.length,
  );
  const waterTopY = clamp(Math.max(centerY, averageY) + 1, 18, WORLD_H - 9);

  for (let x = centerX - lakeWidth; x <= centerX + lakeWidth; x++) {
    if (x < 2 || x >= WORLD_W - 2) continue;

    const dx = Math.abs(x - centerX) / lakeWidth;
    const curve = 1 - dx * dx;
    const basinDepth = Math.max(1, Math.floor(curve * lakeDepth));
    const bottomY = clamp(waterTopY + basinDepth, waterTopY, WORLD_H - 3);
    const oldSurfaceY = heights[x];
    const shorelineY = Math.min(oldSurfaceY, waterTopY - 1);

    for (let y = shorelineY; y < waterTopY; y++) {
      if (!inWorld(x, y)) continue;
      world[y][x] = BLOCKS.air.id;
      walls[y][x] = WALLS.empty.id;
      clearWaterData(waterLevels, waterSources, x, y);
    }

    for (let y = waterTopY; y <= bottomY; y++) {
      addWater(
        world,
        walls,
        waterLevels,
        waterSources,
        x,
        y,
        y === waterTopY ? 0 : 1,
      );
    }

    for (let y = bottomY + 1; y <= bottomY + 5 && y < WORLD_H; y++) {
      const depth = y - bottomY;
      world[y][x] = depth < 3 ? BLOCKS.sand.id : BLOCKS.dirt.id;
      walls[y][x] = WALLS.dirtBack.id;
      clearWaterData(waterLevels, waterSources, x, y);
    }

    for (let y = bottomY + 5; y < WORLD_H; y++) {
      if (world[y][x] === BLOCKS.air.id || world[y][x] === BLOCKS.water.id) {
        world[y][x] = BLOCKS.stone.id;
        walls[y][x] = WALLS.stoneBack.id;
        clearWaterData(waterLevels, waterSources, x, y);
      }
    }

    heights[x] = findSurfaceY(world, x);
  }

  for (let x = centerX - lakeWidth - 3; x <= centerX + lakeWidth + 3; x++) {
    if (x < 2 || x >= WORLD_W - 2 || Math.abs(x - centerX) <= lakeWidth) {
      continue;
    }

    const surfaceY = heights[x];
    if (surfaceY > waterTopY + 2 || surfaceY < waterTopY - 3) continue;
    if (world[surfaceY][x] === BLOCKS.grass.id) {
      world[surfaceY][x] = BLOCKS.sand.id;
    }
  }

  return true;
}

function addTree(world, heights, x, seed, tall = false) {
  const groundY = heights[x];
  if (groundY <= 9 || groundY >= WORLD_H) return;
  if (!isDrySurface(world, x, groundY, new Set([BLOCKS.grass.id]))) return;

  for (let xx = x - 3; xx <= x + 3; xx++) {
    for (let yy = groundY - 1; yy <= groundY + 2; yy++) {
      if (isWater(world, xx, yy)) return;
    }
  }

  const trunkHeight = (tall ? 8 : 5) + Math.floor(hashNoise(x * 8.1, seed) * 4);
  for (let y = groundY - trunkHeight; y < groundY; y++) {
    setBlock(world, x, y, BLOCKS.wood);
  }

  const crownY = groundY - trunkHeight;
  const crownRadius = tall ? 5 : 4;
  for (let yy = crownY - crownRadius; yy <= crownY + 3; yy++) {
    for (let xx = x - crownRadius; xx <= x + crownRadius; xx++) {
      const dx = Math.abs(xx - x);
      const dy = yy - crownY;
      const edge = dx * 1.08 + (dy > 0 ? dy * 1.55 : Math.abs(dy) * 1.05);
      const fringe = hashNoise(xx * 9.7 + yy * 5.3, seed);

      if (
        inWorld(xx, yy) &&
        edge < crownRadius + 1 &&
        fringe > 0.05 + edge * 0.02 &&
        world[yy][xx] === BLOCKS.air.id
      ) {
        world[yy][xx] = BLOCKS.leaves.id;
      }
    }
  }
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

function isBuildableSurface(world, heights, x, width, allowedBlocks) {
  if (x < 2 || x + width >= WORLD_W - 2) return false;
  const minY = Math.min(...heights.slice(x, x + width));
  const maxY = Math.max(...heights.slice(x, x + width));
  if (maxY - minY > 2) return false;

  for (let xx = x; xx < x + width; xx++) {
    if (!isDrySurface(world, xx, heights[xx], allowedBlocks)) return false;

    for (let yy = heights[xx] - 1; yy <= heights[xx] + 3; yy++) {
      if (isWater(world, xx, yy)) return false;
    }
  }

  return true;
}

function flattenSurface(world, walls, heights, x, width, y, surfaceBlock) {
  for (let xx = x; xx < x + width; xx++) {
    for (let yy = y - 8; yy < y; yy++) setBlock(world, xx, yy, BLOCKS.air);
    for (let yy = y; yy < WORLD_H; yy++) {
      const depth = yy - y;
      world[yy][xx] =
        depth === 0
          ? surfaceBlock.id
          : depth < 4
            ? BLOCKS.dirt.id
            : BLOCKS.stone.id;
      walls[yy][xx] = depth < 4 ? WALLS.dirtBack.id : WALLS.stoneBack.id;
    }
    heights[xx] = y;
  }
}

function addCabin(world, walls, heights, x) {
  const width = 11;
  if (!isBuildableSurface(world, heights, x, width, new Set([BLOCKS.grass.id])))
    return false;

  const floorY = Math.max(...heights.slice(x, x + width));
  flattenSurface(world, walls, heights, x, width, floorY, BLOCKS.grass);

  for (let xx = x; xx < x + width; xx++) {
    setBlock(world, xx, floorY - 1, BLOCKS.wood);
  }
  for (let yy = floorY - 6; yy <= floorY - 1; yy++) {
    setBlock(world, x, yy, BLOCKS.wood);
    setBlock(world, x + width - 1, yy, BLOCKS.wood);
  }
  for (let xx = x - 1; xx <= x + width; xx++) {
    setBlock(world, xx, floorY - 7, BLOCKS.wood);
  }
  for (let yy = floorY - 6; yy <= floorY - 2; yy++) {
    for (let xx = x + 1; xx < x + width - 1; xx++) {
      setWall(walls, xx, yy, WALLS.woodWall);
    }
  }

  setBlock(world, x + 3, floorY - 4, BLOCKS.glass);
  setBlock(world, x + 7, floorY - 4, BLOCKS.glass);
  setBlock(world, x + 5, floorY - 2, BLOCKS.air);
  setBlock(world, x + 5, floorY - 1, BLOCKS.air);
  return true;
}

function addRuin(world, walls, heights, x) {
  const width = 9;
  if (!isBuildableSurface(world, heights, x, width, new Set([BLOCKS.sand.id])))
    return false;

  const floorY = Math.max(...heights.slice(x, x + width));
  flattenSurface(world, walls, heights, x, width, floorY, BLOCKS.sand);

  for (let xx = x; xx < x + width; xx++) {
    setBlock(world, xx, floorY - 1, BLOCKS.brick);
  }
  for (let yy = floorY - 5; yy <= floorY - 2; yy++) {
    if (hashNoise(yy + x, 45) > 0.2) setBlock(world, x, yy, BLOCKS.brick);
    if (hashNoise(yy + x, 98) > 0.32) setBlock(world, x + width - 1, yy, BLOCKS.brick);
  }
  for (let xx = x + 1; xx < x + width - 1; xx++) {
    if (hashNoise(xx, 140) > 0.28) setBlock(world, xx, floorY - 5, BLOCKS.brick);
  }
  for (let yy = floorY - 4; yy <= floorY - 2; yy++) {
    for (let xx = x + 1; xx < x + width - 1; xx++) {
      setWall(walls, xx, yy, WALLS.brickWall);
    }
  }

  return true;
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

  for (let x = 90; x < WORLD_W - 90; x += 170) {
    const biome = biomes[x];
    const roll = hashNoise(x, seed + 2600);
    if ((biome === "plains" || biome === "forest") && roll > 0.62) {
      addCabin(world, walls, heights, x);
    } else if ((biome === "beach" || biome === "desert") && roll > 0.54) {
      addRuin(world, walls, heights, x);
    }
  }

  addOres(world, seed);

  return { world, walls, waterLevels, waterSources, biomes };
}

export function makeClouds() {
  return Array.from({ length: 8 }, (_, i) => ({
    x: i * 180 + Math.random() * 90,
    y: 42 + Math.random() * 115,
    speed: 5 + Math.random() * 9,
    scale: 0.7 + Math.random() * 0.7,
  }));
}

export function createPlayer() {
  return {
    x: 15 * TILE,
    y: 10 * TILE,
    vx: 0,
    vy: 0,
    w: TILE,
    h: 60,
    onGround: false,
    coyoteTime: 0,
    facing: 1,
  };
}

export function createStats(
  message = "WASD / arrows to move. Hold Shift to run. Left click mines. Right click builds. Press B for walls. Press 0 for water.",
) {
  return { blocksMined: 0, blocksPlaced: 0, wallsBuilt: 0, message };
}

export function emitParticles(particles, x, y, color, amount = 8) {
  for (let i = 0; i < amount; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: -1.5 - Math.random() * 3,
      life: 0.38 + Math.random() * 0.28,
      maxLife: 0.6,
      size: 2 + Math.random() * 4,
      color,
    });
  }
}

export function rectHitsSolid(world, x, y, w, h) {
  const left = Math.floor(x / TILE);
  const right = Math.floor((x + w - 1) / TILE);
  const top = Math.floor(y / TILE);
  const bottom = Math.floor((y + h - 1) / TILE);

  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (ty < 0 || ty >= WORLD_H || tx < 0 || tx >= WORLD_W) return true;
      if (BLOCK_BY_ID[world[ty][tx]]?.solid) return true;
    }
  }

  return false;
}

export function updateParticles(particles, dt) {
  const next = [];
  const frameScale = dt * 60;
  const damping = 0.96 ** frameScale;

  for (const particle of particles) {
    const updated = {
      ...particle,
      x: particle.x + particle.vx * frameScale,
      y: particle.y + particle.vy * frameScale,
      vx: particle.vx * damping,
      vy: particle.vy + 0.18 * frameScale,
      life: particle.life - dt,
    };

    if (updated.life > 0) next.push(updated);
  }

  return next;
}
