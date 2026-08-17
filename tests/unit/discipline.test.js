import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const presence = readFileSync('src/presence.js', 'utf8');
const main = readFileSync('src/main.js', 'utf8');
const frame = readFileSync('src/frame.js', 'utf8');
const voice = readFileSync('src/voice.js', 'utf8');

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

describe('frame discipline', () => {
  it('keeps the only animation frame loop in frame.js', () => {
    expect(frame).toContain('requestAnimationFrame');
    for (const [name, source] of [
      ['main.js', main],
      ['presence.js', presence],
    ]) {
      expect(source, `${name} must subscribe to the loop, not start one`).not.toContain(
        'requestAnimationFrame',
      );
    }
  });

  it('names the move threshold once instead of inlining it', () => {
    expect(main).toMatch(/const MOVE_PX = 4/);
    expect(main.match(/\bMOVE_PX\b/g)).toHaveLength(2);
  });

  it('polls screenX rather than waiting for an event that does not exist', () => {
    expect(main).toContain('window.screenX');
    expect(main).not.toMatch(/addEventListener\(\s*['"](?:move|resize)['"]/);
  });
});

describe('audio param discipline', () => {
  // The rule is "no .value = after the node has started". In voice.js every
  // source is started at the end of the constructor, so textual order is a
  // faithful proxy: anything after the first start() runs on a live graph.
  // engine.js is exempt by construction — it starts nothing that keeps playing.
  it('never jumps a parameter on a running voice', () => {
    const firstStart = voice.indexOf('.start()');
    expect(firstStart).toBeGreaterThan(-1);

    const afterStart = voice.slice(firstStart);
    const jumps = [...afterStart.matchAll(/\.value\s*=/g)].map((m) => m[0]);
    expect(jumps, 'ramp it with setTargetAtTime or a ramp, never assign').toEqual([]);
  });

  it('ramps out and glides with the durations the piece is written around', () => {
    expect(voice).toMatch(/const ATTACK_S = 1\.5/);
    expect(voice).toMatch(/const RELEASE_S = 2\.0/);
    expect(voice).toMatch(/const GLIDE_S = 0\.25/);
    expect(voice.match(/\bGLIDE_S\b/g)).toHaveLength(2);
  });

  it('stops its sources only after the release has run', () => {
    expect(voice).toMatch(/setTimeout\([\s\S]{0,400}?RELEASE_S \* 1000\)/);
  });

  it('carries a vibrato and a breath, on detune and on the envelope', () => {
    expect(voice).toContain('vibratoDepth.connect(body.detune)');
    expect(voice).toContain('vibratoDepth.connect(air.detune)');
    expect(voice).toContain('breath.connect(breathDepth).connect(env.gain)');
  });
});

describe('stage discipline', () => {
  const stage = readFileSync('src/stage.js', 'utf8');

  it('names the drift and the ghost lifetime once each', () => {
    expect(stage).toMatch(/const DRIFT = 0\.08/);
    expect(stage.match(/\bDRIFT\b/g)).toHaveLength(2);
    expect(stage).toMatch(/const GHOST_MS = 2000/);
    expect(stage.match(/\bGHOST_MS\b/g)).toHaveLength(2);
  });

  it('draws siblings in bone at the opacity the design asks for', () => {
    expect(stage).toMatch(/const SIBLING_ALPHA = 0\.22/);
    expect(stage).toContain("const BONE = '#f5f5f4'");
  });

  it('resizes from a ResizeObserver rather than a window event', () => {
    expect(stage).toContain('new ResizeObserver');
    expect(stage).not.toMatch(/addEventListener\(\s*['"]resize['"]/);
  });
});
