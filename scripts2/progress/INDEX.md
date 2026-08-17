# Progress index — Tab Choir

Graph: `scripts2/prd.json` · Repo: https://github.com/twistedtree83/tabmusic · Branch: `main`

One line per task. Flip `[ ]` to `[x]` when the task ships, and write its ledger to
`scripts2/progress/<ID>.md`. Ordered by importance; dependencies in parentheses.

Four of these close a build stage from the original brief and are worth opening the piece to
check after: **T-03** (peer layer), **T-07** (audio), **T-10** (canvas and typography),
**T-16** (edge cases and README). None of them block — see `scripts2/TUI_PROMPT.md`.

- [x] **T-02** #2 — Walking skeleton: build, verify gate, entry gate screen, CI (no deps)
- [x] **T-03** #3 — Presence: deterministic roster over BroadcastChannel (needs T-02) — *stage 1*
- [x] **T-04** #4 — Pitch mapping: window position to a note in the role's octave (needs T-03)
- [x] **T-05** #5 — Audio engine: lazy context, procedural reverb, bus, analyser (needs T-02)
- [x] **T-06** #6 — Voice: oscillators, vibrato, envelope, glide, dispose (needs T-04, T-05)
- [x] **T-07** #7 — The chord: roster drives voices, re-voicing, listener silence (needs T-03, T-06) — *stage 2*
- [x] **T-08** #8 — Stage canvas: the local waveform (needs T-07)
- [x] **T-09** #9 — Stage canvas: sibling rules, drift, and departing ghosts (needs T-08)
- [x] **T-10** #10 — Overlay typography: title, role, frequency, voice count (needs T-08) — *stage 3*
- [x] **T-13** #13 — Narrow screen: the honest explanation (needs T-02)
- [x] **T-11** #11 — The hint: a one-way copy state machine (needs T-10)
- [x] **T-12** #12 — Listener state, stated plainly (needs T-07, T-10)
- [x] **T-15** #15 — Backgrounded window: pause rendering, keep the heartbeat (needs T-03, T-08)
- [x] **T-14** #14 — Reduced motion (needs T-09)
- [x] **T-16** #16 — README, single-file deploy, and the budget sign-off (needs T-11, T-12, T-13, T-14, T-15) — *stage 4*
- [ ] **T-17** #17 — A way to add a voice from inside the piece (needs T-10)
