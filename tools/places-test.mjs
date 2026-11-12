// Goes between a flight's places in the running page as a visitor would, with slow loads and real keys, and checks
// what the page promises of it (docs/agents/gallery.md): the latest place asked for is the one arrived at, the address
// and what is on show agree, any touch ends a show, and what is remembered for both places is the same in both.
//   node tools/places-test.mjs [url] [--only <name>]      (default url: http://localhost:5180/)
// The dev server's reloads are kept from the page under test, so other people's edits do not restart it.
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args.splice(args.indexOf(name), 2)[1] : fallback);
const only = opt('--only', null);
const url = args[0] ?? process.env.SR_URL ?? 'http://localhost:5180/';
const FLIGHT = 'usa/mercury/mr-3-freedom-7';

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });

/**
 * A page at `hash`. `slow`: milliseconds every model is kept back by, so there is time to change one's mind while it
 * loads. `search`: the address's query (`?demo` lets a show start in a browser driven by a script).
 */
async function open(hash, { slow = 0, search = '', prefs = null } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.routeWebSocket(/.*/, () => {});
  if (slow)
    await page.route(/\.glb(\?|$)/, async (route) => {
      await new Promise((done) => setTimeout(done, slow));
      await route.continue().catch(() => {});
    });
  if (prefs) await page.addInitScript((p) => localStorage.setItem(p[0], p[1]), prefs);
  await page.goto(`${url}${search}#${hash}`);
  await page.waitForFunction(() => window.sr, null, { timeout: 60000 });
  return { page, errors, close: () => context.close() };
}
const galleryReady = (page) => page.waitForFunction(() => window.sr.gallery.ready, null, { timeout: 120000 });
const siteReady = (page) => page.waitForFunction(() => document.body.classList.contains('scene-ready'), null, { timeout: 180000 });

const cases = {
  /** The gallery's own keys are touches like any other: each ends the tour, and one pressed puts the next tour off. */
  async "the gallery's own keys end its tour, and put the next one off"() {
    const { page, close } = await open(`${FLIGHT}/gallery`, { search: '?demo' });
    await galleryReady(page);
    const fails = [];
    for (const key of ['n', 'b', 'Escape', 'g', 'l', 'h', 'x', 't']) {
      await page.evaluate(() => (window.sr.gallery.idle = 1e6)); // (left alone a long while)
      await page.waitForFunction(() => window.sr.gallery.touring, null, { timeout: 10000 });
      await page.waitForTimeout(150);
      await page.keyboard.press(key);
      await page.waitForTimeout(150);
      const after = await page.evaluate(() => ({ touring: window.sr.gallery.touring, idle: window.sr.gallery.idle }));
      if (after.touring) fails.push(`${key} was pressed during the tour and the tour went on`);
      else if (after.idle > 5) fails.push(`${key} ended the tour and the page still counts ${after.idle.toFixed(0)} s left alone`);
      await page.evaluate(() => window.sr.gallery.endShow());
    }
    // used by its keys alone, it is not left alone: the count starts again at each
    await page.evaluate(() => (window.sr.gallery.idle = 10));
    await page.keyboard.press('n');
    await page.waitForTimeout(100);
    const idle = await page.evaluate(() => window.sr.gallery.idle);
    if (idle > 5) fails.push(`N was pressed with no tour on and the page still counts ${idle.toFixed(0)} s left alone`);
    await close();
    return fails;
  },
};

let failed = 0;
for (const [name, run] of Object.entries(cases)) {
  if (only && !name.includes(only)) continue;
  let fails;
  try {
    fails = await run();
  } catch (e) {
    fails = [`did not run: ${e instanceof Error ? e.message.split('\n')[0] : e}`];
  }
  console.log(`${fails.length ? 'FAIL' : 'ok  '}  ${name}`);
  for (const f of fails) console.log(`        ${f}`);
  failed += fails.length ? 1 : 0;
}
await browser.close();
if (failed) {
  console.log(`${failed} failed`);
  process.exit(1);
}
console.log('the places: all as promised');
