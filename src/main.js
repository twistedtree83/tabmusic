import './styles.css';
import { renderGate } from './gate.js';
import { joinChoir } from './presence.js';

/**
 * The peer layer, laid bare. The stage replaces this at T-08.
 * @param {import('./roster.js').Seat[]} roster
 * @param {string} selfId
 */
function describe(roster, selfId) {
  const heading = `tab choir · ${roster.length === 1 ? '1 voice' : `${roster.length} voices`}`;
  const rows = roster.map(
    (seat) =>
      `#${seat.rank}  ${seat.role.padEnd(9)}joined=${seat.joinedAt}  id=${seat.id}` +
      (seat.id === selfId ? '  self' : ''),
  );
  return [heading, ...rows].join('\n');
}

renderGate(document.body, () => {
  const dump = document.createElement('pre');
  dump.className = 'roster-dump';
  document.body.append(dump);

  joinChoir((roster, selfId) => {
    dump.textContent = describe(roster, selfId);
  });
});
