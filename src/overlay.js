const ALONE = 'You are one voice. Open this page in another window.';
const MOVE = 'Now move your windows.';
const FADE_MS = 1600;
const LINGER_MS = 9000;

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
 * @returns {(state: { role: string, hz: number, voices: number }) => void}
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

  // Whether this window has ever had company. In memory only: no storage, no
  // URL state. A reloaded window is a new window and starts the piece again.
  let seenPeer = false;
  let lingering = false;

  /** @param {string} line */
  function say(line) {
    if (hint.textContent === line) return;
    if (!hint.textContent) {
      hint.textContent = line;
      hint.style.opacity = '1';
      return;
    }
    // Out, then in — the line is replaced rather than swapped under the reader.
    hint.style.opacity = '0';
    setTimeout(() => {
      hint.textContent = line;
      hint.style.opacity = '1';
    }, FADE_MS);
  }

  return (state) => {
    role.textContent = state.role;
    freq.textContent = state.hz ? `${state.hz.toFixed(1)} Hz` : '—';
    count.textContent = state.voices === 1 ? '1 voice' : `${state.voices} voices`;

    if (state.voices > 1) seenPeer = true;
    say(seenPeer ? MOVE : ALONE);

    if (seenPeer && !lingering) {
      lingering = true;
      setTimeout(() => {
        hint.style.opacity = '0';
      }, FADE_MS + LINGER_MS);
    }
  };
}
