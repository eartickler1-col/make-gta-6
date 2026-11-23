// A small seeded random number generator (mulberry32): the same seed gives
// the same city, the same traffic and the same screenshot scenes, which is
// what makes the staged shots repeatable. Extra helpers keep the call sites
// short: range, pick, chance and a shuffle-free choice.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A number in [min, max). */
export function range(random, min, max) {
  return min + random() * (max - min);
}

/** One element of an array, picked uniformly. */
export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

/** True with probability p (0..1). */
export function chance(random, p) {
  return random() < p;
}
