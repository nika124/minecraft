import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  BLOCK_BY_ID,
  FOREGROUND_ITEMS,
  WALL_BY_ID,
  WALL_PLACEABLE,
} from "../game/constants";
import { getItemCount } from "../game/inventory";
import {
  ITEM_LIST,
  ITEMS,
  getForegroundIndexForItem,
  getForegroundItemId,
  getWallItemId,
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

  if (item.category === "tool") {
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
  buildMode,
  selected,
  selectedWall,
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
  onHotbarSlotMouseDown,
  onCraftingSlotMouseDown,
  onCraftingOutputMouseDown,
  onAssignInventoryBlock,
  onClearHotbarSlot,
  onSwapHotbarSlots,
  onSelectWall,
  onSetForegroundMode,
  onSetBackgroundMode,
  carriedPlaceableIndex,
  panelTitle = "Inventory",
  panelSubtitle = "Pick a stack for crafting, or drag placeable items into the hotbar.",
  onClose,
}) {
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
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
    const [type, value] = readDragData(event).split(":");
    if (type === "hotbar") onClearHotbarSlot(Number(value));
  };

  const handleHotbarDrop = (event, slotIndex) => {
    event.preventDefault();
    const [type, value] = readDragData(event).split(":");
    if (type === "inventory") onAssignInventoryBlock(Number(value), slotIndex);
    if (type === "hotbar") onSwapHotbarSlots(Number(value), slotIndex);
  };

  const handleMouseMove = (event) => {
    setCursorPosition({ x: event.clientX, y: event.clientY });
  };

  const updateCursorPosition = (event) => {
    setCursorPosition({ x: event.clientX, y: event.clientY });
  };

  useEffect(() => {
    if (!cursorStack) return undefined;

    const handleWindowMouseMove = (event) => {
      setCursorPosition({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    return () => window.removeEventListener("mousemove", handleWindowMouseMove);
  }, [cursorStack]);

  const carriedOverlay =
    cursorStack && typeof document !== "undefined"
      ? createPortal(
          <div
            className="carried-stack"
            style={{ left: cursorPosition.x, top: cursorPosition.y }}
            aria-hidden="true"
          >
            {renderInventorySwatch(ITEMS[cursorStack.itemId])}
            <span className="item-count">{cursorStack.amount}</span>
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      className={`panel inventory-panel ${onClose ? "is-overlay" : ""}`}
      onMouseMove={handleMouseMove}
      onMouseDown={updateCursorPosition}
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

      <div className="mode-tabs">
        <span className="mode-label">Category</span>
        <button
          onClick={onSetForegroundMode}
          className={`mode-tab ${buildMode === "foreground" ? "is-active" : ""}`}
        >
          Foreground
        </button>
        <button
          onClick={onSetBackgroundMode}
          className={`mode-tab ${buildMode === "background" ? "is-active is-cyan" : ""}`}
        >
          Background
        </button>
      </div>

      <div className="inventory-workspace">
        <div className="inventory-main">
          {buildMode === "foreground" ? (
            <>
              <div className="inventory-section-heading">
                <span>Foreground blocks and items</span>
                <small>Left click carries a stack. Drag or carry to the hotbar to assign.</small>
              </div>
              <div
                className="palette-grid inventory-items-grid"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleInventoryDrop}
              >
                {ITEM_LIST.map((item) => {
                  const count = getItemCount(inventory, item.id);
                  const foregroundIndex = getForegroundIndexForItem(item.id);
                  const isAssignable = foregroundIndex !== null;
                  const equippedSlot = isAssignable
                    ? blockHotbar.indexOf(foregroundIndex)
                    : -1;
                  const isCarried = carriedPlaceableIndex === foregroundIndex;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      draggable={isAssignable && count > 0}
                      disabled={count <= 0 && !cursorStack}
                      onMouseDown={(event) => {
                        if (event.button === 2) {
                          onInventorySlotMouseDown(item.id, event.button);
                        }
                      }}
                      onContextMenu={(event) => event.preventDefault()}
                      onClick={() => onInventorySlotMouseDown(item.id, 0)}
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
                            : item.category === "tool"
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
            </>
          ) : (
            <>
              <div className="inventory-section-heading">
                <span>Background walls</span>
                <small>Pick the wall used while background mode is active.</small>
              </div>
              <div className="palette-grid inventory-items-grid">
                {WALL_PLACEABLE.map((wall, index) => {
                  const count = getItemCount(inventory, getWallItemId(wall));
                  return (
                    <button
                      type="button"
                      key={wall.id}
                      onClick={() => onSelectWall(index)}
                      className={`palette-item is-wall ${selectedWall === index ? "is-selected" : ""} ${count <= 0 ? "is-empty-count" : ""}`}
                    >
                      {renderTextureSwatch(wall, "wall")}
                      <span className="item-count">{count}</span>
                      <span className="palette-copy">
                        <span>{index + 1}. {wall.name}</span>
                        <small>Background wall</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <CraftingGrid
          title={craftingTitle}
          size={craftingSize}
          slots={craftingGrid}
          output={craftingOutput}
          renderItem={renderInventorySwatch}
          onSlotMouseDown={onCraftingSlotMouseDown}
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
              onClick={() => {
                if (cursorStack) onHotbarSlotMouseDown(slotIndex, 0);
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
