import {
  BLOCKS,
  FOREGROUND_ITEMS,
  WALL_BY_ID,
  WALLS,
  WALL_PLACEABLE,
} from "./constants";

export const ITEMS = {
  grass: {
    id: "grass",
    name: "Grass",
    category: "block",
    blockId: BLOCKS.grass.id,
  },
  wood: {
    id: "wood",
    name: "Wood",
    category: "material",
    blockId: BLOCKS.wood.id,
  },
  planks: {
    id: "planks",
    name: "Planks",
    category: "block",
    blockId: BLOCKS.planks.id,
  },
  sticks: {
    id: "sticks",
    name: "Stick",
    category: "tool",
    color: "#8b552c",
  },
  dirt: {
    id: "dirt",
    name: "Dirt",
    category: "block",
    blockId: BLOCKS.dirt.id,
  },
  stone: {
    id: "stone",
    name: "Stone",
    category: "block",
    blockId: BLOCKS.stone.id,
  },
  sand: {
    id: "sand",
    name: "Sand",
    category: "block",
    blockId: BLOCKS.sand.id,
  },
  rawOre: {
    id: "rawOre",
    name: "Raw Ore",
    category: "material",
    blockId: BLOCKS.ore.id,
  },
  coal: {
    id: "coal",
    name: "Coal",
    category: "block",
    blockId: BLOCKS.coal.id,
  },
  torch: {
    id: "torch",
    name: "Torch",
    category: "block",
    blockId: BLOCKS.torch.id,
  },
  glass: {
    id: "glass",
    name: "Glass",
    category: "block",
    blockId: BLOCKS.glass.id,
  },
  brick: {
    id: "brick",
    name: "Brick",
    category: "block",
    blockId: BLOCKS.brick.id,
  },
  water: {
    id: "water",
    name: "Water",
    category: "liquid",
    blockId: BLOCKS.water.id,
  },
  woodWall: {
    id: "woodWall",
    name: "Wood Wall",
    category: "wall",
    wallId: WALLS.woodWall.id,
  },
  stoneWall: {
    id: "stoneWall",
    name: "Stone Wall",
    category: "wall",
    wallId: WALLS.stoneWall.id,
  },
  brickWall: {
    id: "brickWall",
    name: "Brick Wall",
    category: "wall",
    wallId: WALLS.brickWall.id,
  },
  glassWall: {
    id: "glassWall",
    name: "Glass Wall",
    category: "wall",
    wallId: WALLS.glassWall.id,
  },
  ladder: {
    id: "ladder",
    name: "Ladder",
    category: "wall",
    wallId: WALLS.ladder.id,
  },
  woodenPickaxe: {
    id: "woodenPickaxe",
    name: "Wooden Pickaxe",
    category: "tool",
  },
  woodenAxe: {
    id: "woodenAxe",
    name: "Wooden Axe",
    category: "tool",
  },
  woodenShovel: {
    id: "woodenShovel",
    name: "Wooden Shovel",
    category: "tool",
  },
  stonePickaxe: {
    id: "stonePickaxe",
    name: "Stone Pickaxe",
    category: "tool",
  },
  stoneAxe: {
    id: "stoneAxe",
    name: "Stone Axe",
    category: "tool",
  },
  stoneShovel: {
    id: "stoneShovel",
    name: "Stone Shovel",
    category: "tool",
  },
  workbench: {
    id: "workbench",
    name: "Workbench",
    category: "block",
    blockId: BLOCKS.workbench.id,
  },
  sapling: {
    id: "sapling",
    name: "Sapling",
    category: "material",
    color: "#2f8f45",
  },
};

const LEGACY_WALL_ITEM_IDS = new Set([
  "woodWall",
  "stoneWall",
  "brickWall",
  "glassWall",
]);

export const ITEM_LIST = Object.values(ITEMS).filter(
  (item) => !LEGACY_WALL_ITEM_IDS.has(item.id),
);

const BACKGROUND_WALL_BY_BLOCK_ID = new Map([
  [BLOCKS.grass.id, WALLS.dirtBack.id],
  [BLOCKS.dirt.id, WALLS.dirtBack.id],
  [BLOCKS.sand.id, WALLS.dirtBack.id],
  [BLOCKS.stone.id, WALLS.stoneWall.id],
  [BLOCKS.wood.id, WALLS.woodWall.id],
  [BLOCKS.planks.id, WALLS.woodWall.id],
  [BLOCKS.brick.id, WALLS.brickWall.id],
  [BLOCKS.glass.id, WALLS.glassWall.id],
]);

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

const WALL_INDEX_BY_ITEM_ID = new Map(
  WALL_PLACEABLE.map((wall, index) => [getWallItemId(wall), index]).filter(
    ([itemId]) => itemId !== null,
  ),
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

export function getForegroundIndexForItem(itemId) {
  return FOREGROUND_INDEX_BY_ITEM_ID.get(itemId) ?? null;
}

export function getWallIndexForItem(itemId) {
  return WALL_INDEX_BY_ITEM_ID.get(itemId) ?? null;
}

export function getItemName(itemId) {
  return ITEMS[itemId]?.name ?? itemId;
}

export function getBackgroundWallForBlock(blockOrItem) {
  const blockId =
    typeof blockOrItem === "string"
      ? ITEMS[blockOrItem]?.blockId
      : typeof blockOrItem === "number"
        ? blockOrItem
        : blockOrItem?.blockId ?? blockOrItem?.id;
  const wallId = BACKGROUND_WALL_BY_BLOCK_ID.get(blockId);
  return WALL_BY_ID[wallId] ?? null;
}

export function getItemForRemovedBackgroundWall(wallOrId) {
  const wallId = typeof wallOrId === "number" ? wallOrId : wallOrId?.id;
  return BACKGROUND_ITEM_BY_WALL_ID.get(wallId) ?? null;
}

export function canPlaceAsForeground(item) {
  if (!item || item.kind === "tool") return false;
  return item.blockId !== undefined || getBlockItemId(item) !== null;
}

export function canPlaceAsBackground(item) {
  if (!item || item.category === "tool" || item.kind === "tool") return false;
  if (item.id === "torch" || item.id === "ladder") return true;
  return Boolean(getBackgroundWallForBlock(item));
}
