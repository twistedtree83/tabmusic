# Day 9 — LinkedIn post

Day 9 of the 30 day challenge: **Tab Choir**, a chord for open windows.

https://twistedtree83.github.io/tabmusic/

Every browser window running the page holds one sustained voice. Open a second and a second voice
joins in harmony. Open a fifth and the chord is full. Drag a window across the screen and its note
glides — left is low, right is high, quantised to D Dorian so no arrangement you can make will
sound wrong.

There is no server. The windows find each other over BroadcastChannel and each one derives the
same roster from the same facts — sorted by join time, ties broken by id — so every window works
out its own role without asking anybody. Close one and the rest re-voice themselves inside a
second. A sixth window becomes a listener: silent, still watching the whole chord, and it starts
singing the moment somebody else closes.

Two things I didn't expect to be the interesting parts.

**The music theory had a trap in it.** Each voice sings in its own octave, rooted on a stacked
fifth — D2, D3, A3, E4, B4. The obvious way to build those octaves is to take the root and add the
D Dorian intervals. That is wrong, and it sounds *almost* right, which is worse. Dorian isn't
transposition-invariant across its own degrees: rooted on A you get a different shape, and adding
the D shape puts an F sharp into a piece that has no F sharp. The fix is to filter the scale into
the range instead of offsetting into it. There's now a test whose only job is to fail if somebody
"simplifies" it back.

**Most of the bugs were in how I was measuring, not in what I'd built.** A waveform that looked
like it was drawn into the top-left corner turned out to be a correct canvas seen through an
emulated viewport — the pixels were fine, the screenshot wasn't. Eight tests "failed" because I'd
launched a second test run while the first was still going and they fought over a port. And a
regression test I wrote passed *before* the fix, which is the tell that it hadn't reproduced
anything.

Built as a task graph — 17 issues, each one a thin slice with its own acceptance criteria — and
worked through autonomously, with a ledger per task recording what got decided and why. It parked
itself once, properly: a line budget said 650, the code was at 667, and rather than quietly moving
the number it stopped and asked. Turned out the budget was counting the comments, which another
rule in the same project required. That's the kind of thing you want a stop for.

98 browser tests, 90 unit tests, 618 lines of JavaScript, one 15 KB HTML file that fetches nothing
but its fonts. The reverb is 3.5 seconds of noise under an exponential decay, computed at load —
no audio file to download.

Best with four windows and a bit of dragging. Desktop only, and it's honest about why: a phone has
one window and no way to move it, so there's nothing there to play.

---

## Notes before posting

- Check the link renders a preview. There's no OG image; add one if that matters.
- If a shorter version is wanted, cut the two "unexpected parts" to just the music-theory one —
  it's the strongest specific.
- The claim "no server" is exact: BroadcastChannel is same-origin and same-browser-profile. If
  anyone asks whether it works across two laptops, the answer is no, deliberately.
