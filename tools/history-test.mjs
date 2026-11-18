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
//   second craft Gemini X's gallery-only Agena can be linked and switched to, and Back restores it from the site
//   crumb        Freedom 7's gallery, the Space Race crumb, Vostok 1's gallery; Back to the front page, Back to Freedom 7
//   lineup       the front page, the Lineup, one chosen there (no step), its gallery; Back to the Lineup with it still
//                chosen, Back to the front page, Forward to the Lineup
//   flown        Freedom 7 flown by hand: Back within its places keeps the flight and asks nothing, Back out to the front page
//                asks (Keep flying puts the address back, no step added; Leave goes), Forward to Fly resumes it
//   story        Freedom 7's gallery, its History tab (the story, why it has its name, the pilot's own story, at 1280
//                and at 390 wide), See it in the Lineup (a step, Freedom 7 chosen there); Back to the gallery
// The dev server's reloads are kept from the page under test, so other people's edits do not restart it.
import { PEOPLE, STORIES } from '../missions/history.ts';
import { checks, launch, open, opt, url as urlOf } from './browser.mjs';

const args = process.argv.slice(2);
const only = opt(args, '--only', null);
const url = urlOf(args);
const MR3 = 'usa/mercury/mr-3-freedom-7';
const V1 = 'ussr/vostok/vostok-1';

const browser = await launch();

