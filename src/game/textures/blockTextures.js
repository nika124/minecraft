import { BLOCKS, TILE } from "../constants";
import {
  drawBevel,
  drawStoneCracks,
  fillBase,
  makeTexture,
  noise,
  speckles,
} from "./shared";

function drawGrass(ctx) {
  fillBase(ctx, "#7d512f");
  speckles(ctx, ["#5f3820", "#9a6339", "#b87945", "#4f2e1b"], 42, 10);

  ctx.fillStyle = "#46b455";
  ctx.fillRect(0, 0, TILE, 9);
  ctx.fillStyle = "#66d35f";
  ctx.fillRect(0, 0, TILE, 4);
  speckles(ctx, ["#79e36e", "#2e8f3a", "#9afa86"], 18, 20, 1, 2);

  ctx.fillStyle = "#2f8f38";
  for (let x = 0; x < TILE; x += 4) {
    ctx.fillRect(x, 7, 2, 3 + Math.floor(noise(x + 30) * 5));
  }
  drawBevel(ctx);
}

function drawDirt(ctx, base = "#8a5a32") {
  fillBase(ctx, base);
  speckles(ctx, ["#6d4226", "#a46c40", "#c28754", "#56331f"], 58, 40, 1, 3);
  drawBevel(ctx);
}

function drawStone(ctx, base = "#727781") {
  fillBase(ctx, base);
  speckles(ctx, ["#575d66", "#858b94", "#9da3ab", "#464b54"], 48, 50, 1, 3);
  drawStoneCracks(ctx, 60, 0.14);
  drawBevel(ctx, "rgba(255,255,255,.1)", "rgba(0,0,0,.32)");
}

function drawWood(ctx) {
  fillBase(ctx, "#8b552c");

  ctx.fillStyle = "#6f3f1f";
  ctx.fillRect(0, 0, 5, TILE);
  ctx.fillRect(13, 0, 4, TILE);
  ctx.fillRect(27, 0, 5, TILE);

  ctx.fillStyle = "#a86a35";
  ctx.fillRect(6, 0, 6, TILE);
  ctx.fillRect(18, 0, 8, TILE);

  ctx.fillStyle = "#c27a3d";
  ctx.fillRect(7, 3, 3, 10);
  ctx.fillRect(19, 5, 3, 13);
  ctx.fillRect(20, 22, 3, 7);

  ctx.fillStyle = "#4f2b15";
  ctx.fillRect(3, 7, 3, 4);
  ctx.fillRect(14, 18, 3, 5);
  ctx.fillRect(26, 10, 3, 4);

  drawBevel(ctx, "rgba(255,210,150,.08)", "rgba(0,0,0,.28)");
}

function drawLeaves(ctx) {
  fillBase(ctx, "#2f8f45");

  ctx.fillStyle = "#3fb85b";
  ctx.fillRect(3, 3, 8, 8);
  ctx.fillRect(13, 2, 9, 9);
  ctx.fillRect(22, 5, 7, 7);
  ctx.fillRect(2, 14, 10, 9);
  ctx.fillRect(13, 12, 11, 10);
  ctx.fillRect(23, 16, 8, 8);
  ctx.fillRect(6, 24, 8, 6);
  ctx.fillRect(17, 23, 10, 7);

  ctx.fillStyle = "#24783a";
  ctx.fillRect(0, 8, 5, 8);
  ctx.fillRect(9, 10, 6, 6);
  ctx.fillRect(25, 10, 7, 5);
  ctx.fillRect(4, 22, 6, 6);
  ctx.fillRect(20, 21, 6, 5);

  ctx.fillStyle = "#69d765";
  ctx.fillRect(6, 4, 4, 2);
  ctx.fillRect(15, 4, 5, 2);
  ctx.fillRect(15, 13, 5, 2);
  ctx.fillRect(7, 16, 4, 2);
  ctx.fillRect(20, 24, 4, 2);

  ctx.fillStyle = "rgba(0,0,0,.12)";
  ctx.fillRect(0, 27, TILE, 5);

  drawBevel(ctx, "rgba(255,255,255,.05)", "rgba(0,0,0,.2)");
}

function drawSand(ctx) {
  fillBase(ctx, "#d8c075");
  speckles(
    ctx,
    ["#c7ad63", "#ead78f", "#b99b50", "#f1df9b", "#aa914b"],
    55,
    80,
    1,
    2,
  );
  drawBevel(ctx, "rgba(255,255,255,.16)", "rgba(112,86,32,.24)");
}

