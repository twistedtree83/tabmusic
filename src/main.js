import './styles.css';
import { renderGate } from './gate.js';
import { startEngine } from './engine.js';
import { onFrame } from './frame.js';
import { exposeHook } from './hook.js';
import { joinChoir } from './presence.js';
import { LISTENER } from './roster.js';
import { midiToHz, normalisePosition, quantise, roleOctave, ROLE_ROOTS } from './theory.js';
import { Voice, oscillatorCount, voiceCount } from './voice.js';

// There is no window-move event, so screenX is polled. Only a move worth
// hearing goes on the channel, which keeps it quiet while a window is dragged.
const MOVE_PX = 4;

/**
 * The peer layer, laid bare. The stage replaces this at T-08.
 * @param {import('./roster.js').Seat[]} roster
 * @param {string} selfId
 * @param {{ t: number, degree: number, midi: number }} here
 */
function describe(roster, selfId, here) {
  const voices = roster.length === 1 ? '1 voice' : `${roster.length} voices`;
  const hz = here.midi ? `${midiToHz(here.midi).toFixed(1)} Hz` : '—';
  const rows = roster.map((seat) => {
    const pitch = seat.hz ? `${seat.hz.toFixed(1)}Hz` : '—Hz';
    return (
      `#${seat.rank}  ${seat.role.padEnd(9)}${pitch.padStart(9)}  ` +
      `joined=${seat.joinedAt}  id=${seat.id}${seat.id === selfId ? '  self' : ''}`
    );
  });
  return [
    `tab choir · ${voices}`,
    `position t=${here.t.toFixed(4)}  degree=${here.degree}  midi=${here.midi || '—'}  ${hz}`,
    ...rows,
  ].join('\n');
}

renderGate(document.body, () => {
  // Built first and synchronously: the context and its resume() have to happen
  // inside the gesture that asked for them, or the autoplay policy suspends it.
  const engine = startEngine();

  const dump = document.createElement('pre');
  dump.className = 'roster-dump';
  document.body.append(dump);

  /** @type {import('./roster.js').Seat[]} */
  let roster = [];
  let selfId = '';
  let midi = 0;
  /** @type {Voice | null} */
  let voice = null;
  // Seeded before the first roster lands, so this window's opening note is the
  // one its position actually asks for rather than degree zero for a frame.
  let lastX = window.screenX;
  let t = normalisePosition(lastX, window.innerWidth, screen.width);

  const choir = joinChoir((next, id) => {
    roster = next;
    selfId = id;
    update();
  });

  /** The degree this window is on, or -1 when it is not singing. */
  const degree = () => {
    const me = roster.find((seat) => seat.id === selfId);
    if (!me || me.role === LISTENER) return -1;
    return roleOctave(ROLE_ROOTS[me.role]).indexOf(midi);
  };

  function retune() {
    const me = roster.find((seat) => seat.id === selfId);
    const next = me && me.role !== LISTENER ? quantise(t, me.role) : 0;
    if (next === midi) return false;
    midi = next;
    return true;
  }

  function update() {
    if (retune()) choir.setPitch(midi ? midiToHz(midi) : 0);

    if (midi && !voice) voice = new Voice(engine, midiToHz(midi));
    else if (midi && voice) voice.glideTo(midiToHz(midi));
    else if (!midi && voice) {
      voice.dispose();
      voice = null;
    }

    dump.textContent = describe(roster, selfId, { t, degree: degree(), midi });
  }

  exposeHook(() => ({
    ctxState: engine.ctx.state,
    impulseSeconds: engine.impulseSeconds,
    voiceCount: voiceCount(),
    oscillatorCount: oscillatorCount(),
    level: voice ? voice.level : 0,
    soundingHz: voice ? voice.soundingHz : 0,
    role: roster.find((seat) => seat.id === selfId)?.role ?? '',
    hz: midi ? midiToHz(midi) : 0,
    voices: roster.length,
  }));

  onFrame(() => {
    if (Math.abs(window.screenX - lastX) <= MOVE_PX) return;
    lastX = window.screenX;
    t = normalisePosition(window.screenX, window.innerWidth, screen.width);
    update();
  });
});
