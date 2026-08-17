import { expect, test } from './fixtures.js';
import {
  lendVoice,
  openVoices,
  openWindows,
  ownRole,
  readRoster,
  rosterSize,
  selfId,
} from './windows.js';

// Settling a fresh roster is cheap; give it room without making it the point.
const SETTLE = { timeout: 6000 };
// A departure must land inside the 3000 ms prune timeout plus a little slack.
// This is the acceptance criterion, so it does not get to be generous.
const DEPART = { timeout: 3500 };

/** @param {import('./windows.js').Row[]} roster */
const signature = (roster) => roster.map((r) => `${r.rank}:${r.role}:${r.id}`).join('|');

test.describe('presence', () => {
  test('every window derives the same roster in the same order', async ({ context }) => {
    const pages = await openVoices(context, 3);

    for (const page of pages) {
      await expect.poll(() => rosterSize(page), SETTLE).toBe(3);
    }

    const rosters = await Promise.all(pages.map(readRoster));
    expect(new Set(rosters.map(signature)).size).toBe(1);
    expect(rosters[0].map((r) => r.role)).toEqual(['bass', 'tenor', 'alto']);
    expect(rosters[0].map((r) => r.rank)).toEqual([0, 1, 2]);
  });

  test('each window recognises exactly one row as itself', async ({ context }) => {
    const pages = await openVoices(context, 3);
    for (const page of pages) {
      await expect.poll(() => rosterSize(page), SETTLE).toBe(3);
    }

    const selves = await Promise.all(pages.map(selfId));
    expect(new Set(selves).size).toBe(3);
    for (const page of pages) {
      const mine = await selfId(page);
      expect((await readRoster(page)).filter((r) => r.id === mine)).toHaveLength(1);
    }
  });

  test('the window that lent its voice first sings bass', async ({ context }) => {
    const [first, second] = await openVoices(context, 2);
    await expect.poll(() => rosterSize(first), SETTLE).toBe(2);

    expect(await ownRole(first)).toBe('bass');
    expect(await ownRole(second)).toBe('tenor');
  });

  test('closing a window prunes it everywhere and re-voices the survivors', async ({ context }) => {
    const [a, b, c] = await openVoices(context, 3);
    for (const page of [a, b, c]) {
      await expect.poll(() => rosterSize(page), SETTLE).toBe(3);
    }

    const departed = await selfId(b);
    expect(await ownRole(c)).toBe('alto');
    await b.close();

    for (const page of [a, c]) {
      await expect.poll(() => rosterSize(page), DEPART).toBe(2);
      expect((await readRoster(page)).map((r) => r.id)).not.toContain(departed);
    }

    expect((await readRoster(a)).map((r) => r.role)).toEqual(['bass', 'tenor']);
    // c was alto and sat below the gap, so it moves up exactly one seat.
    expect(await ownRole(c)).toBe('tenor');
  });

  test('a window that has not lent its voice is in nobody’s roster', async ({ context }) => {
    const [singing] = await openVoices(context, 1);
    const [idle] = await openWindows(context, 1);

    await idle.waitForTimeout(1500);
    expect(await rosterSize(singing)).toBe(1);
    await expect(idle.locator('canvas.stage')).toHaveCount(0);

    // ...and joins the moment it does.
    await lendVoice(idle);
    await expect.poll(() => rosterSize(singing), DEPART).toBe(2);
  });

  test('a sixth window is a listener', async ({ context }) => {
    const pages = await openVoices(context, 6);
    await expect.poll(() => rosterSize(pages[5]), SETTLE).toBe(6);

    expect(await ownRole(pages[5])).toBe('listener');
    expect((await readRoster(pages[5])).map((r) => r.role)).toEqual([
      'bass',
      'tenor',
      'alto',
      'soprano',
      'descant',
      'listener',
    ]);
  });

  test('a listener is promoted when a singer closes', async ({ context }) => {
    const pages = await openVoices(context, 6);
    await expect.poll(() => rosterSize(pages[5]), SETTLE).toBe(6);
    expect(await ownRole(pages[5])).toBe('listener');

    await pages[0].close();
    await expect.poll(() => rosterSize(pages[5]), DEPART).toBe(5);
    expect(await ownRole(pages[5])).toBe('descant');
  });

  test('a late window sees the whole chord without waiting for a beat', async ({ context }) => {
    const [a] = await openVoices(context, 3);
    await expect.poll(() => rosterSize(a), SETTLE).toBe(3);

    const [late] = await openWindows(context, 1);
    await lendVoice(late);
    // A stranger is answered at once, so the full roster lands well inside one
    // 500 ms heartbeat.
    await expect.poll(() => rosterSize(late), { timeout: 400 }).toBe(4);
  });
});
