import { BLOCKS, PLACEABLE, WALL_PLACEABLE } from "../game/constants";

export default function InventoryPanel({
  buildMode,
  selected,
  selectedWall,
  onSelect,
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
        <div className="palette-grid">
          {PLACEABLE.map((block, index) => (
            <button
              key={block.id}
              onClick={() => onSelect(index)}
              className={`palette-item ${selected === index ? "is-selected" : ""}`}
            >
              <span className="swatch" style={{ background: block.color }} />
              <span className="palette-copy">
                <span>{index === 9 ? "0" : index + 1}. {block.name}</span>
                <small>
                  {block.id === BLOCKS.torch.id ? "Light source" : "Solid block"}
                </small>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="palette-grid">
          {WALL_PLACEABLE.map((wall, index) => (
            <button
              key={wall.id}
              onClick={() => onSelectWall(index)}
              className={`palette-item is-wall ${selectedWall === index ? "is-selected" : ""}`}
            >
              <span className="swatch" style={{ background: wall.color }} />
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
