// Input for Moonlit Noodle Stall: mouse clicks on the canvas and keyboard play.
// Arrow keys move a crosshair across the frame, Enter / Space selects at the crosshair,
// R restarts, H asks for a hint. The callbacks are wired up by main.js.
import { CANVAS_HEIGHT, CANVAS_WIDTH, PANEL_HEIGHT, PANEL_LEFT_X, PANEL_RIGHT_X, PANEL_Y } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_RESTART = 2;
export const ACTION_HINT = 4;

const CROSSHAIR_STEP = 24;

/** Convert a mouse event into canvas coordinates, accounting for canvas scaling. */
function eventToCanvas(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * CANVAS_WIDTH,
    y: ((event.clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
  };
}

/**
 * Is a canvas point inside one of the two panels? Returns the panel-local coordinates
 * and which panel ('left' or 'right'), or null when the point is outside both panels.
 */
export function canvasToPanel(x, y) {
  if (y < PANEL_Y || y > PANEL_Y + PANEL_HEIGHT) return null;
  const localY = y - PANEL_Y;
  if (x >= PANEL_LEFT_X && x <= PANEL_LEFT_X + 600) return { x: x - PANEL_LEFT_X, y: localY, panel: 'left' };
  if (x >= PANEL_RIGHT_X && x <= PANEL_RIGHT_X + 600) return { x: x - PANEL_RIGHT_X, y: localY, panel: 'right' };
  return null;
}

export function createInput(canvas, hooks) {
  const crosshair = { x: PANEL_LEFT_X + 300, y: PANEL_Y + 200, visible: false };

  function selectAt(x, y) {
    crosshair.x = x;
    crosshair.y = y;
    crosshair.visible = true;
    const panel = canvasToPanel(x, y);
    if (panel !== null) hooks.onSelect(panel.x, panel.y);
    else hooks.onSelectOutside();
  }

  canvas.addEventListener('click', (event) => {
    const point = eventToCanvas(canvas, event);
    selectAt(point.x, point.y);
  });

  window.addEventListener('keydown', (event) => {
    const key = event.key;
    if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown') {
      event.preventDefault();
      crosshair.visible = true;
      if (key === 'ArrowLeft') crosshair.x = Math.max(0, crosshair.x - CROSSHAIR_STEP);
      if (key === 'ArrowRight') crosshair.x = Math.min(CANVAS_WIDTH, crosshair.x + CROSSHAIR_STEP);
      if (key === 'ArrowUp') crosshair.y = Math.max(0, crosshair.y - CROSSHAIR_STEP);
      if (key === 'ArrowDown') crosshair.y = Math.min(CANVAS_HEIGHT, crosshair.y + CROSSHAIR_STEP);
      hooks.onCrosshair(crosshair.x, crosshair.y);
      return;
    }
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (!crosshair.visible) {
        crosshair.visible = true;
        hooks.onCrosshair(crosshair.x, crosshair.y);
      }
      selectAt(crosshair.x, crosshair.y);
      return;
    }
    if (key === 'r' || key === 'R') {
      hooks.onRestart();
      return;
    }
    if (key === 'h' || key === 'H') {
      hooks.onHint();
    }
  });

  return {
    crosshair,
    /** Place the crosshair at canvas coordinates (used when a round starts). */
    resetCrosshair() {
      crosshair.x = PANEL_LEFT_X + 300;
      crosshair.y = PANEL_Y + 200;
      crosshair.visible = false;
    },
  };
}
