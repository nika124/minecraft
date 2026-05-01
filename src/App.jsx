import { useCallback, useEffect, useRef, useState } from "react";
import ControlsPanel from "./components/ControlsPanel";
import GameHeader from "./components/GameHeader";
import GameStage from "./components/GameStage";
import HelpOverlay from "./components/HelpOverlay";
import InventoryPanel from "./components/InventoryPanel";
import SettingsOverlay from "./components/SettingsOverlay";
import WorkbenchPanel from "./components/WorkbenchPanel";
import {
  BLOCK_BY_ID,
  BLOCKS,
  FOREGROUND_ITEMS,
  TILE,
  VIEW_H,
  VIEW_W,
  WALL_BY_ID,
  WALLS,
  WORLD_H,
  WORLD_W,
} from "./game/constants";
import { getItemCount, removeItem } from "./game/inventory";
import {
  getBackgroundWallForBlock,
  getForegroundItemId,
  getInventoryItemForPlaceable,
} from "./game/items";
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
} from "./game/rendering";
import {
  getWorldWaterLevels,
  getWorldWaterSources,
  updateWaterFlow,
  WATER_FLOW_STEP,
} from "./game/simulation/water";
import { updatePlayerAndCamera } from "./game/simulation/player";
import { mineOrPlace } from "./game/simulation/interactions";
import {
  drawDroppedItems,
  updateDroppedItems,
} from "./game/simulation/droppedItems";
import { drawHotbar, drawPauseMenu, drawSelectionHint } from "./game/ui/hud";
import {
  useCanvasMouseControls,
  useKeyboardControls,
} from "./hooks/useGameInput";
import useInventoryController from "./hooks/useInventoryController";
import {
  createPlayer,
  createStats,
  makeClouds,
  makeWorld,
  updateParticles,
} from "./game/world";

