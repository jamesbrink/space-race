// The Lineup in the running page, as a visitor uses it (`pnpm test:lineup`; needs `pnpm dev`):
//   node tools/lineup-test.mjs [url] [--only <name>] [--shots <dir>]      (default url: http://localhost:5180/)
// It checks what docs/agents/gallery.md promises of the Lineup:
//   row          every flight that has a vehicle stands in the row, in the order they flew, with the same floor between
//                neighbours, nothing scaled: each as tall as its own flight says it stood, and so in true proportion
//   card         a click on a vehicle chooses it: its card comes up, the address names it, and that is no step; its
//                gallery is one, and goes to `#<flight id>/gallery`; Back comes out to the Lineup with it still chosen
//   formed       the spacecraft alone (P), a programme's section, two standing together: what stands there, and the address
//   detail       the one framed is drawn at the finest level and what is out of the picture at the coarsest; a level
//                let go is gone from the GPU; a still row is not drawn again
//   widths       at 1280, 820 and 390 wide: nothing of the page off its edge, the controls all there, both looks drawn
//   cost         the whole row at 1280, and the spacecraft alone: draw calls against CALLS (each vehicle's coarser levels
//                joined by paint: lineup/merge.ts), triangles, programs; nothing drawn of what is out of the picture
//   alone        the spacecraft alone is what rides on the launch vehicle (an airlock under a heading of its own too), with what
//                it flew to meet on the floor beside it
//   target       a spacecraft and what it flew to meet, chosen in the row of spacecraft at 1280: each has its own label under it,
//                its own name and length, and neither is under a panel
//   tab          the gallery's open tab is kept: History, into the Lineup by its link, and Back finds History open
//   along        at 390 and 820 wide the whole row is framed by its height and gone along under the thumb, on the one nearest
//   show         left alone on a phone, the show frames each vehicle above its card, however long the card's words
//   phone        as a phone (390x844@3, touch, `?mem`): what the page holds on the GPU with the row up, with one framed,
//                and at the most while every vehicle is stepped through in turn, against BUDGET; and what the row holds
//                a vehicle whatever is looked at, against PER_VEHICLE, and how many vehicles the budget would hold
// `--shots <dir>` also writes a picture of each width and look, and of the phone.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { framesOf } from '../tests/glb.mjs';
import { STATURE } from '../src/viewer/studio.ts';
import { checks, launch, open, opt, url as urlOf } from './browser.mjs';

const args = process.argv.slice(2);
const only = opt(args, '--only', null);
const shots = opt(args, '--shots', null);
const url = urlOf(args);
if (shots) mkdirSync(shots, { recursive: true });

/**
 * Accounted GPU memory the Lineup may hold as a phone, MiB (src/app/mem.ts): with the row up, with one vehicle framed
 * (in full), and at the most seen at any moment while the row is stepped through. The launch site's own budget is 350
 * ready and 500 at its peak (tools/mem-test.mjs; docs/agents/rendering.md, "Memory"): the Lineup is held well inside it.
 * Measured when set (Chrome on ANGLE Vulkan, the lighter tier, nineteen vehicles): 149, 169 and 169; before the
 * levels were joined (merge.ts), 212 with the row up.
 */
export const BUDGET = { ready: 180, framed: 190, peak: 200 };
/**
 * What the row holds a vehicle whatever is looked at, MiB: its coarsest level joined by paint (each geometry once, however
 * many vehicles stand on it: shelf.ts) and its shadow's picture. Measured when set: 1.55 (3.60 before the levels were
 * joined; at 1280, 1.66 and 4.18). It is what grows with
 * every flight added; the rest (the frame, the hall's room, the allowance for finer levels) does not.
 */
export const PER_VEHICLE = 1.8;
/**
 * Draw calls the whole row may take at 1280 x 800, of vehicles and spacecraft alone (the second all at the finest level,
 * part by part). Measured when set: 188 and 937, where they were 2,368 and 3,240 before the levels were joined.
 */
export const CALLS = { whole: 220, spacecraft: 1000 };

const browser = await launch();
const { check, failures } = checks();
const up = () => Boolean(window.sr?.lineup?.ready && document.querySelector('.loading.done'));

async function scenario(name, run) {
  if (only && only !== name) return;
  console.log(name);
  try {
    await run();
  } catch (e) {
    check(false, `${name}: ${e.message.split('\n')[0]}`);
  }
}

/** Wait until every vehicle is drawn at the level it is granted and nothing is on its way, or `most` ms. */
async function settle(page, most = 60000) {
  await page.waitForTimeout(600);
  await page.waitForFunction(() => window.sr.stage.settledDetail && !window.sr.stage.cam.busy, null, { timeout: most }).catch(() => {});
  await page.waitForTimeout(900); // (a fade's length)
}
const report = (page) => page.evaluate(() => window.sr.stage.report());
const state = (page) =>
  page.evaluate(() => ({
    hash: decodeURIComponent(location.hash),
    length: history.length,
    view: window.sr?.lineup ? { ...window.sr.lineup.view } : null,
    card: document.querySelector('#ui [data-pane=Vehicle] .lu-big')?.textContent ?? '',
  }));
/** The middle of a vehicle on the page. */
const middleOf = (page, id) =>
  page.evaluate((flight) => {
    const [foot, top] = [window.sr.stage.footOf(flight), window.sr.stage.topOf(flight)];
    return foot && top ? { x: (foot.x + top.x) / 2, y: (foot.y + top.y) / 2 } : null;
  }, id);

