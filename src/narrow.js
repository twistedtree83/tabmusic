const MIN_WIDTH = 760;

const MARKUP = `
  <p class="eyebrow narrow-eyebrow">Tab Choir</p>
  <p class="narrow-lead">This piece is played with windows.</p>
  <div class="narrow-rule"></div>
  <p class="narrow-body">Each window sings one note, and the position of each window sets its pitch. A phone has one window and no way to move it, so there is nothing here to play. Come back on a desktop and open this page several times.</p>`;

/**
 * A phone has one window it cannot move, so the mechanic has nothing to work
 * with. Checked before anything else is built: no context, no channel, no loop.
 */
export const isNarrow = () =>
  matchMedia('(pointer: coarse)').matches || window.innerWidth < MIN_WIDTH;

/** @param {HTMLElement} root */
export function renderNarrow(root) {
  const screen = document.createElement('section');
  screen.className = 'narrow';
  screen.innerHTML = MARKUP;
  root.append(screen);
}
