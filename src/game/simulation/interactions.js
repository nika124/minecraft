import {
  BLOCK_BY_ID,
  BLOCKS,
  FOREGROUND_ITEMS,
  SEA_LEVEL,
  TILE,
  WALL_BY_ID,
  WALLS,
  WORLD_H,
  WORLD_W,
} from "../constants";
import { getBlockDrops, getWallDrops, formatDrops } from "../drops";
import { consumeInventoryItem, getItemCount } from "../inventory";
import {
  canItemPlaceInLayer,
  getBackgroundWallForItem,
  getForegroundBlockForItem,
  getForegroundItemId,
  getInventoryItemForPlaceable,
  getItemForRemovedBackgroundWall,
  getPlacementLayerForItem,
} from "../items";
import { updateSkyCoverageColumn } from "../rendering";
import { emitParticles } from "../world";
import { spawnDroppedItems } from "./droppedItems";
import {
  blockHasSupport,
  ladderHasAnchor,
  torchHasSupport,
  waterHasSupport,
} from "./support";
import {
  getBlockBreakTime,
  getSelectedMiningTool,
  resetMiningState,
} from "./mining";

export function removeUnsupportedTorches({
  world,
  walls,
  x,
  y,
  placedBlocksRef,
  particlesRef,
  droppedItemsRef,
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
    spawnDroppedItems(
      droppedItemsRef,
      getBlockDrops(BLOCKS.torch),
      nx * TILE + TILE / 2,
      ny * TILE + TILE / 2,
    );
    removed++;
  }

  return removed;
}

export function removeUnsupportedLadders({
  walls,
  ladders,
  anchoredLaddersRef,
  particlesRef,
  droppedItemsRef,
}) {
  const removed = [];

  for (let y = 0; y < WORLD_H; y++) {
    for (let x = 0; x < WORLD_W; x++) {
      if (!ladders[y][x]) continue;
      if (ladderHasAnchor(walls, ladders, x, y)) continue;
      removed.push([x, y]);
    }
  }

  for (const [x, y] of removed) {
    ladders[y][x] = false;
    anchoredLaddersRef.current.delete(`${x},${y}`);
    emitParticles(
      particlesRef.current,
      x * TILE + TILE / 2,
      y * TILE + TILE / 2,
      WALLS.ladder.color,
      5,
    );
  }

  for (const [x, y] of removed) {
    spawnDroppedItems(
      droppedItemsRef,
      getWallDrops(WALLS.ladder),
      x * TILE + TILE / 2,
      y * TILE + TILE / 2,
    );
  }

  return removed.length;
}

function naturalBackdropFor(world, x, y) {
  if (y >= SEA_LEVEL) return WALLS.deepStoneBack.id;

  const block = BLOCK_BY_ID[world[y][x]] ?? BLOCKS.air;
  return isStoneLayerBlock(block) ? WALLS.stoneBack.id : WALLS.dirtBack.id;
}

function isStoneLayerBlock(block) {
  return (
    block?.id === BLOCKS.stone.id ||
    block?.id === BLOCKS.ore.id ||
    block?.id === BLOCKS.coalOre.id
  );
}

function selectedHotbarItem(blockHotbarRef, selectedRef) {
  return FOREGROUND_ITEMS[blockHotbarRef.current[selectedRef.current]];
}

function getSelectedPlacementContext({
  blockHotbarRef,
  selectedRef,
  mouseButton,
  buildMode,
}) {
  const placeItem = selectedHotbarItem(blockHotbarRef, selectedRef);
  const placeItemId = getForegroundItemId(placeItem);
  const placeInventoryItem = getInventoryItemForPlaceable(placeItem);
  const placementLayer =
    mouseButton === 2
      ? getPlacementLayerForItem(placeItem, buildMode)
      : buildMode;

  return {
    placeItem,
    placeItemId,
    placeInventoryItem,
    placementLayer,
  };
}

