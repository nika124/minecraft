import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BLOCK_BY_ID,
  FOREGROUND_ITEMS,
  WALL_BY_ID,
} from "../game/constants";
import { getItemCount } from "../game/inventory";
import {
  ITEM_LIST,
  ITEMS,
  getForegroundIndexForItem,
  getForegroundItemId,
  getBackgroundWallForBlock,
  getInventoryCategory,
} from "../game/items";
import {
  getBlockTexture,
  getItemTexture,
  getWallTexture,
} from "../game/textures";
import CraftingGrid from "./CraftingGrid";

void CraftingGrid;

function renderTextureSwatch(item, type) {
  const texture =
    type === "wall"
      ? getWallTexture(item)
      : item.kind === "tool"
        ? getItemTexture(item)
        : item.wallId !== undefined
          ? getWallTexture(WALL_BY_ID[item.wallId])
        : getBlockTexture(item);
  return (
    <span
      className="swatch texture-swatch"
      style={{ backgroundImage: `url(${texture.toDataURL()})` }}
      aria-hidden="true"
    />
  );
}

function renderInventorySwatch(item) {
  if (item.blockId !== undefined) {
    return renderTextureSwatch(BLOCK_BY_ID[item.blockId], "block");
  }

  if (item.wallId !== undefined) {
    return renderTextureSwatch(WALL_BY_ID[item.wallId], "wall");
  }

  if (item.category === "Tools") {
    const tool = FOREGROUND_ITEMS.find((foregroundItem) => foregroundItem.id === item.id);
    if (tool) return renderTextureSwatch(tool, "block");
  }

  return (
    <span
      className="swatch texture-swatch inventory-color-swatch"
      style={{ backgroundColor: item.color ?? "#8b8b8b" }}
      aria-hidden="true"
    >
      {item.name.slice(0, 2)}
    </span>
  );
}

