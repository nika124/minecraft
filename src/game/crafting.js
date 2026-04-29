import { addItem, hasItems, removeItem } from "./inventory";

export function canCraft(inventoryOrRef, recipe) {
  return Boolean(recipe) && hasItems(inventoryOrRef, recipe.ingredients);
}

export function craftItem(inventoryOrRef, recipe) {
  if (!canCraft(inventoryOrRef, recipe)) return false;

  for (const [itemId, amount] of Object.entries(recipe.ingredients)) {
    removeItem(inventoryOrRef, itemId, amount);
  }

  addItem(inventoryOrRef, recipe.output, recipe.amount);
  return true;
}
