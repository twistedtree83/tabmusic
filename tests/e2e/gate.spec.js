import { expect, test } from './fixtures.js';

const JOIN = { name: 'Lend a voice' };

test.describe('the gate', () => {
  test('renders the invitation, and nothing else', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('A chord for open windows')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tab Choir' })).toBeVisible();
    await expect(
      page.getByText('Every window of this page holds one sustained voice.'),
    ).toBeVisible();
    await expect(page.getByRole('button', JOIN)).toBeVisible();
    await expect(page.getByText('sound begins on your gesture')).toBeVisible();

    // Nothing of the stage may exist before the gesture.
    await expect(page.locator('canvas')).toHaveCount(0);
  });

  test('speaks of windows, never of tabs', async ({ page }) => {
    await page.goto('/');
    const body = await page.locator('body').innerText();
    expect(body).toContain('window');
    // The title is the one sanctioned use of the word; CSS renders it uppercase.
    expect(body.replace(/tab choir/gi, '')).not.toMatch(/\btabs?\b/i);
  });

  test('wears the palette from the design', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(23, 23, 21)');
    await expect(page.getByRole('heading', { name: 'Tab Choir' })).toHaveCSS(
      'color',
      'rgb(245, 245, 244)',
    );
    await expect(page.getByRole('button', JOIN)).toHaveCSS('color', 'rgb(184, 135, 63)');
  });

  test('is reachable and operable by keyboard', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', JOIN)).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', JOIN)).toHaveCount(0);
  });

  test('activates on Space as well as Enter', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', JOIN).focus();
    await page.keyboard.press(' ');
    await expect(page.getByRole('button', JOIN)).toHaveCount(0);
  });

  test('clicking it takes the gate away', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', JOIN).click();
    await expect(page.locator('.gate')).toHaveCount(0);
  });
});
