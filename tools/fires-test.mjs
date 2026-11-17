// Every engine that burns shows its fire, and every jet that is not a fire blows when it should: checked in the running viewer, on the record's flight.
//   node tools/fires-test.mjs [url] [--flight <id>] [--shots <dir>] [--cams pad,chase,far] [--far 5000] [--looks real,cel] [--at 2,60,118]
//                             [--gallery ussr/voskhod/voskhod-1,...]   (default url: http://localhost:5180/, flight: Vostok 1)
// At each instant (T+2, 60, 118, 121, 125, 200 and 400 s) it counts the fires drawn (FlightShow.fireReport, sr.stage.show) against the engines the
// record has burning then (the flight's own figures: `burning`), and checks that each hangs at the part that carries it: on the vehicle, or on a strap-on as
// it swings away; and within the node the flight's data hangs it at (`flies.fires`' `node`), so that each chamber named is drawn at its own bell. Then the jets (`ModelDef.jets`, FlightShow.jetReport) against what the flight's own data has blowing then (`blowing`): each drawn
// when its condition holds and only then, at its node, along its node's -Y within a degree. Last, in the gallery of each flight `--gallery` names
// (the Voskhods by default), a jet that is an engine of its own is drawn while its part is chosen, along its node's way out and forward, and not
// once another part is. --shots also writes a picture of each instant from each camera (the pad's, the chase's, and from 5 km)
// in each look, and of each gallery's jet; with a page that has no fireReport (an older build) it only takes the pictures.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { checks, launch, open, opt, url as urlOf } from './browser.mjs';

const args = process.argv.slice(2);
const flight = opt(args, '--flight', 'ussr/vostok/vostok-1');
const shots = opt(args, '--shots', null);
const cams = opt(args, '--cams', 'pad,chase,far').split(',');
const far = Number(opt(args, '--far', '5000'));
const looks = opt(args, '--looks', 'real').split(',');
const instants = opt(args, '--at', '2,60,118,121,125,200,400').split(',').map(Number);
const galleries = opt(args, '--gallery', 'ussr/voskhod/voskhod-1,ussr/voskhod/voskhod-2').split(',').filter(Boolean);
const url = urlOf(args);

/**
 * The engines burning at an instant on the record, worked in the page from the flight's own data (no table: a flight that
 * flies needs none here), read off its plan's events: `flies.engine` (the engine on the first body) from liftoff to the
 * record's instant of its cut, and each of `flies.fires` by the plan's engine it names, from the event that lights it to
 * the record's instant of its cut (or of its body's letting go, where nothing cuts it first), the coast's burn (the engine
 * with `flown`) between its events' instants. Each is told by its place among the flight's fires (FlightShow.fireReport
 * `level`). The viewer draws each from where its own run stops it, not from the record's figures: so this is a check of
 * the one against the other.
 */
const burning = (t) =>
  page.evaluate((t) => {
    const { flies, plan } = window.sr.flight;
    const c = plan?.craft[0];
    const doing = (test) => plan?.events.find((e) => e.automatic && e.do.some(test));
    // (the record's instant of an event, or the clock's where it has none: what is lit at liftoff)
    const clock = (e) => e?.at?.value ?? e?.when.find((w) => 'time' in w)?.time ?? Number.NaN;
    const span = (id, what) => {
      const engine = c?.engines.find((e) => e.id === id);
      const lit = doing((a) => a.ignite === id);
      const cut = doing((a) => a.cut === id);
      if (engine?.flown) return { what, from: clock(lit), to: clock(cut) };
      const joint = c?.joints.filter((j) => j.gone.includes(engine?.body)).sort((a, b) => a.gone.length - b.gone.length)[0];
      const gone = joint && doing((a) => a.separate === joint.id);
      return { what, from: clock(lit), to: (cut ?? gone)?.at?.value ?? Number.NaN };
    };
    const spans = [];
    if (flies?.engine) spans.push(span(c?.engines.find((e) => e.body === c.bodies[0]?.id)?.id, flies.engine));
    for (const f of flies?.fires ?? []) spans.push(span(f.on, f.node));
    return spans.map((s, level) => ({ ...s, level })).filter((s) => t >= s.from && t < s.to);
  }, t);

/**
 * The jets blowing at an instant on the record, worked in the page from the flight's own data: one `with` an engine (or an
 * engine of its own) while that engine burns (as `burning` has it), one from a shed body from the record's instant of its
 * drop for its motor's burn. Each by its node.
 */
