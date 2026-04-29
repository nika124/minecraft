import { BLOCKS, WORLD_H, WORLD_W } from "../constants";
import { hashNoise } from "./noise";
import { inWorld } from "./utils";

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
}