const createDefaultGameSettings = () => ({
  movementSpeed: 1,
  dayCycleSpeed: 1,
  rainEnabled: false,
  rainIntensity: 0.65,
  skyMode: "cycle",
});
const INITIAL_SKY_TIME = Math.PI / (2 * 0.018);

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
  const placedWallsRef = useRef(new Map());
  const anchoredLaddersRef = useRef(new Set());
  const droppedItemsRef = useRef([]);
  const particlesRef = useRef([]);
  const miningRef = useRef({
    targetKey: null,
    blockId: null,
    progress: 0,
    requiredTime: 0,
  });
  const cloudsRef = useRef(makeClouds());
  const rainRef = useRef(makeRainDrops());
  const playerRef = useRef(createPlayer());
  const cameraRef = useRef({ x: 0, y: 0 });
  const selectionHintRef = useRef({ text: "", color: "#86efac", until: 0 });
  const buildModeRef = useRef("foreground");
  const pausedRef = useRef(false);
  const settingsRef = useRef(createDefaultGameSettings());

  const [buildMode, setBuildMode] = useState("foreground");
  const [stats, setStats] = useState(createStats());
  const [isPaused, setIsPaused] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [gameSettings, setGameSettings] = useState(() =>
    createDefaultGameSettings(),
  );
  const [worldSeed, setWorldSeed] = useState(1);

  if (skyCoverageRef.current === null) {
    skyCoverageRef.current = createSkyCoverage(initialWorld.world);
  }

  useEffect(() => {
    buildModeRef.current = buildMode;
  }, [buildMode]);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

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

  const inventoryController = useInventoryController({
    mouseRef,
    setStats,
    showSelectionHint,
  });

  const {
    selected,
    selectedRef,
    blockHotbar,
    blockHotbarRef,
    inventory,
    inventoryRef,
    isInventoryOpen,
    inventoryOpenRef,
    craftingPanel,
    inventoryCraftingGrid,
    workbenchCraftingGrid,
    cursorStack,
    carriedPlaceableIndex,
    setCarriedPlaceableIndex,
    carriedPlaceableRef,
    publishInventory,
    resetInventoryController,
    closeInventoryPanel,
    openWorkbenchPanel,
    setInventoryOpenFromInput,
    returnCarriedItemToInventory,
    assignBlockToHotbar,
    clearHotbarSlot,
    swapHotbarSlots,
    selectBlock,
    chooseInventoryBlock,
    handleInventorySlotMouseDown,
    handleInventorySlotMouseEnter,
    handleHotbarSlotMouseDown,
    handleHotbarSlotMouseEnter,
    handleCraftingSlotMouseDown,
    handleCraftingSlotMouseEnter,
    handleCraftingOutputMouseDown,
    inventoryCraftingOutput,
    workbenchCraftingOutput,
  } = inventoryController;

  useEffect(() => {
    if (!isInventoryOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isInventoryOpen]);

  const handleCloseInventory = useCallback(() => {
    closeInventoryPanel();
  }, [closeInventoryPanel]);

  const handleOpenWorkbench = useCallback(() => {
    openWorkbenchPanel();
  }, [openWorkbenchPanel]);

  const setInventoryOpenForKeyboard = useCallback(
    (updater) => {
      setInventoryOpenFromInput(updater);
    },
    [setInventoryOpenFromInput],
  );

  const toggleBuildMode = () => {
    setBuildMode((current) => {
      const next = current === "foreground" ? "background" : "foreground";
      setStats((statsValue) => ({
        ...statsValue,
        message:
          next === "background"
            ? "Background mode: normal blocks place walls; ladders and torches keep special rules."
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
    placedWallsRef.current = new Map();
    anchoredLaddersRef.current = new Set();
    resetInventoryController();
    settingsRef.current = createDefaultGameSettings();
    particlesRef.current = [];
    droppedItemsRef.current = [];
    miningRef.current = {
      targetKey: null,
      blockId: null,
      progress: 0,
      requiredTime: 0,
    };
    cloudsRef.current = makeClouds();
    rainRef.current = makeRainDrops();
    playerRef.current = createPlayer();
    cameraRef.current = { x: 0, y: 0 };
    setBuildMode("foreground");
    setGameSettings(createDefaultGameSettings());
    setStats(createStats("New world generated."));
    setWorldSeed((value) => value + 1);
  };

  const fillHouseBackground = () => {
    const player = playerRef.current;
    const centerX = Math.floor((player.x + player.w / 2) / TILE);
    const centerY = Math.floor((player.y + player.h / 2) / TILE);
    const item = FOREGROUND_ITEMS[blockHotbarRef.current[selectedRef.current]];
    const inventoryItem = getInventoryItemForPlaceable(item);
    const itemId = getForegroundItemId(item);
    const wall = getBackgroundWallForBlock(item);
    const available = getItemCount(inventoryRef, itemId);
    let count = 0;

    if (!item) {
      setStats((current) => ({
        ...current,
        message: "Select a normal block before filling a background area.",
      }));
      return;
    }

    if (!wall) {
      setStats((current) => ({
        ...current,
        message: `${item.name} cannot fill a background wall area.`,
      }));
      return;
    }

    if (!itemId || available <= 0) {
      setStats((current) => ({
        ...current,
        message: `You do not have ${item.name}.`,
      }));
      return;
    }

    for (let y = centerY - 14; y <= centerY + 12; y++) {
      for (let x = centerX - 15; x <= centerX + 15; x++) {
        if (x < 0 || y < 0 || x >= WORLD_W || y >= WORLD_H) continue;
        if (count >= available) break;
        if (wallsRef.current[y][x] !== wall.id) {
          wallsRef.current[y][x] = wall.id;
          placedWallsRef.current.set(
            `${x},${y}`,
            inventoryItem?.foregroundBlockId ?? item.id,
          );
          count++;
        }
      }
    }

    if (count > 0) {
      removeItem(inventoryRef, itemId, count);
      publishInventory();
    }

    setStats((current) => ({
      ...current,
      wallsBuilt: current.wallsBuilt + count,
      message:
        count > 0
          ? `Filled a ${wall.name.toLowerCase()} background area using ${item.name}.`
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
    selectBlock,
    toggleBuildMode,
    fillHouseBackground,
    resetWorld,
    toggleFullscreen,
    setIsHelpOpen,
    setIsSettingsOpen,
    setIsInventoryOpen: setInventoryOpenForKeyboard,
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
    let skyTime = INITIAL_SKY_TIME;

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

      updateDroppedItems({
        droppedItemsRef,
        world,
        player: playerRef.current,
        inventoryRef,
        dt,
        onInventoryChange: publishInventory,
      });

      mineCooldown = mineOrPlace({
        dt,
        mineCooldown,
        mouseRef,
        cameraRef,
        playerRef,
        worldRef,
        wallsRef,
        laddersRef,
        buildModeRef,
        selectedRef,
        blockHotbarRef,
        miningRef,
        waterLevelsRef,
        waterSourcesRef,
        placedBlocksRef,
        placedWallsRef,
        anchoredLaddersRef,
        particlesRef,
        skyCoverageRef,
        inventoryRef,
        droppedItemsRef,
        onInventoryChange: publishInventory,
        setStats,
        stepWaterFlow,
        onOpenWorkbench: handleOpenWorkbench,
      });
    };

    const render = () => {
      const cam = cameraRef.current;
      const player = playerRef.current;
      const world = worldRef.current;
      const walls = wallsRef.current;
      const waterLevels = waterLevelsRef.current;
      const ladders = laddersRef.current;
      const skyCoverage = skyCoverageRef.current;
      const selectedHotbarItem =
        FOREGROUND_ITEMS[blockHotbarRef.current[selectedRef.current]];
      const heldItem =
        selectedHotbarItem?.wallId !== undefined
          ? WALL_BY_ID[selectedHotbarItem.wallId]
          : selectedHotbarItem;
      const heldItemType =
        selectedHotbarItem?.wallId !== undefined
          ? "wall"
          : heldItem?.kind === "tool"
            ? "tool"
            : "block";

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
            drawWall(
              ctx,
              wall,
              x * TILE - cam.x,
              y * TILE - cam.y,
              TILE,
              time,
              placedWallsRef.current.get(`${x},${y}`) ?? null,
            );
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
        } else {
          const mining = miningRef.current;
          const miningTargetKey = `${tx},${ty}`;
          const miningProgress =
            mining.targetKey === miningTargetKey && mining.requiredTime > 0
              ? Math.min(1, mining.progress / mining.requiredTime)
              : 0;

          if (miningProgress > 0) {
            const x = tx * TILE - cam.x;
            const y = ty * TILE - cam.y;
            ctx.fillStyle = `rgba(255,255,255,${0.08 + miningProgress * 0.16})`;
            ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
            ctx.strokeStyle = "rgba(15,23,42,.72)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(x + 6, y + 7);
            ctx.lineTo(x + 12 + miningProgress * 12, y + 13);
            ctx.moveTo(x + TILE - 7, y + 8);
            ctx.lineTo(x + TILE - 15 - miningProgress * 10, y + 20);
            ctx.moveTo(x + 10, y + TILE - 7);
            ctx.lineTo(x + 19 + miningProgress * 8, y + TILE - 18);
            ctx.stroke();
          }
        }
      }

      drawDroppedItems(ctx, droppedItemsRef.current, cam, time);

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
        heldItemType,
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
        inventory: inventoryRef.current,
      });
      drawSelectionHint(uiCtx, selectionHintRef.current);

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
  }, [handleOpenWorkbench, publishInventory, stepWaterFlow, worldSeed]);

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
          isHelpOpen={isHelpOpen && !isPaused}
          buildMode={buildMode}
          onToggleFullscreen={toggleFullscreen}
        >
          {isHelpOpen && !isPaused && <HelpOverlay />}
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
              {craftingPanel === "workbench" ? (
                <WorkbenchPanel
                  selected={selected}
                  blockHotbar={blockHotbar}
                  inventory={inventory}
                  craftingGrid={workbenchCraftingGrid}
                  craftingOutput={workbenchCraftingOutput}
                  cursorStack={cursorStack}
                  onSelectHotbarSlot={selectBlock}
                  onChooseInventoryBlock={chooseInventoryBlock}
                  onInventorySlotMouseDown={handleInventorySlotMouseDown}
                  onInventorySlotMouseEnter={handleInventorySlotMouseEnter}
                  onHotbarSlotMouseDown={handleHotbarSlotMouseDown}
                  onHotbarSlotMouseEnter={handleHotbarSlotMouseEnter}
                  onCraftingSlotMouseDown={handleCraftingSlotMouseDown}
                  onCraftingSlotMouseEnter={handleCraftingSlotMouseEnter}
                  onCraftingOutputMouseDown={handleCraftingOutputMouseDown}
                  onAssignInventoryBlock={assignBlockToHotbar}
                  onClearHotbarSlot={clearHotbarSlot}
                  onSwapHotbarSlots={swapHotbarSlots}
                  onReturnCarriedItemToInventory={returnCarriedItemToInventory}
                  carriedPlaceableIndex={carriedPlaceableIndex}
                  onClose={handleCloseInventory}
                />
              ) : (
                <InventoryPanel
                  selected={selected}
                  blockHotbar={blockHotbar}
                  inventory={inventory}
                  craftingGrid={inventoryCraftingGrid}
                  craftingOutput={inventoryCraftingOutput}
                  cursorStack={cursorStack}
                  onSelectHotbarSlot={selectBlock}
                  onChooseInventoryBlock={chooseInventoryBlock}
                  onInventorySlotMouseDown={handleInventorySlotMouseDown}
                  onInventorySlotMouseEnter={handleInventorySlotMouseEnter}
                  onHotbarSlotMouseDown={handleHotbarSlotMouseDown}
                  onHotbarSlotMouseEnter={handleHotbarSlotMouseEnter}
                  onCraftingSlotMouseDown={handleCraftingSlotMouseDown}
                  onCraftingSlotMouseEnter={handleCraftingSlotMouseEnter}
                  onCraftingOutputMouseDown={handleCraftingOutputMouseDown}
                  onAssignInventoryBlock={assignBlockToHotbar}
                  onClearHotbarSlot={clearHotbarSlot}
                  onSwapHotbarSlots={swapHotbarSlots}
                  onReturnCarriedItemToInventory={returnCarriedItemToInventory}
                  carriedPlaceableIndex={carriedPlaceableIndex}
                  onClose={handleCloseInventory}
                />
              )}
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