function validatePlaceableItem({
  placeItem,
  placeItemId,
  inventoryRef,
  layer,
  setStats,
}) {
  if (!placeItem) {
    setStats((current) => ({
      ...current,
      message: "That hotbar slot is empty.",
    }));
    return { ok: false, cooldown: 0.14 };
  }

  if (placeItem.kind === "tool") {
    setStats((current) => ({
      ...current,
      message:
        placeItem.id === "sticks"
          ? "Stick cannot be placed."
          : `${placeItem.name}s are for mining, not placing.`,
    }));
    return { ok: false, cooldown: 0.14 };
  }

  if (!canItemPlaceInLayer(placeItem, layer)) {
    setStats((current) => ({
      ...current,
      message: `${placeItem.name} cannot be placed in the ${layer} layer.`,
    }));
    return { ok: false, cooldown: layer === "background" ? 0.12 : 0.14 };
  }

  if (!placeItemId || getItemCount(inventoryRef, placeItemId) <= 0) {
    setStats((current) => ({
      ...current,
      message: `You do not have ${placeItem.name}.`,
    }));
    return { ok: false, cooldown: layer === "background" ? 0.12 : 0.14 };
  }

  return { ok: true };
}

function getBlockKey(x, y) {
  return `${x},${y}`;
}

function isTouchingPlayer(player, worldX, worldY) {
  const px = worldX * TILE;
  const py = worldY * TILE;
  return !(
    px + TILE <= player.x ||
    px >= player.x + player.w ||
    py + TILE <= player.y ||
    py >= player.y + player.h
  );
}

function isTargetOutOfBounds(worldX, worldY) {
  return worldX < 0 || worldY < 0 || worldX >= WORLD_W || worldY >= WORLD_H;
}

function getTargetDistance(player, worldX, worldY) {
  const centerX = player.x + player.w / 2;
  const centerY = player.y + player.h / 2;
  return Math.hypot(
    worldX * TILE + TILE / 2 - centerX,
    worldY * TILE + TILE / 2 - centerY,
  );
}

function isTorchItem(itemId) {
  return itemId === "torch";
}

function isLadderItem(itemId) {
  return itemId === "ladder";
}

function getPlayerPlacedWallDrops(placedWallsRef, wall, blockKey) {
  const sourceBlockId = placedWallsRef.current.get(blockKey);
  if (sourceBlockId === undefined) return [];
  placedWallsRef.current.delete(blockKey);
  const itemId =
    getForegroundItemId(BLOCK_BY_ID[sourceBlockId]) ??
    getItemForRemovedBackgroundWall(wall);
  return itemId ? [{ itemId, amount: 1 }] : [];
}

function handleBackgroundRemoval({
  world,
  walls,
  ladders,
  worldX,
  worldY,
  blockKey,
  placeItemId,
  placedWallsRef,
  anchoredLaddersRef,
  placedBlocksRef,
  particlesRef,
  droppedItemsRef,
  setStats,
}) {
  if (isLadderItem(placeItemId) && ladders[worldY][worldX]) {
    ladders[worldY][worldX] = false;
    anchoredLaddersRef.current.delete(blockKey);
    const drops = getWallDrops(WALLS.ladder);
    spawnDroppedItems(
      droppedItemsRef,
      drops,
      worldX * TILE + TILE / 2,
      worldY * TILE + TILE / 2,
    );
    emitParticles(
      particlesRef.current,
      worldX * TILE + TILE / 2,
      worldY * TILE + TILE / 2,
      WALLS.ladder.color,
      5,
    );
    setStats((current) => ({
      ...current,
      message: `Removed Ladder${drops.length ? ` (+${formatDrops(drops)})` : ""}.`,
    }));
  } else if (walls[worldY][worldX] !== WALLS.empty.id) {
    const removedWall = WALL_BY_ID[walls[worldY][worldX]] ?? WALLS.empty;
    const replacementWall = naturalBackdropFor(world, worldX, worldY);
    walls[worldY][worldX] =
      worldY >= SEA_LEVEL ? replacementWall : WALLS.empty.id;
    const drops = getPlayerPlacedWallDrops(
      placedWallsRef,
      removedWall,
      blockKey,
    );
    const torchesRemoved = removeUnsupportedTorches({
      world,
      walls,
      x: worldX,
      y: worldY,
      placedBlocksRef,
      particlesRef,
      droppedItemsRef,
    });
    const laddersRemoved = removeUnsupportedLadders({
      walls,
      ladders,
      anchoredLaddersRef,
      particlesRef,
      droppedItemsRef,
    });
    spawnDroppedItems(
      droppedItemsRef,
      drops,
      worldX * TILE + TILE / 2,
      worldY * TILE + TILE / 2,
    );
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
        laddersRemoved > 0
          ? `Removed ${removedWall.name}${drops.length ? ` (+${formatDrops(drops)})` : ""}. ${laddersRemoved} ladder${laddersRemoved > 1 ? "s" : ""} fell off.`
          : torchesRemoved > 0
            ? `Removed ${removedWall.name}${drops.length ? ` (+${formatDrops(drops)})` : ""}. ${torchesRemoved} torch${torchesRemoved > 1 ? "es" : ""} fell off.`
            : `Removed ${removedWall.name}${drops.length ? ` (+${formatDrops(drops)})` : ""}.`,
    }));
  }

  return 0.1;
}

