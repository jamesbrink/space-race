// Back and Forward in the running page, as a visitor uses them (`pnpm test:history`; needs `pnpm dev`):
//   node tools/history-test.mjs [url] [--only <name>]      (default url: http://localhost:5180/)
// It checks the history's one rule (docs/agents/gallery.md, "Back and Forward"): going to another flight or another
// place is a step, so Back returns to exactly where the visitor was and Forward goes on again; what is chosen within a
// place, and the page settling an address into its own form, is no step. At each step it checks the address, what is
// actually on show, and how long the history is; and that Back and Forward between a flight's places do not reload.
//   front        the front page, into Vostok 1's gallery, Back (the front page again) and Forward (the gallery again)
//   places       the front page, Freedom 7's gallery, its launch site, a section there, Fly; Back, Back, Forward,
//                Back, Back, Back: each lands on the place before, the last on the front page
//   old link     #pad lands on Freedom 7's site and Back leaves it at once (it is no step of its own)
//   crumb        Freedom 7's gallery, the Space Race crumb, Vostok 1's gallery; Back to the front page, Back to Freedom 7
// The dev server's reloads are kept from the page under test, so other people's edits do not restart it.
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args.splice(args.indexOf(name), 2)[1] : fallback);
const only = opt('--only', null);
const url = args[0] ?? process.env.SR_URL ?? 'http://localhost:5180/';
const MR3 = 'usa/mercury/mr-3-freedom-7';
const V1 = 'ussr/vostok/vostok-1';

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });

const failures = [];
const check = (ok, what) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`);
  if (!ok) failures.push(what);
};
async function scenario(name, run) {
  if (only && only !== name) return;
  console.log(name);
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.routeWebSocket(/.*/, () => {});
  try {
    await run(page);
    check(errors.length === 0, `no errors${errors.length ? `: ${errors[0]}` : ''}`);
  } catch (e) {
    check(false, `${name}: ${e.message.split('\n')[0]}`);
  }
  await context.close();
}

/** What is on show, read off the page: which page, which place, the address, and the history's length. */
const state = (page) =>
  page.evaluate(() => {
    const sr = window.sr ?? {};
    const shown = (q) => {
      const e = document.querySelector(q);
      return Boolean(e && !e.hidden && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden');
    };
    let on = 'loading';
    if (sr.front && shown('#title') && !sr.gallery && !sr.stage) on = 'front';
    else if (sr.gallery?.active && sr.gallery.ready) on = 'gallery';
    else if (sr.cockpit?.active) on = 'fly';
    else if (sr.stage && !sr.gallery?.active && document.body.classList.contains('scene-ready')) on = 'site';
    return {
      on,
      flight: sr.flight?.id ?? '',
      hash: decodeURIComponent(location.hash),
      length: history.length,
      kept: Boolean(window.__kept), // (set by the test: gone if the page was loaded again)
      section: sr.ui ? (document.querySelector('#ui [data-model][aria-pressed="true"]')?.dataset.model ?? '') : '',
    };
  });
/** Wait until the page has come to `on` (and, for a flight's place, that flight). */
async function arrive(page, on, flight = '') {
  const deadline = Date.now() + 180000;
  for (;;) {
    const s = await state(page).catch(() => null); // (a page between loads has nothing to say)
    if (s && s.on === on && (!flight || s.flight === flight)) return s;
    if (Date.now() > deadline) throw new Error(`never came to ${on}${flight ? ` of ${flight}` : ''}: ${JSON.stringify(s)}`);
    await page.waitForTimeout(250);
  }
}
const mark = (page) => page.evaluate(() => (window.__kept = true));

await scenario('front', async (page) => {
  await page.goto(url);
  const start = await arrive(page, 'front');
  check(start.hash === '', 'the front page, at an address that names nothing');
  await page.locator(`#title [data-flight="${V1}"]`).click();
  const g = await arrive(page, 'gallery', V1);
  check(g.hash === `#${V1}/gallery`, `into Vostok 1: its gallery (${g.hash})`);
  check(g.length === start.length + 1, `one step in the history (${start.length} to ${g.length})`);
  await page.goBack();
  const back = await arrive(page, 'front');
  check(back.hash === '' && back.length === g.length, `Back: the front page, its list on show, the address bare (${back.length} entries)`);
  await page.goForward();
  const fwd = await arrive(page, 'gallery', V1);
  check(fwd.hash === `#${V1}/gallery` && fwd.length === g.length, `Forward: Vostok 1's gallery again (${fwd.hash})`);
});

