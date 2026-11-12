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

  /** What stands in the gallery is changed over and over with the measure up: each new pole is made of the same two materials. */
  async "the gallery's measuring pole is replaced without leaving its materials behind"() {
    const { page, close } = await open(`${FLIGHT}/gallery`);
    await galleryReady(page);
    await page.evaluate(() => window.sr.gallery.setMeasure(true));
    // (how many materials the renderer holds a program for: one is counted for each material until it is disposed of)
    const held = () => page.evaluate(() => window.sr.gallery.stage.renderer.info.programs.reduce((n, p) => n + p.usedTimes, 0));
    const stand = async (times) => {
      for (let i = 0; i < times; i++) {
        await page.evaluate((n) => {
          const g = window.sr.gallery;
          g.stand(g.choices[n % g.choices.length], true);
        }, i);
        await page.waitForTimeout(250);
      }
    };
    const choices = await page.evaluate(() => window.sr.gallery.choices.length);
    await stand(2 * choices); // (everything that is made the first time something stands there has been made)
    const before = await held();
    await stand(4 * choices);
    const after = await held();
    await close();
    if (choices < 2) return ['this flight has one thing to stand in its gallery: nothing was tested'];
    return after > before ? [`${4 * choices} changes of what stands there left ${after - before} materials with the renderer`] : [];
  },

  /** The coarser levels of detail are kept back until the scene is on show and far off: each comes in over a moment, never in one frame. */
  async 'a level of detail that arrives after the scene is shown fades in'() {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.routeWebSocket(/.*/, () => {});
    let release;
    const held = new Promise((done) => (release = done));
    await page.route(/\.lod\d\.glb(\?|$)/, async (route) => {
      await held;
      await route.continue().catch(() => {});
    });
    await page.goto(`${url}#pad`);
    await siteReady(page);
    // from far enough off that everything is wanted at a coarser level, which has not come
    await page.evaluate(() => {
      const st = window.sr.stage;
      st.setAutoRotate(false);
      st.pose(215, 9, 900, 14);
    });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const st = window.sr.stage;
      const things = () => [
        ...st.staged.map((s, i) => ({ name: `model ${i}`, fine: s.levels[0], coarse: s.levels.slice(1), fade: s.fade })),
        ...st.scenery.pieces.map((p) => ({ name: p.name, fine: p.nodes[0], coarse: p.nodes.slice(1), fade: p.fade })),
      ];
      const seen = (window.__arrivals = { cut: [], faded: new Set() });
      const watch = () => {
        for (const t of things()) {
          if (t.fade.running) seen.faded.add(t.name);
          // (a coarser level alone on show, and no fade was ever seen bringing it in)
          else if (!t.fine.visible && t.coarse.some((o) => o?.visible) && !seen.faded.has(t.name) && !seen.cut.includes(t.name))
            seen.cut.push(t.name);
        }
        requestAnimationFrame(watch);
      };
      watch();
    });
    release();
    await page.evaluate(() => Promise.allSettled(window.sr.stage.arriving));
    await page.waitForTimeout(2500);
    const got = await page.evaluate(() => ({ cut: window.__arrivals.cut, faded: window.__arrivals.faded.size }));
    await context.close();
    if (got.cut.length) return [`changed level in one frame as its coarser level arrived: ${got.cut.join(', ')}`];
    return got.faded ? [] : ['nothing changed level as the coarser levels arrived: nothing was tested'];
  },

  /** Fly is asked for on a cold page, and while the site is on its way the visitor thinks again: the last place asked for is where they are. */
  async 'the launch site asked for after Fly, while the site loads, is where the page lands'() {
    const { page, close } = await open(`${FLIGHT}/fly`, { slow: 1500 });
    await page.waitForTimeout(600);
    await page.evaluate((to) => (location.hash = to), `${FLIGHT}/site/pad`);
    await siteReady(page);
    await page.waitForTimeout(1200);
    const got = await page.evaluate(() => ({
      deck: window.sr.cockpit.active,
      hash: location.hash,
    }));
    await close();
    const fails = [];
    if (got.deck) fails.push('Fly, then Launch site while it loaded: the page is on the flight deck');
    if (!got.hash.endsWith('/site/pad')) fails.push(`the address is ${got.hash}, and the launch pad was the last asked for`);
    return fails;
  },
  async 'the gallery gone back to after Fly, while the site loads, is left alone when the site arrives'() {
    const { page, close } = await open(`${FLIGHT}/fly`, { slow: 1500 });
    await page.waitForTimeout(600);
    await page.evaluate((to) => (location.hash = to), `${FLIGHT}/gallery`);
    await galleryReady(page);
    // (the site goes on arriving behind the gallery, if it can)
    await siteReady(page).catch(() => {});
    await page.waitForTimeout(1200);
    const got = await page.evaluate(() => ({
      arrived: document.body.classList.contains('scene-ready'),
      deck: window.sr.cockpit.active,
      gallery: window.sr.gallery.active,
      running: window.sr.clock.running,
      hash: location.hash,
    }));
    await close();
    const fails = [];
    if (got.deck) fails.push('the flight deck was entered behind the gallery');
    if (got.running) fails.push('the clock is running behind the gallery');
    if (!got.gallery) fails.push('the gallery is not the place on show');
    if (!got.hash.endsWith('/gallery')) fails.push(`the address is ${got.hash}, and the gallery is on show`);
    if (!got.arrived) fails.push('(the site had not arrived behind the gallery when this was read)');
    return fails;
  },

  /** The turntable is one setting for both places: switched off in the gallery, the site is not turning when gone back to. */
  async 'Auto-orbit switched off in the gallery is off at the site at once'() {
    const { page, close } = await open(`${FLIGHT}/site/vehicle`);
    await siteReady(page);
    await page.waitForTimeout(600);
    const site = () =>
      page.evaluate(() => ({
        drift: window.sr.stage.cam.drift,
        lamp: document.querySelector('#ui [data-rotate]').getAttribute('aria-pressed') === 'true',
      }));
    const before = await site();
    await page.evaluate((to) => (location.hash = to), `${FLIGHT}/gallery`);
    await galleryReady(page);
    await page.evaluate(() => window.sr.gallery.setTurntable(false));
    await page.evaluate((to) => (location.hash = to), `${FLIGHT}/site/vehicle`);
    await page.waitForTimeout(400);
    const off = await site();
    await page.evaluate((to) => (location.hash = to), `${FLIGHT}/gallery`);
    await page.waitForTimeout(300);
    await page.evaluate(() => window.sr.gallery.setTurntable(true));
    await page.evaluate((to) => (location.hash = to), `${FLIGHT}/site/vehicle`);
    await page.waitForTimeout(400);
    const on = await site();
    await close();
    const fails = [];
    if (!before.drift || !before.lamp) fails.push('the site was not turning to begin with: nothing was tested');
    if (off.drift) fails.push('switched off in the gallery, and the site goes on turning');
    if (off.lamp) fails.push("switched off in the gallery, and the site's Auto-orbit lamp is lit");
    if (!on.drift || !on.lamp) fails.push('switched on again in the gallery, and the site is not turning or its lamp is out');
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
