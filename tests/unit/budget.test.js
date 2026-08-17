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

/**
 * Lines of code: blank lines and comments do not count.
 *
 * CONTEXT.md requires comments on the non-obvious — the deterministic roster
 * sort, the tritone rule, why pagehide, why roleOctave filters. Counting them
 * against the budget made the two rules fight, and the budget won by punishing
 * the explanation rather than the code.
 *
 * @param {string} source
 */
export function codeLines(source) {
  let count = 0;
  let inBlock = false;

  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (inBlock) {
      if (line.includes('*/')) inBlock = false;
      continue;
    }
    if (!line || line.startsWith('//')) continue;
    if (line.startsWith('/*')) {
      if (!line.includes('*/')) inBlock = true;
      continue;
    }
    count += 1;
  }
  return count;
}

describe('source line budget', () => {
  it(`keeps src/ JavaScript under ${BUDGET} lines of code`, () => {
    const files = jsFiles('src');
    expect(files.length).toBeGreaterThan(0);

    const total = files.reduce((n, file) => n + codeLines(readFileSync(file, 'utf8')), 0);
    expect(total).toBeLessThan(BUDGET);
  });
});

describe('codeLines', () => {
  it('counts statements', () => {
    expect(codeLines('const a = 1;\nconst b = 2;')).toBe(2);
  });

  it('ignores blank lines', () => {
    expect(codeLines('const a = 1;\n\n\nconst b = 2;')).toBe(2);
  });

  it('ignores line comments', () => {
    expect(codeLines('// why\nconst a = 1;')).toBe(1);
  });

  it('ignores block comments and JSDoc, however long', () => {
    expect(codeLines('/**\n * why\n * @param {number} a\n */\nconst a = 1;')).toBe(1);
  });

  it('ignores a single-line block comment', () => {
    expect(codeLines('/* why */\nconst a = 1;')).toBe(1);
  });

  it('still counts code that carries a trailing comment', () => {
    expect(codeLines('const a = 1; // why')).toBe(1);
  });
});
