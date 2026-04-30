import { BEDROCK_LAYERS, BLOCKS, WORLD_H, WORLD_W } from "../constants";
import { hashNoise } from "./noise";
import { inWorld } from "./utils";

function addOreVeins(world, seed, block, options) {
  const {
    count,
    minY,
    maxY,
    maxRadius,
    seedOffset,
  } = options;
  const safeMaxY = Math.min(maxY, WORLD_H - BEDROCK_LAYERS - 1);

  for (let i = 0; i < count; i++) {
    const centerX =
      4 +
      Math.floor(hashNoise(i * 9.71, seed + seedOffset) * (WORLD_W - 8));
    const centerY =
      minY +
      Math.floor(
        hashNoise(i * 6.13, seed + seedOffset + 100) *
          Math.max(1, safeMaxY - minY + 1),
      );
    const radius =
      1 + Math.floor(hashNoise(i * 3.91, seed + seedOffset + 200) * maxRadius);

    for (let y = centerY - radius; y <= centerY + radius; y++) {
      for (let x = centerX - radius; x <= centerX + radius; x++) {
        if (!inWorld(x, y) || world[y][x] !== BLOCKS.stone.id) continue;
        const distance = Math.hypot(x - centerX, y - centerY);
        if (distance <= radius + hashNoise(x * 4.2 + y, seed) * 0.7) {
          world[y][x] = block.id;
        }
      }
    }
  }
}

export function addOres(world, seed) {
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

  addOreVeins(world, seed, BLOCKS.coalOre, {
    count: WORLD_W * 0.24,
    minY: 24,
    maxY: WORLD_H - 12,
    maxRadius: 4,
    seedOffset: 4100,
  });
}