await scenario('places', async (page) => {
  await page.goto(url);
  const start = await arrive(page, 'front');
  await page.locator(`#title [data-flight="${MR3}"]`).click();
  const g = await arrive(page, 'gallery', MR3);
  check(g.hash === `#${MR3}/gallery` && g.length === start.length + 1, `the front page to Freedom 7's gallery: a step (${g.hash})`);
  await mark(page);
  await page.locator('#gallery .places [data-place="site"]').click();
  const site = await arrive(page, 'site', MR3);
  check(site.hash.startsWith(`#${MR3}/site/`) && site.length === g.length + 1, `the gallery to the launch site: a step (${site.hash})`);
  await page.locator('#ui [data-model="pad"]').click();
  await page.waitForTimeout(500);
  const pad = await state(page);
  check(
    pad.hash === `#${MR3}/site/pad` && pad.length === site.length,
    `a section of the site chosen: the address says it, and no step (${pad.hash})`,
  );
  await page.locator('#ui .places [data-place="fly"]').click();
  const fly = await arrive(page, 'fly', MR3);
  check(fly.hash === `#${MR3}/fly` && fly.length === site.length + 1, `the site to the flight deck: a step (${fly.hash})`);

  await page.goBack();
  const b1 = await arrive(page, 'site', MR3);
  check(b1.hash === `#${MR3}/site/pad` && b1.section === 'pad', `Back: the launch site, on the section it was left on (${b1.hash})`);
  await page.goBack();
  const b2 = await arrive(page, 'gallery', MR3);
  check(b2.hash === `#${MR3}/gallery`, `Back: the gallery (${b2.hash})`);
  await page.goForward();
  const f1 = await arrive(page, 'site', MR3);
  check(f1.hash === `#${MR3}/site/pad`, `Forward: the launch site again (${f1.hash})`);
  check(f1.kept && f1.length === fly.length, `and none of it loaded the page again, nor added a step (${f1.length} entries)`);
  await page.goBack();
  const b3 = await arrive(page, 'gallery', MR3);
  check(b3.hash === `#${MR3}/gallery` && b3.kept, `Back: the gallery (${b3.hash})`);
  await page.goBack();
  const b4 = await arrive(page, 'front');
  check(b4.hash === '' && b4.length === fly.length, 'Back: the front page, its list on show, the address bare');
  check(page.url() !== 'about:blank', 'never a blank page on the way');
});

await scenario('old link', async (page) => {
  await page.goto('about:blank');
  await page.goto(`${url}#pad`);
  const s = await arrive(page, 'site', MR3);
  check(s.hash === `#${MR3}/site/pad`, `#pad is settled into Freedom 7's own address (${s.hash})`);
  await page.goBack();
  await page.waitForTimeout(500);
  check(page.url() === 'about:blank', `Back leaves it at once (${page.url()})`);
});

await scenario('crumb', async (page) => {
  await page.goto(`${url}#${MR3}/gallery`);
  const a = await arrive(page, 'gallery', MR3);
  await page.locator('#gallery .crumbs [data-home]').click();
  const front = await arrive(page, 'front');
  check(
    front.hash === '' && front.length === a.length + 1,
    `the Space Race crumb: the front page, and a step (${a.length} to ${front.length})`,
  );
  await page.locator(`#title [data-flight="${V1}"]`).click();
  const b = await arrive(page, 'gallery', V1);
  check(b.length === front.length + 1, `into Vostok 1: a step (${b.length})`);
  await page.goBack();
  const back1 = await arrive(page, 'front');
  check(back1.hash === '', 'Back: the front page');
  await page.goBack();
  const back2 = await arrive(page, 'gallery', MR3);
  check(back2.hash === `#${MR3}/gallery`, `Back: Freedom 7's gallery, where the crumb was pressed (${back2.hash})`);
  await page.goForward();
  await arrive(page, 'front');
  await page.goForward();
  const fwd = await arrive(page, 'gallery', V1);
  check(fwd.length === b.length, `Forward, Forward: the front page, then Vostok 1 again (${fwd.hash})`);
});

await browser.close();
console.log(failures.length ? `\n${failures.length} failed:\n  ${failures.join('\n  ')}` : '\nBack and Forward go where they should');
process.exit(failures.length ? 1 : 0);
