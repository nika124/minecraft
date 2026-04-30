import { FOREGROUND_ITEMS, VIEW_H, VIEW_W, WALL_BY_ID } from "../constants";
import { getItemCount } from "../inventory";
import { getForegroundItemId } from "../items";
import { getBlockTexture, getItemTexture, getWallTexture } from "../textures";
import { clamp } from "../world";

function drawPanel(ctx, x, y, w, h, fill = "#c6c6c6") {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#111827";
  ctx.strokeRect(x + 2, y + 2, w - 4, h - 4);
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.fillRect(x + 5, y + 5, w - 10, 3);
  ctx.fillRect(x + 5, y + 5, 3, h - 10);
  ctx.fillStyle = "rgba(0,0,0,.48)";
  ctx.fillRect(x + 5, y + h - 8, w - 10, 3);
  ctx.fillRect(x + w - 8, y + 5, 3, h - 10);
}

function drawButton(ctx, button, mouse) {
  const hovering =
    mouse.x >= button.x &&
    mouse.x <= button.x + button.w &&
    mouse.y >= button.y &&
    mouse.y <= button.y + button.h;

  ctx.fillStyle = hovering ? "#b8b8b8" : "#a3a3a3";
  ctx.fillRect(button.x, button.y, button.w, button.h);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#111827";
  ctx.strokeRect(button.x + 0.5, button.y + 0.5, button.w - 1, button.h - 1);
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.fillRect(button.x + 3, button.y + 3, button.w - 6, 2);
  ctx.fillRect(button.x + 3, button.y + 3, 2, button.h - 6);
  ctx.fillStyle = "rgba(0,0,0,.45)";
  ctx.fillRect(button.x + 3, button.y + button.h - 5, button.w - 6, 2);
  ctx.fillRect(button.x + button.w - 5, button.y + 3, 2, button.h - 6);
  ctx.fillStyle = "#111827";
  ctx.font = "900 17px ui-monospace, Cascadia Mono, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.fillText(button.label, button.x + button.w / 2, button.y + 29);
}

function drawBeveledRect(ctx, x, y, w, h, fill = "#a3a3a3") {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#111827";
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = "rgba(255,255,255,.85)";
  ctx.fillRect(x + 3, y + 3, w - 6, 2);
  ctx.fillRect(x + 3, y + 3, 2, h - 6);
  ctx.fillStyle = "rgba(0,0,0,.45)";
  ctx.fillRect(x + 3, y + h - 5, w - 6, 2);
  ctx.fillRect(x + w - 5, y + 3, 2, h - 6);
}

export function drawHotbar(ctx, state) {
  const {
    buildMode,
    blockHotbar,
    selected,
    inventory,
  } = state;
  const items = blockHotbar.map((index) => FOREGROUND_ITEMS[index]);
  const selectedIndex = selected;
  const slot = 48;
  const gap = 6;
  const count = 10;
  const totalW = count * slot + (count - 1) * gap;
  const startX = (VIEW_W - totalW) / 2;
  const y = VIEW_H - 62;

  for (let i = 0; i < count; i++) {
    const item = items[i];
    const x = startX + i * (slot + gap);
    const selectedItem = i === selectedIndex;
    const slotFill = selectedItem ? "#9f9f9f" : "#8b8b8b";

    drawBeveledRect(ctx, x, y, slot, slot, slotFill);
    if (selectedItem) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.strokeRect(x + 2.5, y + 2.5, slot - 5, slot - 5);
      ctx.strokeStyle = "#111827";
      ctx.strokeRect(x - 2.5, y - 2.5, slot + 5, slot + 5);
    }

    if (item) {
      const itemId = getForegroundItemId(item);
      const count = getItemCount(inventory, itemId);
      const texture =
        item.kind === "tool"
            ? getItemTexture(item)
            : item.wallId !== undefined
              ? getWallTexture(WALL_BY_ID[item.wallId])
              : getBlockTexture(item);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(texture, x + 11, y + 10, 26, 26);
      ctx.restore();
      ctx.strokeStyle = "rgba(0,0,0,.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 11.5, y + 10.5, 25, 25);
      ctx.fillStyle = "#dcfce7";
      ctx.font = "900 11px ui-monospace, Cascadia Mono, Consolas, monospace";
      ctx.textAlign = "left";
      ctx.fillText(i === 9 ? "0" : String(i + 1), x + 5, y + 14);

      ctx.fillStyle = count > 0 ? "#f8fafc" : "#fecaca";
      ctx.strokeStyle = "rgba(15,23,42,.85)";
      ctx.lineWidth = 3;
      ctx.font = "900 10px ui-monospace, Cascadia Mono, Consolas, monospace";
      ctx.textAlign = "right";
      const countText = String(count);
      ctx.strokeText(countText, x + slot - 5, y + slot - 6);
      ctx.fillText(countText, x + slot - 5, y + slot - 6);
    }
  }

  const label =
    buildMode === "background" ? "Background mode" : "Foreground blocks";
  const labelW = buildMode === "background" ? 178 : 188;
  drawBeveledRect(ctx, 16, VIEW_H - 48, labelW, 32, "#c6c6c6");
  ctx.fillStyle = buildMode === "background" ? "#082f49" : "#14532d";
  ctx.font = "900 13px ui-monospace, Cascadia Mono, Consolas, monospace";
  ctx.textAlign = "left";
  ctx.fillText(label, 28, VIEW_H - 28);
}

export function drawSelectionHint(ctx, hint) {
  const remaining = hint.until - performance.now() / 1000;
  if (!hint.text || remaining <= 0) return;

  const alpha = clamp(Math.min(remaining / 0.28, 1), 0, 1);
  const y = VIEW_H - 88 - (1 - alpha) * 7;
  const text = `${hint.text}`;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = "900 18px ui-monospace, Cascadia Mono, Consolas, monospace";
  ctx.textAlign = "center";
  const width = Math.min(300, ctx.measureText(text).width + 34);
  const x = VIEW_W / 2 - width / 2;

  drawBeveledRect(ctx, x, y - 26, width, 36, "#c6c6c6");
  ctx.fillStyle = hint.color === "#67e8f9" ? "#082f49" : "#14532d";
  ctx.fillText(text, VIEW_W / 2, y - 3);
  ctx.restore();
}

export function drawPauseMenu(ctx, mouse, fullscreenElement) {
  ctx.fillStyle = "rgba(0,0,0,.56)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawPanel(ctx, 300, 132, 360, 292);
  ctx.fillStyle = "#111827";
  ctx.font = "900 34px ui-monospace, Cascadia Mono, Consolas, monospace";
  ctx.textAlign = "center";
  ctx.fillText("Paused", VIEW_W / 2, 184);

  const buttons = [
    { label: "Resume", action: "resume", x: 360, y: 220, w: 240, h: 46 },
    {
      label: "Generate New World",
      action: "newWorld",
      x: 360,
      y: 282,
      w: 240,
      h: 46,
    },
    {
      label: fullscreenElement ? "Disable Fullscreen" : "Enable Fullscreen",
      action: "fullscreen",
      x: 360,
      y: 344,
      w: 240,
      h: 46,
    },
  ];

  for (const button of buttons) drawButton(ctx, button, mouse);
  return buttons;
}
