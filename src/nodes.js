/**
 * Make-a-node-and-set-its-one-parameter, which the engine and every voice do
 * about a dozen times between them. Values are assigned here, before anything
 * has started — which is the only time assigning an AudioParam is allowed.
 */

/** @param {BaseAudioContext} ctx @param {number} value */
export const gain = (ctx, value) => {
  const node = ctx.createGain();
  node.gain.value = value;
  return node;
};

/** @param {BaseAudioContext} ctx @param {OscillatorType} type @param {number} hz @param {number} cents */
export const osc = (ctx, type, hz, cents = 0) => {
  const node = ctx.createOscillator();
  node.type = type;
  node.frequency.value = hz;
  node.detune.value = cents;
  return node;
};

/** @param {BaseAudioContext} ctx @param {number} hz */
export const lowpass = (ctx, hz) => {
  const node = ctx.createBiquadFilter();
  node.type = 'lowpass';
  node.frequency.value = hz;
  node.Q.value = 0.6;
  return node;
};
