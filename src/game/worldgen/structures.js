import { BLOCKS, SEA_LEVEL, WALLS, WORLD_H, WORLD_W } from "../constants";

function hashNoise(x, seed = 1) {
  const value = Math.sin((x + seed) * 127.1) * 43758.5453;
  return value - Math.floor(value);
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

function isDrySurface(world, x, y, allowedBlocks) {
  return (
    inWorld(x, y) &&
    allowedBlocks.has(world[y][x]) &&
    !isWater(world, x, y - 1)
  );
}

function isBuildableSurface(world, heights, x, width, allowedBlocks) {
  if (x < 3 || x + width >= WORLD_W - 3) return false;

  const minY = Math.min(...heights.slice(x, x + width));
  const maxY = Math.max(...heights.slice(x, x + width));

  if (maxY - minY > 2) return false;
  if (maxY >= SEA_LEVEL) return false;

  for (let xx = x; xx < x + width; xx++) {
    if (!isDrySurface(world, xx, heights[xx], allowedBlocks)) return false;

    for (let yy = heights[xx] - 4; yy <= heights[xx] + 4; yy++) {
      if (isWater(world, xx, yy)) return false;
    }
  }

  return true;
}

function flattenSurface(world, walls, heights, x, width, y, surfaceBlock) {
  for (let xx = x; xx < x + width; xx++) {
    for (let yy = y - 12; yy < y; yy++) {
      setBlock(world, xx, yy, BLOCKS.air);
    }

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

function clearArea(world, x, y, width, height) {
  for (let yy = y; yy < y + height; yy++) {
    for (let xx = x; xx < x + width; xx++) {
      setBlock(world, xx, yy, BLOCKS.air);
    }
  }
}

function fillWallArea(walls, x, y, width, height, wall) {
  for (let yy = y; yy < y + height; yy++) {
    for (let xx = x; xx < x + width; xx++) {
      setWall(walls, xx, yy, wall);
    }
  }
}

function addCabin(world, walls, heights, x) {
  const width = 13;

  if (!isBuildableSurface(world, heights, x, width, new Set([BLOCKS.grass.id]))) {
    return false;
  }

  const floorY = Math.max(...heights.slice(x, x + width));
  flattenSurface(world, walls, heights, x, width, floorY, BLOCKS.grass);

  clearArea(world, x - 1, floorY - 9, width + 2, 9);

  // floor
  for (let xx = x; xx < x + width; xx++) {
    setBlock(world, xx, floorY - 1, BLOCKS.wood);
  }

  // side pillars
  for (let yy = floorY - 6; yy <= floorY - 1; yy++) {
    setBlock(world, x, yy, BLOCKS.wood);
    setBlock(world, x + width - 1, yy, BLOCKS.wood);
  }

  // roof, slightly nicer shape
  for (let xx = x - 1; xx <= x + width; xx++) {
    setBlock(world, xx, floorY - 7, BLOCKS.wood);
  }

  for (let xx = x + 1; xx < x + width - 1; xx++) {
    setBlock(world, xx, floorY - 8, BLOCKS.wood);
  }

  for (let xx = x + 3; xx < x + width - 3; xx++) {
    setBlock(world, xx, floorY - 9, BLOCKS.wood);
  }

  // background interior
  fillWallArea(walls, x + 1, floorY - 6, width - 2, 5, WALLS.woodWall);

  // windows should be background, not solid blocks
  setWall(walls, x + 3, floorY - 4, WALLS.glassWall ?? WALLS.woodWall);
  setWall(walls, x + 9, floorY - 4, WALLS.glassWall ?? WALLS.woodWall);

  // door
  setBlock(world, x + 6, floorY - 2, BLOCKS.air);
  setBlock(world, x + 6, floorY - 1, BLOCKS.air);

  // small torches
  setBlock(world, x + 1, floorY - 4, BLOCKS.torch);
  setBlock(world, x + width - 2, floorY - 4, BLOCKS.torch);

  return true;
}

function addRuinedCabin(world, walls, heights, x, seed) {
  const width = 12;

  if (!isBuildableSurface(world, heights, x, width, new Set([BLOCKS.grass.id]))) {
    return false;
  }

  const floorY = Math.max(...heights.slice(x, x + width));
  flattenSurface(world, walls, heights, x, width, floorY, BLOCKS.grass);

  clearArea(world, x - 1, floorY - 8, width + 2, 8);

  // broken floor
  for (let xx = x; xx < x + width; xx++) {
    if (hashNoise(xx, seed + 10) > 0.18) {
      setBlock(world, xx, floorY - 1, BLOCKS.wood);
    }
  }

  // broken pillars
  for (let yy = floorY - 5; yy <= floorY - 1; yy++) {
    if (hashNoise(yy + x, seed + 20) > 0.15) setBlock(world, x, yy, BLOCKS.wood);
    if (hashNoise(yy + x, seed + 30) > 0.3)
      setBlock(world, x + width - 1, yy, BLOCKS.wood);
  }

  // damaged roof
  for (let xx = x - 1; xx <= x + width; xx++) {
    if (hashNoise(xx, seed + 40) > 0.35) {
      setBlock(world, xx, floorY - 6, BLOCKS.wood);
    }
  }

  // old background walls
  for (let yy = floorY - 5; yy <= floorY - 2; yy++) {
    for (let xx = x + 1; xx < x + width - 1; xx++) {
      if (hashNoise(xx * 7 + yy, seed + 50) > 0.25) {
        setWall(walls, xx, yy, WALLS.woodWall);
      }
    }
  }

  // broken background window
  setWall(walls, x + 3, floorY - 4, WALLS.glassWall ?? WALLS.woodWall);

  return true;
}

function addStoneTower(world, walls, heights, x) {
  const width = 7;

  if (!isBuildableSurface(world, heights, x, width, new Set([BLOCKS.grass.id]))) {
    return false;
  }

  const floorY = Math.max(...heights.slice(x, x + width));
  flattenSurface(world, walls, heights, x, width, floorY, BLOCKS.grass);

  clearArea(world, x - 1, floorY - 14, width + 2, 14);

  for (let yy = floorY - 11; yy <= floorY - 1; yy++) {
    setBlock(world, x, yy, BLOCKS.stone);
    setBlock(world, x + width - 1, yy, BLOCKS.stone);

    for (let xx = x + 1; xx < x + width - 1; xx++) {
      setWall(walls, xx, yy, WALLS.stoneWall ?? WALLS.stoneBack);
    }
  }

  for (let xx = x - 1; xx <= x + width; xx++) {
    setBlock(world, xx, floorY - 12, BLOCKS.stone);
  }

  // battlements
  for (let xx = x - 1; xx <= x + width; xx += 2) {
    setBlock(world, xx, floorY - 13, BLOCKS.stone);
  }

  // background windows
  setWall(walls, x + 3, floorY - 9, WALLS.glassWall ?? WALLS.stoneWall);
  setWall(walls, x + 3, floorY - 6, WALLS.glassWall ?? WALLS.stoneWall);

  // door
  setBlock(world, x + 3, floorY - 2, BLOCKS.air);
  setBlock(world, x + 3, floorY - 1, BLOCKS.air);

  return true;
}

function addRuin(world, walls, heights, x, seed) {
  const width = 10;

  if (!isBuildableSurface(world, heights, x, width, new Set([BLOCKS.sand.id]))) {
    return false;
  }

  const floorY = Math.max(...heights.slice(x, x + width));
  flattenSurface(world, walls, heights, x, width, floorY, BLOCKS.sand);

  clearArea(world, x - 1, floorY - 7, width + 2, 7);

  for (let xx = x; xx < x + width; xx++) {
    setBlock(world, xx, floorY - 1, BLOCKS.brick);
  }

  for (let yy = floorY - 5; yy <= floorY - 2; yy++) {
    if (hashNoise(yy + x, seed + 45) > 0.2) {
      setBlock(world, x, yy, BLOCKS.brick);
    }

    if (hashNoise(yy + x, seed + 98) > 0.32) {
      setBlock(world, x + width - 1, yy, BLOCKS.brick);
    }
  }

  for (let xx = x + 1; xx < x + width - 1; xx++) {
    if (hashNoise(xx, seed + 140) > 0.28) {
      setBlock(world, xx, floorY - 5, BLOCKS.brick);
    }
  }

  for (let yy = floorY - 4; yy <= floorY - 2; yy++) {
    for (let xx = x + 1; xx < x + width - 1; xx++) {
      if (hashNoise(xx * 4 + yy, seed + 160) > 0.18) {
        setWall(walls, xx, yy, WALLS.brickWall);
      }
    }
  }

  return true;
}

function addDesertWell(world, walls, heights, x) {
  const width = 7;

  if (!isBuildableSurface(world, heights, x, width, new Set([BLOCKS.sand.id]))) {
    return false;
  }

  const floorY = Math.max(...heights.slice(x, x + width));
  flattenSurface(world, walls, heights, x, width, floorY, BLOCKS.sand);

  clearArea(world, x - 1, floorY - 7, width + 2, 7);

  // base
  for (let xx = x + 1; xx <= x + 5; xx++) {
    setBlock(world, xx, floorY - 1, BLOCKS.brick);
  }

  // water center
  setBlock(world, x + 3, floorY - 2, BLOCKS.water);

  // pillars
  for (let yy = floorY - 5; yy <= floorY - 2; yy++) {
    setBlock(world, x + 1, yy, BLOCKS.brick);
    setBlock(world, x + 5, yy, BLOCKS.brick);
  }

  // roof
  for (let xx = x; xx < x + width; xx++) {
    setBlock(world, xx, floorY - 6, BLOCKS.brick);
  }

  return true;
}

function addForestShrine(world, walls, heights, x) {
  const width = 9;

  if (!isBuildableSurface(world, heights, x, width, new Set([BLOCKS.grass.id]))) {
    return false;
  }

  const floorY = Math.max(...heights.slice(x, x + width));
  flattenSurface(world, walls, heights, x, width, floorY, BLOCKS.grass);

  clearArea(world, x - 1, floorY - 8, width + 2, 8);

  for (let xx = x + 2; xx <= x + 6; xx++) {
    setBlock(world, xx, floorY - 1, BLOCKS.stone);
  }

  setBlock(world, x + 2, floorY - 2, BLOCKS.wood);
  setBlock(world, x + 6, floorY - 2, BLOCKS.wood);
  setBlock(world, x + 2, floorY - 3, BLOCKS.wood);
  setBlock(world, x + 6, floorY - 3, BLOCKS.wood);

  for (let xx = x + 1; xx <= x + 7; xx++) {
    setBlock(world, xx, floorY - 4, BLOCKS.leaves);
  }

  setBlock(world, x + 4, floorY - 2, BLOCKS.torch);
  setWall(walls, x + 4, floorY - 3, WALLS.woodWall);

  return true;
}

export function placeStructures(world, walls, heights, biomes, seed) {
  const minGap = 95;
  const used = [];

  function canUse(x) {
    return used.every((oldX) => Math.abs(oldX - x) > minGap);
  }

  function mark(x) {
    used.push(x);
  }

  for (let x = 70; x < WORLD_W - 90; x += 80) {
    if (!canUse(x)) continue;

    const biome = biomes[x];
    const roll = hashNoise(x, seed + 2600);

    let placed = false;

    if (biome === "forest") {
      if (roll > 0.78) placed = addForestShrine(world, walls, heights, x);
      else if (roll > 0.58) placed = addRuinedCabin(world, walls, heights, x, seed);
      else if (roll > 0.38) placed = addCabin(world, walls, heights, x);
    }

    if (biome === "plains") {
      if (roll > 0.72) placed = addStoneTower(world, walls, heights, x);
      else if (roll > 0.45) placed = addCabin(world, walls, heights, x);
    }

    if (biome === "beach" || biome === "desert") {
      if (roll > 0.72) placed = addDesertWell(world, walls, heights, x);
      else if (roll > 0.42) placed = addRuin(world, walls, heights, x, seed);
    }

    if (placed) mark(x);
  }
}
