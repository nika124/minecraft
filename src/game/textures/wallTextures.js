import { TILE, WALLS } from "../constants";
import {
  drawStoneCracks,
  fillBase,
  makeTexture,
  speckles,
} from "./shared";

function drawWallBase(ctx, wall) {
  fillBase(ctx, wall.color);
  speckles(
    ctx,
    ["rgba(255,255,255,.08)", "rgba(0,0,0,.16)"],
    22,
    wall.id * 31,
    1,
    2,
  );
  ctx.strokeStyle = wall.line || "rgba(255,255,255,.14)";
  ctx.lineWidth = 1;
}

export function getWallTexture(wall) {
  return makeTexture(`wall-${wall.id}`, (ctx) => {
    ctx.clearRect(0, 0, TILE, TILE);
    drawWallBase(ctx, wall);

    if (wall.id === WALLS.woodWall.id) {
      for (let x = 7; x < TILE; x += 11) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, TILE);
        ctx.stroke();
      }
    } else if (wall.id === WALLS.brickWall.id) {
      ctx.beginPath();
      ctx.moveTo(0, 10);
      ctx.lineTo(TILE, 10);
      ctx.moveTo(0, 22);
      ctx.lineTo(TILE, 22);
      ctx.moveTo(12, 0);
      ctx.lineTo(12, 10);
      ctx.moveTo(24, 10);
      ctx.lineTo(24, 22);
      ctx.moveTo(14, 22);
      ctx.lineTo(14, TILE);
      ctx.stroke();
    } else if (
      wall.id === WALLS.stoneWall.id ||
      wall.id === WALLS.stoneBack.id ||
      wall.id === WALLS.deepStoneBack.id
    ) {
      drawStoneCracks(ctx, wall.id * 17, wall.id === WALLS.deepStoneBack.id ? 0.24 : 0.16);
    } else if (wall.id === WALLS.glassWall.id) {
      ctx.strokeStyle = wall.line;
      ctx.beginPath();
      ctx.moveTo(7, 24);
      ctx.lineTo(24, 7);
      ctx.moveTo(15, 27);
      ctx.lineTo(27, 15);
      ctx.stroke();
    } else if (wall.id === WALLS.ladder.id) {
      ctx.clearRect(0, 0, TILE, TILE);
      ctx.fillStyle = "#6f3f1f";
      ctx.fillRect(8, 0, 4, TILE);
      ctx.fillRect(20, 0, 4, TILE);
      ctx.fillStyle = "#a66a35";
      for (let y = 5; y < TILE; y += 8) {
        ctx.fillRect(7, y, 18, 3);
      }
      ctx.fillStyle = "rgba(255,220,160,.22)";
      ctx.fillRect(9, 1, 1, TILE - 2);
      ctx.fillRect(8, 6, 16, 1);
    }

    if (wall.id === WALLS.dirtBack.id) {
      speckles(
        ctx,
        ["rgba(255,255,255,.08)", "rgba(0,0,0,.14)", "#6d4328"],
        35,
        220,
        1,
        2,
      );
    }

    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.strokeRect(0.5, 0.5, TILE - 1, TILE - 1);
  });
}
