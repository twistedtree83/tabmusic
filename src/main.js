import './styles.css';
import { renderGate } from './gate.js';

renderGate(document.body, () => {
  // The stage arrives with the peer layer; for now the gesture only clears the gate.
});
