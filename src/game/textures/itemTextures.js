import { TILE } from "../constants";
import { makeTexture } from "./shared";

function drawHandle(ctx) {
  ctx.strokeStyle = "#6b3f1d";
  ctx.lineWidth = 5;
  ctx.lineCap = "square";
  ctx.beginPath();
  ctx.moveTo(9, 27);
  ctx.lineTo(23, 13);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255,255,255,.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(10, 25);
  ctx.lineTo(21, 14);
  ctx.stroke();
}

function drawShovel(ctx) {
  drawHandle(ctx);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(20, 6, 7, 9);
  ctx.fillRect(18, 8, 11, 5);
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(21, 7, 3, 3);
  ctx.strokeStyle = "rgba(15,23,42,.55)";
  ctx.strokeRect(19.5, 6.5, 8, 8);
}

function drawPickaxe(ctx) {
  drawHandle(ctx);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(13, 7, 16, 5);
  ctx.fillRect(23, 11, 4, 5);
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(14, 8, 10, 2);
  ctx.strokeStyle = "rgba(15,23,42,.55)";
  ctx.strokeRect(12.5, 6.5, 17, 6);
}

function drawAxe(ctx) {
  drawHandle(ctx);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(19, 6, 8, 11);
  ctx.fillRect(16, 8, 5, 6);
  ctx.fillStyle = "#e2e8f0";
  ctx.fillRect(20, 7, 4, 3);
  ctx.strokeStyle = "rgba(15,23,42,.55)";
  ctx.strokeRect(18.5, 5.5, 9, 12);
}

const ITEM_DRAWERS = {
  shovel: drawShovel,
  pickaxe: drawPickaxe,
  axe: drawAxe,
};

export function getItemTexture(item) {
  return makeTexture(`item-${item.id}`, (ctx) => {
    ctx.clearRect(0, 0, TILE, TILE);
    ITEM_DRAWERS[item.miningTool]?.(ctx);
  });
}
