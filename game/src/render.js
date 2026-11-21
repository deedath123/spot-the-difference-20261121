// The renderer: draws the whole 1280x480 frame with canvas 2D — the HUD bar, the two
// near-identical panels of the moonlit noodle stall, the found-difference rings, the
// hint pulse, the crosshair and the title / win overlays. Both panels are painted by the
// same drawPanel with a variant flag ('A' the original, 'B' the changed copy), so the
// eight differences in world.js are the only things that differ between them.
import {
  CANVAS_HEIGHT, CANVAS_WIDTH, HUD_HEIGHT, PANEL_HEIGHT, PANEL_LEFT_X, PANEL_RIGHT_X,
  PANEL_WIDTH, PANEL_Y, PALETTE,
} from './config.js';
import { DIFFERENCES } from './world.js';
import { createRandom } from './random.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';

const FONT_TITLE = 'bold 26px "Arial", "Helvetica", sans-serif';
const FONT_HUD = 'bold 20px "Arial", "Helvetica", sans-serif';
const FONT_SMALL = '14px "Arial", "Helvetica", sans-serif';
const FONT_BIG = 'bold 44px "Arial", "Helvetica", sans-serif';
const FONT_MEDIUM = 'bold 22px "Arial", "Helvetica", sans-serif';

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function circle(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
}

function ellipse(ctx, x, y, rx, ry) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
}

/** One wavy steam thread rising from (x, y); `lean` bends it left (-1) or right (1). */
function drawSteamThread(ctx, x, y, height, lean, phase, time) {
  const sway = Math.sin(time * 1.4 + phase) * 4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(
    x - 12 * lean + sway, y - height * 0.35,
    x + 12 * lean - sway, y - height * 0.7,
    x + 4 * lean + sway * 0.5, y - height,
  );
  ctx.stroke();
}

/** A bowl of ramen on the counter, chopsticks optional. */
function drawBowl(ctx, x, y, withChopsticks, chopsticksCrossed, time) {
  // Steam above the bowl (same in both panels for the outer bowls).
  ctx.strokeStyle = PALETTE.steam;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  drawSteamThread(ctx, x - 14, y - 16, 34, -1, 0.4, time);
  drawSteamThread(ctx, x + 12, y - 16, 30, 1, 2.1, time);
  // Bowl body and blue band.
  ctx.fillStyle = PALETTE.bowlWhite;
  ctx.beginPath();
  ctx.moveTo(x - 34, y - 8);
  ctx.quadraticCurveTo(x - 34, y + 22, x, y + 22);
  ctx.quadraticCurveTo(x + 34, y + 22, x + 34, y - 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = PALETTE.bowlBlue;
  ctx.fillRect(x - 34, y - 8, 68, 7);
  // Broth and noodles.
  ellipse(ctx, x, y - 8, 30, 8);
  ctx.fillStyle = PALETTE.broth;
  ctx.fill();
  ctx.strokeStyle = PALETTE.noodle;
  ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x + i * 9 - 6, y - 9);
    ctx.quadraticCurveTo(x + i * 9, y - 13, x + i * 9 + 6, y - 9);
    ctx.stroke();
  }
  if (withChopsticks) {
    ctx.strokeStyle = '#8a5a2b';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    if (chopsticksCrossed) {
      ctx.beginPath(); ctx.moveTo(x - 26, y - 34); ctx.lineTo(x + 18, y - 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 16, y - 36); ctx.lineTo(x + 26, y - 6); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(x - 22, y - 36); ctx.lineTo(x - 6, y - 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 12, y - 38); ctx.lineTo(x + 4, y - 6); ctx.stroke();
    }
  }
}

