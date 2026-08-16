/**
 * A read-only window onto what the piece is doing, for the integration tests.
 *
 * Shipped deliberately: most of this piece is only audible, and being able to
 * ask it what it is singing costs four lines. Every read returns a frozen
 * snapshot, so nothing a caller does to it reaches the engine.
 *
 * @param {() => Record<string, unknown>} read
 */
export function exposeHook(read) {
  Object.defineProperty(window, '__tabchoir', {
    configurable: true,
    get: () => Object.freeze(read()),
  });
}
