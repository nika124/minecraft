export default function SettingsOverlay({
  gameSettings,
  onClose,
  onUpdateSetting,
}) {
  return (
    <aside
      className="game-settings-overlay"
      onMouseDown={(event) => event.stopPropagation()}
      onMouseMove={(event) => event.stopPropagation()}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div className="settings-heading">
        <span>World Options</span>
        <button
          type="button"
          className="settings-close"
          onClick={onClose}
          aria-label="Close settings"
        >
          x
        </button>
      </div>

      <label className="settings-row">
        <span>Movement speed</span>
        <strong>{gameSettings.movementSpeed.toFixed(1)}x</strong>
        <input
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={gameSettings.movementSpeed}
          onChange={(event) =>
            onUpdateSetting("movementSpeed", Number(event.target.value))
          }
        />
      </label>

      <label className="settings-row">
        <span>Day cycle</span>
        <strong>{gameSettings.dayCycleSpeed.toFixed(1)}x</strong>
        <input
          type="range"
          min="0"
          max="4"
          step="0.1"
          value={gameSettings.dayCycleSpeed}
          disabled={gameSettings.skyMode !== "cycle"}
          onChange={(event) =>
            onUpdateSetting("dayCycleSpeed", Number(event.target.value))
          }
        />
      </label>

      <div className="settings-toggle-row">
        <span>Rain</span>
        <button
          type="button"
          className={gameSettings.rainEnabled ? "is-active" : ""}
          onClick={() => onUpdateSetting("rainEnabled", !gameSettings.rainEnabled)}
        >
          {gameSettings.rainEnabled ? "On" : "Off"}
        </button>
      </div>

      <label className="settings-row">
        <span>Rain intensity</span>
        <strong>{Math.round(gameSettings.rainIntensity * 100)}%</strong>
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.05"
          value={gameSettings.rainIntensity}
          disabled={!gameSettings.rainEnabled}
          onChange={(event) =>
            onUpdateSetting("rainIntensity", Number(event.target.value))
          }
        />
      </label>

      <div className="settings-segmented" aria-label="Sky mode">
        {[
          ["cycle", "Cycle"],
          ["day", "Day"],
          ["night", "Night"],
        ].map(([value, label]) => (
          <button
            type="button"
            key={value}
            className={gameSettings.skyMode === value ? "is-active" : ""}
            onClick={() => onUpdateSetting("skyMode", value)}
          >
            {label}
          </button>
        ))}
      </div>
    </aside>
  );
}
