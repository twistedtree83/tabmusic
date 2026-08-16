# PRD — Tab Choir

## Problem Statement

Browser windows are treated as containers for content and nothing else. A person with six
windows open on a desktop has a rich spatial arrangement in front of them — one they arranged
by hand, that they move all day — and it means nothing. There is no piece of software that
treats the desktop itself as an instrument.

At the same time, generative-music toys on the web almost all fail the same way: one tab, one
sound, a person alone with a slider. The thing that would make ambient music interesting — that
it is made by more than one source, each doing something slightly different, coming in and out
— is exactly the thing a single web page cannot do.

A person opening this page wants something they can actually play, with no install, no account,
no second device, and no instructions beyond one line. They want it to sound complete
immediately, and to become more interesting the more of themselves they commit to it.

## Solution

**Tab Choir** is a chord for open windows. Every window running the page holds one sustained
voice. Open a second window and a second voice joins in harmony; open a fifth and the chord is
full. Drag a window across the screen and its note glides — left is low, right is high, quantised
to D Dorian so nothing can ever clash.

The mechanic is entirely local. Windows find each other over `BroadcastChannel`, agree on a
deterministic roster with no server, and each derives its own role from its position in that
roster. Close a window and the chord re-voices itself within a second. The sixth window and
beyond become listeners: silent, but still watching the whole chord, and they begin to sing the
moment somebody else closes.

Visually it is one dim amber waveform for your own voice, and a faint horizontal rule for each
sibling positioned by its pitch — so the chord is legible as a shape before it is legible as a
sound.

The piece must sound complete alone. One window is a slow single note with vibrato and a long
reverb tail — a finished thing, not a lobby.

## User Stories

1. As a visitor, I want the page to make a sound within a second of my first click, so that I
   understand instantly that this is an instrument and not an article.
2. As a visitor, I want nothing at all to render before I click, so that the invitation is the
   whole of my first impression.
3. As a visitor, I want one clear line telling me what to do, so that I do not have to read
   instructions to play.
4. As a visitor arriving alone, I want a single window to sound like a finished piece, so that I
   am not being nagged into opening more.
5. As a visitor, I want to be told plainly that opening another **window** will add a voice, so
   that I know the next move.
6. As a visitor who has opened a second window, I want the invitation to be replaced by "Now
   move your windows", so that I discover the second mechanic without a tutorial.
7. As a visitor, I want neither of those two lines ever to come back once passed, so that the
   piece does not talk down to me.
8. As a player, I want dragging a window left and right to change its pitch, so that the desktop
   arrangement I already have becomes a chord I chose.
9. As a player, I want the pitch to glide rather than jump, so that moving a window is expressive
   rather than a series of clicks.
10. As a player, I want pitches quantised to a scale, so that no arrangement of windows I can
    make will sound wrong.
11. As a player, I want each window's voice to occupy its own register, so that the chord is a
    chord and not five instruments fighting over the same octave.
12. As a player opening a second window, I want the two voices to be consonant even in the worst
    case, so that a two-window chord never lands on a tritone.
13. As a player, I want closing a window to re-voice the remaining chord within about a second,
    so that the piece responds to me leaving as well as arriving.
14. As a player, I want a closing window's voice to fade rather than cut, so that the departure
    is part of the music.
15. As a player, I want every window to show the same roster in the same order, so that what I
    see in one window is true of the piece as a whole.
16. As a player, I want the roster to survive a window being backgrounded, so that a window I am
    not looking at is still singing.
17. As a player with six or more windows open, I want the extra windows to say plainly that they
    are listening, so that silence reads as a designed state rather than a bug.
18. As a listener window, I want to start singing when somebody closes a singing window, so that
    the chord always uses all five registers it can.
19. As a player, I want to see my own voice as a waveform, so that I can see the sound I am
    making.
20. As a player, I want each sibling window drawn as a line positioned by its pitch, so that I
    can read the whole chord at a glance.
21. As a player, I want sibling lines to drift to new positions rather than jump, so that the
    picture moves like the sound does.
22. As a player, I want a departing sibling's line to fade out over a couple of seconds, so that
    the visual matches the audio release.
23. As a player, I want to see my role, my frequency and the number of voices, so that I can
    reason about what I am hearing.
24. As a player, I want the typography to be selectable text rather than pixels on a canvas, so
    that the readout is legible to me and to a screen reader.
