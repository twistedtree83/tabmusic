import { expect, test } from './fixtures.js';
import { openWindows } from './windows.js';

test.describe('the test harness itself', () => {
  test('opens windows that can hear each other over BroadcastChannel', async ({ context }) => {
    const [a, b] = await openWindows(context, 2);

    await b.evaluate(() => {
      const w = /** @type {any} */ (window);
      w.__heard = [];
      new BroadcastChannel('tab-choir-probe').onmessage = (event) => w.__heard.push(event.data);
    });

    await a.evaluate(() => new BroadcastChannel('tab-choir-probe').postMessage('hello'));

    await expect
      .poll(() => b.evaluate(() => /** @type {any} */ (window).__heard))
      .toEqual(['hello']);
  });
});
