// Looks for z-fighting in the running viewer: surfaces that flicker when the camera moves.
//   node tools/flicker-test.mjs [url] [--shots <dir>]      (default url: http://localhost:5180/)
//   node tools/flicker-test.mjs "http://localhost:5180/#ussr/vostok/vostok-1"     a flight's gallery: its vehicle alone
// An address that opens a gallery (any flight's own address; the only place a flight without a site has) tests the
// gallery's stage: the vehicle, in the views the gallery offers of it, and cut open. One that opens a site
// (`#<flight>/site`, or no address: the first flight's) tests every model there.
// --shots writes a map per pose that has any flips: the frame dimmed, the flipping pixels magenta.
//
// Each model is framed in each of its views from six directions. At every pose three frames
// are taken: A, then B with the camera turned 0.005 degrees, then A again. Honest geometry
// barely changes under a turn that small. Two faces fighting for the same depth swap pixels
// wholesale, so a pixel that jumps between A and B and comes back in the second A is a flip.
// Lone flips (glints) and lines one or two pixels wide (edges, some right beside the camera)
// are ignored; a flip counts when at least six of its eight neighbours flipped too. A pose fails if it has more than FLIPS of those.
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
// (the launch site's page: an address that names nothing opens the gallery, which has one model and no `sr.show`. A url that
// carries an address is opened as it is: `#vehicle` put after it made a flight's name no flight's, and the first flight's gallery was tested instead)
await page.goto(url.includes('#') ? url : `${url}#vehicle`);
await page.waitForFunction(() => window.sr && document.querySelector('.loading.done'));
// which stage is up: the gallery's (its own canvas) or the site's
await page.waitForTimeout(600);
const inGallery = await page.evaluate(() => Boolean(window.sr.gallery?.active ?? !window.sr.show));
if (inGallery) await page.waitForFunction(() => window.sr.gallery.stage?.def, null, { timeout: 60000 });
await page.evaluate((g) => {
  window.srStage = () => (g ? window.sr.gallery.stage : window.sr.stage);
  window.srCanvas = () => document.querySelector(g ? '#gallery-stage' : '#stage');
}, inGallery);
await page.addStyleTag({ content: '#ui, #gallery { display: none !important }' });
// The page goes on arriving after the curtain lifts (coarser levels, trees, maps), and a picture that changes because
// the scene does reads as a flip at the first pose: wait until a frozen frame drawn again is the same frame, a second long.
await page.evaluate(async () => {
  const stage = window.srStage();
  stage.frozen = true;
  await Promise.allSettled(stage.arriving ?? []);
  const src = window.srCanvas();
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext('2d', { willReadFrequently: true });
  let last = null;
  for (let i = 0, same = 0; i < 1800 && same < 60; i++) {
    stage.dirty = true;
    await new Promise((r) => requestAnimationFrame(r));
    g.drawImage(src, 0, 0);
    const next = g.getImageData(0, 0, c.width, c.height).data;
    same = last?.every((v, j) => v === next[j]) ? same + 1 : 0;
    last = next;
  }
});

/** Take A, B (nudged), A again inside the page and count the pixels that jump and come back. */
const flipsAt = (view, az) =>
  page.evaluate(
    async ([view, az, JUMP, BACK, NUDGE]) => {
      window.srStage().frozen = true;
      const src = window.srCanvas();
      const c = document.createElement('canvas');
      c.width = src.width;
      c.height = src.height;
      const g = c.getContext('2d', { willReadFrequently: true });
      const grab = async (nudge) => {
        window.srStage().shot(view, az, nudge);
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(r))));
        g.drawImage(src, 0, 0); // the WebGL buffer is not preserved, so copy it in the same task as the frame
        return g.getImageData(0, 0, c.width, c.height).data;
      };
      const a = await grab(0),
        b = await grab(NUDGE),
        a2 = await grab(0);
      const w = c.width,
        h = c.height;
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
          const flip = near >= 7; // itself and six of its eight neighbours: a patch, not a two-pixel edge
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
const models = await page.evaluate((g) => {
  const of = (m) => ({ id: m.id, cutaway: Boolean(m.cutaway), views: ['all', ...m.views.map((v) => v.id)] });
  // (the gallery's stage has the one model, with the views the gallery gives it of what stands there)
  return g ? [of(window.sr.gallery.stage.def)] : window.sr.flight.models.map(of);
}, inGallery);
console.log(inGallery ? 'the gallery' : 'the site');
for (const model of models) {
  if (!inGallery) {
    await page.evaluate((id) => window.sr.show(id), model.id);
    await page.waitForFunction(() => document.querySelector('.loading.done'));
  }
  await page.waitForTimeout(400);
  // every view from six directions; then, where there is a cutaway, every view again looking into it
  const passes = model.cutaway ? [false, true] : [false];
  for (const cut of passes) {
    await page.evaluate((on) => window.srStage().setCutaway(on), cut);
    // six directions, chosen so no pose puts the camera inside the pad's masts
    for (const view of model.views)
      for (const az of cut ? [20] : [20, 80, 140, 200, 260, 320]) {
        const { flips, map } = await flipsAt(view, az);
        const ok = flips <= FLIPS;
        if (!ok) failed++;
        console.log(
          `${ok ? 'ok  ' : 'FAIL'} ${(model.id + (cut ? ' cut' : '')).padEnd(12)} ${view.padEnd(11)} az ${String(az).padStart(3)}   flips ${String(flips).padStart(5)} (<= ${FLIPS})`,
        );
        if (shots && map)
          writeFileSync(join(shots, `${model.id}${cut ? '-cut' : ''}-${view}-${az}-flips.png`), Buffer.from(map.split(',')[1], 'base64'));
      }
  }
}
if (errors.length) {
  failed++;
  console.log(`FAIL console: ${errors.length} errors or warnings\n  ${errors.slice(0, 8).join('\n  ')}`);
}
await browser.close();
console.log(failed ? `flicker-test: ${failed} FAILED` : 'flicker-test: ok');
process.exit(failed ? 1 : 0);
