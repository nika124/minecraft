import { FOREGROUND_ITEMS, VIEW_H, VIEW_W, WALL_PLACEABLE } from "../constants";
import { getBlockTexture, getItemTexture, getWallTexture } from "../textures";
import { clamp } from "../world";

function drawPanel(ctx, x, y, w, h, fill = "rgba(2,6,23,.78)") {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "rgba(255,255,255,.18)";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function drawButton(ctx, button, mouse) {
  const hovering =
    mouse.x >= button.x &&
    mouse.x <= button.x + button.w &&
    mouse.y >= button.y &&
    mouse.y <= button.y + button.h;

  ctx.fillStyle = hovering ? "rgba(34,197,94,.42)" : "rgba(15,23,42,.92)";
  ctx.fillRect(button.x, button.y, button.w, button.h);
  ctx.strokeStyle = hovering
    ? "rgba(134,239,172,.95)"
    : "rgba(255,255,255,.22)";
  ctx.lineWidth = 2;
  ctx.strokeRect(button.x + 0.5, button.y + 0.5, button.w - 1, button.h - 1);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "800 18px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  ctx.fillText(button.label, button.x + button.w / 2, button.y + 29);
}

export function drawHotbar(ctx, state) {
  const {
    buildMode,
    blockHotbar,
    selected,
    selectedWall,
  } = state;
  const items =
    buildMode === "background"
      ? WALL_PLACEABLE
      : blockHotbar.map((index) => FOREGROUND_ITEMS[index]);
  const selectedIndex = buildMode === "background" ? selectedWall : selected;
  const slot = 48;
  const gap = 6;
  const count = buildMode === "background" ? WALL_PLACEABLE.length : 10;
  const totalW = count * slot + (count - 1) * gap;
  const startX = (VIEW_W - totalW) / 2;
  const y = VIEW_H - 62;

  for (let i = 0; i < count; i++) {
    const item = items[i];
    const x = startX + i * (slot + gap);
    const selectedItem = i === selectedIndex;

    ctx.fillStyle = selectedItem
      ? buildMode === "background"
        ? "rgba(103,232,249,.32)"
        : "rgba(134,239,172,.32)"
      : "rgba(2,6,23,.78)";
    ctx.fillRect(x, y, slot, slot);
    ctx.strokeStyle = selectedItem
      ? buildMode === "background"
        ? "#67e8f9"
        : "#86efac"
      : "rgba(255,255,255,.22)";
    ctx.lineWidth = selectedItem ? 3 : 1;
    ctx.strokeRect(x + 0.5, y + 0.5, slot - 1, slot - 1);

    if (item) {
      const texture =
        buildMode === "background"
          ? getWallTexture(item)
          : item.kind === "tool"
            ? getItemTexture(item)
            : getBlockTexture(item);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(texture, x + 11, y + 10, 26, 26);
      ctx.restore();
      ctx.strokeStyle = "rgba(0,0,0,.35)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 11.5, y + 10.5, 25, 25);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "800 11px ui-sans-serif, system-ui";
      ctx.textAlign = "left";
      ctx.fillText(i === 9 ? "0" : String(i + 1), x + 5, y + 14);
    }
  }

  const label =
    buildMode === "background" ? "Background walls" : "Foreground blocks";
  ctx.fillStyle =
    buildMode === "background"
      ? "rgba(8,145,178,.88)"
      : "rgba(22,101,52,.88)";
  ctx.fillRect(16, VIEW_H - 48, 178, 32);
  ctx.strokeStyle =
    buildMode === "background"
      ? "rgba(103,232,249,.72)"
      : "rgba(134,239,172,.72)";
  ctx.lineWidth = 1;
  ctx.strokeRect(16.5, VIEW_H - 47.5, 177, 31);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "850 13px ui-sans-serif, system-ui";
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
  ctx.font = "900 18px ui-sans-serif, system-ui";
  ctx.textAlign = "center";
  const width = Math.min(300, ctx.measureText(text).width + 34);
  const x = VIEW_W / 2 - width / 2;

  ctx.fillStyle = "rgba(2,6,23,.82)";
  ctx.fillRect(x, y - 26, width, 36);
  ctx.strokeStyle = hint.color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 0.5, y - 25.5, width - 1, 35);
  ctx.fillStyle = hint.color;
  ctx.fillText(text, VIEW_W / 2, y - 3);
  ctx.restore();
}

export function drawHelpOverlay(ctx) {
  drawPanel(ctx, 220, 70, 520, 356, "rgba(2,6,23,.9)");
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 28px ui-sans-serif, system-ui";
  ctx.textAlign = "left";
  ctx.fillText("Controls", 250, 112);

  const controls = [
    ["A / D or arrows", "Move"],
    ["W / Space", "Jump"],
    ["Shift", "Run"],
    ["Left click", "Mine block or remove wall"],
    ["Right click", "Place block or wall"],
    ["1-0", "Select hotbar item"],
    ["I", "Open or close inventory"],
    ["B", "Switch foreground/background"],
    ["H", "Fill background wall near player"],
    ["F", "Toggle fullscreen"],
    ["Esc / P", "Pause menu"],
    ["F1", "Show or hide this help"],
    ["F2 / F3", "Show or hide world options"],
  ];

  ctx.font = "800 15px ui-sans-serif, system-ui";
  for (let i = 0; i < controls.length; i++) {
    const y = 150 + i * 24;
    ctx.fillStyle = "#bbf7d0";
    ctx.fillText(controls[i][0], 250, y);
    ctx.fillStyle = "#dbeafe";
    ctx.fillText(controls[i][1], 420, y);
  }
}

export function drawPauseMenu(ctx, mouse, fullscreenElement) {
  ctx.fillStyle = "rgba(0,0,0,.52)";
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawPanel(ctx, 300, 132, 360, 292, "rgba(2,6,23,.92)");
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 34px ui-sans-serif, system-ui";
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
