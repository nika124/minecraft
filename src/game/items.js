import {
  BLOCKS,
  BLOCK_BY_ID,
  FOREGROUND_ITEMS,
  WALL_BY_ID,
  WALLS,
} from "./constants";

const PLACEMENT_DEFAULTS = {
  canPlaceForeground: false,
  canPlaceBackground: false,
  forcedPlacementLayer: null,
  foregroundBlockId: null,
  backgroundWallId: null,
  texture: null,
  backgroundTexture: null,
  backgroundTint: "rgba(15, 23, 42, 0.38)",
  dimAmount: 0.48,
};

export const ITEMS = {
  grass: {
    id: "grass",
    name: "Grass",
    category: "Blocks",
    blockId: BLOCKS.grass.id,
    canPlaceForeground: true,
    canPlaceBackground: false,
    foregroundBlockId: BLOCKS.grass.id,
  },
  wood: {
    id: "wood",
    name: "Wood",
    category: "Blocks",
    blockId: BLOCKS.wood.id,
    canPlaceForeground: true,
    canPlaceBackground: true,
    foregroundBlockId: BLOCKS.wood.id,
    backgroundWallId: WALLS.woodWall.id,
  },
  planks: {
    id: "planks",
    name: "Planks",
    category: "Blocks",
    blockId: BLOCKS.planks.id,
    canPlaceForeground: true,
    canPlaceBackground: true,
    foregroundBlockId: BLOCKS.planks.id,
    backgroundWallId: WALLS.woodWall.id,
  },
  sticks: {
    id: "sticks",
    name: "Stick",
    category: "Tools",
    color: "#8b552c",
  },
  dirt: {
    id: "dirt",
    name: "Dirt",
    category: "Blocks",
    blockId: BLOCKS.dirt.id,
    canPlaceForeground: true,
    canPlaceBackground: true,
    foregroundBlockId: BLOCKS.dirt.id,
    backgroundWallId: WALLS.dirtBack.id,
  },
  stone: {
    id: "stone",
    name: "Stone",
    category: "Blocks",
    blockId: BLOCKS.stone.id,
    canPlaceForeground: true,
    canPlaceBackground: true,
    foregroundBlockId: BLOCKS.stone.id,
    backgroundWallId: WALLS.stoneWall.id,
  },
  sand: {
    id: "sand",
    name: "Sand",
    category: "Blocks",
    blockId: BLOCKS.sand.id,
    canPlaceForeground: true,
    canPlaceBackground: true,
    foregroundBlockId: BLOCKS.sand.id,
    backgroundWallId: WALLS.dirtBack.id,
  },
  rawOre: {
    id: "rawOre",
    name: "Raw Ore",
    category: "Materials",
    blockId: BLOCKS.ore.id,
    canPlaceForeground: true,
    canPlaceBackground: false,
    foregroundBlockId: BLOCKS.ore.id,
  },
  coal: {
    id: "coal",
    name: "Coal",
    category: "Blocks",
    blockId: BLOCKS.coal.id,
    canPlaceForeground: true,
    canPlaceBackground: false,
    foregroundBlockId: BLOCKS.coal.id,
  },
  torch: {
    id: "torch",
    name: "Torch",
    category: "Utility",
    blockId: BLOCKS.torch.id,
    canPlaceForeground: true,
    canPlaceBackground: false,
    forcedPlacementLayer: "foreground",
    foregroundBlockId: BLOCKS.torch.id,
  },
  glass: {
    id: "glass",
    name: "Glass",
    category: "Blocks",
    blockId: BLOCKS.glass.id,
    canPlaceForeground: true,
    canPlaceBackground: true,
    foregroundBlockId: BLOCKS.glass.id,
    backgroundWallId: WALLS.glassWall.id,
  },
  brick: {
    id: "brick",
    name: "Brick",
    category: "Blocks",
    blockId: BLOCKS.brick.id,
    canPlaceForeground: true,
    canPlaceBackground: true,
    foregroundBlockId: BLOCKS.brick.id,
    backgroundWallId: WALLS.brickWall.id,
  },
  water: {
    id: "water",
    name: "Water",
    category: "Utility",
    blockId: BLOCKS.water.id,
    canPlaceForeground: true,
    canPlaceBackground: false,
    foregroundBlockId: BLOCKS.water.id,
  },
  woodWall: {
    id: "woodWall",
    name: "Wood Wall",
    category: "Materials",
    wallId: WALLS.woodWall.id,
  },
  stoneWall: {
    id: "stoneWall",
    name: "Stone Wall",
    category: "Materials",
    wallId: WALLS.stoneWall.id,
  },
  brickWall: {
    id: "brickWall",
    name: "Brick Wall",
    category: "Materials",
    wallId: WALLS.brickWall.id,
  },
  glassWall: {
    id: "glassWall",
    name: "Glass Wall",
    category: "Materials",
    wallId: WALLS.glassWall.id,
  },
  ladder: {
    id: "ladder",
    name: "Ladder",
    category: "Utility",
    wallId: WALLS.ladder.id,
    canPlaceForeground: false,
    canPlaceBackground: true,
    forcedPlacementLayer: "background",
    backgroundWallId: WALLS.ladder.id,
  },
  woodenPickaxe: {
    id: "woodenPickaxe",
    name: "Wooden Pickaxe",
    category: "Tools",
  },
  woodenAxe: {
    id: "woodenAxe",
    name: "Wooden Axe",
    category: "Tools",
  },
  woodenShovel: {
    id: "woodenShovel",
    name: "Wooden Shovel",
    category: "Tools",
  },
  stonePickaxe: {
    id: "stonePickaxe",
    name: "Stone Pickaxe",
    category: "Tools",
  },
  stoneAxe: {
    id: "stoneAxe",
    name: "Stone Axe",
    category: "Tools",
  },
  stoneShovel: {
    id: "stoneShovel",
    name: "Stone Shovel",
    category: "Tools",
  },
  workbench: {
    id: "workbench",
    name: "Workbench",
    category: "Utility",
    blockId: BLOCKS.workbench.id,
    canPlaceForeground: true,
    canPlaceBackground: false,
    foregroundBlockId: BLOCKS.workbench.id,
  },
  sapling: {
    id: "sapling",
    name: "Sapling",
    category: "Materials",
    color: "#2f8f45",
  },
};

