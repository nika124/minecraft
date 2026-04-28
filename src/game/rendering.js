import { BLOCKS, TILE, VIEW_H, VIEW_W, WORLD_H, WORLD_W } from "./constants";
import { getBlockTexture, getWallTexture } from "./textures";
import { clamp } from "./world";

export function drawWall(ctx, wall, x, y, size) {
  if (!wall || wall.id === 0) return;
  ctx.drawImage(getWallTexture(wall), x, y, size, size);
}

export function drawBlock(ctx, block, x, y, size, time, waterLevel = 0) {
  if (!block || block.id === 0) return;

  if (block.id === BLOCKS.water.id) {
    const texture = getBlockTexture(block);
    const alpha = clamp(0.86 - waterLevel * 0.08, 0.42, 0.86);
    const bob = Math.sin(time * 4 + x * 0.08 + y * 0.05) * 1.5;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(texture, x, y, size, size);
    ctx.fillStyle = "rgba(210,245,255,.28)";
    ctx.fillRect(x + 3 + bob, y + 6, size - 10, 2);
    ctx.fillRect(x + 10 - bob, y + 18, size - 14, 2);
    ctx.restore();
    return;
  }

  if (block.id === BLOCKS.torch.id) {
    ctx.save();
    const flame = Math.sin(time * 14 + x * 0.04 + y * 0.03) * 1.4;
    ctx.shadowColor = "rgba(251,191,36,.65)";
    ctx.shadowBlur = 8;
    ctx.drawImage(getBlockTexture(block), x, y, size, size);
    ctx.fillStyle = `rgba(253,230,138,${0.18 + Math.max(0, flame) * 0.03})`;
    ctx.beginPath();
    ctx.ellipse(x + size / 2, y + 10 + flame * 0.2, 4, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.drawImage(getBlockTexture(block), x, y, size, size);
}

function drawPixelLimb(
  ctx,
  x,
  y,
  w,
  h,
  color,
  angle,
  originX = w / 2,
  originY = 2,
) {
  ctx.save();
  ctx.translate(x + originX, y + originY);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.fillRect(-originX, -originY, w, h);
  ctx.fillStyle = "rgba(255,255,255,.12)";
  ctx.fillRect(-originX + 1, -originY + 1, Math.max(2, w - 2), 3);
  ctx.strokeStyle = "rgba(0,0,0,.35)";
  ctx.strokeRect(-originX + 0.5, -originY + 0.5, w - 1, h - 1);
  ctx.restore();
}

function drawPixelLeg(
  ctx,
  hipX,
  hipY,
  phase,
  mainColor,
  darkColor,
  bootColor,
  running,
  isFrontLeg,
) {
  const upperLen = 12;
  const lowerLen = 10;
  const legW = 8;
  const maxUpper = running ? 0.34 : 0.22;
  const maxLower = running ? 0.3 : 0.2;
  const upperAngle = phase * maxUpper;
  const lowerAngle = -phase * maxLower - Math.max(0, Math.abs(phase) - 0.35) * 0.1;
  const footLift = Math.max(0, -phase) * (running ? 3.4 : 2.2);
  const kneeX = hipX + Math.sin(upperAngle) * upperLen;
  const kneeY = hipY + Math.cos(upperAngle) * upperLen;
  const footX = kneeX + Math.sin(upperAngle + lowerAngle) * lowerLen;
  const footY = kneeY + Math.cos(upperAngle + lowerAngle) * lowerLen - footLift;

  ctx.save();
  ctx.translate(hipX, hipY);
  ctx.rotate(upperAngle);
  ctx.fillStyle = mainColor;
  ctx.fillRect(-legW / 2, 0, legW, upperLen + 2);
  ctx.fillStyle = "rgba(255,255,255,.1)";
  ctx.fillRect(-legW / 2 + 1, 1, 2, upperLen);
  ctx.strokeStyle = "rgba(0,0,0,.32)";
  ctx.strokeRect(-legW / 2 + 0.5, 0.5, legW - 1, upperLen + 1);
  ctx.restore();

  ctx.save();
  ctx.translate(kneeX, kneeY);
  ctx.rotate(upperAngle + lowerAngle);
  ctx.fillStyle = darkColor;
  ctx.fillRect(-legW / 2, 0, legW, lowerLen + 2);
  ctx.strokeStyle = "rgba(0,0,0,.34)";
  ctx.strokeRect(-legW / 2 + 0.5, 0.5, legW - 1, lowerLen + 1);
  ctx.restore();

  ctx.save();
  ctx.translate(footX, footY + 1);
  ctx.rotate(phase * (running ? 0.08 : 0.04));
  ctx.fillStyle = bootColor;
  ctx.fillRect(isFrontLeg ? -5 : -6, 0, 12, 6);
  ctx.fillStyle = "rgba(255,255,255,.08)";
  ctx.fillRect(isFrontLeg ? -4 : -5, 1, 8, 2);
  ctx.strokeStyle = "rgba(0,0,0,.35)";
  ctx.strokeRect((isFrontLeg ? -5 : -6) + 0.5, 0.5, 11, 5);
  ctx.restore();
}

function drawHeldItem(ctx, item, itemType, armAngle) {
  if (!item) return;

  const texture =
    itemType === "wall" ? getWallTexture(item) : getBlockTexture(item);
  const size = item?.id === BLOCKS.torch.id ? 12 : 14;
  const baseRotation = item?.id === BLOCKS.torch.id ? -0.2 : -0.08;

  ctx.save();
  ctx.translate(30.5, 47);
  ctx.rotate(armAngle + baseRotation);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(texture, -2, -size + 2, size, size);
  ctx.restore();
}

export function drawPlayer(
  ctx,
  px,
  py,
  time,
  vx,
  onGround,
  facing,
  running,
  heldItem,
  heldItemType,
) {
  const speedAbs = Math.abs(vx);
  const moving = speedAbs > 0.25;
  const runBoost = running ? 1.35 : 1;
  const cycle = time * (moving ? 8.2 * runBoost + speedAbs * 0.25 : 3);
  const stride = moving ? Math.sin(cycle) : 0;
  const counterStride = moving ? Math.sin(cycle + Math.PI) : 0;
  const heelPlant = moving && onGround ? Math.cos(cycle) * 0.8 : 0;
  const bob =
    moving && onGround ? Math.abs(Math.sin(cycle)) * (running ? 2 : 1.1) : 0;
  const torsoTilt =
    moving && onGround ? stride * (running ? 0.045 : 0.026) : 0;
  const jumpLift = !onGround ? -2.2 : 0;
  const armAngleA = counterStride * (running ? 0.82 : 0.5) - heelPlant * 0.02;
  const armAngleB = stride * (running ? 0.82 : 0.5) + heelPlant * 0.02;

  ctx.save();
  ctx.translate(px, py + jumpLift);

  if (facing < 0) {
    ctx.translate(36, 0);
    ctx.scale(-1, 1);
  }

  ctx.fillStyle = "rgba(0,0,0,.25)";
  ctx.beginPath();
  ctx.ellipse(18, 62, running ? 16 : 13, moving ? 4.5 : 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.translate(heelPlant * 0.45, bob);
  drawPixelLimb(ctx, 2, 26, 7, 24, "#c98d58", armAngleA, 3.5, 3);
  drawPixelLeg(
    ctx,
    12,
    39,
    stride,
    "#265db2",
    "#214f99",
    "#202020",
    running,
    false,
  );
  drawPixelLeg(
    ctx,
    23,
    39,
    counterStride,
    "#2a63bd",
    "#214f99",
    "#181818",
    running,
    true,
  );

  ctx.save();
  ctx.translate(18, 26);
  ctx.rotate(torsoTilt);
  ctx.fillStyle = "#2f7ee6";
  ctx.fillRect(-10, -2, 20, 27);
  ctx.fillStyle = "rgba(255,255,255,.16)";
  ctx.fillRect(-8, 0, 16, 5);
  ctx.fillStyle = running ? "rgba(125,230,255,.22)" : "rgba(0,0,0,.08)";
  ctx.fillRect(-10, 21, 20, 4);
  ctx.strokeStyle = "rgba(0,0,0,.45)";
  ctx.strokeRect(-9.5, -1.5, 19, 26);
  ctx.restore();

  drawPixelLimb(ctx, 27, 26, 7, 24, "#d59a63", armAngleB, 3.5, 3);
  drawHeldItem(ctx, heldItem, heldItemType, armAngleB);

  ctx.fillStyle = "#c98d58";
  ctx.fillRect(14, 23, 8, 4);

  ctx.save();
  ctx.translate(18, 15);
  ctx.rotate(torsoTilt * 0.45);
  ctx.fillStyle = "#d59a63";
  ctx.fillRect(-12, -11, 24, 22);
  ctx.fillStyle = "#5b351e";
  ctx.fillRect(-12, -11, 24, 7);
  ctx.fillRect(-12, -4, 5, 5);
  ctx.fillStyle = "#10131a";
  ctx.fillRect(-5, 0, 3, 3);
  ctx.fillRect(5, 0, 3, 3);
  ctx.fillStyle = running ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.08)";
  ctx.fillRect(-9, -8, 10, 2);
  ctx.strokeStyle = "rgba(0,0,0,.45)";
  ctx.strokeRect(-11.5, -10.5, 23, 21);
  ctx.restore();

  if (running && moving && onGround) {
    ctx.strokeStyle = "rgba(180,235,255,.28)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-5, 34);
    ctx.lineTo(-18, 34);
    ctx.moveTo(-2, 45);
    ctx.lineTo(-15, 45);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawParticles(ctx, particles, cam) {
  ctx.save();

  for (const particle of particles) {
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.fillRect(
      particle.x - cam.x,
      particle.y - cam.y,
      particle.size,
      particle.size,
    );
  }

  ctx.restore();
}

export function drawTorchLights(
  ctx,
  world,
  skyCoverage,
  cam,
  startX,
  endX,
  startY,
  endY,
  night,
  time,
) {
  const torches = [];
  const pad = 10;

  for (
    let y = Math.max(0, startY - pad);
    y < Math.min(world.length, endY + pad);
    y++
  ) {
    for (
      let x = Math.max(0, startX - pad);
      x < Math.min(world[y].length, endX + pad);
      x++
    ) {
      if (world[y][x] === BLOCKS.torch.id) torches.push({ x, y });
    }
  }

  if (torches.length === 0) return;

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.imageSmoothingEnabled = true;

  for (const torch of torches) {
    const cx = torch.x * TILE - cam.x + TILE / 2;
    const cy = torch.y * TILE - cam.y + TILE / 2;
    const covered = skyCoverage[torch.y]?.[torch.x] ?? 0;
    const usefulDarkness = clamp(night * 0.42 + covered * 0.72, 0.06, 1);
    const pulse = Math.sin((torch.x + torch.y) * 0.9 + time * 8) * 0.014;
    const gradient = ctx.createRadialGradient(cx, cy, 2, cx, cy, 48);
    gradient.addColorStop(
      0,
      `rgba(255,204,105,${0.16 + usefulDarkness * 0.08 + pulse})`,
    );
    gradient.addColorStop(
      0.42,
      `rgba(249,115,22,${0.05 + usefulDarkness * 0.045})`,
    );
    gradient.addColorStop(1, "rgba(251,146,60,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(cx - 48, cy - 48, 96, 96);
  }

  ctx.restore();
}

function torchRevealAt(world, skyCoverage, x, y) {
  let reveal = 0;
  const radius = 8.5;
  const minY = Math.max(0, Math.floor(y - radius));
  const maxY = Math.min(world.length - 1, Math.ceil(y + radius));
  const minX = Math.max(0, Math.floor(x - radius));
  const maxX = Math.min(world[0].length - 1, Math.ceil(x + radius));

  for (let ty = minY; ty <= maxY; ty++) {
    for (let tx = minX; tx <= maxX; tx++) {
      if (world[ty][tx] !== BLOCKS.torch.id) continue;

      const distance = Math.hypot(x - tx, y - ty);
      if (distance >= radius) continue;

      const covered = skyCoverage[ty]?.[tx] ?? 0;
      const usefulDarkness = clamp(covered * 0.86, 0.2, 1);
      const falloff = 1 - distance / radius;
      const smooth = falloff * falloff * (3 - 2 * falloff);
      reveal += smooth * usefulDarkness;
    }
  }

  return clamp(reveal, 0, 0.9);
}

function sunlightOpacity(blockId) {
  if (
    blockId === BLOCKS.air.id ||
    blockId === BLOCKS.torch.id ||
    blockId === BLOCKS.water.id
  )
    return 0;
  if (blockId === BLOCKS.glass.id || blockId === BLOCKS.leaves.id) return 0;
  if (blockId === BLOCKS.wood.id) return 0.82;
  return 1;
}

export function createSkyCoverage(world) {
  const coverage = Array.from({ length: WORLD_H }, () =>
    Array(WORLD_W).fill(0),
  );

  for (let x = 0; x < WORLD_W; x++) {
    updateSkyCoverageColumn(world, coverage, x);
  }

  return coverage;
}

export function updateSkyCoverageColumn(world, coverage, x) {
  if (x < 0 || x >= WORLD_W) return;

  let cover = 0;

  for (let y = 0; y < WORLD_H; y++) {
    coverage[y][x] = cover;

    const opacity = sunlightOpacity(world[y][x]);
    cover = clamp(cover + opacity * (1 - cover), 0, 1);
  }
}

function softCoverageAt(coverage, y, x) {
  let total = coverage[y][x] * 0.34;
  let weight = 0.34;

  if (x > 0) {
    total += coverage[y][x - 1] * 0.22;
    weight += 0.22;
  }

  if (x < coverage[y].length - 1) {
    total += coverage[y][x + 1] * 0.22;
    weight += 0.22;
  }

  if (y > 0) {
    total += coverage[y - 1][x] * 0.11;
    weight += 0.11;
  }

  if (y < coverage.length - 1) {
    total += coverage[y + 1][x] * 0.11;
    weight += 0.11;
  }

  return total / weight;
}

let lightMaskCanvas;

export function drawLightMask(
  ctx,
  skyCoverage,
  world,
  cam,
  startX,
  endX,
  startY,
  endY,
  day,
) {
  const night = 1 - day;
  const openSkyShade = 0.035 + night * 0.4;
  const blockedShade = 0.5 + night * 0.18;
  const maskW = endX - startX;
  const maskH = endY - startY;

  if (!lightMaskCanvas) lightMaskCanvas = document.createElement("canvas");
  if (lightMaskCanvas.width !== maskW) lightMaskCanvas.width = maskW;
  if (lightMaskCanvas.height !== maskH) lightMaskCanvas.height = maskH;

  const maskCtx = lightMaskCanvas.getContext("2d");
  maskCtx.clearRect(0, 0, maskW, maskH);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const cover = softCoverageAt(skyCoverage, y, x);
      const depthShade = cover * cover * y * 0.0012;
      const baseAlpha = clamp(
        openSkyShade + cover * blockedShade + depthShade,
        0,
        0.84,
      );
      const reveal = torchRevealAt(world, skyCoverage, x, y);
      const alpha = baseAlpha * (1 - reveal);

      maskCtx.fillStyle = `rgba(3,9,25,${alpha})`;
      maskCtx.fillRect(x - startX, y - startY, 1, 1);
    }
  }

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(
    lightMaskCanvas,
    startX * TILE - cam.x,
    startY * TILE - cam.y,
    maskW * TILE,
    maskH * TILE,
  );

  const haze = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  haze.addColorStop(0, `rgba(3,9,25,${night * 0.05})`);
  haze.addColorStop(1, `rgba(3,9,25,${night * 0.16})`);
  ctx.fillStyle = haze;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  ctx.restore();
}
