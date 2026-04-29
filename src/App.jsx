import { useCallback, useEffect, useRef, useState } from "react";
import ControlsPanel from "./components/ControlsPanel";
import GameHeader from "./components/GameHeader";
import GameStage from "./components/GameStage";
import InventoryPanel from "./components/InventoryPanel";
import SettingsOverlay from "./components/SettingsOverlay";
import {
  BLOCK_BY_ID,
  BLOCKS,
  PLACEABLE,
  TILE,
  VIEW_H,
  VIEW_W,
  WALL_BY_ID,
  WALL_PLACEABLE,
  WALLS,
  WORLD_H,
  WORLD_W,
} from "./game/constants";
import {
  createSkyCoverage,
  drawBlock,
  drawLightMask,
  drawParticles,
  drawPlayer,
  drawTorchLights,
  drawWall,
  updateSkyCoverageColumn,
} from "./game/rendering";
import {
  clamp,
  createPlayer,
  createStats,
  emitParticles,
  makeClouds,
  makeWorld,
  rectHitsSolid,
  updateParticles,
} from "./game/world";
import { getBlockTexture, getWallTexture } from "./game/textures";

void ControlsPanel;
void GameHeader;
void GameStage;
void InventoryPanel;
void SettingsOverlay;

const MAX_WATER_SPREAD = 7;
const WATER_FLOW_STEP = 0.16;
const HOTBAR_SLOT_COUNT = 10;
const DEFAULT_BLOCK_HOTBAR = PLACEABLE.slice(0, HOTBAR_SLOT_COUNT).map(
  (_, index) => index,
);
const DEFAULT_GAME_SETTINGS = {
  movementSpeed: 1,
  dayCycleSpeed: 1,
  rainEnabled: true,
  rainIntensity: 0.65,
  skyMode: "cycle",
};

function createWaterLevels() {
  return Array.from({ length: WORLD_H }, () => Array(WORLD_W).fill(-1));
}

function getWorldWaterLevels(worldData) {
  return worldData.waterLevels?.map((row) => [...row]) ?? createWaterLevels();
}

function getWorldWaterSources(worldData) {
  return new Set(worldData.waterSources ?? []);
}

function makeRainDrops(count = 360) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * VIEW_W,
    y: Math.random() * VIEW_H,
    length: 11 + Math.random() * 24,
    speed: 360 + Math.random() * 340,
    drift: 55 + Math.random() * 70,
    alpha: 0.12 + Math.random() * 0.26,
    width: Math.random() > 0.82 ? 1.8 : 1,
  }));
}