function placeTorchBlock({
  world,
  walls,
  worldX,
  worldY,
  player,
  inventoryRef,
  waterLevelsRef,
  waterSourcesRef,
  placedBlocksRef,
  particlesRef,
  skyCoverageRef,
  onInventoryChange,
  setStats,
  stepWaterFlow,
}) {
  const blockKey = getBlockKey(worldX, worldY);
  const currentBlock = BLOCK_BY_ID[world[worldY][worldX]] ?? BLOCKS.air;
  const touchingPlayer = isTouchingPlayer(player, worldX, worldY);
  const replacingWater = currentBlock.id === BLOCKS.water.id;

  if (getItemCount(inventoryRef, "torch") <= 0) {
    setStats((current) => ({
      ...current,
      message: "You do not have Torch.",
    }));
    return false;
  }

  if (
    currentBlock.id !== BLOCKS.air.id &&
    currentBlock.id !== BLOCKS.water.id
  ) {
    return false;
  }

  if (touchingPlayer) return false;

  if (!torchHasSupport(world, walls, worldX, worldY)) {
    setStats((current) => ({
      ...current,
      message: "Torches need a solid block nearby or a background wall.",
    }));
    return false;
  }

  if (replacingWater) {
    waterLevelsRef.current[worldY][worldX] = -1;
    waterSourcesRef.current.delete(blockKey);
    placedBlocksRef.current.delete(blockKey);
  }

  consumeInventoryItem(inventoryRef, "torch", 1);
  onInventoryChange?.();
  world[worldY][worldX] = BLOCKS.torch.id;
  updateSkyCoverageColumn(world, skyCoverageRef.current, worldX);
  placedBlocksRef.current.add(blockKey);
  emitParticles(
    particlesRef.current,
    worldX * TILE + TILE / 2,
    worldY * TILE + TILE / 2,
    BLOCKS.torch.color,
    6,
  );
  setStats((current) => ({
    ...current,
    blocksPlaced: current.blocksPlaced + 1,
    message: "Placed Torch.",
  }));
  if (replacingWater) stepWaterFlow();
  return true;
}

