import { BLOCKS, WALLS, WORLD_H, WORLD_W } from "../constants";

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
  return inWorld(x, y) && allowedBlocks.has(world[y][x]) && !isWater(world, x, y - 1);
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
    if (hashNoise(yy + x, 98) > 0.32) {
      setBlock(world, x + width - 1, yy, BLOCKS.brick);
    }
  }
  for (let xx = x + 1; xx < x + width - 1; xx++) {
    if (hashNoise(xx, 140) > 0.28) {
      setBlock(world, xx, floorY - 5, BLOCKS.brick);
    }
  }
  for (let yy = floorY - 4; yy <= floorY - 2; yy++) {
    for (let xx = x + 1; xx < x + width - 1; xx++) {
      setWall(walls, xx, yy, WALLS.brickWall);
    }
  }

  return true;
}

export function placeStructures(world, walls, heights, biomes, seed) {
  for (let x = 90; x < WORLD_W - 90; x += 170) {
    const biome = biomes[x];
    const roll = hashNoise(x, seed + 2600);
    if ((biome === "plains" || biome === "forest") && roll > 0.62) {
      addCabin(world, walls, heights, x);
    } else if ((biome === "beach" || biome === "desert") && roll > 0.54) {
      addRuin(world, walls, heights, x);
    }
  }
}
