import { BLOCKS, FOREGROUND_ITEMS, WALLS, WALL_PLACEABLE } from "./constants";

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

export const ITEM_LIST = Object.values(ITEMS);

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
  WALL_PLACEABLE.map((wall, index) => [getWallItemId(wall), index]),
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
