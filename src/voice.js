import { gain, lowpass, osc } from './nodes.js';

const ATTACK_S = 1.5;
const RELEASE_S = 2.0;
const GLIDE_S = 0.25;
const LEVEL = 0.14;

let liveVoices = 0;
let liveOscillators = 0;

export const voiceCount = () => liveVoices;
export const oscillatorCount = () => liveOscillators;

/**
 * Freeze an AudioParam at whatever it is doing now so a ramp can start cleanly
 * from there. cancelScheduledValues alone would snap it back to the last
 * scheduled value, which is exactly the click this piece cannot afford.
 *
 * @param {AudioParam} param
 * @param {number} now
 */
function hold(param, now) {
  const cancel = param.cancelAndHoldAtTime ?? /** @type {any} */ (param).webkitCancelAndHoldAtTime;
  if (cancel) cancel.call(param, now);
  else param.cancelScheduledValues(now);
}

/** One sustained voice: two detuned oscillators, a vibrato, and a slow breath. */
export class Voice {
  /**
   * @param {{ ctx: AudioContext, bus: GainNode }} engine
   * @param {number} hz
   */
  constructor(engine, hz) {
    const { ctx, bus } = engine;
    this.ctx = ctx;
    this.hz = hz;
    this.disposed = false;

    const env = gain(ctx, 0);
    const tone = lowpass(ctx, Math.max(900, hz * 5));
    const body = osc(ctx, 'sine', hz, -6);
    const air = osc(ctx, 'triangle', hz, 7);
    const bodyLevel = gain(ctx, 0.62);
    const airLevel = gain(ctx, 0.3);
    const vibrato = osc(ctx, 'sine', 4.4);
    const vibratoDepth = gain(ctx, 4.5);
    const breath = osc(ctx, 'sine', 0.085);
    const breathDepth = gain(ctx, 0.035);

    body.connect(bodyLevel).connect(tone);
    air.connect(airLevel).connect(tone);
    tone.connect(env).connect(bus);
    vibrato.connect(vibratoDepth);
    vibratoDepth.connect(body.detune);
    vibratoDepth.connect(air.detune);
    breath.connect(breathDepth).connect(env.gain);

    this.env = env;
    this.tone = tone;
    this.pitched = [body, air];
    this.sources = [body, air, vibrato, breath];

    for (const source of this.sources) source.start();
    liveVoices += 1;
    liveOscillators += this.sources.length;

    // Three time constants is the whole attack, so the note arrives over about
    // a second and a half rather than appearing.
    env.gain.setTargetAtTime(LEVEL, ctx.currentTime, ATTACK_S / 3);
  }

  /** The frequency the oscillators are actually at, mid-glide included. */
  get soundingHz() {
    return this.pitched[0].frequency.value;
  }

  get level() {
    return this.env.gain.value;
  }

  /** @param {number} hz */
  glideTo(hz) {
    if (this.disposed || hz === this.hz || !(hz > 0)) return;
    this.hz = hz;

    const now = this.ctx.currentTime;
    const arrive = now + GLIDE_S;
    for (const pitched of this.pitched) {
      hold(pitched.frequency, now);
      pitched.frequency.exponentialRampToValueAtTime(hz, arrive);
    }
    hold(this.tone.frequency, now);
    this.tone.frequency.linearRampToValueAtTime(Math.max(900, hz * 5), arrive);
  }

  /** Ramp out over two seconds, then stop. Safe to call twice. */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    liveVoices -= 1;

    const now = this.ctx.currentTime;
    hold(this.env.gain, now);
    this.env.gain.setTargetAtTime(0, now, RELEASE_S / 3);

    setTimeout(() => {
      for (const source of this.sources) {
        try {
          source.stop();
        } catch {
          // Already stopped; nothing to undo.
        }
        source.disconnect();
      }
      liveOscillators -= this.sources.length;
      this.sources = [];
      this.pitched = [];
    }, RELEASE_S * 1000);
  }
}
