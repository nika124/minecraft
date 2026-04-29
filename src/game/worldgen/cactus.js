import { BLOCKS } from "../constants";
import { hashNoise } from "./noise";
import { isDrySurface, setBlock } from "./utils";

export function addCactus(world, x, groundY, seed) {
  if (
    groundY <= 7 ||
    !isDrySurface(world, x, groundY, new Set([BLOCKS.sand.id]))
  ) {
    return;
  }

  const height = 3 + Math.floor(hashNoise(x * 2.3, seed) * 3);
  for (let y = groundY - height; y < groundY; y++) {
    setBlock(world, x, y, BLOCKS.leaves);
  }
}
