export function hashNoise(x, seed = 1) {
  const value = Math.sin((x + seed) * 127.1) * 43758.5453;
  return value - Math.floor(value);
}

export function smoothNoise(x, seed = 1) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);

  return hashNoise(i, seed) * (1 - u) + hashNoise(i + 1, seed) * u;
}

export function fbmNoise(x, seed = 1, octaves = 4) {
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
