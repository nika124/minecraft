import { TILE, VIEW_H, VIEW_W, WORLD_H, WORLD_W } from "../constants";
import {
  clamp,
  createPlayer,
  emitParticles,
  rectHitsSolid,
} from "../world";
import { rectOverlapsLadder, rectOverlapsWater } from "./support";

export function updatePlayerAndCamera({
  playerRef,
  cameraRef,
  world,
  ladders,
  keys,
  particles,
  movementScale,
  dt,
  frameScale,
  applyFrameDamping,
  setStats,
}) {
  const player = playerRef.current;
  const left = Boolean(keys.a || keys.arrowleft);
  const right = Boolean(keys.d || keys.arrowright);
  const moveDir = Number(right) - Number(left);
  const jump = Boolean(keys.w || keys.arrowup || keys[" "]);
  const down = Boolean(keys.s || keys.arrowdown);
  const sprint = Boolean(keys.shift);
  const maxRunSpeed = (sprint ? 9.8 : 6.7) * movementScale;
  const onLadder = rectOverlapsLadder(
    ladders,
    player.x + 4,
    player.y + 4,
    player.w - 8,
    player.h - 8,
  );
  const inWater = rectOverlapsWater(
    world,
    player.x + 4,
    player.y + 6,
    player.w - 8,
    player.h - 12,
  );
  const waterTouchingFeet = rectOverlapsWater(
    world,
    player.x + 4,
    player.y + player.h - 14,
    player.w - 8,
    14,
  );
  const waterTouchingHead = rectOverlapsWater(
    world,
    player.x + 6,
    player.y + 2,
    player.w - 12,
    18,
  );
  const moveMaxSpeed = inWater
    ? (sprint ? 4.1 : 3.2) * movementScale
    : maxRunSpeed;

  if (moveDir !== 0) {
    const acceleration = inWater
      ? sprint
        ? 0.42 * movementScale
        : 0.31 * movementScale
      : player.onGround
        ? sprint
          ? 1.78 * movementScale
          : 1.3 * movementScale
        : sprint
          ? 0.69 * movementScale
          : 0.52 * movementScale;
    const turningBoost =
      !inWater && player.onGround && Math.sign(player.vx) === -moveDir
        ? 1.45
        : 1;
    player.vx += moveDir * acceleration * turningBoost * frameScale;
    player.facing = moveDir;
  } else {
    player.vx *= applyFrameDamping(
      inWater ? 0.84 : player.onGround ? 0.72 : 0.985,
    );
  }

  if (
    sprint &&
    player.onGround &&
    Math.abs(player.vx) > 3.2 &&
    Math.random() < 0.38
  ) {
    emitParticles(
      particles,
      player.x + player.w / 2 - player.facing * 15,
      player.y + player.h - 3,
      "rgba(190,180,150,.65)",
      1,
    );
  }

  player.coyoteTime = player.onGround
    ? 0.09
    : Math.max(0, (player.coyoteTime ?? 0) - dt);

  if (jump && player.coyoteTime > 0 && !onLadder && !inWater) {
    player.vy = -13.6;
    player.onGround = false;
    player.coyoteTime = 0;
  }

  player.vx = clamp(player.vx, -moveMaxSpeed, moveMaxSpeed);
  if (onLadder) {
    if (jump) {
      player.vy = -4.2;
    } else if (down) {
      player.vy = 4.2;
    } else {
      player.vy = 0;
    }
  } else if (inWater) {
    const gravity = waterTouchingHead ? 0.18 : 0.26;
    player.vy = clamp(player.vy + gravity * frameScale, -5.2, 6);
    player.vy *= applyFrameDamping(waterTouchingHead ? 0.9 : 0.94);

    if (jump) {
      player.vy = waterTouchingHead ? -3.8 : -2.9;
    } else if (down) {
      player.vy = Math.min(player.vy + 0.52 * frameScale, 4.5);
    } else if (waterTouchingFeet) {
      player.vy = Math.min(player.vy, 1.2);
    }
  } else {
    player.vy = clamp(player.vy + 0.72 * frameScale, -18, 18);
  }

  if (Math.abs(player.vx) < 0.01) player.vx = 0;
  if (Math.abs(player.vy) < 0.01) player.vy = 0;

  if (player.vx !== 0) {
    const step = Math.sign(player.vx);
    const nextX = player.x + player.vx * frameScale;

    if (!rectHitsSolid(world, nextX, player.y, player.w, player.h)) {
      player.x = nextX;
    } else {
      while (!rectHitsSolid(world, player.x + step, player.y, player.w, player.h)) {
        player.x += step;
      }
      player.vx = 0;
    }
  }

  player.onGround = false;

  if (player.vy !== 0) {
    const step = Math.sign(player.vy);
    const nextY = player.y + player.vy * frameScale;

    if (!rectHitsSolid(world, player.x, nextY, player.w, player.h)) {
      player.y = nextY;
    } else {
      while (!rectHitsSolid(world, player.x, player.y + step, player.w, player.h)) {
        player.y += step;
      }
      if (player.vy > 0) player.onGround = true;
      player.vy = 0;
    }
  } else if (rectHitsSolid(world, player.x, player.y + 1, player.w, player.h)) {
    player.onGround = true;
  }

  if (player.y > WORLD_H * TILE - 100) {
    playerRef.current = createPlayer();
    setStats((current) => ({
      ...current,
      message: "You fell into the void. Respawned.",
    }));
  }

  const activePlayer = playerRef.current;
  const cam = cameraRef.current;
  cam.x +=
    (activePlayer.x +
      activePlayer.w / 2 -
      VIEW_W / 2 +
      activePlayer.vx * 15 -
      cam.x) *
    (1 - applyFrameDamping(0.91));
  cam.y +=
    (activePlayer.y + activePlayer.h / 2 - VIEW_H / 2 - 30 - cam.y) *
    (1 - applyFrameDamping(0.91));
  cam.x = clamp(cam.x, 0, WORLD_W * TILE - VIEW_W);
  cam.y = clamp(cam.y, 0, WORLD_H * TILE - VIEW_H);
}
