// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules
// forward from a fresh world, so the frame is what a real game looks like and the same
// seed always gives the same frame.
//   start — the title screen over the untouched panels, 0 of 8 found.
//   play  — mid-game: 3 differences found (ringed on both panels), 5 still to find.
//   end   — the win screen: all 8 found and ringed, with the time and Play again line.
import { SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

/** The three differences the play scene has already found, spread across the stall. */
const PLAY_FOUND = ['lantern', 'moon', 'bowls'];
const PLAY_ELAPSED = 47;
const END_ELAPSED = 132;

/**
 * Set `world` to the named scene (start, play or end; any other name is start) and
 * return the screen to draw over it.
 */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    for (const id of PLAY_FOUND) world.markFound(id);
    world.state.elapsed = PLAY_ELAPSED;
    world.state.playing = true;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'end') {
    for (const diff of ['lantern', 'tail', 'bowls', 'steam', 'sign', 'moon', 'chopsticks', 'hat']) {
      world.markFound(diff);
    }
    world.state.elapsed = END_ELAPSED;
    world.state.playing = false;
    return { screen: SCREEN_WIN };
  }
  world.state.playing = false;
  world.state.elapsed = 0;
  return { screen: SCREEN_TITLE };
}
