import { VIEW_H, VIEW_W } from "../constants";

export const HOTBAR_SLOT_COUNT = 10;
export const HOTBAR_SLOT_SIZE = 48;
export const HOTBAR_SLOT_GAP = 6;
export const HOTBAR_Y = VIEW_H - 62;

export function getHotbarStartX() {
  const totalW =
    HOTBAR_SLOT_COUNT * HOTBAR_SLOT_SIZE +
    (HOTBAR_SLOT_COUNT - 1) * HOTBAR_SLOT_GAP;

  return (VIEW_W - totalW) / 2;
}

export function getHotbarSlotLabel(slotIndex) {
  return slotIndex === 9 ? "0" : String(slotIndex + 1);
}

export function getHotbarSlotAt(x, y) {
  const startX = getHotbarStartX();

  for (let index = 0; index < HOTBAR_SLOT_COUNT; index++) {
    const slotX = startX + index * (HOTBAR_SLOT_SIZE + HOTBAR_SLOT_GAP);

    if (
      x >= slotX &&
      x <= slotX + HOTBAR_SLOT_SIZE &&
      y >= HOTBAR_Y &&
      y <= HOTBAR_Y + HOTBAR_SLOT_SIZE
    ) {
      return index;
    }
  }

  return null;
}