export default function InventoryPanel({
  selected,
  blockHotbar,
  inventory,
  craftingTitle = "Crafting",
  craftingSize = 2,
  craftingGrid,
  craftingOutput,
  cursorStack,
  onSelectHotbarSlot,
  onChooseInventoryBlock,
  onInventorySlotMouseDown,
  onInventorySlotMouseEnter,
  onHotbarSlotMouseDown,
  onHotbarSlotMouseEnter,
  onCraftingSlotMouseDown,
  onCraftingSlotMouseEnter,
  onCraftingOutputMouseDown,
  onAssignInventoryBlock,
  onClearHotbarSlot,
  onSwapHotbarSlots,
  onReturnCarriedItemToInventory,
  carriedPlaceableIndex,
  panelTitle = "Inventory",
  panelSubtitle = "Pick a stack for crafting, or drag placeable items into the hotbar.",
  onClose,
}) {
  const [overlayRoot, setOverlayRoot] = useState(null);
  const [hasPointerPosition, setHasPointerPosition] = useState(false);
  const carriedStackRef = useRef(null);
  const pointerPositionRef = useRef(null);
  const hasPointerPositionRef = useRef(false);
  const cursorAnimationFrameRef = useRef(0);
  const carriedItem =
    carriedPlaceableIndex === null
      ? null
      : FOREGROUND_ITEMS[carriedPlaceableIndex];

  const setDragData = (event, value) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", value);
  };

  const readDragData = (event) => event.dataTransfer.getData("text/plain");

  const handleInventoryDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const [type, value] = readDragData(event).split(":");
    if (type === "hotbar") onClearHotbarSlot(Number(value));
    if (type === "inventory") onReturnCarriedItemToInventory?.();
  };

  const handleInventoryListMouseDown = (event) => {
    if (
      event.button !== 0 ||
      (carriedPlaceableIndex === null && !cursorStack?.amount)
    ) {
      return;
    }
    if (event.target.closest("button")) return;
    event.preventDefault();
    onReturnCarriedItemToInventory?.();
  };

  const handleHotbarDrop = (event, slotIndex) => {
    event.preventDefault();
    const [type, value] = readDragData(event).split(":");
    if (type === "inventory") onAssignInventoryBlock(Number(value), slotIndex);
    if (type === "hotbar") onSwapHotbarSlots(Number(value), slotIndex);
  };

  const applyCarriedStackPosition = useCallback(() => {
    cursorAnimationFrameRef.current = 0;
    const carriedStack = carriedStackRef.current;
    const pointerPosition = pointerPositionRef.current;
    if (!carriedStack || !pointerPosition) return;

    const { x, y } = pointerPosition;
    carriedStack.style.transform = `translate3d(${x + 10}px, ${y + 10}px, 0)`;
  }, []);

  const scheduleCarriedStackPosition = useCallback(() => {
    if (cursorAnimationFrameRef.current) return;
    cursorAnimationFrameRef.current = window.requestAnimationFrame(
      applyCarriedStackPosition,
    );
  }, [applyCarriedStackPosition]);

  const moveCursorToEvent = (event) => {
    if (
      typeof event.clientX !== "number" ||
      typeof event.clientY !== "number"
    ) {
      return;
    }

    pointerPositionRef.current = { x: event.clientX, y: event.clientY };
    if (!hasPointerPositionRef.current) {
      hasPointerPositionRef.current = true;
      setHasPointerPosition(true);
    }
    scheduleCarriedStackPosition();
  };

  const handleMouseMove = moveCursorToEvent;
  const handlePointerMove = moveCursorToEvent;
  const updateCursorPosition = moveCursorToEvent;

  useEffect(() => {
    const handleWindowPointerMove = (event) => {
      pointerPositionRef.current = { x: event.clientX, y: event.clientY };
      if (!hasPointerPositionRef.current) {
        hasPointerPositionRef.current = true;
        setHasPointerPosition(true);
      }
      scheduleCarriedStackPosition();
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("mousemove", handleWindowPointerMove);
    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("mousemove", handleWindowPointerMove);
      if (cursorAnimationFrameRef.current) {
        window.cancelAnimationFrame(cursorAnimationFrameRef.current);
      }
    };
  }, [scheduleCarriedStackPosition]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const updateOverlayRoot = () => {
      setOverlayRoot(document.fullscreenElement ?? document.body);
    };

    updateOverlayRoot();
    document.addEventListener("fullscreenchange", updateOverlayRoot);
    return () =>
      document.removeEventListener("fullscreenchange", updateOverlayRoot);
  }, []);

  const overlayTarget =
    overlayRoot ??
    (typeof document !== "undefined"
      ? document.fullscreenElement ?? document.body
      : null);

  useLayoutEffect(() => {
    applyCarriedStackPosition();
  }, [
    applyCarriedStackPosition,
    cursorStack,
    hasPointerPosition,
    overlayTarget,
  ]);

  const carriedOverlay =
    cursorStack && overlayTarget && hasPointerPosition
      ? createPortal(
          <div
            ref={carriedStackRef}
            className="carried-stack"
            aria-hidden="true"
          >
            {renderInventorySwatch(ITEMS[cursorStack.itemId])}
            <span className="item-count">{cursorStack.amount}</span>
          </div>,
          overlayTarget,
        )
      : null;
  const categoryOrder = ["Blocks", "Tools", "Utility", "Materials"];
  const inventoryGroups = categoryOrder
    .map((category) => ({
      category,
      items: ITEM_LIST.filter((item) => getInventoryCategory(item) === category),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div
      className={`panel inventory-panel ${onClose ? "is-overlay" : ""}`}
      onMouseMove={handleMouseMove}
      onPointerMove={handlePointerMove}
      onMouseDown={updateCursorPosition}
      onPointerDown={updateCursorPosition}
      onClick={updateCursorPosition}
    >
      {onClose && (
        <div className="inventory-title-row">
          <div>
            <span>{panelTitle}</span>
            <small>
              {cursorStack
                ? `Holding ${ITEMS[cursorStack.itemId]?.name ?? cursorStack.itemId} x${cursorStack.amount}.`
                : carriedItem
                  ? `Assigning ${carriedItem.name}: click a hotbar slot or press 1-0.`
                  : panelSubtitle}
            </small>
          </div>
          <button onClick={onClose} className="inventory-close" aria-label="Close inventory">
            Close
          </button>
        </div>
      )}

      <div className="inventory-workspace">
        <div
          className="inventory-main"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleInventoryDrop}
          onMouseDown={handleInventoryListMouseDown}
        >
          {inventoryGroups.map((group) => (
            <div key={group.category}>
              <div className="inventory-section-heading">
                <span>{group.category}</span>
                <small>
                  {group.category === "Blocks"
                    ? "Build mode chooses foreground or background when the item supports both."
                    : group.category === "Tools"
                      ? "Tools mine faster and do not place blocks."
                      : group.category === "Utility"
                        ? "Special placeables keep their own support rules."
                        : "Crafting ingredients and drops."}
                </small>
              </div>
              <div
                className="palette-grid inventory-items-grid"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleInventoryDrop}
              >
                {group.items.map((item) => {
              const count = getItemCount(inventory, item.id);
              const foregroundIndex = getForegroundIndexForItem(item.id);
              const isAssignable = foregroundIndex !== null;
              const equippedSlot = isAssignable
                ? blockHotbar.indexOf(foregroundIndex)
                : -1;
              const isCarried = carriedPlaceableIndex === foregroundIndex;
              const backgroundWall = getBackgroundWallForBlock(item);
              return (
                <button
                  type="button"
                  key={item.id}
                  draggable={isAssignable && count > 0}
                  disabled={count <= 0 && !cursorStack}
                  onMouseDown={(event) => {
                    updateCursorPosition(event);
                    event.preventDefault();
                    onInventorySlotMouseDown(
                      item.id,
                      event.button,
                      event.ctrlKey,
                    );
                  }}
                  onMouseEnter={(event) =>
                    onInventorySlotMouseEnter?.(
                      item.id,
                      event.buttons,
                      event.ctrlKey,
                    )
                  }
                  onContextMenu={(event) => event.preventDefault()}
                  onClick={(event) => event.preventDefault()}
                  onDragStart={(event) => {
                    if (!isAssignable || count <= 0) return;
                    onChooseInventoryBlock(foregroundIndex);
                    setDragData(event, `inventory:${foregroundIndex}`);
                  }}
                  className={`palette-item ${isCarried ? "is-carried" : ""} ${count <= 0 ? "is-empty-count" : ""}`}
                >
                  {renderInventorySwatch(item)}
                  <span className="item-count">{count}</span>
                  <span className="palette-copy">
                    <span>{item.name}</span>
                    <small>
                      {equippedSlot !== -1
                        ? `Equipped in ${equippedSlot === 9 ? "0" : equippedSlot + 1}`
                        : backgroundWall
                          ? `Foreground + background`
                          : item.id === "ladder"
                            ? "Background ladder"
                            : item.category === "Tools"
                              ? "Mining tool"
                              : item.id === "torch"
                                ? "Light source"
                                : item.id === "water"
                                  ? "Flowing liquid"
                                  : isAssignable
                                    ? "Can equip"
                                    : "Crafting item"}
                    </small>
                  </span>
                </button>
              );
            })}
              </div>
            </div>
          ))}
        </div>

        <CraftingGrid
          title={craftingTitle}
          size={craftingSize}
          slots={craftingGrid}
          output={craftingOutput}
          renderItem={renderInventorySwatch}
          onSlotMouseDown={onCraftingSlotMouseDown}
          onSlotMouseEnter={onCraftingSlotMouseEnter}
          onOutputMouseDown={onCraftingOutputMouseDown}
        />
      </div>

      <div className="inventory-section-heading hotbar-heading">
        <span>Hotbar</span>
        <small>
          {cursorStack
            ? "Click a hotbar slot to assign the carried placeable item."
            : carriedItem
              ? "Click a slot or press 1-0 to assign the selected item."
              : "Drag a hotbar item upward to clear it."}
        </small>
      </div>
      <div className="hotbar-editor">
        {blockHotbar.map((foregroundItemIndex, slotIndex) => {
          const item = FOREGROUND_ITEMS[foregroundItemIndex];
          const itemId = getForegroundItemId(item);
          const count = itemId ? getItemCount(inventory, itemId) : 0;
          return (
            <button
              type="button"
              key={`${slotIndex}-${item?.id ?? "empty"}`}
              draggable={Boolean(item)}
              onMouseDown={(event) => {
                updateCursorPosition(event);
                if (cursorStack) {
                  event.preventDefault();
                  onHotbarSlotMouseDown(slotIndex, event.button, event.ctrlKey);
                }
              }}
              onMouseEnter={(event) =>
                onHotbarSlotMouseEnter?.(
                  slotIndex,
                  event.buttons,
                  event.ctrlKey,
                )
              }
              onClick={() => {
                if (cursorStack) return;
                else onSelectHotbarSlot(slotIndex);
              }}
              onDragStart={(event) => {
                if (!item) return;
                setDragData(event, `hotbar:${slotIndex}`);
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => handleHotbarDrop(event, slotIndex)}
              className={`hotbar-editor-slot ${selected === slotIndex ? "is-selected" : ""} ${!item ? "is-empty" : ""}`}
            >
              <span className="slot-key">{slotIndex === 9 ? "0" : slotIndex + 1}</span>
              {item ? renderTextureSwatch(item, "block") : <span className="empty-slot" />}
              {item ? <span className="item-count hotbar-count">{count}</span> : null}
              <span>{item?.name ?? "Empty"}</span>
            </button>
          );
        })}
      </div>

      {carriedOverlay}
    </div>
  );
}
