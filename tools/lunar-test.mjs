// The Moon as a place a flight stands at (viewer/lunar/setting.ts; app/session.ts `surface`), checked in the running page:
//   node tools/lunar-test.mjs [url] [--flight <id>] [--site <id>] [--at <s>] [--shots <dir>]   (default url: http://localhost:5180/)
// The flight's launch site is opened, and the stage stood at the landing site as the run will once it lands (`sr.onMoon`),
// at the mission's clock (`--at`, seconds from liftoff; default Apollo 15's landing at Hadley, 104:42:29 GET: its Mission
// Report, MSC-05161, table 3-I). Then:
//   light    the clock put on through the site's sunrise and through the day after the landing, a frame drawn at each
//            step from one place: the picture's mean brightness never steps (each step within STEP of the last), and the
//            Sun's light comes up with the Sun (dark before it, lit after)
//   frozen   a frozen stage draws the same frame twice, in both looks
//   hop      on foot as the first of the crew: a standing jump lifts the feet JUMP (2.4 m: walk.ts JUMP_HEIGHT under the
//            Moon's 1.62 m/s^2) and the walker falls by the Moon's gravity
//   out      the deck's Go out (`sr.goOut`) puts the commander on the LM's porch; on foot the clock runs as it goes
//   back     `sr.offMoon` stands the flight at its pad again, under the Earth's gravity, and what the GPU holds is back to
//            within SLACK of what it held before, its geometries and its textures
// Then the deck: taken at the pad, the flight stood on the Moon under it, its surface verbs shown, Space saying Lift off is
// not flown yet, and V going out on to the porch.
// --shots writes stills: the LM from across the site, from beside it, the walker's eyes on the Earth, and the light trace.
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fromSelenographic, MOON_RADIUS } from '../src/world/moon.ts';
import { skyAt } from '../src/world/moonsky.ts';
import { julianDate } from '../src/world/time.ts';
import { checks, launch, open, opt, url as urlOf } from './browser.mjs';

const args = process.argv.slice(2);
const flightId = opt(args, '--flight', 'usa/apollo/apollo-15');
const siteId = opt(args, '--site', 'hadley');
const at = Number(opt(args, '--at', String(104 * 3600 + 42 * 60 + 29)));
const shots = opt(args, '--shots', null);
const url = urlOf(args);
if (shots) mkdirSync(shots, { recursive: true });

/** The most the picture's mean brightness may change from one step of the clock to the next: 3 levels of 255, or 8 per cent. */
const STEP = { levels: 3, share: 0.08 };
/** The hop on the Moon, metres, and how near it must come. */
const JUMP = { height: (0.4 * 9.80665) / 1.62, within: 0.2 };
/** What the GPU may hold more of after the Moon and back (levels of detail arrive in their own time). */
const SLACK = 1.02;

const root = join(import.meta.dirname, '..');
const lunar = JSON.parse(readFileSync(join(root, 'src/world/lunar-sites.json'), 'utf8')).sites[siteId];
const { flight } = await import(
  join(root, `missions/${flightId.split('/').slice(0, 2).join('/')}/flights/${flightId.split('/')[2]}/flight.ts`)
);
const jd0 = julianDate(flight.launch);
const up = fromSelenographic(lunar.landing[1], lunar.landing[0]);
const origin = up.map((u) => u * (MOON_RADIUS + lunar.height));
/** The Sun's (or the Earth's) elevation over the site's level at `t` seconds of the mission's clock, degrees, and its direction there. */
const seen = (t, what) => {
  const sky = skyAt(jd0 + t / 86400);
  const d = sky[what].map((v, i) => v - origin[i]);
  const l = Math.hypot(...d);
  return { elevation: (Math.asin(d.reduce((s, v, i) => s + v * up[i], 0) / l) * 180) / Math.PI, d: d.map((v) => v / l) };
};
// the site's sunrise before the landing: the last time the Sun's middle was on the level
let rise = at;
while (seen(rise, 'sun').elevation > 0) rise -= 600;
for (let step = 300; step >= 1; step /= 2) rise += seen(rise + step, 'sun').elevation <= 0 ? step : 0;
console.log(
  `${flight.callsign} at ${lunar.name}: the Sun ${seen(at, 'sun').elevation.toFixed(2)} degrees up at T+${at} s; it rose at T+${Math.round(rise)} s`,
);

