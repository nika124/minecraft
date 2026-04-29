export const MINING_TOOLS = {
  hand: {
    id: "hand",
    name: "Hand",
    speed: 1,
    effectiveOn: [],
    effectiveMultiplier: 1,
  },
  axe: {
    id: "axe",
    name: "Axe",
    speed: 1.2,
    effectiveOn: ["axe"],
    effectiveMultiplier: 2.5,
  },
  pickaxe: {
    id: "pickaxe",
    name: "Pickaxe",
    speed: 1.15,
    effectiveOn: ["pickaxe"],
    effectiveMultiplier: 2.8,
  },
  shovel: {
    id: "shovel",
    name: "Shovel",
    speed: 1.25,
    effectiveOn: ["shovel"],
    effectiveMultiplier: 2.4,
  },
};

export function getSelectedMiningTool(selectedItem) {
  const baseTool = MINING_TOOLS[selectedItem?.miningTool] ?? MINING_TOOLS.hand;
  if (selectedItem?.kind !== "tool") return baseTool;

  return {
    ...baseTool,
    id: selectedItem.id,
    name: selectedItem.name,
    speed: selectedItem.miningSpeed ?? baseTool.speed,
    effectiveMultiplier:
      selectedItem.effectiveMultiplier ?? baseTool.effectiveMultiplier,
  };
}

export function getBlockBreakTime(block, tool = MINING_TOOLS.hand) {
  const hardness = block?.hardness ?? 0.2;
  if (hardness <= 0) return 0;
  if (block.requiresTool && !tool.effectiveOn.includes(block.requiresTool)) {
    return Infinity;
  }

  const isEffective = tool.effectiveOn.includes(block.miningType);
  const speed = tool.speed * (isEffective ? tool.effectiveMultiplier : 1);

  return Math.max(0.06, hardness / speed);
}

export function resetMiningState(miningRef) {
  if (!miningRef?.current) return;

  miningRef.current.targetKey = null;
  miningRef.current.blockId = null;
  miningRef.current.progress = 0;
  miningRef.current.requiredTime = 0;
}
