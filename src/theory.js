const D = 2;
const DORIAN = [0, 2, 3, 5, 7, 9, 10];

export const SCALE_PCS = DORIAN.map((semitones) => (D + semitones) % 12);

/** Stacked fifths: D2, D3, A3, E4, B4. @type {Record<string, number>} */
export const ROLE_ROOTS = { bass: 38, tenor: 50, alto: 57, soprano: 64, descant: 71 };

/** @param {number} midi */
const inScale = (midi) => SCALE_PCS.includes(((midi % 12) + 12) % 12);

/**
 * The seven notes of the scale that fall inside one octave above the root.
 *
 * Derived by filtering the scale into the range, never by adding a fixed list
 * of offsets to the root. Dorian is not transposition-invariant across its own
 * degrees: an A root yields [0,2,3,5,7,8,10] where a D root yields
 * [0,2,3,5,7,9,10]. Offsetting puts an F sharp in a piece that has no F sharp,
 * which sounds almost right — and almost right is worse than wrong.
 *
 * @param {number} root
 * @returns {number[]}
 */
export function roleOctave(root) {
  const notes = [];
  for (let midi = root; midi < root + 12; midi += 1) if (inScale(midi)) notes.push(midi);
  return notes;
}

/**
 * Where this window sits across the desktop, 0 at the left edge, 1 at the right.
 *
 * @param {number} screenX
 * @param {number} innerWidth
 * @param {number} screenWidth
 */
export function normalisePosition(screenX, innerWidth, screenWidth) {
  if (!(screenWidth > 0)) return 0;
  const centre = screenX + innerWidth / 2;
  return Math.min(1, Math.max(0, centre / screenWidth));
}

/**
 * @param {number} t
 * @param {string} role
 * @returns {number}
 */
export function quantise(t, role) {
  const notes = roleOctave(ROLE_ROOTS[role]);
  const degree = Math.min(notes.length - 1, Math.max(0, Math.floor(t * notes.length)));
  return notes[degree];
}

/** @param {number} midi */
export const midiToHz = (midi) => 440 * 2 ** ((midi - 69) / 12);

/**
 * The one harmonic special case in the piece. Six semitones apart, modulo the
 * octave, is the only interval this scale can produce that genuinely clashes,
 * and it only arises when the chord is down to a duet — so the upper voice
 * steps up to the next note of the scale and the lower one stays put.
 *
 * @param {number[]} midis
 * @returns {number[]}
 */
export function avoidTritone(midis) {
  if (midis.length !== 2) return midis;

  const [low, high] = [...midis].sort((a, b) => a - b);
  if (Math.abs(high - low) % 12 !== 6) return midis;

  let lifted = high + 1;
  while (!inScale(lifted)) lifted += 1;
  return midis.map((midi) => (midi === high ? lifted : midi));
}
