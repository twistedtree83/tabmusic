import { expect, test } from './fixtures.js';
import { openVoices, rosterSize } from './windows.js';

const SETTLE = { timeout: 6000 };
const SCALE_PCS = [2, 4, 5, 7, 9, 11, 0];
const pc = (/** @type {number} */ midi) => ((midi % 12) + 12) % 12;
const hzToMidi = (/** @type {number} */ hz) => Math.round(69 + 12 * Math.log2(hz / 440));

/** @param {import('@playwright/test').Page} page */
const hook = (page) => page.evaluate(() => /** @type {any} */ (window).__tabchoir);

test.describe('a voice', () => {
  test('starts singing, once, on the gesture', async ({ context }) => {
    const [page] = await openVoices(context, 1);

    await expect.poll(async () => (await hook(page)).voiceCount, SETTLE).toBe(1);
    const state = await hook(page);
    expect(state.oscillatorCount).toBe(4); // body, air, vibrato, breath
    expect(state.soundingHz).toBeGreaterThan(0);
  });

  test('sings a note of the scale, in its own register', async ({ context }) => {
    const [page] = await openVoices(context, 1);
    await expect.poll(async () => (await hook(page)).voiceCount, SETTLE).toBe(1);

    const midi = hzToMidi((await hook(page)).soundingHz);
    expect(SCALE_PCS).toContain(pc(midi));
    expect(midi).toBeGreaterThanOrEqual(38); // bass, D2 upwards
    expect(midi).toBeLessThan(50);
  });

  test('arrives over a second and a half rather than appearing', async ({ context }) => {
    const [page] = await openVoices(context, 1);
    await expect.poll(async () => (await hook(page)).voiceCount, SETTLE).toBe(1);

    const early = (await hook(page)).level;
    await page.waitForTimeout(1400);
    const settled = (await hook(page)).level;

    expect(early).toBeLessThan(settled / 2);
    expect(settled).toBeGreaterThan(0.08);
  });

  test('glides to a new register rather than jumping', async ({ context }) => {
    const [above, page] = await openVoices(context, 2);
    await expect.poll(() => rosterSize(page), SETTLE).toBe(2);
    await expect.poll(async () => (await hook(page)).voiceCount, SETTLE).toBe(1);

    // Sampling starts before the trigger: reading the frequency after the fact
    // races a 250 ms ramp and would pass on an instant jump half the time.
    await page.evaluate(() => {
      const w = /** @type {any} */ (window);
      w.__trace = [];
      const id = setInterval(() => w.__trace.push(w.__tabchoir.soundingHz), 16);
      setTimeout(() => clearInterval(id), 3000);
    });

    await above.close();
    await page.waitForTimeout(3200);

    /** @type {number[]} */
    const trace = await page.evaluate(() => /** @type {any} */ (window).__trace);
    const target = (await hook(page)).hz;
    const start = trace[0];

    expect(trace.length).toBeGreaterThan(50);
    expect(target).toBeLessThan(start);
    expect(trace[trace.length - 1]).toBeCloseTo(target, 0);

    // The glide has to be visible in flight, not just at its endpoints.
    const inFlight = trace.filter((hz) => hz < start - 0.5 && hz > target + 0.5);
    expect(inFlight.length).toBeGreaterThan(2);
    expect(trace.every((hz) => hz <= start + 0.5 && hz >= target - 0.5)).toBe(true);
  });

  test('falls silent over two seconds when it becomes a listener', async ({ context }) => {
    const pages = await openVoices(context, 6);
    const sixth = pages[5];
    await expect.poll(() => rosterSize(sixth), SETTLE).toBe(6);

    expect((await hook(sixth)).voiceCount).toBe(0);
    expect((await hook(sixth)).soundingHz).toBe(0);
  });

  test('leaves nothing running when windows come and go', async ({ context }) => {
    const [keeper] = await openVoices(context, 1);
    await expect.poll(async () => (await hook(keeper)).oscillatorCount, SETTLE).toBe(4);

    for (let i = 0; i < 10; i += 1) {
      const [visitor] = await openVoices(context, 1);
      await expect.poll(async () => (await hook(visitor)).voiceCount, SETTLE).toBe(1);
      await visitor.close();
    }

    // The keeper has been demoted and promoted ten times over and must still
    // own exactly one voice and its four sources.
    await expect.poll(() => rosterSize(keeper), { timeout: 3500 }).toBe(1);
    await expect.poll(async () => (await hook(keeper)).voiceCount, SETTLE).toBe(1);
    await expect.poll(async () => (await hook(keeper)).oscillatorCount, SETTLE).toBe(4);
  });
});
