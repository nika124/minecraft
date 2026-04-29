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
  drawEnvironment,
  makeRainDrops,
  updateEnvironment,
} from "./game/environment";
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
  getWorldWaterLevels,
  getWorldWaterSources,
  updateWaterFlow,
  WATER_FLOW_STEP,
} from "./game/simulation/water";
import {
  blockHasSupport,
  ladderHasAnchor,
  torchHasSupport,
  waterHasSupport,
} from "./game/simulation/support";
import { updatePlayerAndCamera } from "./game/simulation/player";
import {
  drawHelpOverlay,
  drawHotbar,
  drawPauseMenu,
  drawSelectionHint,
} from "./game/ui/hud";
import {
  useCanvasMouseControls,
  useKeyboardControls,
} from "./hooks/useGameInput";
import {
  createPlayer,
  createStats,
  emitParticles,
  makeClouds,
  makeWorld,
  updateParticles,
} from "./game/world";

void ControlsPanel;
void GameHeader;
void GameStage;
void InventoryPanel;
void SettingsOverlay;

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
  const inventoryOpenRef = useRef(false);
  const carriedPlaceableRef = useRef(null);
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
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [carriedPlaceableIndex, setCarriedPlaceableIndex] = useState(null);
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
    inventoryOpenRef.current = isInventoryOpen;
  }, [isInventoryOpen]);

  useEffect(() => {
    carriedPlaceableRef.current = carriedPlaceableIndex;
  }, [carriedPlaceableIndex]);

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

  const assignBlockToHotbar = useCallback(
    (placeableIndex, slotIndex) => {
      const item = PLACEABLE[placeableIndex];
      if (!item) return;

      setBlockHotbar((current) =>
        current.map((value, index) =>
          index === slotIndex ? placeableIndex : value,
        ),
      );
      setSelected(slotIndex);
      setCarriedPlaceableIndex(null);
      showSelectionHint(item, "foreground");
      setStats((current) => ({
        ...current,
        message: `Assigned ${item.name} to hotbar slot ${slotIndex === 9 ? "0" : slotIndex + 1}.`,
      }));
    },
    [showSelectionHint],
  );

  const clearHotbarSlot = useCallback((slotIndex) => {
    const item = PLACEABLE[blockHotbarRef.current[slotIndex]];
    setBlockHotbar((current) =>
      current.map((value, index) => (index === slotIndex ? null : value)),
    );
    setCarriedPlaceableIndex(null);
    if (item) {
      setStats((current) => ({
        ...current,
        message: `Removed ${item.name} from hotbar slot ${slotIndex === 9 ? "0" : slotIndex + 1}.`,
      }));
    }
  }, []);

  const swapHotbarSlots = useCallback((fromSlot, toSlot) => {
    if (fromSlot === toSlot) return;
    setBlockHotbar((current) => {
      const next = [...current];
      [next[fromSlot], next[toSlot]] = [next[toSlot], next[fromSlot]];
      return next;
    });
    setSelected(toSlot);
    setCarriedPlaceableIndex(null);
    setStats((current) => ({
      ...current,
      message: `Swapped hotbar slots ${fromSlot === 9 ? "0" : fromSlot + 1} and ${toSlot === 9 ? "0" : toSlot + 1}.`,
    }));
  }, []);

  const selectBlock = useCallback(
    (slotIndex) => {
      const carriedIndex = carriedPlaceableRef.current;
      if (carriedIndex !== null) {
        assignBlockToHotbar(carriedIndex, slotIndex);
        return;
      }

      const item = PLACEABLE[blockHotbarRef.current[slotIndex]];
      setSelected(slotIndex);
      if (item) showSelectionHint(item, "foreground");
    },
    [assignBlockToHotbar, showSelectionHint],
  );

  const chooseInventoryBlock = useCallback(
    (placeableIndex) => {
      const item = PLACEABLE[placeableIndex];
      if (!item) return;

      setCarriedPlaceableIndex(placeableIndex);
      showSelectionHint(item, "foreground");
      setStats((current) => ({
        ...current,
        message: `Picked up ${item.name}. Click a hotbar slot or press 1-0 to assign it.`,
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

  const stepWaterFlow = useCallback(() => {
    updateWaterFlow({
      worldRef,
      wallsRef,
      waterLevelsRef,
      waterSourcesRef,
      placedBlocksRef,
      skyCoverageRef,
    });
  }, []);

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

  useKeyboardControls({
    isInventoryOpen,
    keysRef,
    pressedRef,
    inventoryOpenRef,
    carriedPlaceableRef,
    buildModeRef,
    selectBlock,
    selectWall,
    toggleBuildMode,
    fillHouseBackground,
    resetWorld,
    toggleFullscreen,
    setIsHelpOpen,
    setIsSettingsOpen,
    setIsInventoryOpen,
    setCarriedPlaceableIndex,
    setIsPaused,
  });

  useCanvasMouseControls({
    uiCanvasRef,
    mouseRef,
    pausedRef,
    menuButtonsRef,
    inventoryOpenRef,
    carriedPlaceableRef,
    selectBlock,
    setIsPaused,
    resetWorld,
    toggleFullscreen,
  });

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
          stepWaterFlow();
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
          PLACEABLE[blockHotbarRef.current[selectedRef.current]];
        if (!placeBlock) {
          setStats((current) => ({
            ...current,
            message: "That hotbar slot is empty.",
          }));
          mineCooldown = 0.14;
          return;
        }
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

      const world = worldRef.current;
      const ladders = laddersRef.current;

      updateEnvironment({
        clouds: cloudsRef.current,
        rainDrops: rainRef.current,
        camera: cameraRef.current,
        settings: settingsRef.current,
        dt,
      });

      particlesRef.current = updateParticles(particlesRef.current, dt);
      waterFlowTimer += dt;
      if (waterFlowTimer >= WATER_FLOW_STEP) {
        waterFlowTimer = 0;
        stepWaterFlow();
      }

      updatePlayerAndCamera({
        playerRef,
        cameraRef,
        world,
        ladders,
        keys: keysRef.current,
        particles: particlesRef.current,
        movementScale: settingsRef.current.movementSpeed,
        dt,
        frameScale,
        applyFrameDamping,
        setStats,
      });

      mineOrPlace(dt);
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
          : PLACEABLE[blockHotbarRef.current[selectedRef.current]];

      ctx.clearRect(0, 0, VIEW_W, VIEW_H);
      uiCtx.clearRect(0, 0, VIEW_W, VIEW_H);

      const { day, night } = drawEnvironment(ctx, {
        cam,
        clouds: cloudsRef.current,
        rainDrops: rainRef.current,
        time,
        skyTime,
        settings: settingsRef.current,
      });

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

      drawHotbar(uiCtx, {
        buildMode: buildModeRef.current,
        blockHotbar: blockHotbarRef.current,
        selected: selectedRef.current,
        selectedWall: selectedWallRef.current,
      });
      drawSelectionHint(uiCtx, selectionHintRef.current);

      if (helpOpenRef.current && !pausedRef.current) drawHelpOverlay(uiCtx);
      if (pausedRef.current) {
        menuButtonsRef.current = drawPauseMenu(
          uiCtx,
          mouseRef.current,
          document.fullscreenElement,
        );
      }
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
  }, [stepWaterFlow, worldSeed]);

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
          {isInventoryOpen && (
            <>
              <div className="inventory-backdrop" aria-hidden="true" />
              <InventoryPanel
                buildMode={buildMode}
                selected={selected}
                selectedWall={selectedWall}
                blockHotbar={blockHotbar}
                onSelectHotbarSlot={selectBlock}
                onChooseInventoryBlock={chooseInventoryBlock}
                onAssignInventoryBlock={assignBlockToHotbar}
                onClearHotbarSlot={clearHotbarSlot}
                onSwapHotbarSlots={swapHotbarSlots}
                onSelectWall={selectWall}
                onSetForegroundMode={() => setBuildMode("foreground")}
                onSetBackgroundMode={() => setBuildMode("background")}
                carriedPlaceableIndex={carriedPlaceableIndex}
                onClose={() => {
                  setIsInventoryOpen(false);
                  setCarriedPlaceableIndex(null);
                }}
              />
            </>
          )}
        </GameStage>
        <section className="game-panels">
          <ControlsPanel stats={stats} />
        </section>
      </div>
    </main>
  );
}
