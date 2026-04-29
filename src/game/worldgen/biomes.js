import { fbmNoise } from "./noise";

export function getBiome(x, seed = 1) {
  const climate = fbmNoise(x * 0.008, seed + 900, 3);
  const moisture = fbmNoise(x * 0.012, seed + 1300, 3);

  if (climate < 0.18) return "beach";
  if (climate > 0.78 && moisture < 0.55) return "desert";
  if (moisture > 0.68) return "forest";
  if (climate > 0.62) return "hills";
  return "plains";
}
