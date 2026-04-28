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

function hashNoise(x) {
  const value = Math.sin(x * 127.1) * 43758.5453;
  return value - Math.floor(value);
}

function smoothNoise(x) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hashNoise(i) * (1 - u) + hashNoise(i + 1) * u;
}

function terrainHeight(x) {
  const n1 = smoothNoise(x * 0.045) * 11;
  const n2 = smoothNoise(x * 0.11) * 5;
  const n3 = smoothNoise(x * 0.018) * 17;
  return clamp(Math.floor(29 + n1 + n2 + n3), 12, WORLD_H - 8);
}

export function makeWorld() {
  const world = Array.from({ length: WORLD_H }, () =>
    Array(WORLD_W).fill(BLOCKS.air.id),
  );
  const walls = Array.from({ length: WORLD_H }, () =>
    Array(WORLD_W).fill(WALLS.empty.id),
  );

  for (let x = 0; x < WORLD_W; x++) {
    const height = terrainHeight(x);
    const beach = x > 18 && x < 34;

    for (let y = height; y < WORLD_H; y++) {
      if (y === height) {
        world[y][x] = beach ? BLOCKS.sand.id : BLOCKS.grass.id;
        walls[y][x] = beach ? WALLS.stoneBack.id : WALLS.dirtBack.id;
      } else if (y < height + 5) {
        world[y][x] = beach ? BLOCKS.sand.id : BLOCKS.dirt.id;
        walls[y][x] = WALLS.dirtBack.id;
      } else {
        const oreChance = smoothNoise(x * 0.31 + y * 0.13);
        world[y][x] =
          oreChance > 0.84 && y > height + 12 ? BLOCKS.ore.id : BLOCKS.stone.id;
        walls[y][x] = WALLS.stoneBack.id;
      }
    }
  }

  for (let x = 8; x < WORLD_W - 8; x += 9 + Math.floor(hashNoise(x) * 11)) {
    if (hashNoise(x * 3.7) < 0.58) continue;

    const ground = terrainHeight(x);
    if (ground <= 8 || ground >= WORLD_H || world[ground][x] === BLOCKS.sand.id)
      continue;

    const trunkHeight = 6 + Math.floor(hashNoise(x * 8.1) * 4);
    for (let y = ground - trunkHeight; y < ground; y++) {
      if (y > 0 && y < WORLD_H) world[y][x] = BLOCKS.wood.id;
    }

    const crownY = ground - trunkHeight;
    const branchDir = hashNoise(x * 4.9) > 0.5 ? 1 : -1;
    const branchY = crownY + 2;
    const branchX = x + branchDir;
    const secondBranchY = crownY + 1;
    const secondBranchX = x - branchDir;

    if (branchY > 0 && branchY < WORLD_H && branchX > 0 && branchX < WORLD_W) {
      world[branchY][branchX] = BLOCKS.wood.id;
    }

    if (
      secondBranchY > 0 &&
      secondBranchY < WORLD_H &&
      secondBranchX > 0 &&
      secondBranchX < WORLD_W &&
      hashNoise(x * 6.2) > 0.35
    ) {
      world[secondBranchY][secondBranchX] = BLOCKS.wood.id;
    }

    for (let yy = crownY - 5; yy <= crownY + 3; yy++) {
      for (let xx = x - 5; xx <= x + 5; xx++) {
        const dx = Math.abs(xx - x);
        const dy = yy - crownY;
        const lowerBulge = dy > 0 ? dy * 1.6 : Math.abs(dy) * 1.05;
        const edge = dx * 1.08 + lowerBulge;
        const fringe = hashNoise(xx * 9.7 + yy * 5.3);
        if (
          xx > 0 &&
          xx < WORLD_W &&
          yy > 0 &&
          yy < WORLD_H &&
          edge < 5.9 &&
          fringe > 0.05 + edge * 0.02 &&
          world[yy][xx] === BLOCKS.air.id
        ) {
          world[yy][xx] = BLOCKS.leaves.id;
        }
      }
    }

    for (let yy = crownY - 3; yy <= crownY + 1; yy++) {
      for (let xx = x - 2; xx <= x + 2; xx++) {
        if (xx > 0 && xx < WORLD_W && yy > 0 && yy < WORLD_H) {
          if (world[yy][xx] === BLOCKS.air.id) world[yy][xx] = BLOCKS.leaves.id;
        }
      }
    }
  }

  const baseX = 46;
  const baseY = terrainHeight(baseX) - 1;

  if (baseY > 8 && baseY < WORLD_H - 1) {
    for (let x = baseX; x < baseX + 9; x++) world[baseY][x] = BLOCKS.brick.id;
    for (let y = baseY - 5; y <= baseY; y++) {
      world[y][baseX] = BLOCKS.wood.id;
      world[y][baseX + 8] = BLOCKS.wood.id;
    }
    for (let x = baseX; x <= baseX + 8; x++) {
      world[baseY - 5][x] = BLOCKS.wood.id;
    }
    for (let y = baseY - 4; y <= baseY - 1; y++) {
      for (let x = baseX + 1; x <= baseX + 7; x++) {
        walls[y][x] = WALLS.woodWall.id;
      }
    }
    world[baseY - 3][baseX + 2] = BLOCKS.glass.id;
    world[baseY - 3][baseX + 6] = BLOCKS.glass.id;
    world[baseY - 1][baseX + 4] = BLOCKS.air.id;
    world[baseY][baseX + 4] = BLOCKS.air.id;
  }

  return { world, walls };
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

  for (const particle of particles) {
    const updated = {
      ...particle,
      x: particle.x + particle.vx,
      y: particle.y + particle.vy,
      vx: particle.vx * 0.96,
      vy: particle.vy + 0.18,
      life: particle.life - dt,
    };

    if (updated.life > 0) next.push(updated);
  }

  return next;
}
