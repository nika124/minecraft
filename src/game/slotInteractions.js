export const MOUSE_BUTTON = {
  LEFT: 0,
  RIGHT: 2,
};

export function cloneStack(stack) {
  return stack?.amount > 0 ? { itemId: stack.itemId, amount: stack.amount } : null;
}

export function clickStackSlot(slotStack, cursorStack, button) {
  const slot = cloneStack(slotStack);
  const cursor = cloneStack(cursorStack);

  if (button === MOUSE_BUTTON.RIGHT) {
    if (!cursor && slot) {
      const taken = Math.ceil(slot.amount / 2);
      const remaining = slot.amount - taken;
      return {
        slot: remaining > 0 ? { ...slot, amount: remaining } : null,
        cursor: { itemId: slot.itemId, amount: taken },
      };
    }

    if (cursor && !slot) {
      return {
        slot: { itemId: cursor.itemId, amount: 1 },
        cursor:
          cursor.amount > 1
            ? { itemId: cursor.itemId, amount: cursor.amount - 1 }
            : null,
      };
    }

    if (cursor && slot?.itemId === cursor.itemId) {
      return {
        slot: { ...slot, amount: slot.amount + 1 },
        cursor:
          cursor.amount > 1
            ? { itemId: cursor.itemId, amount: cursor.amount - 1 }
            : null,
      };
    }

    return { slot, cursor };
  }

  if (!cursor && slot) {
    return { slot: null, cursor: slot };
  }

  if (cursor && !slot) {
    return { slot: cursor, cursor: null };
  }

  if (cursor && slot?.itemId === cursor.itemId) {
    return {
      slot: { ...slot, amount: slot.amount + cursor.amount },
      cursor: null,
    };
  }

  if (cursor && slot) {
    return { slot: cursor, cursor: slot };
  }

  return { slot, cursor };
}

export function clickInventoryCount(itemId, count, cursorStack, button) {
  const cursor = cloneStack(cursorStack);
  const slot = count > 0 ? { itemId, amount: count } : null;
  const next = clickStackSlot(slot, cursor, button);

  return {
    inventoryAmount:
      next.slot?.itemId === itemId ? next.slot.amount : 0,
    cursor: next.cursor,
    displacedStack:
      next.slot && next.slot.itemId !== itemId ? next.slot : null,
  };
}

export function placeIntoCraftingSlot(slotStack, cursorStack, { placeFull = false, button = MOUSE_BUTTON.LEFT } = {}) {
  const slot = cloneStack(slotStack);
  const cursor = cloneStack(cursorStack);

  if (button === MOUSE_BUTTON.RIGHT && slot) {
    if (cursor && cursor.itemId !== slot.itemId) {
      return { slot, cursor };
    }

    const nextSlotAmount = slot.amount - 1;
    return {
      slot: nextSlotAmount > 0 ? { ...slot, amount: nextSlotAmount } : null,
      cursor: {
        itemId: slot.itemId,
        amount: (cursor?.amount ?? 0) + 1,
      },
    };
  }

  if (!cursor) return clickStackSlot(slot, null, button);

  if (slot && slot.itemId !== cursor.itemId) {
    return { slot, cursor };
  }

  const amountToPlace = placeFull ? cursor.amount : 1;
  const nextCursorAmount = cursor.amount - amountToPlace;
  const nextSlotAmount = (slot?.amount ?? 0) + amountToPlace;

  return {
    slot: { itemId: cursor.itemId, amount: nextSlotAmount },
    cursor:
      nextCursorAmount > 0
        ? { itemId: cursor.itemId, amount: nextCursorAmount }
        : null,
  };
}

export function placeIntoItemCountSlot(itemId, count, cursorStack, { placeFull = false } = {}) {
  const cursor = cloneStack(cursorStack);
  if (!cursor || cursor.itemId !== itemId) {
    return { amount: count, cursor };
  }

  const amountToPlace = placeFull ? cursor.amount : 1;
  const nextCursorAmount = cursor.amount - amountToPlace;

  return {
    amount: count + amountToPlace,
    cursor:
      nextCursorAmount > 0
        ? { itemId: cursor.itemId, amount: nextCursorAmount }
        : null,
  };
}
