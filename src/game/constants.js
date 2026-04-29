export const TILE = 32;
export const WORLD_W = 2048;
export const WORLD_H = 84;
export const VIEW_W = 960;
export const VIEW_H = 560;
export const SEA_LEVEL = 55;

export const BLOCKS = {
  air: { id: 0, name: "Air", solid: false, color: "transparent" },
  grass: {
    id: 1,
    name: "Grass",
    solid: true,
    color: "#46b455",
    top: "#66d35f",
    hardness: 0.25,
    miningType: "shovel",
  },
  dirt: {
    id: 2,
    name: "Dirt",
    solid: true,
    color: "#8a5a32",
    hardness: 0.35,
    miningType: "shovel",
  },
  stone: {
    id: 3,
    name: "Stone",
    solid: true,
    color: "#7c8088",
    hardness: 1.4,
    miningType: "pickaxe",
  },
  wood: {
    id: 4,
    name: "Wood",
    solid: true,
    color: "#8b552c",
    hardness: 0.75,
    miningType: "axe",
  },
  leaves: {
    id: 5,
    name: "Leaves",
    solid: true,
    color: "#2f8f45",
    hardness: 0.2,
    miningType: "axe",
  },
  sand: {
    id: 6,
    name: "Sand",
    solid: true,
    color: "#d8c075",
    hardness: 0.3,
    miningType: "shovel",
  },
  brick: {
    id: 7,
    name: "Brick",
    solid: true,
    color: "#b35a43",
    hardness: 1.2,
    miningType: "pickaxe",
  },
  glass: {
    id: 8,
    name: "Glass",
    solid: true,
    color: "rgba(130,210,235,.45)",
    hardness: 0.45,
    miningType: "pickaxe",
  },
  ore: {
    id: 9,
    name: "Ore",
    solid: true,
    color: "#5f6470",
    accent: "#6ee7ff",
    hardness: 2,
    miningType: "pickaxe",
  },
  torch: {
    id: 10,
    name: "Torch",
    solid: false,
    color: "#f59e0b",
    glow: "#fbbf24",
    hardness: 0.08,
  },
  water: {
    id: 11,
    name: "Water",
    solid: false,
    color: "rgba(45, 145, 235, .72)",
    hardness: 0,
  },
};

export const WALLS = {
  empty: { id: 0, name: "No Wall", color: "transparent" },
  woodWall: {
    id: 1,
    name: "Wood Wall",
    color: "#6f4826",
    line: "rgba(255, 220, 160, .15)",
  },
  brickWall: {
    id: 2,
    name: "Brick Wall",
    color: "#873d2d",
    line: "rgba(255, 205, 185, .12)",
  },
  stoneWall: {
    id: 3,
    name: "Stone Wall",
    color: "#4e545f",
    line: "rgba(230, 240, 255, .13)",
  },
  glassWall: {
    id: 4,
    name: "Glass Wall",
    color: "rgba(105, 190, 220, .3)",
    line: "rgba(240, 255, 255, .28)",
  },
  dirtBack: {
    id: 5,
    name: "Dirt Backdrop",
    color: "#5b3a22",
    line: "rgba(220, 170, 120, .16)",
  },
  stoneBack: {
    id: 6,
    name: "Stone Backdrop",
    color: "#373c46",
    line: "rgba(210, 220, 235, .16)",
  },
  deepStoneBack: {
    id: 7,
    name: "Deep Stone Backdrop",
    color: "#1f2530",
    line: "rgba(130, 150, 175, .18)",
  },
  ladder: {
    id: 8,
    name: "Ladder",
    color: "#8b552c",
    line: "rgba(255, 220, 160, .22)",
  },
};

export const BLOCK_BY_ID = Object.fromEntries(
  Object.values(BLOCKS).map((block) => [block.id, block]),
);

export const WALL_BY_ID = Object.fromEntries(
  Object.values(WALLS).map((wall) => [wall.id, wall]),
);

export const PLACEABLE = [
  BLOCKS.grass,
  BLOCKS.dirt,
  BLOCKS.stone,
  BLOCKS.wood,
  BLOCKS.leaves,
  BLOCKS.sand,
  BLOCKS.brick,
  BLOCKS.glass,
  BLOCKS.torch,
  BLOCKS.water,
  BLOCKS.ore,
];

export const TOOLS = [
  {
    id: "tool-shovel",
    kind: "tool",
    name: "Shovel",
    miningTool: "shovel",
    color: "#cbd5e1",
    accent: "#8a5a32",
  },
  {
    id: "tool-pickaxe",
    kind: "tool",
    name: "Pickaxe",
    miningTool: "pickaxe",
    color: "#cbd5e1",
    accent: "#7c8088",
  },
  {
    id: "tool-axe",
    kind: "tool",
    name: "Axe",
    miningTool: "axe",
    color: "#cbd5e1",
    accent: "#8b552c",
  },
];

export const FOREGROUND_ITEMS = [...PLACEABLE, ...TOOLS];

export const WALL_PLACEABLE = [
  WALLS.woodWall,
  WALLS.brickWall,
  WALLS.stoneWall,
  WALLS.glassWall,
  WALLS.ladder,
];
