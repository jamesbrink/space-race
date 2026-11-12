// The measuring behind tools/lod-thresholds.mjs (read that first): each model of each flight, and each piece of the
// place it flew from, drawn at two levels from the same eye in a real browser, and the pixels that differ counted.
// Needs the viewer running (`pnpm dev`). Writes missions/.../model/<name>.lod.json.
import { spawnSync } from 'node:child_process';
import { existsSync, globSync, readFileSync, writeFileSync } from 'node:fs';
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

/**
 * In the page: the same view of one thing at two of its levels, and how many pixels differ; and, as a control, how
 * many differ between the first level drawn before and after the other (`control`: a frozen stage draws the same
 * frame twice, `pnpm test:frozen`, so it is nought unless the page was still arriving: then it is waited for and
 * the three are taken again).
 */
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
    if (target.model === undefined) st.scenery.forced = level === null ? null : { [target.name]: level };
    else st.staged[target.model].forced = level === null ? null : target.piece ? { [target.name]: level } : level;
    for (let i = 0; i < 3; i++) await frame();
    st.dirty = true;
    await frame();
    copy.width = canvas.width;
    copy.height = canvas.height;
    pen.drawImage(canvas, 0, 0);
    return pen.getImageData(0, 0, copy.width, copy.height).data;
  };
  const count = (x, y, over) => {
    let n = 0;
    for (let i = 0; i < x.length; i += 4)
      if (Math.abs(x[i] - y[i]) + Math.abs(x[i + 1] - y[i + 1]) + Math.abs(x[i + 2] - y[i + 2]) > over) n++;
    return n;
  };
  let one;
  let other;
  let control = 0;
  for (let tries = 0; tries < 4; tries++) {
    one = await grab(a);
    other = await grab(b);
    let last = await grab(a);
    control = count(one, last, 0);
    if (!control) break;
    // (not at rest: until a frame drawn again is the same frame, thirty times running)
    for (let same = 0, i = 0; i < 600 && same < 30; i++) {
      const next = await grab(a);
      same = count(last, next, 0) ? 0 : same + 1;
      last = next;
    }
  }
  await grab(null);
  return { differ: count(one, other, apart), control };
}

/** In the page: change the look, and wait until a frame drawn again is the same frame. */
async function inLook(look) {
  const st = window.sr.stage;
  st.frozen = true;
  if (st.looks.current !== look) st.setLook(look);
  const canvas = st.renderer.domElement;
  const copy = (window.__lodCopy ??= document.createElement('canvas'));
  const pen = copy.getContext('2d', { willReadFrequently: true });
  let last = null;
  for (let same = 0, i = 0; i < 1200 && same < 60; i++) {
    st.dirty = true;
    await new Promise((done) => requestAnimationFrame(done));
    copy.width = canvas.width;
    copy.height = canvas.height;
    pen.drawImage(canvas, 0, 0);
    const next = pen.getImageData(0, 0, copy.width, copy.height).data;
    let differs = !last;
    for (let k = 0; last && k < next.length && !differs; k++) differs = next[k] !== last[k];
    same = differs ? 0 : same + 1;
    last = next;
  }
  return st.looks.current;
}

/**
 * The largest size at which a thing is measured, pixels a metre: the one at which the ball round it is as tall as
 * the window. Larger than that only a part of it is in the picture, and the pixels that differ are those of
 * whichever part the eye happened to be turned to: a gantry's two levels came out the same from 16 m, with its
 * bracing out of the frame. So nothing as big as that is held coarser than from where all of it is seen.
 */
const whole = (thing) => H / (2 * thing.radius);

/** The looks a thing is measured in: its threshold is from whichever shows more of the change. */
const LOOKS = ['real', 'cel'];

