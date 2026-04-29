import { useEffect } from "react";
import { VIEW_H, VIEW_W, WALL_PLACEABLE } from "../game/constants";

const HOTBAR_SLOT_COUNT = 10;

export function useKeyboardControls({
  isInventoryOpen,
  keysRef,
  pressedRef,
  inventoryOpenRef,
  carriedPlaceableRef,
  buildModeRef,
  selectBlock,
  selectWall,
  toggleBuildMode,
  fillHouseBackground,
  resetWorld,
  toggleFullscreen,
  setIsHelpOpen,
  setIsSettingsOpen,
  setIsInventoryOpen,
  setCarriedPlaceableIndex,
  setIsPaused,
}) {
  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();

      if (
        inventoryOpenRef.current &&
        key !== "i" &&
        key !== "escape" &&
        !/^[0-9]$/.test(key)
      ) {
        event.preventDefault();
        return;
      }

      keysRef.current[key] = true;

      if (key === "f1") {
        event.preventDefault();
        setIsHelpOpen((current) => !current);
        return;
      }

      if (key === "f2" || key === "f3") {
        event.preventDefault();
        setIsSettingsOpen((current) => !current);
        return;
      }

      if (pressedRef.current[key]) return;
      pressedRef.current[key] = true;

      if (/^[0-9]$/.test(key)) {
        event.preventDefault();
        const index = key === "0" ? 9 : Number(key) - 1;
        if (
          inventoryOpenRef.current &&
          carriedPlaceableRef.current !== null &&
          index < HOTBAR_SLOT_COUNT
        ) {
          selectBlock(index);
        } else if (buildModeRef.current === "background") {
          if (index < WALL_PLACEABLE.length) selectWall(index);
        } else if (index < HOTBAR_SLOT_COUNT) {
          selectBlock(index);
        }
      }

      if (key === "b") {
        toggleBuildMode();
      }

      if (key === "i") {
        event.preventDefault();
        setIsInventoryOpen((current) => {
          if (current) setCarriedPlaceableIndex(null);
          if (!current) keysRef.current = {};
          return !current;
        });
      }

      if (key === "h") fillHouseBackground();
      if (key === "p") setIsPaused((current) => !current);
      if (key === "escape") {
        if (isInventoryOpen) {
          setIsInventoryOpen(false);
          setCarriedPlaceableIndex(null);
          return;
        }
        setIsHelpOpen(false);
        setIsPaused(true);
      }
      if (key === "r") resetWorld();
      if (key === "f" && !document.fullscreenElement) toggleFullscreen();
    };

    const handleKeyUp = (event) => {
      const key = event.key.toLowerCase();
      keysRef.current[key] = false;
      pressedRef.current[key] = false;
    };

    const preventContext = (event) => event.preventDefault();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("contextmenu", preventContext);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("contextmenu", preventContext);
    };
  }, [
    buildModeRef,
    carriedPlaceableRef,
    fillHouseBackground,
    inventoryOpenRef,
    isInventoryOpen,
    keysRef,
    pressedRef,
    resetWorld,
    selectBlock,
    selectWall,
    setCarriedPlaceableIndex,
    setIsHelpOpen,
    setIsInventoryOpen,
    setIsPaused,
    setIsSettingsOpen,
    toggleBuildMode,
    toggleFullscreen,
  ]);
}

export function useCanvasMouseControls({
  uiCanvasRef,
  mouseRef,
  pausedRef,
  menuButtonsRef,
  inventoryOpenRef,
  carriedPlaceableRef,
  selectBlock,
  setIsPaused,
  resetWorld,
  toggleFullscreen,
}) {
  useEffect(() => {
    const uiCanvas = uiCanvasRef.current;
    if (!uiCanvas) return;

    const setMouseFromEvent = (event) => {
      const rect = uiCanvas.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * VIEW_W;
      mouseRef.current.y = ((event.clientY - rect.top) / rect.height) * VIEW_H;
    };

    const handleMouseMove = (event) => setMouseFromEvent(event);

    const handleMouseDown = (event) => {
      event.preventDefault();
      setMouseFromEvent(event);

      if (inventoryOpenRef.current) {
        const slot = 48;
        const gap = 6;
        const count = HOTBAR_SLOT_COUNT;
        const totalW = count * slot + (count - 1) * gap;
        const startX = (VIEW_W - totalW) / 2;
        const y = VIEW_H - 62;
        const slotIndex = Array.from({ length: count }, (_, index) => {
          const x = startX + index * (slot + gap);
          return mouseRef.current.x >= x &&
            mouseRef.current.x <= x + slot &&
            mouseRef.current.y >= y &&
            mouseRef.current.y <= y + slot
            ? index
            : -1;
        }).find((index) => index !== -1);

        if (slotIndex !== undefined && carriedPlaceableRef.current !== null) {
          selectBlock(slotIndex);
        }
        return;
      }

      if (pausedRef.current) {
        const button = menuButtonsRef.current.find(
          (item) =>
            mouseRef.current.x >= item.x &&
            mouseRef.current.x <= item.x + item.w &&
            mouseRef.current.y >= item.y &&
            mouseRef.current.y <= item.y + item.h,
        );

        if (button?.action === "resume") setIsPaused(false);
        if (button?.action === "newWorld") {
          resetWorld();
          setIsPaused(false);
        }
        if (button?.action === "fullscreen") toggleFullscreen();
        return;
      }

      mouseRef.current.down = true;
      mouseRef.current.button = event.button;
    };

    const handleMouseUp = () => {
      mouseRef.current.down = false;
    };

    uiCanvas.addEventListener("mousemove", handleMouseMove);
    uiCanvas.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      uiCanvas.removeEventListener("mousemove", handleMouseMove);
      uiCanvas.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    carriedPlaceableRef,
    inventoryOpenRef,
    menuButtonsRef,
    mouseRef,
    pausedRef,
    resetWorld,
    selectBlock,
    setIsPaused,
    toggleFullscreen,
    uiCanvasRef,
  ]);
}
