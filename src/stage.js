import { onFrame } from './frame.js';

const INK = '#171715';
const AMBER = '#b8873f';
const STROKE = 1.5;
const POINTS = 160;
const REACH = 0.34;
const BREATH_MS = 9000;

/**
 * The stage: this window's own voice, drawn from the analyser as a single
 * tapered stroke. A horizontal line at rest, deforming with what it hears.
 *
 * @param {HTMLElement} root
 * @param {AnalyserNode} analyser
 */
export function renderStage(root, analyser) {
  const canvas = document.createElement('canvas');
  canvas.className = 'stage';
  root.append(canvas);

  const paint = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  const samples = new Uint8Array(analyser.fftSize);
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

  onFrame((now) => {
    analyser.getByteTimeDomainData(samples);

    paint.fillStyle = INK;
    paint.fillRect(0, 0, width, height);

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

    paint.globalAlpha = 0.5 + 0.45 * (0.5 + 0.5 * Math.sin((now / BREATH_MS) * Math.PI * 2));
    paint.strokeStyle = AMBER;
    paint.lineWidth = STROKE;
    paint.lineCap = 'round';
    paint.stroke();
    paint.globalAlpha = 1;
  });
}