/** A hanging paper lantern; the middle one changes colour in variant B. */
function drawLantern(ctx, x, y, colour, time) {
  const sway = Math.sin(time * 0.9 + x) * 2;
  ctx.save();
  ctx.translate(sway, 0);
  ctx.strokeStyle = '#2b1a10';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y - 26); ctx.lineTo(x, y - 10); ctx.stroke();
  // Glow behind the lantern.
  const glow = ctx.createRadialGradient(x, y + 8, 4, x, y + 8, 46);
  glow.addColorStop(0, 'rgba(255, 223, 138, 0.55)');
  glow.addColorStop(1, 'rgba(255, 223, 138, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 48, y - 40, 96, 96);
  // Body: a ribbed paper oval.
  ctx.fillStyle = colour;
  ellipse(ctx, x, y + 8, 26, 24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 1.5;
  for (const offset of [-14, -7, 0, 7, 14]) {
    ctx.beginPath();
    ctx.ellipse(x, y + 8, Math.abs(offset) * 0.4 + 8, 24, 0, -Math.PI / 2, Math.PI / 2);
    ctx.stroke();
  }
  ctx.fillStyle = '#2b1a10';
  ctx.fillRect(x - 12, y - 20, 24, 6);
  ctx.fillRect(x - 12, y + 28, 24, 6);
  ctx.strokeStyle = PALETTE.lanternGlow;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x, y + 34); ctx.lineTo(x, y + 44); ctx.stroke();
  ctx.restore();
}

