/**
 * @typedef {import('@playwright/test').BrowserContext} BrowserContext
 * @typedef {import('@playwright/test').Page} Page
 * @typedef {{ id: string, rank: number, role: string, hz: number }} Row
 */

/**
 * Everything the piece will admit to. Until T-08 this came from a `<pre>` dump;
 * the stage replaced it, and `window.__tabchoir` is now the only window in.
 * @param {Page} page
 */
export const hook = (page) => page.evaluate(() => /** @type {any} */ (window).__tabchoir);

/**
 * Open n windows on the piece, all in the test's own browser context.
 *
 * BroadcastChannel is scoped to the origin *and* the browsing context group, so
 * pages opened in separate Playwright contexts never see each other and a peer
 * test written that way passes while proving nothing. Everything multi-window
 * goes through here.
 *
 * @param {BrowserContext} context
 * @param {number} n
 * @returns {Promise<Page[]>}
 */
export async function openWindows(context, n) {
  const pages = [];
  for (let i = 0; i < n; i += 1) {
    const page = await context.newPage();
    await page.goto('/');
    pages.push(page);
  }
  return pages;
}

/**
 * Open n windows and lend a voice from each, oldest first.
 *
 * @param {BrowserContext} context
 * @param {number} n
 * @returns {Promise<Page[]>}
 */
export async function openVoices(context, n) {
  const pages = await openWindows(context, n);
  for (const page of pages) await lendVoice(page);
  return pages;
}

/** @param {Page} page */
export async function lendVoice(page) {
  await page.getByRole('button', { name: 'Lend a voice' }).click();
  await page.locator('canvas.stage').waitFor({ timeout: 5000 });
}

/**
 * The roster this window has derived.
 * @param {Page} page
 * @returns {Promise<Row[]>}
 */
export async function readRoster(page) {
  return (await hook(page))?.roster ?? [];
}

/** @param {Page} page */
export async function rosterSize(page) {
  return (await readRoster(page)).length;
}

/** @param {Page} page */
export async function selfId(page) {
  return (await hook(page))?.selfId;
}

/** @param {Page} page */
export async function ownRole(page) {
  return (await hook(page))?.role;
}

/**
 * What this window says about its own position and pitch.
 * @param {Page} page
 * @returns {Promise<{ t: number, degree: number, midi: number, hz: number }>}
 */
export async function readPosition(page) {
  const state = await hook(page);
  if (!state) throw new Error('this window has not lent a voice yet');
  return { t: state.t, degree: state.degree, midi: state.midi, hz: state.hz };
}
