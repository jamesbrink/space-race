// The measuring behind tools/lod-thresholds.mjs (read that first): each model of each flight, and each piece of the
// place it flew from, drawn at two levels from the same eye in a real browser, and the pixels that differ counted.
// Needs the viewer running (`pnpm dev`). Writes missions/.../model/<name>.lod.json.
import { globSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { ALLOWED, apart, LOD_ABOVE, PPMS, recordOf, thresholdFrom } from './lod-thresholds.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
/** The window the pixels are counted in: `ALLOWED` is of this many. */
const W = 1280;
const H = 800;
/** A pixel differs when its red, green and blue together are this far apart, of 765. */
const APART = 30;

/** In the page: the same view of one thing at two of its levels, and how many pixels differ. */
async function differing([target, a, b, ppm, azimuth, apart]) {
  const st = window.sr.stage;
  st.frozen = true;
  const canvas = st.renderer.domElement;
  const scale = canvas.height / (2 * Math.tan((st.camera.fov * Math.PI) / 360));
  st.pose(azimuth, 10, scale / ppm + 0.6 * target.radius, target.centre[1], target.centre[0], target.centre[2]);
  const copy = (window.__lodCopy ??= document.createElement('canvas'));
  const pen = copy.getContext('2d', { willReadFrequently: true });
  const frame = () => new Promise((done) => requestAnimationFrame(done));
  const grab = async (level) => {
    if (target.model !== undefined) st.staged[target.model].forced = level;
    else st.scenery.forced = level === null ? null : { [target.name]: level };
    for (let i = 0; i < 3; i++) await frame();
    st.dirty = true;
    await frame();
    copy.width = canvas.width;
    copy.height = canvas.height;
    pen.drawImage(canvas, 0, 0);
    return pen.getImageData(0, 0, copy.width, copy.height).data;
  };
  const one = await grab(a);
  const other = await grab(b);
  await grab(null);
  let n = 0;
  for (let i = 0; i < one.length; i += 4)
    if (Math.abs(one[i] - other[i]) + Math.abs(one[i + 1] - other[i + 1]) + Math.abs(one[i + 2] - other[i + 2]) > apart) n++;
  return n;
}

export async function measure({ url, flight }) {
  // every flight that has levels to choose between
  const flights =
    flight?.split(',') ??
    [...new Set(globSync('public/models/**/*.lod1.glb', { cwd: root }).map((f) => dirname(f).split('/').slice(2).join('/')))].filter(
      (f) => !f.includes('/sites/'),
    );
  const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const done = new Set();
  for (const id of flights) {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const sections = globSync(`public/models/${id}/*.glb`, { cwd: root })
      .map((f) =>
        f
          .split('/')
          .pop()
          .replace(/\.glb$/, ''),
      )
      .filter((n) => !n.includes('.lod'));
    await page.goto(`${url}#${id}/${sections.includes('pad') ? 'pad' : sections[0]}`);
    await page.waitForFunction(() => window.sr && document.body.classList.contains('scene-ready'), null, { timeout: 180_000 });
    await page.addStyleTag({ content: '#ui { display: none !important }' });
    const things = await page.evaluate(async () => {
      const { stage, flight } = window.sr;
      stage.setAutoRotate(false);
      await Promise.allSettled(stage.arriving ?? []); // (every level in before anything is measured)
      const file = (address) => new URL(address, location.href).pathname.split('/models/')[1];
      const round = (box) => ({
        centre: box.min.clone().add(box.max).multiplyScalar(0.5).toArray(),
        radius: box.min.distanceTo(box.max) / 2,
      });
      return [
        ...flight.models.map((m, i) => ({
          glb: file(m.url),
          name: '',
          model: i,
          levels: stage.staged[i].levels.filter(Boolean).length,
          ...round(stage.staged[i].box),
        })),
        ...(stage.scenery?.pieces ?? []).map((p) => ({
          glb: file(flight.surroundings),
          name: p.name,
          levels: p.nodes.filter(Boolean).length,
          ...round(p.box),
        })),
      ];
    });
    const byModel = new Map();
    for (const thing of things) {
      if (done.has(`${thing.glb}:${thing.name}`)) continue; // (a place two flights share is measured once)
      const record = byModel.get(thing.glb) ?? { above: {}, measured: {} };
      byModel.set(thing.glb, record);
      const above = [];
      const measured = [];
      for (let n = 0; n < LOD_ABOVE.length; n++) {
        const rows = [];
        if (thing.levels > n + 1)
          // (smallest first, and no further than the first size at which too much differs: nothing larger can raise the threshold)
          for (const ppm of [...PPMS].reverse()) {
            let differ = 0;
            for (const azimuth of [30, 270])
              differ = Math.max(differ, await page.evaluate(differing, [thing, n, n + 1, ppm, azimuth, APART]));
            rows.push({ ppm, differ });
            if (differ > ALLOWED[n]) break;
          }
        above.push(rows.length ? thresholdFrom(rows, n) : LOD_ABOVE[n]);
        measured.push(Object.fromEntries(rows.map((r) => [`${r.ppm}`, r.differ])));
      }
      record.above[thing.name] = apart(above);
      record.measured[thing.name] = measured;
      console.log(
        `${thing.glb} ${thing.name || '(the model)'}: ${above.join(', ')}   ${measured.map((m) => Object.values(m).join(' ')).join(' | ')}`,
      );
    }
    for (const [glb, record] of byModel) {
      for (const name of Object.keys(record.above)) done.add(`${glb}:${name}`);
      writeFileSync(
        recordOf(glb),
        `${JSON.stringify(
          {
            about: `Levels of detail: the size on screen (pixels a metre) above which each finer level is drawn, and the pixels of ${W} x ${H} that differed between two levels at each size measured (smallest first, up to the first at which too many did; first from level 0 to 1, then 1 to 2). Allowed: ${ALLOWED.join(' and ')}. Written by tools/lod-thresholds.mjs --measure; "" is the model as a whole.`,
            ...record,
          },
          null,
          1,
        )}\n`,
      );
    }
    await page.close();
  }
  await browser.close();
}
