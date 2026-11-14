// Every engine that burns shows its fire: checked in the running viewer, on the record's flight.
//   node tools/fires-test.mjs [url] [--flight <id>] [--shots <dir>] [--cams pad,chase,far] [--looks real,cel] [--at 2,60,118]
//                                                                    (default url: http://localhost:5180/, flight: Vostok 1)
// At each instant (T+2, 60, 118, 125, 200 and 400 s) it counts the fires drawn (Stage.fireReport) against the engines the
// record has burning then, and checks that each hangs at the part that carries it: on the vehicle, or on a strap-on as
// it swings away. --shots also writes a picture of each instant from each camera (the pad's, the chase's, and from 5 km)
// in each look; with a page that has no fireReport (an older build) it only takes the pictures.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args.splice(args.indexOf(name), 2)[1] : fallback);
const flight = opt('--flight', 'ussr/vostok/vostok-1');
const shots = opt('--shots', null);
const cams = opt('--cams', 'pad,chase,far').split(',');
const looks = opt('--looks', 'real').split(',');
const instants = opt('--at', '2,60,118,125,200,400').split(',').map(Number);
const url = args[0] ?? 'http://localhost:5180/';

// The engines burning at each instant on the record, by the part that carries each (the flight's own data says so: these are what it says)
const EXPECTED = {
  'ussr/vostok/vostok-1': (t) =>
    t < 119.5 ? ['Booster_B', 'Booster_V', 'Booster_G', 'Booster_D', 'CoreEngine'] : t < 300 ? ['CoreEngine'] : t < 677 ? ['BlockE'] : [],
  'usa/mercury/mr-3-freedom-7': (t) => (t < 142 ? ['RedstoneEngine'] : []),
};

let failed = 0;
const check = (ok, what) => {
  console.log(`${ok ? '  ok  ' : '  FAIL'} ${what}`);
  if (!ok) failed++;
};
if (shots) mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.goto(`${url}#${flight}/site/vehicle`);
await page.waitForFunction(() => window.sr && document.querySelector('.loading.done'), null, { timeout: 120000 });
await page.addStyleTag({ content: '#ui, #gallery, #title, .notes { display: none !important }' });
const reports = await page.evaluate(() => typeof window.sr.stage.fireReport === 'function');
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
      const fires = await page.evaluate(() => window.sr.stage.fireReport());
      const drawn = fires.filter((f) => f.drawn && (f.on > 0.001 || f.steering > 0.001));
      const want = EXPECTED[flight]?.(t) ?? [];
      check(
        drawn
          .map((f) => f.owner)
          .sort()
          .join() === [...want].sort().join(),
        `T+${t}: ${drawn.length} fires drawn (${drawn.map((f) => `${f.owner} ${f.on.toFixed(2)}${f.steering ? `/${f.steering.toFixed(2)}` : ''} [${f.chambers.join('+')}]`).join(', ') || 'none'}); the record has ${want.length} burning`,
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
console.log(failed ? `${failed} failed` : 'all passed');
process.exit(failed ? 1 : 0);
