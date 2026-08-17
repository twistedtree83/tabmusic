import { describe, expect, it } from 'vitest';
import {
  ROLE_ROOTS,
  SCALE_PCS,
  avoidTritone,
  chordPitch,
  hzToMidi,
  midiToHz,
  normalisePosition,
  quantise,
  roleOctave,
} from '../../src/theory.js';

const pc = (/** @type {number} */ midi) => ((midi % 12) + 12) % 12;
const roles = Object.keys(ROLE_ROOTS);

describe('the scale', () => {
  it('is D Dorian — D E F G A B C', () => {
    // D=2 E=4 F=5 G=7 A=9 B=11 C=0
    expect([...SCALE_PCS].sort((a, b) => a - b)).toEqual([0, 2, 4, 5, 7, 9, 11]);
  });

  it('roots every role on a note of the scale', () => {
    for (const role of roles) expect(SCALE_PCS).toContain(pc(ROLE_ROOTS[role]));
  });
});

describe('roleOctave', () => {
  it.each(roles)('gives %s exactly seven notes, all in key, all inside one octave', (role) => {
    const root = ROLE_ROOTS[role];
    const notes = roleOctave(root);

    expect(notes).toHaveLength(7);
    for (const note of notes) {
      expect(SCALE_PCS).toContain(pc(note));
      expect(note).toBeGreaterThanOrEqual(root);
      expect(note).toBeLessThan(root + 12);
    }
    expect(notes).toEqual([...notes].sort((a, b) => a - b));
  });

  it('is not the D-Dorian shape transposed — alto is the proof', () => {
    // A3 root. Offsetting D Dorian would give [0,2,3,5,7,9,10] and put an F# in
    // a piece that has no F#. Filtering the scale into the range gives F natural.
    const alto = roleOctave(ROLE_ROOTS.alto).map((n) => n - ROLE_ROOTS.alto);
    expect(alto).toEqual([0, 2, 3, 5, 7, 8, 10]);
    expect(alto).not.toEqual([0, 2, 3, 5, 7, 9, 10]);
  });

  it('keeps the D-Dorian shape for the D-rooted roles', () => {
    for (const role of ['bass', 'tenor']) {
      const shape = roleOctave(ROLE_ROOTS[role]).map((n) => n - ROLE_ROOTS[role]);
      expect(shape).toEqual([0, 2, 3, 5, 7, 9, 10]);
    }
  });

  it('never lets two roles share a note at the same rank', () => {
    const bass = roleOctave(ROLE_ROOTS.bass);
    const descant = roleOctave(ROLE_ROOTS.descant);
    expect(bass.every((n) => n < descant[0])).toBe(true);
  });
});

describe('normalisePosition', () => {
  it('puts a centred window at the middle of the range', () => {
    expect(normalisePosition(600, 400, 1600)).toBeCloseTo(0.5, 6);
  });

  it('clamps a window dragged off the left edge', () => {
    expect(normalisePosition(-2000, 800, 1600)).toBe(0);
  });

  it('clamps a window on a secondary display beyond screen.width', () => {
    // Safari reports screenX relative to the desktop, which can exceed the
    // primary screen's width. The clamp is what stops that becoming a NaN note.
    expect(normalisePosition(5000, 800, 1600)).toBe(1);
  });

  it('survives a screen width of zero', () => {
    expect(normalisePosition(100, 800, 0)).toBe(0);
  });
});

describe('quantise', () => {
  it.each(roles)('reaches all seven degrees of %s as t sweeps', (role) => {
    const seen = new Set();
    for (let t = 0; t <= 1.0001; t += 0.005) seen.add(quantise(t, role));
    expect(seen.size).toBe(7);
    expect([...seen].sort((a, b) => a - b)).toEqual(roleOctave(ROLE_ROOTS[role]));
  });

  it.each(roles)('never leaves the %s octave, even at the ends', (role) => {
    const notes = roleOctave(ROLE_ROOTS[role]);
    expect(quantise(0, role)).toBe(notes[0]);
    expect(quantise(1, role)).toBe(notes[6]);
  });

  it('rises from left to right', () => {
    expect(quantise(0.1, 'tenor')).toBeLessThan(quantise(0.9, 'tenor'));
  });
});

