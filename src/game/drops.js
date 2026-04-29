import { BLOCKS, WALLS } from "./constants";
import { getItemName } from "./items";

const BLOCK_DROPS = {
  [BLOCKS.grass.id]: [{ itemId: "dirt", amount: 1 }],
  [BLOCKS.dirt.id]: [{ itemId: "dirt", amount: 1 }],
  [BLOCKS.stone.id]: [{ itemId: "stone", amount: 1 }],
  [BLOCKS.wood.id]: [{ itemId: "wood", amount: 1 }],
  [BLOCKS.sand.id]: [{ itemId: "sand", amount: 1 }],
  [BLOCKS.ore.id]: [{ itemId: "rawOre", amount: 1 }],
  [BLOCKS.torch.id]: [{ itemId: "torch", amount: 1 }],
  [BLOCKS.brick.id]: [{ itemId: "brick", amount: 1 }],
  [BLOCKS.glass.id]: [{ itemId: "glass", amount: 1 }],
  [BLOCKS.workbench.id]: [{ itemId: "workbench", amount: 1 }],
  [BLOCKS.planks.id]: [{ itemId: "planks", amount: 1 }],
  [BLOCKS.coal.id]: [{ itemId: "coal", amount: 1 }],
};

const WALL_DROPS = {
  [WALLS.woodWall.id]: [{ itemId: "woodWall", amount: 1 }],
  [WALLS.stoneWall.id]: [{ itemId: "stoneWall", amount: 1 }],
  [WALLS.brickWall.id]: [{ itemId: "brickWall", amount: 1 }],
  [WALLS.glassWall.id]: [{ itemId: "glassWall", amount: 1 }],
  [WALLS.ladder.id]: [{ itemId: "ladder", amount: 1 }],
};

export function getBlockDrops(block) {
  if (!block || block.id === BLOCKS.water.id || block.unbreakable) return [];

  if (block.id === BLOCKS.leaves.id) {
    const drops = [];
    if (Math.random() < 0.4) drops.push({ itemId: "sticks", amount: 1 });
    if (Math.random() < 0.12) drops.push({ itemId: "sapling", amount: 1 });
    return drops;
  }

  return BLOCK_DROPS[block.id] ?? [];
}

export function getWallDrops(wall) {
  return WALL_DROPS[wall?.id] ?? [];
}

export function formatDrops(drops) {
  if (!drops.length) return "";
  return drops
    .map((drop) => {
      const name = getItemName(drop.itemId);
      return `${drop.amount > 1 ? `${drop.amount} ` : ""}${name}`;
    })
    .join(", ");
}