const { check, failures } = checks();
const browser = await launch();
try {
  const { page, errors, close } = await open(browser, `${url}#${flightId}/site/vehicle`, {
    wait: () => window.sr?.stage && document.querySelector('.loading.done'),
    timeout: 180_000,
    // every WebGL texture made, by the phase it was made in and the material it was made for (SHADER_NAME, a material's
    // name), and let go: what the Moon made and still holds after it, by name
    before: (page) =>
      page.addInitScript(() => {
        const live = (window.__textures = new Map());
        window.__phase = 'pad';
        const programs = new WeakMap();
        let program = '?';
        for (const P of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
          const { createTexture, deleteTexture, useProgram, shaderSource, attachShader } = P;
          P.shaderSource = function (s, src) {
            s.__name = /#define SHADER_NAME (.*)/.exec(src)?.[1];
            return shaderSource.call(this, s, src);
          };
          P.attachShader = function (p, s) {
            if (s.__name) programs.set(p, s.__name);
            return attachShader.call(this, p, s);
          };
          P.useProgram = function (p) {
            program = (p && programs.get(p)) || '?';
            return useProgram.call(this, p);
          };
          P.createTexture = function () {
            const t = createTexture.call(this);
            // (and the page's own modules it was made from: a target is made where it is first drawn into)
            const from = (new Error().stack ?? '')
              .split('\n')
              .filter((l) => l.includes('/src/'))
              .map((l) => /\/src\/([^?:]+)/.exec(l)?.[1])
              .slice(0, 4);
            live.set(t, `${window.__phase} ${program} ${from.join('<')}`);
            return t;
          };
          P.deleteTexture = function (t) {
            live.delete(t);
            return deleteTexture.call(this, t);
          };
        }
      }),
  });
  await page.evaluate(() => {
    sr.stage.setAutoRotate(false);
    sr.clock.pause();
  });
  /** What the GPU holds once everything asked for has arrived and been drawn. */
  const held = () =>
    page.evaluate(async () => {
      await Promise.allSettled(sr.stage.arriving ?? []);
      await new Promise((done) => setTimeout(done, 8000));
      sr.stage.dirty = true;
      await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
      return { ...sr.stage.renderer.info.memory };
    });
  const before = await held();
  const went = await page.evaluate(
    async ([site, t]) => {
      window.__phase = 'moon';
      return sr.onMoon(site, t);
    },
    [siteId, at],
  );
  check(went === true, `stood at ${siteId}`);
  check((await page.evaluate(() => sr.moon)) === siteId, `sr.moon is ${siteId}`);
  const there = await held();
  console.log(`  (on the Moon the GPU holds ${JSON.stringify(there)}; at the pad it held ${JSON.stringify(before)})`);
  await page.addStyleTag({ content: '#ui, #gallery { display: none !important }' });
  await page.evaluate(async () => {
    const { stage } = window.sr;
    stage.frozen = true;
    await Promise.allSettled(stage.arriving ?? []);
    const src = document.querySelector('#stage');
    const copy = document.createElement('canvas');
    const pen = copy.getContext('2d', { willReadFrequently: true });
    const frame = () => new Promise((done) => requestAnimationFrame(done));
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
    window.mean = (d) => {
      let s = 0;
      for (let i = 0; i < d.length; i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      return s / (d.length / 4);
    };
    // (the whole Moon's maps, the Earth's, the site's: in before anything is measured)
    await new Promise((done) => setTimeout(done, 6000));
  });
  const shot = async (name) => shots && (await page.screenshot({ path: join(shots, `${name}.png`) }));
  await page.evaluate(() => sr.stage.pose(230, 8, 60, 3));
  await page.evaluate(() => grab(6));
  await shot('lm-from-60m');
  await page.evaluate(() => sr.stage.pose(250, 2, 1500, 3));
  await page.evaluate(() => grab(6));
  await shot('site-from-1500m');

  // light: through the sunrise, then the day after the landing, from one place
  await page.evaluate(() => sr.stage.pose(230, 8, 60, 3));
  const times = [];
  for (let t = rise - 3600; t <= rise + 3 * 3600; t += 120) times.push(t);
  for (let t = at; t <= at + 24 * 3600; t += 1800) times.push(t);
  const trace = [];
  for (const t of times) {
    const m = await page.evaluate(async (t) => {
      sr.clock.seek(t);
      return mean(await grab(3));
    }, t);
    trace.push({ t, sun: seen(t, 'sun').elevation, mean: m });
  }
  let worst = { by: 0, t: 0 };
  for (let i = 1; i < trace.length; i++) {
    const [a, b] = [trace[i - 1], trace[i]];
    if (b.t - a.t > 1800) continue; // (the jump from the sunrise's hours to the landing's is not a step of the clock)
    const by = Math.abs(b.mean - a.mean);
    const allowed = Math.max(STEP.levels, STEP.share * Math.max(a.mean, b.mean));
    if (by / allowed > worst.by) worst = { by: by / allowed, t: b.t, from: a.mean, to: b.mean };
  }
  check(
    worst.by <= 1,
    `the light never steps: the largest step ${(100 * worst.by).toFixed(0)} % of what is allowed (T+${worst.t} s, ${worst.from?.toFixed(2)} to ${worst.to?.toFixed(2)})`,
  );
  const dark = trace.find((s) => s.t === rise - 3600).mean;
  const lit = trace.find((s) => s.t === at).mean;
  check(lit > dark, `before sunrise the picture is darker than at the landing (${dark.toFixed(1)} against ${lit.toFixed(1)})`);
  if (shots) writeFileSync(join(shots, 'light.json'), JSON.stringify(trace, null, 1));

  // frozen, both looks
  for (const look of ['real', 'cel']) {
    const same = await page.evaluate(async (look) => {
      sr.stage.setLook(look);
      const a = await grab(4);
      const b = await grab(2);
      let n = 0;
      for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
      return n;
    }, look);
    check(same === 0, `frozen, ${look}: the same frame twice (${same} bytes differ)`);
  }
  await page.evaluate(() => sr.stage.setLook('real'));

  // hop
  await page.evaluate(async (t) => {
    sr.stage.frozen = false;
    sr.clock.seek(t);
    sr.stage.enterWalk();
    await new Promise((done) => setTimeout(done, 2000));
  }, at);
  const g = await page.evaluate(() => sr.stage.walk.gravity);
  check(Math.abs(g - 1.62) < 0.01, `the walker falls by the Moon's gravity (${g.toFixed(3)} m/s^2)`);
  const earth = seen(at, 'earth');
  await page.evaluate(([x, y, z]) => {
    const walk = sr.stage.walk;
    // (the scene's +X east, +Y up, +Z south: the Earth's direction there)
    walk.yaw = Math.atan2(-x, -z);
    walk.pitch = Math.atan2(y, Math.hypot(x, z));
  }, toScene(earth.d));
  await page.waitForTimeout(800);
  await shot('walker-looks-at-earth');
  const y0 = await page.evaluate(() => sr.stage.walk.body.position.y);
  await page.keyboard.press('Space');
  const peak = await page.evaluate(async () => {
    let most = -Infinity;
    const end = performance.now() + 5000;
    while (performance.now() < end) {
      most = Math.max(most, sr.stage.walk.body.position.y);
      await new Promise((done) => requestAnimationFrame(done));
    }
    return most;
  });
  check(
    Math.abs(peak - y0 - JUMP.height) < JUMP.within,
    `a standing hop lifts the feet ${(peak - y0).toFixed(2)} m (${JUMP.height.toFixed(2)} wanted)`,
  );
  await page.evaluate(() => sr.stage.onFoot.exitWalk());

  // out: the LM stands on its pads, and the deck's Go out (sr.goOut) puts the commander on its porch, out of the hatch; on
  // foot the clock runs as it goes, and off foot it may run faster again (session.ts surfaceTime)
  const out = await page.evaluate(async () => {
    await new Promise((done) => setTimeout(done, 1000));
    const offFoot = sr.clock.fastest;
    const ok = sr.goOut();
    await new Promise((done) => setTimeout(done, 2000));
    const p = sr.stage.walk.body.position;
    const r = { ok, active: sr.stage.walk.active, up: p.y - (sr.stage.groundAt(p.x, p.z) ?? 0), onFoot: sr.clock.fastest, offFoot };
    sr.stage.onFoot.exitWalk();
    await new Promise((done) => setTimeout(done, 1000));
    return { ...r, after: sr.clock.fastest };
  });
  check(out.ok && out.active, 'Go out: on foot as the commander');
  check(out.up > 3 && out.up < 4, `on the porch, ${out.up.toFixed(2)} m over the ground under it`);
  check(
    out.onFoot === 1 && out.offFoot > 1 && out.after === out.offFoot,
    `time runs as it goes on foot (${out.onFoot}x), faster off it (${out.offFoot}x, then ${out.after}x)`,
  );
  await shot('out-on-the-porch');

  // back to the pad
  const back = await page.evaluate(async () => {
    window.__phase = 'back';
    return sr.offMoon();
  });
  check(back === true && (await page.evaluate(() => sr.moon)) === null, 'back at the pad');
  const gEarth = await page.evaluate(async () => {
    sr.stage.enterWalk();
    await new Promise((done) => setTimeout(done, 1500));
    const g = sr.stage.walk.gravity;
    sr.stage.onFoot.exitWalk();
    return g;
  });
  check(Math.abs(gEarth - 9.80665) < 0.01, `the Earth's gravity again (${gEarth.toFixed(3)} m/s^2)`);
  const after = await held();
  console.log(`  (back at the pad the GPU holds ${JSON.stringify(after)}; before the Moon ${JSON.stringify(before)})`);
  check(after.geometries <= before.geometries * SLACK, 'the geometries are back to their level');
  // (the pad's place is built again on the way back: what the last one made is let go with it, the crew's bones' textures
  // and the globe's stand-ins for maps among it, which were kept, four more each time: dispose.ts, globe.ts `fill`. The
  // first trip keeps what is made once and kept for good, the suits worn there and the shadows' caches: the second keeps nothing)
  const again = await page.evaluate(async ([site, t]) => (await sr.onMoon(site, t)) && sr.offMoon(), [siteId, at]);
  const twice = await held();
  check(
    again === true && twice.textures <= after.textures + 1,
    `the place's textures are let go with it: ${twice.textures} after a second trip, ${after.textures} after the first`,
  );
  // (what the setting made, by its materials' names, and the targets it drew into, which have none: the crew's own suits are
  // the flight's models, kept for the pad, and three's own tables are its for good)
  const kept = await page.evaluate(() => [...window.__textures.values()].filter((s) => s.startsWith('moon ')).map((s) => s.slice(5)));
  const setting = kept.filter((s) => /^(far-moon|moon-apron|far-earth|lunar-)|viewer\/(lunar\/|moon\.ts|farearth\.ts)/.test(s));
  check(
    setting.length === 0,
    `nothing the lunar setting made is held after it (${kept.length} textures made there kept: ${[...new Set(kept)].join('; ') || 'none'})`,
  );

  // the deck on the Moon: taken at the pad, the stage stood at the landing site under it (as a run that lands will), the
  // surface's verbs in place of the next event; V goes out on to the porch, and Space says Lift off is not flown yet
  await page.keyboard.press('l');
  await page.waitForTimeout(3000);
  const onDeck = await page.evaluate(
    async ({ site, t }) => {
      const took = Boolean(document.querySelector('.cockpit.on, #ui.piloting'));
      const stood = await sr.onMoon(site, t);
      await new Promise((done) => setTimeout(done, 2000));
      const verbs = document.querySelector('.deck-surface');
      return {
        took,
        stood,
        verbs: Boolean(verbs && !verbs.hidden),
        next: document.querySelector('.cockpit-next')?.hidden ?? null,
        phase: document.querySelector('[data-cell="phase"]')?.textContent ?? '',
      };
    },
    { site: siteId, t: at },
  );
  check(onDeck.took && onDeck.stood, `the deck taken at the pad, and the flight stood on the Moon under it (${JSON.stringify(onDeck)})`);
  check(onDeck.verbs && onDeck.next === true, 'the deck shows Go out and Lift off in place of the next event');
  check(/On the Moon/.test(onDeck.phase), `its phase line says where it stands: "${onDeck.phase}"`);
  await page.keyboard.press(' ');
  await page.waitForTimeout(500);
  const said = await page.evaluate(() => document.querySelector('#ui .notes')?.textContent ?? '');
  check(/not flown yet/.test(said), `Space (Lift off) says it is not flown yet: "${said.trim().slice(0, 120)}"`);
  await page.keyboard.press('v');
  await page.waitForTimeout(2500);
  const fromDeck = await page.evaluate(() => {
    const p = sr.stage.walk.body.position;
    return {
      active: sr.stage.walk.active,
      up: p.y - (sr.stage.groundAt(p.x, p.z) ?? 0),
      deck: document.querySelector('#ui')?.classList.contains('piloting'),
    };
  });
  check(
    fromDeck.active && !fromDeck.deck && fromDeck.up > 3,
    `V on the deck goes out: on foot on the porch, off the deck (${JSON.stringify(fromDeck)})`,
  );
  await shot('out-from-the-deck');
  await page.evaluate(() => sr.stage.onFoot.exitWalk());
  check(errors.length === 0, `no errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
  await close();
} finally {
  await browser.close();
}
/** A direction in the Moon's frame at the site into the scene's (+X east, +Y up, +Z south). */
function toScene(d) {
  const lon = (lunar.landing[1] * Math.PI) / 180;
  const east = [-Math.sin(lon), Math.cos(lon), 0];
  const north = [up[1] * east[2] - up[2] * east[1], up[2] * east[0] - up[0] * east[2], up[0] * east[1] - up[1] * east[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return [dot(d, east), dot(d, up), -dot(d, north)];
}
if (failures.length) {
  console.log(`${failures.length} failed`);
  process.exit(1);
}
assert.ok(true);
console.log('all held');
