import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const presence = readFileSync('src/presence.js', 'utf8');

// These guard architectural rules that no behavioural test can see failing:
// each one is a bug that ships silently and only shows up as a voice that goes
// missing when a window is backgrounded.
describe('presence discipline', () => {
  it('beats from a timer, never from the animation frame', () => {
    expect(presence).toContain('setInterval');
    expect(presence).not.toContain('requestAnimationFrame');
  });

  it('says goodbye on pagehide rather than unload', () => {
    expect(presence).toContain('pagehide');
    expect(presence).not.toMatch(/['"]unload['"]/);
  });

  it('names the prune timeout once instead of inlining it', () => {
    const occurrences = presence.match(/\b3000\b/g) ?? [];
    expect(occurrences).toHaveLength(1);
    expect(presence).toMatch(/const PRUNE_MS = 3000/);
  });

  it('speaks only two kinds of message, so there is nothing to negotiate', () => {
    const kinds = [...presence.matchAll(/type: '([a-z]+)'/g)].map((m) => m[1]);
    expect(new Set(kinds)).toEqual(new Set(['hb', 'bye']));
  });
});