export default function MinecraftInspiredWebGame() {
  const [initialWorld] = useState(() => makeWorld());
  const gameShellRef = useRef(null);
  const canvasRef = useRef(null);
  const uiCanvasRef = useRef(null);
  const keysRef = useRef({});
  const pressedRef = useRef({});
  const mouseRef = useRef({ x: 0, y: 0, down: false, button: 0 });
  const menuButtonsRef = useRef([]);
  const worldDataRef = useRef(initialWorld);
  const worldRef = useRef(initialWorld.world);
  const wallsRef = useRef(initialWorld.walls);
  const waterLevelsRef = useRef(getWorldWaterLevels(initialWorld));
  const waterSourcesRef = useRef(getWorldWaterSources(initialWorld));
  const laddersRef = useRef(
    Array.from({ length: WORLD_H }, () => Array(WORLD_W).fill(false)),
  );
  const skyCoverageRef = useRef(null);
  const placedBlocksRef = useRef(new Set());
  const anchoredLaddersRef = useRef(new Set());
  const particlesRef = useRef([]);
  const cloudsRef = useRef(makeClouds());
  const rainRef = useRef(makeRainDrops());
  const playerRef = useRef(createPlayer());
  const cameraRef = useRef({ x: 0, y: 0 });
  const selectedRef = useRef(1);
  const selectedWallRef = useRef(0);
  const blockHotbarRef = useRef(DEFAULT_BLOCK_HOTBAR);
  const selectionHintRef = useRef({ text: "", color: "#86efac", until: 0 });
  const buildModeRef = useRef("foreground");
  const pausedRef = useRef(false);
  const helpOpenRef = useRef(false);
  const settingsRef = useRef(DEFAULT_GAME_SETTINGS);

  const [selected, setSelected] = useState(1);
  const [selectedWall, setSelectedWall] = useState(0);
  const [blockHotbar, setBlockHotbar] = useState(DEFAULT_BLOCK_HOTBAR);
  const [buildMode, setBuildMode] = useState("foreground");
  const [stats, setStats] = useState(createStats());
  const [isPaused, setIsPaused] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [gameSettings, setGameSettings] = useState(DEFAULT_GAME_SETTINGS);
  const [worldSeed, setWorldSeed] = useState(1);

  if (skyCoverageRef.current === null) {
    skyCoverageRef.current = createSkyCoverage(initialWorld.world);
  }

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    selectedWallRef.current = selectedWall;
  }, [selectedWall]);

  useEffect(() => {
    blockHotbarRef.current = blockHotbar;
  }, [blockHotbar]);

  useEffect(() => {
    buildModeRef.current = buildMode;
  }, [buildMode]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    helpOpenRef.current = isHelpOpen;
  }, [isHelpOpen]);

  useEffect(() => {
    settingsRef.current = gameSettings;
  }, [gameSettings]);

  const showSelectionHint = useCallback((item, mode = buildModeRef.current) => {
    if (!item) return;

    selectionHintRef.current = {
      text: item.name,
      color: mode === "background" ? "#67e8f9" : "#86efac",
      until: performance.now() / 1000 + 1.35,
    };
  }, []);

  const selectBlock = useCallback(
    (slotIndex) => {
      const item = PLACEABLE[blockHotbarRef.current[slotIndex]];
      if (!item) return;
      setSelected(slotIndex);
      showSelectionHint(item, "foreground");
    },
    [showSelectionHint],
  );

  const chooseInventoryBlock = useCallback(
    (placeableIndex) => {
      const item = PLACEABLE[placeableIndex];
      if (!item) return;

      const existingSlot = blockHotbarRef.current.indexOf(placeableIndex);
      if (existingSlot !== -1) {
        setSelected(existingSlot);
        showSelectionHint(item, "foreground");
        return;
      }

      const targetSlot = selectedRef.current;
      setBlockHotbar((current) =>
        current.map((value, index) =>
          index === targetSlot ? placeableIndex : value,
        ),
      );
      showSelectionHint(item, "foreground");
      setStats((current) => ({
        ...current,
        message: `Moved ${item.name} into hotbar slot ${targetSlot === 9 ? "0" : targetSlot + 1}.`,
      }));
    },
    [showSelectionHint],
  );

  const selectWall = useCallback(
    (index) => {
      const item = WALL_PLACEABLE[index];
      if (!item) return;
      setSelectedWall(index);
      showSelectionHint(item, "background");
    },
    [showSelectionHint],
  );

  const toggleBuildMode = () => {
    setBuildMode((current) => {
      const next = current === "foreground" ? "background" : "foreground";
      setStats((statsValue) => ({
        ...statsValue,
        message:
          next === "background"
            ? "Background wall mode: right click places walls, left click removes walls."
            : "Foreground block mode: right click places solid blocks, left click mines.",
      }));
      return next;
    });
  };

  const updateGameSetting = (key, value) => {
    setGameSettings((current) => ({ ...current, [key]: value }));
  };

  const resetWorld = () => {
    const next = makeWorld(Date.now());
    worldDataRef.current = next;
    worldRef.current = next.world;
    wallsRef.current = next.walls;
    waterLevelsRef.current = getWorldWaterLevels(next);
    waterSourcesRef.current = getWorldWaterSources(next);
    laddersRef.current = Array.from({ length: WORLD_H }, () =>
      Array(WORLD_W).fill(false),
    );
    skyCoverageRef.current = createSkyCoverage(next.world);
    placedBlocksRef.current = new Set();
    anchoredLaddersRef.current = new Set();
    particlesRef.current = [];
    cloudsRef.current = makeClouds();
    rainRef.current = makeRainDrops();
    playerRef.current = createPlayer();
    cameraRef.current = { x: 0, y: 0 };
    setStats(createStats("New world generated."));
    setWorldSeed((value) => value + 1);
  };

  const fillHouseBackground = () => {
    const player = playerRef.current;
    const centerX = Math.floor((player.x + player.w / 2) / TILE);
    const centerY = Math.floor((player.y + player.h / 2) / TILE);
    const wall = WALL_PLACEABLE[selectedWallRef.current] ?? WALLS.woodWall;
    let count = 0;

    for (let y = centerY - 14; y <= centerY + 12; y++) {
      for (let x = centerX - 15; x <= centerX + 15; x++) {
        if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) continue;
        if (wallsRef.current[y][x] !== wall.id) {
          wallsRef.current[y][x] = wall.id;
          count++;
        }
      }
    }

    setStats((current) => ({
      ...current,
      wallsBuilt: current.wallsBuilt + count,
      message:
        count > 0
          ? `Filled a ${wall.name.toLowerCase()} background area behind you.`
          : "That background area already uses this wall.",
    }));
  };

  const toggleFullscreen = async () => {
    const gameShell = gameShellRef.current;
    if (!gameShell) return;

    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await gameShell.requestFullscreen();
      }
    } catch {
      setStats((current) => ({
        ...current,
        message: "Fullscreen is not available in this browser.",
      }));
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === gameShellRef.current);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      keysRef.current[key] = true;

      if (key === "f1") {
        event.preventDefault();
        setIsHelpOpen((current) => !current);
        return;
      }

      if (key === "f2" || key === "f3") {
        event.preventDefault();
        setIsSettingsOpen((current) => !current);
        return;
      }

      if (pressedRef.current[key]) return;
      pressedRef.current[key] = true;

      if (/^[0-9]$/.test(key)) {
        const index = key === "0" ? 9 : Number(key) - 1;
        if (buildModeRef.current === "background") {
          if (index < WALL_PLACEABLE.length) selectWall(index);
        } else if (index < HOTBAR_SLOT_COUNT) {
          selectBlock(index);
        }
      }

      if (key === "b") {
        toggleBuildMode();
      }

      if (key === "h") fillHouseBackground();
      if (key === "p") setIsPaused((current) => !current);
      if (key === "escape") {
        setIsHelpOpen(false);
        setIsPaused(true);
      }
      if (key === "r") resetWorld();
      if (key === "f" && !document.fullscreenElement) toggleFullscreen();
    };

    const handleKeyUp = (event) => {
      const key = event.key.toLowerCase();
      keysRef.current[key] = false;
      pressedRef.current[key] = false;
    };

    const preventContext = (event) => event.preventDefault();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("contextmenu", preventContext);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("contextmenu", preventContext);
    };
  }, [selectBlock, selectWall]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const uiCanvas = uiCanvasRef.current;
    if (!canvas || !uiCanvas) return;

    const setMouseFromEvent = (event) => {
      const rect = uiCanvas.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * VIEW_W;
      mouseRef.current.y = ((event.clientY - rect.top) / rect.height) * VIEW_H;
    };

    const handleMouseMove = (event) => setMouseFromEvent(event);

    const handleMouseDown = (event) => {
      event.preventDefault();
      setMouseFromEvent(event);

      if (pausedRef.current) {
        const button = menuButtonsRef.current.find(
          (item) =>
            mouseRef.current.x >= item.x &&
            mouseRef.current.x <= item.x + item.w &&
            mouseRef.current.y >= item.y &&
            mouseRef.current.y <= item.y + item.h,
        );

        if (button?.action === "resume") setIsPaused(false);
        if (button?.action === "newWorld") {
          resetWorld();
          setIsPaused(false);
        }
        if (button?.action === "fullscreen") toggleFullscreen();
        return;
      }

      mouseRef.current.down = true;
      mouseRef.current.button = event.button;
    };

    const handleMouseUp = () => {
      mouseRef.current.down = false;
    };

    uiCanvas.addEventListener("mousemove", handleMouseMove);
    uiCanvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      uiCanvas.removeEventListener("mousemove", handleMouseMove);
      uiCanvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const uiCanvas = uiCanvasRef.current;
    if (!canvas || !uiCanvas) return undefined;

    const ctx = canvas.getContext("2d");
    const uiCtx = uiCanvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = VIEW_W * dpr;
    canvas.height = VIEW_H * dpr;
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const resizeUiCanvas = () => {
      const rect = uiCanvas.getBoundingClientRect();
      const uiDpr = Math.min(window.devicePixelRatio || 1, 2);
      uiCanvas.width = Math.max(1, Math.round(rect.width * uiDpr));
      uiCanvas.height = Math.max(1, Math.round(rect.height * uiDpr));
      uiCtx.setTransform(
        (rect.width / VIEW_W) * uiDpr,
        0,
        0,
        (rect.height / VIEW_H) * uiDpr,
        0,
        0,
      );
    };

    resizeUiCanvas();
    window.addEventListener("resize", resizeUiCanvas);

    let raf = 0;
    let last = performance.now();
    let mineCooldown = 0;
    let waterFlowTimer = 0;
    let time = 0;
    let skyTime = 0;

    const blockHasSupport = (world, walls, x, y) => {
      const neighbors = [
        [x, y - 1],
        [x, y + 1],
        [x - 1, y],
        [x + 1, y],
      ];

      return neighbors.some(([nx, ny]) => {
        if (nx < 0 || ny < 0 || nx >= WORLD_W || ny >= WORLD_H) return false;
        return (
          BLOCK_BY_ID[world[ny][nx]]?.solid || walls[ny][nx] !== WALLS.empty.id
        );
      });
    };

    const waterHasSupport = (world, walls, x, y) => {
      if (walls[y][x] !== WALLS.empty.id) return true;

      const neighbors = [
        [x, y - 1],
        [x, y + 1],
        [x - 1, y],
        [x + 1, y],
      ];

      return neighbors.some(([nx, ny]) => {
        if (nx < 0 || ny < 0 || nx >= WORLD_W || ny >= WORLD_H) return false;
        return Boolean(BLOCK_BY_ID[world[ny][nx]]?.solid);
      });
    };

    const torchHasSupport = (
      world,
      walls,
      x,
      y,
      ignoreX = null,
      ignoreY = null,
    ) => {
      const hasBlockBelow =
        y < WORLD_H - 1 &&
        !(x === ignoreX && y + 1 === ignoreY) &&
        BLOCK_BY_ID[world[y + 1][x]]?.solid;
      const hasBackgroundWall = walls[y][x] !== WALLS.empty.id;
      return hasBlockBelow || hasBackgroundWall;
    };

    const ladderHasAnchor = (walls, ladders, x, y) => {
      if (walls[y][x] !== WALLS.empty.id) return true;
      const seen = new Set([`${x},${y}`]);
      const stack = [
        [x, y - 1],
        [x, y + 1],
      ];

      while (stack.length > 0) {
        const [cx, cy] = stack.pop();
        if (cx < 0 || cy < 0 || cx >= WORLD_W || cy >= WORLD_H) continue;
        const key = `${cx},${cy}`;
        if (seen.has(key)) continue;
        seen.add(key);

        if (!ladders[cy][cx]) continue;
        if (walls[cy][cx] !== WALLS.empty.id) return true;

        stack.push([cx, cy - 1], [cx, cy + 1]);
      }

      return false;
    };

    const rectOverlapsLadder = (ladders, x, y, w, h) => {
      const left = Math.floor(x / TILE);
      const right = Math.floor((x + w - 1) / TILE);
      const top = Math.floor(y / TILE);
      const bottom = Math.floor((y + h - 1) / TILE);

      for (let ty = top; ty <= bottom; ty++) {
        for (let tx = left; tx <= right; tx++) {
          if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) continue;
          if (ladders[ty][tx]) return true;
        }
      }

      return false;
    };

    const rectOverlapsWater = (world, x, y, w, h) => {
      const left = Math.floor(x / TILE);
      const right = Math.floor((x + w - 1) / TILE);
      const top = Math.floor(y / TILE);
      const bottom = Math.floor((y + h - 1) / TILE);

      for (let ty = top; ty <= bottom; ty++) {
        for (let tx = left; tx <= right; tx++) {
          if (tx < 0 || ty < 0 || tx >= WORLD_W || ty >= WORLD_H) continue;
          if (world[ty][tx] === BLOCKS.water.id) return true;
        }
      }

      return false;
    };

    const updateWaterFlow = () => {
      const world = worldRef.current;
      const levels = waterLevelsRef.current;
      const sources = waterSourcesRef.current;
      const changedColumns = new Set();

      const isInside = (x, y) => x >= 0 && y >= 0 && x < WORLD_W && y < WORLD_H;
      const keyOf = (x, y) => `${x},${y}`;
      const isSolid = (x, y) =>
        !isInside(x, y) || Boolean(BLOCK_BY_ID[world[y][x]]?.solid);
      const isWater = (x, y) =>
        isInside(x, y) && world[y][x] === BLOCKS.water.id;
      const isSource = (x, y) => sources.has(keyOf(x, y));
      const isOpenForWater = (x, y) =>
        isInside(x, y) &&
        (world[y][x] === BLOCKS.air.id || world[y][x] === BLOCKS.water.id);
      const isHorizontallySupported = (x, y) =>
        y === WORLD_H - 1 ||
        isSolid(x, y + 1) ||
        isWater(x, y + 1) ||
        wallsRef.current[y][x] !== WALLS.empty.id;

      const setWater = (x, y, level, source = false) => {
        if (!isOpenForWater(x, y)) return false;
        const nextLevel = clamp(level, 0, MAX_WATER_SPREAD);
        const key = keyOf(x, y);
        const existingLevel = levels[y][x];

        if (
          world[y][x] === BLOCKS.water.id &&
          existingLevel <= nextLevel &&
          isSource(x, y) === source
        ) {
          return false;
        }

        world[y][x] = BLOCKS.water.id;
        levels[y][x] = nextLevel;
        if (source) sources.add(key);
        changedColumns.add(x);
        return true;
      };

      const clearWater = (x, y) => {
        if (!isWater(x, y)) return;
        world[y][x] = BLOCKS.air.id;
        levels[y][x] = -1;
        sources.delete(keyOf(x, y));
        placedBlocksRef.current.delete(keyOf(x, y));
        changedColumns.add(x);
      };

      for (const key of [...sources]) {
        const [x, y] = key.split(",").map(Number);
        if (
          !isInside(x, y) ||
          world[y][x] !== BLOCKS.water.id ||
          levels[y][x] !== 0
        ) {
          sources.delete(key);
          continue;
        }
      }

      for (let y = 0; y < WORLD_H; y++) {
        for (let x = 0; x < WORLD_W; x++) {
          if (
            !isWater(x, y) &&
            isOpenForWater(x, y) &&
            isHorizontallySupported(x, y) &&
            isSource(x - 1, y) &&
            isSource(x + 1, y)
          ) {
            setWater(x, y, 0, true);
            continue;
          }

          if (!isWater(x, y) || isSource(x, y)) continue;
          if (!isHorizontallySupported(x, y)) continue;

          const sourceNeighbors =
            Number(isSource(x - 1, y)) + Number(isSource(x + 1, y));
          if (sourceNeighbors >= 2) setWater(x, y, 0, true);
        }
      }

      const waterCells = [];
      for (let y = WORLD_H - 1; y >= 0; y--) {
        for (let x = 0; x < WORLD_W; x++) {
          if (isWater(x, y)) {
            waterCells.push({
              x,
              y,
              level: levels[y][x],
              source: isSource(x, y),
            });
          }
        }
      }

      waterCells.sort((a, b) => a.level - b.level || b.y - a.y);

      for (const cell of waterCells) {
        const { x, y } = cell;
        if (!isWater(x, y)) continue;

        if (isOpenForWater(x, y + 1) && !isSolid(x, y + 1)) {
          setWater(x, y + 1, Math.min(levels[y][x] + 1, 1));
          continue;
        }

        if (!isHorizontallySupported(x, y) || levels[y][x] >= MAX_WATER_SPREAD)
          continue;

        for (const dx of [-1, 1]) {
          const nx = x + dx;
          const nextLevel = levels[y][x] + 1;
          if (!isOpenForWater(nx, y) || nextLevel > MAX_WATER_SPREAD) continue;
          if (isWater(nx, y) && levels[y][nx] <= nextLevel) continue;
          setWater(nx, y, nextLevel);
        }
      }

      for (let y = WORLD_H - 1; y >= 0; y--) {
        for (let x = 0; x < WORLD_W; x++) {
          if (!isWater(x, y) || isSource(x, y)) continue;

          let desired = Infinity;

          if (isWater(x, y - 1)) {
            desired = Math.min(desired, 1);
          }

          if (isHorizontallySupported(x, y)) {
            for (const dx of [-1, 1]) {
              const nx = x + dx;
              if (!isWater(nx, y)) continue;
              desired = Math.min(desired, levels[y][nx] + 1);
            }
          }

          if (desired <= MAX_WATER_SPREAD) {
            const nextLevel = clamp(desired, 1, MAX_WATER_SPREAD);
            if (nextLevel !== levels[y][x]) {
              levels[y][x] = nextLevel;
              changedColumns.add(x);
            }
            continue;
          }

          levels[y][x] += 1;
          if (levels[y][x] > MAX_WATER_SPREAD) {
            clearWater(x, y);
          } else {
            changedColumns.add(x);
          }
        }
      }

      for (const x of changedColumns) {
        updateSkyCoverageColumn(world, skyCoverageRef.current, x);
      }
    };

    const removeUnsupportedTorches = (world, walls, x, y) => {
      const neighbors = [
        [x, y],
        [x, y - 1],
        [x, y + 1],
        [x - 1, y],
        [x + 1, y],
      ];
      let removed = 0;

      for (const [nx, ny] of neighbors) {
        if (nx < 0 || ny < 0 || nx >= WORLD_W || ny >= WORLD_H) continue;
        if (world[ny][nx] !== BLOCKS.torch.id) continue;
        if (torchHasSupport(world, walls, nx, ny, x, y)) continue;

        world[ny][nx] = BLOCKS.air.id;
        placedBlocksRef.current.delete(`${nx},${ny}`);
        emitParticles(
          particlesRef.current,
          nx * TILE + TILE / 2,
          ny * TILE + TILE / 2,
          BLOCKS.torch.color,
          5,
        );
        removed++;
      }

      return removed;
    };

    const mineOrPlace = (dt) => {
      mineCooldown -= dt;
      const mouse = mouseRef.current;
      if (!mouse.down || mineCooldown > 0) return;

      const cam = cameraRef.current;
      const worldX = Math.floor((mouse.x + cam.x) / TILE);
      const worldY = Math.floor((mouse.y + cam.y) / TILE);
      const player = playerRef.current;
      const centerX = player.x + player.w / 2;
      const centerY = player.y + player.h / 2;
      const distance = Math.hypot(
        worldX * TILE + TILE / 2 - centerX,
        worldY * TILE + TILE / 2 - centerY,
      );

      if (
        distance > TILE * 5.2 ||
        worldX < 0 ||
        worldY < 0 ||
        worldX >= WORLD_W ||
        worldY >= WORLD_H
      ) {
        setStats((current) => ({ ...current, message: "Too far away." }));
        mineCooldown = 0.18;
        return;
      }

      const world = worldRef.current;
      const walls = wallsRef.current;
      const ladders = laddersRef.current;

      if (buildModeRef.current === "background") {
        const wall = WALL_PLACEABLE[selectedWallRef.current] ?? WALLS.woodWall;

        if (mouse.button === 0) {
          if (wall.id === WALLS.ladder.id && ladders[worldY][worldX]) {
            ladders[worldY][worldX] = false;
            anchoredLaddersRef.current.delete(`${worldX},${worldY}`);
            emitParticles(
              particlesRef.current,
              worldX * TILE + TILE / 2,
              worldY * TILE + TILE / 2,
              wall.color,
              5,
            );
            setStats((current) => ({
              ...current,
              message: "Removed Ladder.",
            }));
          } else if (walls[worldY][worldX] !== WALLS.empty.id) {
            const removedWall =
              WALL_BY_ID[walls[worldY][worldX]] ?? WALLS.empty;
            walls[worldY][worldX] = WALLS.empty.id;
            const torchesRemoved = removeUnsupportedTorches(
              world,
              walls,
              worldX,
              worldY,
            );
            emitParticles(
              particlesRef.current,
              worldX * TILE + TILE / 2,
              worldY * TILE + TILE / 2,
              "rgba(220,220,220,.8)",
              5,
            );
            setStats((current) => ({
              ...current,
              message:
                torchesRemoved > 0
                  ? `Removed ${removedWall.name}. ${torchesRemoved} torch${torchesRemoved > 1 ? "es" : ""} fell off.`
                  : `Removed ${removedWall.name}.`,
            }));
          }
          mineCooldown = 0.1;
        }

        if (mouse.button === 2) {
          const canPlaceWall =
            wall.id !== WALLS.ladder.id ||
            ladderHasAnchor(walls, ladders, worldX, worldY);

          if (!canPlaceWall) {
            setStats((current) => ({
              ...current,
              message:
                "Ladders need a background wall, or another ladder connected vertically to one.",
            }));
            mineCooldown = 0.08;
            return;
          }

          if (wall.id === WALLS.ladder.id) {
            if (ladders[worldY][worldX]) {
              mineCooldown = 0.08;
              return;
            }
            ladders[worldY][worldX] = true;
            if (walls[worldY][worldX] !== WALLS.empty.id) {
              anchoredLaddersRef.current.add(`${worldX},${worldY}`);
            }
          } else if (walls[worldY][worldX] !== wall.id) {
            walls[worldY][worldX] = wall.id;
            anchoredLaddersRef.current.delete(`${worldX},${worldY}`);
          } else {
            mineCooldown = 0.08;
            return;
          }
          emitParticles(
            particlesRef.current,
            worldX * TILE + TILE / 2,
            worldY * TILE + TILE / 2,
            wall.color,
            5,
          );
          setStats((current) => ({
            ...current,
            wallsBuilt: current.wallsBuilt + 1,
            message: `Placed ${wall.name}. Background walls do not block movement.`,
          }));
          mineCooldown = 0.08;
        }

        return;
      }

      const currentBlock = BLOCK_BY_ID[world[worldY][worldX]] ?? BLOCKS.air;
      const blockKey = `${worldX},${worldY}`;

      if (mouse.button === 0 && currentBlock.id !== BLOCKS.air.id) {
        if (currentBlock.id === BLOCKS.water.id) {
          world[worldY][worldX] = BLOCKS.air.id;
          waterLevelsRef.current[worldY][worldX] = -1;
          waterSourcesRef.current.delete(blockKey);
          placedBlocksRef.current.delete(blockKey);
          updateSkyCoverageColumn(world, skyCoverageRef.current, worldX);
          emitParticles(
            particlesRef.current,
            worldX * TILE + TILE / 2,
            worldY * TILE + TILE / 2,
            BLOCKS.water.color,
            8,
          );
          setStats((current) => ({
            ...current,
            blocksMined: current.blocksMined + 1,
            message: "Picked up Water.",
          }));
          updateWaterFlow();
          mineCooldown = 0.12;
          return;
        }

        world[worldY][worldX] = BLOCKS.air.id;
        updateSkyCoverageColumn(world, skyCoverageRef.current, worldX);
        const torchesRemoved = removeUnsupportedTorches(
          world,
          walls,
          worldX,
          worldY,
        );
        const wasPlayerPlaced = placedBlocksRef.current.delete(blockKey);
        const leavesNaturalAir =
          currentBlock.id === BLOCKS.wood.id ||
          currentBlock.id === BLOCKS.leaves.id;
        const shouldRevealUnderground =
          !wasPlayerPlaced &&
          !leavesNaturalAir &&
          currentBlock.id !== BLOCKS.glass.id &&
          currentBlock.id !== BLOCKS.torch.id;

        if (
          shouldRevealUnderground &&
          walls[worldY][worldX] === WALLS.empty.id
        ) {
          walls[worldY][worldX] =
            currentBlock.id === BLOCKS.stone.id ||
            currentBlock.id === BLOCKS.ore.id
              ? WALLS.stoneBack.id
              : WALLS.dirtBack.id;
        }
        emitParticles(
          particlesRef.current,
          worldX * TILE + TILE / 2,
          worldY * TILE + TILE / 2,
          currentBlock.color === "transparent" ? "#ffffff" : currentBlock.color,
        );
        setStats((current) => ({
          ...current,
          blocksMined: current.blocksMined + 1,
          message:
            torchesRemoved > 0
              ? `Mined ${currentBlock.name}. ${torchesRemoved} torch${torchesRemoved > 1 ? "es" : ""} fell off.`
              : `Mined ${currentBlock.name}.`,
        }));
        mineCooldown =
          currentBlock.id === BLOCKS.stone.id ||
          currentBlock.id === BLOCKS.ore.id
            ? 0.26
            : 0.14;
      }

      if (mouse.button === 2) {
        const placeBlock =
          PLACEABLE[blockHotbarRef.current[selectedRef.current]] ??
          BLOCKS.dirt;
        const px = worldX * TILE;
        const py = worldY * TILE;
        const touchingPlayer = !(
          px + TILE <= player.x ||
          px >= player.x + player.w ||
          py + TILE <= player.y ||
          py >= player.y + player.h
        );
        const hasSupport =
          placeBlock.id === BLOCKS.water.id
            ? waterHasSupport(world, walls, worldX, worldY)
            : placeBlock.id === BLOCKS.torch.id
              ? torchHasSupport(world, walls, worldX, worldY)
              : blockHasSupport(world, walls, worldX, worldY);
        const replacingWater =
          currentBlock.id === BLOCKS.water.id &&
          placeBlock.id !== BLOCKS.water.id;
        const promotingWater =
          currentBlock.id === BLOCKS.water.id &&
          placeBlock.id === BLOCKS.water.id &&
          !waterSourcesRef.current.has(blockKey);

        if (
          (currentBlock.id === BLOCKS.air.id ||
            replacingWater ||
            promotingWater) &&
          !touchingPlayer &&
          hasSupport
        ) {
          if (replacingWater) {
            waterLevelsRef.current[worldY][worldX] = -1;
            waterSourcesRef.current.delete(blockKey);
            placedBlocksRef.current.delete(blockKey);
          }
          world[worldY][worldX] = placeBlock.id;
          if (placeBlock.id === BLOCKS.water.id) {
            waterLevelsRef.current[worldY][worldX] = 0;
            waterSourcesRef.current.add(blockKey);
          }
          updateSkyCoverageColumn(world, skyCoverageRef.current, worldX);
          placedBlocksRef.current.add(blockKey);
          emitParticles(
            particlesRef.current,
            worldX * TILE + TILE / 2,
            worldY * TILE + TILE / 2,
            placeBlock.color === "transparent" ? "#ffffff" : placeBlock.color,
            6,
          );
          setStats((current) => ({
            ...current,
            blocksPlaced: current.blocksPlaced + 1,
            message: promotingWater
              ? "Added a Water source."
              : `Placed ${placeBlock.name}.`,
          }));
          mineCooldown = 0.12;
        } else if (
          currentBlock.id === BLOCKS.air.id &&
          !touchingPlayer &&
          !hasSupport
        ) {
          setStats((current) => ({
            ...current,
            message:
              placeBlock.id === BLOCKS.torch.id
                ? "Torches need a block below or a background wall."
                : placeBlock.id === BLOCKS.water.id
                  ? "Water needs a solid block on any side or a background wall."
                  : "Blocks need support.",
          }));
          mineCooldown = 0.08;
        }
      }
    };

    const update = (dt) => {
      time += dt;
      skyTime += dt * settingsRef.current.dayCycleSpeed;

      if (pausedRef.current) return;

      const frameScale = dt * 60;
      const applyFrameDamping = (value) => value ** frameScale;

      const keys = keysRef.current;
      const player = playerRef.current;
      const world = worldRef.current;
      const ladders = laddersRef.current;

      for (const cloud of cloudsRef.current) {
        cloud.x += cloud.speed * dt;
        if (cloud.x - cameraRef.current.x * 0.25 > VIEW_W + 180) {
          cloud.x = cameraRef.current.x * 0.25 - 220;
        }
      }

      if (settingsRef.current.rainEnabled) {
        const rainIntensity = settingsRef.current.rainIntensity;
        const activeDrops = Math.floor(rainRef.current.length * rainIntensity);
        const rainSpeed = 0.75 + rainIntensity * 0.7;

        for (let i = 0; i < activeDrops; i++) {
          const drop = rainRef.current[i];
          drop.x += drop.drift * dt;
          drop.y += drop.speed * rainSpeed * dt;

          if (drop.y - drop.length > VIEW_H) {
            drop.y = -20 - Math.random() * 120;
            drop.x = Math.random() * (VIEW_W + 120) - 60;
          }

          if (drop.x > VIEW_W + 80) {
            drop.x = -40 - Math.random() * 60;
          }
        }
      }

      particlesRef.current = updateParticles(particlesRef.current, dt);
      waterFlowTimer += dt;
      if (waterFlowTimer >= WATER_FLOW_STEP) {
        waterFlowTimer = 0;
        updateWaterFlow();
      }

      const left = Boolean(keys.a || keys.arrowleft);
      const right = Boolean(keys.d || keys.arrowright);
      const moveDir = Number(right) - Number(left);
      const jump = Boolean(keys.w || keys.arrowup || keys[" "]);
      const down = Boolean(keys.s || keys.arrowdown);
      const sprint = Boolean(keys.shift);
      const movementScale = settingsRef.current.movementSpeed;
      const maxRunSpeed = (sprint ? 9.8 : 6.7) * movementScale;
      const onLadder = rectOverlapsLadder(
        ladders,
        player.x + 4,
        player.y + 4,
        player.w - 8,
        player.h - 8,
      );
      const inWater = rectOverlapsWater(
        world,
        player.x + 4,
        player.y + 6,
        player.w - 8,
        player.h - 12,
      );
      const waterTouchingFeet = rectOverlapsWater(
        world,
        player.x + 4,
        player.y + player.h - 14,
        player.w - 8,
        14,
      );
      const waterTouchingHead = rectOverlapsWater(
        world,
        player.x + 6,
        player.y + 2,
        player.w - 12,
        18,
      );
      const moveMaxSpeed = inWater
        ? (sprint ? 4.1 : 3.2) * movementScale
        : maxRunSpeed;

      if (moveDir !== 0) {
        const acceleration = inWater
          ? sprint
            ? 0.42 * movementScale
            : 0.31 * movementScale
          : player.onGround
            ? sprint
              ? 1.78 * movementScale
              : 1.3 * movementScale
            : sprint
              ? 0.69 * movementScale
              : 0.52 * movementScale;
        const turningBoost =
          !inWater && player.onGround && Math.sign(player.vx) === -moveDir
            ? 1.45
            : 1;
        player.vx += moveDir * acceleration * turningBoost * frameScale;
        player.facing = moveDir;
      } else {
        player.vx *= applyFrameDamping(
          inWater ? 0.84 : player.onGround ? 0.72 : 0.985,
        );
      }

      if (
        sprint &&
        player.onGround &&
        Math.abs(player.vx) > 3.2 &&
        Math.random() < 0.38
      ) {
        emitParticles(
          particlesRef.current,
          player.x + player.w / 2 - player.facing * 15,
          player.y + player.h - 3,
          "rgba(190,180,150,.65)",
          1,
        );
      }

      player.coyoteTime = player.onGround
        ? 0.09
        : Math.max(0, (player.coyoteTime ?? 0) - dt);

      if (jump && player.coyoteTime > 0 && !onLadder && !inWater) {
        player.vy = -13.6;
        player.onGround = false;
        player.coyoteTime = 0;
      }

      player.vx = clamp(player.vx, -moveMaxSpeed, moveMaxSpeed);
      if (onLadder) {
        if (jump) {
          player.vy = -4.2;
        } else if (down) {
          player.vy = 4.2;
        } else {
          player.vy = 0;
        }
      } else if (inWater) {
        const gravity = waterTouchingHead ? 0.18 : 0.26;
        player.vy = clamp(player.vy + gravity * frameScale, -5.2, 6);
        player.vy *= applyFrameDamping(waterTouchingHead ? 0.9 : 0.94);

        if (jump) {
          player.vy = waterTouchingHead ? -3.8 : -2.9;
        } else if (down) {
          player.vy = Math.min(player.vy + 0.52 * frameScale, 4.5);
        } else if (waterTouchingFeet) {
          player.vy = Math.min(player.vy, 1.2);
        }
      } else {
        player.vy = clamp(player.vy + 0.72 * frameScale, -18, 18);
      }

      if (Math.abs(player.vx) < 0.01) player.vx = 0;
      if (Math.abs(player.vy) < 0.01) player.vy = 0;

      if (player.vx !== 0) {
        const step = Math.sign(player.vx);
        const nextX = player.x + player.vx * frameScale;

        if (!rectHitsSolid(world, nextX, player.y, player.w, player.h)) {
          player.x = nextX;
        } else {
          while (
            !rectHitsSolid(world, player.x + step, player.y, player.w, player.h)
          ) {
            player.x += step;
          }
          player.vx = 0;
        }
      }

      player.onGround = false;

      if (player.vy !== 0) {
        const step = Math.sign(player.vy);
        const nextY = player.y + player.vy * frameScale;

        if (!rectHitsSolid(world, player.x, nextY, player.w, player.h)) {
          player.y = nextY;
        } else {
          while (
            !rectHitsSolid(world, player.x, player.y + step, player.w, player.h)
          ) {
            player.y += step;
          }
          if (player.vy > 0) player.onGround = true;
          player.vy = 0;
        }
      } else if (
        rectHitsSolid(world, player.x, player.y + 1, player.w, player.h)
      ) {
        player.onGround = true;
      }

      if (player.y > WORLD_H * TILE - 100) {
        playerRef.current = createPlayer();
        setStats((current) => ({
          ...current,
          message: "You fell into the void. Respawned.",
        }));
      }

      const activePlayer = playerRef.current;
      const cam = cameraRef.current;
      cam.x +=
        (activePlayer.x +
          activePlayer.w / 2 -
          VIEW_W / 2 +
          activePlayer.vx * 15 -
          cam.x) *
        (1 - applyFrameDamping(0.91));
      cam.y +=
        (activePlayer.y + activePlayer.h / 2 - VIEW_H / 2 - 30 - cam.y) *
        (1 - applyFrameDamping(0.91));
      cam.x = clamp(cam.x, 0, WORLD_W * TILE - VIEW_W);
      cam.y = clamp(cam.y, 0, WORLD_H * TILE - VIEW_H);

      mineOrPlace(dt);
    };

    const drawPanel = (x, y, w, h, fill = "rgba(2,6,23,.78)") => {
      uiCtx.fillStyle = fill;
      uiCtx.fillRect(x, y, w, h);
      uiCtx.strokeStyle = "rgba(255,255,255,.18)";
      uiCtx.lineWidth = 1;
      uiCtx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    };

    const drawButton = (button, mouse) => {
      const hovering =
        mouse.x >= button.x &&
        mouse.x <= button.x + button.w &&
        mouse.y >= button.y &&
        mouse.y <= button.y + button.h;

      uiCtx.fillStyle = hovering ? "rgba(34,197,94,.42)" : "rgba(15,23,42,.92)";
      uiCtx.fillRect(button.x, button.y, button.w, button.h);
      uiCtx.strokeStyle = hovering
        ? "rgba(134,239,172,.95)"
        : "rgba(255,255,255,.22)";
      uiCtx.lineWidth = 2;
      uiCtx.strokeRect(
        button.x + 0.5,
        button.y + 0.5,
        button.w - 1,
        button.h - 1,
      );
      uiCtx.fillStyle = "#f8fafc";
      uiCtx.font = "800 18px ui-sans-serif, system-ui";
      uiCtx.textAlign = "center";
      uiCtx.fillText(button.label, button.x + button.w / 2, button.y + 29);
    };

    const drawHotbar = () => {
      const items =
        buildModeRef.current === "background"
          ? WALL_PLACEABLE
          : blockHotbarRef.current.map((index) => PLACEABLE[index]);
      const selectedIndex =
        buildModeRef.current === "background"
          ? selectedWallRef.current
          : selectedRef.current;
      const slot = 48;
      const gap = 6;
      const count =
        buildModeRef.current === "background" ? WALL_PLACEABLE.length : 10;
      const totalW = count * slot + (count - 1) * gap;
      const startX = (VIEW_W - totalW) / 2;
      const y = VIEW_H - 62;

      for (let i = 0; i < count; i++) {
        const item = items[i];
        const x = startX + i * (slot + gap);
        const selectedItem = i === selectedIndex;

        uiCtx.fillStyle = selectedItem
          ? buildModeRef.current === "background"
            ? "rgba(103,232,249,.32)"
            : "rgba(134,239,172,.32)"
          : "rgba(2,6,23,.78)";
        uiCtx.fillRect(x, y, slot, slot);
        uiCtx.strokeStyle = selectedItem
          ? buildModeRef.current === "background"
            ? "#67e8f9"
            : "#86efac"
          : "rgba(255,255,255,.22)";
        uiCtx.lineWidth = selectedItem ? 3 : 1;
        uiCtx.strokeRect(x + 0.5, y + 0.5, slot - 1, slot - 1);

        if (item) {
          const texture =
            buildModeRef.current === "background"
              ? getWallTexture(item)
              : getBlockTexture(item);
          uiCtx.save();
          uiCtx.imageSmoothingEnabled = false;
          uiCtx.drawImage(texture, x + 11, y + 10, 26, 26);
          uiCtx.restore();
          uiCtx.strokeStyle = "rgba(0,0,0,.35)";
          uiCtx.lineWidth = 1;
          uiCtx.strokeRect(x + 11.5, y + 10.5, 25, 25);
          uiCtx.fillStyle = "#f8fafc";
          uiCtx.font = "800 11px ui-sans-serif, system-ui";
          uiCtx.textAlign = "left";
          uiCtx.fillText(i === 9 ? "0" : String(i + 1), x + 5, y + 14);
        }
      }

      const label =
        buildModeRef.current === "background"
          ? "Background walls"
          : "Foreground blocks";
      uiCtx.fillStyle =
        buildModeRef.current === "background"
          ? "rgba(8,145,178,.88)"
          : "rgba(22,101,52,.88)";
      uiCtx.fillRect(16, VIEW_H - 48, 178, 32);
      uiCtx.strokeStyle =
        buildModeRef.current === "background"
          ? "rgba(103,232,249,.72)"
          : "rgba(134,239,172,.72)";
      uiCtx.lineWidth = 1;
      uiCtx.strokeRect(16.5, VIEW_H - 47.5, 177, 31);
      uiCtx.fillStyle = "#f8fafc";
      uiCtx.font = "850 13px ui-sans-serif, system-ui";
      uiCtx.textAlign = "left";
      uiCtx.fillText(label, 28, VIEW_H - 28);
    };

    const drawSelectionHint = () => {
      const hint = selectionHintRef.current;
      const remaining = hint.until - performance.now() / 1000;
      if (!hint.text || remaining <= 0) return;

      const alpha = clamp(Math.min(remaining / 0.28, 1), 0, 1);
      const y = VIEW_H - 88 - (1 - alpha) * 7;
      const text = `${hint.text}`;

      uiCtx.save();
      uiCtx.globalAlpha = alpha;
      uiCtx.font = "900 18px ui-sans-serif, system-ui";
      uiCtx.textAlign = "center";
      const width = Math.min(300, uiCtx.measureText(text).width + 34);
      const x = VIEW_W / 2 - width / 2;

      uiCtx.fillStyle = "rgba(2,6,23,.82)";
      uiCtx.fillRect(x, y - 26, width, 36);
      uiCtx.strokeStyle = hint.color;
      uiCtx.lineWidth = 2;
      uiCtx.strokeRect(x + 0.5, y - 25.5, width - 1, 35);
      uiCtx.fillStyle = hint.color;
      uiCtx.fillText(text, VIEW_W / 2, y - 3);
      uiCtx.restore();
    };

    const drawHelpOverlay = () => {
      drawPanel(220, 70, 520, 356, "rgba(2,6,23,.9)");
      uiCtx.fillStyle = "#ffffff";
      uiCtx.font = "900 28px ui-sans-serif, system-ui";
      uiCtx.textAlign = "left";
      uiCtx.fillText("Controls", 250, 112);

      const controls = [
        ["A / D or arrows", "Move"],
        ["W / Space", "Jump"],
        ["Shift", "Run"],
        ["Left click", "Mine block or remove wall"],
        ["Right click", "Place block or wall"],
        ["1-0", "Select hotbar item"],
        ["B", "Switch foreground/background"],
        ["H", "Fill background wall near player"],
        ["F", "Toggle fullscreen"],
        ["Esc / P", "Pause menu"],
        ["F1", "Show or hide this help"],
        ["F2 / F3", "Show or hide world options"],
      ];

      uiCtx.font = "800 15px ui-sans-serif, system-ui";
      for (let i = 0; i < controls.length; i++) {
        const y = 150 + i * 24;
        uiCtx.fillStyle = "#bbf7d0";
        uiCtx.fillText(controls[i][0], 250, y);
        uiCtx.fillStyle = "#dbeafe";
        uiCtx.fillText(controls[i][1], 420, y);
      }
    };

    const drawPauseMenu = () => {
      uiCtx.fillStyle = "rgba(0,0,0,.52)";
      uiCtx.fillRect(0, 0, VIEW_W, VIEW_H);
      drawPanel(300, 132, 360, 292, "rgba(2,6,23,.92)");
      uiCtx.fillStyle = "#ffffff";
      uiCtx.font = "900 34px ui-sans-serif, system-ui";
      uiCtx.textAlign = "center";
      uiCtx.fillText("Paused", VIEW_W / 2, 184);

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
          label: document.fullscreenElement
            ? "Disable Fullscreen"
            : "Enable Fullscreen",
          action: "fullscreen",
          x: 360,
          y: 344,
          w: 240,
          h: 46,
        },
      ];
      menuButtonsRef.current = buttons;

      for (const button of buttons) drawButton(button, mouseRef.current);
    };

    const render = () => {
      const cam = cameraRef.current;
      const player = playerRef.current;
      const world = worldRef.current;
      const walls = wallsRef.current;
      const waterLevels = waterLevelsRef.current;
      const ladders = laddersRef.current;
      const skyCoverage = skyCoverageRef.current;
      const heldItem =
        buildModeRef.current === "background"
          ? (WALL_PLACEABLE[selectedWallRef.current] ?? WALLS.woodWall)
          : (PLACEABLE[blockHotbarRef.current[selectedRef.current]] ??
            BLOCKS.dirt);
      const dayCycleSpeed = 0.018;
      const settings = settingsRef.current;
      const cycledDay = (Math.sin(skyTime * dayCycleSpeed) + 1) / 2;
      const day =
        settings.skyMode === "day"
          ? 0.95
          : settings.skyMode === "night"
            ? 0.05
            : cycledDay;
      const rainIntensity = settings.rainEnabled ? settings.rainIntensity : 0;
      const rainStrength = rainIntensity * (0.36 + (1 - day) * 0.34);
      const stormShade = rainIntensity * 0.22;

      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      uiCtx.clearRect(0, 0, VIEW_W, VIEW_H);

      const night = 1 - day;
      const sunset = Math.max(0, 1 - Math.abs(day - 0.5) * 3.1);
      const skyTop = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      skyTop.addColorStop(
        0,
        `rgb(${Math.floor(8 + day * 90 + sunset * 55)}, ${Math.floor(18 + day * 125 + sunset * 42)}, ${Math.floor(38 + day * 170 + sunset * 10)})`,
      );
      skyTop.addColorStop(
        0.48,
        `rgb(${Math.floor(18 + day * 95 + sunset * 105)}, ${Math.floor(34 + day * 120 + sunset * 58)}, ${Math.floor(72 + day * 120 + sunset * 18)})`,
      );
      skyTop.addColorStop(
        1,
        `rgb(${Math.floor(34 + day * 105 + sunset * 120)}, ${Math.floor(48 + day * 118 + sunset * 46)}, ${Math.floor(78 + day * 98 + sunset * 6)})`,
      );
      ctx.fillStyle = skyTop;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      if (rainIntensity > 0) {
        ctx.fillStyle = `rgba(20, 34, 55, ${stormShade})`;
        ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      }

      const horizonGlow = ctx.createLinearGradient(0, VIEW_H * 0.34, 0, VIEW_H);
      horizonGlow.addColorStop(0, "rgba(255,255,255,0)");
      horizonGlow.addColorStop(
        1,
        `rgba(255,${Math.floor(118 + sunset * 95)},${Math.floor(92 + sunset * 34)},${0.08 + sunset * 0.16})`,
      );
      ctx.fillStyle = horizonGlow;
      ctx.fillRect(0, VIEW_H * 0.34, VIEW_W, VIEW_H * 0.66);

      if (night > 0.14) {
        ctx.save();
        const starAlpha = (night - 0.14) / 0.86;
        for (let i = 0; i < 44; i++) {
          const sx =
            (i * 137.53 + Math.sin(i * 91.7) * 43 - cam.x * 0.015) %
            (VIEW_W + 80);
          const sy = 28 + ((i * 53.17) % (VIEW_H * 0.5));
          const twinkle = 0.45 + 0.55 * Math.sin(time * 2.4 + i * 1.7);
          ctx.fillStyle = `rgba(255,255,255,${starAlpha * twinkle * 0.9})`;
          ctx.fillRect(
            ((sx + VIEW_W + 80) % (VIEW_W + 80)) - 40,
            sy,
            i % 5 === 0 ? 2 : 1,
            i % 5 === 0 ? 2 : 1,
          );
        }
        ctx.restore();
      }

      const orbX = 90 + day * 760;
      const orbY = 86 + Math.cos(skyTime * dayCycleSpeed) * 42;

      if (day >= 0.5) {
        const sunGlow = ctx.createRadialGradient(
          orbX,
          orbY,
          10,
          orbX,
          orbY,
          112,
        );
        sunGlow.addColorStop(0, "rgba(255,244,190,.95)");
        sunGlow.addColorStop(0.35, "rgba(255,212,110,.42)");
        sunGlow.addColorStop(1, "rgba(255,200,90,0)");
        ctx.fillStyle = sunGlow;
        ctx.fillRect(orbX - 112, orbY - 112, 224, 224);

        ctx.fillStyle = "#fff2b0";
        ctx.beginPath();
        ctx.arc(orbX, orbY, 30 + sunset * 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        const moonGlow = ctx.createRadialGradient(
          orbX,
          orbY,
          8,
          orbX,
          orbY,
          82,
        );
        moonGlow.addColorStop(0, "rgba(236,244,255,.72)");
        moonGlow.addColorStop(0.45, "rgba(182,210,255,.18)");
        moonGlow.addColorStop(1, "rgba(182,210,255,0)");
        ctx.fillStyle = moonGlow;
        ctx.fillRect(orbX - 82, orbY - 82, 164, 164);

        ctx.fillStyle = "#edf5ff";
        ctx.beginPath();
        ctx.arc(orbX, orbY, 23, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "rgba(150,175,220,.3)";
        ctx.beginPath();
        ctx.arc(orbX + 7, orbY - 4, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const cloud of cloudsRef.current) {
        const x = cloud.x - cam.x * 0.25;
        const y = cloud.y;
        const s = cloud.scale;

        const drift = Math.sin(time * 0.18 + cloud.x * 0.004) * 3;
        const cx = x;
        const cy = y + drift;

        const alpha = 0.22 + day * 0.42;

        ctx.save();

        const g = ctx.createLinearGradient(cx, cy - 28 * s, cx, cy + 30 * s);
        g.addColorStop(0, `rgba(245, 250, 255, ${alpha})`);
        g.addColorStop(0.55, `rgba(218, 228, 242, ${alpha})`);
        g.addColorStop(1, `rgba(155, 172, 195, ${alpha * 0.9})`);

        ctx.fillStyle = g;

        ctx.beginPath();
        ctx.moveTo(cx + 8 * s, cy + 18 * s);

        ctx.bezierCurveTo(
          cx + 4 * s,
          cy + 4 * s,
          cx + 18 * s,
          cy - 3 * s,
          cx + 35 * s,
          cy + 1 * s,
        );
        ctx.bezierCurveTo(
          cx + 44 * s,
          cy - 18 * s,
          cx + 73 * s,
          cy - 24 * s,
          cx + 95 * s,
          cy - 11 * s,
        );
        ctx.bezierCurveTo(
          cx + 113 * s,
          cy - 21 * s,
          cx + 139 * s,
          cy - 11 * s,
          cx + 145 * s,
          cy + 5 * s,
        );
        ctx.bezierCurveTo(
          cx + 166 * s,
          cy + 4 * s,
          cx + 179 * s,
          cy + 15 * s,
          cx + 174 * s,
          cy + 27 * s,
        );
        ctx.bezierCurveTo(
          cx + 135 * s,
          cy + 33 * s,
          cx + 58 * s,
          cy + 34 * s,
          cx + 20 * s,
          cy + 27 * s,
        );
        ctx.bezierCurveTo(
          cx + 10 * s,
          cy + 26 * s,
          cx + 5 * s,
          cy + 22 * s,
          cx + 8 * s,
          cy + 18 * s,
        );

        ctx.closePath();
        ctx.fill();

        // very subtle bottom depth, not separate layer
        ctx.fillStyle = `rgba(80, 95, 120, ${0.035 + day * 0.045})`;
        ctx.beginPath();
        ctx.ellipse(cx + 92 * s, cy + 19 * s, 70 * s, 7 * s, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      if (rainIntensity > 0) {
        ctx.save();
        ctx.lineCap = "round";
        const activeDrops = Math.floor(rainRef.current.length * rainIntensity);
        for (let i = 0; i < activeDrops; i++) {
          const drop = rainRef.current[i];
          const length = drop.length * (0.75 + rainIntensity * 0.55);
          ctx.lineWidth = drop.width;
          ctx.strokeStyle = `rgba(188, 226, 255, ${drop.alpha * rainStrength})`;
          ctx.beginPath();
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x - drop.drift * 0.05, drop.y + length);
          ctx.stroke();
        }

        if (rainIntensity > 0.55) {
          ctx.fillStyle = `rgba(185, 220, 255, ${0.035 * rainIntensity})`;
          for (let i = 0; i < 26; i++) {
            const mistX = (i * 83 + time * 24) % (VIEW_W + 80) - 40;
            const mistY = 120 + ((i * 47) % (VIEW_H - 130));
            ctx.fillRect(mistX, mistY, 34 + (i % 5) * 9, 1);
          }
        }
        ctx.restore();
      }

      ctx.fillStyle = `rgba(${Math.floor(16 + day * 26)},${Math.floor(42 + day * 42)},${Math.floor(72 + day * 46)},${0.2 + night * 0.08})`;
      ctx.beginPath();
      ctx.moveTo(0, 395);
      for (let x = 0; x <= VIEW_W; x += 40) {
        ctx.lineTo(x, 370 + Math.sin((x + cam.x * 0.15) * 0.012) * 28);
      }
      ctx.lineTo(VIEW_W, VIEW_H);
      ctx.lineTo(0, VIEW_H);
      ctx.fill();

      const startX = Math.max(0, Math.floor(cam.x / TILE) - 1);
      const endX = Math.min(WORLD_W, Math.ceil((cam.x + VIEW_W) / TILE) + 1);
      const startY = Math.max(0, Math.floor(cam.y / TILE) - 1);
      const endY = Math.min(WORLD_H, Math.ceil((cam.y + VIEW_H) / TILE) + 1);

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const wall = WALL_BY_ID[walls[y][x]];
          if (wall?.id) {
            drawWall(ctx, wall, x * TILE - cam.x, y * TILE - cam.y, TILE, time);
          }
        }
      }

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          if (ladders[y][x]) {
            drawWall(
              ctx,
              WALLS.ladder,
              x * TILE - cam.x,
              y * TILE - cam.y,
              TILE,
              time,
            );
          }
        }
      }

      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const block = BLOCK_BY_ID[world[y][x]];
          if (block?.id) {
            drawBlock(
              ctx,
              block,
              x * TILE - cam.x,
              y * TILE - cam.y,
              TILE,
              time,
              block.id === BLOCKS.water.id ? waterLevels[y][x] : 0,
              block.id === BLOCKS.water.id &&
                y > 0 &&
                world[y - 1][x] === BLOCKS.water.id,
            );
          }
        }
      }

      const mouse = mouseRef.current;
      const tx = Math.floor((mouse.x + cam.x) / TILE);
      const ty = Math.floor((mouse.y + cam.y) / TILE);
      const targetDist = Math.hypot(
        tx * TILE + TILE / 2 - (player.x + player.w / 2),
        ty * TILE + TILE / 2 - (player.y + player.h / 2),
      );

      if (
        tx >= 0 &&
        ty >= 0 &&
        tx < WORLD_W &&
        ty < WORLD_H &&
        targetDist <= TILE * 5.2
      ) {
        ctx.strokeStyle =
          buildModeRef.current === "background"
            ? "rgba(125,230,255,.92)"
            : "rgba(255,255,255,.85)";
        ctx.lineWidth = 2;
        ctx.strokeRect(
          tx * TILE - cam.x + 2,
          ty * TILE - cam.y + 2,
          TILE - 4,
          TILE - 4,
        );

        if (buildModeRef.current === "background") {
          ctx.fillStyle = "rgba(125,230,255,.08)";
          ctx.fillRect(
            tx * TILE - cam.x + 3,
            ty * TILE - cam.y + 3,
            TILE - 6,
            TILE - 6,
          );
        }
      }

      drawPlayer(
        ctx,
        player.x - cam.x,
        player.y - cam.y,
        time,
        player.vx,
        player.onGround,
        player.facing,
        Boolean(keysRef.current.shift && Math.abs(player.vx) > 2.2),
        heldItem,
        buildModeRef.current === "background" ? "wall" : "block",
      );

      const playerScreenX = player.x - cam.x;
      const playerScreenY = player.y - cam.y;
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          if (world[y][x] !== BLOCKS.water.id) continue;

          const tileScreenX = x * TILE - cam.x;
          const tileScreenY = y * TILE - cam.y;
          const overlapsPlayer = !(
            tileScreenX + TILE <= playerScreenX ||
            tileScreenX >= playerScreenX + player.w ||
            tileScreenY + TILE <= playerScreenY ||
            tileScreenY >= playerScreenY + player.h
          );

          if (!overlapsPlayer) continue;

          drawBlock(
            ctx,
            BLOCKS.water,
            tileScreenX,
            tileScreenY,
            TILE,
            time,
            waterLevels[y][x],
            y > 0 && world[y - 1][x] === BLOCKS.water.id,
          );
        }
      }

      drawParticles(ctx, particlesRef.current, cam);

      drawLightMask(
        ctx,
        skyCoverage,
        world,
        cam,
        startX,
        endX,
        startY,
        endY,
        day,
      );
      drawTorchLights(
        ctx,
        world,
        skyCoverage,
        cam,
        startX,
        endX,
        startY,
        endY,
        night,
        time,
      );

      uiCtx.strokeStyle =
        buildModeRef.current === "background"
          ? "rgba(125,230,255,.85)"
          : "rgba(255,255,255,.75)";
      uiCtx.lineWidth = 2;
      uiCtx.beginPath();
      uiCtx.moveTo(mouse.x - 8, mouse.y);
      uiCtx.lineTo(mouse.x + 8, mouse.y);
      uiCtx.moveTo(mouse.x, mouse.y - 8);
      uiCtx.lineTo(mouse.x, mouse.y + 8);
      uiCtx.stroke();

      drawHotbar();
      drawSelectionHint();

      if (helpOpenRef.current && !pausedRef.current) drawHelpOverlay();
      if (pausedRef.current) drawPauseMenu();
    };

    const loop = (now) => {
      const dt = Math.min(0.035, (now - last) / 1000);
      last = now;
      update(dt);
      render();
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("resize", resizeUiCanvas);
      cancelAnimationFrame(raf);
    };
  }, [worldSeed]);

  return (
    <main className="game-app">
      <div className="game-layout">
        <GameHeader
          buildMode={buildMode}
          onToggleBuildMode={toggleBuildMode}
          onFillHouseBackground={fillHouseBackground}
          onResetWorld={resetWorld}
        />
        <GameStage
          gameShellRef={gameShellRef}
          canvasRef={canvasRef}
          uiCanvasRef={uiCanvasRef}
          isFullscreen={isFullscreen}
          buildMode={buildMode}
          onToggleFullscreen={toggleFullscreen}
        >
          {isSettingsOpen && (
            <SettingsOverlay
              gameSettings={gameSettings}
              onClose={() => setIsSettingsOpen(false)}
              onUpdateSetting={updateGameSetting}
            />
          )}
        </GameStage>
        <section className="game-panels">
          <InventoryPanel
            buildMode={buildMode}
            selected={selected}
            selectedWall={selectedWall}
            blockHotbar={blockHotbar}
            onSelectHotbarSlot={selectBlock}
            onChooseInventoryBlock={chooseInventoryBlock}
            onSelectWall={selectWall}
            onSetForegroundMode={() => setBuildMode("foreground")}
            onSetBackgroundMode={() => setBuildMode("background")}
          />
          <ControlsPanel stats={stats} />
        </section>
      </div>
    </main>
  );
}
