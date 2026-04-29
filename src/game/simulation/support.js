import { BLOCK_BY_ID, BLOCKS, TILE, WALLS, WORLD_H, WORLD_W } from "../constants";

export function blockHasSupport(world, walls, x, y) {
  const neighbors = [
    [x, y - 1],
    [x, y + 1],
    [x - 1, y],
    [x + 1, y],
  ];

  return neighbors.some(([nx, ny]) => {
    if (nx < 0 || ny < 0 || nx >= WORLD_W || ny >= WORLD_H) return false;
    return (
      BLOCK_BY_ID[world[ny][nx]]?.solid || walls[ny][nx] !== WALLS.empty.id
    );
  });
}

export function waterHasSupport(world, walls, x, y) {
  if (walls[y][x] !== WALLS.empty.id) return true;

  const neighbors = [
    [x, y - 1],
    [x, y + 1],
    [x - 1, y],
    [x + 1, y],
  ];

  return neighbors.some(([nx, ny]) => {
    if (nx < 0 || ny < 0 || nx >= WORLD_W || ny >= WORLD_H) return false;
    return Boolean(BLOCK_BY_ID[world[ny][nx]]?.solid);
  });
}

export function torchHasSupport(
  world,
  walls,
  x,
  y,
  ignoreX = null,
  ignoreY = null,
) {
  const hasBlockBelow =
    y < WORLD_H - 1 &&
    !(x === ignoreX && y + 1 === ignoreY) &&
    BLOCK_BY_ID[world[y + 1][x]]?.solid;
  const hasBackgroundWall = walls[y][x] !== WALLS.empty.id;
  return hasBlockBelow || hasBackgroundWall;
}

export function ladderHasAnchor(walls, ladders, x, y) {
  if (walls[y][x] !== WALLS.empty.id) return true;
  const seen = new Set([`${x},${y}`]);
  const stack = [
    [x, y - 1],
    [x, y + 1],
  ];

  while (stack.length > 0) {
    const [cx, cy] = stack.pop();
    if (cx < 0 || cy < 0 || cx >= WORLD_W || cy >= WORLD_H) continue;
    const key = `${cx},${cy}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (!ladders[cy][cx]) continue;
    if (walls[cy][cx] !== WALLS.empty.id) return true;

    stack.push([cx, cy - 1], [cx, cy + 1]);
  }

  return false;
}

export function rectOverlapsLadder(ladders, x, y, w, h) {
  const left = Math.floor(x / TILE);
  const right = Math.floor((x + w - 1) / TILE);
  const top = Math.floor(y / TILE);
  const bottom = Math.floor((y + h - 1) / TILE);

  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) continue;
      if (ladders[ty][tx]) return true;
    }
  }

  return false;
}

export function rectOverlapsWater(world, x, y, w, h) {
  const left = Math.floor(x / TILE);
  const right = Math.floor((x + w - 1) / TILE);
  const top = Math.floor(y / TILE);
  const bottom = Math.floor((y + h - 1) / TILE);

  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) continue;
      if (world[ty][tx] === BLOCKS.water.id) return true;
    }
  }

  return false;
}