const blowing = (t, burning) =>
  page.evaluate(
    ({ t, burning }) => {
      const { flies, plan, models } = window.sr.flight;
      const model = models.find((m) => m.id === flies?.model);
      const sheds = plan?.craft[0]?.sheds ?? [];
      const lit = new Set(burning.map((b) => (flies?.fires ?? []).find((f) => f.node === b.what)?.on).filter(Boolean));
      return (model?.jets ?? [])
        .filter((j) => {
          const w = j.when;
          if ('with' in w || 'engine' in w) return lit.has(w.with ?? w.engine);
          const at = flies.drops.find((d) => d.on === w.shed)?.at ?? Number.NaN;
          const motor = sheds.find((b) => b.on === w.shed)?.motors?.find((m) => m.name === w.motor);
          return motor && t >= at && t < at + motor.burn.value;
        })
        .map((j) => j.node);
    },
    { t, burning },
  );
const degrees = (a, b) =>
  (Math.acos(
    Math.min(
      1,
      a.reduce((s, x, i) => s + x * b[i], 0),
    ),
  ) *
    180) /
  Math.PI;

const { check, failures } = checks();
if (shots) mkdirSync(shots, { recursive: true });
const browser = await launch();
const { page, errors } = await open(browser, `${url}#${flight}/site/vehicle`, { timeout: 120000 });
await page.addStyleTag({ content: '#ui, #gallery, #title, .notes { display: none !important }' });
const reports = await page.evaluate(() => typeof (window.sr.stage.show ?? window.sr.stage).fireReport === 'function');
const wait = (ms) => page.waitForTimeout(ms);
const shortId = flight.split('/').at(-1);

