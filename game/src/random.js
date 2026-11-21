// A small seeded pseudo-random generator (mulberry32), so the scene's stars and
// decorations are identical for a given seed and the screenshots are reproducible.
export function createRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/** An integer in [min, max] from a generator returned by createRandom. */
export function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}