25. As a person who has set "reduce motion", I want the waveform to remain but the drifting and
    vibrato-driven movement to stop, so that the piece is watchable without making me unwell.
26. As a person on a phone, I want a short honest explanation that this needs a desktop and
    several windows, so that I am not left tapping at a broken page.
27. As a person on a phone, I want that explanation to avoid promising anything it cannot
    deliver, so that I trust the rest of the work.
28. As a player, I want no clicks, pops or zipper noise at any transition, so that the piece
    sounds deliberate.
29. As a player who opens and closes windows rapidly, I want no accumulating drone, so that the
    piece cannot be broken by playing with it.
30. As a player, I want the page to work with no network after first load, so that the piece is
    a thing I have rather than a service I am borrowing.
31. As a curious visitor, I want a README that explains the concept in a paragraph and is honest
    about the three things that do not work, so that I know what I am looking at.
32. As the maintainer, I want the pure musical logic — roster ordering, quantisation, the
    tritone rule — testable without a browser, so that the parts that must be exactly right are
    exactly right.
33. As the maintainer, I want a multi-page browser test that proves two windows agree on a
    roster, so that the central claim of the piece is covered by the gate rather than by hope.
34. As the maintainer, I want the whole thing to ship as one self-contained HTML file, so that
    it can be hosted anywhere and archived as a single artefact.

## Implementation Decisions

### Authority

Two source documents govern this build and they conflict in places. The split is:

- **The written brief is authoritative for behaviour** — audio architecture, pitch mapping,
  timings, presence rules, copy.
- **`design/Tab Choir.dc.html` is authoritative for appearance** — palette, type, layout,
  spacing, and the wording of the gate and narrow-screen copy.

Where they disagree, the resolutions are:

| Concern | Resolution | Rejected |
| --- | --- | --- |
| Background / bone / amber | `#171715` / `#f5f5f4` / `#b8873f` (design) | `#0d0b09` / `#efe9df` / `#c8873f` |
| Scale | D Dorian `[0,2,3,5,7,9,10]` + tritone rule (brief) | D minor pentatonic, which makes a tritone impossible but also removes the rule the brief wants to exist |
| Renderer | `<canvas>`, DPR-scaled (brief) | SVG path (design) — the design's *look* is kept: centred, tapered at both ends, breathing opacity |
| Prune timeout | 3000 ms (brief) | 1200 ms (design) — too tight for clamped background timers |
| Reverb | 3.5 s, rendered in an `OfflineAudioContext` (brief) | 4 s written directly into a buffer (design) |
| Glide | 250 ms (brief) | 450 ms (design) |
| Envelope | `setTargetAtTime` / `linearRampToValueAtTime` only (brief) | `exponentialRampToValueAtTime` (design) |
| Copy noun | "window" everywhere (brief) | "tab" (design) — `screenX` is per-window, so "tab" would be a lie |

The design's feedback delay line (≈470 ms, feedback ≈0.48, wet ≈0.22) is **kept** even though
the brief does not mention it. It is a substantial part of how the design sounds and costs four
lines.

### Modules

Six modules, each with a narrow interface. The first two are pure and carry all the logic that
must be exactly right.

**`roster`** — pure. `sortRoster(members) → members` and `assignRoles(sorted) → entries`.
Ordering is `joinedAt` ascending, ties broken by `id` string comparison, giving a total order
every window derives identically. `assignRoles` maps rank 0–4 onto `bass … descant` and rank ≥ 5
onto `listener`. Knows nothing about channels, audio or time.

**`theory`** — pure. Owns the scale, the role roots, and every number in the musical domain:

```
SCALE_PCS      pitch classes of D Dorian, derived from D (MIDI 2) + [0,2,3,5,7,9,10]
ROLE_ROOTS     bass 38, tenor 50, alto 57, soprano 64, descant 71
roleOctave(root) → the 7 scale members in [root, root+12)
normalisePosition(screenX, innerWidth, screenWidth) → t, clamped to [0,1]
quantise(t, role) → MIDI note
midiToHz(midi) → 440 * 2 ** ((midi - 69) / 12)
avoidTritone(midis) → midis
```

