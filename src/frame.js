/** @type {Set<(now: number) => void>} */
const listeners = new Set();
let handle = 0;
let watching = false;

/** @param {number} now */
const tick = (now) => {
  handle = requestAnimationFrame(tick);
  listeners.forEach((listener) => listener(now));
};

const start = () => {
  if (!handle && listeners.size && !document.hidden) handle = requestAnimationFrame(tick);
};

const stop = () => {
  cancelAnimationFrame(handle);
  handle = 0;
};

/**
 * The piece's single animation frame loop. Window position has no event of its
 * own, so it is polled here; the stage draws from the same loop.
 *
 * A hidden window stops drawing. The browser throttles it to a crawl anyway,
 * and cancelling says so out loud rather than leaving the canvas working for
 * nobody. Membership is unaffected: the heartbeat is a setInterval precisely so
 * that it does not stop with this.
 *
 * @param {(now: number) => void} listener
 * @returns {() => void} stop listening
 */
export function onFrame(listener) {
  listeners.add(listener);

  if (!watching) {
    watching = true;
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }

  start();
  return () => listeners.delete(listener);
}
