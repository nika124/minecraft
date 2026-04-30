import { BLOCK_BY_ID, TILE, WORLD_H, WORLD_W } from "./constants";
export { makeWorld } from "./worldgen";

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
  message = "WASD / arrows to move. Hold Shift to run. Left click mines. Right click builds. Press B to switch build layers. Press 0 for water.",
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
  const frameScale = dt * 60;
  const damping = 0.96 ** frameScale;

  for (const particle of particles) {
    const updated = {
      ...particle,
      x: particle.x + particle.vx * frameScale,
      y: particle.y + particle.vy * frameScale,
      vx: particle.vx * damping,
      vy: particle.vy + 0.18 * frameScale,
      life: particle.life - dt,
    };

    if (updated.life > 0) next.push(updated);
  }

  return next;
}