for (const look of looks) {
  await page.evaluate((l) => window.sr.stage.setLook(l), look);
  for (const t of instants) {
    await page.evaluate((at) => {
      const sr = window.sr;
      sr.stage.setAutoRotate?.(false);
      sr.clock.pause();
      sr.clock.seek(at);
    }, t);
    await wait(600);
    if (reports && look === looks[0]) {
      const fires = await page.evaluate(() => (window.sr.stage.show ?? window.sr.stage).fireReport());
      const drawn = fires.filter((f) => f.drawn && (f.on > 0.001 || f.steering > 0.001));
      const want = await burning(t);
      const levels = (list) => list.map((f) => f.level).sort((a, b) => a - b);
      check(
        levels(drawn).join() === levels(want).join(),
        `T+${t}: ${drawn.length} fires drawn (${drawn.map((f) => `${f.owner} ${f.on.toFixed(2)}${f.steering ? `/${f.steering.toFixed(2)}` : ''} [${f.chambers.join('+')}]`).join(', ') || 'none'}); the record has ${want.length} burning (${want.map((f) => f.what).join(', ') || 'none'})`,
      );
      for (const f of drawn) {
        const [lo, hi] = f.box;
        const out = Math.hypot(...f.exit.map((x, i) => Math.max(lo[i] - x, 0, x - hi[i])));
        check(out < 0.5, `T+${t}: ${f.owner}'s fire hangs at it (${out.toFixed(2)} m outside its bounds)`);
        // and at the node the flight's data names for it, the exit's middle within that node's own bounds: a chamber's fire at its own bell
        if (f.nodeBox) {
          const [nlo, nhi] = f.nodeBox;
          const off = Math.hypot(...f.exit.map((x, i) => Math.max(nlo[i] - x, 0, x - nhi[i])));
          check(
            off < 0.05,
            `T+${t}: the fire at ${f.node} hangs within it (${off.toFixed(3)} m outside its bounds) [${f.chambers.join('+')}]`,
          );
        }
      }
      // the jets: each drawn when the flight's data has it blowing and only then, at its node, along its node's way out
      const jets = await page.evaluate(() => (window.sr.stage.show ?? window.sr.stage).jetReport?.() ?? null);
      if (jets) {
        const blown = [...new Set(jets.filter((j) => j.drawn && j.on > 0.001).map((j) => j.node))].sort();
        const wanted = [...new Set(await blowing(t, want))].sort();
        check(
          blown.join() === wanted.join(),
          `T+${t}: ${blown.length} jets drawn (${blown.join(', ') || 'none'}); the record has ${wanted.length} blowing (${wanted.join(', ') || 'none'})`,
        );
        for (const j of jets.filter((x) => x.drawn && x.on > 0.001)) {
          const off = Math.hypot(...j.mouth.map((x, i) => x - j.at[i]));
          const turned = degrees(j.axis, j.out);
          check(
            off < 0.5 && turned < 1,
            `T+${t}: ${j.node}'s jet at its node (${off.toFixed(3)} m off), along its -Y (${turned.toFixed(3)}°)`,
          );
        }
      }
    }
    if (!shots) continue;
    for (const cam of cams) {
      const ok = await page.evaluate(
        ([c, far]) => {
          const sr = window.sr;
          const s = sr.stage;
          if (c === 'far') {
            // the chase view taken out to 5 km, or `--far` metres (past what the wheel allows: a picture only)
            s.setCamera('chase');
            const chase = s.cam.chase;
            chase.max = Math.max(chase.max, far * 1.2);
            chase.zoom(Math.log(far / chase.distance), null);
            return s.cameraMode === 'chase';
          }
          s.setCamera(c);
          return s.cameraMode === c;
        },
        [cam, far],
      );
      if (!ok) {
        console.log(`  (T+${t}: no ${cam} camera)`);
        continue;
      }
      await wait(cam === 'pad' ? 1500 : 3500);
      await page.screenshot({ path: join(shots, `${shortId}-${look}-${cam}-t${t}.png`) });
    }
    await page.evaluate(() => window.sr.stage.setCamera('orbit'));
  }
}
// the gallery: a jet that is an engine of its own, drawn while its part is chosen and not otherwise, forward along its node
for (const id of galleries) {
  const short = id.split('/').at(-1);
  const g = await open(browser, `${url}#${id}/gallery`, { wait: 'gallery', timeout: 180000 });
  await g.page.addStyleTag({ content: '#ui, #gallery, #title, .notes { display: none !important }' });
  const report = () => g.page.evaluate(() => (window.sr.gallery.stage.show ?? window.sr.gallery.stage).jetReport?.() ?? []);
  const parts = await g.page.evaluate(() => {
    const def = window.sr.gallery.stage.defs[0];
    return (def.jets ?? []).filter((j) => 'engine' in j.when).map((j) => j.node);
  });
  check(parts.length > 0, `${short}: a jet that is an engine of its own (${parts.join(', ') || 'none'})`);
  for (const node of parts) {
    const part = await g.page.evaluate((n) => {
      const st = window.sr.gallery.stage;
      let o = st.staged[0].full.getObjectByName(n);
      while (o?.parent && o.parent !== st.staged[0].full) o = o.parent;
      return o?.name ?? null;
    }, node);
    check(!(await report()).some((j) => j.node === node && j.drawn), `${short}: ${node} not drawn with nothing chosen`);
    // (on the floor with what it is part of, out of any fairing, then chosen)
    await g.page.evaluate((p) => {
      const gallery = window.sr.gallery;
      const plinth = gallery.choices.find((c) => c.nodes?.includes(p));
      if (plinth) gallery.stand(plinth, true);
    }, part);
    await g.page.waitForTimeout(1500);
    await g.page.evaluate((p) => window.sr.gallery.select(p), part);
    await g.page.waitForTimeout(2500);
    const jet = (await report()).find((j) => j.node === node);
    check(Boolean(jet?.drawn && jet.on > 0.5), `${short}: ${node} drawn while ${part} is chosen`);
    if (jet) {
      check(degrees(jet.axis, jet.out) < 1, `${short}: ${node} along its node's -Y (${degrees(jet.axis, jet.out).toFixed(3)}°)`);
      check(
        degrees(jet.axis, [0, 1, 0]) < 1,
        `${short}: ${node} forward, up the vehicle's axis (${degrees(jet.axis, [0, 1, 0]).toFixed(3)}°)`,
      );
    }
    if (shots) {
      for (const look of looks) {
        await g.page.evaluate((l) => window.sr.gallery.stage.setLook(l), look);
        await g.page.waitForTimeout(1500);
        await g.page.screenshot({ path: join(shots, `${short}-gallery-${look}-${part}.png`) });
      }
    }
    await g.page.evaluate(() => window.sr.gallery.select(null));
    await g.page.waitForTimeout(800);
    check(!(await report()).some((j) => j.node === node && j.drawn), `${short}: ${node} out again once ${part} is let go`);
  }
  if (g.errors.length) console.log(`${short} console: ${g.errors.length}\n  ${g.errors.slice(0, 6).join('\n  ')}`);
  await g.close();
}
await browser.close();
if (errors.length) console.log(`console: ${errors.length}\n  ${errors.slice(0, 6).join('\n  ')}`);
if (!reports) console.log('(no fireReport in this page: pictures only)');
console.log(failures.length ? `${failures.length} failed` : 'all passed');
process.exit(failures.length ? 1 : 0);