function handleBackgroundPlacement({
  world,
  walls,
  ladders,
  worldX,
  worldY,
  blockKey,
  player,
  placeItem,
  placeItemId,
  placeInventoryItem,
  inventoryRef,
  waterLevelsRef,
  waterSourcesRef,
  placedBlocksRef,
  placedWallsRef,
  anchoredLaddersRef,
  particlesRef,
  droppedItemsRef,
  skyCoverageRef,
  onInventoryChange,
  setStats,
  stepWaterFlow,
}) {
  const placementValidation = validatePlaceableItem({
    placeItem,
    placeItemId,
    inventoryRef,
    layer: "background",
    setStats,
  });
  if (!placementValidation.ok) {
    return placementValidation.cooldown;
  }

  if (isTorchItem(placeItemId)) {
    if (
      placeTorchBlock({
        world,
        walls,
        worldX,
        worldY,
        player,
        inventoryRef,
        waterLevelsRef,
        waterSourcesRef,
        placedBlocksRef,
        particlesRef,
        skyCoverageRef,
        onInventoryChange,
        setStats,
        stepWaterFlow,
      })
    ) {
      return 0.12;
    }
    return 0.08;
  }

  if (isLadderItem(placeItemId)) {
    if (!ladderHasAnchor(walls, ladders, worldX, worldY)) {
      setStats((current) => ({
        ...current,
        message:
          "Ladders need a background wall, or another ladder connected vertically to one.",
      }));
      return 0.08;
    }
    if (ladders[worldY][worldX]) {
      return 0.08;
    }
    ladders[worldY][worldX] = true;
    if (walls[worldY][worldX] !== WALLS.empty.id) {
      anchoredLaddersRef.current.add(blockKey);
    }
    consumeInventoryItem(inventoryRef, placeItemId, 1);
    onInventoryChange?.();
    emitParticles(
      particlesRef.current,
      worldX * TILE + TILE / 2,
      worldY * TILE + TILE / 2,
      WALLS.ladder.color,
      5,
    );
    setStats((current) => ({
      ...current,
      wallsBuilt: current.wallsBuilt + 1,
      message: "Placed Ladder.",
    }));
    return 0.08;
  }

  const wall = getBackgroundWallForItem(placeItem);
  if (!wall) {
    setStats((current) => ({
      ...current,
      message: `${placeItem.name} cannot be placed as a background wall.`,
    }));
    return 0.12;
  }

  if (walls[worldY][worldX] !== wall.id) {
    const replacedWall = WALL_BY_ID[walls[worldY][worldX]] ?? WALLS.empty;
    const replacedDrops = getPlayerPlacedWallDrops(
      placedWallsRef,
      replacedWall,
      blockKey,
    );
    spawnDroppedItems(
      droppedItemsRef,
      replacedDrops,
      worldX * TILE + TILE / 2,
      worldY * TILE + TILE / 2,
    );
    walls[worldY][worldX] = wall.id;
    placedWallsRef.current.set(
      blockKey,
      placeInventoryItem.foregroundBlockId ?? placeInventoryItem.blockId,
    );
    if (ladders[worldY][worldX]) {
      anchoredLaddersRef.current.add(blockKey);
    }
  } else {
    return 0.08;
  }
  consumeInventoryItem(inventoryRef, placeItemId, 1);
  onInventoryChange?.();
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
    message: `Placed ${wall.name} from ${placeItem.name}. Background walls do not block movement.`,
  }));
  return 0.08;
}

