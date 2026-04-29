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
  onSelectWall,
  onSetForegroundMode,
  onSetBackgroundMode,
}) {
  return (
    <div className="panel inventory-panel">
      <div className="mode-tabs">
        <span className="mode-label">Build layer</span>
        <button
          onClick={onSetForegroundMode}
          className={`mode-tab ${buildMode === "foreground" ? "is-active" : ""}`}
        >
          Foreground Blocks
        </button>
        <button
          onClick={onSetBackgroundMode}
          className={`mode-tab ${buildMode === "background" ? "is-active is-cyan" : ""}`}
        >
          Background Walls
        </button>
      </div>

      {buildMode === "foreground" ? (
        <>
          <div className="inventory-section-heading">
            <span>Hotbar</span>
            <small>Select a slot, then choose an item below to swap it in.</small>
          </div>
          <div className="hotbar-editor">
            {blockHotbar.map((placeableIndex, slotIndex) => {
              const block = PLACEABLE[placeableIndex];
              return (
                <button
                  key={`${slotIndex}-${block.id}`}
                  onClick={() => onSelectHotbarSlot(slotIndex)}
                  className={`hotbar-editor-slot ${selected === slotIndex ? "is-selected" : ""}`}
                >
                  <span className="slot-key">{slotIndex === 9 ? "0" : slotIndex + 1}</span>
                  {renderTextureSwatch(block, "block")}
                  <span>{block.name}</span>
                </button>
              );
            })}
          </div>

          <div className="inventory-section-heading">
            <span>Inventory</span>
            <small>Items already on the hotbar are marked as equipped.</small>
          </div>
          <div className="palette-grid">
            {PLACEABLE.map((block, index) => {
              const equippedSlot = blockHotbar.indexOf(index);
              const isSelected = equippedSlot === selected;
              return (
                <button
                  key={block.id}
                  onClick={() => onChooseInventoryBlock(index)}
                  className={`palette-item ${isSelected ? "is-selected" : ""}`}
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
                            : "Click to swap into hotbar"}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
        </>
      ) : (
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
                <small>Non-solid background</small>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
