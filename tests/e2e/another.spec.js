import { readFileSync } from 'node:fs';
import { expect, test } from './fixtures.js';
import { hook, lendVoice, openVoices, rosterSize } from './windows.js';

const SETTLE = { timeout: 6000 };
const ANOTHER = { name: 'Open another window' };

test.describe('opening another window from inside the piece', () => {
  test('offers the control only once a window is singing', async ({ context }) => {
    const page = await context.newPage();
    await page.goto('/');
    await expect(page.getByRole('button', ANOTHER)).toHaveCount(0);

    await lendVoice(page);
    await expect(page.getByRole('button', ANOTHER)).toBeVisible();
  });

  test('does not offer it on a screen too narrow to play on', async ({ context }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    await expect(page.locator('.narrow')).toBeVisible();
    await expect(page.getByRole('button', ANOTHER)).toHaveCount(0);
  });

  test('opens a second window, which arrives at the gate', async ({ context }) => {
    const [page] = await openVoices(context, 1);

    const [opened] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', ANOTHER).click(),
    ]);
    await opened.waitForLoadState();

    expect(new URL(opened.url()).pathname).toBe(new URL(page.url()).pathname);
    // It has had no gesture of its own, so it is at the invitation.
    await expect(opened.getByRole('button', { name: 'Lend a voice' })).toBeVisible();
    await expect(opened.locator('canvas.stage')).toHaveCount(0);
    expect(await rosterSize(page)).toBe(1);
  });

  test('adds a voice in its own register once it is asked to sing', async ({ context }) => {
    const [page] = await openVoices(context, 1);
    expect((await hook(page)).role).toBe('bass');

    const [opened] = await Promise.all([
      context.waitForEvent('page'),
      page.getByRole('button', ANOTHER).click(),
    ]);
    await lendVoice(opened);

    await expect.poll(() => rosterSize(page), SETTLE).toBe(2);
    expect((await hook(page)).role).toBe('bass');
    expect((await hook(opened)).role).toBe('tenor');
    expect((await hook(opened)).hz).not.toBe((await hook(page)).hz);
  });

  test('is reachable and operable by keyboard', async ({ context }) => {
    const [page] = await openVoices(context, 1);

    await page.getByRole('button', ANOTHER).focus();
    await expect(page.getByRole('button', ANOTHER)).toBeFocused();

    const [byEnter] = await Promise.all([
      context.waitForEvent('page'),
      page.keyboard.press('Enter'),
    ]);
    expect(byEnter).toBeTruthy();

    const [bySpace] = await Promise.all([context.waitForEvent('page'), page.keyboard.press(' ')]);
    expect(bySpace).toBeTruthy();
  });

  test('asks for a window, and opens one — not a tab', async ({ context }) => {
    const [page] = await openVoices(context, 1);

    await expect(page.getByRole('button', ANOTHER)).toHaveText('Open another window');
    const copy = await page.locator('.overlay').innerText();
    expect(copy.replace(/tab choir/gi, '')).not.toMatch(/\btabs?\b/i);

    // window.open only opens a window when it is given features.
    const source = readFileSync('src/overlay.js', 'utf8');
    expect(source).toMatch(/window\.open\(location\.href, '_blank', `width=/);
    expect(source).toMatch(/left=\$\{left\},top=\$\{top\}/);
  });

  test('offsets the new window rather than stacking it exactly', async ({ context }) => {
    const [page] = await openVoices(context, 1);

    const asked = await page.evaluate(() => {
      const w = /** @type {any} */ (window);
      /** @type {string[]} */
      const features = [];
      const real = w.open.bind(w);
      w.open = (/** @type {any[]} */ ...args) => {
        features.push(args[2]);
        return real(...args);
      };
      /** @type {HTMLElement} */ (document.querySelector('.another')).click();
      return features[0];
    });

    const at = (/** @type {string} */ key) => Number(asked.match(new RegExp(`${key}=(-?\\d+)`))?.[1]);
    const here = await page.evaluate(() => ({ x: window.screenX, y: window.screenY }));
    expect(at('left')).toBeGreaterThan(here.x);
    expect(at('top')).toBeGreaterThan(here.y);
    expect(at('width')).toBeGreaterThan(0);
    expect(at('height')).toBeGreaterThan(0);
  });

  test('is still offered to a window that has fallen silent', async ({ context }) => {
    const pages = await openVoices(context, 6);
    const sixth = pages[5];
    await expect.poll(async () => (await hook(sixth)).role, SETTLE).toBe('listener');

    await expect(sixth.getByRole('button', ANOTHER)).toBeVisible();
  });

  test('drops its transition under reduced motion', async ({ browser }) => {
    const still = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await still.newPage();
    await page.goto('/');
    await lendVoice(page);

    await expect(page.getByRole('button', ANOTHER)).toHaveCSS('transition-duration', '0s');
    await still.close();
  });

  test('wears the gate’s treatment', async ({ context }) => {
    const [page] = await openVoices(context, 1);
    const control = page.getByRole('button', ANOTHER);

    await expect(control).toHaveCSS('color', 'rgb(184, 135, 63)');
    await expect(control).toHaveCSS('font-size', '12px');
    await expect(control).toHaveCSS('letter-spacing', '3.6px');
    await expect(control).toHaveCSS('text-transform', 'uppercase');
  });
});
