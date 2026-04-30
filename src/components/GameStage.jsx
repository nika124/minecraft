export default function GameStage({
  gameShellRef,
  canvasRef,
  uiCanvasRef,
  isFullscreen,
  isHelpOpen,
  buildMode,
  onToggleFullscreen,
  children,
}) {
  return (
    <div
      ref={gameShellRef}
      className={`game-stage ${isFullscreen ? "is-fullscreen" : ""} ${isHelpOpen ? "is-help-open" : ""}`}
    >
      <div className="stage-toolbar">
        <span>
          {buildMode === "background" ? "Background layer" : "Foreground blocks"}
        </span>
        <button onClick={onToggleFullscreen} className="icon-button">
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </button>
      </div>
      <div className="game-canvas-stack">
        <canvas ref={canvasRef} className="game-canvas" />
        <canvas ref={uiCanvasRef} className="game-ui-canvas" />
        {children}
      </div>
    </div>
  );
}
