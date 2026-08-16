# CONTEXT — Tab Choir domain model

The vocabulary of this project. Use these words exactly; they map one-to-one onto modules,
functions and test names. If you need a noun that isn't here, stop and ask rather than
inventing one silently.

Australian spelling throughout: *normalise*, *colour*, *behaviour*, *centre*, *recognise*,
*modelled*. The exception is web platform API surface — `color`, `center`, `analyser` (which is
spelled with an `s` anyway), `visualization` if a DOM API demands it. Never rename a platform
identifier to suit the house style.

---

## The instrument

**Window** — a browser window. Moving a window is how a person plays this piece. **Every piece
of user-facing copy says "window", never "tab"**, because `window.screenX` is a per-window
value: two tabs inside one window report the same position and therefore sing the same note.
The project is called Tab Choir; that is the only place the word "tab" appears in copy.

**Voice** — one page instance that is sounding. The word does double duty deliberately: it is
the unit of presence in the **roster**, and it is the audio object (`Voice`) that owns the
oscillators for that instance. A page that has not yet been clicked is not a voice.

**Peer** — another voice, known only through the **channel**. A peer is never observed
directly; everything known about it arrived in a **heartbeat**.

**Sibling** — a peer as drawn on the **stage**: one faint horizontal rule. "Peer" is the
presence-layer word, "sibling" is the rendering-layer word. Do not mix them.

**Ghost** — a peer that has left but is still being drawn while it fades out, for 2 s. A ghost
is not in the roster and never affects role assignment or the chord.

---

## Presence

**Channel** — the single `BroadcastChannel` named `tab-choir-v1`. Same-origin **and**
same-browser-profile. It never crosses devices, and no copy may imply that it does.

**Heartbeat** — the periodic message a voice broadcasts announcing itself: its `id`,
its `joinedAt`, its current pitch. Emitted from a `setInterval`, **never** from the rAF loop,
because a backgrounded window's rAF is throttled to a crawl and its membership must survive
that.

**Bye** — the message sent on `pagehide`. It is a courtesy, not a guarantee: it makes departure
instant when it arrives, and **prune** covers the case where it does not. We use `pagehide`
rather than `unload` because `unload` is not fired for pages entering the back/forward cache
and is deprecated; `pagehide` fires in both the discard and the bfcache path.

**Prune** — dropping a peer whose last heartbeat is older than the **prune timeout** of
**3000 ms**. The timeout is deliberately generous: background timers clamp to roughly one
second in several browsers, and a peer that is merely throttled must not be mistaken for a peer
that has closed.

**Roster** — the ordered list of every live voice *including this one*. Derived identically in
every window from the same inputs, so all windows agree without a server. Ordered by `joinedAt`
ascending, ties broken by `id` string comparison. **The ordering must be a total order and must
be deterministic** — this is the single property the whole piece rests on.

**Rank** — a voice's index in the roster. Rank determines **role**; nothing else does.

---

## Roles

**Role** — one of `bass`, `tenor`, `alto`, `soprano`, `descant`, or `listener`. Assigned purely
from rank: ranks 0–4 take the five singing roles in that order, rank 5 and above are listeners.

**Listener** — a voice at rank ≥ 5. Silent, but it renders the full chord and says so in plain
words. A listener is still in the roster and still counted in the voice count; it simply has no
`Voice`. When a singer leaves and a listener's rank drops below 5, it begins to sing.

**Role root** — the MIDI note a role's octave starts from:

| Role     | Root MIDI | Note |
| -------- | --------- | ---- |
| bass     | 38        | D2   |
| tenor    | 50        | D3   |
| alto     | 57        | A3   |
| soprano  | 64        | E4   |
| descant  | 71        | B4   |

A stacked-fifths voicing. Adjacent roles can overlap in range by up to a fifth, so the roster
order does not strictly guarantee non-crossing pitches; this is accepted, because every voice
is confined to the same **scale** and the **tritone rule** handles the one interval that would
actually clash.

**Re-voicing** — recomputing every voice's pitch after the roster changes. Because roles are
derived from rank and rank is derived from the deterministic roster, re-voicing needs no
negotiation: each window recomputes and arrives at the same answer.

---

## Pitch

**Scale** — D Dorian. Pitch classes D E F G A B C. Expressed as semitone offsets from D:
`[0, 2, 3, 5, 7, 9, 10]`.

**Scale member** — a MIDI note whose pitch class is in the scale.

**Role octave** — the seven scale members in `[root, root + 12)`. Note that this is **not**
`root + [0,2,3,5,7,9,10]`: Dorian is not transposition-invariant across its own degrees, so a
root of A3 yields the offsets `[0,2,3,5,7,8,10]`, not the D-Dorian shape. Always derive the
role octave by filtering scale members into the range. Getting this wrong produces a chord that
is subtly out of key and no test will catch it unless the test asserts pitch classes.