const { check, failures } = checks();
async function scenario(name, run, viewport) {
  if (only && only !== name) return;
  console.log(`${name}${viewport ? ` at ${viewport[0]}` : ''}`);
  const { page, errors, context } = await open(browser, null, viewport ? { viewport } : {});
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
    if (sr.lineup) on = sr.lineup.ready && document.querySelector('.loading.done') ? 'lineup' : 'loading';
    else if (sr.front && shown('#title') && !sr.gallery && !sr.stage) on = 'front';
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

await scenario('second craft', async (page) => {
  const gt10 = 'usa/gemini/gt-10';
  const route = `#${gt10}/gallery`;
  const dormant = `${route}/agena-8`;
  const craft = () => page.evaluate(() => window.sr?.gallery?.vehicle?.id);
  await page.goto(`${url}${dormant}`);
  const linked = await arrive(page, 'gallery', gt10);
  check(linked.hash === dormant && (await craft()) === 'agena-8', 'the dormant Agena opens from its direct link');
  await mark(page);

  await page.locator('#gallery [data-craft="vehicle"]').click();
  const primary = await arrive(page, 'gallery', gt10);
  check(
    primary.hash === route && (await craft()) === 'vehicle' && primary.length === linked.length,
    'the Titan replaces it on the same entry',
  );
  await page.locator('#gallery [data-craft="agena-8"]').click();
  const selected = await arrive(page, 'gallery', gt10);
  check(
    selected.hash === dormant && (await craft()) === 'agena-8' && selected.length === linked.length,
    'the gallery opens the Agena again',
  );
  await page.locator('#gallery [data-node="TargetDockingAdapter"]').click();
  const part = await state(page);
  check(part.hash === `${dormant}/TargetDockingAdapter` && part.length === linked.length, 'a part belongs to the Agena’s gallery address');

  await page.locator('#gallery .places [data-place="site"]').click();
  const site = await arrive(page, 'site', gt10);
  check(site.hash === `#${gt10}/site/pad` && site.length === linked.length + 1, 'the launch site opens on the pad in a new entry');
  check(
    (await page.evaluate(() => window.sr.flight.models.map((m) => m.id))).join(',') === 'vehicle,pad,crew,pilot',
    'the launch site has no model section for the dormant Agena',
  );
  await page.goBack();
  const restored = await arrive(page, 'gallery', gt10);
  check(
    restored.hash === part.hash && restored.kept && (await craft()) === 'agena-8',
    'Back restores the Agena and its part on the same page',
  );
  await page.goForward();
  const revisited = await arrive(page, 'site', gt10);
  check(
    revisited.hash === site.hash && revisited.kept && revisited.length === site.length,
    'Forward restores the launch site without a reload',
  );
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

await scenario('lineup', async (page) => {
  await page.goto(url);
  const start = await arrive(page, 'front');
  await page.locator('#title [data-lineup]').click();
  const row = await arrive(page, 'lineup');
  check(row.hash === '#lineup' && row.length === start.length + 1, `the front page to the Lineup: a step (${row.hash})`);
  await mark(page);
  await page.locator(`#ui .lu-strip [data-flight="${V1}"]`).click();
  await page.waitForTimeout(500);
  const chosen = await state(page);
  check(
    chosen.hash === `#lineup/${V1}` && chosen.length === row.length && chosen.kept,
    `Vostok 1 chosen there: the address says it, and no step (${chosen.hash})`,
  );
  await page.locator('#ui [data-pane=Vehicle] [data-gallery]').click();
  const g = await arrive(page, 'gallery', V1);
  check(g.hash === `#${V1}/gallery` && g.length === row.length + 1, `Open its gallery: Vostok 1's gallery, and a step (${g.hash})`);
  await page.goBack();
  const back = await arrive(page, 'lineup');
  check(back.hash === `#lineup/${V1}`, `Back: the Lineup, with Vostok 1 still chosen (${back.hash})`);
  await page.goBack();
  const front = await arrive(page, 'front');
  check(front.hash === '' && front.length === g.length, 'Back: the front page, the address bare');
  await page.goForward();
  const fwd = await arrive(page, 'lineup');
  check(fwd.hash === `#lineup/${V1}`, `Forward: the Lineup again (${fwd.hash})`);
  await page.locator('#ui .crumbs [data-home]').click();
  const out = await arrive(page, 'front');
  check(out.hash === '' && out.length === fwd.length, `its Space Race crumb: the front page (${out.length} entries)`);
});

/**
 * A flight flown by hand and the history. Back and Forward within the flight keep it (no question, one entry back each time,
 * Forward to Fly resumes it); Back out of the flight (to the front page) asks: Keep flying puts the address back where it was
 * with no entry added and no loop, and Leave goes on to the front page. Asked at the first way beyond, not before.
 */
await scenario('flown', async (page) => {
  const dialogs = [];
  page.on('dialog', (d) => {
    dialogs.push(d.type());
    void d.dismiss();
  });
  await page.goto(url);
  await arrive(page, 'front');
  await page.locator(`#title [data-flight="${MR3}"]`).click();
  await arrive(page, 'gallery', MR3);
  await mark(page);
  await page.locator('#gallery .places [data-place="site"]').click();
  await arrive(page, 'site', MR3);
  await page.locator('#ui .places [data-place="fly"]').click();
  const fly = await arrive(page, 'fly', MR3);
  await page.keyboard.press('Space');
  await page.waitForTimeout(1200);
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(600);
  await page.keyboard.up('KeyW');
  await page.evaluate(() => window.sr.clock.pause());
  await page.waitForTimeout(300);
  const figures = () =>
    page.evaluate(() => ({
      t: window.sr.clock.t,
      cells: [...document.querySelectorAll('#ui > .cockpit [data-cell]')]
        .filter((c) => c.dataset.cell !== 'kept-at')
        .map((c) => c.textContent)
        .join('|'),
      keeping: window.sr.cockpit.keeping,
      asking: Boolean(document.querySelector('.deck-ask [role=alertdialog]')),
      card: Boolean(document.querySelector('.cockpit-kept:not([hidden])')),
    }));
  const before = await figures();
  await page.goBack();
  const site = await arrive(page, 'site', MR3);
  let f = await figures();
  check(
    !f.asking && f.keeping && site.length === fly.length,
    `Back to the site, flying by hand: no question, the flight kept (${site.length} entries)`,
  );
  await page.goBack();
  const gallery = await arrive(page, 'gallery', MR3);
  f = await figures();
  check(!f.asking && f.keeping && gallery.length === fly.length, 'Back to the gallery: no question, still kept');
  // out of the flight: asked, and Keep flying puts the address back with no step added
  await page.goBack();
  await page.waitForSelector('.deck-ask [role=alertdialog]', { timeout: 10000 });
  await page.locator('.deck-ask [data-ask=stay]').click();
  const stayed = await arrive(page, 'gallery', MR3);
  await page.waitForTimeout(800);
  f = await figures();
  check(
    stayed.hash === `#${MR3}/gallery` && stayed.length === fly.length && stayed.kept,
    `Back to the front page: asked; Keep flying: the gallery again, ${stayed.length} entries, the page not loaded again`,
  );
  check(!f.asking && f.keeping, 'and the flight is still kept');
  // Forward goes on as before, and Fly resumes it to the digit
  await page.goForward();
  await arrive(page, 'site', MR3);
  await page.goForward();
  const again = await arrive(page, 'fly', MR3);
  await page.waitForTimeout(600);
  f = await figures();
  check(
    f.card && f.t === before.t && f.cells === before.cells,
    `Forward to Fly: the kept flight, at the same instant and figures (T${f.t.toFixed(1)})`,
  );
  check(again.length === fly.length, `no step was added along the way (${again.length} entries)`);
  // out again, this time for good: Leave
  await page.goBack();
  await arrive(page, 'site', MR3);
  await page.goBack();
  await arrive(page, 'gallery', MR3);
  await page.goBack();
  await page.waitForSelector('.deck-ask [role=alertdialog]', { timeout: 10000 });
  await page.keyboard.press('KeyL');
  const front = await arrive(page, 'front');
  check(front.hash === '', `Leave: the front page (${front.hash || 'the bare address'})`);
  check(dialogs.length === 0, `no browser dialog on the way (${dialogs.join(', ') || 'none'})`);
});

/** Freedom 7's History tab: what it says, a person opened, and the way to the Lineup and Back. */
async function story(page, narrow) {
  const told = STORIES[MR3];
  const pilot = PEOPLE.find((p) => p.flights.includes(MR3));
  await page.goto(`${url}#${MR3}/gallery`);
  const g = await arrive(page, 'gallery', MR3);
  // (on a phone the tabs are the sheet's: its handle opens it first)
  if (narrow) {
    await page.locator('#gallery .handle-open').click();
    await page.waitForTimeout(500);
  }
  await page.locator('#gallery [data-tab=History]').click();
  await page.waitForTimeout(500);
  const read = () =>
    page.evaluate(() => {
      const pane = document.querySelector('#gallery [data-pane=History]');
      const seen = (el) => Boolean(el?.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
      const person = pane?.querySelector('[data-person]');
      const box = pane?.getBoundingClientRect();
      return {
        open: seen(pane) && !pane.hidden,
        tall: box ? box.height : 0,
        headline: pane?.querySelector('.hist-headline')?.textContent ?? '',
        story: pane?.querySelector('.hist-story')?.textContent ?? '',
        named: pane?.querySelector('.hist-named')?.textContent ?? '',
        dot: pane?.querySelector('.hist-named .conf')?.className ?? '',
        person: person?.dataset.person ?? '',
        expanded: person?.getAttribute('aria-expanded') ?? '',
        bio: seen(person?.nextElementSibling) ? person.nextElementSibling.textContent : '',
        go: seen(pane?.querySelector('[data-lineup]')),
      };
    });
  const at = await read();
  check(at.open && at.tall > 100, `History is open, and has room (${Math.round(at.tall)} px)`);
  check(at.headline === told.headline, `its headline: ${at.headline}`);
  check(at.story.includes(told.story.split('\n')[0].slice(0, 60)), 'its story');
  check(Boolean(told.named) && at.named.includes(told.named.why.slice(0, 40)), 'why it has its name');
  check(at.dot.includes(told.named.confidence), `with how sure that is (${at.dot})`);
  check(at.person === pilot.id && at.expanded === 'false' && !at.bio, `its pilot, ${pilot.name}, closed`);
  await page.locator('#gallery [data-pane=History] [data-person]').first().click();
  const opened = await read();
  check(opened.expanded === 'true' && opened.bio.includes(pilot.bio.slice(0, 50)), 'pressed, he opens to his own story');
  check(opened.go, 'See it in the Lineup is there');
  await page.locator('#gallery [data-pane=History] [data-lineup]').click();
  const row = await arrive(page, 'lineup');
  check(row.hash === `#lineup/${MR3}` && row.length === g.length + 1, `See it in the Lineup: the Lineup, and a step (${row.hash})`);
  const card = await page.evaluate(() => document.querySelector('#ui [data-pane=Vehicle] .lu-big')?.textContent ?? '');
  check(narrow || card === 'Freedom 7', `Freedom 7 is chosen there (${card || 'its card is in the sheet'})`);
  await page.goBack();
  const back = await arrive(page, 'gallery', MR3);
  check(back.hash === `#${MR3}/gallery` && back.length === row.length, `Back: Freedom 7's gallery (${back.hash})`);
}
await scenario('story', (page) => story(page, false));
await scenario('story', (page) => story(page, true), [390, 844]);

await browser.close();
console.log(failures.length ? `\n${failures.length} failed:\n  ${failures.join('\n  ')}` : '\nBack and Forward go where they should');
process.exit(failures.length ? 1 : 0);
