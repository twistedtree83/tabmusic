import { gain, lowpass } from './nodes.js';

export const REVERB_SECONDS = 3.5;
const REVERB_DECAY = 3.2;
const REVERB_TONE_HZ = 2600;
const ECHO_SECONDS = 0.47;

/**
 * Noise under an exponential decay, written into a buffer.
 *
 * Takes the context rather than making one so it can be exercised in Node
 * against a stub — the shape of the tail is the part worth testing, and it does
 * not need an audio device to be wrong.
 *
 * @param {BaseAudioContext} ctx
 * @param {number} seconds
 * @returns {AudioBuffer}
 */
export function decayingNoise(ctx, seconds) {
  const length = Math.floor(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

  for (let channel = 0; channel < 2; channel += 1) {
    const samples = buffer.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      samples[i] = (Math.random() * 2 - 1) * (1 - i / length) ** REVERB_DECAY;
    }
  }
  return buffer;
}

/**
 * The reverb tail, computed rather than fetched. The offline pass bakes a
 * lowpass into the impulse so the room is darker than white noise and the
 * convolver stays cheap at playback.
 *
 * @param {number} sampleRate
 * @returns {Promise<AudioBuffer>}
 */
export function renderImpulse(sampleRate) {
  const length = Math.floor(sampleRate * REVERB_SECONDS);
  const offline = new OfflineAudioContext(2, length, sampleRate);

  const source = offline.createBufferSource();
  source.buffer = decayingNoise(offline, REVERB_SECONDS);

  source.connect(lowpass(offline, REVERB_TONE_HZ)).connect(offline.destination);
  source.start();
  return offline.startRendering();
}

/**
 * The room every voice sings into: one context, one bus, and the reverb, echo
 * and analyser hung off it in parallel.
 *
 * Constructed synchronously so the context and its resume() both happen inside
 * the gesture that asked for them; the impulse response fills in a few
 * milliseconds later and the reverb is silent until it does.
 */
export function startEngine() {
  const Ctx = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
  const ctx = new Ctx();
  ctx.resume();

  const bus = gain(ctx, 0.9);

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.85;

  const reverb = ctx.createConvolver();
  const wet = gain(ctx, 0.55);

  const delay = ctx.createDelay(2);
  delay.delayTime.value = ECHO_SECONDS;
  const feedback = gain(ctx, 0.48);
  const echo = gain(ctx, 0.22);

  // Everything taps the bus in parallel; nothing sits in series with the dry
  // path, so a voice is never coloured by the room on its way to the speakers.
  bus.connect(ctx.destination);
  bus.connect(analyser);
  bus.connect(reverb);
  bus.connect(delay);
  reverb.connect(wet).connect(ctx.destination);
  delay.connect(feedback).connect(delay);
  delay.connect(echo).connect(ctx.destination);

  const ready = renderImpulse(ctx.sampleRate).then((impulse) => {
    reverb.buffer = impulse;
  });

  // A browser allows only a handful of audio contexts at once, so a window that
  // is going away has to hand its one back. pagehide rather than
  // visibilitychange: a backgrounded window must keep singing.
  addEventListener('pagehide', () => ctx.close(), { once: true });

  return {
    ctx,
    bus,
    analyser,
    ready,
    get impulseSeconds() {
      return reverb.buffer ? reverb.buffer.duration : 0;
    },
  };
}
