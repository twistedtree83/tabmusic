# TUI_PROMPT — autonomous in-session runner

Master prompt for `/ralph-runner`. Everything about **how a single task ships** lives in
`RALPH_PROMPT.md` — read it in full and follow its ten steps. This file states only the deltas
for running in an interactive session rather than headless, plus this project's specifics.

---

## Deltas from the headless loop

**You do the work yourself, in this session.** Never shell out to `claude`, `ralph.sh`, or
`ralphonce.sh`. That is what keeps the run on the subscription rather than billing as scripted.

**No driver pre-fetches context.** Resolve it once, up front, yourself:
- Read the target `prd*.json` and `scripts2/progress/INDEX.md`.
- Run `gh issue list --repo <repoUrl> --state open`.
- Do the RALPH_PROMPT Step 2 cross-check before the first task, not once per task. Re-run it
  only if you ingest a task or an issue closes unexpectedly.

**The user is AFK.** Once started, ship eligible tasks back-to-back with **no check-ins
between tasks**. Do not ask "shall I continue?". Do not summarize between tasks beyond the
one-line announce. The only reasons to stop are the stop conditions in `RALPH_PROMPT.md`.

**Re-resolve eligibility every iteration**, off live graph state. A task is eligible when:

```
passes == false  AND  afk == true  AND  every id in depends has passes == true
```

Never work a list resolved once at the start — shipping a task unblocks others, and that is the
whole point of re-resolving.

**Pick by `importance`, ascending**, breaking ties by fewest remaining dependents. Lower number
= more important.

**Sequential, not parallel.** A later task frequently builds on conventions the previous one
established, and those conventions are communicated through the ledger. Only fan out to
subagents if the user explicitly asks *and* the tasks share no files.

---

## Terminus

The healthy end state is **"the AFK frontier is empty"** — every remaining task is either
`passes:true`, `afk:false`, or dependency-blocked. It is not a fixed batch size.

When you reach it (or hit the optional `count` cap), summarize:
- Task IDs and commit shas shipped, in order.
- What is now unblocked that was not before.
- What remains, and why each remaining task was not worked.
- A `WAITING:` line for **every** human-gated task still open, each naming the exact action
  needed.

---

## This project's specifics

- **Graph:** `scripts2/prd.json` · **Repo:** `https://github.com/twistedtree83/tabmusic`
- **Branch:** `main` — the repo is fresh and unprotected; there is no sprint branch.
- **Every task is `afk:true`.** The original brief asked for a human stop-and-verify after each
  of four build stages. Those are preserved as **milestones**, not gates: T-03 (peer layer),
  T-07 (audio), T-10 (canvas and typography) and T-16 (edge cases and README) each close a stage
  and push, so the piece can be opened and checked at that point, and
  the thing a human would have checked by ear or eye is additionally pinned by a Playwright
  assertion. Nothing blocks on a human. If the user later wants the original behaviour, flip
  those four `afk` flags to `false`. There are no `ship-gate` tasks, so the only stop conditions
  available are a red verify gate, an ungraphed issue, or a genuine fork the bibles do not
  resolve.

- **T-02 is the bootstrap.** It creates `package.json` and the verify gate itself; see the
  bootstrap exception in `RALPH_PROMPT.md`. Nothing else is eligible until it ships, so the
  first iteration is forced.

- **T-03 and T-05 carry the project's real risk, for opposite reasons.**
  - **T-03 (presence)** is the one claim the whole piece rests on: every window must derive the
    same roster in the same order from the same inputs, with no server. Its test must open
    *multiple pages in one browser context* — `BroadcastChannel` does not cross contexts, and a
    test written with two contexts will pass while proving nothing. If you find yourself adding
    any negotiation, election or tie-break message between windows, that is the signal to park:
    the ordering is supposed to be derivable, not agreed.
  - **T-05 (audio engine)** pins the graph every later audio task builds on. Its acceptance
    criteria are deliberately specific about the impulse response being rendered in an
    `OfflineAudioContext` and the analyser being tapped post-filter. Do not treat those as
    stylistic.

- **The `.value =` rule is not advice.** `RALPH_PROMPT.md` lists it as a hard rule because it is
  the failure this project is most likely to ship silently: the code works, the tests pass, and
  the piece clicks. If a task tempts you to set an `AudioParam` value directly after `start()`,
  the answer is a ramp, every time.

- **The line budget is in the gate.** Source JavaScript under `src/`, excluding tests, must stay
  under 650 lines. It will pass trivially for the first several tasks and get tight around T-09
  to T-14. When it does, the fix is consolidation — not deleting tests, not inlining everything
  into one file to game the count, and not moving logic into a `.json` blob. If a task genuinely
  cannot fit, park and say what would have to give.

- **Two source documents, and they conflict.** The written brief governs behaviour; the design
  file governs appearance. The PRD's Implementation Decisions section has the full resolution
  table. Do not re-litigate a row in that table mid-task — it was decided once, deliberately.
