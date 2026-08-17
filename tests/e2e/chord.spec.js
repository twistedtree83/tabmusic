import { expect, test } from './fixtures.js';
import { openVoices, rosterSize } from './windows.js';

const SETTLE = { timeout: 6000 };
const DEPART = { timeout: 3500 };
const SCALE_PCS = [2, 4, 5, 7, 9, 11, 0];
const pc = (/** @type {number} */ midi) => ((midi % 12) + 12) % 12;
const hzToMidi = (/** @type {number} */ hz) => Math.round(69 + 12 * Math.log2(hz / 440));

/** @param {import('@playwright/test').Page} page */
const hook = (page) => page.evaluate(() => /** @type {any} */ (window).__tabchoir);

/**
 * Stop a window speaking without letting it say goodbye — the only way to reach
 * the prune path rather than the bye path.
 * @param {import('@playwright/test').Page} page
 */
const goQuiet = (page) =>
  page.evaluate(() => {
    BroadcastChannel.prototype.postMessage = () => {};
  });

test.describe('the chord', () => {
  test('gives two windows two registers, both in key', async ({ context }) => {
    const [a, b] = await openVoices(context, 2);
    for (const page of [a, b]) {
      await expect.poll(async () => (await hook(page)).voiceCount, SETTLE).toBe(1);
    }

    const [first, second] = await Promise.all([hook(a), hook(b)]);
    expect(first.role).not.toBe(second.role);
    expect(hzToMidi(first.hz)).not.toBe(hzToMidi(second.hz));
    for (const state of [first, second]) expect(SCALE_PCS).toContain(pc(hzToMidi(state.hz)));
  });

  test('never leaves a duet sitting on a tritone', async ({ context }) => {
    const [a, b] = await openVoices(context, 2);
    for (const page of [a, b]) {
      await expect.poll(async () => (await hook(page)).voiceCount, SETTLE).toBe(1);
    }

    // Sweep one window across the desktop; at no point may the pair land a
    // tritone apart, whatever degree each of them is on.
    for (const x of [0, 200, 400, 600, 800, 1000, 1200]) {
      await a.evaluate((screenX) => {
        Object.defineProperty(window, 'screenX', { get: () => screenX, configurable: true });
      }, x);
      await a.waitForTimeout(120);

      const [first, second] = await Promise.all([hook(a), hook(b)]);
      const gap = Math.abs(hzToMidi(first.hz) - hzToMidi(second.hz)) % 12;
      expect(gap, `tritone at screenX ${x}`).not.toBe(6);
    }
  });

  test('re-voices the survivor into a new register when a window closes', async ({ context }) => {
    const [above, page] = await openVoices(context, 2);
    await expect.poll(async () => (await hook(page)).voiceCount, SETTLE).toBe(1);
    const before = (await hook(page)).hz;

    await above.close();
    await expect.poll(() => rosterSize(page), DEPART).toBe(1);
    await expect.poll(async () => (await hook(page)).role, DEPART).toBe('bass');
    expect((await hook(page)).hz).toBeLessThan(before);
  });

  test('re-voices identically whether a window closes or is pruned', async ({ context }) => {
    const [ghost, page] = await openVoices(context, 2);
    await expect.poll(async () => (await hook(page)).voiceCount, SETTLE).toBe(1);

    // No bye message: this window simply stops being heard from.
    await goQuiet(ghost);

    // A close is instant because of the bye. A prune is 3000 ms of silence plus
    // up to one 500 ms beat before anybody looks, so DEPART is the wrong budget
    // here — this path is slower by design, and that is the point of the test.
    await expect.poll(() => rosterSize(page), { timeout: 5000 }).toBe(1);
    expect((await hook(page)).role).toBe('bass');
    expect((await hook(page)).voiceCount).toBe(1);
  });

  test('moves a dragged window with a glide, not a new voice', async ({ context }) => {
    const [page] = await openVoices(context, 1);
    await expect.poll(async () => (await hook(page)).voiceCount, SETTLE).toBe(1);
    const before = (await hook(page)).hz;

    await page.evaluate(() => {
      Object.defineProperty(window, 'screenX', { get: () => 1100, configurable: true });
    });

    await expect.poll(async () => (await hook(page)).hz !== before, SETTLE).toBe(true);
    const after = await hook(page);

    expect(after.hz).toBeGreaterThan(before);
    // The same voice took the journey: nothing was built or thrown away.
    expect(after.voiceCount).toBe(1);
    expect(after.oscillatorCount).toBe(4);
  });

  test('is silent in the sixth window and sings again when a singer leaves', async ({
    context,
  }) => {
    const pages = await openVoices(context, 6);
    const sixth = pages[5];
    await expect.poll(() => rosterSize(sixth), SETTLE).toBe(6);

    expect((await hook(sixth)).role).toBe('listener');
    expect((await hook(sixth)).voiceCount).toBe(0);

    await pages[0].close();
    await expect.poll(async () => (await hook(sixth)).role, DEPART).toBe('descant');
    await expect.poll(async () => (await hook(sixth)).voiceCount, SETTLE).toBe(1);
  });

  test('lets a demoted window fade rather than cut', async ({ context }) => {
    const pages = await openVoices(context, 5);
    const last = pages[4];
    await expect.poll(async () => (await hook(last)).voiceCount, SETTLE).toBe(1);

    // A sixth window pushes this one down into listening.
    const [sixth] = await openVoices(context, 1);
    await expect.poll(() => rosterSize(last), SETTLE).toBe(6);
    expect((await hook(sixth)).role).toBe('listener');

    // The demoted window is still the fifth voice; nothing about it was cut.
    expect((await hook(last)).voiceCount).toBe(1);
  });

  test('sounds complete with one window open', async ({ context }) => {
    const [alone] = await openVoices(context, 1);
    await expect.poll(async () => (await hook(alone)).voiceCount, SETTLE).toBe(1);

    const state = await hook(alone);
    expect(state.role).toBe('bass');
    expect(state.voices).toBe(1);
    expect(state.hz).toBeGreaterThan(0);
    expect(state.impulseSeconds).toBeCloseTo(3.5, 1);
    await expect.poll(async () => (await hook(alone)).level > 0.08, SETTLE).toBe(true);
  });
});
