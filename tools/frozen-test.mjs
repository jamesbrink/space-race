// A frozen stage draws the same frame twice: checked in the running viewer, in both looks.
//   node tools/frozen-test.mjs [url] [--shots <dir>]      (default url: http://localhost:5180/)
// --shots writes a map per pose that moved: the frame dimmed, the pixels that differed magenta.
//
// Everything that compares pictures (test:flicker, tools/lod-measure.mjs, `pnpm bench --shots`) sets `stage.frozen`
// and trusts that what differs between two grabs is what it changed. So at each pose, in each look:
//   still:   after SETTLE frames the view is drawn DRAWS times more, and every one must be the first, to the last bit;
//   thrown:  every level of detail is forced to another and back (as the measuring tools do), and after SETTLE frames
//            the picture must be the one from before, to the last bit.
// What has moved a frozen picture before, so it is looked for first: a room's lamp handed from room to room by the
// wall's clock (lamps.ts: `atOnce`), and the clouds' blend with their last frames (clouds.ts: `frozen`). The page
// is given time to finish arriving first (levels of detail, trees, maps, the other look's shaders): until then the
// picture changes because the scene does.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const SETTLE = 4; // frames drawn after a pose or a switch before the picture is trusted (what the other tools give it)
const DRAWS = 4;
/** Each pose: a model to show, the clock (seconds from liftoff), and the camera: a named view from an azimuth, or `Stage.pose`'s arguments. */
const POSES = [
  { name: 'vehicle, all', show: 'vehicle', t: 0, shot: ['all', 20] },
  { name: 'pad, all', show: 'pad', t: 0, shot: ['all', 140] },
  { name: 'pad from 150 m', show: 'pad', t: 0, pose: [215, 9, 150, 14] },
  { name: 'the place from 400 m', show: 'pad', t: 0, pose: [30, 10, 400, 10] },
  { name: 'beside the gantry', show: 'pad', t: 0, pose: [120, 4, 40, 6] },
  { name: 'pad by night', show: 'pad', t: -6 * 3600, pose: [215, 9, 150, 14] },
];

const args = process.argv.slice(2);
const shotsAt = args.indexOf('--shots');
const shots = shotsAt >= 0 ? args.splice(shotsAt, 2)[1] : null;
const url = args[0] ?? 'http://localhost:5180/';
if (shots) mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${url}#vehicle`);
await page.waitForFunction(() => window.sr?.stage && document.querySelector('.loading.done'), null, { timeout: 180_000 });
await page.addStyleTag({ content: '#ui, #gallery { display: none !important }' });

await page.evaluate(async () => {
  const { stage, clock } = window.sr;
  stage.setAutoRotate(false);
  clock.pause();
  stage.frozen = true;
  await Promise.allSettled(stage.arriving ?? []);
  const src = document.querySelector('#stage');
  const copy = document.createElement('canvas');
  const pen = copy.getContext('2d', { willReadFrequently: true });
  const frame = () => new Promise((done) => requestAnimationFrame(done));
  /** Draw `frames` frames, then one more, and take it (the WebGL buffer is not kept: copied in the frame's own task). */
  window.grab = async (frames = 0) => {
    for (let i = 0; i <= frames; i++) {
      stage.dirty = true;
      await frame();
    }
    if (copy.width !== src.width || copy.height !== src.height) {
      copy.width = src.width;
      copy.height = src.height;
    }
    pen.drawImage(src, 0, 0);
    return pen.getImageData(0, 0, copy.width, copy.height).data;
  };
  /** Pixels that differ at all, the most a channel differs by, and (asked for) a map of them. */
  window.differ = (a, b, map = false) => {
    let n = 0,
      worst = 0;
    const out = map ? new Uint8ClampedArray(a.length) : null;
    for (let i = 0; i < a.length; i += 4) {
      const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      if (d) n++;
      if (d > worst) worst = d;
      if (out) {
        out[i] = d ? 255 : a[i] >> 2;
        out[i + 1] = d ? 0 : a[i + 1] >> 2;
        out[i + 2] = d ? 255 : a[i + 2] >> 2;
        out[i + 3] = 255;
      }
    }
    if (!out || !n) return { n, worst, map: null };
    pen.putImageData(new ImageData(out, copy.width, copy.height), 0, 0);
    return { n, worst, map: copy.toDataURL('image/png') };
  };
  /** Wait until the picture has stopped changing by itself (the page still arriving): `run` identical frames one after another. */
  window.quiet = async (run = 120, most = 2400) => {
    let last = await window.grab(),
      same = 0;
    for (let i = 0; i < most && same < run; i++) {
      const next = await window.grab();
      same = window.differ(last, next).n ? 0 : same + 1;
      last = next;
    }
    return same >= run;
  };
});

