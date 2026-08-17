import { readFileSync, readdirSync } from 'node:fs';
import { expect, test } from './fixtures.js';

const dist = () => readFileSync('dist/index.html', 'utf8');

test.describe('the shipped artefact', () => {
  test('is one file and nothing else', () => {
    const built = readdirSync('dist');
    expect(built).toEqual(['index.html']);
  });

  test('names its four non-obvious decisions where they happen', () => {
    const say = (/** @type {string} */ file, /** @type {RegExp} */ pattern) =>
      expect(readFileSync(`src/${file}`, 'utf8')).toMatch(pattern);

    say('roster.js', /total order[\s\S]{0,400}same millisecond/i);
    say('theory.js', /tritone/i);
    say('presence.js', /pagehide[\s\S]{0,200}back\/forward cache/i);
    say('theory.js', /not by adding a fixed list of offsets|transposition-invariant/i);
  });

  test('speaks Australian everywhere it speaks at all', () => {
    const source = readdirSync('src')
      .filter((name) => name.endsWith('.js'))
      .map((name) => readFileSync(`src/${name}`, 'utf8'))
      .join('\n');
    expect(source).not.toMatch(/\b(normalize[ds]?|behavior|recognize|modeled|analyze)\b/i);
    expect(source).toMatch(/normalise/);
  });
});
