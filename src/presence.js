import { assignRoles, sortRoster, stale } from './roster.js';

const CHANNEL = 'tab-choir-v1';
const HEARTBEAT_MS = 500;
// Generous on purpose: background timers clamp to roughly a second, and a
// merely throttled window must never be mistaken for a closed one.
const PRUNE_MS = 3000;

/**
 * @typedef {import('./roster.js').Seat} Seat
 * @typedef {{ id: string, joinedAt: number, hz: number, seen: number }} Peer
 */

const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/**
 * Join the choir. The returned roster is derived, never agreed: this window
 * broadcasts what it is and listens for the same from others, and both sides
 * sort the result identically.
 *
 * @param {(roster: Seat[], selfId: string) => void} onRoster
 */
export function joinChoir(onRoster) {
  const id = newId();
  const joinedAt = Date.now();
  let hz = 0;
  /** @type {Map<string, Peer>} */
  const peers = new Map();
  const channel = new BroadcastChannel(CHANNEL);

  const publish = () => {
    const mine = { id, joinedAt, hz };
    const theirs = [...peers.values()].map((p) => ({ id: p.id, joinedAt: p.joinedAt, hz: p.hz }));
    onRoster(assignRoles(sortRoster([mine, ...theirs])), id);
  };

  const beat = () => channel.postMessage({ type: 'hb', id, joinedAt, hz });
  const farewell = () => channel.postMessage({ type: 'bye', id });

  channel.onmessage = ({ data }) => {
    if (!data || data.id === id) return;

    if (data.type === 'bye') {
      if (peers.delete(data.id)) publish();
      return;
    }

    if (data.type !== 'hb') return;
    const known = peers.get(data.id);
    const next = data.hz ?? 0;
    peers.set(data.id, {
      id: data.id,
      joinedAt: data.joinedAt,
      hz: next,
      seen: performance.now(),
    });

    // Answer a stranger straight away so it learns the whole chord without
    // waiting out a heartbeat. This is an announcement, not a negotiation —
    // nobody is told what their role is, only that we exist.
    if (!known) beat();
    if (!known || known.hz !== next) publish();
  };

  const timer = setInterval(() => {
    const quiet = stale([...peers.values()], performance.now(), PRUNE_MS);
    quiet.forEach((peerId) => peers.delete(peerId));
    if (quiet.length) publish();
    beat();
  }, HEARTBEAT_MS);

  // pagehide rather than unload: unload is deprecated and never fires for a
  // page entering the back/forward cache, which would leave a phantom voice in
  // everyone else's chord until prune caught up with it.
  addEventListener('pagehide', farewell);

  beat();
  // Deferred by one microtask so the caller's `const choir = joinChoir(...)`
  // has finished binding before the first roster lands. Publishing inline puts
  // the callback inside the temporal dead zone of the very handle it needs to
  // call setPitch on.
  queueMicrotask(publish);

  return {
    id,

    /**
     * Tell the other windows what this one is singing. Publishing from here is
     * re-entrant by one level — it calls back into onRoster, which will find
     * the pitch already settled and not call setPitch again.
     * @param {number} next
     */
    setPitch(next) {
      if (next === hz) return;
      hz = next;
      beat();
      publish();
    },

    dispose() {
      farewell();
      clearInterval(timer);
      removeEventListener('pagehide', farewell);
      channel.close();
    },
  };
}
