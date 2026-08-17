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

  return (state) => {
    role.textContent = state.role;
    freq.textContent = state.hz ? `${state.hz.toFixed(1)} Hz` : '—';
    count.textContent = state.voices === 1 ? '1 voice' : `${state.voices} voices`;
  };
}
