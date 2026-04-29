import { RECIPES } from "./recipes";

const GRID_SIZE = {
  "2x2": 2,
  "3x3": 3,
};

function normalizePattern(pattern) {
  const height = pattern.length;
  const width = pattern.reduce((max, row) => Math.max(max, row.length), 0);
  return {
    width,
    height,
    rows: pattern.map((row) => row.padEnd(width, " ")),
  };
}

function mirrorPattern(pattern) {
  return pattern.map((row) => [...row].reverse().join(""));
}

function slotItemId(slot) {
  return slot?.amount > 0 ? slot.itemId : null;
}

function patternMatchesAt(recipe, pattern, grid, gridWidth, gridHeight, offsetX, offsetY) {
  const normalized = normalizePattern(pattern);

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const patternX = x - offsetX;
      const patternY = y - offsetY;
      const insidePattern =
        patternX >= 0 &&
        patternY >= 0 &&
        patternX < normalized.width &&
        patternY < normalized.height;
      const symbol = insidePattern ? normalized.rows[patternY][patternX] : " ";
      const expectedItemId = symbol === " " ? null : recipe.key[symbol];
      const actualItemId = slotItemId(grid[y * gridWidth + x]);

      if (expectedItemId !== actualItemId) return false;
    }
  }

  return true;
}

function recipeCanUseGrid(recipe, gridWidth, gridHeight, station = null) {
  const requiredGridSize = GRID_SIZE[recipe.size] ?? 3;
  if (requiredGridSize > Math.min(gridWidth, gridHeight)) return false;
  if (recipe.station && recipe.station !== station) return false;
  return true;
}

export function matchRecipe(grid, gridWidth, gridHeight, station = null, recipes = RECIPES) {
  for (const recipe of recipes) {
    if (!recipeCanUseGrid(recipe, gridWidth, gridHeight, station)) continue;

    const patterns = recipe.mirror
      ? [recipe.pattern, mirrorPattern(recipe.pattern)]
      : [recipe.pattern];

    for (const pattern of patterns) {
      const normalized = normalizePattern(pattern);
      if (normalized.width > gridWidth || normalized.height > gridHeight) continue;

      for (let y = 0; y <= gridHeight - normalized.height; y++) {
        for (let x = 0; x <= gridWidth - normalized.width; x++) {
          if (patternMatchesAt(recipe, pattern, grid, gridWidth, gridHeight, x, y)) {
            return recipe;
          }
        }
      }
    }
  }

  return null;
}

export function getCraftingOutput(grid, gridWidth, gridHeight, station = null) {
  const recipe = matchRecipe(grid, gridWidth, gridHeight, station);
  if (!recipe) return null;
  return {
    recipe,
    itemId: recipe.output,
    amount: recipe.amount,
  };
}

export function consumeCraftingIngredients(grid, recipe) {
  if (!recipe) return grid;
  return grid.map((slot) => {
    if (!slot?.amount) return null;
    const nextAmount = slot.amount - 1;
    return nextAmount > 0 ? { ...slot, amount: nextAmount } : null;
  });
}
