import { BLOCKS, PLACEABLE, WALL_PLACEABLE } from "../game/constants";
import { getBlockTexture, getWallTexture } from "../game/textures";

function renderTextureSwatch(item, type) {
  const texture = type === "wall" ? getWallTexture(item) : getBlockTexture(item);
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
  const carriedBlock =
    carriedPlaceableIndex === null ? null : PLACEABLE[carriedPlaceableIndex];
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
              {carriedBlock
                ? `Holding ${carriedBlock.name}: click a hotbar slot or press 1-0.`
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
            {PLACEABLE.map((block, index) => {
              const equippedSlot = blockHotbar.indexOf(index);
              const isCarried = carriedPlaceableIndex === index;
              return (
                <button
                  type="button"
                  key={block.id}
                  draggable
                  onClick={() => onChooseInventoryBlock(index)}
                  onDragStart={(event) => {
                    onChooseInventoryBlock(index);
                    setDragData(event, `inventory:${index}`);
                  }}
                  className={`palette-item ${isCarried ? "is-carried" : ""}`}
                >
                  {renderTextureSwatch(block, "block")}
                  <span className="palette-copy">
                    <span>{block.name}</span>
                    <small>
                      {equippedSlot !== -1
                        ? `Equipped in ${equippedSlot === 9 ? "0" : equippedSlot + 1}`
                        : block.id === BLOCKS.torch.id
                          ? "Light source"
                          : block.id === BLOCKS.water.id
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
              {carriedBlock
                ? "Click a slot or press 1-0 to place the held item."
                : "Drag a hotbar item upward to remove it."}
            </small>
          </div>
          <div className="hotbar-editor">
            {blockHotbar.map((placeableIndex, slotIndex) => {
              const block = PLACEABLE[placeableIndex];
              return (
                <button
                  type="button"
                  key={`${slotIndex}-${block?.id ?? "empty"}`}
                  draggable={Boolean(block)}
                  onClick={() => onSelectHotbarSlot(slotIndex)}
                  onDragStart={(event) => {
                    if (!block) return;
                    setDragData(event, `hotbar:${slotIndex}`);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => handleHotbarDrop(event, slotIndex)}
                  className={`hotbar-editor-slot ${selected === slotIndex ? "is-selected" : ""} ${!block ? "is-empty" : ""}`}
                >
                  <span className="slot-key">{slotIndex === 9 ? "0" : slotIndex + 1}</span>
                  {block ? renderTextureSwatch(block, "block") : <span className="empty-slot" />}
                  <span>{block?.name ?? "Empty"}</span>
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
