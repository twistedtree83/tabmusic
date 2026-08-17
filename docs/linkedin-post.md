# Day 9: LinkedIn post

Day 9 of the 30 day challenge: Tab Choir, a chord for open windows.

https://twistedtree83.github.io/tabmusic/

Every browser window running the page holds one sustained voice. Open a second window and a
second voice joins in harmony. Open a fifth and the chord is full. Drag a window across the
screen and its note glides. Left is low, right is high, quantised to D Dorian so no arrangement
you can make will sound wrong.

There is no server. The windows find each other over BroadcastChannel, and each one derives the
same roster from the same facts: sorted by join time, ties broken by id. Every window works out
its own role without asking anybody. Close one and the rest re-voice themselves inside a second.
A sixth window becomes a listener. It stays silent, still draws the whole chord, and starts
singing when somebody else closes.

The music theory had a trap in it. Each voice sings in its own octave, rooted on a stacked fifth:
D2, D3, A3, E4, B4. The obvious way to build those octaves is to take the root and add the D
Dorian intervals. That gives you the wrong notes. Dorian is not transposition invariant across
its own degrees, so rooted on A the shape changes, and adding the D shape puts an F sharp into a
piece that has no F sharp. It sounds close enough that you might not catch it. The fix is to
filter the scale into the range rather than offset into it. There is now a test whose only job is
to fail if someone simplifies it back.

Most of my debugging went on the measurements rather than the code. A waveform that looked like
it was drawn into the top left corner was a correct canvas seen through an emulated viewport. The
pixels were fine. The screenshot was not. Eight tests failed because I had started a second test
run while the first was still going, and the two fought over a port. One regression test passed
before I applied the fix, which meant it had never reproduced the bug at all.

Built as a task graph. 17 issues, each a thin slice with its own acceptance criteria, worked
through autonomously with a ledger per task recording what got decided and why. It stopped itself
once. A line budget said 650, the code was at 667, and instead of quietly raising the number it
parked and asked. The budget was counting comments, which a different rule in the same project
required. Good place to stop.

98 browser tests, 90 unit tests, 618 lines of JavaScript, one 15 KB HTML file that fetches
nothing but its fonts. The reverb is 3.5 seconds of noise under an exponential decay, computed
when the page loads. No audio file to download.

Best with four windows and some dragging. Desktop only, and it says why: a phone has one window
and no way to move it, so there is nothing there to play.

---

## Notes before posting

- No em dashes anywhere in the post above. Worth a look after any edit, since they creep back in.
- Check the link renders a preview. There is no OG image. Add one if that matters.
- For a shorter version, cut the debugging paragraph and keep the music theory one. It is the
  most specific thing in the post.
- "No server" is exact. BroadcastChannel is same origin and same browser profile, so if anyone
  asks whether it works across two laptops, the answer is no, and that is deliberate.
