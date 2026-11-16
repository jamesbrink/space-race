// The launch sites by night: what is seen at each hour, that the light never steps through dusk and dawn, and that the
// eye adapts to what it is looking at without pumping (docs/agents/rendering.md, "The eye").
//   node tools/night-test.mjs [url] [--shots <dir>] [--only <regex>] [--json <file>] [--rate <s a s>] [--no-curves] [--no-walk]
// Needs `pnpm dev` running (default url: http://localhost:5180/).
//
// Three parts, each over Site 1 (Vostok 1 and 2) and Complex 5 (Freedom 7, Liberty Bell 7):
//   stills:  (with --shots) deep night with no Moon, dusk, and a quarter-Moon night, in both looks, from over the pad,
//            from across it and on foot at eye height: a PNG of each and the mean level of its sky, its ground and the
//            whole, with the exposure it was drawn at. Look at them.
//   curves:  the clock run through sunset to full dark and from full dark through sunrise at `--rate` (60) times life,
//            the view from across the pad (the sky, the land and the lit pad in one frame), sampled every few seconds of
//            site time, the clouds held still (their shadows sweep the land in seconds at that rate): the frame's mean, the sky's, the dark ground's
//            and a lamp-lit patch's, and the exposure. Each must run without a jump: no sample may differ from the last by
//            more than JUMP levels of 255 beyond what the samples round it are doing (a jump is a change the neighbours
//            do not share), and the exposure by no more than EXPOSURE_STEP between samples.
//   lit:     Complex 5's service structure by night from over the pad, in both looks, standing in the floods: drawn as it
//            is and drawn with the rods' sight switched off, it must keep its brightness and its colour (the rods' sight
//            is for what nothing lights but the night: Pipeline.night).
//   walk:    on foot at Complex 5 at night, from the floodlit apron out into the dark, standing there, and back, the
//            exposure read every frame: it must change by no more than WALK_STEP between frames, come up over tens of
//            seconds going out (the eye's dark adaptation) and settle within a few seconds coming back (its light
//            adaptation).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checks, flag, launch, open, opt, url as urlOf } from './browser.mjs';
import { flights } from '../missions/index.ts';
import { refraction, skyFrom } from '../src/world/ephemeris.ts';
import { DEG, siteFrame } from '../src/world/frames.ts';
import { julianDate } from '../src/world/time.ts';

/** Levels of 255 a sample may stand out from the line through its neighbours before it is a jump. */
const JUMP = 3;
/** The most the exposure may change between two samples of the curves (a fraction of itself). */
const EXPOSURE_STEP = 0.08;
/** The most the exposure may change between two frames on foot (a fraction of itself). */
const WALK_STEP = 0.06;

const args = process.argv.slice(2);
const shots = opt(args, '--shots', null);
const json = opt(args, '--json', null);
const onlyAs = opt(args, '--only', null);
const only = onlyAs === null ? null : new RegExp(onlyAs);
const rate = Number(opt(args, '--rate', '60'));
const noCurves = flag(args, '--no-curves');
const noWalk = flag(args, '--no-walk');
const url = urlOf(args);
if (shots) mkdirSync(shots, { recursive: true });

