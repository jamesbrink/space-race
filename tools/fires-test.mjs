// Every engine that burns shows its fire: checked in the running viewer, on the record's flight.
//   node tools/fires-test.mjs [url] [--flight <id>] [--shots <dir>] [--cams pad,chase,far] [--looks real,cel] [--at 2,60,118]
//                                                                    (default url: http://localhost:5180/, flight: Vostok 1)
// At each instant (T+2, 60, 118, 125, 200 and 400 s) it counts the fires drawn (FlightShow.fireReport, sr.stage.show) against the engines the
// record has burning then (the flight's own figures: `burning`), and checks that each hangs at the part that carries it: on the vehicle, or on a strap-on as
// it swings away. --shots also writes a picture of each instant from each camera (the pad's, the chase's, and from 5 km)
// in each look; with a page that has no fireReport (an older build) it only takes the pictures.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { checks, launch, open, opt, url as urlOf } from './browser.mjs';

const args = process.argv.slice(2);
const flight = opt(args, '--flight', 'ussr/vostok/vostok-1');
const shots = opt(args, '--shots', null);
const cams = opt(args, '--cams', 'pad,chase,far').split(',');
const looks = opt(args, '--looks', 'real').split(',');
const instants = opt(args, '--at', '2,60,118,125,200,400').split(',').map(Number);
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
      }
    }
    if (!shots) continue;
    for (const cam of cams) {
      const ok = await page.evaluate((c) => {
        const sr = window.sr;
        const s = sr.stage;
        if (c === 'far') {
          // the chase view taken out to 5 km (past what the wheel allows: a picture only)
          s.setCamera('chase');
          const chase = s.cam.chase;
          chase.max = Math.max(chase.max, 6000);
          chase.zoom(Math.log(5000 / chase.distance), null);
          return s.cameraMode === 'chase';
        }
        s.setCamera(c);
        return s.cameraMode === c;
      }, cam);
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
await browser.close();
if (errors.length) console.log(`console: ${errors.length}\n  ${errors.slice(0, 6).join('\n  ')}`);
if (!reports) console.log('(no fireReport in this page: pictures only)');
console.log(failures.length ? `${failures.length} failed` : 'all passed');
process.exit(failures.length ? 1 : 0);
