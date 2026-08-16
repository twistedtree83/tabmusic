import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const BUDGET = 650;

/** @param {string} dir @returns {string[]} */
function jsFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return jsFiles(path);
    return path.endsWith('.js') ? [path] : [];
  });
}

describe('source line budget', () => {
  it(`keeps src/ JavaScript under ${BUDGET} lines`, () => {
    const files = jsFiles('src');
    expect(files.length).toBeGreaterThan(0);

    const total = files.reduce(
      (n, file) => n + readFileSync(file, 'utf8').trimEnd().split('\n').length,
      0,
    );
    expect(total).toBeLessThan(BUDGET);
  });
});
