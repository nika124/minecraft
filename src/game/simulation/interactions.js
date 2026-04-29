import {
  BLOCK_BY_ID,
  BLOCKS,
  PLACEABLE,
  TILE,
  WALL_BY_ID,
  WALL_PLACEABLE,
  WALLS,
  WORLD_H,
  WORLD_W,
} from "../constants";
import { updateSkyCoverageColumn } from "../rendering";
import { emitParticles } from "../world";
import {
  blockHasSupport,
  ladderHasAnchor,
  torchHasSupport,
  waterHasSupport,
} from "./support";

export function removeUnsupportedTorches({
  world,
  walls,
  x,
  y,
  placedBlocksRef,
  particlesRef,
}) {
  const neighbors = [
    [x, y],
    [x, y - 1],
    [x, y + 1],
    [x - 1, y],
    [x + 1, y],
  ];
  let removed = 0;

  for (const [nx, ny] of neighbors) {
    if (nx < 0 || ny < 0 || nx >= WORLD_W || ny >= WORLD_H) continue;
    if (world[ny][nx] !== BLOCKS.torch.id) continue;
    if (torchHasSupport(world, walls, nx, ny, x, y)) continue;

    world[ny][nx] = BLOCKS.air.id;
    placedBlocksRef.current.delete(`${nx},${ny}`);
    emitParticles(
      particlesRef.current,
      nx * TILE + TILE / 2,
      ny * TILE + TILE / 2,
      BLOCKS.torch.color,
      5,
    );
    removed++;
  }

  return removed;
}

