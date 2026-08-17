import { expect, test } from './fixtures.js';
import { hook, openVoices, rosterSize } from './windows.js';

const SETTLE = { timeout: 6000 };

test.describe('the overlay', () => {
  test('names the piece, the role, the pitch and the company', async ({ context }) => {
    const [page] = await openVoices(context, 1);
    await expect.poll(async () => (await hook(page)).voiceCount, SETTLE).toBe(1);

    await expect(page.locator('.mark')).toHaveText('Tab Choir');
    await expect(page.locator('.readout-role')).toHaveText('bass');
    await expect(page.locator('.readout-freq')).toHaveText(/^\d+\.\d Hz$/);
    await expect(page.locator('.readout-count')).toHaveText('1 voice');
    await expect(page.locator('.status')).toHaveText('window position sets pitch');
  });

  test('counts voices in words that read', async ({ context }) => {
    const pages = await openVoices(context, 3);
    for (const page of pages) await expect.poll(() => rosterSize(page), SETTLE).toBe(3);

    for (const page of pages) {
      await expect(page.locator('.readout-count')).toHaveText('3 voices');
    }
  });

  test('shows each window its own role, not its neighbour’s', async ({ context }) => {
    const [bass, tenor] = await openVoices(context, 2);
    await expect.poll(() => rosterSize(tenor), SETTLE).toBe(2);

    await expect(bass.locator('.readout-role')).toHaveText('bass');
    await expect(tenor.locator('.readout-role')).toHaveText('tenor');
  });

  test('reports the frequency it is actually singing, to one decimal', async ({ context }) => {
    const [page] = await openVoices(context, 1);
    await expect.poll(async () => (await hook(page)).voiceCount, SETTLE).toBe(1);

    const shown = await page.locator('.readout-freq').innerText();
    const { hz } = await hook(page);
    expect(shown).toBe(`${hz.toFixed(1)} Hz`);
    expect(shown).toMatch(/^\d+\.\d Hz$/);
  });

  test('follows a window as it is dragged', async ({ context }) => {
    const [page] = await openVoices(context, 1);
    await expect.poll(async () => (await hook(page)).voiceCount, SETTLE).toBe(1);
    const before = await page.locator('.readout-freq').innerText();

    await page.evaluate(() => {
      Object.defineProperty(window, 'screenX', { get: () => 1150, configurable: true });
    });

    await expect
      .poll(() => page.locator('.readout-freq').innerText(), SETTLE)
      .not.toBe(before);
    const after = await page.locator('.readout-freq').innerText();
    expect(parseFloat(after)).toBeGreaterThan(parseFloat(before));
  });

  test('is real text, selectable and available to a reader', async ({ context }) => {
    const [page] = await openVoices(context, 1);
    await expect.poll(async () => (await hook(page)).voiceCount, SETTLE).toBe(1);

    // Canvas text would be none of these things.
    await expect(page.getByText('Tab Choir')).toBeVisible();
    // innerText is what is rendered, so the CSS capitalisation shows through.
    expect(await page.locator('.overlay').innerText()).toMatch(/\bbass\b/i);

    const selectable = await page.evaluate(() => {
      const mark = /** @type {HTMLElement} */ (document.querySelector('.mark'));
      return getComputedStyle(mark).pointerEvents;
    });
    expect(selectable).toBe('auto');
  });

  test('lets the canvas through everywhere there is no text', async ({ context }) => {
    const [page] = await openVoices(context, 1);
    await expect.poll(async () => (await hook(page)).voiceCount, SETTLE).toBe(1);

    const overlay = await page.evaluate(
      () => getComputedStyle(/** @type {HTMLElement} */ (document.querySelector('.overlay')))
        .pointerEvents,
    );
    expect(overlay).toBe('none');

    // The centre of the screen is canvas, not overlay.
    const atCentre = await page.evaluate(() => {
      const el = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
      return el?.className;
    });
    expect(atCentre).toBe('stage');
  });

  test('wears the design’s stage typography', async ({ context }) => {
    const [page] = await openVoices(context, 1);
    await expect.poll(async () => (await hook(page)).voiceCount, SETTLE).toBe(1);

    await expect(page.locator('.mark')).toHaveCSS('letter-spacing', '6.6px'); // 0.44em at 15px
    await expect(page.locator('.mark')).toHaveCSS('text-transform', 'uppercase');
    await expect(page.locator('.readout-role')).toHaveCSS('color', 'rgb(184, 135, 63)');
    await expect(page.locator('.readout')).toHaveCSS('text-align', 'right');
    await expect(page.locator('.readout')).toHaveCSS('font-size', '11px');
  });
});
