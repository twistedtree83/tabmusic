import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { REVERB_SECONDS, decayingNoise } from '../../src/engine.js';

const source = readFileSync('src/engine.js', 'utf8');

/** A BaseAudioContext with just enough of one to build a buffer. */
const stubContext = (sampleRate = 8000) => ({
  sampleRate,
  /** @param {number} channels @param {number} length */
  createBuffer(channels, length) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return {
      length,
      numberOfChannels: channels,
      sampleRate,
      duration: length / sampleRate,
      /** @param {number} c */
      getChannelData: (c) => data[c],
    };
  },
});

/** @param {Float32Array} samples */
const rms = (samples) =>
  Math.sqrt(samples.reduce((total, x) => total + x * x, 0) / samples.length);

/** @param {Float32Array} samples @param {number} from @param {number} to */
const slice = (samples, from, to) =>
  samples.slice(Math.floor(samples.length * from), Math.floor(samples.length * to));

describe('the impulse response', () => {
  const ctx = /** @type {any} */ (stubContext());
  const buffer = decayingNoise(ctx, REVERB_SECONDS);
  const samples = buffer.getChannelData(0);

  it('is three and a half seconds long', () => {
    expect(buffer.duration).toBeCloseTo(3.5, 6);
    expect(buffer.numberOfChannels).toBe(2);
  });

  it('decays to almost nothing by the end of the tail', () => {
    const head = rms(slice(samples, 0, 0.1));
    const tail = rms(slice(samples, 0.9, 1));
    expect(head).toBeGreaterThan(0);
    expect(tail).toBeLessThan(head / 20);
  });

  it('decays monotonically, tenth by tenth', () => {
    const tenths = Array.from({ length: 10 }, (_, i) => rms(slice(samples, i / 10, (i + 1) / 10)));
    for (let i = 1; i < tenths.length; i += 1) {
      expect(tenths[i]).toBeLessThan(tenths[i - 1]);
    }
  });

  it('is noise, not a tone — both channels differ', () => {
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    expect(left.slice(0, 64)).not.toEqual(right.slice(0, 64));
  });

  it('never clips', () => {
    for (const sample of samples) expect(Math.abs(sample)).toBeLessThanOrEqual(1);
  });
});

describe('engine discipline', () => {
  it('fetches nothing — the room is arithmetic', () => {
    expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|decodeAudioData/);
  });

  it('renders the impulse in an OfflineAudioContext', () => {
    expect(source).toContain('new OfflineAudioContext');
  });

  it('hangs the room off the bus in parallel, never in series with the dry path', () => {
    for (const wire of [
      'bus.connect(ctx.destination)',
      'bus.connect(analyser)',
      'bus.connect(reverb)',
      'bus.connect(delay)',
    ]) {
      expect(source).toContain(wire);
    }
    // A return leg into the bus would put the room in front of the speakers.
    expect(source).not.toMatch(/(?:reverb|wet|delay|echo|feedback|analyser)\.connect\(bus\)/);
  });

  it('gives the analyser the fft size the stage expects', () => {
    expect(source).toMatch(/analyser\.fftSize = 2048/);
  });

  it('builds the context lazily, inside a call rather than at module load', () => {
    const beforeFirstFunction = source.slice(0, source.indexOf('export function decayingNoise'));
    expect(beforeFirstFunction).not.toContain('new ');
  });
});