export function mineOrPlace({
  dt,
  mineCooldown,
  mouseRef,
  cameraRef,
  playerRef,
  worldRef,
  wallsRef,
  laddersRef,
  buildModeRef,
  selectedWallRef,
  selectedRef,
  blockHotbarRef,
  waterLevelsRef,
  waterSourcesRef,
  placedBlocksRef,
  anchoredLaddersRef,
  particlesRef,
  skyCoverageRef,
  setStats,
  stepWaterFlow,
}) {
  let nextMineCooldown = mineCooldown - dt;
  const mouse = mouseRef.current;
  if (!mouse.down || nextMineCooldown > 0) return nextMineCooldown;

  const cam = cameraRef.current;
  const worldX = Math.floor((mouse.x + cam.x) / TILE);
  const worldY = Math.floor((mouse.y + cam.y) / TILE);
  const player = playerRef.current;
  const centerX = player.x + player.w / 2;
  const centerY = player.y + player.h / 2;
  const distance = Math.hypot(
    worldX * TILE + TILE / 2 - centerX,
    worldY * TILE + TILE / 2 - centerY,
  );

  if (
    distance > TILE * 5.2 ||
    worldX < 0 ||
    worldY < 0 ||
    worldX >= WORLD_W ||
    worldY >= WORLD_H
  ) {
    setStats((current) => ({ ...current, message: "Too far away." }));
    return 0.18;
  }

  const world = worldRef.current;
  const walls = wallsRef.current;
  const ladders = laddersRef.current;

  if (buildModeRef.current === "background") {
    const wall = WALL_PLACEABLE[selectedWallRef.current] ?? WALLS.woodWall;

    if (mouse.button === 0) {
      if (wall.id === WALLS.ladder.id && ladders[worldY][worldX]) {
        ladders[worldY][worldX] = false;
        anchoredLaddersRef.current.delete(`${worldX},${worldY}`);
        emitParticles(
          particlesRef.current,
          worldX * TILE + TILE / 2,
          worldY * TILE + TILE / 2,
          wall.color,
          5,
        );
        setStats((current) => ({
          ...current,
          message: "Removed Ladder.",
        }));
      } else if (walls[worldY][worldX] !== WALLS.empty.id) {
        const removedWall = WALL_BY_ID[walls[worldY][worldX]] ?? WALLS.empty;
        walls[worldY][worldX] = WALLS.empty.id;
        const torchesRemoved = removeUnsupportedTorches({
          world,
          walls,
          x: worldX,
          y: worldY,
          placedBlocksRef,
          particlesRef,
        });
        emitParticles(
          particlesRef.current,
          worldX * TILE + TILE / 2,
          worldY * TILE + TILE / 2,
          "rgba(220,220,220,.8)",
          5,
        );
        setStats((current) => ({
          ...current,
          message:
            torchesRemoved > 0
              ? `Removed ${removedWall.name}. ${torchesRemoved} torch${torchesRemoved > 1 ? "es" : ""} fell off.`
              : `Removed ${removedWall.name}.`,
        }));
      }
      nextMineCooldown = 0.1;
    }

    if (mouse.button === 2) {
      const canPlaceWall =
        wall.id !== WALLS.ladder.id ||
        ladderHasAnchor(walls, ladders, worldX, worldY);

      if (!canPlaceWall) {
        setStats((current) => ({
          ...current,
          message:
            "Ladders need a background wall, or another ladder connected vertically to one.",
        }));
        return 0.08;
      }

      if (wall.id === WALLS.ladder.id) {
        if (ladders[worldY][worldX]) {
          return 0.08;
        }
        ladders[worldY][worldX] = true;
        if (walls[worldY][worldX] !== WALLS.empty.id) {
          anchoredLaddersRef.current.add(`${worldX},${worldY}`);
        }
      } else if (walls[worldY][worldX] !== wall.id) {
        walls[worldY][worldX] = wall.id;
        anchoredLaddersRef.current.delete(`${worldX},${worldY}`);
      } else {
        return 0.08;
      }
      emitParticles(
        particlesRef.current,
        worldX * TILE + TILE / 2,
        worldY * TILE + TILE / 2,
        wall.color,
        5,
      );
      setStats((current) => ({
        ...current,
        wallsBuilt: current.wallsBuilt + 1,
        message: `Placed ${wall.name}. Background walls do not block movement.`,
      }));
      nextMineCooldown = 0.08;
    }

    return nextMineCooldown;
  }

  const currentBlock = BLOCK_BY_ID[world[worldY][worldX]] ?? BLOCKS.air;
  const blockKey = `${worldX},${worldY}`;

  if (mouse.button === 0 && currentBlock.id !== BLOCKS.air.id) {
    if (currentBlock.id === BLOCKS.water.id) {
      world[worldY][worldX] = BLOCKS.air.id;
      waterLevelsRef.current[worldY][worldX] = -1;
      waterSourcesRef.current.delete(blockKey);
      placedBlocksRef.current.delete(blockKey);
      updateSkyCoverageColumn(world, skyCoverageRef.current, worldX);
      emitParticles(
        particlesRef.current,
        worldX * TILE + TILE / 2,
        worldY * TILE + TILE / 2,
        BLOCKS.water.color,
        8,
      );
      setStats((current) => ({
        ...current,
        blocksMined: current.blocksMined + 1,
        message: "Picked up Water.",
      }));
      stepWaterFlow();
      return 0.12;
    }

    world[worldY][worldX] = BLOCKS.air.id;
    updateSkyCoverageColumn(world, skyCoverageRef.current, worldX);
    const torchesRemoved = removeUnsupportedTorches({
      world,
      walls,
      x: worldX,
      y: worldY,
      placedBlocksRef,
      particlesRef,
    });
    const wasPlayerPlaced = placedBlocksRef.current.delete(blockKey);
    const leavesNaturalAir =
      currentBlock.id === BLOCKS.wood.id ||
      currentBlock.id === BLOCKS.leaves.id;
    const shouldRevealUnderground =
      !wasPlayerPlaced &&
      !leavesNaturalAir &&
      currentBlock.id !== BLOCKS.glass.id &&
      currentBlock.id !== BLOCKS.torch.id;

    if (shouldRevealUnderground && walls[worldY][worldX] === WALLS.empty.id) {
      walls[worldY][worldX] =
        currentBlock.id === BLOCKS.stone.id ||
        currentBlock.id === BLOCKS.ore.id
          ? WALLS.stoneBack.id
          : WALLS.dirtBack.id;
    }
    emitParticles(
      particlesRef.current,
      worldX * TILE + TILE / 2,
      worldY * TILE + TILE / 2,
      currentBlock.color === "transparent" ? "#ffffff" : currentBlock.color,
    );
    setStats((current) => ({
      ...current,
      blocksMined: current.blocksMined + 1,
      message:
        torchesRemoved > 0
          ? `Mined ${currentBlock.name}. ${torchesRemoved} torch${torchesRemoved > 1 ? "es" : ""} fell off.`
          : `Mined ${currentBlock.name}.`,
    }));
    nextMineCooldown =
      currentBlock.id === BLOCKS.stone.id || currentBlock.id === BLOCKS.ore.id
        ? 0.26
        : 0.14;
  }

  if (mouse.button === 2) {
    const placeBlock = PLACEABLE[blockHotbarRef.current[selectedRef.current]];
    if (!placeBlock) {
      setStats((current) => ({
        ...current,
        message: "That hotbar slot is empty.",
      }));
      return 0.14;
    }
    const px = worldX * TILE;
    const py = worldY * TILE;
    const touchingPlayer = !(
      px + TILE <= player.x ||
      px >= player.x + player.w ||
      py + TILE <= player.y ||
      py >= player.y + player.h
    );
    const hasSupport =
      placeBlock.id === BLOCKS.water.id
        ? waterHasSupport(world, walls, worldX, worldY)
        : placeBlock.id === BLOCKS.torch.id
          ? torchHasSupport(world, walls, worldX, worldY)
          : blockHasSupport(world, walls, worldX, worldY);
    const replacingWater =
      currentBlock.id === BLOCKS.water.id && placeBlock.id !== BLOCKS.water.id;
    const promotingWater =
      currentBlock.id === BLOCKS.water.id &&
      placeBlock.id === BLOCKS.water.id &&
      !waterSourcesRef.current.has(blockKey);

    if (
      (currentBlock.id === BLOCKS.air.id ||
        replacingWater ||
        promotingWater) &&
      !touchingPlayer &&
      hasSupport
    ) {
      if (replacingWater) {
        waterLevelsRef.current[worldY][worldX] = -1;
        waterSourcesRef.current.delete(blockKey);
        placedBlocksRef.current.delete(blockKey);
      }
      world[worldY][worldX] = placeBlock.id;
      if (placeBlock.id === BLOCKS.water.id) {
        waterLevelsRef.current[worldY][worldX] = 0;
        waterSourcesRef.current.add(blockKey);
      }
      updateSkyCoverageColumn(world, skyCoverageRef.current, worldX);
      placedBlocksRef.current.add(blockKey);
      emitParticles(
        particlesRef.current,
        worldX * TILE + TILE / 2,
        worldY * TILE + TILE / 2,
        placeBlock.color === "transparent" ? "#ffffff" : placeBlock.color,
        6,
      );
      setStats((current) => ({
        ...current,
        blocksPlaced: current.blocksPlaced + 1,
        message: promotingWater
          ? "Added a Water source."
          : `Placed ${placeBlock.name}.`,
      }));
      nextMineCooldown = 0.12;
    } else if (
      currentBlock.id === BLOCKS.air.id &&
      !touchingPlayer &&
      !hasSupport
    ) {
      setStats((current) => ({
        ...current,
        message:
          placeBlock.id === BLOCKS.torch.id
            ? "Torches need a block below or a background wall."
            : placeBlock.id === BLOCKS.water.id
              ? "Water needs a solid block on any side or a background wall."
              : "Blocks need support.",
      }));
      nextMineCooldown = 0.08;
    }
  }

  return nextMineCooldown;
}
