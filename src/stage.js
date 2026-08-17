import { onFrame } from './frame.js';
import { reducedMotion } from './motion.js';
import { midiToHz } from './theory.js';

const INK = '#171715';
const AMBER = '#b8873f';
const BONE = '#f5f5f4';
const STROKE = 1.5;
const POINTS = 160;
const REACH = 0.34;
const BREATH_MS = 9000;

const SIBLING_ALPHA = 0.22;
const DRIFT = 0.08;
const GHOST_MS = 2000;
// The full range the chord can occupy: bass root up to an octave above descant.
const LOW = Math.log2(midiToHz(38));
const HIGH = Math.log2(midiToHz(83));

/**
 * Where a sibling's line sits: high pitch high on screen, on a log scale so an
 * octave is always the same distance.
 * @param {number} hz
 */
function rowFor(hz) {
  const at = Math.min(1, Math.max(0, (Math.log2(hz) - LOW) / (HIGH - LOW)));
  return 0.9 - at * 0.8;
}

/**
 * @typedef {{ id: string, hz: number }} Sibling
 * @typedef {{ y: number, target: number, left: number }} Rule
 */

/**
 * The stage: this window's own voice as a tapered stroke, and one faint rule
 * for every other voice in the chord.
 *
 * @param {HTMLElement} root
 * @param {AnalyserNode} analyser
 * @param {() => Sibling[]} siblings
 */
export function renderStage(root, analyser, siblings) {
  const canvas = document.createElement('canvas');
  canvas.className = 'stage';
  root.append(canvas);

  const paint = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  const samples = new Uint8Array(analyser.fftSize);
  /** @type {Map<string, Rule>} */
  const rules = new Map();
  let width = 0;
  let height = 0;

  // The backing store is sized in device pixels and the context scaled to
  // match, so a 1.5 px stroke is 1.5 CSS pixels on any display — and stays
  // right when the window is dragged onto a screen with a different ratio.
  const resize = () => {
    const ratio = window.devicePixelRatio || 1;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    paint.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  new ResizeObserver(resize).observe(canvas);
  resize();

  /** @param {number} now */
  function drawSiblings(now) {
    const present = new Set();
    for (const sibling of siblings()) {
      if (!sibling.hz) continue;
      present.add(sibling.id);
      const target = rowFor(sibling.hz);
      const rule = rules.get(sibling.id);
      if (rule) {
        rule.target = target;
        rule.left = 0;
      } else {
        rules.set(sibling.id, { y: target, target, left: 0 });
      }
    }

    paint.strokeStyle = BONE;
    for (const [id, rule] of rules) {
      const still = reducedMotion();
      if (!present.has(id) && !rule.left) rule.left = now;
      const fading = rule.left ? (still ? 1 : (now - rule.left) / GHOST_MS) : 0;
      if (fading >= 1) {
        rules.delete(id);
        continue;
      }

      // Lerped rather than moved, so a sibling drifts to its new pitch.
      rule.y += (rule.target - rule.y) * (still ? 1 : DRIFT);

      const remaining = 1 - fading;
      paint.globalAlpha = SIBLING_ALPHA * remaining;
      paint.lineWidth = STROKE * remaining;
      paint.beginPath();
      paint.moveTo(0, rule.y * height);
      paint.lineTo(width, rule.y * height);
      paint.stroke();
    }
  }

  onFrame((now) => {
    analyser.getByteTimeDomainData(samples);

    paint.globalAlpha = 1;
    paint.fillStyle = INK;
    paint.fillRect(0, 0, width, height);

    drawSiblings(now);

    const middle = height / 2;
    const reach = height * REACH;

    paint.beginPath();
    for (let i = 0; i <= POINTS; i += 1) {
      const at = Math.min(samples.length - 1, Math.round((i / POINTS) * samples.length));
      const swing = (samples[at] - 128) / 128;
      // Tapered to nothing at both ends, so the line begins and ends as a line.
      const taper = Math.sin((i / POINTS) * Math.PI);
      const x = (i / POINTS) * width;
      const y = middle - swing * reach * taper;
      if (i) paint.lineTo(x, y);
      else paint.moveTo(x, y);
    }

    const breath = reducedMotion() ? 1 : 0.5 + 0.5 * Math.sin((now / BREATH_MS) * Math.PI * 2);
    paint.globalAlpha = 0.5 + 0.45 * breath;
    paint.strokeStyle = AMBER;
    paint.lineWidth = STROKE;
    paint.lineCap = 'round';
    paint.stroke();
    paint.globalAlpha = 1;
  });
}