await scenario('row', async () => {
  const { page, errors, close } = await open(browser, `${url}#lineup`, { wait: up, timeout: 180000 });
  const wanted = await page.evaluate(() =>
    window.sr.lineup.entries.map((e) => ({
      id: e.flight.id,
      launch: e.flight.launch,
      standalone: e.headings.length === 1 ? { url: e.vehicle.url, nodes: e.craft } : null,
      // the flight's own figure for how tall it stood
      height: e.flight.specs.find((s) => /\b(height|length) on the pad\b/i.test(s.label))?.value ?? null,
    })),
  );
  const row = await report(page);
  check(wanted.length > 1 && row.length === wanted.length, `${row.length} vehicles, one for every flight that has one`);
  check(
    row.every((s) => s.standing),
    'every one of them stands in the row',
  );
  check(
    row.every((s, i) => s.id === wanted[i].id) && wanted.every((w, i) => !i || Date.parse(w.launch) >= Date.parse(wanted[i - 1].launch)),
    'in the order they flew',
  );
  const gaps = row.slice(1).map((s, i) => s.x - s.width / 2 - (row[i].x + row[i].width / 2));
  check(
    row.every((s, i) => !i || s.x > row[i - 1].x) && Math.max(...gaps) - Math.min(...gaps) < 1e-6 && gaps[0] >= 1,
    `side by side, the same ${gaps[0].toFixed(2)} m of floor between every two`,
  );
  check(
    row.every((s) => Math.abs(s.scale - 1) < 1e-9),
    'nothing is scaled: a metre of any of them is a metre of the row',
  );
  // A separately exhibited spacecraft has no stack height. Measure its exported geometry, including an open shroud.
  for (const w of wanted)
    if (w.standalone) {
      const frames = framesOf(new URL('../public/' + w.standalone.url, import.meta.url));
      const boxes = w.standalone.nodes.map((n) => frames.box(n));
      w.height = Math.max(...boxes.map((b) => b.hi[1])) - Math.min(...boxes.map((b) => b.lo[1]));
    }
  const off = row.map((s, i) => (wanted[i].height ? Math.abs(s.height - wanted[i].height) / wanted[i].height : 0));
  const worst = off.indexOf(Math.max(...off));
  check(
    wanted.every((w) => w.height) && Math.max(...off) < 0.01,
    `each matches the published stack height or standalone exhibit, to a hundredth (the furthest out: ${row[worst].id}, ${row[worst].height.toFixed(2)} m for ${wanted[worst].height?.toFixed(2)})`,
  );
  const [tall, short] = [row.reduce((a, b) => (b.height > a.height ? b : a)), row.reduce((a, b) => (b.height < a.height ? b : a))];
  const [told, tols] = [wanted.find((w) => w.id === tall.id).height, wanted.find((w) => w.id === short.id).height];
  check(
    Math.abs(tall.height / short.height - told / tols) < 0.02,
    `and so in true proportion: the tallest ${(tall.height / short.height).toFixed(3)} times the shortest, ${(told / tols).toFixed(3)} by the reference heights`,
  );
  // the names and the ruled heights are written on the picture, and none of them on a panel or off the page
  const marks = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('.lu-marks > .on')].map((e) => e.getBoundingClientRect());
    const panels = [...document.querySelectorAll('#ui > :is(.title, .panel, .controls)')].map((e) => e.getBoundingClientRect());
    const hits = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    return {
      names: document.querySelectorAll('.lu-label.on').length,
      heights: [...document.querySelectorAll('.lu-height.on')].map((e) => e.textContent),
      covered: boxes.filter((b) => panels.some((p) => hits(b, p))).length,
      overlapping: boxes.filter((b, i) => boxes.some((c, j) => j > i && hits(b, c))).length,
      off: boxes.filter((b) => b.left < 0 || b.top < 0 || b.right > innerWidth || b.bottom > innerHeight).length,
    };
  });
  check(
    marks.names > 0 && marks.heights.length > 1,
    `${marks.names} names and the heights ${marks.heights.join(', ')} are written on the picture`,
  );
  check(marks.covered === 0 && marks.overlapping === 0 && marks.off === 0, 'none under a panel, on another, or off the page');
  check(errors.length === 0, `no errors${errors.length ? `: ${errors[0]}` : ''}`);
  await close();
});

