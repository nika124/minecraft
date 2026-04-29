const HELP_CONTROLS = [
  ["A / D or arrows", "Move"],
  ["W / Space", "Jump"],
  ["Shift", "Run"],
  ["Left click", "Mine block or remove wall"],
  ["Right click", "Place block or open targeted workbench"],
  ["1-0", "Select hotbar item"],
  ["I", "Open or close inventory"],
  ["B", "Switch foreground/background"],
  ["H", "Fill background wall near player"],
  ["F", "Toggle fullscreen"],
  ["Esc / P", "Pause menu"],
  ["F1", "Show or hide this help"],
  ["F2 / F3", "Show or hide world options"],
];

export default function HelpOverlay() {
  return (
    <aside className="game-help-overlay" aria-label="Controls help">
      <h2>Controls</h2>
      <div className="help-control-list">
        {HELP_CONTROLS.map(([key, label]) => (
          <div className="help-control-row" key={key}>
            <b>{key}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
