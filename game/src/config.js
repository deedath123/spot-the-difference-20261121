// Shared constants for Moonlit Noodle Stall: canvas size, panel geometry and palette.
// The canvas is one 1280x480 frame: a top HUD bar, then two 600x416 panels side by side
// with a centre divider. All scene drawing uses panel-local coordinates (0..600, 0..416)
// and the renderer translates into each panel's place on the canvas.
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 480;
export const HUD_HEIGHT = 48;
export const PANEL_WIDTH = 600;
export const PANEL_HEIGHT = 416;
export const PANEL_Y = 56;
export const PANEL_LEFT_X = 20;
export const PANEL_RIGHT_X = 660;
export const TOTAL_DIFFERENCES = 8;

export const PALETTE = {
  hudBackground: '#141021',
  hudText: '#ffe9b8',
  hudAccent: '#ffb347',
  panelBorder: '#6b4a2f',
  panelDivider: '#8a6a45',
  skyTop: '#1a2340',
  skyBottom: '#4a2a55',
  moon: '#ffe9a8',
  moonShadow: '#1a2340',
  awningRed: '#c0392b',
  awningCream: '#f5e6c8',
  woodDark: '#5d3a1e',
  wood: '#7a4a26',
  woodLight: '#96683c',
  counterTop: '#a9713d',
  lanternRed: '#e74c3c',
  lanternTeal: '#1abc9c',
  lanternGlow: '#ffdf8a',
  vendorSkin: '#f2c79b',
  vendorShirt: '#3e6b8e',
  vendorApron: '#f5e6c8',
  vendorHat: '#d9b36a',
  vendorHatBand: '#c0392b',
  catOrange: '#e8913a',
  catCream: '#ffe3b3',
  catPink: '#e58a8a',
  bowlWhite: '#f8f4e8',
  bowlBlue: '#2e6da4',
  broth: '#d98e32',
  noodle: '#f7d774',
  steam: 'rgba(255, 255, 255, 0.75)',
  signWood: '#3b2a18',
  signText: '#ffe9b8',
  ring: '#ffd23e',
  ringFound: '#7dff8a',
  crosshair: '#ffffff',
  titleVeil: 'rgba(10, 8, 24, 0.55)',
  winVeil: 'rgba(10, 8, 24, 0.55)',
};