const flightOf = (id) => flights.find((f) => f.id === id);
/** The Sun's apparent elevation at a flight's site, degrees, `t` seconds from its liftoff. */
const sunAt = (flight, t) => {
  const sky = skyFrom(siteFrame(flight.site), julianDate(new Date(Date.parse(flight.launch) + t * 1000).toISOString()));
  return (sky.sun.elevation + refraction(sky.sun.elevation)) / DEG;
};
/** The instant (s from liftoff) the Sun crosses `elevation` going down (`setting`) or up, the last before `before`. */
const crossing = (flight, elevation, setting, before = 0) => {
  let t = before;
  for (let i = 0; i < 2 * 96; i++, t -= 900) {
    const a = sunAt(flight, t - 900) - elevation;
    const b = sunAt(flight, t) - elevation;
    if ((setting ? a > 0 && b <= 0 : a < 0 && b >= 0) === false) continue;
    let lo = t - 900,
      hi = t;
    for (let k = 0; k < 40; k++) {
      const mid = (lo + hi) / 2;
      const m = sunAt(flight, mid) - elevation;
      if (setting ? m > 0 : m < 0) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }
  throw new Error(`no crossing of ${elevation} for ${flight.id}`);
};

const V1 = flightOf('ussr/vostok/vostok-1');
const V2 = flightOf('ussr/vostok/vostok-2');
const F7 = flightOf('usa/mercury/mr-3-freedom-7');
const LB7 = flightOf('usa/mercury/mr-4-liberty-bell-7');

/**
 * Each still: a flight (its site and day), an instant (s from its liftoff) and what it is. Deep night is about half way
 * between the evening's end of astronomical twilight and the morning's start; a quarter-Moon night is the nearest the
 * flight's clock comes to one with the Moon well up.
 */
const STILLS = [
  { site: 'site1', flight: V1, name: 'night', t: -10 * 3600, note: 'no Moon (it is under the horizon), Sun -34°' },
  { site: 'site1', flight: V1, name: 'dusk', t: crossing(V1, -4, true, -12 * 3600), note: 'the evening before, Sun -4°' },
  { site: 'site1', flight: V2, name: 'quarter', t: -56.5 * 3600, note: 'Moon 45 % lit, 27° up, Sun -21° (3 August, three nights before)' },
  { site: 'lc5', flight: F7, name: 'night', t: -12 * 3600, note: 'no Moon (it rises at 04:30 UTC), Sun -29°' },
  { site: 'lc5', flight: F7, name: 'dusk', t: crossing(F7, -4, true, -6 * 3600), note: 'the evening before, Sun -4°' },
  { site: 'lc5', flight: LB7, name: 'quarter', t: -9 * 3600, note: 'Moon 51 % lit, 23° up, Sun -34°' },
];
/** The views: over the pad, across it, and on foot (a place on the apron, looking at the launcher). */
const VIEWS = {
  over: { pose: [215, 28, 220, 10] },
  across: { pose: [30, 3, 420, 4] },
  foot: { from: { site1: [24, 0, 18], lc5: [22, 0, 24] } },
};
/** Boxes of the frame, as fractions of its width and height: [x0, y0, x1, y1]. */
const BOXES = { sky: [0.3, 0.02, 0.7, 0.12], ground: [0.02, 0.86, 0.3, 0.98], middle: [0.4, 0.45, 0.6, 0.6], all: [0, 0, 1, 1] };

const browser = await launch();
const { check, failures } = checks();
const kept = { stills: [], curves: [], walk: null };

/** Open a flight's launch site, still and quiet, with the helpers the parts below use. */
async function site(flight) {
  const opened = await open(browser, `${url}#${flight.id}/site/pad`, { timeout: 180_000, console: ['error'] });
  const { page } = opened;
  await page.addStyleTag({ content: '#ui, #gallery, #title { display: none !important }' });
  await page.evaluate(async (boxes) => {
    const sr = window.sr;
    sr.stage.setAutoRotate(false);
    sr.clock.pause();
    sr.demo.stop();
    sr.demo.wait = Number.POSITIVE_INFINITY; // (never left alone long enough for the idle show)
    await Promise.allSettled(sr.stage.arriving ?? []);
    const src = document.querySelector('#stage');
    const copy = document.createElement('canvas');
    const pen = copy.getContext('2d', { willReadFrequently: true });
    const frame = () => new Promise((done) => requestAnimationFrame(done));
    window.frames = async (n) => {
      for (let i = 0; i < n; i++) {
        sr.stage.dirty = true;
        await frame();
      }
    };
    /** The mean level (0 to 255, as the screen has it) of each box, and the exposure the frame was drawn at. */
    window.levels = async () => {
      sr.stage.dirty = true;
      await frame();
      if (copy.width !== src.width || copy.height !== src.height) {
        copy.width = src.width;
        copy.height = src.height;
      }
      pen.drawImage(src, 0, 0);
      const { width: w, height: h } = copy;
      const data = pen.getImageData(0, 0, w, h).data;
      const out = { exposure: sr.stage.renderer.toneMappingExposure, t: sr.clock.t };
      for (const [name, [x0, y0, x1, y1]] of Object.entries(boxes)) {
        let sum = 0,
          n = 0;
        for (let y = Math.floor(y0 * h); y < Math.floor(y1 * h); y += 2)
          for (let x = Math.floor(x0 * w); x < Math.floor(x1 * w); x += 2) {
            const i = (y * w + x) * 4;
            sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
            n++;
          }
        out[name] = sum / Math.max(1, n);
      }
      return out;
    };
  }, BOXES);
  return opened;
}

const put = async (page, view, where) => {
  await page.evaluate(
    async ({ view, where }) => {
      const sr = window.sr;
      if (sr.stage.walk.active) sr.stage.onFoot.exitWalk();
      if (view.pose) sr.stage.pose(...view.pose);
      else {
        const walker = sr.flight.models.find((m) => m.walker).id;
        sr.stage.enterWalk(walker, { x: where[0], y: where[1] + 0.3, z: where[2] });
        await window.frames(30);
        const p = sr.stage.walk.body.position;
        sr.stage.walk.yaw = Math.atan2(p.x, p.z); // (forward is -sin, -cos of the yaw: toward the launcher)
        sr.stage.walk.pitch = 0.12;
      }
      await window.frames(10);
    },
    { view, where },
  );
};

// --- stills
if (shots) {
  for (const s of STILLS) {
    const label = `${s.site}-${s.name}`;
    if (only && !only.test(label)) continue;
    const { page, errors, close } = await site(s.flight);
    await page.evaluate((t) => window.sr.clock.seek(t), s.t);
    for (const look of ['real', 'cel']) {
      await page.evaluate((look) => window.sr.stage.setLook(look), look);
      for (const [vname, view] of Object.entries(VIEWS)) {
        await put(page, view, view.from?.[s.site]);
        // (on foot the eye is given the time to settle on what it looks at, as a person standing there would)
        await page.waitForTimeout(view.from ? 6000 : 2500);
        const got = await page.evaluate(() => window.levels());
        const file = `${label}-${look}-${vname}.png`;
        await page.screenshot({ path: join(shots, file) });
        kept.stills.push({ label, look, view: vname, file, note: s.note, ...got });
        console.log(
          `${file.padEnd(32)} exposure ${got.exposure.toFixed(3).padStart(8)}  all ${got.all.toFixed(1).padStart(5)}  sky ${got.sky.toFixed(1).padStart(5)}  ground ${got.ground.toFixed(1).padStart(5)}  middle ${got.middle.toFixed(1).padStart(5)}`,
        );
      }
      await page.evaluate(() => window.sr.stage.walk.active && window.sr.stage.onFoot.exitWalk());
    }
    if (errors.length) console.log(`  console: ${errors.slice(0, 4).join(' | ')}`);
    await close();
  }
}

/** A jump: a sample standing out from the straight line between its neighbours by more than `most`. */
const jumps = (values, most) => {
  const found = [];
  for (let i = 1; i < values.length - 1; i++) {
    const between = (values[i - 1] + values[i + 1]) / 2;
    if (Math.abs(values[i] - between) > most) found.push(i);
  }
  // and a step that the line through it cannot hide: a change between two samples far larger than the ones beside it
  for (let i = 2; i < values.length - 1; i++) {
    const d = Math.abs(values[i] - values[i - 1]);
    const round = Math.max(Math.abs(values[i - 1] - values[i - 2]), Math.abs(values[i + 1] - values[i]));
    if (d > most && d > 4 * round) found.push(i);
  }
  return [...new Set(found)].sort((a, b) => a - b);
};

// --- curves through dusk and dawn
if (!noCurves) {
  for (const [name, flight] of [
    ['site1', V1],
    ['lc5', F7],
  ]) {
    if (only && !only.test(`${name}-curve`)) continue;
    const { page, close } = await site(flight);
    await put(page, VIEWS.across);
    for (const [way, from, to] of [
      ['dusk', crossing(flight, 6, true, -3 * 3600), crossing(flight, -20, true, -3 * 3600)],
      // (the morning before the evening above, a day before liftoff: on the launch morning the pad's hardware moves on the
      // flight's clock, which at sixty times life is a change in the picture every few samples that is no light's)
      ['dawn', crossing(flight, -20, false, -18 * 3600), crossing(flight, 6, false, -18 * 3600)],
    ]) {
      // the clock run at `rate`, sampled every few seconds of the site's time
      const samples = await page.evaluate(
        async ({ from, to, rate }) => {
          const sr = window.sr;
          // (the clouds held where they are: at sixty times life their shadows sweep the ground in seconds, which is
          // weather, not the light stepping. The setting's tick drifts them, and the surf and the plants with them)
          sr.stage.setting.tick = undefined;
          sr.clock.seek(from);
          await window.frames(20);
          sr.clock.setRate(rate);
          sr.clock.play();
          const out = [];
          let last = -Infinity;
          while (sr.clock.t < to) {
            await window.frames(1);
            if (sr.clock.t - last >= 4) {
              last = sr.clock.t;
              out.push(await window.levels());
            }
          }
          sr.clock.pause();
          return out;
        },
        { from, to, rate },
      );
      for (const s of samples) s.sun = sunAt(flight, s.t);
      kept.curves.push({ site: name, way, samples });
      console.log(`\n${name} ${way}: ${samples.length} samples, Sun ${samples[0].sun.toFixed(1)}° to ${samples.at(-1).sun.toFixed(1)}°`);
      for (const s of samples.filter((_, i) => i % Math.max(1, Math.round(samples.length / 24)) === 0))
        console.log(
          `  Sun ${s.sun.toFixed(2).padStart(6)}°  exposure ${s.exposure.toFixed(3).padStart(7)}  all ${s.all.toFixed(1).padStart(5)}  sky ${s.sky.toFixed(1).padStart(5)}  ground ${s.ground.toFixed(1).padStart(5)}  lit ${s.middle.toFixed(1).padStart(5)}`,
        );
      // While the Sun's disc is up its shadows are drawn again each time it has moved a twentieth of a degree
      // (backdrops.ts `cadence`), and under a low Sun a long shadow moves across a box at each of those: that is the
      // shadows' cadence, not the light, and is counted apart. Under the horizon nothing casts a sharp shadow but the
      // lamps and the Moon, and the light itself is held to no jump at all.
      const under = samples.filter((s) => s.sun < -0.5);
      for (const box of ['all', 'sky', 'ground', 'middle']) {
        const what = box === 'middle' ? 'lamp-lit patch' : box;
        const found = jumps(
          under.map((s) => s[box]),
          JUMP,
        );
        check(
          !found.length,
          `${name} ${way}: the ${what} runs without a jump with the Sun down${found.length ? ` (at Sun ${found.map((i) => under[i].sun.toFixed(2)).join(', ')}°)` : ''}`,
        );
        const up = samples.filter((s) => s.sun >= -0.5);
        const shadows = jumps(
          up.map((s) => s[box]),
          JUMP,
        );
        if (shadows.length)
          console.log(
            `  note ${name} ${way}: the ${what} moves with the Sun's shadows' steps at ${shadows.map((i) => up[i].sun.toFixed(2)).join(', ')}°`,
          );
      }
      let worst = 0;
      for (let i = 1; i < samples.length; i++) worst = Math.max(worst, Math.abs(Math.log(samples[i].exposure / samples[i - 1].exposure)));
      check(
        worst <= Math.log(1 + EXPOSURE_STEP),
        `${name} ${way}: the exposure never steps (the most between samples ${(100 * (Math.exp(worst) - 1)).toFixed(1)} %)`,
      );
    }
    await close();
  }
}

// --- a structure in the floods keeps its brightness and its colour
if (!(only && !only.test('lit'))) {
  const { page, close } = await site(F7);
  await page.evaluate((t) => window.sr.clock.seek(t), -12 * 3600);
  for (const look of ['real', 'cel']) {
    await page.evaluate((look) => window.sr.stage.setLook(look), look);
    await put(page, VIEWS.over);
    await page.waitForTimeout(2500);
    const got = await page.evaluate(async () => {
      const sr = window.sr;
      const stage = sr.stage;
      // where the structure is on the screen: its box's corners, projected
      let structure = null;
      stage.scene.traverse((o) => {
        if (!structure && o.name === 'ServiceStructure') structure = o;
      });
      if (!structure) return null;
      const corners = [];
      const b = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] };
      structure.updateMatrixWorld(true);
      structure.traverse((m) => {
        if (!m.isMesh || !m.geometry) return;
        m.geometry.computeBoundingBox();
        const g = m.geometry.boundingBox;
        for (const x of [g.min.x, g.max.x])
          for (const y of [g.min.y, g.max.y]) for (const z of [g.min.z, g.max.z]) corners.push(m.localToWorld(g.min.clone().set(x, y, z)));
      });
      const src = document.querySelector('#stage');
      for (const c of corners) {
        c.project(stage.camera);
        const px = [((c.x + 1) / 2) * src.width, ((1 - c.y) / 2) * src.height];
        for (const i of [0, 1]) {
          b.min[i] = Math.min(b.min[i], px[i]);
          b.max[i] = Math.max(b.max[i], px[i]);
        }
      }
      const x0 = Math.max(0, Math.floor(b.min[0])),
        y0 = Math.max(0, Math.floor(b.min[1])),
        x1 = Math.min(src.width, Math.ceil(b.max[0])),
        y1 = Math.min(src.height, Math.ceil(b.max[1]));
      const copy = document.createElement('canvas');
      const pen = copy.getContext('2d', { willReadFrequently: true });
      const grab = async () => {
        await window.frames(12);
        copy.width = src.width;
        copy.height = src.height;
        pen.drawImage(src, 0, 0);
        return pen.getImageData(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0)).data;
      };
      const asIsData = await grab();
      const pipe = stage.pipe;
      const night = pipe.night;
      pipe.night = (exposure, _rods, land, outdoors) => night.call(pipe, exposure, 0, land, outdoors);
      stage.expose();
      const plainData = await grab();
      pipe.night = night;
      stage.expose();
      // What the floods light is what is bright drawn without the rods' sight (the night's own land is under a third of
      // this at Complex 5 from over the pad): the same pixels compared drawn both ways
      const measure = (d) => {
        let lum = 0,
          sat = 0,
          n = 0;
        for (let i = 0; i < d.length; i += 4) {
          if (Math.max(plainData[i], plainData[i + 1], plainData[i + 2]) < 80) continue;
          const hi = Math.max(d[i], d[i + 1], d[i + 2]),
            lo = Math.min(d[i], d[i + 1], d[i + 2]);
          lum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
          sat += hi > 0 ? (hi - lo) / hi : 0;
          n++;
        }
        return { lum: lum / Math.max(1, n), sat: sat / Math.max(1, n), n };
      };
      const asIs = measure(asIsData);
      const withoutRods = measure(plainData);
      await window.frames(4);
      return { asIs, withoutRods, box: [x0, y0, x1, y1] };
    });
    if (!got) {
      check(false, `lit (${look}): no ServiceStructure in Complex 5's scene`);
      continue;
    }
    const { asIs, withoutRods } = got;
    console.log(
      `\nlit ${look}: the structure's lit pixels ${asIs.n}: brightness ${asIs.lum.toFixed(1)} (${withoutRods.lum.toFixed(1)} without the rods), colour ${asIs.sat.toFixed(3)} (${withoutRods.sat.toFixed(3)})`,
    );
    check(asIs.n > 500, `lit (${look}): the structure is in the view and lit (${asIs.n} pixels)`);
    check(asIs.lum >= 0.95 * withoutRods.lum, `lit (${look}): the structure in the floods keeps its brightness`);
    check(asIs.sat >= 0.9 * withoutRods.sat, `lit (${look}): and its colour`);
    if (shots) await page.screenshot({ path: join(shots, `lit-lc5-night-${look}-over.png`) });
  }
  await close();
}