function handleForegroundMining({
  dt,
  world,
  walls,
  worldX,
  worldY,
  blockKey,
  currentBlock,
  selectedRef,
  blockHotbarRef,
  miningRef,
  waterLevelsRef,
  waterSourcesRef,
  placedBlocksRef,
  particlesRef,
  droppedItemsRef,
  skyCoverageRef,
  inventoryRef,
  setStats,
  stepWaterFlow,
}) {
  if (currentBlock.unbreakable) {
    resetMiningState(miningRef);
    setStats((current) => ({
      ...current,
      message: `${currentBlock.name} cannot be broken.`,
    }));
    return 0.18;
  }

  if (currentBlock.id === BLOCKS.water.id) {
    resetMiningState(miningRef);
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
      message: "Removed Water.",
    }));
    stepWaterFlow();
    return 0.12;
  }

  const selectedItem =
    FOREGROUND_ITEMS[blockHotbarRef.current[selectedRef.current]];
  const selectedItemId = getForegroundItemId(selectedItem);
  const hasSelectedTool =
    selectedItem?.kind === "tool" &&
    getItemCount(inventoryRef, selectedItemId) > 0;
  const tool = getSelectedMiningTool(hasSelectedTool ? selectedItem : null);
  const requiredTime = getBlockBreakTime(currentBlock, tool);

  if (!Number.isFinite(requiredTime)) {
    resetMiningState(miningRef);
    setStats((current) => ({
      ...current,
      message: `${currentBlock.name} requires a ${currentBlock.requiresTool}.`,
    }));
    return 0.18;
  }

  const mining = miningRef.current;

  if (mining.targetKey !== blockKey || mining.blockId !== currentBlock.id) {
    mining.targetKey = blockKey;
    mining.blockId = currentBlock.id;
    mining.progress = 0;
    mining.requiredTime = requiredTime;
  }

  mining.progress += dt;
  mining.requiredTime = requiredTime;

  if (mining.progress < requiredTime) {
    return 0;
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
    droppedItemsRef,
  });
  const drops = getBlockDrops(currentBlock);
  spawnDroppedItems(
    droppedItemsRef,
    drops,
    worldX * TILE + TILE / 2,
    worldY * TILE + TILE / 2,
  );
  const wasPlayerPlaced = placedBlocksRef.current.delete(blockKey);
  const leavesNaturalAir =
    currentBlock.id === BLOCKS.wood.id ||
    currentBlock.id === BLOCKS.leaves.id;
  const shouldRevealUnderground =
    worldY >= SEA_LEVEL ||
    (!wasPlayerPlaced &&
      !leavesNaturalAir &&
      currentBlock.id !== BLOCKS.glass.id &&
      currentBlock.id !== BLOCKS.torch.id);

  if (shouldRevealUnderground && walls[worldY][worldX] === WALLS.empty.id) {
    walls[worldY][worldX] = isStoneLayerBlock(currentBlock)
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
        ? `Mined ${currentBlock.name}${drops.length ? ` (+${formatDrops(drops)})` : ""}. ${torchesRemoved} torch${torchesRemoved > 1 ? "es" : ""} fell off.`
        : `Mined ${currentBlock.name}${drops.length ? ` (+${formatDrops(drops)})` : ""}.`,
  }));
  resetMiningState(miningRef);
  return isStoneLayerBlock(currentBlock) ? 0.08 : 0.04;
}

