import { expect, test } from './fixtures.js';
import { hook, openVoices, rosterSize } from './windows.js';

const SETTLE = { timeout: 6000 };

/**
 * The vertical positions of the faint bone rules, as fractions of the canvas.
 *
 * Bone at 0.22 over ink lands near (72, 72, 70) — grey, with red and blue
 * within a few points of each other. The amber waveform's antialiased edges
 * reach similar reds but keep a much lower blue, which is what separates them.
 *
 * @param {import('@playwright/test').Page} page
 */
const siblingRows = (page) =>
  page.evaluate(() => {
    const canvas = /** @type {HTMLCanvasElement} */ (document.querySelector('canvas.stage'));
    const paint = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    // Near the left edge, where the waveform's taper is at its narrowest.
    const column = paint.getImageData(Math.round(canvas.width * 0.02), 0, 1, canvas.height).data;

    const rows = [];
    let run = -1;
    for (let y = 0; y <= canvas.height; y += 1) {
      const red = column[y * 4];
      const blue = column[y * 4 + 2];
      const bone = y < canvas.height && red > 45 && red < 120 && Math.abs(red - blue) < 12;
      if (bone && run < 0) run = y;
      if (!bone && run >= 0) {
        rows.push((run + y - 1) / 2 / canvas.height);
        run = -1;
      }
    }
    return rows;
  });

test.describe('siblings', () => {
  test('draws one rule for every other voice, and none for itself', async ({ context }) => {
    const pages = await openVoices(context, 3);
    for (const page of pages) await expect.poll(() => rosterSize(page), SETTLE).toBe(3);

    for (const page of pages) {
      await expect.poll(() => siblingRows(page).then((r) => r.length), SETTLE).toBe(2);
    }
  });

  test('draws nothing at all when a window is alone', async ({ context }) => {
    const [alone] = await openVoices(context, 1);
    await expect.poll(async () => (await hook(alone)).level > 0.08, SETTLE).toBe(true);
    expect(await siblingRows(alone)).toEqual([]);
  });

  test('puts a higher pitch higher on the screen', async ({ context }) => {
    const [bass, tenor] = await openVoices(context, 2);
    await expect.poll(() => rosterSize(tenor), SETTLE).toBe(2);
    await expect.poll(() => siblingRows(bass).then((r) => r.length), SETTLE).toBe(1);
    await expect.poll(() => siblingRows(tenor).then((r) => r.length), SETTLE).toBe(1);

    const [bassSees] = await siblingRows(bass); // the tenor, higher pitched
    const [tenorSees] = await siblingRows(tenor); // the bass, lower pitched
    expect((await hook(tenor)).hz).toBeGreaterThan((await hook(bass)).hz);
    expect(bassSees).toBeLessThan(tenorSees);
  });

  test('drifts to a new pitch rather than jumping there', async ({ context }) => {
    const [watcher, mover] = await openVoices(context, 2);
    await expect.poll(() => siblingRows(watcher).then((r) => r.length), SETTLE).toBe(1);
    const [before] = await siblingRows(watcher);

    // Sampling starts before the move: at 0.08 per frame the drift is over in a
    // few hundred milliseconds, and a poll afterwards would miss it entirely.
    await watcher.evaluate(() => {
      const w = /** @type {any} */ (window);
      w.__rows = [];
      const canvas = /** @type {HTMLCanvasElement} */ (document.querySelector('canvas.stage'));
      const paint = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
      const x = Math.round(canvas.width * 0.02);
      w.__timer = setInterval(() => {
        const column = paint.getImageData(x, 0, 1, canvas.height).data;
        for (let y = 0; y < canvas.height; y += 1) {
          const red = column[y * 4];
          const blue = column[y * 4 + 2];
          if (red > 45 && red < 120 && Math.abs(red - blue) < 12) {
            w.__rows.push(y / canvas.height);
            return;
          }
        }
      }, 16);
    });

    await mover.evaluate(() => {
      Object.defineProperty(window, 'screenX', { get: () => 1180, configurable: true });
    });
    await watcher.waitForTimeout(1500);
    await watcher.evaluate(() => clearInterval(/** @type {any} */ (window).__timer));

    /** @type {number[]} */
    const rows = await watcher.evaluate(() => /** @type {any} */ (window).__rows);
    const after = rows[rows.length - 1];
    expect(after).not.toBeCloseTo(before, 2);

    const between = rows.filter(
      (y) => Math.min(before, after) + 0.005 < y && y < Math.max(before, after) - 0.005,
    );
    expect(between.length, 'the sibling jumped').toBeGreaterThan(2);
  });

  test('keeps drawing a departed window while it fades, then drops it', async ({ context }) => {
    const [watcher, leaving] = await openVoices(context, 2);
    await expect.poll(() => siblingRows(watcher).then((r) => r.length), SETTLE).toBe(1);

    await leaving.close();

    // Still there while it fades. The scan only sees the rule while it is above
    // about half opacity, so this has to be read promptly — the roster poll
    // that the other tests do would eat most of the two seconds.
    await expect.poll(() => siblingRows(watcher).then((r) => r.length), { timeout: 900 }).toBe(1);
    // ...and gone once the two seconds are up.
    await expect.poll(() => siblingRows(watcher).then((r) => r.length), SETTLE).toBe(0);
    expect(await rosterSize(watcher)).toBe(1);
  });

  test('never lets a ghost into the roster or the chord', async ({ context }) => {
    const [watcher, leaving] = await openVoices(context, 2);
    await expect.poll(() => rosterSize(watcher), SETTLE).toBe(2);

    await leaving.close();
    await expect.poll(() => rosterSize(watcher), { timeout: 3500 }).toBe(1);

    // Whether the fading rule is still bright enough to detect is the previous
    // test's business. This one is about the books: a ghost is a rendering
    // concern and must count for nothing anywhere else.
    const state = await hook(watcher);
    expect(state.voices).toBe(1);
    expect(state.voiceCount).toBe(1);
    expect(state.role).toBe('bass');
  });
});