await scenario('card', async () => {
  const { page, errors, close } = await open(browser, `${url}#lineup`, { wait: up, timeout: 180000 });
  const start = await state(page);
  const ids = await page.evaluate(() =>
    window.sr.lineup.entries.map((e) => ({
      id: e.flight.id,
      callsign: e.flight.callsign,
      crew: e.flight.crew.length,
      standalone: e.headings.length === 1,
    })),
  );
  const pick = ids[Math.floor(ids.length / 2)];
  const at = await middleOf(page, pick.id);
  await page.mouse.click(at.x, at.y);
  await page.waitForTimeout(1500);
  const chosen = await state(page);
  check(chosen.view.chosen === pick.id && chosen.card === pick.callsign, `a click on ${pick.callsign} chooses it, and its card comes up`);
  check(
    chosen.hash === `#lineup/${pick.id}` && chosen.length === start.length,
    `the address names it, and that is no step (${chosen.hash})`,
  );
  const card = await page.evaluate(() => {
    const pane = document.querySelector('#ui [data-pane=Vehicle]');
    return {
      figures: pane.querySelectorAll('table tr').length,
      confidences: pane.querySelectorAll('table .conf').length,
      crew: pane.querySelectorAll('.hist-crew li').length,
      gallery: pane.querySelector('[data-gallery]')?.dataset.gallery,
      tall: [...pane.querySelectorAll('table tr th')].some((th) =>
        /^(Stands here|Height on the pad|Spacecraft length)/.test(th.textContent),
      ),
    };
  });
  check(
    card.figures >= (pick.standalone ? 1 : 4) && card.confidences >= card.figures - 1,
    `its key figures, each with its confidence (${card.figures} rows)`,
  );
  check(card.crew === pick.crew && card.tall, 'its crew count and displayed height or length agree with the exhibit');
  // N goes to the next, and the camera with it
  await page.keyboard.press('n');
  await page.waitForTimeout(400);
  const next = await state(page);
  check(next.view.chosen === ids[Math.floor(ids.length / 2) + 1]?.id && next.length === start.length, 'N chooses the next, with no step');
  await page.keyboard.press('b');
  await page.waitForTimeout(400);
  // its gallery: a step, and that flight's own page
  check(card.gallery === pick.id, 'its card has the way into its gallery');
  await page.locator('#ui [data-pane=Vehicle] [data-gallery]').click();
  await page.waitForFunction(() => window.sr?.gallery?.ready, null, { timeout: 180000 });
  const inside = await page.evaluate(() => ({
    hash: decodeURIComponent(location.hash),
    length: history.length,
    flight: window.sr.flight.id,
  }));
  check(inside.hash === `#${pick.id}/gallery` && inside.flight === pick.id, `Open its gallery goes to ${inside.hash}`);
  check(inside.length === start.length + 1, `and is a step (${start.length} to ${inside.length})`);
  await page.goBack();
  await page.waitForFunction(up, null, { timeout: 180000 });
  const back = await state(page);
  check(
    back.hash === `#lineup/${pick.id}` && back.view.chosen === pick.id,
    `Back comes out to the Lineup, with it still chosen (${back.hash})`,
  );
  check(errors.length === 0, `no errors${errors.length ? `: ${errors[0]}` : ''}`);
  await close();
});

await scenario('formed', async () => {
  const { page, errors, close } = await open(browser, `${url}#lineup`, { wait: up, timeout: 180000 });
  const whole = await report(page);
  await page.keyboard.press('p');
  await page.waitForTimeout(900);
  const alone = await report(page);
  const standalone = new Set(
    await page.evaluate(() => window.sr.lineup.entries.filter((e) => e.headings.length === 1).map((e) => e.flight.id)),
  );
  const s = await state(page);
  check(s.hash === '#lineup/spacecraft' && alone.every((x) => x.standing), `P: the spacecraft alone, every one of them (${s.hash})`);
  // (each stands on the floor, which the line above holds, is shorter than its own vehicle and at least a person tall: no
  // height of its own, which would be true only of the spacecraft there were when it was written)
  check(
    alone.every(
      (x, i) => (standalone.has(x.id) ? Math.abs(x.height - whole[i].height) < 0.01 : x.height < whole[i].height) && x.height >= STATURE,
    ),
    `stacked spacecraft shorter than their vehicles, standalone craft at the same height, all at least a person tall, on the floor (${Math.min(...alone.map((x) => x.height)).toFixed(2)} to ${Math.max(...alone.map((x) => x.height)).toFixed(2)} m)`,
  );
  await page.keyboard.press('p');
  await page.waitForTimeout(900);
  // a programme's section
  const section = await page.evaluate(() => window.sr.lineup.sections[0]);
  await page.locator(`#ui .lu-strip [data-section="${section.id}"]`).click();
  await page.waitForTimeout(900);
  const part = await report(page);
  const p = await state(page);
  check(
    p.hash === `#lineup/${section.id}` && part.filter((x) => x.standing).every((x) => section.flights.includes(x.id)),
    `${section.name}: its section of the row, ${part.filter((x) => x.standing).length} vehicles (${p.hash})`,
  );
  check(part.filter((x) => x.standing).length === section.flights.length, 'all of its vehicles and no other');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);
  // two standing together
  const [a, b] = [whole[0].id, whole.at(-1).id];
  await page.locator(`#ui .lu-strip [data-flight="${a}"]`).click();
  await page.keyboard.press('x');
  await page.locator(`#ui .lu-strip [data-flight="${b}"]`).click();
  await page.waitForTimeout(900);
  const pair = await report(page);
  const c = await state(page);
  check(
    c.hash === `#lineup/${a}/vs/${b}` && pair.filter((x) => x.standing).length === 2,
    `the first and the last standing together, by themselves (${c.hash})`,
  );
  const table = await page.evaluate(() => document.querySelectorAll('#ui .lu-compare thead th').length - 1);
  check(table === 2, 'their figures side by side');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);
  const again = await report(page);
  check(
    again.every((x) => x.standing) && again.every((x, i) => Math.abs(x.x - whole[i].x) < 1e-6),
    'Escape: the whole row again, each where it stood',
  );
  check((await state(page)).length === s.length, 'and none of it a step in the history');
  check(errors.length === 0, `no errors${errors.length ? `: ${errors[0]}` : ''}`);
  await close();
});

