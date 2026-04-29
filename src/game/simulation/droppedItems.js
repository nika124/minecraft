import {
  BLOCK_BY_ID,
  BLOCKS,
  FOREGROUND_ITEMS,
  TILE,
  WALL_BY_ID,
  WORLD_H,
  WORLD_W,
} from "../constants";
import { addItem } from "../inventory";
import { ITEMS } from "../items";
import { getBlockTexture, getItemTexture, getWallTexture } from "../textures";

let nextDropId = 1;

function isSolidTile(world, x, y) {
  if (x < 0 || x >= WORLD_W || y < 0 || y >= WORLD_H) return true;
  const block = BLOCK_BY_ID[world[y][x]] ?? BLOCKS.air;
  return Boolean(block.solid);
}

function dropTexture(item) {
  if (!item) return null;
  if (item.blockId !== undefined) return getBlockTexture(BLOCK_BY_ID[item.blockId]);
  if (item.wallId !== undefined) return getWallTexture(WALL_BY_ID[item.wallId]);
  if (item.category === "tool") {
    const tool = FOREGROUND_ITEMS.find((foregroundItem) => foregroundItem.id === item.id);
    return tool ? getItemTexture(tool) : null;
  }
  return null;
}

export function spawnDroppedItems(droppedItemsRef, drops = [], x, y) {
  if (!droppedItemsRef?.current || drops.length === 0) return false;

  for (const drop of drops) {
    if (!drop.itemId || (drop.amount ?? 0) <= 0) continue;
    droppedItemsRef.current.push({
      id: nextDropId++,
      itemId: drop.itemId,
      amount: drop.amount ?? 1,
      x,
      y,
      vx: (Math.random() - 0.5) * 170,
      vy: -150 - Math.random() * 90,
      age: 0,
    });
  }

  return true;
}

export function updateDroppedItems({
  droppedItemsRef,
  world,
  player,
  inventoryRef,
  dt,
  onInventoryChange,
}) {
  const items = droppedItemsRef.current;
  if (!items.length) return 0;

  let pickedUp = 0;
  const playerCenterX = player.x + player.w / 2;
  const playerCenterY = player.y + player.h / 2;

  for (let index = items.length - 1; index >= 0; index--) {
    const item = items[index];
    item.age += dt;
    item.vy = Math.min(620, item.vy + 1300 * dt);
    item.vx *= 0.985 ** (dt * 60);

    let nextX = item.x + item.vx * dt;
    let nextY = item.y + item.vy * dt;
    const tileX = Math.floor(nextX / TILE);
    const tileY = Math.floor((nextY + 8) / TILE);

    if (isSolidTile(world, tileX, tileY)) {
      nextY = tileY * TILE - 9;
      item.vy = Math.min(0, -item.vy * 0.16);
      item.vx *= 0.78;
    }

    item.x = nextX;
    item.y = nextY;

    const distance = Math.hypot(item.x - playerCenterX, item.y - playerCenterY);
    if (item.age > 0.18 && distance <= 40) {
      if (addItem(inventoryRef, item.itemId, item.amount)) {
        items.splice(index, 1);
        pickedUp += item.amount;
      }
    }
  }

  if (pickedUp > 0) onInventoryChange?.();
  return pickedUp;
}

export function drawDroppedItems(ctx, droppedItems, cam, time) {
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.font = "10px ui-monospace, Consolas, monospace";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";

  for (const drop of droppedItems) {
    const item = ITEMS[drop.itemId];
    const texture = dropTexture(item);
    const x = drop.x - cam.x;
    const y = drop.y - cam.y + Math.sin(time * 5 + drop.id) * 1.5;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time * 2.4 + drop.id) * 0.08);

    if (texture) {
      ctx.drawImage(texture, -9, -9, 18, 18);
    } else {
      ctx.fillStyle = item?.color ?? "#f8fafc";
      ctx.fillRect(-8, -8, 16, 16);
      ctx.strokeStyle = "rgba(0,0,0,.45)";
      ctx.strokeRect(-8.5, -8.5, 17, 17);
    }

    ctx.restore();

    if (drop.amount > 1) {
      ctx.fillStyle = "rgba(17,24,39,.86)";
      ctx.fillText(drop.amount, x + 13, y + 13);
      ctx.fillStyle = "#ffffff";
      ctx.fillText(drop.amount, x + 12, y + 12);
    }
  }

  ctx.restore();
}