describe('midiToHz', () => {
  it('puts concert A where it belongs', () => {
    expect(midiToHz(69)).toBe(440);
  });

  it('gives the bass root its 73.416 Hz', () => {
    expect(midiToHz(ROLE_ROOTS.bass)).toBeCloseTo(73.416, 3);
  });

  it('doubles across an octave', () => {
    expect(midiToHz(62)).toBeCloseTo(midiToHz(50) * 2, 9);
  });

  it('round-trips through hzToMidi for every note in the piece', () => {
    for (const role of roles) {
      for (const midi of roleOctave(ROLE_ROOTS[role])) {
        expect(hzToMidi(midiToHz(midi))).toBe(midi);
      }
    }
  });
});

describe('avoidTritone', () => {
  const F3 = 53;
  const B3 = 59;
  const B4 = 71;

  it.each([[[]], [[50]], [[38, 50, 57]], [[38, 50, 57, 64]], [[38, 50, 57, 64, 71]]])(
    'leaves %j alone — the rule is only for a duet',
    (midis) => {
      expect(avoidTritone(midis)).toEqual(midis);
    },
  );

  it('leaves a consonant pair alone', () => {
    expect(avoidTritone([38, 45])).toEqual([38, 45]);
  });

  it('lifts the higher voice of a tritone and leaves the lower one', () => {
    const [low, high] = avoidTritone([F3, B3]);
    expect(low).toBe(F3);
    expect(high).toBe(60); // B3 steps up to C4, the next note of the scale
  });

  it('preserves the order it was given', () => {
    expect(avoidTritone([B3, F3])).toEqual([60, F3]);
  });

  it('hears a tritone that spans more than an octave', () => {
    // F3 to B4 is 18 semitones — still a tritone once the octave is taken out.
    expect((B4 - F3) % 12).toBe(6);
    expect(avoidTritone([F3, B4])).toEqual([F3, 72]);
  });

  it('never returns a pair still a tritone apart, for any two notes in the piece', () => {
    const every = roles.flatMap((role) => roleOctave(ROLE_ROOTS[role]));
    for (const a of every) {
      for (const b of every) {
        const [x, y] = avoidTritone([a, b]);
        expect(Math.abs(x - y) % 12).not.toBe(6);
      }
    }
  });

  it('always lifts to a note that is still in the scale', () => {
    const every = roles.flatMap((role) => roleOctave(ROLE_ROOTS[role]));
    for (const a of every) {
      for (const b of every) {
        for (const note of avoidTritone([a, b])) expect(SCALE_PCS).toContain(pc(note));
      }
    }
  });
});

describe('chordPitch', () => {
  const F3 = 53;
  const B3 = 59;
  const hz = (/** @type {number} */ midi) => midiToHz(midi);

  it('is just the quantised note when this window sings alone', () => {
    expect(chordPitch(0.5, 'tenor', [])).toBe(quantise(0.5, 'tenor'));
  });

  it('is just the quantised note when three or more voices are sounding', () => {
    const crowd = [hz(F3), hz(B3), hz(45)];
    expect(chordPitch(0.5, 'tenor', crowd)).toBe(quantise(0.5, 'tenor'));
  });

  it('leaves a consonant duet alone', () => {
    const mine = quantise(0.5, 'tenor');
    expect(chordPitch(0.5, 'tenor', [hz(mine - 7)])).toBe(mine);
  });

  it('lifts this window when it is the upper voice of a tritone', () => {
    // Find a position where tenor lands on B3, a tritone above F3.
    const degrees = roleOctave(ROLE_ROOTS.tenor);
    const b = degrees.findIndex((n) => n === B3);
    expect(b).toBeGreaterThan(-1);

    const t = (b + 0.5) / degrees.length;
    expect(quantise(t, 'tenor')).toBe(B3);
    expect(chordPitch(t, 'tenor', [hz(F3)])).toBe(60);
  });

  it('leaves this window alone when it is the lower voice of a tritone', () => {
    const degrees = roleOctave(ROLE_ROOTS.tenor);
    const f = degrees.findIndex((n) => n === F3);
    const t = (f + 0.5) / degrees.length;
    expect(quantise(t, 'tenor')).toBe(F3);
    expect(chordPitch(t, 'tenor', [hz(B3)])).toBe(F3);
  });

  it('agrees with itself from both sides — the duet is never left a tritone', () => {
    const degrees = roleOctave(ROLE_ROOTS.tenor);
    for (let i = 0; i < degrees.length; i += 1) {
      const t = (i + 0.5) / degrees.length;
      for (const other of roleOctave(ROLE_ROOTS.alto)) {
        const mine = chordPitch(t, 'tenor', [hz(other)]);
        const theirs = avoidTritone([quantise(t, 'tenor'), other])[1];
        expect(Math.abs(mine - theirs) % 12).not.toBe(6);
      }
    }
  });
});
