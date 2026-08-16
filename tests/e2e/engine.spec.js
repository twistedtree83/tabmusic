import { expect, test } from './fixtures.js';
import { openVoices, openWindows } from './windows.js';

const SETTLE = { timeout: 6000 };

/** @param {import('@playwright/test').Page} page */
const hook = (page) => page.evaluate(() => /** @type {any} */ (window).__tabchoir);

test.describe('the audio engine', () => {
  test('does not exist before the gesture', async ({ context }) => {
    const [page] = await openWindows(context, 1);

    expect(await page.evaluate(() => /** @type {any} */ (window).__tabchoir)).toBeUndefined();
    // Nothing has been constructed, so nothing can be playing.
    expect(await page.evaluate(() => typeof AudioContext)).toBe('function');
  });

  test('runs the moment a voice is lent', async ({ context }) => {
    const [page] = await openVoices(context, 1);
    await expect.poll(async () => (await hook(page)).ctxState, SETTLE).toBe('running');
  });

  test('builds a three and a half second room, with no file to fetch', async ({ context }) => {
    const [page] = await openVoices(context, 1);
    await expect.poll(async () => (await hook(page)).impulseSeconds > 0, SETTLE).toBe(true);
    expect((await hook(page)).impulseSeconds).toBeCloseTo(3.5, 1);
  });

  test('makes no sound until a voice exists', async ({ context }) => {
    const [page] = await openVoices(context, 1);
    await expect.poll(async () => (await hook(page)).ctxState, SETTLE).toBe('running');
    expect((await hook(page)).voiceCount).toBe(0);
  });

  test('reports the roster it is part of', async ({ context }) => {
    const pages = await openVoices(context, 2);
    await expect.poll(async () => (await hook(pages[1])).voices, SETTLE).toBe(2);
    expect((await hook(pages[1])).role).toBe('tenor');
    expect((await hook(pages[1])).hz).toBeGreaterThan(0);
  });

  test('cannot be steered by writing to it', async ({ context }) => {
    const [page] = await openVoices(context, 1);
    await expect.poll(async () => (await hook(page)).ctxState, SETTLE).toBe('running');

    await page.evaluate(() => {
      const w = /** @type {any} */ (window);
      try {
        w.__tabchoir.voiceCount = 99;
        w.__tabchoir.ctxState = 'suspended';
      } catch {
        // Frozen in strict mode; silently ignored otherwise. Either is fine.
      }
    });

    const after = await hook(page);
    expect(after.voiceCount).toBe(0);
    expect(after.ctxState).toBe('running');
  });
});
