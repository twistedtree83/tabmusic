import './styles.css';
import { renderGate } from './gate.js';
import { startEngine } from './engine.js';
import { onFrame } from './frame.js';
import { exposeHook } from './hook.js';
import { isNarrow, renderNarrow } from './narrow.js';
import { renderOverlay } from './overlay.js';
import { joinChoir } from './presence.js';
import { LISTENER } from './roster.js';
import { renderStage } from './stage.js';
import { chordPitch, midiToHz, normalisePosition, roleOctave, ROLE_ROOTS } from './theory.js';
import { Voice, oscillatorCount, voiceCount } from './voice.js';

// There is no window-move event, so screenX is polled. Only a move worth
// hearing goes on the channel, which keeps it quiet while a window is dragged.
const MOVE_PX = 4;

if (isNarrow()) renderNarrow(document.body);
else renderGate(document.body, () => {
  // Built first and synchronously: the context and its resume() have to happen
  // inside the gesture that asked for them, or the autoplay policy suspends it.
  const engine = startEngine();

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

  renderStage(document.body, engine.analyser, () =>
    roster
      .filter((seat) => seat.id !== selfId && seat.role !== LISTENER && seat.hz > 0)
      .map((seat) => ({ id: seat.id, hz: seat.hz })),
  );

  const showState = renderOverlay(document.body);

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
    const others = roster
      .filter((seat) => seat.id !== selfId && seat.role !== LISTENER && seat.hz > 0)
      .map((seat) => seat.hz);

    const next = me && me.role !== LISTENER ? chordPitch(t, me.role, others) : 0;
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

    showState({
      role: roster.find((seat) => seat.id === selfId)?.role ?? '',
      hz: midi ? midiToHz(midi) : 0,
      voices: roster.length,
    });
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
    selfId,
    t,
    degree: degree(),
    midi,
    roster: roster.map((seat) => ({ id: seat.id, rank: seat.rank, role: seat.role, hz: seat.hz })),
  }));

  onFrame(() => {
    if (Math.abs(window.screenX - lastX) <= MOVE_PX) return;
    lastX = window.screenX;
    t = normalisePosition(window.screenX, window.innerWidth, screen.width);
    update();
  });
});
