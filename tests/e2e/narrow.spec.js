import { expect, test } from './fixtures.js';

/**
 * Count the constructors the piece must not reach for on a phone. Installed
 * before any of the page's own script runs.
 * @param {import('@playwright/test').Page} page
 */
async function countBuilds(page) {
  await page.addInitScript(() => {
    const w = /** @type {any} */ (window);
    w.__built = { audio: 0, channel: 0, frames: 0 };

    const Audio = w.AudioContext;
    w.AudioContext = function (...args) {
      w.__built.audio += 1;
      return new Audio(...args);
    };

    const Channel = w.BroadcastChannel;
    w.BroadcastChannel = function (...args) {
      w.__built.channel += 1;
      return new Channel(...args);
    };

    const frame = w.requestAnimationFrame.bind(w);
    w.requestAnimationFrame = (/** @type {FrameRequestCallback} */ cb) => {
      w.__built.frames += 1;
      return frame(cb);
    };
  });
}

const built = (/** @type {import('@playwright/test').Page} */ page) =>
  page.evaluate(() => /** @type {any} */ (window).__built);

test.describe('a screen too narrow to play on', () => {
  test('says so, and does not offer the invitation', async ({ context }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    await expect(page.getByText('This piece is played with windows.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lend a voice' })).toHaveCount(0);
    await expect(page.locator('.gate')).toHaveCount(0);
  });

  test('builds no audio, opens no channel, runs no loop', async ({ context }) => {
    const page = await context.newPage();
    await countBuilds(page);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.locator('.narrow')).toBeVisible();

    await page.waitForTimeout(600);
    expect(await built(page)).toEqual({ audio: 0, channel: 0, frames: 0 });
  });

  test('is honest — no promise it will work here later', async ({ context }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    const copy = await page.locator('.narrow').innerText();
    expect(copy).toContain('window');
    expect(copy).toMatch(/desktop/i);
    // The design file says "Each tab sings one note"; screenX is per window.
    expect(copy.replace(/tab choir/gi, '')).not.toMatch(/\btabs?\b/i);
    expect(copy).not.toMatch(/soon|coming|yet|support|rotate|landscape/i);
  });

  test('wears the design’s mobile screen', async ({ context }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    await expect(page.locator('.narrow-eyebrow')).toHaveCSS('color', 'rgb(184, 135, 63)');
    await expect(page.locator('.narrow-lead')).toHaveCSS('font-size', '34px');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(23, 23, 21)');
  });

  test('lets a wide window through to the gate', async ({ context }) => {
    const page = await context.newPage();
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    await expect(page.getByRole('button', { name: 'Lend a voice' })).toBeVisible();
    await expect(page.locator('.narrow')).toHaveCount(0);
  });

  test('turns away a coarse pointer even on a wide screen', async ({ browser }) => {
    // A touch device with a desktop-sized viewport still cannot move a window.
    const touch = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      hasTouch: true,
    });
    const page = await touch.newPage();
    await page.goto('/');

    await expect(page.locator('.narrow')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lend a voice' })).toHaveCount(0);
    await touch.close();
  });
});
