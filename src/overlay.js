const ALONE = 'You are one voice. Open this page in another window.';
const MOVE = 'Now move your windows.';
const LISTENING =
  'The chord is full. This window listens, and will sing when another one closes.';
const FADE_MS = 1600;
const LINGER_MS = 9000;

import { reducedMotion } from './motion.js';

const MARKUP = `
  <p class="mark">Tab Choir</p>
  <div class="readout">
    <p class="readout-role"></p>
    <p class="readout-freq"></p>
    <p class="readout-count"></p>
  </div>
  <p class="hint"></p>
  <p class="status">window position sets pitch</p>`;

/**
 * The typographic layer above the stage. Real DOM rather than canvas text, so
 * it can be selected and read aloud.
 *
 * @param {HTMLElement} root
 * @returns {(state: { role: string, hz: number, voices: number, listening: boolean }) => void}
 */
export function renderOverlay(root) {
  const overlay = document.createElement('section');
  overlay.className = 'overlay';
  overlay.innerHTML = MARKUP;
  root.append(overlay);

  /** @param {string} selector */
  const part = (selector) => /** @type {HTMLElement} */ (overlay.querySelector(selector));
  const role = part('.readout-role');
  const freq = part('.readout-freq');
  const count = part('.readout-count');
  const hint = part('.hint');
  const status = part('.status');

  // Whether this window has ever had company. In memory only: no storage, no
  // URL state. A reloaded window is a new window and starts the piece again.
  let seenPeer = false;
  let lingering = false;
  let retired = false;

  /**
   * @param {string} line
   * @param {boolean} visible a retired hint stays gone, but a listener is owed
   *   an explanation whether or not the nudges have had their turn
   */
  function say(line, visible) {
    const show = visible ? '1' : '0';
    if (hint.textContent === line) {
      hint.style.opacity = show;
      return;
    }
    if (!hint.textContent) {
      hint.textContent = line;
      hint.style.opacity = show;
      return;
    }
    // Out, then in — the line is replaced rather than swapped under the reader.
    hint.style.opacity = '0';
    setTimeout(
      () => {
        hint.textContent = line;
        hint.style.opacity = show;
      },
      reducedMotion() ? 0 : FADE_MS,
    );
  }

  return (state) => {
    role.textContent = state.listening ? 'Listening' : state.role;
    freq.textContent = state.hz ? `${state.hz.toFixed(1)} Hz` : '—';
    count.textContent = state.voices === 1 ? '1 voice' : `${state.voices} voices`;
    status.textContent = state.listening ? 'silent' : 'window position sets pitch';

    if (state.voices > 1) seenPeer = true;
    if (state.listening) say(LISTENING, true);
    else say(seenPeer ? MOVE : ALONE, !retired);

    if (seenPeer && !state.listening && !lingering) {
      lingering = true;
      setTimeout(() => {
        retired = true;
        hint.style.opacity = '0';
      }, FADE_MS + LINGER_MS);
    }
  };
}
