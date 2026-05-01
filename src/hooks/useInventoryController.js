import { useCallback, useEffect, useRef, useState } from "react";
import { consumeCraftingIngredients, getCraftingOutput } from "../game/crafting";
import { FOREGROUND_ITEMS } from "../game/constants";
import {
  addItem,
  createInventory,
  getItemCount,
  removeItem,
} from "../game/inventory";
import {
  getForegroundIndexForItem,
  getForegroundItemId,
} from "../game/items";
import {
  MOUSE_BUTTON,
  clickInventoryCount,
  placeIntoCraftingSlot,
  placeIntoItemCountSlot,
} from "../game/slotInteractions";

export const createDefaultBlockHotbar = () => Array(10).fill(null);
export const createInventoryCraftingGrid = () => Array(4).fill(null);
export const createWorkbenchCraftingGrid = () => Array(9).fill(null);

export default function useInventoryController({
  mouseRef,
  setStats,
  showSelectionHint,
} = {}) {
  const inventoryRef = useRef(null);
  const inventoryCraftingGridRef = useRef(createInventoryCraftingGrid());
  const workbenchCraftingGridRef = useRef(createWorkbenchCraftingGrid());
  const cursorStackRef = useRef(null);
  const paintedSlotIdsRef = useRef(new Set());
  const isPaintingRef = useRef(false);
  const pickedUpDuringMouseDownRef = useRef(false);
  const selectedRef = useRef(0);
  const blockHotbarRef = useRef(createDefaultBlockHotbar());
  const inventoryOpenRef = useRef(false);
  const craftingPanelRef = useRef("inventory");
  const carriedPlaceableRef = useRef(null);
  const carriedPlaceableSourceRef = useRef(null);
  const carriedPlaceableSourceSlotRef = useRef(null);

  const [selected, setSelected] = useState(0);
  const [blockHotbar, setBlockHotbar] = useState(() =>
    createDefaultBlockHotbar(),
  );
  const [inventory, setInventory] = useState(() => createInventory());
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

  if (inventoryRef.current === null) {
    inventoryRef.current = inventory;
  }

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    blockHotbarRef.current = blockHotbar;
  }, [blockHotbar]);

  useEffect(() => {
    inventoryOpenRef.current = isInventoryOpen;
  }, [isInventoryOpen]);

  useEffect(() => {
    craftingPanelRef.current = craftingPanel;
  }, [craftingPanel]);

  useEffect(() => {
    carriedPlaceableRef.current = carriedPlaceableIndex;
  }, [carriedPlaceableIndex]);

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
    if (mouseRef?.current) mouseRef.current.down = false;
  }, [mouseRef]);

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
  }, [publishCraftingState, publishInventory, setStats]);

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
            ? `Swapped ${item.name} into hotbar slot ${slotIndex === 9 ? "0" : slotIndex + 1}. Carrying ${replacedItem.name}.`
            : `Assigned ${item.name} to hotbar slot ${slotIndex === 9 ? "0" : slotIndex + 1}.`,
      }));
      return true;
    },
    [setStats, showSelectionHint],
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

  const clearHotbarSlot = useCallback(
    (slotIndex) => {
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
          message: `Removed ${item.name} from hotbar slot ${slotIndex === 9 ? "0" : slotIndex + 1}.`,
        }));
      }
    },
    [setStats],
  );

  const swapHotbarSlots = useCallback(
    (fromSlot, toSlot) => {
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
        message: `Swapped hotbar slots ${fromSlot === 9 ? "0" : fromSlot + 1} and ${toSlot === 9 ? "0" : toSlot + 1}.`,
      }));
    },
    [setStats],
  );

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
      if (item) showSelectionHint(item);
    },
    [
      placeOrSwapCarriedItemIntoHotbar,
      publishCraftingState,
      publishInventory,
      setStats,
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
    [setStats, showSelectionHint],
  );

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
      setStats,
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
    [activeCraftingGrid, publishCraftingState, setStats],
  );

  const inventoryCraftingOutput = getCraftingOutput(
    inventoryCraftingGrid,
    2,
    2,
    null,
  );
  const workbenchCraftingOutput = getCraftingOutput(
    workbenchCraftingGrid,
    3,
    3,
    "workbench",
  );

  return {
    selected,
    setSelected,
    blockHotbar,
    setBlockHotbar,
    inventory,
    setInventory,
    isInventoryOpen,
    setIsInventoryOpen,
    craftingPanel,
    setCraftingPanel,
    inventoryCraftingGrid,
    setInventoryCraftingGrid,
    workbenchCraftingGrid,
    setWorkbenchCraftingGrid,
    cursorStack,
    setCursorStack,
    carriedPlaceableIndex,
    setCarriedPlaceableIndex,
    selectedRef,
    blockHotbarRef,
    inventoryRef,
    inventoryOpenRef,
    craftingPanelRef,
    inventoryCraftingGridRef,
    workbenchCraftingGridRef,
    cursorStackRef,
    carriedPlaceableRef,
    paintedSlotIdsRef,
    isPaintingRef,
    pickedUpDuringMouseDownRef,
    carriedPlaceableSourceRef,
    carriedPlaceableSourceSlotRef,
    publishInventory,
    publishCraftingState,
    returnCraftingStacksToInventory,
    setInventoryOpenFromInput,
    closeInventoryPanel,
    openWorkbenchPanel,
    returnCarriedItemToInventory,
    placeOrSwapCarriedItemIntoHotbar,
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
    createDefaultBlockHotbar,
    createInventoryCraftingGrid,
    createWorkbenchCraftingGrid,
  };
}
