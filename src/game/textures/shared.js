import { TILE } from "../constants";

const textureCache = new Map();

export function noise(seed) {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

export function makeTexture(key, draw) {
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = document.createElement("canvas");
  canvas.width = TILE;
  canvas.height = TILE;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  textureCache.set(key, canvas);
  return canvas;
}

export function fillBase(ctx, color) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, TILE, TILE);
}

export function speckles(ctx, colors, count, seed, min = 1, max = 3) {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(noise(seed + i * 3.1) * TILE);
    const y = Math.floor(noise(seed + i * 7.7) * TILE);
    const size = min + Math.floor(noise(seed + i * 11.4) * (max - min + 1));
    ctx.fillStyle = colors[Math.floor(noise(seed + i * 13.3) * colors.length)];
    ctx.fillRect(x, y, size, size);
  }
}

export function drawBevel(
  ctx,
  light = "rgba(255,255,255,.12)",
  dark = "rgba(0,0,0,.28)",
) {
  ctx.fillStyle = light;
  ctx.fillRect(1, 1, TILE - 2, 3);
  ctx.fillRect(1, 1, 3, TILE - 2);
  ctx.fillStyle = dark;
  ctx.fillRect(1, TILE - 4, TILE - 2, 3);
  ctx.fillRect(TILE - 4, 1, 3, TILE - 2);
  ctx.strokeStyle = "rgba(0,0,0,.3)";
  ctx.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
}

export function drawStoneCracks(ctx, seed = 0, alpha = 0.2) {
  ctx.strokeStyle = `rgba(235,245,255,${alpha})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(4 + noise(seed) * 4, 11);
  ctx.lineTo(14 + noise(seed + 1) * 4, 7);
  ctx.lineTo(26 + noise(seed + 2) * 3, 17);
  ctx.moveTo(5, 25);
  ctx.lineTo(13 + noise(seed + 3) * 5, 22);
  ctx.lineTo(25, 24 + noise(seed + 4) * 3);
  ctx.stroke();
}
