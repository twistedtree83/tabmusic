import { readFileSync } from 'node:fs';
import { expect, test } from './fixtures.js';

// Runs after `vite build` in the verify chain, so dist/ is on disk by now.
const dist = () => readFileSync('dist/index.html', 'utf8');

test.describe('the build', () => {
  test('inlines every local asset into one file', () => {
    const html = dist();

    const scriptSrcs = [...html.matchAll(/<script[^>]*\ssrc=["']([^"']+)["']/g)].map((m) => m[1]);
    expect(scriptSrcs).toEqual([]);

    const sheets = [...html.matchAll(/<link[^>]*rel=["']stylesheet["'][^>]*>/g)].filter(
      (m) => !m[0].includes('fonts.googleapis.com'),
    );
    expect(sheets).toEqual([]);

    expect(html).not.toMatch(/["'](?:\.?\/)?assets\//);
  });

  test('carries its reverb as arithmetic rather than as an audio file', () => {
    const html = dist();
    expect(html).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|decodeAudioData/);
    expect(html).not.toMatch(/\.(?:wav|mp3|ogg|flac|aac|m4a)\b/i);
    expect(html).toContain('OfflineAudioContext');
  });

  test('reaches the network for fonts and nothing else', () => {
    const html = dist();
    const hosts = [...html.matchAll(/https?:\/\/([^/"'\s]+)/g)].map((m) => m[1]);
    const foreign = [...new Set(hosts)].filter(
      (h) => !['fonts.googleapis.com', 'fonts.gstatic.com', 'www.w3.org'].includes(h),
    );
    expect(foreign).toEqual([]);
  });
});
