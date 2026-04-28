export default function GameHeader({
  buildMode,
  onToggleBuildMode,
  onFillHouseBackground,
  onResetWorld,
}) {
  return (
    <header className="game-header">
      <div className="game-title">
        <p className="eyebrow">Block sandbox</p>
        <h1>CraftBlock Explorer</h1>
        <p>
          Mine, build, and explore a procedural voxel world with animated
          terrain, particles, and a background wall layer for houses.
        </p>
      </div>
      <div className="header-actions">
        <button
          onClick={onToggleBuildMode}
          className={`action-button ${buildMode === "background" ? "is-cyan" : ""}`}
        >
          {buildMode === "background" ? "Background Mode" : "Foreground Mode"}
        </button>
        <button onClick={onFillHouseBackground} className="action-button">
          Fill House Wall
        </button>
        <button onClick={onResetWorld} className="action-button">
          Generate New World
        </button>
      </div>
    </header>
  );
}