function handleForegroundPlacement({
  world,
  walls,
  worldX,
  worldY,
  blockKey,
  player,
  currentBlock,
  placeItem,
  placeItemId,
  inventoryRef,
  waterLevelsRef,
  waterSourcesRef,
  placedBlocksRef,
  particlesRef,
  skyCoverageRef,
  onInventoryChange,
  setStats,
}) {
  const placementValidation = validatePlaceableItem({
    placeItem,
    placeItemId,
    inventoryRef,
    layer: "foreground",
    setStats,
  });
  if (!placementValidation.ok) {
    return placementValidation.cooldown;
  }

  const placeBlock = getForegroundBlockForItem(placeItem);
  if (!placeBlock) {
    setStats((current) => ({
      ...current,
      message: `${placeItem.name} has no foreground placement.`,
    }));
    return 0.14;
  }

  const touchingPlayer = isTouchingPlayer(player, worldX, worldY);
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
    (currentBlock.id === BLOCKS.air.id || replacingWater || promotingWater) &&
    !touchingPlayer &&
    hasSupport
  ) {
    if (replacingWater) {
      waterLevelsRef.current[worldY][worldX] = -1;
      waterSourcesRef.current.delete(blockKey);
      placedBlocksRef.current.delete(blockKey);
    }
    consumeInventoryItem(inventoryRef, placeItemId, 1);
    onInventoryChange?.();
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
    return 0.12;
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
    return 0.08;
  }

  return undefined;
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
  selectedRef,
  blockHotbarRef,
  miningRef,
  waterLevelsRef,
  waterSourcesRef,
  placedBlocksRef,
  placedWallsRef,
  anchoredLaddersRef,
  particlesRef,
  skyCoverageRef,
  inventoryRef,
  droppedItemsRef,
  onInventoryChange,
  setStats,
  stepWaterFlow,
  onOpenWorkbench,
}) {
  let nextMineCooldown = mineCooldown - dt;
  const mouse = mouseRef.current;
  if (!mouse.down) {
    resetMiningState(miningRef);
    return nextMineCooldown;
  }

  const isForegroundMining =
    buildModeRef.current === "foreground" && mouse.button === 0;
  if (!isForegroundMining && nextMineCooldown > 0) {
    resetMiningState(miningRef);
    return nextMineCooldown;
  }

  const cam = cameraRef.current;
  const worldX = Math.floor((mouse.x + cam.x) / TILE);
  const worldY = Math.floor((mouse.y + cam.y) / TILE);
  const player = playerRef.current;
  const distance = getTargetDistance(player, worldX, worldY);

  if (distance > TILE * 5.2 || isTargetOutOfBounds(worldX, worldY)) {
    resetMiningState(miningRef);
    setStats((current) => ({ ...current, message: "Too far away." }));
    return 0.18;
  }

  const world = worldRef.current;
  const walls = wallsRef.current;
  const ladders = laddersRef.current;
  const currentBlock = BLOCK_BY_ID[world[worldY][worldX]] ?? BLOCKS.air;
  const blockKey = getBlockKey(worldX, worldY);
  const {
    placeItem,
    placeItemId,
    placeInventoryItem,
    placementLayer,
  } = getSelectedPlacementContext({
    blockHotbarRef,
    selectedRef,
    mouseButton: mouse.button,
    buildMode: buildModeRef.current,
  });

  if (buildModeRef.current === "background" && mouse.button === 0) {
    resetMiningState(miningRef);
    return handleBackgroundRemoval({
      world,
      walls,
      ladders,
      worldX,
      worldY,
      blockKey,
      placeItemId,
      placedWallsRef,
      anchoredLaddersRef,
      placedBlocksRef,
      particlesRef,
      droppedItemsRef,
      setStats,
    });
  }

  if (mouse.button === 2 && placementLayer === "background") {
    resetMiningState(miningRef);
    return handleBackgroundPlacement({
      world,
      walls,
      ladders,
      worldX,
      worldY,
      blockKey,
      player,
      placeItem,
      placeItemId,
      placeInventoryItem,
      inventoryRef,
      waterLevelsRef,
      waterSourcesRef,
      placedBlocksRef,
      placedWallsRef,
      anchoredLaddersRef,
      particlesRef,
      droppedItemsRef,
      skyCoverageRef,
      onInventoryChange,
      setStats,
      stepWaterFlow,
    });
  }

  if (mouse.button === 2 && currentBlock.id === BLOCKS.workbench.id) {
    resetMiningState(miningRef);
    onOpenWorkbench?.();
    setStats((current) => ({
      ...current,
      message: "Opened Workbench.",
    }));
    return 0.18;
  }

  if (mouse.button === 0 && currentBlock.id !== BLOCKS.air.id) {
    return handleForegroundMining({
      dt,
      world,
      walls,
      worldX,
      worldY,
      blockKey,
      currentBlock,
      selectedRef,
      blockHotbarRef,
      miningRef,
      waterLevelsRef,
      waterSourcesRef,
      placedBlocksRef,
      particlesRef,
      droppedItemsRef,
      skyCoverageRef,
      inventoryRef,
      setStats,
      stepWaterFlow,
    });
  } else if (mouse.button === 0) {
    resetMiningState(miningRef);
  }

  if (mouse.button === 2) {
    resetMiningState(miningRef);
    const placementCooldown = handleForegroundPlacement({
      world,
      walls,
      worldX,
      worldY,
      blockKey,
      player,
      currentBlock,
      placeItem,
      placeItemId,
      inventoryRef,
      waterLevelsRef,
      waterSourcesRef,
      placedBlocksRef,
      particlesRef,
      skyCoverageRef,
      onInventoryChange,
      setStats,
    });
    if (placementCooldown !== undefined) {
      nextMineCooldown = placementCooldown;
    }
  }

  return nextMineCooldown;
}
