import { test as base } from '@playwright/test';

/**
 * Every spec imports `test` from here rather than from @playwright/test.
 *
 * An uncaught exception in the page does not fail a Playwright test on its own:
 * the piece just stops updating, and every assertion then waits out its full
 * timeout. Surfacing it turns a twenty-minute mystery into a stack trace.
 */
export const test = base.extend({
  context: async ({ context }, use) => {
    /** @type {Error[]} */
    const errors = [];
    context.on('weberror', (webError) => errors.push(webError.error()));

    await use(context);

    if (errors.length) {
      throw new Error(
        `${errors.length} uncaught error(s) in the page:\n${errors.map((e) => e.stack).join('\n')}`,
      );
    }
  },
});

export { expect } from '@playwright/test';
