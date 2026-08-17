import { expect, test } from './fixtures.js';
import { lendVoice, openVoices, openWindows, rosterSize } from './windows.js';

const SETTLE = { timeout: 6000 };
const ALONE = 'You are one voice. Open this page in another window.';
const MOVE = 'Now move your windows.';

/** @param {import('@playwright/test').Page} page */
const hintText = (page) => page.locator('.hint').textContent();
/** @param {import('@playwright/test').Page} page */
const hintOpacity = (page) =>
  page.evaluate(() =>
    Number(getComputedStyle(/** @type {HTMLElement} */ (document.querySelector('.hint'))).opacity),
  );

test.describe('the hint', () => {
  test('asks a lone window for company', async ({ context }) => {
    const [page] = await openVoices(context, 1);
    await expect(page.locator('.hint')).toHaveText(ALONE);
    await expect.poll(() => hintOpacity(page), SETTLE).toBeGreaterThan(0.9);
  });

  test('says window, never tab', async ({ context }) => {
    const [page] = await openVoices(context, 1);
    await expect(page.locator('.hint')).toHaveText(ALONE);

    const copy = await page.locator('body').innerText();
    expect(copy.replace(/tab choir/gi, '')).not.toMatch(/\btabs?\b/i);
  });

  test('changes the subject once somebody joins', async ({ context }) => {
    const [first] = await openVoices(context, 1);
    await expect(first.locator('.hint')).toHaveText(ALONE);

    const [second] = await openWindows(context, 1);
    await lendVoice(second);

    await expect.poll(() => hintText(first), SETTLE).toBe(MOVE);
    // The second window never sees the first line at all — it had company from
    // the moment it arrived.
    expect(await hintText(second)).toBe(MOVE);
  });

  test('fades rather than swapping the words underneath you', async ({ context }) => {
    const [first] = await openVoices(context, 1);
    await expect(first.locator('.hint')).toHaveText(ALONE);

    await first.evaluate(() => {
      const w = /** @type {any} */ (window);
      w.__fade = [];
      const hint = /** @type {HTMLElement} */ (document.querySelector('.hint'));
      w.__timer = setInterval(() => w.__fade.push(Number(getComputedStyle(hint).opacity)), 40);
    });

    const [second] = await openWindows(context, 1);
    await lendVoice(second);
    await first.waitForTimeout(2200);
    await first.evaluate(() => clearInterval(/** @type {any} */ (window).__timer));

    /** @type {number[]} */
    const trace = await first.evaluate(() => /** @type {any} */ (window).__fade);
    expect(Math.min(...trace)).toBeLessThan(0.2);
    // Partial opacities prove a transition rather than an instant switch.
    expect(trace.filter((o) => o > 0.05 && o < 0.95).length).toBeGreaterThan(2);
    expect(await hintText(first)).toBe(MOVE);
  });

  test('never goes back, even when the company leaves', async ({ context }) => {
    const [first, second] = await openVoices(context, 2);
    await expect.poll(() => hintText(first), SETTLE).toBe(MOVE);

    await second.close();
    await expect.poll(() => rosterSize(first), { timeout: 3500 }).toBe(1);

    await first.waitForTimeout(2000);
    expect(await hintText(first)).toBe(MOVE);
  });

  test('gets out of the way after about nine seconds, and stays out', async ({ context }) => {
    const [first, second] = await openVoices(context, 2);
    await expect.poll(() => hintText(first), SETTLE).toBe(MOVE);

    await expect.poll(() => hintOpacity(first), { timeout: 16000 }).toBeLessThan(0.05);

    // A roster change afterwards must not bring it back.
    await second.close();
    await expect.poll(() => rosterSize(first), { timeout: 3500 }).toBe(1);
    await first.waitForTimeout(2000);
    expect(await hintOpacity(first)).toBeLessThan(0.05);
    expect(await hintText(first)).toBe(MOVE);
  });

  test('starts over on a reload, because nothing is remembered', async ({ context }) => {
    const [first, second] = await openVoices(context, 2);
    await expect.poll(() => hintText(first), SETTLE).toBe(MOVE);

    await second.close();
    await expect.poll(() => rosterSize(first), { timeout: 3500 }).toBe(1);

    await first.reload();
    await lendVoice(first);
    await expect(first.locator('.hint')).toHaveText(ALONE);

    const stored = await first.evaluate(() => ({
      local: localStorage.length,
      session: sessionStorage.length,
      search: location.search,
      hash: location.hash,
    }));
    expect(stored).toEqual({ local: 0, session: 0, search: '', hash: '' });
  });
});
