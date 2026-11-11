// Writes the mark (src/logo.ts) as a file for places that cannot run the page: docs/logo.svg, shown in the README.
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
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'logo.svg');
writeFileSync(out, `${svg}\n`);
console.log(out);
