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
//   phone        as a phone (390x844@3, touch, `?mem`): what the page holds on the GPU with the row up, with one framed,
//                and at the most while every vehicle is stepped through in turn, against BUDGET
// `--shots <dir>` also writes a picture of each width and look, and of the phone.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { checks, launch, open, opt, url as urlOf } from './browser.mjs';

const args = process.argv.slice(2);
const only = opt(args, '--only', null);
const shots = opt(args, '--shots', null);
const url = urlOf(args);
if (shots) mkdirSync(shots, { recursive: true });

/**
 * Accounted GPU memory the Lineup may hold as a phone, MiB (src/app/mem.ts): with the row up at its coarsest, with one
 * vehicle framed (in full), and at the most seen at any moment while the row is stepped through. The launch site's own
 * budget is 350 ready and 500 at its peak (tools/mem-test.mjs; docs/agents/rendering.md, "Memory"): the Lineup is held
 * well inside it. Measured when set (Chrome on ANGLE Vulkan, the lighter tier, fifteen vehicles): 202, 197 and 202, of
 * which 106 is the row at its coarsest (7 MiB a vehicle: it grows with the row) and the rest the allowance for finer
 * levels (scene.ts ALLOWANCE), which does not.
 */
export const BUDGET = { ready: 240, framed: 240, peak: 280 };

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
  const off = row.map((s, i) => (wanted[i].height ? Math.abs(s.height - wanted[i].height) / wanted[i].height : 0));
  const worst = off.indexOf(Math.max(...off));
  check(
    wanted.every((w) => w.height) && Math.max(...off) < 0.01,
    `each stands as tall as its flight says it stood, to a hundredth (the furthest out: ${row[worst].id}, ${row[worst].height.toFixed(2)} m for ${wanted[worst].height?.toFixed(2)})`,
  );
  const [tall, short] = [row.reduce((a, b) => (b.height > a.height ? b : a)), row.reduce((a, b) => (b.height < a.height ? b : a))];
  const [told, tols] = [wanted.find((w) => w.id === tall.id).height, wanted.find((w) => w.id === short.id).height];
  check(
    Math.abs(tall.height / short.height - told / tols) < 0.02,
    `and so in true proportion: the tallest ${(tall.height / short.height).toFixed(3)} times the shortest, ${(told / tols).toFixed(3)} by the flights' figures`,
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
  const ids = await page.evaluate(() => window.sr.lineup.entries.map((e) => ({ id: e.flight.id, callsign: e.flight.callsign })));
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
      crew: pane.querySelectorAll('.lu-crew li').length,
      gallery: pane.querySelector('[data-gallery]')?.dataset.gallery,
      tall: [...pane.querySelectorAll('table tr th')].some((th) => /^(Stands here|Height on the pad)/.test(th.textContent)),
    };
  });
  check(card.figures > 3 && card.confidences >= card.figures - 1, `its key figures, each with its confidence (${card.figures} rows)`);
  check(card.crew > 0 && card.tall, 'its crew, and how tall it stands');
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
  const s = await state(page);
  check(s.hash === '#lineup/spacecraft' && alone.every((x) => x.standing), `P: the spacecraft alone, every one of them (${s.hash})`);
  check(
    alone.every((x, i) => x.height < whole[i].height && x.height > 1 && x.height < 15),
    `each shorter than its vehicle, on the floor (${Math.min(...alone.map((x) => x.height)).toFixed(2)} to ${Math.max(...alone.map((x) => x.height)).toFixed(2)} m)`,
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
  check(ready <= BUDGET.ready, `the row up, every vehicle at its coarsest: ${ready.toFixed(0)} MiB of ${BUDGET.ready}`);
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
