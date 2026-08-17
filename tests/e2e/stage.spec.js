import { expect, test } from './fixtures.js';
import { hook, openVoices } from './windows.js';

const SETTLE = { timeout: 6000 };

/**
 * For each sampled column, the vertical position of the amber stroke.
 * @param {import('@playwright/test').Page} page
 * @param {number[]} columns fractions across the canvas
 */
const strokeAt = (page, columns) =>
  page.evaluate((fractions) => {
    const canvas = /** @type {HTMLCanvasElement} */ (document.querySelector('canvas.stage'));
    const paint = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));

    return fractions.map((fraction) => {
      const x = Math.min(canvas.width - 1, Math.round(fraction * (canvas.width - 1)));
      const column = paint.getImageData(x, 0, 1, canvas.height).data;

      let brightest = -1;
      let found = -1;
      for (let y = 0; y < canvas.height; y += 1) {
        // Amber over ink: red rises furthest above the background.
        const red = column[y * 4];
        if (red > brightest) {
          brightest = red;
          found = y;
        }
      }
      return { y: found / canvas.height, red: brightest };
    });
  }, columns);

test.describe('the stage', () => {
  test('replaces everything else once a voice is lent', async ({ context }) => {
    const [page] = await openVoices(context, 1);

    await expect(page.locator('canvas.stage')).toBeVisible();
    await expect(page.locator('.gate')).toHaveCount(0);
    await expect(page.locator('pre')).toHaveCount(0);
  });

  test('fills the viewport at the display’s pixel ratio', async ({ context }) => {
    const [page] = await openVoices(context, 1);

    for (const size of [
      { width: 1280, height: 800 },
      { width: 1024, height: 640 },
    ]) {
      await page.setViewportSize(size);
      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const canvas = /** @type {HTMLCanvasElement} */ (
                document.querySelector('canvas.stage')
              );
              const ratio = window.devicePixelRatio || 1;
              return {
                backing: canvas.width,
                expected: Math.round(canvas.clientWidth * ratio),
                covers: canvas.clientWidth === window.innerWidth,
              };
            }),
          SETTLE,
        )
        .toEqual({
          backing: Math.round(size.width * 1),
          expected: Math.round(size.width * 1),
          covers: true,
        });
    }
  });

  test('resizes from a ResizeObserver, not a window listener', async ({ context }) => {
    const [page] = await openVoices(context, 1);
    const observed = await page.evaluate(() => typeof ResizeObserver);
    expect(observed).toBe('function');

    // The canvas is fixed to the viewport, so a resize that the observer missed
    // would leave the backing store stale against clientWidth.
    await page.setViewportSize({ width: 900, height: 600 });
    await expect
      .poll(
        () =>
          page.evaluate(() => {
            const canvas = /** @type {HTMLCanvasElement} */ (
              document.querySelector('canvas.stage')
            );
            return canvas.width - Math.round(canvas.clientWidth * (window.devicePixelRatio || 1));
          }),
        SETTLE,
      )
      .toBe(0);
  });

  test('draws a line that deforms with the voice', async ({ context }) => {
    const [page] = await openVoices(context, 1);
    await expect.poll(async () => (await hook(page)).level > 0.08, SETTLE).toBe(true);

    // Sampled across the middle of the canvas, where the taper is widest.
    const middle = [0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65];
    const heights = new Set();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      for (const { y } of await strokeAt(page, middle)) heights.add(y.toFixed(3));
      if (heights.size > 3) break;
      await page.waitForTimeout(80);
    }
    expect(heights.size, 'the waveform is a flat line').toBeGreaterThan(3);
  });

  test('covers the whole canvas after the window changes size', async ({ context }) => {
    // The canvas is built inside the click handler, after the viewport moved.
    // If the observer reported the pre-gesture box, the waveform would be drawn
    // into a fraction of the canvas and the rest would stay empty ink.
    const page = await context.newPage();
    await page.setViewportSize({ width: 760, height: 500 });
    await page.goto('/');
    await page.setViewportSize({ width: 1280, height: 800 });

    await page.getByRole('button', { name: 'Lend a voice' }).click();
    await page.locator('canvas.stage').waitFor();
    await expect.poll(async () => (await hook(page)).level > 0.08, SETTLE).toBe(true);

    const edges = await strokeAt(page, [0.02, 0.5, 0.98]);
    for (const edge of edges) expect(edge.red).toBeGreaterThan(100);
    for (const edge of edges) expect(edge.y).toBeGreaterThan(0.2);
  });

  test('tapers to the centre line at both ends', async ({ context }) => {
    const [page] = await openVoices(context, 1);
    await expect.poll(async () => (await hook(page)).level > 0.08, SETTLE).toBe(true);

    const [left, right] = await strokeAt(page, [0, 1]);
    expect(left.y).toBeCloseTo(0.5, 1);
    expect(right.y).toBeCloseTo(0.5, 1);
  });

  test('paints amber on ink', async ({ context }) => {
    const [page] = await openVoices(context, 1);
    await expect.poll(async () => (await hook(page)).level > 0.08, SETTLE).toBe(true);

    const colours = await page.evaluate(() => {
      const canvas = /** @type {HTMLCanvasElement} */ (document.querySelector('canvas.stage'));
      const paint = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
      const corner = paint.getImageData(2, 2, 1, 1).data;
      return { background: [corner[0], corner[1], corner[2]] };
    });
    expect(colours.background).toEqual([23, 23, 21]);

    const [centre] = await strokeAt(page, [0.5]);
    expect(centre.red).toBeGreaterThan(100); // amber #b8873f has a red of 184
  });

  test('still renders for a listener, at rest', async ({ context }) => {
    const pages = await openVoices(context, 6);
    const sixth = pages[5];
    await expect.poll(async () => (await hook(sixth)).role, SETTLE).toBe('listener');

    await expect(sixth.locator('canvas.stage')).toBeVisible();

    // Six windows deep, this one is backgrounded and its frames are throttled,
    // so the first paint has to be waited for rather than assumed.
    await expect
      .poll(async () => (await strokeAt(sixth, [0.5]))[0].red > 100, SETTLE)
      .toBe(true);

    const [left, centre, right] = await strokeAt(sixth, [0, 0.5, 1]);
    for (const point of [left, centre, right]) expect(point.y).toBeCloseTo(0.5, 1);
  });
});