/** In the page: one pose in the look in force. */
const at = (pose) =>
  page.evaluate(
    async ([pose, SETTLE, DRAWS]) => {
      const { stage, clock, show } = window.sr;
      show(pose.show);
      clock.seek(pose.t);
      clock.pause();
      if (pose.shot) stage.shot(...pose.shot);
      else stage.pose(...pose.pose);
      const first = await window.grab(SETTLE);
      const still = { n: 0, worst: 0, map: null };
      for (let i = 1; i < DRAWS; i++) {
        const d = window.differ(first, await window.grab(), true);
        if (d.n > still.n) Object.assign(still, d);
      }
      // a switch thrown and thrown back: every model and every piece of the place at another level, then at the one it had
      // (held there by `forced` both times: left to itself a level has a margin each way and need not come back)
      const models = stage.staged.map((s) => s.shownLevel);
      const pieces = Object.fromEntries((stage.scenery?.shown ?? []).map((p) => [p.name, p.level]));
      const other = (level) => (level ? level - 1 : 1);
      const force = (to) => {
        stage.staged.forEach((s, i) => {
          s.forced = to(models[i]);
        });
        if (stage.scenery) stage.scenery.forced = Object.fromEntries(Object.entries(pieces).map(([name, level]) => [name, to(level)]));
      };
      force((level) => level);
      const before = await window.grab(SETTLE);
      force(other);
      const coarse = await window.grab(SETTLE);
      force((level) => level);
      const after = await window.grab(SETTLE);
      for (const s of stage.staged) s.forced = null;
      if (stage.scenery) stage.scenery.forced = null;
      return { still, thrown: window.differ(before, after, true), changed: window.differ(before, coarse).n };
    },
    [pose, SETTLE, DRAWS],
  );

let failed = 0;
for (const look of ['real', 'cel']) {
  await page.evaluate((look) => window.sr.stage.setLook(look), look);
  if (!(await page.evaluate(() => window.quiet()))) console.log(`     (${look}: the page had not come to rest)`);
  for (const pose of POSES) {
    const r = await at(pose);
    for (const [what, d] of [
      ['still', r.still],
      ['thrown', r.thrown],
    ]) {
      const ok = d.n === 0;
      if (!ok) failed++;
      console.log(
        `${ok ? 'ok  ' : 'FAIL'} ${look.padEnd(4)} ${pose.name.padEnd(22)} ${what.padEnd(6)}  differing ${String(d.n).padStart(6)}${d.n ? `  (by up to ${d.worst} of 255)` : ''}${what === 'thrown' ? `   (at the other level: ${r.changed})` : ''}`,
      );
      if (shots && d.map)
        writeFileSync(join(shots, `${look}-${pose.name.replace(/\W+/g, '-')}-${what}.png`), Buffer.from(d.map.split(',')[1], 'base64'));
    }
  }
}
if (errors.length) {
  failed++;
  console.log(`FAIL console: ${errors.length} errors\n  ${errors.slice(0, 8).join('\n  ')}`);
}
await browser.close();
console.log(failed ? `frozen-test: ${failed} FAILED` : 'frozen-test: ok');
process.exit(failed ? 1 : 0);