await scenario('detail', async () => {
  const { page, errors, close } = await open(browser, `${url}#lineup`, { wait: up, timeout: 180000 });
  await settle(page);
  const row = await report(page);
  const mid = row[Math.floor(row.length / 2)];
  await page.evaluate((id) => window.sr.lineup.choose(id), mid.id);
  await settle(page);
  // The row grows with each flight. At the whole height of a taller booster its measured
  // threshold may still call for medium detail. Zoom in as a visitor would for the close inspection.
  const centre = await middleOf(page, mid.id);
  await page.mouse.move(centre.x, centre.y);
  await page.mouse.wheel(0, -320);
  await settle(page);
  const framed = await report(page);
  const at = framed.find((s) => s.id === mid.id);
  check(at.shown === 0 && at.wanted === 0, `${mid.id} framed: drawn at the finest level (level ${at.shown})`);
  const ends = [framed[0], framed.at(-1)];
  const coarsest = Math.max(...framed.map((s) => s.shown));
  check(
    coarsest > at.shown && ends.every((s) => s.shown === coarsest && s.wanted === coarsest),
    `the two ends of the row, out of the picture, at the coarsest (levels ${framed.map((s) => s.shown).join('')})`,
  );
  // a still row is not drawn again
  await page.evaluate(() => window.sr.stage.stats());
  await page.waitForTimeout(1500);
  const still = await page.evaluate(() => window.sr.stage.stats());
  check(
    still.drawn < 0.5 && still.fps > 5,
    `left alone, nothing is drawn (${still.drawn.toFixed(1)} frames a second of ${still.fps.toFixed(0)})`,
  );
  // let go: back to the whole row, and after a moment the fine level is gone
  const held = await page.evaluate(() => window.sr.stage.stats().heldMiB);
  await page.evaluate(() => window.sr.lineup.whole());
  await page.waitForTimeout(9000);
  await settle(page);
  const later = await page.evaluate(() => ({ held: window.sr.stage.stats().heldMiB, row: window.sr.stage.report() }));
  check(
    later.held < held,
    `back at the whole row, what was held of finer levels is let go (${held.toFixed(0)} MiB to ${later.held.toFixed(0)}; levels ${later.row.map((s) => s.shown).join('')})`,
  );
  check(
    later.row.every((s) => s.shown === s.granted && s.shown >= s.wanted),
    'and each is drawn at the level it is granted, none finer than its size on screen calls for',
  );
  check(errors.length === 0, `no errors${errors.length ? `: ${errors[0]}` : ''}`);
  await close();
});

await scenario('widths', async () => {
  for (const [width, height] of [
    [1280, 800],
    [820, 1180],
    [390, 844],
  ]) {
    const phone = width < 600;
    const { page, errors, close } = await open(browser, `${url}#lineup`, {
      context: { viewport: { width, height }, deviceScaleFactor: phone ? 2 : 1, hasTouch: width < 1000, isMobile: phone },
      wait: up,
      timeout: 180000,
    });
    await settle(page);
    const laid = await page.evaluate(() => {
      const shown = (e) => Boolean(e?.getClientRects().length) && getComputedStyle(e).visibility !== 'hidden';
      const within = (e) => {
        const r = e.getBoundingClientRect();
        return r.left >= -1 && r.right <= innerWidth + 1 && r.top >= -1 && r.bottom <= innerHeight + 1;
      };
      const narrow = matchMedia('(max-width: 960px), (max-height: 520px)').matches;
      const must = narrow
        ? ['.title h1', '.panel .handle-open', '.panel .handle [data-step="1"]']
        : ['.title h1', '.lu-top .models', '.controls', '.panel .tabs'];
      return {
        narrow,
        missing: must.filter((q) => !shown(document.querySelector(`#ui ${q}`))),
        off: [...document.querySelectorAll('#ui > :is(.title, .panel, .controls, .lu-top)')].filter((e) => shown(e) && !within(e)).length,
        sideways: document.documentElement.scrollWidth - innerWidth,
        names: document.querySelectorAll('.lu-label.on').length,
        standing: window.sr.stage.report().filter((s) => s.standing).length,
      };
    });
    check(
      laid.missing.length === 0,
      `${width} wide: ${laid.narrow ? 'the top line and the handle' : 'the title, the row’s switch, the controls and the panel'} are there${laid.missing.length ? ` (missing ${laid.missing.join(', ')})` : ''}`,
    );
    check(laid.off === 0 && laid.sideways <= 0, `${width} wide: nothing off the page's edge`);
    if (laid.narrow) {
      // the sheet's View pane holds every control the wide page has beside the row
      await page.locator('#ui .handle-open').tap();
      await page.waitForTimeout(900);
      const view = await page.evaluate(() => {
        const shown = (q) => Boolean(document.querySelector(`#ui [data-pane=View] ${q}`)?.getClientRects().length);
        return ['.lu-strip', '[data-whole]', '[data-measure]', '[data-names]', '[data-cel]', '[data-lighter]'].filter((q) => !shown(q));
      });
      check(
        view.length === 0,
        `${width} wide: the sheet's View pane has the timeline and every switch${view.length ? ` (missing ${view.join(', ')})` : ''}`,
      );
      if (shots) await page.screenshot({ path: join(shots, `lineup-${width}-sheet.png`) });
      await page.locator('#ui .handle-open').tap();
      await page.waitForTimeout(700);
    }
    if (shots) await page.screenshot({ path: join(shots, `lineup-${width}.png`) });
    // both looks draw, and differ
    const lit = () => page.evaluate(() => window.sr.stage.mean());
    const real = await lit();
    await page.keyboard.press('t');
    await page.waitForTimeout(1500);
    const cel = await lit();
    check(
      real > 2 && cel > real + 40,
      `${width} wide: the real look and the cel look are both drawn (mean ${real.toFixed(0)} and ${cel.toFixed(0)} of 255: a dark hall, then paper)`,
    );
    if (shots) await page.screenshot({ path: join(shots, `lineup-${width}-cel.png`) });
    await page.keyboard.press('t');
    check(errors.length === 0, `${width} wide: no errors${errors.length ? `: ${errors[0]}` : ''}`);
    await close();
  }
});

