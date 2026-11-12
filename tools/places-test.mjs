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
/**
 * The site with its neighbouring complexes kept back until everything else has arrived and the shadows have been
 * drawn; then they are let through. Was the map that covers the place drawn again for them? `walk`: on foot, where
 * the fine map is kept between steps (shadowcache.ts: it reads its casters each time the shadows are asked for, so it
 * is told by the same request; what is out of its reach it rightly does not draw again). `workers`: asks instead
 * whether the workers that decoded their model were let go.
 */
async function lateNeighbours(walk, workers = false) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.routeWebSocket(/.*/, () => {});
  let release;
  const held = new Promise((done) => (release = done));
  await page.route(/sites\/cape\/[^/]*\.glb(\?|$)/, async (route) => {
    await held;
    await route.continue().catch(() => {});
  });
  await page.goto(`${url}#pad`);
  await siteReady(page);
  await page.evaluate(() => Promise.allSettled(window.sr.stage.arriving));
  if (walk) await page.evaluate(() => window.sr.stage.enterWalk());
  const there = () => window.sr.stage.scene.getObjectByName('Neighbours_concrete').geometry.getAttribute('position').count > 3;
  // (still: nothing has asked for a shadow for a second)
  const read = () => {
    const st = window.sr.stage;
    return { far: st.far.drawnAt, waiting: st.far.waiting || st.renderer.shadowMap.needsUpdate };
  };
  let before = await page.evaluate(read);
  for (let quiet = 0, tries = 0; quiet < 4 && tries < 80; tries++) {
    await page.waitForTimeout(250);
    const now = await page.evaluate(read);
    quiet = !now.waiting && now.far === before.far ? quiet + 1 : 0;
    before = now;
  }
  const fails = [];
  if (await page.evaluate(there)) fails.push('the neighbours were there before they were let through: nothing was tested');
  const working = page.workers().length;
  release();
  await page.waitForFunction(there, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const after = await page.evaluate(read);
  const left = page.workers().length;
  await context.close();
  if (workers) {
    // (their model is decoded by workers of its own, which are done with once it has been)
    if (left > working) fails.push(`${left - working} of the workers that decoded the neighbours' model were left running`);
    return fails;
  }
  if (after.far === before.far)
    fails.push('the neighbouring complexes arrived and the far shadow map was not drawn again: it is of the place without them');
  return fails;
}
const galleryReady = (page) => page.waitForFunction(() => window.sr.gallery.ready, null, { timeout: 120000 });
const siteReady = (page) => page.waitForFunction(() => document.body.classList.contains('scene-ready'), null, { timeout: 180000 });

const cases = {
  /** The gallery is asked for one part while its vehicle is still on the way, then for another: the second is the one shown. */
  async 'an address changed while the gallery loads is the one it opens on'() {
    const { page, close } = await open(`${FLIGHT}/gallery`, { slow: 2500 });
    const parts = await page.evaluate(() => window.sr.flight.models.find((m) => m.id === 'vehicle').parts.map((p) => p.node));
    const [first, second] = [parts[1], parts[2]];
    await page.evaluate((to) => (location.hash = to), `${FLIGHT}/gallery/${first}`);
    await page.waitForTimeout(200);
    await page.evaluate((to) => (location.hash = to), `${FLIGHT}/gallery/${second}`);
    await galleryReady(page);
    await page.waitForTimeout(300);
    const got = await page.evaluate(() => ({ at: window.sr.gallery.at, hash: decodeURIComponent(location.hash) }));
    await close();
    const fails = [];
    if (got.at !== second) fails.push(`asked for ${first} and then ${second} while it loaded: it shows "${got.at}"`);
    if (!got.hash.endsWith(`/gallery/${got.at}`) && !(got.at === '' && got.hash.endsWith('/gallery')))
      fails.push(`the address is ${got.hash} and what is on show is "${got.at}"`);
    return fails;
  },

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

  /** Buildings that arrive after the shadows were drawn are in the shadow maps: with the clock stopped nothing else would ask. */
  'neighbouring complexes that arrive late have their shadows, from the camera': () => lateNeighbours(false),
  'neighbouring complexes that arrive late have their shadows, on foot': () => lateNeighbours(true),
  "the workers that decode the neighbours' model are let go when it has arrived": () => lateNeighbours(false, true),
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
