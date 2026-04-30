const CONTROLS = [
  ["A / D", "Move"],
  ["Shift", "Run"],
  ["W / Space", "Jump"],
  ["Left click", "Mine/remove"],
  ["Right click", "Build/place"],
  ["I", "Inventory"],
  ["B", "Build layer"],
  ["H", "Fill background"],
  ["F", "Fullscreen"],
  ["F1", "Help menu"],
  ["F2 / F3", "World options"],
  ["Esc", "Pause menu"],
  ["1-0", "Hotbar"],
  ["P / R", "Pause/reset"],
];

export default function ControlsPanel({ stats }) {
  return (
    <aside className="panel side-panel">
      <h2>Controls</h2>
      <div className="control-grid">
        {CONTROLS.map(([key, label]) => (
          <div key={key} className="control-tile">
            <b>{key}</b>
            <br />
            {label}
          </div>
        ))}
      </div>

      <div className="stats-card">
        <div>
          <b>{stats.blocksMined}</b>
          <span>Mined</span>
        </div>
        <div>
          <b>{stats.blocksPlaced}</b>
          <span>Placed</span>
        </div>
        <div>
          <b>{stats.wallsBuilt}</b>
          <span>Walls</span>
        </div>
        <p>{stats.message}</p>
      </div>
    </aside>
  );
}