await scenario('cost', async () => {
  const { page, errors, close } = await open(browser, `${url}#lineup`, { wait: up, timeout: 180000 });
  await settle(page);
  // a frame drawn now, counted: every pass of it
  const drawnNow = () =>
    page.evaluate(() => {
      const s = window.sr.stage;
      s.stats();
      s.mean();
      const st = s.stats();
      return { calls: st.calls, triangles: st.triangles, programs: s.renderer.info.programs?.length ?? 0, levels: st.levels.join('') };
    });
  const whole = await drawnNow();
  console.log(
    `  the whole row at 1280: ${whole.calls} calls, ${(whole.triangles / 1e6).toFixed(2)} M triangles, ${whole.programs} programs (levels ${whole.levels})`,
  );
  check(whole.calls <= CALLS.whole, `the whole row in ${whole.calls} draw calls, of ${CALLS.whole}`);
  await page.keyboard.press('p');
  await settle(page);
  const craft = await drawnNow();
  console.log(`  the spacecraft alone: ${craft.calls} calls, ${(craft.triangles / 1e6).toFixed(2)} M triangles (levels ${craft.levels})`);
  check(craft.calls <= CALLS.spacecraft, `the spacecraft alone in ${craft.calls} draw calls, of ${CALLS.spacecraft}`);
  await page.keyboard.press('p');
  await settle(page);
  // one framed: what is out of the picture is not drawn at all
  const row = await report(page);
  await page.evaluate((id) => window.sr.lineup.choose(id), row[Math.floor(row.length / 2)].id);
  await settle(page);
  const framed = await drawnNow();
  const inView = await page.evaluate(() => {
    const s = window.sr.stage;
    const frustum = new s.frustum.constructor().setFromProjectionMatrix(
      s.camera.projectionMatrix.clone().multiply(s.camera.matrixWorldInverse),
    );
    return s.stands.filter((x) => x.standing && frustum.intersectsBox(x.box)).length;
  });
  console.log(
    `  one framed: ${framed.calls} calls, ${(framed.triangles / 1e6).toFixed(2)} M triangles, ${inView} vehicles in the picture (levels ${framed.levels})`,
  );
  check(inView < row.length && framed.calls < whole.calls + 60 * inView, 'one framed: what is out of the picture is not drawn');
  check(errors.length === 0, `no errors${errors.length ? `: ${errors[0]}` : ''}`);
  await close();
});