export async function measure({ url, flight, only }) {
  const wanted = only ? new RegExp(only) : null;
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
    await page.waitForFunction(() => window.sr && /scene-ready|gallery-settled/.test(document.body.className), null, { timeout: 180_000 });
    if (await page.evaluate(() => document.body.classList.contains('in-gallery'))) {
      // (a flight with no site is shown in the gallery, on a stage of its own that has no way to hold a level: its
      // models keep the viewer's own thresholds until it has a site)
      console.log(`${id}: no site to stand it on: not measured`);
      await page.close();
      continue;
    }
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
        // (a model drawn piece by piece has a threshold for each piece and none of its own)
        ...flight.models.flatMap((m, i) =>
          stage.staged[i].pieces
            ? stage.staged[i].pieces.map((p) => ({
                glb: file(m.url),
                name: p.name,
                model: i,
                piece: true,
                levels: p.nodes.filter(Boolean).length,
                ...round(p.box),
              }))
            : [
                {
                  glb: file(m.url),
                  name: '',
                  model: i,
                  levels: stage.staged[i].levels.filter(Boolean).length,
                  ...round(stage.staged[i].box),
                },
              ],
        ),
        ...(stage.scenery?.pieces ?? []).map((p) => ({
          glb: file(flight.surroundings),
          name: p.name,
          levels: p.nodes.filter(Boolean).length,
          ...round(p.box),
        })),
      ];
    });
    // each thing in each look, a look at a time (a change of look is seconds of the page arriving: not between grabs)
    const taken = things.filter((t) => !done.has(`${t.glb}:${t.name}`) && (!wanted || wanted.test(`${t.glb}:${t.name}`)));
    const found = new Map(taken.map((t) => [t, LOD_ABOVE.map(() => ({ rows: new Map(), over: Number.POSITIVE_INFINITY }))]));
    let compared = 0;
    let restless = 0;
    for (const look of LOOKS) {
      const got = await page.evaluate(inLook, look);
      if (got !== look) throw new Error(`${id}: the page would not take the ${look} look`);
      for (const thing of taken) {
        for (let n = 0; n < LOD_ABOVE.length; n++) {
          if (thing.levels <= n + 1) continue;
          const boundary = found.get(thing)[n];
          // (smallest first, and no further than the first size at which too much differs in either look: nothing larger can raise the threshold)
          for (const ppm of [...PPMS].reverse()) {
            if (ppm > boundary.over || ppm > whole(thing)) break;
            let differ = 0;
            for (const azimuth of [30, 270]) {
              const r = await page.evaluate(differing, [thing, n, n + 1, ppm, azimuth, APART]);
              differ = Math.max(differ, r.differ);
              compared++;
              if (r.control) {
                restless++;
                console.log(
                  `  (${look} ${thing.name || thing.glb} ${n}|${n + 1} at ${ppm}: the same level drawn again differed by ${r.control} pixels)`,
                );
              }
            }
            boundary.rows.set(ppm, Math.max(boundary.rows.get(ppm) ?? 0, differ));
            if (differ > ALLOWED[n]) {
              boundary.over = ppm;
              break;
            }
          }
        }
        // (as it goes: a whole flight in both looks is the better part of an hour)
        console.log(
          `  ${look} ${thing.glb} ${thing.name || '(the model)'}: ${found
            .get(thing)
            .map((f) => [...f.rows].map((r) => r.join(':')).join(' '))
            .join(' | ')}`,
        );
      }
    }
    console.log(
      `${id}: ${compared} comparisons in ${LOOKS.join(' and ')}; the same level drawn again was not the same picture in ${restless}`,
    );
    const byModel = new Map();
    for (const thing of taken) {
      let record = byModel.get(thing.glb);
      if (!record) {
        // (what is not measured this time keeps what it had)
        const kept = existsSync(recordOf(thing.glb)) ? JSON.parse(readFileSync(recordOf(thing.glb), 'utf8')) : {};
        record = { above: { ...kept.above }, measured: { ...kept.measured } };
        if (thing.piece) {
          delete record.above[''];
          delete record.measured[''];
        }
        byModel.set(thing.glb, record);
      }
      const above = [];
      const measured = [];
      found.get(thing).forEach((boundary, n) => {
        const rows = [...boundary.rows].filter(([ppm]) => ppm <= boundary.over).map(([ppm, differ]) => ({ ppm, differ }));
        rows.sort((x, y) => x.ppm - y.ppm);
        above.push(rows.length ? thresholdFrom(rows, n) : LOD_ABOVE[n]);
        measured.push(rows.map((r) => [r.ppm, r.differ]));
      });
      record.above[thing.name] = apart(above);
      record.measured[thing.name] = measured;
      console.log(
        `${thing.glb} ${thing.name || '(the model)'}: ${apart(above).join(', ')}   ${measured.map((m) => m.map((r) => r.join(':')).join(' ')).join(' | ')}`,
      );
    }
    for (const [glb, record] of byModel) {
      for (const name of Object.keys(record.above)) done.add(`${glb}:${name}`);
      writeFileSync(
        recordOf(glb),
        `${JSON.stringify(
          {
            about: `Levels of detail: the size on screen (pixels a metre) above which each finer level is drawn, and the pixels of ${W} x ${H} that differed between two levels as [size, pixels] pairs, smallest size first, up to the first at which too many did (first from level 0 to 1, then 1 to 2), in whichever of the two looks more differed. Allowed: ${ALLOWED.join(' and ')}. Written by tools/lod-thresholds.mjs --measure; "" is the model as a whole, any other name a piece of it.`,
            ...record,
          },
          null,
          1,
        )}\n`,
      );
    }
    // (formatting is the tools' job: the records as Biome writes JSON)
    spawnSync('pnpm', ['exec', 'biome', 'format', '--write', ...[...byModel.keys()].map(recordOf)], { cwd: root, stdio: 'inherit' });
    await page.close();
  }
  await browser.close();
}
