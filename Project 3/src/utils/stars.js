// Star positions for the generated space background. Pure functions, no three.js:
// directions are [x, y, z] unit vectors in the viewer frame (+y up).

/**
 * Seeded pseudo-random numbers (mulberry32), so the starfield is the same on every load.
 * @param {number} seed - integer.
 * @returns {() => number} returns numbers in [0, 1).
 */
export function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

/**
 * A random direction, evenly spread over the sphere. The height y is uniform in [−1, 1]
 * (Archimedes: equal heights of a sphere have equal areas); a latitude uniform in
 * [−90°, 90°] would crowd the points at the poles.
 * @param {() => number} random
 * @returns {number[]} unit vector [x, y, z].
 */
export function uniformSpherePoint(random) {
  const y = 2 * random() - 1;
  const longitude = 2 * Math.PI * random();
  const r = Math.sqrt(1 - y * y);
  return [r * Math.cos(longitude), y, r * Math.sin(longitude)];
}

/**
 * Texture coordinates of a direction in an equirectangular (plate carrée) image, the way
 * three.js samples EquirectangularReflectionMapping: u along longitude, v = 1 at the top (+y).
 * @param {number[]} direction - unit vector [x, y, z].
 * @returns {{u: number, v: number, latitude: number}} u, v in [0, 1]; latitude in radians.
 */
export function toEquirect([x, y, z]) {
  const latitude = Math.asin(Math.min(1, Math.max(-1, y)));
  return {
    u: Math.atan2(z, x) / (2 * Math.PI) + 0.5,
    v: latitude / Math.PI + 0.5,
    latitude,
  };
}

/**
 * A standard normal random number (Box–Muller).
 * @param {() => number} random
 * @returns {number}
 */
function gaussian(random) {
  return Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
}

/**
 * Directions near a great circle, for the Milky Way band: longitude uniform along the
 * circle, offset from it normally distributed, then tilted about the x axis.
 * @param {() => number} random
 * @param {number} tiltDeg - angle between the band and the horizon.
 * @param {number} widthDeg - standard deviation of the offset from the circle.
 * @returns {number[]} unit vector [x, y, z].
 */
export function bandPoint(random, tiltDeg, widthDeg) {
  const longitude = 2 * Math.PI * random();
  const offset = (gaussian(random) * widthDeg * Math.PI) / 180;
  // On the untilted band (the horizon circle), y is the offset.
  const x = Math.cos(offset) * Math.cos(longitude);
  const y = Math.sin(offset);
  const z = Math.cos(offset) * Math.sin(longitude);
  const tilt = (tiltDeg * Math.PI) / 180;
  return [x, y * Math.cos(tilt) - z * Math.sin(tilt), y * Math.sin(tilt) + z * Math.cos(tilt)];
}