// --- the walk out of the floodlit apron and back
if (!noWalk && !(only && !only.test('walk'))) {
  const { page, close } = await site(F7);
  await page.evaluate((t) => window.sr.clock.seek(t), -12 * 3600);
  await put(page, VIEWS.foot, [6, 0, 10]);
  await page.waitForTimeout(4000);
  const trace = [];
  const record = (phase) =>
    page.evaluate(
      async ({ phase, seconds }) => {
        const sr = window.sr;
        const out = [];
        const t0 = performance.now();
        while (performance.now() - t0 < seconds * 1000) {
          await new Promise((done) => requestAnimationFrame(done));
          const p = sr.stage.walk.body.position;
          out.push({ phase, ms: performance.now(), exposure: sr.stage.renderer.toneMappingExposure, x: p.x, z: p.z });
        }
        return out;
      },
      { phase, seconds: phase.seconds },
    );
  // out along +z, away from the launcher, at a run, then stand in the dark; turn about and come back in
  await page.evaluate(() => {
    window.sr.stage.walk.yaw = Math.PI; // (facing +z)
  });
  await page.keyboard.down('w');
  await page.keyboard.down('Shift');
  trace.push(...(await record({ name: 'out', seconds: 40 })));
  await page.keyboard.up('w');
  await page.keyboard.up('Shift');
  trace.push(...(await record({ name: 'dark', seconds: 60 })));
  await page.evaluate(() => {
    window.sr.stage.walk.yaw = 0; // (facing -z: back toward the pad)
  });
  await page.keyboard.down('w');
  await page.keyboard.down('Shift');
  trace.push(...(await record({ name: 'in', seconds: 40 })));
  await page.keyboard.up('w');
  await page.keyboard.up('Shift');
  trace.push(...(await record({ name: 'lit', seconds: 10 })));
  await close();
  for (const s of trace) s.phase = s.phase.name;
  const t0 = trace[0].ms;
  for (const s of trace) s.s = (s.ms - t0) / 1000;
  kept.walk = trace;
  let worst = 0;
  for (let i = 1; i < trace.length; i++) worst = Math.max(worst, Math.abs(Math.log(trace[i].exposure / trace[i - 1].exposure)));
  console.log('\nwalk (exposure against time, every second):');
  for (let s = 0; s <= trace.at(-1).s; s += 2) {
    const at = trace.find((p) => p.s >= s);
    if (at)
      console.log(
        `  ${at.s.toFixed(0).padStart(4)} s  ${at.phase.padEnd(5)} z ${at.z.toFixed(0).padStart(5)} m  exposure ${at.exposure.toFixed(4)}`,
      );
  }
  check(
    worst <= Math.log(1 + WALK_STEP),
    `walk: the exposure changes by no more than ${100 * WALK_STEP} % a frame (the most ${(100 * (Math.exp(worst) - 1)).toFixed(2)} %)`,
  );
  const phase = (name) => trace.filter((p) => p.phase === name);
  const lit = trace[0].exposure;
  const dark = phase('dark');
  const darkEnd = dark.at(-1).exposure;
  // going out: what is left to do after ten seconds in the dark is still a good part of the whole
  const tenIn = dark.find((p) => p.s - dark[0].s >= 10)?.exposure ?? darkEnd;
  check(
    darkEnd > lit * 1.5,
    `walk: the eye opens out in the dark (exposure ${lit.toFixed(4)} on the apron, ${darkEnd.toFixed(4)} after a minute out)`,
  );
  check(
    Math.log(darkEnd / tenIn) > 0.25 * Math.log(darkEnd / dark[0].exposure),
    'walk: and over tens of seconds, not at once (a quarter of it or more is still to come after ten seconds in the dark)',
  );
  const back = phase('lit');
  const settled = back.at(-1).exposure;
  const at2 = back.find((p) => p.s - back[0].s >= 2)?.exposure ?? settled;
  check(Math.abs(Math.log(at2 / settled)) < 0.1, 'walk: back in the floodlight the eye has settled within two seconds of stopping');
}

if (json) writeFileSync(json, JSON.stringify(kept));
await browser.close();
console.log(failures.length ? `\n${failures.length} failed` : '\nall held');
process.exit(failures.length ? 1 : 0);
