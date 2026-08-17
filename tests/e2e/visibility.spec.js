import { expect, test } from './fixtures.js';
import { hook, lendVoice, openVoices, openWindows, rosterSize } from './windows.js';

const SETTLE = { timeout: 6000 };

/**
 * Count animation frames from before the page's own script runs.
 * @param {import('@playwright/test').Page} page
 */
const countFrames = (page) =>
  page.addInitScript(() => {
    const w = /** @type {any} */ (window);
    w.__frames = 0;
    const frame = w.requestAnimationFrame.bind(w);
    w.requestAnimationFrame = (/** @type {FrameRequestCallback} */ cb) => {
      w.__frames += 1;
      return frame(cb);
    };
  });

const frames = (/** @type {import('@playwright/test').Page} */ page) =>
  page.evaluate(() => /** @type {any} */ (window).__frames);

/** @param {import('@playwright/test').Page} page @param {boolean} hidden */
const setHidden = (page, hidden) =>
  page.evaluate((value) => {
    Object.defineProperty(document, 'hidden', { get: () => value, configurable: true });
    Object.defineProperty(document, 'visibilityState', {
      get: () => (value ? 'hidden' : 'visible'),
      configurable: true,
    });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);

test.describe('a window nobody is looking at', () => {
  test('stops drawing', async ({ context }) => {
    const [page] = await openWindows(context, 1);
    await countFrames(page);
    await page.reload();
    await lendVoice(page);

    await expect.poll(() => frames(page), SETTLE).toBeGreaterThan(10);
    await setHidden(page, true);

    const paused = await frames(page);
    await page.waitForTimeout(700);
    expect(await frames(page)).toBe(paused);
  });

  test('starts again when it is looked at', async ({ context }) => {
    const [page] = await openWindows(context, 1);
    await countFrames(page);
    await page.reload();
    await lendVoice(page);

    await setHidden(page, true);
    const paused = await frames(page);
    await page.waitForTimeout(400);
    expect(await frames(page)).toBe(paused);

    await setHidden(page, false);
    await expect.poll(() => frames(page), SETTLE).toBeGreaterThan(paused + 5);
  });

  test('keeps its place in the chord, and keeps singing', async ({ context }) => {
    const [hiding, watcher] = await openVoices(context, 2);
    await expect.poll(() => rosterSize(watcher), SETTLE).toBe(2);

    const before = await hook(hiding);
    await setHidden(hiding, true);
    await watcher.waitForTimeout(5000);

    // Still heard from, five seconds after it stopped drawing.
    expect(await rosterSize(watcher)).toBe(2);

    const after = await hook(hiding);
    expect(after.role).toBe(before.role);
    expect(after.hz).toBe(before.hz);
    expect(after.voiceCount).toBe(1);
    expect(after.ctxState).toBe('running');
  });

  test('resumes where it left off rather than resetting', async ({ context }) => {
    const [watcher, other] = await openVoices(context, 2);
    await expect.poll(() => rosterSize(watcher), SETTLE).toBe(2);

    /** @param {import('@playwright/test').Page} page */
    const siblingRow = (page) =>
      page.evaluate(() => {
        const canvas = /** @type {HTMLCanvasElement} */ (document.querySelector('canvas.stage'));
        const paint = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
        const x = Math.round(canvas.width * 0.02);
        const column = paint.getImageData(x, 0, 1, canvas.height).data;
        for (let y = 0; y < canvas.height; y += 1) {
          const red = column[y * 4];
          const blue = column[y * 4 + 2];
          if (red > 45 && red < 120 && Math.abs(red - blue) < 12) return y / canvas.height;
        }
        return -1;
      });

    // Wait for the drift to finish before taking a baseline: a row captured
    // mid-lerp would move on its own and prove nothing about the pause.
    await expect
      .poll(
        async () => {
          const first = await siblingRow(watcher);
          await watcher.waitForTimeout(250);
          const second = await siblingRow(watcher);
          return first > 0 && Math.abs(first - second) < 0.001;
        },
        SETTLE,
      )
      .toBe(true);
    const before = await siblingRow(watcher);

    await setHidden(watcher, true);
    await watcher.waitForTimeout(600);
    await setHidden(watcher, false);
    await watcher.waitForTimeout(200);

    expect(await siblingRow(watcher)).toBeCloseTo(before, 2);
    expect(other).toBeTruthy();
  });

  test('is still pruned if it closes while hidden', async ({ context }) => {
    const [hiding, watcher] = await openVoices(context, 2);
    await expect.poll(() => rosterSize(watcher), SETTLE).toBe(2);

    await setHidden(hiding, true);
    await hiding.close();

    await expect.poll(() => rosterSize(watcher), { timeout: 3500 }).toBe(1);
    expect((await hook(watcher)).role).toBe('bass');
  });
});
