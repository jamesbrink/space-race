// Writes the mark (src/logo.ts) as files for places that cannot run the page: docs/logo.svg, shown in
// the README, and public/og.png, the card a pasted link shows.
//   node tools/logo.mjs
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logo } from '../src/logo.ts';

const INK = '#f3efe6';
const GROUND = '#0a0b0e';
const svg = logo()
  .replaceAll('currentColor', INK)
  // on a page of any colour it needs its own ground: the page's is dark, a README's may not be
  .replace(/viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"([^>]*)>/, (_, x, y, w, h, rest) => {
    const pad = 40;
    const box = [Number(x) - pad, Number(y) - pad, Number(w) + 2 * pad, Number(h) + 2 * pad];
    return `viewBox="${box.join(' ')}"${rest}><rect x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" rx="14" fill="${GROUND}"/>`;
  })
  .replace(/\n\s+/g, '\n');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs', 'logo.svg');
writeFileSync(out, `${svg}\n`);
console.log(out);

// The card a pasted link shows (Open Graph): chat apps want a bitmap, 1200 by 630. Drawn by a
// browser from the same mark, on the page's own ground, with the line under it.
const card = `<!doctype html><meta charset="utf-8"><style>
  html, body { margin: 0; width: 1200px; height: 630px; background: radial-gradient(120% 100% at 50% 40%, #151a22, ${GROUND} 70%); display: grid; place-items: center; }
  main { width: 900px; text-align: center; color: ${INK}; }
  svg { width: 100%; height: auto; overflow: visible; }
  p { margin: 26px 0 0; font: 20px/1.4 ui-monospace, 'SF Mono', Menlo, monospace; letter-spacing: 0.26em; text-transform: uppercase; color: #cbc5b7; }
  i { font-style: normal; color: #ffc46b; margin: 0 0.5em; }
</style><main>${logo().replaceAll('currentColor', INK)}<p>Every crewed spacecraft <i>·</i> to scale <i>·</i> as it flew</p></main>`;
const { chromium } = await import('playwright-core');
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(card);
const png = join(root, 'public', 'og.png');
await page.screenshot({ path: png });
await browser.close();
console.log(png);