await scenario('target', async () => {
  // (the first flight in the row whose model states a target: its spacecraft alone, chosen, on a page 1280 wide)
  const first = await open(browser, `${url}#lineup`, { viewport: [1280, 800], wait: up, timeout: 180000 });
  const id = await first.page.evaluate(() => window.sr.lineup.entries.find((e) => e.vehicle.target)?.flight.id ?? null);
  await first.close();
  check(Boolean(id), `a flight in the row has a target (${id})`);
  if (!id) return;
  const { page, errors, close } = await open(browser, `${url}#lineup/spacecraft/${id}`, {
    viewport: [1280, 800],
    wait: up,
    timeout: 180000,
  });
  await page.waitForTimeout(4000);
  const got = await page.evaluate((id) => {
    const e = window.sr.lineup.entries.find((x) => x.flight.id === id);
    const rect = (el) => {
      const r = el?.getBoundingClientRect();
      return r ? { left: r.left, right: r.right, top: r.top, bottom: r.bottom } : null;
    };
    const of = (sel) => {
      const el = document.querySelector(sel);
      return {
        on: Boolean(el?.classList.contains('on')),
        text: el ? [...el.children].map((c) => c.textContent.trim()) : [],
        rect: rect(el),
      };
    };
    return {
      callsign: e.flight.callsign,
      target: { name: e.vehicle.target.name, length: e.vehicle.target.length.value },
      own: of(`.lu-label[data-flight="${id}"]:not(.target)`),
      met: of(`.lu-label.target[data-flight="${id}"]`),
      foot: window.sr.stage.footOf(id),
      targetFoot: window.sr.stage.targetFootOf(id),
      height: window.sr.stage.report().find((r) => r.id === id).height,
      panels: [...document.querySelectorAll('#ui .title, #ui .panel, #ui .controls, #ui .lu-top .models')].map(rect).filter(Boolean),
      title: rect(document.querySelector('#ui .title')),
      card: rect(document.querySelector('#ui .panel')),
      canvas: rect(document.querySelector('canvas')),
    };
  }, id);
  const under = (label, foot) =>
    Boolean(label.rect && foot) &&
    Math.abs((label.rect.left + label.rect.right) / 2 - foot.x) <= 2 &&
    label.rect.top - foot.y > 4 &&
    label.rect.top - foot.y < 16;
  check(got.own.on && got.met.on, 'the spacecraft and its target each have a label on the picture');
  check(
    got.own.text[0] === got.callsign &&
      /^\d+\.\d\d m$/.test(got.own.text[1] ?? '') &&
      Math.abs(parseFloat(got.own.text[1]) - got.height) < 0.05,
    `the spacecraft's says its own name and length (${got.own.text.join(' · ')}; it stands ${got.height.toFixed(2)} m)`,
  );
  check(
    got.met.text[0] === got.target.name && got.met.text[1] === `${got.target.length.toFixed(2)} m`,
    `the target's says its own, from the model's data (${got.met.text.join(' · ')})`,
  );
  check(under(got.own, got.foot), `the spacecraft's label is under the spacecraft (${got.foot?.x.toFixed(0)}, ${got.foot?.y.toFixed(0)})`);
  check(
    under(got.met, got.targetFoot),
    `the target's label is under the target (${got.targetFoot?.x.toFixed(0)}, ${got.targetFoot?.y.toFixed(0)})`,
  );
  check(Boolean(got.foot && got.targetFoot) && Math.abs(got.foot.x - got.targetFoot.x) > 80, 'and they are two places on the page');
  // neither is under a panel: each foot, and each label, clear of every panel's box
  const inside = (p, r) => p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom;
  const meets = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const clear =
    got.panels.length > 0 &&
    [got.foot, got.targetFoot].every((p) => p && !got.panels.some((r) => inside(p, r))) &&
    [got.own.rect, got.met.rect].every((l) => l && !got.panels.some((r) => meets(l, r)));
  check(clear, `neither is covered by a panel at 1280 (${got.panels.length} panels on the page)`);
  // and the two are centred as a pair in what the panels leave clear: the middle between their feet is nearer the
  // middle of the clear part than either foot is
  // (between the title card on the left and the vehicle's card on the right)
  const left = got.title?.right ?? got.canvas.left;
  const right = got.card?.left ?? got.canvas.right;
  const middle = (left + right) / 2;
  const pair = got.foot && got.targetFoot ? (got.foot.x + got.targetFoot.x) / 2 : Number.NaN;
  check(
    Math.abs(pair - middle) < Math.abs(got.foot.x - middle) &&
      Math.abs(pair - middle) < Math.abs(got.targetFoot.x - middle) &&
      Math.abs(pair - middle) < 0.2 * (right - left),
    `the pair is framed about the middle of what is clear (${pair.toFixed(0)} against ${middle.toFixed(0)}, clear from ${left.toFixed(0)} to ${right.toFixed(0)})`,
  );
  check(errors.length === 0, `no errors${errors.length ? `: ${errors[0]}` : ''}`);
  await close();
});

await scenario('alone', async () => {
  const { page, errors, close } = await open(browser, `${url}#lineup/spacecraft`, { wait: up, timeout: 180000 });
  const found = await page.evaluate(() =>
    window.sr.lineup.entries.map((e) => ({
      id: e.flight.id,
      headings: e.headings,
      craft: window.sr.stage.report().find((r) => r.id === e.flight.id)?.craft ?? null,
    })),
  );
  const own = found.every((f) => f.headings.find((h) => h.id === 'spacecraft').nodes.every((n) => f.craft?.includes(n)));
  check(own, 'each spacecraft alone has every part under its Spacecraft heading');
  const riders = found.flatMap((f) =>
    f.headings.filter((h) => h.id !== 'spacecraft' && h.nodes.every((n) => f.craft?.includes(n))).map((h) => `${f.id}: ${h.id}`),
  );
  console.log(`  riding with the spacecraft: ${riders.join(', ') || 'nothing else'}`);
  const airlocks = found.filter((f) => f.headings.some((h) => h.id === 'airlock'));
  check(
    airlocks.every((f) => riders.includes(`${f.id}: airlock`)),
    `an airlock under a heading of its own stands with its spacecraft (${airlocks.map((f) => f.id).join(', ') || 'none in the row'})`,
  );
  const lv = found.flatMap((f) =>
    f.headings.filter((h) => /launch-vehicle|stage|booster|core/.test(h.id) && h.nodes.some((n) => f.craft?.includes(n))),
  );
  check(lv.length === 0, 'and no part of a launch vehicle does');
  // what a spacecraft flew to meet (ModelDef.target) is a third kind: kept, on the floor beside the spacecraft, which is
  // lowered to the floor without it; and how tall the stand says it stands is the spacecraft's own height
  const met = await page.evaluate(() =>
    window.sr.stage
      .report()
      .filter((r) => r.beside.nodes.length)
      .map((r) => ({ id: r.id, low: r.beside.low, craftLow: r.beside.craftLow, width: r.width, height: r.height, craft: r.craft })),
  );
  check(
    met.length > 0 &&
      met.every((m) => m.low !== null && m.craftLow !== null && Math.abs(m.low) < 0.02 && Math.abs(m.craftLow) < 0.02 && m.width > 4),
    `a target stands on the floor beside its spacecraft, both on it (${met.map((m) => `${m.id}: ${m.low?.toFixed(3)} and ${m.craftLow?.toFixed(3)} m, ${m.width.toFixed(1)} m across`).join('; ') || 'none in the row'})`,
  );
  check(
    met.every((m) => m.height > 4 && m.height < 6.5),
    `and the stand's height is its spacecraft's (${met.map((m) => m.height.toFixed(2)).join(', ')} m)`,
  );
  check(errors.length === 0, `no errors${errors.length ? `: ${errors[0]}` : ''}`);
  await close();
});

