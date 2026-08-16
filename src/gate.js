const MARKUP = `
  <p class="eyebrow">A chord for open windows</p>
  <h1 class="wordmark">Tab Choir</h1>
  <div class="hairline"></div>
  <p class="standfirst">Every window of this page holds one sustained voice. Together they make a chord, and moving a window moves its note.</p>
  <div class="gate-foot">
    <span class="join" role="button" tabindex="0">Lend a voice</span>
    <span class="gate-note">sound begins on your gesture</span>
  </div>`;

/**
 * The entry screen. Nothing of the stage exists until this calls back.
 * @param {HTMLElement} root
 * @param {() => void} onJoin
 */
export function renderGate(root, onJoin) {
  const gate = document.createElement('section');
  gate.className = 'gate';
  gate.innerHTML = MARKUP;

  const join = /** @type {HTMLElement} */ (gate.querySelector('.join'));
  const enter = () => {
    gate.remove();
    onJoin();
  };

  join.addEventListener('click', enter);
  join.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    enter();
  });

  root.append(gate);
}