/** The vendor behind the counter: hat (band differs in variant B), face, apron. */
function drawVendor(ctx, variant, time) {
  const bob = Math.sin(time * 1.1) * 1.5;
  ctx.save();
  ctx.translate(0, bob);
  // Body and apron.
  ctx.fillStyle = PALETTE.vendorShirt;
  ctx.fillRect(118, 236, 104, 70);
  ctx.fillStyle = PALETTE.vendorApron;
  ctx.beginPath();
  ctx.moveTo(132, 244); ctx.lineTo(208, 244); ctx.lineTo(216, 306); ctx.lineTo(124, 306);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = PALETTE.vendorApron;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(136, 244); ctx.lineTo(150, 226); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(204, 244); ctx.lineTo(190, 226); ctx.stroke();
  // Head.
  ctx.fillStyle = PALETTE.vendorSkin;
  circle(ctx, 170, 205, 25);
  ctx.fill();
  // Eyes, smile, moustache.
  ctx.fillStyle = '#241a12';
  circle(ctx, 161, 202, 2.5); ctx.fill();
  circle(ctx, 179, 202, 2.5); ctx.fill();
  ctx.strokeStyle = '#241a12';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(170, 210, 8, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(158, 216); ctx.quadraticCurveTo(170, 221, 182, 216); ctx.stroke();
  // Hat: wide brim and cone, with a red band in variant A only.
  ctx.fillStyle = PALETTE.vendorHat;
  ctx.beginPath();
  ctx.moveTo(128, 186); ctx.lineTo(212, 186); ctx.lineTo(196, 152); ctx.lineTo(144, 152);
  ctx.closePath();
  ctx.fill();
  ellipse(ctx, 170, 186, 46, 8);
  ctx.fill();
  if (variant === 'A') {
    ctx.fillStyle = PALETTE.vendorHatBand;
    ctx.fillRect(140, 172, 60, 8);
  }
  ctx.restore();
}

/** The cat customer on its stool; its tail rises in A and droops in B. */
function drawCat(ctx, variant, time) {
  const tailSway = Math.sin(time * 1.6) * 3;
  // Stool.
  ctx.fillStyle = PALETTE.woodDark;
  ctx.fillRect(452, 372, 76, 10);
  ctx.fillRect(460, 382, 8, 26);
  ctx.fillRect(512, 382, 8, 26);
  // Tail.
  ctx.strokeStyle = PALETTE.catOrange;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (variant === 'A') {
    ctx.moveTo(524, 330);
    ctx.quadraticCurveTo(548 + tailSway, 312, 540 + tailSway, 272);
    ctx.quadraticCurveTo(536 + tailSway, 258, 524 + tailSway, 266);
  } else {
    ctx.moveTo(524, 336);
    ctx.quadraticCurveTo(548, 356, 536, 372);
    ctx.quadraticCurveTo(528, 382, 516, 374);
  }
  ctx.stroke();
  // Body.
  ctx.fillStyle = PALETTE.catOrange;
  ellipse(ctx, 486, 344, 40, 34);
  ctx.fill();
  ctx.fillStyle = PALETTE.catCream;
  ellipse(ctx, 470, 356, 22, 16);
  ctx.fill();
  // Head and ears.
  ctx.fillStyle = PALETTE.catOrange;
  circle(ctx, 452, 296, 23);
  ctx.fill();
  ctx.beginPath(); ctx.moveTo(434, 280); ctx.lineTo(430, 258); ctx.lineTo(448, 272); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(466, 274); ctx.lineTo(474, 256); ctx.lineTo(480, 280); ctx.closePath(); ctx.fill();
  ctx.fillStyle = PALETTE.catPink;
  ctx.beginPath(); ctx.moveTo(437, 276); ctx.lineTo(434, 264); ctx.lineTo(444, 272); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(468, 272); ctx.lineTo(473, 261); ctx.lineTo(477, 275); ctx.closePath(); ctx.fill();
  // Face: closed happy eyes, nose, whiskers.
  ctx.strokeStyle = '#241a12';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(443, 294, 4, Math.PI, 0); ctx.stroke();
  ctx.beginPath(); ctx.arc(461, 294, 4, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = PALETTE.catPink;
  ctx.beginPath(); ctx.moveTo(449, 302); ctx.lineTo(455, 302); ctx.lineTo(452, 306); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(36, 26, 18, 0.7)';
  ctx.lineWidth = 1.5;
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(452 + side * 14, 300); ctx.lineTo(452 + side * 30, 296); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(452 + side * 14, 304); ctx.lineTo(452 + side * 30, 306); ctx.stroke();
  }
  // Front paws on the counter edge.
  ctx.fillStyle = PALETTE.catOrange;
  ellipse(ctx, 448, 366, 9, 6); ctx.fill();
  ellipse(ctx, 470, 366, 9, 6); ctx.fill();
}

/** One panel of the stall. `variant` is 'A' (original) or 'B' (eight changes). */
function drawPanel(ctx, variant, stars, time) {
  // Dusk sky.
  const sky = ctx.createLinearGradient(0, 0, 0, PANEL_HEIGHT);
  sky.addColorStop(0, PALETTE.skyTop);
  sky.addColorStop(1, PALETTE.skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, PANEL_WIDTH, PANEL_HEIGHT);
  // Stars.
  ctx.fillStyle = 'rgba(255, 244, 200, 0.9)';
  for (const star of stars) {
    const twinkle = 0.5 + 0.5 * Math.sin(time * 2 + star.phase);
    ctx.globalAlpha = 0.35 + 0.55 * twinkle;
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;
  // Moon: full in A, crescent in B.
  ctx.fillStyle = PALETTE.moon;
  circle(ctx, 505, 68, 32);
  ctx.fill();
  ctx.fillStyle = 'rgba(230, 190, 110, 0.5)';
  circle(ctx, 494, 60, 5); ctx.fill();
  circle(ctx, 516, 76, 4); ctx.fill();
  if (variant === 'B') {
    ctx.fillStyle = PALETTE.skyTop;
    circle(ctx, 520, 60, 29);
    ctx.fill();
  }
  // Distant rooftops.
  ctx.fillStyle = '#241a33';
  ctx.beginPath();
  ctx.moveTo(0, 300); ctx.lineTo(0, 262); ctx.lineTo(70, 262); ctx.lineTo(70, 244);
  ctx.lineTo(120, 244); ctx.lineTo(120, 268); ctx.lineTo(210, 268); ctx.lineTo(210, 300);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(560, 300); ctx.lineTo(560, 250); ctx.lineTo(600, 250); ctx.lineTo(600, 300);
  ctx.closePath(); ctx.fill();
  // String lights sagging under the awning.
  ctx.strokeStyle = 'rgba(255, 223, 138, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(30, 58); ctx.quadraticCurveTo(300, 92, 570, 58);
  ctx.stroke();
  ctx.fillStyle = PALETTE.lanternGlow;
  for (let i = 0; i <= 10; i += 1) {
    const t = i / 10;
    const x = 30 + (570 - 30) * t;
    const y = (1 - t) * (1 - t) * 58 + 2 * (1 - t) * t * 92 + t * t * 58;
    circle(ctx, x, y + 4, 3);
    ctx.fill();
  }
  // Awning: red and cream stripes with a scalloped hem.
  for (let i = 0; i < 12; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? PALETTE.awningRed : PALETTE.awningCream;
    ctx.fillRect(i * 50, 0, 50, 46);
  }
  ctx.fillStyle = PALETTE.awningRed;
  for (let i = 0; i < 12; i += 1) {
    ctx.beginPath();
    ctx.arc(i * 50 + 25, 46, 12, 0, Math.PI);
    ctx.fill();
  }
  // Hanging sign: RAMEN in A, SOMEN in B.
  ctx.strokeStyle = '#2b1a10';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(368, 46); ctx.lineTo(368, 88); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(412, 46); ctx.lineTo(412, 88); ctx.stroke();
  ctx.fillStyle = PALETTE.signWood;
  ctx.fillRect(344, 88, 92, 52);
  ctx.strokeStyle = PALETTE.hudAccent;
  ctx.lineWidth = 2;
  ctx.strokeRect(348, 92, 84, 44);
  ctx.fillStyle = PALETTE.signText;
  ctx.font = 'bold 24px "Arial", "Helvetica", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(variant === 'A' ? 'RAMEN' : 'SOMEN', 390, 115);
  // Paper lanterns (the middle one changes colour).
  drawLantern(ctx, 80, 95, PALETTE.lanternRed, time);
  drawLantern(ctx, 300, 95, variant === 'A' ? PALETTE.lanternRed : PALETTE.lanternTeal, time);
  drawLantern(ctx, 520, 95, PALETTE.lanternRed, time);
  // Vendor and cat customer: two reacting characters.
  drawVendor(ctx, variant, time);
  drawCat(ctx, variant, time);
  // Counter with wood planks and a menu strip.
  ctx.fillStyle = PALETTE.counterTop;
  ctx.fillRect(0, 300, PANEL_WIDTH, 16);
  ctx.fillStyle = PALETTE.wood;
  ctx.fillRect(0, 316, PANEL_WIDTH, 100);
  ctx.strokeStyle = PALETTE.woodDark;
  ctx.lineWidth = 2;
  for (let y = 340; y < PANEL_HEIGHT; y += 24) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(PANEL_WIDTH, y); ctx.stroke();
  }
  ctx.fillStyle = PALETTE.signWood;
  ctx.fillRect(180, 340, 240, 30);
  ctx.fillStyle = PALETTE.signText;
  ctx.font = 'bold 15px "Arial", "Helvetica", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('RAMEN  •  GYOZA  •  BEER', 300, 356);
  // Bowls: three in A, two in B. The middle bowl carries the chopsticks.
  drawBowl(ctx, 110, 322, false, false, time);
  drawBowl(ctx, 250, 322, true, variant === 'B', time);
  if (variant === 'A') drawBowl(ctx, 400, 322, false, false, time);
  // The steam curl above the middle bowl bends left in A, right in B.
  ctx.strokeStyle = PALETTE.steam;
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  const lean = variant === 'A' ? -1 : 1;
  drawSteamThread(ctx, 250, 262, 44, lean, 1.3, time);
  drawSteamThread(ctx, 262, 262, 38, lean, 3.0, time);
  // Soy sauce bottle and napkin box, small props on the counter.
  ctx.fillStyle = '#20242e';
  ctx.fillRect(40, 282, 16, 20);
  ctx.fillStyle = PALETTE.lanternRed;
  ctx.fillRect(43, 274, 10, 8);
  ctx.fillStyle = PALETTE.bowlWhite;
  ctx.fillRect(540, 288, 26, 14);
  ctx.strokeStyle = '#20242e';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(540, 288, 26, 14);
}

/** A ring marker on a found difference, drawn in panel-local coordinates. */
function drawRing(ctx, x, y, radius, colour, lineWidth) {
  ctx.strokeStyle = colour;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 7, y);
  ctx.lineTo(x + 7, y);
  ctx.moveTo(x, y - 7);
  ctx.lineTo(x, y + 7);
  ctx.stroke();
}

