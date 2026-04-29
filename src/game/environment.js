import { VIEW_H, VIEW_W } from "./constants";

const DAY_CYCLE_SPEED = 0.018;

export function makeRainDrops(count = 360) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * VIEW_W,
    y: Math.random() * VIEW_H,
    length: 11 + Math.random() * 24,
    speed: 360 + Math.random() * 340,
    drift: 55 + Math.random() * 70,
    alpha: 0.12 + Math.random() * 0.26,
    width: Math.random() > 0.82 ? 1.8 : 1,
  }));
}

export function updateEnvironment({
  clouds,
  rainDrops,
  camera,
  settings,
  dt,
}) {
  for (const cloud of clouds) {
    cloud.x += cloud.speed * dt;
    if (cloud.x - camera.x * 0.25 > VIEW_W + 180) {
      cloud.x = camera.x * 0.25 - 220;
    }
  }

  if (!settings.rainEnabled) return;

  const rainIntensity = settings.rainIntensity;
  const activeDrops = Math.floor(rainDrops.length * rainIntensity);
  const rainSpeed = 0.75 + rainIntensity * 0.7;

  for (let i = 0; i < activeDrops; i++) {
    const drop = rainDrops[i];
    drop.x += drop.drift * dt;
    drop.y += drop.speed * rainSpeed * dt;

    if (drop.y - drop.length > VIEW_H) {
      drop.y = -20 - Math.random() * 120;
      drop.x = Math.random() * (VIEW_W + 120) - 60;
    }

    if (drop.x > VIEW_W + 80) {
      drop.x = -40 - Math.random() * 60;
    }
  }
}

export function getDaylight(skyTime, settings) {
  const cycledDay = (Math.sin(skyTime * DAY_CYCLE_SPEED) + 1) / 2;
  return settings.skyMode === "day"
    ? 0.95
    : settings.skyMode === "night"
      ? 0.05
      : cycledDay;
}

