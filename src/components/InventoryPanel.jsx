import {
  BLOCKS,
  FOREGROUND_ITEMS,
  WALL_PLACEABLE,
} from "../game/constants";
import {
  getBlockTexture,
  getItemTexture,
  getWallTexture,
} from "../game/textures";

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

export default function InventoryPanel({
  buildMode,
  selected,
  selectedWall,
  blockHotbar,
  onSelectHotbarSlot,
  onChooseInventoryBlock,
  onAssignInventoryBlock,
  onClearHotbarSlot,
  onSwapHotbarSlots,
  onSelectWall,
  onSetForegroundMode,
  onSetBackgroundMode,
  carriedPlaceableIndex,
  onClose,
}) {
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

  return (
    <div className={`panel inventory-panel ${onClose ? "is-overlay" : ""}`}>
      {onClose && (
        <div className="inventory-title-row">
          <div>
            <span>Inventory</span>
            <small>
              {carriedItem
                ? `Holding ${carriedItem.name}: click a hotbar slot or press 1-0.`
                : "Pick a normal item, then drop it into the hotbar."}
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
          Normal
        </button>
        <button
          onClick={onSetBackgroundMode}
          className={`mode-tab ${buildMode === "background" ? "is-active is-cyan" : ""}`}
        >
          Background
        </button>
      </div>

      {buildMode === "foreground" ? (
        <>
          <div className="inventory-section-heading">
            <span>Normal items</span>
            <small>Click or drag an item into a hotbar box.</small>
          </div>
          <div
            className="palette-grid inventory-items-grid"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleInventoryDrop}
          >
            {FOREGROUND_ITEMS.map((item, index) => {
              const equippedSlot = blockHotbar.indexOf(index);
              const isCarried = carriedPlaceableIndex === index;
              return (
                <button
                  type="button"
                  key={item.id}
                  draggable
                  onClick={() => onChooseInventoryBlock(index)}
                  onDragStart={(event) => {
                    onChooseInventoryBlock(index);
                    setDragData(event, `inventory:${index}`);
                  }}
                  className={`palette-item ${isCarried ? "is-carried" : ""}`}
                >
                  {renderTextureSwatch(item, "block")}
                  <span className="palette-copy">
                    <span>{item.name}</span>
                    <small>
                      {equippedSlot !== -1
                        ? `Equipped in ${equippedSlot === 9 ? "0" : equippedSlot + 1}`
                        : item.kind === "tool"
                          ? "Mining tool"
                          : item.id === BLOCKS.torch.id
                          ? "Light source"
                          : item.id === BLOCKS.water.id
                            ? "Flowing liquid"
                            : "Pick up"}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="inventory-section-heading hotbar-heading">
            <span>Hotbar</span>
            <small>
              {carriedItem
                ? "Click a slot or press 1-0 to place the held item."
                : "Drag a hotbar item upward to remove it."}
            </small>
          </div>
          <div className="hotbar-editor">
            {blockHotbar.map((foregroundItemIndex, slotIndex) => {
              const item = FOREGROUND_ITEMS[foregroundItemIndex];
              return (
                <button
                  type="button"
                  key={`${slotIndex}-${item?.id ?? "empty"}`}
                  draggable={Boolean(item)}
                  onClick={() => onSelectHotbarSlot(slotIndex)}
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
                  <span>{item?.name ?? "Empty"}</span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <div className="inventory-section-heading">
            <span>Background items</span>
            <small>Pick the wall used while background mode is active.</small>
          </div>
          <div className="palette-grid">
            {WALL_PLACEABLE.map((wall, index) => (
              <button
                key={wall.id}
                onClick={() => onSelectWall(index)}
                className={`palette-item is-wall ${selectedWall === index ? "is-selected" : ""}`}
              >
                {renderTextureSwatch(wall, "wall")}
                <span className="palette-copy">
                  <span>{index + 1}. {wall.name}</span>
                  <small>Background wall</small>
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
