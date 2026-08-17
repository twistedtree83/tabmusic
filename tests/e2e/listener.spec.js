import { expect, test } from './fixtures.js';
import { hook, openVoices, rosterSize } from './windows.js';

const SETTLE = { timeout: 6000 };
const DEPART = { timeout: 3500 };

test.describe('a listening window', () => {
  test('says what it is, plainly, and shows no number it does not have', async ({ context }) => {
    const pages = await openVoices(context, 6);
    const sixth = pages[5];
    await expect.poll(() => rosterSize(sixth), SETTLE).toBe(6);

    expect((await hook(sixth)).role).toBe('listener');
    expect((await hook(sixth)).voiceCount).toBe(0);

    await expect(sixth.locator('.readout-role')).toHaveText('Listening');
    await expect(sixth.locator('.readout-freq')).toHaveText('—');
    await expect(sixth.locator('.readout-count')).toHaveText('6 voices');
    await expect(sixth.locator('.status')).toHaveText('silent');

    const freq = await sixth.locator('.readout-freq').textContent();
    expect(freq).not.toMatch(/NaN|0\.0|undefined/);
  });

  test('explains itself in the piece’s own voice, and says window', async ({ context }) => {
    const pages = await openVoices(context, 6);
    const sixth = pages[5];
    await expect.poll(async () => (await hook(sixth)).role, SETTLE).toBe('listener');

    // The line fades out before it is replaced, so it lags the role by a fade.
    await expect.poll(() => sixth.locator('.hint').textContent(), SETTLE).toMatch(/full/i);

    const hint = await sixth.locator('.hint').textContent();
    expect(hint).toMatch(/\bwindow\b/);
    expect(hint).toMatch(/sing/i);
    expect(hint?.replace(/tab choir/gi, '')).not.toMatch(/\btabs?\b/i);

    await expect
      .poll(
        () =>
          sixth.evaluate(() =>
            Number(
              getComputedStyle(/** @type {HTMLElement} */ (document.querySelector('.hint')))
                .opacity,
            ),
          ),
        SETTLE,
      )
      .toBeGreaterThan(0.9);
  });

  test('still shows the whole chord it is not part of', async ({ context }) => {
    const pages = await openVoices(context, 6);
    const sixth = pages[5];
    await expect.poll(() => rosterSize(sixth), SETTLE).toBe(6);

    expect((await hook(sixth)).voices).toBe(6);
    await expect(sixth.locator('canvas.stage')).toBeVisible();

    const rules = await sixth.evaluate(() => {
      const canvas = /** @type {HTMLCanvasElement} */ (document.querySelector('canvas.stage'));
      const paint = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
      const column = paint.getImageData(Math.round(canvas.width * 0.02), 0, 1, canvas.height).data;
      let rows = 0;
      let run = false;
      for (let y = 0; y < canvas.height; y += 1) {
        const red = column[y * 4];
        const blue = column[y * 4 + 2];
        const bone = red > 45 && red < 120 && Math.abs(red - blue) < 12;
        if (bone && !run) rows += 1;
        run = bone;
      }
      return rows;
    });
    expect(rules).toBe(5);
  });

  test('starts singing when a singer closes, and arrives rather than appears', async ({
    context,
  }) => {
    const pages = await openVoices(context, 6);
    const sixth = pages[5];
    await expect.poll(async () => (await hook(sixth)).role, SETTLE).toBe('listener');

    await pages[0].close();
    await expect.poll(async () => (await hook(sixth)).role, DEPART).toBe('descant');

    const state = await hook(sixth);
    expect(state.voiceCount).toBe(1);
    expect(state.hz).toBeGreaterThan(0);
    await expect(sixth.locator('.readout-freq')).toHaveText(/^\d+\.\d Hz$/);
    await expect(sixth.locator('.status')).toHaveText('window position sets pitch');

    // The normal 1.5 s attack, not an instant arrival.
    const early = (await hook(sixth)).level;
    await sixth.waitForTimeout(1400);
    const settled = (await hook(sixth)).level;
    expect(early).toBeLessThan(settled / 2);
    expect(settled).toBeGreaterThan(0.08);
  });

  test('treats a seventh and an eighth window exactly the same', async ({ context }) => {
    const pages = await openVoices(context, 8);
    for (const page of pages.slice(5)) {
      await expect.poll(async () => (await hook(page)).role, SETTLE).toBe('listener');
      expect((await hook(page)).voiceCount).toBe(0);
      await expect(page.locator('.readout-role')).toHaveText('Listening');
      await expect(page.locator('.readout-count')).toHaveText('8 voices');
    }
  });
});
