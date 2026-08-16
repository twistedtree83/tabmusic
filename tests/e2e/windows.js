/**
 * @typedef {import('@playwright/test').BrowserContext} BrowserContext
 * @typedef {import('@playwright/test').Page} Page
 * @typedef {{ rank: number, role: string, joinedAt: number, id: string, self: boolean }} Row
 */

const ROW = /^#(\d+)\s+(\S+)\s+joined=(\d+)\s+id=(\S+?)(\s+self)?$/gm;

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
  await page.locator('.roster-dump').waitFor();
}

/**
 * Parse the roster dump this window is showing.
 * @param {Page} page
 * @returns {Promise<Row[]>}
 */
export async function readRoster(page) {
  const text = await page.locator('.roster-dump').innerText();
  return [...text.matchAll(ROW)].map((m) => ({
    rank: Number(m[1]),
    role: m[2],
    joinedAt: Number(m[3]),
    id: m[4],
    self: Boolean(m[5]),
  }));
}

/** @param {Page} page */
export async function rosterSize(page) {
  return (await readRoster(page)).length;
}

/** @param {Page} page */
export async function selfId(page) {
  const row = (await readRoster(page)).find((r) => r.self);
  return row?.id;
}

/** @param {Page} page */
export async function ownRole(page) {
  const row = (await readRoster(page)).find((r) => r.self);
  return row?.role;
}