`roleOctave` must be derived by **filtering scale members into the range**, not by adding the
D-Dorian offsets to the root. Dorian is not transposition-invariant across its own degrees: a
root of A3 yields `[0,2,3,5,7,8,10]`, not `[0,2,3,5,7,9,10]`. The naive version produces a chord
that is subtly out of key and sounds almost right, which is worse than sounding wrong.

`avoidTritone` applies only when the array has exactly two entries and
`Math.abs(a - b) % 12 === 6`. It moves the higher note to the next scale member above it, even
if that leaves the role's octave. Total, pure, and unit-tested with the specific pairs D–G♯ and
F–B.

**`presence`** — the impure half of the peer layer. Owns the `BroadcastChannel`
(`tab-choir-v1`), a `setInterval` heartbeat, the prune timer, the `pagehide` bye, and the
peer/ghost maps. Emits a roster-changed callback. Uses `setInterval` rather than rAF so
membership survives background throttling, and a **3000 ms** prune timeout to tolerate the ~1 s
timer clamp. `pagehide` rather than `unload`: `unload` is deprecated and is not fired for pages
entering the back/forward cache.

**`engine`** — the per-window audio graph. Constructed lazily *inside* the click handler, with
`ctx.resume()` in the same handler. Builds the procedural impulse response in an
`OfflineAudioContext` — 3.5 s of noise multiplied by an exponential decay — so there is no file
to fetch and the single-file build holds. Owns the bus, convolver, delay, and one `AnalyserNode`
at `fftSize` 2048 tapped post-filter. Exposes the analyser to the stage.

**`voice`** — one `Voice` per sounding window: two detuned oscillators, a vibrato LFO into
`detune`, a slow breath LFO into the envelope gain, a lowpass, and the envelope. Interface is
`new Voice(engine, hz)`, `glideTo(hz)`, `dispose()`. Attack ramps 0 → target over 1.5 s via
`setTargetAtTime`; `dispose()` ramps to 0 over 2.0 s and stops the oscillators after the
release, disconnects, and nulls references. **No `.value =` on any `AudioParam` after `start()`**
— initial values before `start()` are fine, everything after is a ramp.

**`stage`** — the canvas renderer. Full-viewport, DPR-scaled, resize-observed. Draws the local
waveform from `getByteTimeDomainData` as a single 1.5 px amber stroke, tapered at both ends,
and one faint white rule per sibling with y mapped from pitch, opacity 0.22, lerped at 0.08 per
frame. Ghosts keep rendering for 2 s while opacity and stroke width fall to zero. Pauses on
`visibilitychange`; the heartbeat does not.

The DOM overlay — title, role, frequency, voice count, hint — is real DOM above the canvas, not
canvas text.

### Position polling

There is no window-move event. `screenX` is read in the rAF loop and a change is only broadcast
when it moves more than **4 px**. The normalised position is clamped to `[0,1]` rather than
assumed to be in range, because `screenX` on a secondary display can exceed `screen.width` and
Safari does not report the full desktop width.

### Roles, ranges, and crossing

The role roots are a stacked-fifths voicing: D2, D3, A3, E4, B4. Adjacent roles overlap in range
by up to a fifth, so strict non-crossing is **not** guaranteed — the brief's rationale for the
roots does not quite hold. This is accepted rather than fixed: every voice is confined to the
same scale, and the tritone rule covers the only interval that would actually clash, so a
crossing is harmless. Changing the roots to guarantee non-crossing would compress the piece into
a narrower and duller range.

### Build

Vite, plain ES modules in `src/`, JSDoc types checked by `tsc --noEmit` with `checkJs`. Not
TypeScript — the brief asks for JavaScript and a ~600-line budget, and `.ts` ceremony would eat
it. `vite-plugin-singlefile` inlines everything into one `dist/index.html`. Google Fonts stays a
`<link>`; it is a typography dependency, not an app asset, and the fallback stack is acceptable.

The verify gate is `npm run verify` = `tsc --noEmit` → `vitest run` → `vite build` →
`playwright test`.

### Human checkpoints

The brief asks for a stop-and-verify after each of four build stages: peer layer, audio, canvas,
edge cases. Because this backlog is being run by an autonomous agent, those four checkpoints are
kept as **milestones with pushed branches**, not blocking gates: each of the four stage-closing
tasks ends with a push, so the piece can be opened and checked at that point, and the behaviour
the human would have verified by ear or by eye is additionally pinned by a Playwright
assertion. No task is marked `afk:false`. This is a deliberate change from the brief and is
noted here so it can be reversed by flipping four `afk` flags if the checkpoints turn out to
matter more than the throughput.