await scenario('tab', async () => {
  const told = await (async () => {
    const { page, close } = await open(browser, `${url}#lineup`, { wait: up, timeout: 180000 });
    const id = await page.evaluate(() => window.sr.lineup.entries.find((e) => e.story)?.flight.id ?? null);
    await close();
    return id;
  })();
  const { page, errors, close } = await open(browser, `${url}#${told}/gallery`, { wait: 'gallery', timeout: 180000 });
  await page.locator('#gallery [data-tab=History]').click();
  await page.waitForTimeout(400);
  await page.locator('#gallery [data-pane=History] [data-lineup]').click();
  await page.waitForFunction(up, null, { timeout: 180000 });
  const there = await page.evaluate(() => decodeURIComponent(location.hash));
  check(there === `#lineup/${told}`, `See it in the Lineup goes to ${there}`);
  await page.goBack();
  await page.waitForFunction(() => window.sr?.gallery?.ready, null, { timeout: 180000 });
  await page.waitForTimeout(800);
  const open_ = await page.evaluate(() => document.querySelector('#gallery [data-tab][aria-selected=true]')?.dataset.tab ?? null);
  check(open_ === 'History', `Back to the gallery finds the History tab open (${open_})`);
  check(errors.length === 0, `no errors${errors.length ? `: ${errors[0]}` : ''}`);
  await close();
});

await scenario('along', async () => {
  for (const [width, height, dpr] of [
    [390, 844, 2],
    [820, 1180, 1],
  ]) {
    const { page, errors, close } = await open(browser, `${url}#lineup`, {
      context: { viewport: { width, height }, deviceScaleFactor: dpr, hasTouch: true, isMobile: width < 600 },
      wait: up,
      timeout: 180000,
    });
    await settle(page);
    const first = await page.evaluate(() => {
      const s = window.sr.stage;
      const bar = document.querySelector('#ui .lu-pan');
      const r = bar.getBoundingClientRect();
      const tallest = s.standing.reduce((a, b) => (b.height > a.height ? b : a));
      const [top, foot] = [s.topOf(tallest.entry.flight.id), s.footOf(tallest.entry.flight.id)];
      return {
        panning: s.panning,
        bar: bar.hidden ? null : { left: r.left, right: r.right, y: r.top + r.height / 2 },
        tall: top && foot ? foot.y - top.y : 0,
        names: document.querySelectorAll('.lu-label.on').length,
      };
    });
    check(
      Boolean(first.panning && first.bar),
      `${width} wide: the row is framed by its height, ${first.panning?.width.toFixed(0)} m of ${(first.panning?.to - first.panning?.from).toFixed(0)}, with the row in miniature under it`,
    );
    check(
      first.tall > 0.3 * height,
      `${width} wide: the tallest drawn ${first.tall.toFixed(0)} px tall, its names written (${first.names})`,
    );
    if (!first.bar) {
      await close();
      continue;
    }
    // the thumb along the bar, from its start to three quarters of the way, and let go
    const [y, from, to] = [first.bar.y, first.bar.left + 8, first.bar.left + 0.75 * (first.bar.right - first.bar.left)];
    const touch = (type, x) =>
      page.evaluate(
        ([t, x, y]) => {
          const bar = document.querySelector('#ui .lu-pan');
          bar.dispatchEvent(
            new PointerEvent(t, { clientX: x, clientY: y, pointerId: 7, pointerType: 'touch', bubbles: true, isPrimary: true }),
          );
        },
        [type, x, y],
      );
    await touch('pointerdown', from);
    for (let i = 1; i <= 10; i++) {
      await touch('pointermove', from + ((to - from) * i) / 10);
      await page.waitForTimeout(30);
    }
    await touch('pointerup', to);
    await settle(page);
    const after = await page.evaluate(() => {
      const s = window.sr.stage;
      const xs = s.standing.map((x) => x.group.position.x);
      const p = s.panning;
      return {
        at: p?.at ?? null,
        near: xs.reduce((a, b) => (Math.abs(b - p.at) < Math.abs(a - p.at) ? b : a)),
        from: p?.from,
        to: p?.to,
        width: p?.width,
      };
    });
    const wanted = after.from + 0.75 * (after.to - after.from);
    const ends = [after.from + after.width / 2, after.to - after.width / 2];
    check(
      after.at !== null &&
        Math.abs(after.at - wanted) < 0.25 * (after.to - after.from) &&
        (Math.abs(after.at - after.near) < 0.01 || ends.some((e) => Math.abs(after.at - e) < 0.01)),
      `${width} wide: under the thumb it goes along the row, and lets go with the one nearest framed (${after.at?.toFixed(1)} m)`,
    );
    if (shots) await page.screenshot({ path: join(shots, `lineup-${width}-along.png`) });
    check(errors.length === 0, `${width} wide: no errors${errors.length ? `: ${errors[0]}` : ''}`);
    await close();
  }
});

