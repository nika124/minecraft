import { BLOCKS, WORLD_H, WORLD_W } from "../constants";
import { hashNoise } from "./noise";
import { inWorld, isDrySurface, isWater } from "./utils";

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

  for (let y = crownY; y < groundY; y++) {
    placeWood(world, x, y);
  }

  addRoots(world, x, groundY, seed);
  placeWood(world, x - 1, crownY + 2);
  placeWood(world, x - 2, crownY + 2);
  placeWood(world, x + 1, crownY + 3);
  placeWood(world, x + 2, crownY + 3);

  addLeafOval(world, x, crownY - 1, 4, 3, seed + 10);
  addLeafOval(world, x - 2, crownY + 1, 3, 3, seed + 20);
  addLeafOval(world, x + 2, crownY + 1, 3, 3, seed + 30);
  addLeafOval(world, x, crownY + 2, 3, 2, seed + 40);

  for (let yy = crownY - 2; yy <= crownY + 2; yy++) {
    for (let xx = x - 2; xx <= x + 2; xx++) {
      placeLeafSolid(world, xx, yy);
    }
  }

  protectTrunk(world, x, crownY, groundY - 1);
}

function addTallOakTree(world, x, groundY, trunkHeight, seed) {
  const crownY = groundY - trunkHeight;

  for (let y = crownY; y < groundY; y++) {
    placeWood(world, x, y);
    if (y > groundY - 4) {
      if (hashNoise(y + x, seed + 50) > 0.35) placeWood(world, x - 1, y);
      if (hashNoise(y + x, seed + 60) > 0.35) placeWood(world, x + 1, y);
    }
  }

  addRoots(world, x, groundY, seed);
  placeWood(world, x - 1, crownY + 3);
  placeWood(world, x - 2, crownY + 3);
  placeWood(world, x - 3, crownY + 2);
  placeWood(world, x + 1, crownY + 4);
  placeWood(world, x + 2, crownY + 4);
  placeWood(world, x + 3, crownY + 3);

  addLeafOval(world, x, crownY - 2, 4, 3, seed + 100);
  addLeafOval(world, x - 3, crownY + 1, 3, 3, seed + 110);
  addLeafOval(world, x + 3, crownY + 1, 3, 3, seed + 120);
  addLeafOval(world, x, crownY + 2, 4, 3, seed + 130);

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

  placeLeafSolid(world, x, topY - 1);
  placeLeafSolid(world, x - 1, topY);
  placeLeafSolid(world, x, topY);
  placeLeafSolid(world, x + 1, topY);

  protectTrunk(world, x, topY + 2, groundY - 1);
}

export function addTree(world, heights, x, seed, tall = false) {
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