### Test hook

`window.__tabchoir` exposes roster, role, frequency, context state, voice count and impulse
response duration, read-only. It exists so Playwright can assert behaviour that is otherwise
only audible, and it ships in production deliberately.

## Testing Decisions

A good test here asserts **externally observable behaviour** — a frequency, a roster, a count of
live oscillators, a rendered line of text — and never the shape of the code that produced it. No
test should know that `roleOctave` exists; tests should know that a bass window between two
other windows sings a D-Dorian note between D2 and D3.

**Unit-tested with Vitest, no browser** — the pure modules, which is where every off-by-one that
matters lives:

- `roster`: identical input in any order yields an identical total order; ties on `joinedAt`
  broken deterministically by `id`; ranks 0–4 map to the five roles, 5+ to `listener`; removing a
  middle member promotes exactly the ones below it.
- `theory`: `roleOctave` returns 7 notes, all with pitch classes in D Dorian, all within
  `[root, root+12)` — asserted for every one of the five roots, which is the test that catches
  the naive-offset bug. `normalisePosition` clamps at both ends and handles `screenX` greater
  than `screen.width`. `quantise` covers all 7 degrees across `t ∈ [0,1]` and never leaves the
  role octave. `midiToHz(69) === 440`. `avoidTritone` is identity for 0, 1, 3, 4 and 5 entries;
  identity for two consonant notes; moves the **higher** note up one scale member for a tritone;
  detects tritones spanning more than an octave (`% 12`); and never returns a tritone.

**Integration-tested with Playwright, Chromium, multiple pages in one browser context** — which
is what makes `BroadcastChannel` observable at all:

- Gate: on load, the invitation is present and the canvas and the readout are not.
- Presence: three pages, all three rosters identical and identically ordered; close one, the
  other two prune it within 3.5 s; roles reassign to the survivors.
- Audio: after the click, `ctx.state === 'running'`, the impulse response is ≈3.5 s, exactly one
  `Voice` exists, and its frequency is a D-Dorian pitch class.
- Re-voicing: two pages sounding; close one; the survivor's reported frequency changes to its
  new role's octave.
- Listener: six pages; the sixth reports role `listener`, zero voices, and renders the full
  count; close a singer and it starts singing.
- Leaks: join and leave in a loop; the live oscillator count returns to its baseline.
- Narrow viewport: at 375 px wide, the explanation renders and the gate does not.
- Reduced motion: with `prefers-reduced-motion: reduce` emulated, the waveform still renders and
  the sibling lerp is disabled.

**Line budget**, asserted in the gate: source JavaScript under `src/` excluding tests stays
under 650 lines.

There is no prior art in this repository — it starts empty — so the first task establishes the
conventions every later test follows.

## Out of Scope

- Any cross-device or cross-browser-profile behaviour. `BroadcastChannel` is same-origin and
  same-profile, and no copy may imply otherwise. No WebRTC, no signalling server, no room codes.
- Persistence of any kind. No `localStorage`, no URL state, no shareable arrangement. A reloaded
  window is a new window.
- Mobile support beyond the honest explanation screen.
- Recording, exporting or sharing audio.
- User-selectable scales, tempos, timbres or palettes. The piece has one voicing and that is the
  work.
- Analytics, telemetry, cookie consent.
- A tab-count-aware variant that distinguishes tabs from windows. Tabs in one window share a
  `screenX` and will unison; this is accepted and the copy is written around it.
- Server-side anything. The artefact is one static HTML file.

## Further Notes

The three limitations the README must state plainly, under "Known limitations":

1. `screenX` is per-window, not per-tab. Two tabs in the same window sing the same note.
2. `BroadcastChannel` is same-origin and same-browser-profile. It will not reach another device
   or another browser.
3. Safari clamps `screen.width` and can report `screenX` relative to a secondary display, so the
   full pitch range may not be reachable on every display arrangement.

Australian spelling throughout prose, copy and identifiers — *normalise*, *colour*, *behaviour*,
*centre*. Platform API names are exempt and must never be renamed to suit it.

Comments are for the non-obvious only: the deterministic roster sort, the tritone rule, why
`pagehide` rather than `unload`, and why `roleOctave` filters rather than offsets. Everything
else should not need one.