export function drawEnvironment(ctx, { cam, clouds, rainDrops, time, skyTime, settings }) {
  const day = getDaylight(skyTime, settings);
  const rainIntensity = settings.rainEnabled ? settings.rainIntensity : 0;
  const rainStrength = rainIntensity * (0.36 + (1 - day) * 0.34);
  const stormShade = rainIntensity * 0.22;
  const night = 1 - day;
  const sunset = Math.max(0, 1 - Math.abs(day - 0.5) * 3.1);
  const skyTop = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  skyTop.addColorStop(
    0,
    `rgb(${Math.floor(8 + day * 90 + sunset * 55)}, ${Math.floor(18 + day * 125 + sunset * 42)}, ${Math.floor(38 + day * 170 + sunset * 10)})`,
  );
  skyTop.addColorStop(
    0.48,
    `rgb(${Math.floor(18 + day * 95 + sunset * 105)}, ${Math.floor(34 + day * 120 + sunset * 58)}, ${Math.floor(72 + day * 120 + sunset * 18)})`,
  );
  skyTop.addColorStop(
    1,
    `rgb(${Math.floor(34 + day * 105 + sunset * 120)}, ${Math.floor(48 + day * 118 + sunset * 46)}, ${Math.floor(78 + day * 98 + sunset * 6)})`,
  );
  ctx.fillStyle = skyTop;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  if (rainIntensity > 0) {
    ctx.fillStyle = `rgba(20, 34, 55, ${stormShade})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  const horizonGlow = ctx.createLinearGradient(0, VIEW_H * 0.34, 0, VIEW_H);
  horizonGlow.addColorStop(0, "rgba(255,255,255,0)");
  horizonGlow.addColorStop(
    1,
    `rgba(255,${Math.floor(118 + sunset * 95)},${Math.floor(92 + sunset * 34)},${0.08 + sunset * 0.16})`,
  );
  ctx.fillStyle = horizonGlow;
  ctx.fillRect(0, VIEW_H * 0.34, VIEW_W, VIEW_H * 0.66);

  if (night > 0.14) {
    ctx.save();
    const starAlpha = (night - 0.14) / 0.86;
    for (let i = 0; i < 44; i++) {
      const sx =
        (i * 137.53 + Math.sin(i * 91.7) * 43 - cam.x * 0.015) %
        (VIEW_W + 80);
      const sy = 28 + ((i * 53.17) % (VIEW_H * 0.5));
      const twinkle = 0.45 + 0.55 * Math.sin(time * 2.4 + i * 1.7);
      ctx.fillStyle = `rgba(255,255,255,${starAlpha * twinkle * 0.9})`;
      ctx.fillRect(
        ((sx + VIEW_W + 80) % (VIEW_W + 80)) - 40,
        sy,
        i % 5 === 0 ? 2 : 1,
        i % 5 === 0 ? 2 : 1,
      );
    }
    ctx.restore();
  }

  const orbX = 90 + day * 760;
  const orbY = 86 + Math.cos(skyTime * DAY_CYCLE_SPEED) * 42;

  if (day >= 0.5) {
    const sunGlow = ctx.createRadialGradient(orbX, orbY, 10, orbX, orbY, 112);
    sunGlow.addColorStop(0, "rgba(255,244,190,.95)");
    sunGlow.addColorStop(0.35, "rgba(255,212,110,.42)");
    sunGlow.addColorStop(1, "rgba(255,200,90,0)");
    ctx.fillStyle = sunGlow;
    ctx.fillRect(orbX - 112, orbY - 112, 224, 224);

    ctx.fillStyle = "#fff2b0";
    ctx.beginPath();
    ctx.arc(orbX, orbY, 30 + sunset * 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const moonGlow = ctx.createRadialGradient(orbX, orbY, 8, orbX, orbY, 82);
    moonGlow.addColorStop(0, "rgba(236,244,255,.72)");
    moonGlow.addColorStop(0.45, "rgba(182,210,255,.18)");
    moonGlow.addColorStop(1, "rgba(182,210,255,0)");
    ctx.fillStyle = moonGlow;
    ctx.fillRect(orbX - 82, orbY - 82, 164, 164);

    ctx.fillStyle = "#edf5ff";
    ctx.beginPath();
    ctx.arc(orbX, orbY, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(150,175,220,.3)";
    ctx.beginPath();
    ctx.arc(orbX + 7, orbY - 4, 18, 0, Math.PI * 2);
    ctx.fill();
  }

  for (const cloud of clouds) {
    const x = cloud.x - cam.x * 0.25;
    const y = cloud.y;
    const s = cloud.scale;
    const drift = Math.sin(time * 0.18 + cloud.x * 0.004) * 3;
    const cx = x;
    const cy = y + drift;
    const alpha = 0.22 + day * 0.42;

    ctx.save();
    const g = ctx.createLinearGradient(cx, cy - 28 * s, cx, cy + 30 * s);
    g.addColorStop(0, `rgba(245, 250, 255, ${alpha})`);
    g.addColorStop(0.55, `rgba(218, 228, 242, ${alpha})`);
    g.addColorStop(1, `rgba(155, 172, 195, ${alpha * 0.9})`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx + 8 * s, cy + 18 * s);
    ctx.bezierCurveTo(cx + 4 * s, cy + 4 * s, cx + 18 * s, cy - 3 * s, cx + 35 * s, cy + 1 * s);
    ctx.bezierCurveTo(cx + 44 * s, cy - 18 * s, cx + 73 * s, cy - 24 * s, cx + 95 * s, cy - 11 * s);
    ctx.bezierCurveTo(cx + 113 * s, cy - 21 * s, cx + 139 * s, cy - 11 * s, cx + 145 * s, cy + 5 * s);
    ctx.bezierCurveTo(cx + 166 * s, cy + 4 * s, cx + 179 * s, cy + 15 * s, cx + 174 * s, cy + 27 * s);
    ctx.bezierCurveTo(cx + 135 * s, cy + 33 * s, cx + 58 * s, cy + 34 * s, cx + 20 * s, cy + 27 * s);
    ctx.bezierCurveTo(cx + 10 * s, cy + 26 * s, cx + 5 * s, cy + 22 * s, cx + 8 * s, cy + 18 * s);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = `rgba(80, 95, 120, ${0.035 + day * 0.045})`;
    ctx.beginPath();
    ctx.ellipse(cx + 92 * s, cy + 19 * s, 70 * s, 7 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (rainIntensity > 0) {
    ctx.save();
    ctx.lineCap = "round";
    const activeDrops = Math.floor(rainDrops.length * rainIntensity);
    for (let i = 0; i < activeDrops; i++) {
      const drop = rainDrops[i];
      const length = drop.length * (0.75 + rainIntensity * 0.55);
      ctx.lineWidth = drop.width;
      ctx.strokeStyle = `rgba(188, 226, 255, ${drop.alpha * rainStrength})`;
      ctx.beginPath();
      ctx.moveTo(drop.x, drop.y);
      ctx.lineTo(drop.x - drop.drift * 0.05, drop.y + length);
      ctx.stroke();
    }

    if (rainIntensity > 0.55) {
      ctx.fillStyle = `rgba(185, 220, 255, ${0.035 * rainIntensity})`;
      for (let i = 0; i < 26; i++) {
        const mistX = (i * 83 + time * 24) % (VIEW_W + 80) - 40;
        const mistY = 120 + ((i * 47) % (VIEW_H - 130));
        ctx.fillRect(mistX, mistY, 34 + (i % 5) * 9, 1);
      }
    }
    ctx.restore();
  }

  ctx.fillStyle = `rgba(${Math.floor(16 + day * 26)},${Math.floor(42 + day * 42)},${Math.floor(72 + day * 46)},${0.2 + night * 0.08})`;
  ctx.beginPath();
  ctx.moveTo(0, 395);
  for (let x = 0; x <= VIEW_W; x += 40) {
    ctx.lineTo(x, 370 + Math.sin((x + cam.x * 0.15) * 0.012) * 28);
  }
  ctx.lineTo(VIEW_W, VIEW_H);
  ctx.lineTo(0, VIEW_H);
  ctx.fill();

  return { day, night };
}
