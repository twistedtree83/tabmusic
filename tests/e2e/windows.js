/**
 * Open n windows on the piece, all in the test's own browser context.
 *
 * BroadcastChannel is scoped to the origin *and* the browsing context group, so
 * pages opened in separate Playwright contexts never see each other and a peer
 * test written that way passes while proving nothing. Everything multi-window
 * goes through here.
 *
 * @param {import('@playwright/test').BrowserContext} context
 * @param {number} n
 * @returns {Promise<import('@playwright/test').Page[]>}
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
