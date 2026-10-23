const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Camera flight duration that respects the user's reduced-motion setting.
 * @returns {number | undefined} 0 = jump instantly; undefined = Cesium picks a
 *   duration from the flight distance.
 */
export function flightDuration() {
  return window.matchMedia(REDUCED_MOTION).matches ? 0 : undefined;
}