function drawBrick(ctx) {
  fillBase(ctx, "#b35a43");
  speckles(ctx, ["#913d2f", "#ca6d52", "#7d3127", "#d17b62"], 28, 90, 1, 2);
  ctx.strokeStyle = "rgba(45,15,10,.48)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 10);
  ctx.lineTo(TILE, 10);
  ctx.moveTo(0, 22);
  ctx.lineTo(TILE, 22);
  ctx.moveTo(10, 0);
  ctx.lineTo(10, 10);
  ctx.moveTo(24, 10);
  ctx.lineTo(24, 22);
  ctx.moveTo(15, 22);
  ctx.lineTo(15, TILE);
  ctx.stroke();
  drawBevel(ctx, "rgba(255,210,190,.1)", "rgba(55,18,12,.25)");
}

function drawGlass(ctx) {
  ctx.clearRect(0, 0, TILE, TILE);
  fillBase(ctx, "rgba(130,210,235,.38)");
  ctx.fillStyle = "rgba(255,255,255,.18)";
  ctx.fillRect(3, 3, 8, 3);
  ctx.fillRect(20, 6, 5, 2);
  ctx.strokeStyle = "rgba(240,255,255,.75)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(8, 24);
  ctx.lineTo(24, 8);
  ctx.moveTo(17, 27);
  ctx.lineTo(27, 17);
  ctx.stroke();
  ctx.strokeStyle = "rgba(180,235,255,.5)";
  ctx.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
}

function drawOre(ctx) {
  drawStone(ctx, "#5f6470");
  ctx.fillStyle = "#6ee7ff";
  ctx.fillRect(7, 9, 5, 5);
  ctx.fillRect(20, 15, 6, 6);
  ctx.fillRect(13, 23, 4, 4);
  ctx.fillStyle = "rgba(255,255,255,.45)";
  ctx.fillRect(8, 10, 2, 2);
  ctx.fillRect(21, 16, 2, 2);
}

function drawTorch(ctx) {
  ctx.clearRect(0, 0, TILE, TILE);
  ctx.fillStyle = "#6b3f1d";
  ctx.fillRect(14, 13, 4, 17);
  ctx.fillStyle = "#9a5a25";
  ctx.fillRect(12, 15, 8, 4);
  ctx.fillStyle = "rgba(255,255,255,.22)";
  ctx.fillRect(15, 14, 1, 14);
  ctx.fillStyle = "#f97316";
  ctx.beginPath();
  ctx.ellipse(16, 10, 7, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fde68a";
  ctx.beginPath();
  ctx.ellipse(16, 9, 4, 6, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawWater(ctx) {
  ctx.clearRect(0, 0, TILE, TILE);
  const gradient = ctx.createLinearGradient(0, 0, 0, TILE);
  gradient.addColorStop(0, "rgba(83, 190, 255, .68)");
  gradient.addColorStop(0.52, "rgba(37, 132, 230, .7)");
  gradient.addColorStop(1, "rgba(20, 84, 180, .78)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, TILE, TILE);

  ctx.fillStyle = "rgba(220, 250, 255, .34)";
  for (let y = 5; y < TILE; y += 9) {
    for (let x = -4; x < TILE; x += 14) {
      ctx.fillRect(x + ((y / 9) % 2) * 5, y, 8, 2);
    }
  }

  ctx.fillStyle = "rgba(255, 255, 255, .16)";
  ctx.fillRect(2, 2, TILE - 4, 3);
  ctx.strokeStyle = "rgba(160, 225, 255, .55)";
  ctx.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
}

const BLOCK_DRAWERS = {
  [BLOCKS.grass.id]: drawGrass,
  [BLOCKS.dirt.id]: drawDirt,
  [BLOCKS.stone.id]: drawStone,
  [BLOCKS.wood.id]: drawWood,
  [BLOCKS.leaves.id]: drawLeaves,
  [BLOCKS.sand.id]: drawSand,
  [BLOCKS.brick.id]: drawBrick,
  [BLOCKS.glass.id]: drawGlass,
  [BLOCKS.ore.id]: drawOre,
  [BLOCKS.torch.id]: drawTorch,
  [BLOCKS.water.id]: drawWater,
};

export function getBlockTexture(block) {
  return makeTexture(`block-${block.id}`, (ctx) => {
    BLOCK_DRAWERS[block.id]?.(ctx);
  });
}

export { drawStone };
