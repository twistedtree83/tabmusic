import { expect, test } from './fixtures.js';
import { hook, lendVoice, rosterSize } from './windows.js';

const SETTLE = { timeout: 6000 };

/** @param {import('@playwright/test').Page} page */
const siblingRow = (page) =>
  page.evaluate(() => {
    const canvas = /** @type {HTMLCanvasElement} */ (document.querySelector('canvas.stage'));
    const paint = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    const column = paint.getImageData(Math.round(canvas.width * 0.02), 0, 1, canvas.height).data;
    for (let y = 0; y < canvas.height; y += 1) {
      const red = column[y * 4];
      const blue = column[y * 4 + 2];
      if (red > 45 && red < 120 && Math.abs(red - blue) < 12) return y / canvas.height;
    }
    return -1;
  });

/** Sample the sibling's position across a pitch change, from before it happens. */
async function traceMove(watcher, mover) {
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
  return /** @type {number[]} */ (
    await watcher.evaluate(() => /** @type {any} */ (window).__rows)
  );
}

/** @param {number[]} rows */
const intermediates = (rows) => {
  const first = rows[0];
  const last = rows[rows.length - 1];
  const low = Math.min(first, last) + 0.005;
  const high = Math.max(first, last) - 0.005;
  return rows.filter((y) => y > low && y < high).length;
};

test.describe('reduced motion', () => {
  test('keeps the waveform, because the waveform is the piece', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await lendVoice(page);
    await expect.poll(async () => (await hook(page)).level > 0.08, SETTLE).toBe(true);

    const heights = new Set();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const y = await page.evaluate(() => {
        const canvas = /** @type {HTMLCanvasElement} */ (document.querySelector('canvas.stage'));
        const paint = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
        const column = paint
          .getImageData(Math.round(canvas.width * 0.5), 0, 1, canvas.height)
          .data;
        let best = -1;
        let found = -1;
        for (let i = 0; i < canvas.height; i += 1) {
          if (column[i * 4] > best) {
            best = column[i * 4];
            found = i;
          }
        }
        return (found / canvas.height).toFixed(3);
      });
      heights.add(y);
      if (heights.size > 3) break;
      await page.waitForTimeout(80);
    }
    expect(heights.size, 'the waveform stopped responding to sound').toBeGreaterThan(3);
    await context.close();
  });

  test('moves a sibling in one step instead of drifting', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const [watcher, mover] = [await context.newPage(), await context.newPage()];
    for (const page of [watcher, mover]) {
      await page.goto('/');
      await lendVoice(page);
    }
    await expect.poll(() => rosterSize(watcher), SETTLE).toBe(2);
    await expect.poll(() => siblingRow(watcher), SETTLE).toBeGreaterThan(0);

    const rows = await traceMove(watcher, mover);
    expect(rows.length).toBeGreaterThan(20);
    expect(intermediates(rows), 'the sibling drifted').toBeLessThanOrEqual(1);
    await context.close();
  });

  test('still drifts when the preference is not set — the test discriminates', async ({
    context,
  }) => {
    const [watcher, mover] = [await context.newPage(), await context.newPage()];
    for (const page of [watcher, mover]) {
      await page.goto('/');
      await lendVoice(page);
    }
    await expect.poll(() => rosterSize(watcher), SETTLE).toBe(2);
    await expect.poll(() => siblingRow(watcher), SETTLE).toBeGreaterThan(0);

    const rows = await traceMove(watcher, mover);
    expect(intermediates(rows)).toBeGreaterThan(2);
  });

  test('drops a departed sibling at once instead of fading it', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const [watcher, leaving] = [await context.newPage(), await context.newPage()];
    for (const page of [watcher, leaving]) {
      await page.goto('/');
      await lendVoice(page);
    }
    await expect.poll(() => siblingRow(watcher), SETTLE).toBeGreaterThan(0);

    await leaving.close();
    await expect.poll(() => siblingRow(watcher), { timeout: 4000 }).toBe(-1);
    await context.close();
  });

  test('replaces the hint without an animated fade', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const first = await context.newPage();
    await first.goto('/');
    await lendVoice(first);
    await expect(first.locator('.hint')).toHaveText(/You are one voice/);

    await first.evaluate(() => {
      const w = /** @type {any} */ (window);
      w.__fade = [];
      const hint = /** @type {HTMLElement} */ (document.querySelector('.hint'));
      w.__timer = setInterval(() => w.__fade.push(Number(getComputedStyle(hint).opacity)), 30);
    });

    const second = await context.newPage();
    await second.goto('/');
    await lendVoice(second);
    await first.waitForTimeout(1200);
    await first.evaluate(() => clearInterval(/** @type {any} */ (window).__timer));

    /** @type {number[]} */
    const trace = await first.evaluate(() => /** @type {any} */ (window).__fade);
    const partial = trace.filter((o) => o > 0.05 && o < 0.95);
    expect(partial.length, 'the hint animated its fade').toBe(0);
    await expect(first.locator('.hint')).toHaveText('Now move your windows.');
    await context.close();
  });

  test('leaves the sound exactly as it was — the vibrato still sounds', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto('/');
    await lendVoice(page);
    await expect.poll(async () => (await hook(page)).voiceCount, SETTLE).toBe(1);

    const state = await hook(page);
    // body, air, vibrato, breath — the vibrato oscillator is still running.
    expect(state.oscillatorCount).toBe(4);
    expect(state.hz).toBeGreaterThan(0);
    await expect.poll(async () => (await hook(page)).level > 0.08, SETTLE).toBe(true);
    await context.close();
  });

  test('takes effect the moment the preference changes, with no reload', async ({ context }) => {
    const [watcher, mover] = [await context.newPage(), await context.newPage()];
    for (const page of [watcher, mover]) {
      await page.goto('/');
      await lendVoice(page);
    }
    await expect.poll(() => rosterSize(watcher), SETTLE).toBe(2);
    await expect.poll(() => siblingRow(watcher), SETTLE).toBeGreaterThan(0);

    await watcher.emulateMedia({ reducedMotion: 'reduce' });
    await mover.evaluate(() => {
      Object.defineProperty(window, 'screenX', { get: () => 40, configurable: true });
    });
    await watcher.waitForTimeout(600);

    const rows = await traceMove(watcher, mover);
    expect(intermediates(rows), 'the preference did not take effect').toBeLessThanOrEqual(1);
  });
});
