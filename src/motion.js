const query = matchMedia('(prefers-reduced-motion: reduce)');

/**
 * Read live rather than cached, so toggling the preference takes effect without
 * a reload. Reduced motion is a display preference: the waveform stays, because
 * it is the piece and it is a response to sound rather than decoration. What
 * goes is the drifting, the fading and the breathing.
 */
export const reducedMotion = () => query.matches;
