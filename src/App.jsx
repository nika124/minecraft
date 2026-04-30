import { useCallback, useEffect, useRef, useState } from "react";
import ControlsPanel from "./components/ControlsPanel";
import GameHeader from "./components/GameHeader";
import GameStage from "./components/GameStage";
import HelpOverlay from "./components/HelpOverlay";
import InventoryPanel from "./components/InventoryPanel";
import SettingsOverlay from "./components/SettingsOverlay";
import WorkbenchPanel from "./components/WorkbenchPanel";
import { consumeCraftingIngredients, getCraftingOutput } from "./game/crafting";
import {
  MOUSE_BUTTON,
  clickInventoryCount,
  placeIntoCraftingSlot,
  placeIntoItemCountSlot,
} from "./game/slotInteractions";
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
import {
  addItem,
  createInventory,
  getItemCount,
  removeItem,
  STARTING_INVENTORY,
} from "./game/inventory";
import {
  getBackgroundWallForBlock,
  getForegroundIndexForItem,
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
import {
  createPlayer,
  createStats,
  makeClouds,
  makeWorld,
  updateParticles,
} from "./game/world";

import {
  HOTBAR_SLOT_COUNT,
  getHotbarSlotLabel,
} from "./game/ui/hotbarLayout";

const createDefaultBlockHotbar = () => Array(HOTBAR_SLOT_COUNT).fill(null);

const INVENTORY_CRAFTING_SIZE = 2;
const WORKBENCH_CRAFTING_SIZE = 3;

const createInventoryCraftingGrid = () =>
  Array(INVENTORY_CRAFTING_SIZE ** 2).fill(null);

const createWorkbenchCraftingGrid = () =>
  Array(WORKBENCH_CRAFTING_SIZE ** 2).fill(null);

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
  const inventoryRef = useRef(null);
  const inventoryCraftingGridRef = useRef(createInventoryCraftingGrid());
  const workbenchCraftingGridRef = useRef(createWorkbenchCraftingGrid());
  const cursorStackRef = useRef(null);
  const paintedSlotIdsRef = useRef(new Set());
  const isPaintingRef = useRef(false);
  const pickedUpDuringMouseDownRef = useRef(false);
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
  const selectedRef = useRef(0);
  const blockHotbarRef = useRef(createDefaultBlockHotbar());
  const selectionHintRef = useRef({ text: "", color: "#86efac", until: 0 });
  const buildModeRef = useRef("foreground");
  const pausedRef = useRef(false);
  const inventoryOpenRef = useRef(false);
  const craftingPanelRef = useRef("inventory");
  const carriedPlaceableRef = useRef(null);
  const carriedPlaceableSourceRef = useRef(null);
  const carriedPlaceableSourceSlotRef = useRef(null);
  const settingsRef = useRef(createDefaultGameSettings());

  const [selected, setSelected] = useState(0);
  const [blockHotbar, setBlockHotbar] = useState(() =>
    createDefaultBlockHotbar(),
  );
  const [inventory, setInventory] = useState(() => createInventory());
  const [buildMode, setBuildMode] = useState("foreground");
  const [stats, setStats] = useState(createStats());
  const [isPaused, setIsPaused] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [craftingPanel, setCraftingPanel] = useState("inventory");
  const [inventoryCraftingGrid, setInventoryCraftingGrid] = useState(() =>
    createInventoryCraftingGrid(),
  );
  const [workbenchCraftingGrid, setWorkbenchCraftingGrid] = useState(() =>
    createWorkbenchCraftingGrid(),
  );
  const [cursorStack, setCursorStack] = useState(null);
  const [carriedPlaceableIndex, setCarriedPlaceableIndex] = useState(null);
  const [gameSettings, setGameSettings] = useState(() =>
    createDefaultGameSettings(),
  );
  const [worldSeed, setWorldSeed] = useState(1);

  if (skyCoverageRef.current === null) {
    skyCoverageRef.current = createSkyCoverage(initialWorld.world);
  }

  if (inventoryRef.current === null) {
    inventoryRef.current = inventory;
  }

  const publishInventory = useCallback(() => {
    setInventory({ ...inventoryRef.current });
  }, []);

  const publishCraftingState = useCallback(() => {
    setInventoryCraftingGrid([...inventoryCraftingGridRef.current]);
    setWorkbenchCraftingGrid([...workbenchCraftingGridRef.current]);
    setCursorStack(
      cursorStackRef.current ? { ...cursorStackRef.current } : null,
    );
  }, []);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

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
    inventoryOpenRef.current = isInventoryOpen;
  }, [isInventoryOpen]);

  useEffect(() => {
    if (!isInventoryOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isInventoryOpen]);

  useEffect(() => {
    craftingPanelRef.current = craftingPanel;
  }, [craftingPanel]);

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

  const returnCarriedItemToInventory = useCallback(() => {
    if (cursorStackRef.current?.amount) {
      addItem(
        inventoryRef,
        cursorStackRef.current.itemId,
        cursorStackRef.current.amount,
      );
      cursorStackRef.current = null;
      carriedPlaceableSourceRef.current = null;
      carriedPlaceableSourceSlotRef.current = null;
      setCarriedPlaceableIndex(null);
      publishInventory();
      publishCraftingState();
      setStats((current) => ({
        ...current,
        message: "Returned held stack to inventory.",
      }));
      return;
    }

    const carriedIndex = carriedPlaceableRef.current;
    if (carriedIndex === null) return;
    const item = FOREGROUND_ITEMS[carriedIndex];

    if (
      carriedPlaceableSourceRef.current === "hotbar" &&
      carriedPlaceableSourceSlotRef.current !== null
    ) {
      const sourceSlot = carriedPlaceableSourceSlotRef.current;
      setBlockHotbar((current) =>
        current.map((value, index) => (index === sourceSlot ? null : value)),
      );
    }

    carriedPlaceableSourceRef.current = null;
    carriedPlaceableSourceSlotRef.current = null;
    setCarriedPlaceableIndex(null);
    if (item) {
      setStats((current) => ({
        ...current,
        message: `Returned ${item.name} to inventory assignment.`,
      }));
    }
  }, [publishCraftingState, publishInventory]);

  const placeOrSwapCarriedItemIntoHotbar = useCallback(
    (slotIndex, placeableIndex = carriedPlaceableRef.current) => {
      const item = FOREGROUND_ITEMS[placeableIndex];
      if (!item) return false;
      const itemId = getForegroundItemId(item);
      if (!itemId || getItemCount(inventoryRef, itemId) <= 0) {
        setStats((current) => ({
          ...current,
          message: `You do not have ${item.name}.`,
        }));
        return false;
      }

      const replacedIndex = blockHotbarRef.current[slotIndex] ?? null;
      const replacedItem = FOREGROUND_ITEMS[replacedIndex];
      setBlockHotbar((current) =>
        current.map((value, index) => {
          if (index === slotIndex) return placeableIndex;
          return value === placeableIndex && index !== slotIndex ? null : value;
        }),
      );
      setSelected(slotIndex);

      carriedPlaceableSourceRef.current = null;
      carriedPlaceableSourceSlotRef.current = null;
      if (replacedIndex !== null && replacedIndex !== placeableIndex) {
        setCarriedPlaceableIndex(replacedIndex);
      } else {
        setCarriedPlaceableIndex(null);
      }

      showSelectionHint(item, "foreground");
      setStats((current) => ({
        ...current,
        message:
          replacedItem && replacedIndex !== placeableIndex
            ? `Swapped ${item.name} into hotbar slot ${getHotbarSlotLabel(slotIndex)}. Carrying ${replacedItem.name}.`
            : `Assigned ${item.name} to hotbar slot ${getHotbarSlotLabel(slotIndex)}.`,
      }));
      return true;
    },
    [showSelectionHint],
  );

  const assignBlockToHotbar = useCallback(
    (placeableIndex, slotIndex) => {
      const item = FOREGROUND_ITEMS[placeableIndex];
      const itemId = getForegroundItemId(item);
      if (cursorStackRef.current?.itemId === itemId) {
        addItem(inventoryRef, itemId, cursorStackRef.current.amount);
        cursorStackRef.current = null;
        publishInventory();
        publishCraftingState();
      }
      return placeOrSwapCarriedItemIntoHotbar(slotIndex, placeableIndex);
    },
    [placeOrSwapCarriedItemIntoHotbar, publishCraftingState, publishInventory],
  );

  const clearHotbarSlot = useCallback((slotIndex) => {
    const item = FOREGROUND_ITEMS[blockHotbarRef.current[slotIndex]];
    setBlockHotbar((current) =>
      current.map((value, index) => (index === slotIndex ? null : value)),
    );
    carriedPlaceableSourceRef.current = null;
    carriedPlaceableSourceSlotRef.current = null;
    setCarriedPlaceableIndex(null);
    if (item) {
      setStats((current) => ({
        ...current,
        message: `Removed ${item.name} from hotbar slot ${getHotbarSlotLabel(slotIndex)}.`,
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
    carriedPlaceableSourceRef.current = null;
    carriedPlaceableSourceSlotRef.current = null;
    setCarriedPlaceableIndex(null);
    setStats((current) => ({
      ...current,
      message: `Swapped hotbar slots ${getHotbarSlotLabel(fromSlot)} and ${getHotbarSlotLabel(toSlot)}.`,
    }));
  }, []);

  const selectBlock = useCallback(
    (slotIndex) => {
      const carriedIndex = carriedPlaceableRef.current;
      const cursor = cursorStackRef.current;
      if (cursor?.amount) {
        const foregroundIndex = getForegroundIndexForItem(cursor.itemId);
        if (foregroundIndex === null) {
          setStats((current) => ({
            ...current,
            message: "That item cannot be assigned to the hotbar.",
          }));
          return;
        }

        addItem(inventoryRef, cursor.itemId, cursor.amount);
        cursorStackRef.current = null;
        isPaintingRef.current = true;
        pickedUpDuringMouseDownRef.current = false;
        paintedSlotIdsRef.current.add(`hotbar:${slotIndex}`);
        publishInventory();
        publishCraftingState();
        placeOrSwapCarriedItemIntoHotbar(slotIndex, foregroundIndex);
        return;
      }

      if (carriedIndex !== null) {
        placeOrSwapCarriedItemIntoHotbar(slotIndex, carriedIndex);
        return;
      }

      const item = FOREGROUND_ITEMS[blockHotbarRef.current[slotIndex]];
      setSelected(slotIndex);
      if (item) showSelectionHint(item, buildModeRef.current);
    },
    [
      placeOrSwapCarriedItemIntoHotbar,
      publishCraftingState,
      publishInventory,
      showSelectionHint,
    ],
  );

  const chooseInventoryBlock = useCallback(
    (placeableIndex) => {
      const item = FOREGROUND_ITEMS[placeableIndex];
      if (!item) return;
      const itemId = getForegroundItemId(item);
      const cursorAmount =
        cursorStackRef.current?.itemId === itemId
          ? cursorStackRef.current.amount
          : 0;
      if (!itemId || getItemCount(inventoryRef, itemId) + cursorAmount <= 0) {
        setStats((current) => ({
          ...current,
          message: `You do not have ${item.name}.`,
        }));
        return;
      }

      carriedPlaceableSourceRef.current = "inventory";
      carriedPlaceableSourceSlotRef.current = null;
      setCarriedPlaceableIndex(placeableIndex);
      showSelectionHint(item, "foreground");
      setStats((current) => ({
        ...current,
        message: `Picked ${item.name} for hotbar assignment.`,
      }));
    },
    [showSelectionHint],
  );

  const returnCraftingStacksToInventory = useCallback(() => {
    for (const slot of inventoryCraftingGridRef.current) {
      if (slot?.amount) addItem(inventoryRef, slot.itemId, slot.amount);
    }
    for (const slot of workbenchCraftingGridRef.current) {
      if (slot?.amount) addItem(inventoryRef, slot.itemId, slot.amount);
    }
    if (cursorStackRef.current?.amount) {
      addItem(
        inventoryRef,
        cursorStackRef.current.itemId,
        cursorStackRef.current.amount,
      );
    }

    inventoryCraftingGridRef.current = createInventoryCraftingGrid();
    workbenchCraftingGridRef.current = createWorkbenchCraftingGrid();
    cursorStackRef.current = null;
    publishInventory();
    publishCraftingState();
  }, [publishCraftingState, publishInventory]);

  const setInventoryOpenFromInput = useCallback(
    (updater) => {
      setIsInventoryOpen((current) => {
        const next = typeof updater === "function" ? updater(current) : updater;
        if (next) {
          craftingPanelRef.current = "inventory";
          setCraftingPanel("inventory");
          return true;
        }

        returnCraftingStacksToInventory();
        setCarriedPlaceableIndex(null);
        return false;
      });
    },
    [returnCraftingStacksToInventory],
  );

  const closeInventoryPanel = useCallback(() => {
    returnCraftingStacksToInventory();
    setIsInventoryOpen(false);
    setCarriedPlaceableIndex(null);
  }, [returnCraftingStacksToInventory]);

  const openWorkbenchPanel = useCallback(() => {
    craftingPanelRef.current = "workbench";
    setCraftingPanel("workbench");
    setIsInventoryOpen(true);
    setCarriedPlaceableIndex(null);
    mouseRef.current.down = false;
  }, []);

  const handleInventorySlotMouseDown = useCallback(
    (itemId, button, ctrlKey = false, isMouseDownEvent = true) => {
      const count = getItemCount(inventoryRef, itemId);
      const hasCursor = Boolean(cursorStackRef.current?.amount);
      const next =
        hasCursor &&
        (button === MOUSE_BUTTON.LEFT || button === MOUSE_BUTTON.RIGHT)
          ? placeIntoItemCountSlot(itemId, count, cursorStackRef.current, {
              placeFull: ctrlKey,
            })
          : clickInventoryCount(itemId, count, cursorStackRef.current, button);

      const nextAmount = next.inventoryAmount ?? next.amount;
      if (nextAmount > count) {
        addItem(inventoryRef, itemId, nextAmount - count);
      } else if (nextAmount < count) {
        removeItem(inventoryRef, itemId, count - nextAmount);
      }

      if (next.displacedStack) {
        addItem(
          inventoryRef,
          next.displacedStack.itemId,
          next.displacedStack.amount,
        );
      }

      if (hasCursor) {
        isPaintingRef.current = true;
        paintedSlotIdsRef.current.add(`inventory:${itemId}`);
      } else if (isMouseDownEvent && next.cursor?.amount) {
        pickedUpDuringMouseDownRef.current = true;
        paintedSlotIdsRef.current.add(`inventory:${itemId}`);
      }

      cursorStackRef.current = next.cursor;
      publishInventory();
      publishCraftingState();
      setCarriedPlaceableIndex(null);
    },
    [publishCraftingState, publishInventory],
  );

  const handleInventorySlotMouseEnter = useCallback(
    (itemId, buttons, ctrlKey = false) => {
      if (!cursorStackRef.current?.amount || (buttons & 1) !== 1) return;
      const slotId = `inventory:${itemId}`;
      if (paintedSlotIdsRef.current.has(slotId)) return;
      paintedSlotIdsRef.current.add(slotId);

      const count = getItemCount(inventoryRef, itemId);
      const beforeCursorAmount = cursorStackRef.current.amount;
      const next = placeIntoItemCountSlot(
        itemId,
        count,
        cursorStackRef.current,
        {
          placeFull: ctrlKey || pickedUpDuringMouseDownRef.current,
        },
      );

      if (next.amount > count) {
        addItem(inventoryRef, itemId, next.amount - count);
      } else if (next.amount < count) {
        removeItem(inventoryRef, itemId, count - next.amount);
      }

      cursorStackRef.current = next.cursor;
      if ((next.cursor?.amount ?? 0) !== beforeCursorAmount) {
        pickedUpDuringMouseDownRef.current = false;
      }
      isPaintingRef.current = true;
      publishInventory();
      publishCraftingState();
      setCarriedPlaceableIndex(null);
    },
    [publishCraftingState, publishInventory],
  );

  const handleHotbarSlotMouseDown = useCallback(
    (slotIndex, button, ctrlKey = false) => {
      void ctrlKey;
      const cursor = cursorStackRef.current;
      if (cursor?.amount) {
        const foregroundIndex = getForegroundIndexForItem(cursor.itemId);
        if (foregroundIndex === null) {
          setStats((current) => ({
            ...current,
            message: "That item cannot be assigned to the hotbar.",
          }));
          return;
        }

        addItem(inventoryRef, cursor.itemId, cursor.amount);
        cursorStackRef.current = null;
        isPaintingRef.current = true;
        pickedUpDuringMouseDownRef.current = false;
        paintedSlotIdsRef.current.add(`hotbar:${slotIndex}`);
        publishInventory();
        publishCraftingState();
        assignBlockToHotbar(foregroundIndex, slotIndex);
        return;
      }

      const item = FOREGROUND_ITEMS[blockHotbarRef.current[slotIndex]];
      const itemId = getForegroundItemId(item);
      if (button === MOUSE_BUTTON.LEFT || !itemId) {
        selectBlock(slotIndex);
        return;
      }

      handleInventorySlotMouseDown(itemId, button);
    },
    [
      assignBlockToHotbar,
      handleInventorySlotMouseDown,
      publishCraftingState,
      publishInventory,
      selectBlock,
    ],
  );

  const handleHotbarSlotMouseEnter = useCallback(
    (slotIndex, buttons, ctrlKey = false) => {
      if (!cursorStackRef.current?.amount || (buttons & 1) !== 1) return;
      const slotId = `hotbar:${slotIndex}`;
      if (paintedSlotIdsRef.current.has(slotId)) return;
      paintedSlotIdsRef.current.add(slotId);
      handleHotbarSlotMouseDown(slotIndex, MOUSE_BUTTON.LEFT, ctrlKey);
    },
    [handleHotbarSlotMouseDown],
  );

  const activeCraftingGrid = useCallback(() => {
    if (craftingPanelRef.current === "workbench") {
      return {
        gridRef: workbenchCraftingGridRef,
        width: 3,
        height: 3,
        station: "workbench",
      };
    }

    return {
      gridRef: inventoryCraftingGridRef,
      width: 2,
      height: 2,
      station: null,
    };
  }, []);

  const handleCraftingSlotMouseDown = useCallback(
    (slotIndex, button, ctrlKey = false) => {
      const { gridRef } = activeCraftingGrid();
      const grid = [...gridRef.current];
      const hasCursor = Boolean(cursorStackRef.current?.amount);
      const next = placeIntoCraftingSlot(
        grid[slotIndex],
        cursorStackRef.current,
        { button, placeFull: ctrlKey },
      );

      grid[slotIndex] = next.slot;
      cursorStackRef.current = next.cursor;
      gridRef.current = grid;
      if (hasCursor) {
        isPaintingRef.current = true;
        paintedSlotIdsRef.current.add(
          `${craftingPanelRef.current}:crafting:${slotIndex}`,
        );
      } else if (next.cursor?.amount) {
        pickedUpDuringMouseDownRef.current = true;
        paintedSlotIdsRef.current.add(
          `${craftingPanelRef.current}:crafting:${slotIndex}`,
        );
      }
      publishCraftingState();
    },
    [activeCraftingGrid, publishCraftingState],
  );

  const handleCraftingSlotMouseEnter = useCallback(
    (slotIndex, buttons, ctrlKey = false) => {
      if (!cursorStackRef.current?.amount || (buttons & 1) !== 1) return;
      const slotId = `${craftingPanelRef.current}:crafting:${slotIndex}`;
      if (paintedSlotIdsRef.current.has(slotId)) return;
      paintedSlotIdsRef.current.add(slotId);

      const { gridRef } = activeCraftingGrid();
      const grid = [...gridRef.current];
      const beforeCursorAmount = cursorStackRef.current.amount;
      const next = placeIntoCraftingSlot(
        grid[slotIndex],
        cursorStackRef.current,
        {
          button: MOUSE_BUTTON.LEFT,
          placeFull: ctrlKey || pickedUpDuringMouseDownRef.current,
        },
      );

      grid[slotIndex] = next.slot;
      cursorStackRef.current = next.cursor;
      gridRef.current = grid;
      if ((next.cursor?.amount ?? 0) !== beforeCursorAmount) {
        pickedUpDuringMouseDownRef.current = false;
      }
      isPaintingRef.current = true;
      publishCraftingState();
    },
    [activeCraftingGrid, publishCraftingState],
  );

  useEffect(() => {
    const stopPainting = () => {
      isPaintingRef.current = false;
      paintedSlotIdsRef.current = new Set();
      pickedUpDuringMouseDownRef.current = false;
    };

    window.addEventListener("mouseup", stopPainting);
    return () => window.removeEventListener("mouseup", stopPainting);
  }, []);

  const handleCraftingOutputMouseDown = useCallback(
    (button) => {
      if (button !== MOUSE_BUTTON.LEFT) return;

      const { gridRef, width, height, station } = activeCraftingGrid();
      const output = getCraftingOutput(gridRef.current, width, height, station);
      if (!output) return;

      const cursor = cursorStackRef.current;
      if (cursor?.amount && cursor.itemId !== output.itemId) {
        setStats((current) => ({
          ...current,
          message: "Put down the held stack before taking this result.",
        }));
        return;
      }

      cursorStackRef.current = {
        itemId: output.itemId,
        amount: (cursor?.amount ?? 0) + output.amount,
      };
      gridRef.current = consumeCraftingIngredients(
        gridRef.current,
        output.recipe,
      );
      publishCraftingState();
      setStats((current) => ({
        ...current,
        message: `Crafted ${output.amount} ${output.recipe.name}.`,
      }));
    },
    [activeCraftingGrid, publishCraftingState],
  );

    const inventoryCraftingOutput = getCraftingOutput(
    inventoryCraftingGrid,
    INVENTORY_CRAFTING_SIZE,
    INVENTORY_CRAFTING_SIZE,
    null,
  );

    const workbenchCraftingOutput = getCraftingOutput(
    workbenchCraftingGrid,
    WORKBENCH_CRAFTING_SIZE,
    WORKBENCH_CRAFTING_SIZE,
    "workbench",
  );
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
    inventoryRef.current = createInventory(STARTING_INVENTORY);
    blockHotbarRef.current = createDefaultBlockHotbar();
    inventoryCraftingGridRef.current = createInventoryCraftingGrid();
    workbenchCraftingGridRef.current = createWorkbenchCraftingGrid();
    cursorStackRef.current = null;
    settingsRef.current = createDefaultGameSettings();
    publishInventory();
    publishCraftingState();
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
    setBlockHotbar(createDefaultBlockHotbar());
    setSelected(0);
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