export function createRenderer(canvas, seed) {
  const ctx = canvas.getContext('2d');
  const random = createRandom(seed ?? 1);
  const stars = [];
  for (let i = 0; i < 42; i += 1) {
    stars.push({
      x: 8 + random() * (PANEL_WIDTH - 16),
      y: 56 + random() * 150,
      size: 1 + random() * 2,
      phase: random() * Math.PI * 2,
    });
  }

  function drawHud(remaining, elapsed, screen) {
    ctx.fillStyle = PALETTE.hudBackground;
    ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);
    ctx.fillStyle = PALETTE.hudAccent;
    ctx.font = FONT_TITLE;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('MOONLIT NOODLE STALL', 20, 20);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = FONT_HUD;
    ctx.textAlign = 'center';
    ctx.fillText(`Differences left: ${remaining} / 8`, CANVAS_WIDTH / 2, 20);
    ctx.textAlign = 'right';
    ctx.fillText(`Time ${formatTime(elapsed)}`, CANVAS_WIDTH - 20, 20);
    ctx.fillStyle = 'rgba(255, 233, 184, 0.65)';
    ctx.font = FONT_SMALL;
    ctx.textAlign = 'center';
    ctx.fillText('Click a difference in either picture  •  Arrow keys move the crosshair, Enter selects  •  H hints  •  R restarts', CANVAS_WIDTH / 2, 40);
  }

  function drawOverlayTitle() {
    ctx.fillStyle = PALETTE.titleVeil;
    ctx.fillRect(0, HUD_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT - HUD_HEIGHT);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = FONT_BIG;
    ctx.fillText('MOONLIT NOODLE STALL', CANVAS_WIDTH / 2, 150);
    ctx.fillStyle = PALETTE.hudAccent;
    ctx.font = FONT_MEDIUM;
    ctx.fillText('— Spot the Difference —', CANVAS_WIDTH / 2, 196);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = FONT_HUD;
    ctx.fillText('Two pictures of one ramen stall. Find all 8 differences.', CANVAS_WIDTH / 2, 248);
    ctx.fillText('The vendor is waiting. The cat is hungry. Something is off.', CANVAS_WIDTH / 2, 282);
    ctx.fillStyle = PALETTE.ring;
    ctx.font = FONT_MEDIUM;
    ctx.fillText('Click or press Space to start', CANVAS_WIDTH / 2, 340);
  }

  function drawOverlayWin(elapsed) {
    ctx.fillStyle = PALETTE.winVeil;
    ctx.fillRect(0, HUD_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT - HUD_HEIGHT);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = PALETTE.ringFound;
    ctx.font = FONT_BIG;
    ctx.fillText('You found them all!', CANVAS_WIDTH / 2, 190);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = FONT_MEDIUM;
    ctx.fillText(`All 8 differences found in ${formatTime(elapsed)} — the cat gets its ramen.`, CANVAS_WIDTH / 2, 244);
    ctx.fillStyle = PALETTE.hudAccent;
    ctx.font = FONT_HUD;
    ctx.fillText('Press R to play again', CANVAS_WIDTH / 2, 292);
  }

  return {
    /**
     * Paint one frame. `view` carries the world state, the screen, the animation time,
     * the crosshair (canvas coordinates, or null), the hinted difference (or null) and
     * the shake / flash expiry times (animation seconds).
     */
    draw(view) {
      const { worldState, screen, time } = view;
      ctx.save();
      if (view.shakeExpiresAt > time) {
        const magnitude = (view.shakeExpiresAt - time) * 14;
        ctx.translate(Math.sin(time * 90) * magnitude, Math.cos(time * 77) * magnitude * 0.6);
      }
      ctx.clearRect(-20, -20, CANVAS_WIDTH + 40, CANVAS_HEIGHT + 40);
      drawHud(worldState.found.size === 0 ? 8 : 8 - worldState.found.size, worldState.elapsed, screen);
      // Left panel (original) and right panel (changed copy).
      ctx.save();
      ctx.translate(PANEL_LEFT_X, PANEL_Y);
      drawPanel(ctx, 'A', stars, time);
      ctx.restore();
      ctx.save();
      ctx.translate(PANEL_RIGHT_X, PANEL_Y);
      drawPanel(ctx, 'B', stars, time);
      ctx.restore();
      // Centre divider and panel borders.
      ctx.strokeStyle = PALETTE.panelDivider;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(CANVAS_WIDTH / 2, PANEL_Y - 4);
      ctx.lineTo(CANVAS_WIDTH / 2, PANEL_Y + PANEL_HEIGHT + 4);
      ctx.stroke();
      ctx.strokeStyle = PALETTE.panelBorder;
      ctx.lineWidth = 3;
      ctx.strokeRect(PANEL_LEFT_X - 1.5, PANEL_Y - 1.5, PANEL_WIDTH + 3, PANEL_HEIGHT + 3);
      ctx.strokeRect(PANEL_RIGHT_X - 1.5, PANEL_Y - 1.5, PANEL_WIDTH + 3, PANEL_HEIGHT + 3);
      // Rings on every found difference, on both panels.
      for (const diff of DIFFERENCES) {
        if (!worldState.found.has(diff.id)) continue;
        for (const originX of [PANEL_LEFT_X, PANEL_RIGHT_X]) {
          drawRing(ctx, originX + diff.x, PANEL_Y + diff.y, diff.radius + 6, PALETTE.ringFound, 4);
        }
      }
      // Hint: a pulsing ring on one unfound difference, on both panels.
      if (view.hintDiff && view.hintExpiresAt > time) {
        const pulse = 1 + 0.12 * Math.sin(time * 8);
        const radius = (view.hintDiff.radius + 8) * pulse;
        const alpha = 0.45 + 0.4 * Math.sin(time * 8);
        ctx.globalAlpha = Math.max(0.2, Math.min(1, alpha));
        for (const originX of [PANEL_LEFT_X, PANEL_RIGHT_X]) {
          drawRing(ctx, originX + view.hintDiff.x, PANEL_Y + view.hintDiff.y, radius, PALETTE.ring, 4);
        }
        ctx.globalAlpha = 1;
      }
      // Keyboard crosshair.
      if (view.crosshair && screen === SCREEN_PLAY) {
        const { x, y } = view.crosshair;
        ctx.strokeStyle = PALETTE.crosshair;
        ctx.lineWidth = 2;
        circle(ctx, x, y, 12);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x - 18, y); ctx.lineTo(x - 6, y);
        ctx.moveTo(x + 6, y); ctx.lineTo(x + 18, y);
        ctx.moveTo(x, y - 18); ctx.lineTo(x, y - 6);
        ctx.moveTo(x, y + 6); ctx.lineTo(x, y + 18);
        ctx.stroke();
      }
      // Wrong-click flash.
      if (view.flashExpiresAt > time) {
        ctx.fillStyle = `rgba(231, 76, 60, ${0.18 * (view.flashExpiresAt - time) / 0.3})`;
        ctx.fillRect(0, HUD_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT - HUD_HEIGHT);
      }
      if (screen === SCREEN_TITLE) drawOverlayTitle();
      else if (screen === SCREEN_WIN) drawOverlayWin(worldState.elapsed);
      ctx.restore();
    },
  };
}
