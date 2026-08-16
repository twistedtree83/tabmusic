import { describe, expect, it } from 'vitest';
import { assignRoles, sortRoster, stale } from '../../src/roster.js';

/** @param {[string, number][]} pairs */
const members = (pairs) => pairs.map(([id, joinedAt]) => ({ id, joinedAt }));
/** @param {{id: string}[]} list */
const ids = (list) => list.map((m) => m.id);

describe('sortRoster', () => {
  it('returns the same order whatever order it is given', () => {
    const shuffles = [
      members([
        ['c', 30],
        ['a', 10],
        ['b', 20],
      ]),
      members([
        ['a', 10],
        ['b', 20],
        ['c', 30],
      ]),
      members([
        ['b', 20],
        ['c', 30],
        ['a', 10],
      ]),
    ];
    for (const shuffle of shuffles) {
      expect(ids(sortRoster(shuffle))).toEqual(['a', 'b', 'c']);
    }
  });

  it('breaks a tied joinedAt by id, deterministically', () => {
    const tied = members([
      ['zeta', 100],
      ['alpha', 100],
      ['mu', 100],
    ]);
    expect(ids(sortRoster(tied))).toEqual(['alpha', 'mu', 'zeta']);
    expect(ids(sortRoster([...tied].reverse()))).toEqual(['alpha', 'mu', 'zeta']);
  });

  it('puts the earlier joiner first even when its id sorts later', () => {
    const list = members([
      ['zzz', 1],
      ['aaa', 2],
    ]);
    expect(ids(sortRoster(list))).toEqual(['zzz', 'aaa']);
  });

  it('does not mutate its argument', () => {
    const list = members([
      ['b', 2],
      ['a', 1],
    ]);
    sortRoster(list);
    expect(ids(list)).toEqual(['b', 'a']);
  });
});

describe('assignRoles', () => {
  /** @param {number} n */
  const seats = (n) =>
    assignRoles(sortRoster(members(Array.from({ length: n }, (_, i) => [`v${i}`, i]))));

  it('gives the first five voices the five singing roles, in order', () => {
    expect(seats(5).map((s) => s.role)).toEqual(['bass', 'tenor', 'alto', 'soprano', 'descant']);
  });

  it('makes every voice from the sixth onwards a listener', () => {
    expect(seats(8).map((s) => s.role).slice(5)).toEqual(['listener', 'listener', 'listener']);
  });

  it('numbers ranks from zero', () => {
    expect(seats(3).map((s) => s.rank)).toEqual([0, 1, 2]);
  });

  it('promotes exactly the voices below a departure, and no others', () => {
    const before = seats(6);
    const after = assignRoles(sortRoster(before.filter((s) => s.rank !== 2)));

    expect(after.map((s) => s.id)).toEqual(['v0', 'v1', 'v3', 'v4', 'v5']);
    // v0 and v1 sat above the gap and must not move.
    expect(after.slice(0, 2).map((s) => s.role)).toEqual(['bass', 'tenor']);
    // Everyone below it moves up exactly one seat.
    expect(after.slice(2).map((s) => s.role)).toEqual(['alto', 'soprano', 'descant']);
  });

  it('turns a listener into a singer when a singer leaves', () => {
    const before = seats(6);
    expect(before[5].role).toBe('listener');

    const after = assignRoles(sortRoster(before.filter((s) => s.rank !== 0)));
    expect(after[4]).toMatchObject({ id: 'v5', role: 'descant' });
  });
});

describe('stale', () => {
  const peers = [
    { id: 'fresh', seen: 9_500 },
    { id: 'throttled', seen: 7_600 },
    { id: 'gone', seen: 4_000 },
  ];

  it('names only the peers past the timeout', () => {
    expect(stale(peers, 10_000, 3000)).toEqual(['gone']);
  });

  it('tolerates a peer whose timer has been clamped by the background', () => {
    // A backgrounded window beats at roughly 1 s instead of 500 ms; 3000 ms of
    // slack is what stops that looking like a departure.
    expect(stale([{ id: 'clamped', seen: 8_900 }], 10_000, 3000)).toEqual([]);
  });

  it('is exclusive at the boundary', () => {
    expect(stale([{ id: 'exact', seen: 7_000 }], 10_000, 3000)).toEqual([]);
  });

  it('returns nothing for an empty roster', () => {
    expect(stale([], 10_000, 3000)).toEqual([]);
  });
});
