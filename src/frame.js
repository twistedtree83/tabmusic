/** @type {Set<(now: number) => void>} */
const listeners = new Set();
let handle = 0;

/** @param {number} now */
const tick = (now) => {
  handle = requestAnimationFrame(tick);
  listeners.forEach((listener) => listener(now));
};

/**
 * The piece's single animation frame loop. Window position has no event of its
 * own, so it is polled here; the stage draws from the same loop.
 *
 * @param {(now: number) => void} listener
 * @returns {() => void} stop listening
 */
export function onFrame(listener) {
  listeners.add(listener);
  if (!handle) handle = requestAnimationFrame(tick);
  return () => listeners.delete(listener);
}