for (const item of Object.values(ITEMS)) {
  Object.assign(item, { ...PLACEMENT_DEFAULTS, ...item });
  item.texture ??= item.foregroundBlockId ?? item.blockId ?? null;
}

const LEGACY_WALL_ITEM_IDS = new Set([
  "woodWall",
  "stoneWall",
  "brickWall",
  "glassWall",
]);

export const ITEM_LIST = Object.values(ITEMS).filter(
  (item) => !LEGACY_WALL_ITEM_IDS.has(item.id),
);

const BACKGROUND_ITEM_BY_WALL_ID = new Map([
  [WALLS.woodWall.id, "wood"],
  [WALLS.stoneWall.id, "stone"],
  [WALLS.stoneBack.id, "stone"],
  [WALLS.deepStoneBack.id, "stone"],
  [WALLS.brickWall.id, "brick"],
  [WALLS.glassWall.id, "glass"],
  [WALLS.dirtBack.id, "dirt"],
  [WALLS.ladder.id, "ladder"],
]);

const BLOCK_ITEM_BY_ID = new Map(
  ITEM_LIST.filter((item) => item.blockId !== undefined).map((item) => [
    item.blockId,
    item.id,
  ]),
);

const WALL_ITEM_BY_ID = new Map(
  ITEM_LIST.filter((item) => item.wallId !== undefined).map((item) => [
    item.wallId,
    item.id,
  ]),
);

const FOREGROUND_INDEX_BY_ITEM_ID = new Map(
  FOREGROUND_ITEMS.map((item, index) => [getForegroundItemId(item), index]),
);

export function getBlockItemId(block) {
  return BLOCK_ITEM_BY_ID.get(block?.id) ?? null;
}

export function getWallItemId(wall) {
  return WALL_ITEM_BY_ID.get(wall?.id) ?? null;
}

export function getForegroundItemId(item) {
  if (!item) return null;
  if (item.kind === "tool") return item.id;
  if (item.kind === "special") return item.id;
  if (item.wallId !== undefined) return getWallItemId(WALL_BY_ID[item.wallId]);
  return getBlockItemId(item);
}

export function getInventoryItemForPlaceable(item) {
  const itemId =
    typeof item === "string" ? item : getForegroundItemId(item) ?? item?.id;
  return ITEMS[itemId] ?? null;
}

export function getForegroundIndexForItem(itemId) {
  return FOREGROUND_INDEX_BY_ITEM_ID.get(itemId) ?? null;
}

export function getWallIndexForItem(itemId) {
  void itemId;
  return null;
}

export function getItemName(itemId) {
  return ITEMS[itemId]?.name ?? itemId;
}

export function getItemForRemovedBackgroundWall(wallOrId) {
  const wallId = typeof wallOrId === "number" ? wallOrId : wallOrId?.id;
  return BACKGROUND_ITEM_BY_WALL_ID.get(wallId) ?? null;
}

export function getPlacementLayerForItem(item, buildMode) {
  const inventoryItem = getInventoryItemForPlaceable(item);
  return inventoryItem?.forcedPlacementLayer ?? buildMode;
}

export function canItemPlaceInLayer(item, layer) {
  const inventoryItem = getInventoryItemForPlaceable(item);
  if (!inventoryItem) return false;
  return layer === "background"
    ? inventoryItem.canPlaceBackground
    : inventoryItem.canPlaceForeground;
}

export function getForegroundBlockForItem(item) {
  const inventoryItem = getInventoryItemForPlaceable(item);
  return BLOCK_BY_ID[inventoryItem?.foregroundBlockId] ?? null;
}

export function getBackgroundWallForItem(item) {
  const inventoryItem = getInventoryItemForPlaceable(item);
  return WALL_BY_ID[inventoryItem?.backgroundWallId] ?? null;
}

export function getBackgroundWallForBlock(blockOrItem) {
  return getBackgroundWallForItem(blockOrItem);
}

export function isForcedPlacementItem(item) {
  return Boolean(getInventoryItemForPlaceable(item)?.forcedPlacementLayer);
}

export function canPlaceAsForeground(item) {
  return canItemPlaceInLayer(item, "foreground");
}

export function canPlaceAsBackground(item) {
  return canItemPlaceInLayer(item, "background");
}

export function getInventoryCategory(item) {
  return getInventoryItemForPlaceable(item)?.category ?? "Materials";
}
