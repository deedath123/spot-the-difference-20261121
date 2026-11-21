// Pure game logic for Moonlit Noodle Stall — no DOM, no canvas, no sound here, so this
// file can be unit-tested in Node. The scene has exactly eight differences between the
// left panel (A, the original) and the right panel (B, the changed copy). Each difference
// is a named region in panel-local coordinates (0..600, 0..416); a click inside a region
// on either panel finds it. The world tracks the found set, the counting-up timer and
// the win state; rendering and input live in render.js, input.js and main.js.
import { TOTAL_DIFFERENCES } from './config.js';

/** The eight differences, in panel-local coordinates. `variantB` names the change. */
export const DIFFERENCES = [
  { id: 'lantern', name: 'Lantern colour', x: 300, y: 95, radius: 30, variantB: 'middle lantern turns teal' },
  { id: 'tail', name: 'Cat tail', x: 532, y: 305, radius: 34, variantB: 'cat tail drops down' },
  { id: 'bowls', name: 'Bowl count', x: 400, y: 322, radius: 28, variantB: 'third bowl is missing' },
  { id: 'steam', name: 'Steam curl', x: 250, y: 240, radius: 30, variantB: 'steam curls the other way' },
  { id: 'sign', name: 'Sign character', x: 390, y: 114, radius: 32, variantB: 'sign shows a different character' },
  { id: 'moon', name: 'Moon phase', x: 505, y: 68, radius: 36, variantB: 'moon becomes a crescent' },
  { id: 'chopsticks', name: 'Chopstick angle', x: 250, y: 305, radius: 26, variantB: 'chopsticks cross instead of lying parallel' },
  { id: 'hat', name: 'Vendor hat stripe', x: 170, y: 168, radius: 28, variantB: 'hat loses its red band' },
];

export const EVENT_FOUND = 1;
export const EVENT_ALREADY = 2;
export const EVENT_MISS = 4;
export const EVENT_WIN = 8;

/** Create a fresh world. `random` supplies the hint picker; pass Math.random in play. */
export function createWorld(random) {
  const state = {
    found: new Set(),
    elapsed: 0,
    playing: false,
    won: false,
  };

  function differenceAt(x, y) {
    let best = null;
    let bestDistance = Infinity;
    for (const diff of DIFFERENCES) {
      const dx = x - diff.x;
      const dy = y - diff.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= diff.radius && distance < bestDistance) {
        best = diff;
        bestDistance = distance;
      }
    }
    return best;
  }

  return {
    state,
    /** Start (or restart) a round: nothing found, timer at zero. */
    reset() {
      state.found = new Set();
      state.elapsed = 0;
      state.playing = true;
      state.won = false;
    },
    /** Advance the counting-up timer; only while a round is playing. */
    tick(seconds) {
      if (state.playing && !state.won) state.elapsed += seconds;
    },
    /**
     * Resolve a click at panel-local coordinates (either panel: the two pictures share
     * the same regions). Returns an event mask and, when a new difference is found, its id.
     */
    clickAt(x, y) {
      if (!state.playing || state.won) return { events: 0, id: null };
      const diff = differenceAt(x, y);
      if (diff === null) return { events: EVENT_MISS, id: null };
      if (state.found.has(diff.id)) return { events: EVENT_ALREADY, id: diff.id };
      state.found.add(diff.id);
      let events = EVENT_FOUND;
      if (state.found.size >= TOTAL_DIFFERENCES) {
        state.won = true;
        state.playing = false;
        events |= EVENT_WIN;
      }
      return { events, id: diff.id };
    },
    /** How many differences are still unfound. */
    remaining() {
      return TOTAL_DIFFERENCES - state.found.size;
    },
    /** Mark a difference found without a click (used by the screenshot staging). */
    markFound(id) {
      const diff = DIFFERENCES.find((item) => item.id === id);
      if (!diff || state.found.has(id)) return false;
      state.found.add(id);
      if (state.found.size >= TOTAL_DIFFERENCES) {
        state.won = true;
        state.playing = false;
      }
      return true;
    },
    /** Pick one unfound difference to hint at, or null when none remain. */
    hint() {
      const unfound = DIFFERENCES.filter((item) => !state.found.has(item.id));
      if (unfound.length === 0) return null;
      const pick = Math.floor((random ?? Math.random)() * unfound.length);
      return unfound[pick];
    },
    differenceById(id) {
      return DIFFERENCES.find((item) => item.id === id) ?? null;
    },
  };
}