**Position** (`t`) — the normalised horizontal position of a window, in `[0, 1]`:

```
t = clamp((screenX + innerWidth / 2) / screen.width, 0, 1)
```

The clamp is load-bearing. On a secondary display `screenX` can exceed `screen.width`, and
Safari's `screen.width` is not the desktop width. `t` is polled in the rAF loop because there is
no window-move event; a change is only broadcast when `screenX` moves more than **4 px**, to
keep the channel quiet.

**Degree** — the index of a pitch within its role octave, `0..6`. Chosen by quantising `t`.

**Glide** — the 250 ms portamento to a new pitch. Audible portamento is the point of the piece,
not a smoothing artefact; do not shorten it to make transitions "cleaner".

**Tritone rule** — `avoidTritone(pitches) → pitches`. When exactly two voices remain and their
MIDI notes are 6 semitones apart modulo 12, the higher voice moves up to the next scale member.
Pure, total, and unit-tested; it is the only harmonic special case in the piece.

---

## Audio

**Engine** — the per-window audio graph shared by all voices in that window: the `AudioContext`,
the reverb, the delay, the master bus and the **analyser**. Created lazily inside the click
handler, never at module load, because of the autoplay policy — and `ctx.resume()` is called in
that same handler.

**Bus** — the summing gain that every voice connects into, and the node the reverb, delay and
analyser tap. Post-filter.

**Impulse response** — the reverb tail, built procedurally: 3.5 s of noise with an exponential
decay envelope, rendered in an `OfflineAudioContext`. **There is no IR file to fetch.** The
single-file build depends on this.

**Analyser** — one `AnalyserNode`, `fftSize` 2048, tapped off the bus. The stage's only source
of waveform data.

**Envelope** — the per-voice attack and release. Attack ramps to target over 1.5 s on join;
release ramps to zero over 2.0 s on leave or on becoming a listener, after which the
oscillators stop.

**Never assign `.value` on an `AudioParam` after a node has started.** Use
`linearRampToValueAtTime` or `setTargetAtTime`. An abrupt parameter jump produces an audible
click, and in a piece with no percussion a click is the loudest thing on the stage. Setting
`.value` *before* `start()` is fine and is how initial values are established.

**`dispose()`** — every `Voice` has one. It ramps out, stops the oscillators after the release,
disconnects, and nulls its references. Rapid open/close cycles must not leak oscillators; a test
asserts this.

---

## Screens

**Gate** — the entry screen. A single centred invitation and nothing else. **Nothing renders
before the gesture** — not the stage, not the canvas, not the audio.

**Stage** — the post-join screen: the canvas, the sibling rules, and the DOM overlay.

**Overlay** — the typographic layer above the canvas. It is real DOM, not canvas text, so it is
selectable and accessible. Carries the title, the role name, the frequency in Hz to one decimal
place, and the voice count.

**Narrow screen** — what a phone or a small viewport gets instead of the gate: a short, honest
explanation that the piece needs a desktop and several windows. Not a nag, not a promise that
it will work later.

**Hint** — the one line of italic guidance at the foot of the stage. It has exactly three
states and moves through them in one direction only:

1. Alone, before any peer has ever been seen: *"You are one voice. Open this page in another
   window."*
2. Once a peer has ever joined: *"Now move your windows."*
3. Listener: a plain statement that this window is listening and will sing when another closes.

Neither of the first two lines ever returns once replaced. The "has ever seen a peer" flag lives
in memory only — no storage, no URL state. A reloaded window is a new window and starts at
state 1.

---

## Build and gate

**Verify gate** — `npm run verify`. Runs, in order: `tsc --noEmit` (type-checking JSDoc'd
JavaScript), `vitest run`, `vite build`, `playwright test`. Green or stop. Never `--no-verify`,
never `.skip`, never a weakened assertion.

**Single file** — the shipped artefact is one self-contained `dist/index.html`: all JS and CSS
inlined by `vite-plugin-singlefile`, no asset fetches. Google Fonts remain a `<link>`; that is
a typography dependency, not an app asset, and the piece degrades to the fallback stack without
it.

**Line budget** — source JavaScript under `src/` (excluding tests) must stay under **650
lines**. A test in the gate asserts this. If the budget is tight, the abstraction is wrong —
consolidate, do not delete tests or inline everything into one file to game the count.

**Test hook** — `window.__tabchoir`, a small read-only object exposing roster, role, frequency,
context state and voice count. It exists so Playwright can assert behaviour that is otherwise
only audible. It is deliberately shipped in production; this is an art piece, not a product.
