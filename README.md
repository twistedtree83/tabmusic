# Tab Choir

A chord for open windows. Every window running this page holds one sustained voice; open a second
and a second voice joins in harmony, open a fifth and the chord is full. Drag a window across the
screen and its note glides — left is low, right is high, quantised to D Dorian so no arrangement
you can make will sound wrong. The windows find each other over `BroadcastChannel` and agree on a
deterministic roster with no server, so closing one re-voices the rest within a second, and a
sixth window becomes a listener: silent, still watching the whole chord, and singing the moment
somebody else closes. One window on its own is meant to sound finished — a slow single note with
vibrato and a long reverb tail, not a lobby.

Open it, click once, then open it again in another window and move them about.

## Running it

```bash
npm install     # once
npm run dev     # a local server, with reload
npm run build   # one self-contained dist/index.html
npm run verify  # types, unit tests, build, browser tests — the gate
```

## Known limitations

**`screenX` is per-window, not per-tab.** Two tabs inside the same window report the same
position and therefore sing the same note. They will unison rather than harmonise. Every line of
copy in the piece says "window" for this reason; the only place the word "tab" appears is the
title.

**`BroadcastChannel` is same-origin and same-browser-profile.** The piece will not reach another
device, another browser, or a private window. Two laptops side by side hear two separate choirs.
There is no signalling server and no way to add one without changing what the piece is.

**Safari clamps `screen.width` and can report `screenX` relative to a secondary display.** The
normalised position is clamped rather than trusted, so nothing breaks — but on some multi-display
arrangements the full pitch range is not reachable, and a window dragged onto a second screen may
sit at one end of its octave rather than sweeping through it.

## How it is built

Plain ES modules under `src/`, type-checked through JSDoc rather than written in TypeScript, and
bundled by Vite into a single HTML file with everything inlined — the reverb impulse response is
computed at runtime rather than fetched, so the artefact touches the network for nothing but its
two fonts.

`CONTEXT.md` is the domain model and the vocabulary; read it before changing anything. `docs/PRD.md`
records the decisions, including the eight places where the written brief and the design file
disagreed and which one won. `scripts2/progress/` holds one ledger per task.
