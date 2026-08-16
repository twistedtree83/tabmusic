/**
 * @typedef {{ id: string, joinedAt: number }} Member
 * @typedef {Member & { rank: number, role: string }} Seat
 */

export const ROLES = ['bass', 'tenor', 'alto', 'soprano', 'descant'];
export const LISTENER = 'listener';

/**
 * A total order over the voices: earliest joiner first, ties broken by id.
 * Every window derives this from the same facts and so arrives at the same
 * roster without asking anybody — which is the whole reason the piece needs no
 * server. Sorting by joinedAt alone is not enough: two windows opened in the
 * same millisecond would order differently in different windows.
 *
 * @param {Member[]} members
 * @returns {Member[]}
 */
export function sortRoster(members) {
  return [...members].sort((a, b) => {
    if (a.joinedAt !== b.joinedAt) return a.joinedAt - b.joinedAt;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

/**
 * Rank is position in the roster, and rank is the only thing that decides role.
 *
 * @param {Member[]} sorted
 * @returns {Seat[]}
 */
export function assignRoles(sorted) {
  return sorted.map((member, rank) => ({
    ...member,
    rank,
    role: rank < ROLES.length ? ROLES[rank] : LISTENER,
  }));
}

/**
 * The peers that have gone quiet for longer than the timeout.
 *
 * @param {{ id: string, seen: number }[]} peers
 * @param {number} now
 * @param {number} timeout
 * @returns {string[]}
 */
export function stale(peers, now, timeout) {
  return peers.filter((peer) => now - peer.seen > timeout).map((peer) => peer.id);
}