await scenario('show', async () => {
  const { page, errors, close } = await open(browser, `${url}#lineup`, {
    context: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
    wait: up,
    timeout: 180000,
  });
  await settle(page);
  // the longest card there is: each vehicle in turn, its words in, the camera there
  let worst = Number.POSITIVE_INFINITY;
  let seen = 0;
  let longest = '';
  const n = await page.evaluate(() => window.sr.lineup.entries.length);
  for (let i = 0; i < Math.min(n, 7); i++) {
    // (the show's own pace is the time it takes to read each card: a script asks for the next at once)
    await page.evaluate(() => window.sr.lineup.tour());
    await page.waitForTimeout(2600);
    const at = await page.evaluate(() => {
      const card = document.querySelector('.callout.showing .callout-card');
      const title = card?.querySelector('h2')?.textContent;
      const id = window.sr.lineup.entries.find((e) => e.flight.callsign === title)?.flight.id;
      if (!card || !id) return null;
      return { cardTop: card.getBoundingClientRect().top, foot: window.sr.stage.footOf(id)?.y ?? null, words: card.textContent.length, id };
    });
    if (!at || at.foot === null) continue;
    seen++;
    if (at.cardTop - at.foot < worst) worst = at.cardTop - at.foot;
    if (at.words > longest.length) longest = `${at.id} (${at.words} characters)`;
  }
  check(
    seen > 2 && worst > 0,
    `on a phone the show frames each vehicle above its card (the closest: its foot ${worst.toFixed(0)} px above; the longest card ${longest})`,
  );
  if (shots) await page.screenshot({ path: join(shots, 'lineup-phone-show.png') });
  check(errors.length === 0, `no errors${errors.length ? `: ${errors[0]}` : ''}`);
  await close();
});

await scenario('phone', async () => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.routeWebSocket(/.*/, () => {});
  const peak = { value: 0 };
  const total = async () => {
    const t = await page.evaluate(() => window.srMem?.report().total ?? 0).catch(() => 0);
    peak.value = Math.max(peak.value, t);
    return t;
  };
  await page.goto(`${url}?mem#lineup`);
  // (sampled while it loads: what is held for a moment during the load is where a phone is killed)
  while (!(await page.evaluate(up).catch(() => false))) {
    await total();
    await page.waitForTimeout(250);
  }
  const tier = await page.evaluate(() => `${window.sr.stage.tier.lighter ? 'lighter' : 'full'} (${window.sr.stage.tier.why})`);
  await settle(page);
  const ready = await total();
  const account = await page.evaluate(() => {
    const r = window.srMem.report();
    return `textures ${r.textures.toFixed(0)}, renderbuffers ${r.renderbuffers.toFixed(0)}, buffers ${r.buffers.toFixed(0)}, canvases ${r.canvases.toFixed(0)}`;
  });
  console.log(`  the ${tier} tier; with the row up ${ready.toFixed(0)} MiB (${account})`);
  check(ready <= BUDGET.ready, `the row up: ${ready.toFixed(0)} MiB of ${BUDGET.ready}`);
  const row = await page.evaluate(() => window.sr.stage.rowMiB());
  const per = (row.coarsest + row.shadows) / row.vehicles;
  // (what does not grow with the row: all that is held now but the row's own share)
  const fixed = ready - row.coarsest - row.shadows;
  // (how many vehicles the row could hold before it alone filled the launch site's budget as a phone, 350 MiB ready:
  // tools/mem-test.mjs; and the Lineup's own of 240 before this was tightened)
  const holds = (budget) => Math.floor((budget - fixed) / per);
  console.log(
    `  the row's own share: ${row.coarsest.toFixed(1)} MiB of coarsest levels and ${row.shadows.toFixed(1)} of shadows for ${row.vehicles} vehicles; the rest ${fixed.toFixed(0)}: 350 MiB would hold ${holds(350)} vehicles, 240 ${holds(240)}`,
  );
  check(per <= PER_VEHICLE, `a vehicle costs the row ${per.toFixed(2)} MiB whatever is looked at, of ${PER_VEHICLE}`);
  if (shots) await page.screenshot({ path: join(shots, 'lineup-phone.png') });
  const n = await page.evaluate(() => window.sr.lineup.entries.length);
  let framed = 0;
  for (let i = 0; i < n; i++) {
    await page.evaluate(() => window.sr.lineup.step(1));
    for (let t = 0; t < 6; t++) {
      await page.waitForTimeout(250);
      await total();
    }
    await settle(page, 40000);
    framed = Math.max(framed, await total());
    if (shots && i === 1) await page.screenshot({ path: join(shots, 'lineup-phone-framed.png') });
  }
  const levels = await page.evaluate(() =>
    window.sr.stage
      .report()
      .map((s) => s.shown)
      .join(''),
  );
  check(/0/.test(levels), `stepped through all ${n}: the one framed is drawn in full (levels ${levels})`);
  check(framed <= BUDGET.framed, `with one framed, at the most ${framed.toFixed(0)} MiB of ${BUDGET.framed}`);
  check(peak.value <= BUDGET.peak, `and at any moment on the way, ${peak.value.toFixed(0)} MiB of ${BUDGET.peak}`);
  check(errors.length === 0, `no errors${errors.length ? `: ${errors[0]}` : ''}`);
  await context.close();
});

await browser.close();
console.log(failures.length ? `\n${failures.length} failed:\n  ${failures.join('\n  ')}` : '\nThe Lineup keeps its promises');
process.exit(failures.length ? 1 : 0);
