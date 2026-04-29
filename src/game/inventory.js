export const STARTING_INVENTORY = {};

function resolveInventory(inventoryOrRef) {
  return inventoryOrRef?.current ?? inventoryOrRef;
}

export function createInventory(initialItems = STARTING_INVENTORY) {
  return { ...initialItems };
}

export function getItemCount(inventoryOrRef, itemId) {
  const inventory = resolveInventory(inventoryOrRef);
  return Math.max(0, inventory?.[itemId] ?? 0);
}

export function addItem(inventoryOrRef, itemId, amount = 1) {
  const inventory = resolveInventory(inventoryOrRef);
  if (!inventory || !itemId || amount <= 0) return false;
  inventory[itemId] = getItemCount(inventory, itemId) + amount;
  return true;
}

export function hasItems(inventoryOrRef, ingredients = {}) {
  const inventory = resolveInventory(inventoryOrRef);
  return Object.entries(ingredients).every(
    ([itemId, amount]) => getItemCount(inventory, itemId) >= amount,
  );
}

export function removeItem(inventoryOrRef, itemId, amount = 1) {
  const inventory = resolveInventory(inventoryOrRef);
  if (!inventory || !itemId || amount <= 0) return false;
  if (!hasItems(inventory, { [itemId]: amount })) return false;

  const nextCount = getItemCount(inventory, itemId) - amount;
  if (nextCount > 0) {
    inventory[itemId] = nextCount;
  } else {
    delete inventory[itemId];
  }
  return true;
}

export function addDrops(inventoryOrRef, drops = []) {
  let changed = false;
  for (const drop of drops) {
    if (addItem(inventoryOrRef, drop.itemId, drop.amount ?? 1)) {
      changed = true;
    }
  }
  return changed;
}
