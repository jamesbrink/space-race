// Looks for z-fighting in the running viewer: surfaces that flicker when the camera moves.
//   node tools/flicker-test.mjs [url] [--shots <dir>]      (default url: http://localhost:5180/)
// --shots writes a map per pose that has any flips: the frame dimmed, the flipping pixels magenta.
//
// Each model is framed in each of its views from six directions. At every pose three frames
// are taken: A, then B with the camera turned 0.005 degrees, then A again. Honest geometry
// barely changes under a turn that small. Two faces fighting for the same depth swap pixels
// wholesale, so a pixel that jumps between A and B and comes back in the second A is a flip.
// Lone flips (glints) and one-pixel lines (thin edges) are ignored; a flip counts when at
// least five of its eight neighbours flipped too. A pose fails if it has more than FLIPS of those.
//
// The geometric cause is caught earlier and more exactly by srlib.check_clearance at build
// time; this is the end-to-end check that the renderer's depth range is doing its part.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const FLIPS = 40; // pixels in solid patches, at 1280 x 800. Two fighting faces give hundreds; thin posts lining up give a few.
const JUMP = 90; // summed RGB difference that counts as a jump
const NUDGE = 0.005; // degrees. Small enough that a thin post 60 m off-axis moves a twentieth of a pixel.
const BACK = 24; // and how close the second A must be to the first

const args = process.argv.slice(2);
const shotsAt = args.indexOf('--shots');
const shots = shotsAt >= 0 ? args.splice(shotsAt, 2)[1] : null;
const url = args[0] ?? 'http://localhost:5180/';
if (shots) mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => ['error', 'warning'].includes(m.type()) && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(url);
await page.waitForFunction(() => window.sr && document.querySelector('.loading.done'));
await page.addStyleTag({ content: '#ui { display: none !important }' });

/** Take A, B (nudged), A again inside the page and count the pixels that jump and come back. */
const flipsAt = (view, az) =>
  page.evaluate(
    async ([view, az, JUMP, BACK, NUDGE]) => {
      window.sr.stage.frozen = true;
      const src = document.querySelector('#stage');
      const c = document.createElement('canvas');
      c.width = src.width;
      c.height = src.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      const grab = async (nudge) => {
        window.sr.stage.shot(view, az, nudge);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))));
        g.drawImage(src, 0, 0); // the WebGL buffer is not preserved, so copy it in the same task as the frame
        return g.getImageData(0, 0, c.width, c.height).data;
      };
      const a = await grab(0), b = await grab(NUDGE), a2 = await grab(0);
      const w = c.width, h = c.height;
      const mask = new Uint8Array(w * h);
      for (let i = 0, p = 0; i < a.length; i += 4, p++) {
        const ab = Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]);
        const aa = Math.abs(a[i] - a2[i]) + Math.abs(a[i + 1] - a2[i + 1]) + Math.abs(a[i + 2] - a2[i + 2]);
        if (ab > JUMP && aa < BACK) mask[p] = 1;
      }
      // a lone pixel is a glint on a bolt head and a thin line is a truss edge crossing a pixel
      // boundary; fighting faces flip in solid patches
      let flips = 0;
      for (let y = 1; y < h - 1; y++)
        for (let x = 1; x < w - 1; x++) {
          const p = y * w + x;
          let near = 0;
          if (mask[p]) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) near += mask[p + dy * w + dx];
          const flip = near >= 6;
          if (flip) flips++;
          const i = p * 4;
          b[i] = flip ? 255 : a[i] >> 2;
          b[i + 1] = flip ? 0 : a[i + 1] >> 2;
          b[i + 2] = flip ? 255 : a[i + 2] >> 2;
        }
      g.putImageData(new ImageData(b, c.width, c.height), 0, 0);
      return { flips, map: flips ? c.toDataURL('image/png') : null };
    },
    [view, az, JUMP, BACK, NUDGE],
  );

let failed = 0;
const models = await page.evaluate(() => window.sr.flight.models.map((m) => ({ id: m.id, views: ['all', ...m.views.map((v) => v.id)] })));
for (const model of models) {
  await page.evaluate((id) => window.sr.show(id), model.id);
  await page.waitForFunction(() => document.querySelector('.loading.done'));
  await page.waitForTimeout(400);
  for (const view of model.views)
    // six directions, chosen so no pose puts the camera inside the pad's masts
    for (const az of [20, 80, 140, 200, 260, 320]) {
      const { flips, map } = await flipsAt(view, az);
      const ok = flips <= FLIPS;
      if (!ok) failed++;
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${model.id.padEnd(8)} ${view.padEnd(11)} az ${String(az).padStart(3)}   flips ${String(flips).padStart(5)} (<= ${FLIPS})`);
      if (shots && map) writeFileSync(join(shots, `${model.id}-${view}-${az}-flips.png`), Buffer.from(map.split(',')[1], 'base64'));
    }
}
if (errors.length) {
  failed++;
  console.log(`FAIL console: ${errors.length} errors or warnings\n  ${errors.slice(0, 8).join('\n  ')}`);
}
await browser.close();
console.log(failed ? `flicker-test: ${failed} FAILED` : 'flicker-test: ok');
process.exit(failed ? 1 : 0);
