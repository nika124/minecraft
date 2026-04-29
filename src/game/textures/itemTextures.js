import { TILE } from "../constants";
import { makeTexture } from "./shared";

function drawPixelOutline(ctx, rects) {
  ctx.fillStyle = "rgba(15,23,42,.72)";
  for (const [x, y, w, h] of rects) {
    ctx.fillRect(x, y, w, h);
  }
}

function drawHandle(ctx) {
  // outline
  ctx.strokeStyle = "rgba(45,24,12,.95)";
  ctx.lineWidth = 7;
  ctx.lineCap = "square";
  ctx.beginPath();
  ctx.moveTo(8, 28);
  ctx.lineTo(23, 13);
  ctx.stroke();

  // wood
  ctx.strokeStyle = "#8b552c";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(8, 28);
  ctx.lineTo(23, 13);
  ctx.stroke();

  // highlight
  ctx.strokeStyle = "#c27a3d";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, 26);
  ctx.lineTo(21, 15);
  ctx.stroke();

  // dark grip end
  ctx.fillStyle = "#5a2f17";
  ctx.fillRect(6, 26, 5, 4);
}

function drawShovel(ctx) {
  drawHandle(ctx);

  /*
    Shovel silhouette:
       wide shoulders
       rounded body
       pointed bottom
  */

  // outline
  drawPixelOutline(ctx, [
    [18, 3, 9, 2],
    [16, 5, 13, 3],
    [15, 8, 15, 5],
    [16, 13, 13, 4],
    [18, 17, 9, 3],
    [20, 20, 5, 2],
    [22, 22, 1, 2],
  ]);

  // body
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(19, 4, 7, 2);
  ctx.fillRect(17, 6, 11, 3);
  ctx.fillRect(16, 9, 13, 4);
  ctx.fillRect(17, 13, 11, 4);
  ctx.fillRect(19, 17, 7, 3);
  ctx.fillRect(21, 20, 3, 2);
  ctx.fillRect(22, 22, 1, 1);

  // bright upper face
  ctx.fillStyle = "#dbeafe";
  ctx.fillRect(19, 5, 5, 2);
  ctx.fillRect(18, 7, 5, 4);
  ctx.fillRect(17, 10, 3, 3);

  // darker lower/side metal
  ctx.fillStyle = "#64748b";
  ctx.fillRect(25, 8, 3, 7);
  ctx.fillRect(22, 16, 4, 3);
  ctx.fillRect(21, 20, 3, 2);

  // neck/socket where handle connects
  ctx.fillStyle = "#475569";
  ctx.fillRect(20, 17, 4, 4);
}

function drawPickaxe(ctx) {
  drawHandle(ctx);

  /*
    Pickaxe silhouette:
    clearly horizontal and two-sided.
    One side is a pointed pick, the other is a chisel/adze.
  */

  // outline
  drawPixelOutline(ctx, [
    [5, 7, 22, 3],
    [3, 8, 6, 3],
    [26, 8, 4, 3],
    [2, 10, 4, 3],
    [28, 10, 3, 4],
    [13, 9, 10, 5],
  ]);

  // main metal crossbar
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(6, 8, 20, 2);

  // left pointed pick
  ctx.fillRect(4, 9, 6, 2);
  ctx.fillRect(3, 11, 4, 2);
  ctx.fillRect(2, 12, 2, 1);

  // right chisel / hook side
  ctx.fillRect(25, 9, 4, 2);
  ctx.fillRect(27, 11, 3, 2);
  ctx.fillRect(28, 13, 2, 1);

  // center socket
  ctx.fillStyle = "#64748b";
  ctx.fillRect(15, 9, 7, 5);

  // top highlight
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(7, 8, 16, 1);
  ctx.fillRect(5, 9, 5, 1);
  ctx.fillRect(25, 9, 3, 1);

  // darker tips and bottom
  ctx.fillStyle = "#475569";
  ctx.fillRect(2, 12, 3, 1);
  ctx.fillRect(28, 13, 2, 1);
  ctx.fillRect(16, 13, 5, 1);
}

function drawAxe(ctx) {
  drawHandle(ctx);

  /*
    Axe silhouette:
    big heavy blade on one side.
    This should no longer look like the shovel.
  */

  // back hammer/neck outline
  drawPixelOutline(ctx, [
    [19, 6, 8, 3],
    [18, 9, 5, 9],
    [22, 15, 4, 4],
  ]);

  // blade outline, big left-facing blade
  drawPixelOutline(ctx, [
    [13, 5, 9, 3],
    [11, 8, 12, 4],
    [10, 12, 13, 5],
    [12, 17, 10, 3],
  ]);

  // socket/back metal
  ctx.fillStyle = "#64748b";
  ctx.fillRect(20, 7, 6, 2);
  ctx.fillRect(19, 9, 4, 8);
  ctx.fillRect(22, 16, 3, 2);

  // main blade body
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(14, 6, 8, 2);
  ctx.fillRect(12, 8, 10, 4);
  ctx.fillRect(11, 12, 11, 5);
  ctx.fillRect(13, 17, 8, 2);

  // sharp cutting edge
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(13, 7, 5, 2);
  ctx.fillRect(12, 9, 5, 3);
  ctx.fillRect(11, 12, 5, 4);
  ctx.fillRect(13, 16, 4, 2);

  // darker inner blade
  ctx.fillStyle = "#64748b";
  ctx.fillRect(19, 9, 3, 8);
  ctx.fillRect(17, 17, 4, 2);

  // socket clamp
  ctx.fillStyle = "#475569";
  ctx.fillRect(20, 13, 4, 6);
}

function drawStick(ctx) {
  ctx.strokeStyle = "rgba(45,24,12,.95)";
  ctx.lineWidth = 6;
  ctx.lineCap = "square";
  ctx.beginPath();
  ctx.moveTo(8, 27);
  ctx.lineTo(24, 9);
  ctx.stroke();

  ctx.strokeStyle = "#8b552c";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(8, 27);
  ctx.lineTo(24, 9);
  ctx.stroke();

  ctx.strokeStyle = "#c08445";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, 25);
  ctx.lineTo(22, 11);
  ctx.stroke();

  ctx.fillStyle = "#5a2f17";
  ctx.fillRect(6, 25, 5, 4);
  ctx.fillRect(22, 8, 4, 4);
  ctx.fillStyle = "#d69b5b";
  ctx.fillRect(13, 20, 2, 2);
  ctx.fillRect(18, 14, 2, 2);
}

const ITEM_DRAWERS = {
  stick: drawStick,
  shovel: drawShovel,
  pickaxe: drawPickaxe,
  axe: drawAxe,
};

export function getItemTexture(item) {
  return makeTexture(`item-${item.id}-v3`, (ctx) => {
    ctx.clearRect(0, 0, TILE, TILE);

    ctx.imageSmoothingEnabled = false;

    ITEM_DRAWERS[item.miningTool]?.(ctx);
  });
}
