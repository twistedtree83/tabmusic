import { expect, test } from './fixtures.js';
import { openVoices, readPosition, readRoster, rosterSize, selfId } from './windows.js';

const SETTLE = { timeout: 6000 };

// D Dorian: D E F G A B C.
const SCALE_PCS = [2, 4, 5, 7, 9, 11, 0];
const pc = (/** @type {number} */ midi) => ((midi % 12) + 12) % 12;

test.describe('pitch', () => {
  test('reports its position, degree, note and frequency', async ({ context }) => {
    const [page] = await openVoices(context, 1);
    const here = await readPosition(page);

    expect(here.t).toBeGreaterThanOrEqual(0);
    expect(here.t).toBeLessThanOrEqual(1);
    expect(here.degree).toBeGreaterThanOrEqual(0);
    expect(here.degree).toBeLessThanOrEqual(6);
    // Alone, this window is bass: D2 to just under D3.
    expect(here.midi).toBeGreaterThanOrEqual(38);
    expect(here.midi).toBeLessThan(50);
    expect(SCALE_PCS).toContain(pc(here.midi));
    expect(here.hz).toBeCloseTo(440 * 2 ** ((here.midi - 69) / 12), 1);
  });

  test('every window hears what every other window is singing', async ({ context }) => {
    const pages = await openVoices(context, 3);
    for (const page of pages) await expect.poll(() => rosterSize(page), SETTLE).toBe(3);

    for (const page of pages) {
      await expect
        .poll(async () => (await readRoster(page)).every((row) => row.hz > 0), SETTLE)
        .toBe(true);
    }

    // All three agree on all three pitches, not just on their own.
    const heard = await Promise.all(
      pages.map(async (page) =>
        (await readRoster(page)).map((row) => `${row.id}@${row.hz.toFixed(1)}`).join('|'),
      ),
    );
    expect(new Set(heard).size).toBe(1);
  });

  test('gives each role its own register, low to high', async ({ context }) => {
    const pages = await openVoices(context, 5);
    for (const page of pages) await expect.poll(() => rosterSize(page), SETTLE).toBe(5);
    await expect
      .poll(async () => (await readRoster(pages[0])).every((row) => row.hz > 0), SETTLE)
      .toBe(true);

    const roster = await readRoster(pages[0]);
    expect(roster.map((row) => row.role)).toEqual([
      'bass',
      'tenor',
      'alto',
      'soprano',
      'descant',
    ]);

    const pitches = roster.map((row) => row.hz);
    expect(pitches).toEqual([...pitches].sort((a, b) => a - b));
    expect(pitches[4]).toBeGreaterThan(pitches[0] * 4);
  });

  test('re-voices into a new register when the window above it closes', async ({ context }) => {
    const [a, b] = await openVoices(context, 2);
    await expect.poll(() => rosterSize(b), SETTLE).toBe(2);
    const before = await readPosition(b);
    expect(before.midi).toBeGreaterThanOrEqual(50); // tenor

    await a.close();
    await expect.poll(() => rosterSize(b), { timeout: 3500 }).toBe(1);
    await expect.poll(async () => (await readPosition(b)).midi < 50, SETTLE).toBe(true);

    const after = await readPosition(b);
    expect(after.midi).toBeGreaterThanOrEqual(38); // now bass
    expect(SCALE_PCS).toContain(pc(after.midi));
    // The window has not moved, so it lands on the same degree an octave down.
    expect(after.t).toBeCloseTo(before.t, 6);
    expect(after.degree).toBe(before.degree);
    expect(before.midi - after.midi).toBe(12);
  });

  test('a listener reports no note at all', async ({ context }) => {
    const pages = await openVoices(context, 6);
    await expect.poll(() => rosterSize(pages[5]), SETTLE).toBe(6);

    const here = await readPosition(pages[5]);
    expect(here.midi).toBe(0);
    expect(here.degree).toBe(-1);

    const id = await selfId(pages[5]);
    const me = (await readRoster(pages[5])).find((row) => row.id === id);
    expect(me?.hz).toBe(0);
  });
});
