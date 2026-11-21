// Boot and the one loop: the world advances in fixed 1/60 s steps, the renderer paints
// what is there, and the game moves between three screens: title, play and win.
// Mouse clicks and the keyboard crosshair both resolve through world.clickAt; a correct
// click rings the difference on both panels and plays a soft chime, a wrong click shakes
// the frame and plays a low thud, H hints at one unfound difference, R restarts.
//
// ?seed=N fixes the scene's stars. ?shot=start|play|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { TOTAL_DIFFERENCES } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_FOUND, EVENT_MISS, EVENT_WIN } from './world.js';
import { createInput } from './input.js';
import { createRenderer, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const STEP = 1 / 60;
const MAX_FRAME = 0.25;
const HINT_SECONDS = 2;
const SHAKE_SECONDS = 0.3;
const FLASH_SECONDS = 0.3;
/** The animation time the staged screenshots use, so every shot is deterministic. */
const SHOT_TIME = 1.2;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed + 77));
const renderer = createRenderer(canvas, seed);

/** A tiny WebAudio synth for the find chime and the miss thud; no audio files. */
let audioContext = null;
function audio() {
  if (audioContext === null) {
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
  }
  if (audioContext.state === 'suspended') void audioContext.resume();
  return audioContext;
}

function playTone(frequency, startAt, duration, type, gainValue) {
  const context = audio();
  if (context === null) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  const now = context.currentTime + startAt;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.05);
}

function playChime() {
  playTone(659.25, 0, 0.18, 'sine', 0.16);
  playTone(987.77, 0.09, 0.28, 'sine', 0.14);
}

function playThud() {
  playTone(110, 0, 0.22, 'triangle', 0.18);
  playTone(82.41, 0.02, 0.26, 'sine', 0.14);
}

function runShot(name) {
  const scene = stageShot(name, world);
  const view = {
    worldState: world.state,
    screen: scene.screen,
    time: SHOT_TIME,
    crosshair: null,
    hintDiff: null,
    hintExpiresAt: 0,
    shakeExpiresAt: 0,
    flashExpiresAt: 0,
  };
  let painted = 0;
  function paint() {
    renderer.draw(view);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas, {
    onSelect,
    onSelectOutside,
    onCrosshair,
    onRestart,
    onHint,
  });
  let screen = SCREEN_TITLE;
  let animationTime = 0;
  let accumulator = 0;
  let last = performance.now();
  let hintDiff = null;
  let hintExpiresAt = 0;
  let shakeExpiresAt = 0;
  let flashExpiresAt = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    input.resetCrosshair();
    hintDiff = null;
    screen = SCREEN_PLAY;
    announce(`Playing. Find ${TOTAL_DIFFERENCES} differences between the two pictures.`);
  }

  function endGame() {
    screen = SCREEN_WIN;
    const seconds = Math.floor(world.state.elapsed);
    const minutes = Math.floor(seconds / 60);
    announce(`You found them all in ${minutes} minutes ${seconds % 60} seconds. Press R to play again.`);
  }

  function onSelect(x, y) {
    if (screen === SCREEN_TITLE) {
      startGame();
      return;
    }
    if (screen === SCREEN_WIN) {
      startGame();
      return;
    }
    const result = world.clickAt(x, y);
    if (result.events & EVENT_FOUND) {
      playChime();
      const diff = world.differenceById(result.id);
      announce(`Found: ${diff ? diff.name : 'a difference'}. ${world.remaining()} left.`);
      if (result.events & EVENT_WIN) endGame();
    } else if (result.events & EVENT_MISS) {
      playThud();
      shakeExpiresAt = animationTime + SHAKE_SECONDS;
      flashExpiresAt = animationTime + FLASH_SECONDS;
      announce('Not a difference. Keep looking.');
    }
  }

  function onSelectOutside() {
    if (screen === SCREEN_TITLE || screen === SCREEN_WIN) startGame();
  }

  function onCrosshair() {
    if (screen === SCREEN_TITLE) startGame();
  }

  function onRestart() {
    startGame();
  }

  function onHint() {
    if (screen !== SCREEN_PLAY) return;
    const diff = world.hint();
    if (diff === null) return;
    hintDiff = diff;
    hintExpiresAt = animationTime + HINT_SECONDS;
    announce(`Hint: look near the ${diff.name.toLowerCase()}.`);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const delta = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    animationTime += delta;
    if (screen === SCREEN_PLAY) {
      accumulator += delta;
      while (accumulator >= STEP) {
        world.tick(STEP);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    if (hintDiff !== null && hintExpiresAt <= animationTime) hintDiff = null;
    renderer.draw({
      worldState: world.state,
      screen,
      time: animationTime,
      crosshair: input.crosshair.visible ? { x: input.crosshair.x, y: input.crosshair.y } : null,
      hintDiff,
      hintExpiresAt,
      shakeExpiresAt,
      flashExpiresAt,
    });
  }

  // Leaving the tab pauses the timer rather than letting it run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) last = performance.now();
  });

  announce('Moonlit Noodle Stall. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
