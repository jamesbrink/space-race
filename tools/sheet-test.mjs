// The lines of buttons in a phone's sheet, under a finger (docs/agents/gallery.md, "On a phone"). On each page that has
// the sheet (a flight's gallery, its launch site, the Lineup), at 390 and 820 wide with touch, the sheet is opened as a
// finger opens it (a tap on the handle, the View tab, the grip pulled to the top) and then it checks that:
//   reach     every button in the View pane can be brought wholly inside the sheet: one already there is left alone, one
//             beyond its edge is in a line that scrolls sideways, and swiping that line brings it in, clear of any fade
//   fade      a line with more of it to one side fades on that side and only there (at rest only at its right, swiped to
//             its end only at its left); a line that fits has no fade
//   still     a swipe along a line leaves the sheet's height, the pane's scroll and the page's where they were, and the
//             line's label where it was
//   standing  a finger put down on a line leaves the line standing: nothing in the pane is taken off the page and built
//             again under it (Safari on an iPhone gives the finger to the scroller it lands on: one built again has no
//             finger, and does not move)
//   pull      a finger drawn down from a line still moves the sheet (from full to a lower stop)
// In the gallery this is done with the whole vehicle standing and again with the spacecraft (Aurora 7, the flight its
// report came from), whose views are written again into the same line.
//   node tools/sheet-test.mjs [url] [--only gallery|site|lineup] [--width 390|820] [--shots <dir>]     (default url: http://localhost:5180/)
// The touches are Chrome's own (CDP Input.dispatchTouchEvent), which scroll as a finger does, on the laptop and on Linux.
// Playwright's WebKit has no touch drag (only a tap), so Safari's own scrolling is not driven here; what the `standing`
// check holds is the part of it that was Safari's alone.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { checks, launch, open, opt, url as urlOf } from './browser.mjs';

const args = process.argv.slice(2);
const only = opt(args, '--only', null);
const width = opt(args, '--width', null);
const shots = opt(args, '--shots', null);
const url = urlOf(args);
if (shots) mkdirSync(shots, { recursive: true });

const lineupUp = () => Boolean(window.sr?.lineup?.ready && document.querySelector('.loading.done'));
const PAGES = [
  { name: 'gallery', root: '#gallery', address: '#usa/mercury/ma-7-aurora-7/gallery', wait: 'gallery', choose: 'Spacecraft' },
  { name: 'site', root: '#ui', address: '#usa/mercury/mr-3-freedom-7/site/pad', wait: 'ready' },
  { name: 'lineup', root: '#ui', address: '#lineup', wait: lineupUp },
];
const SIZES = [
  [390, 844],
  [820, 1180],
].filter(([w]) => !width || String(w) === width);
/** How wide the fade at a line's end is, px (fold.css .sideways): a button under it is not yet wholly to be seen. */
const FADE = 28;

const browser = await launch();
const { check, failures } = checks();

/** A finger on the page: put down at one point, drawn to another in `steps`, and lifted. */
function finger(cdp, page) {
  return async (x0, y0, x1, y1, { steps = 12, hold = 0 } = {}) => {
    const at = (t) => [{ x: x0 + (x1 - x0) * t, y: y0 + (y1 - y0) * t, id: 1, radiusX: 6, radiusY: 6, force: 1 }];
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0) });
    if (hold) await page.waitForTimeout(hold);
    for (let i = 1; i <= steps; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(i / steps) });
      await page.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(700); // (a fling's length, and the sheet's settling)
  };
}

/** The sheet, its View pane, the page's scroll, and every line that scrolls sideways in the pane, each with its buttons. */
const look = (page, root) =>
  page.evaluate((r) => {
    const panel = document.querySelector(`${r} .panel`);
    const pane = panel.querySelector('[data-pane=View]');
    const box = (e) => {
      const b = e.getBoundingClientRect();
      return { left: b.left, right: b.right, top: b.top, bottom: b.bottom };
    };
    const shown = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const scrolls = (e) => ['auto', 'scroll'].includes(getComputedStyle(e).overflowX);
    const lines = [];
    const buttons = [...pane.querySelectorAll('button')].filter(shown).map((b) => {
      let line = b.parentElement;
      while (line && line !== pane && !scrolls(line)) line = line.parentElement;
      if (line === pane) line = null;
      if (line && !lines.includes(line)) lines.push(line);
      return {
        name: b.textContent.trim() || b.getAttribute('aria-label') || b.title || b.className,
        box: box(b),
        line: line ? lines.indexOf(line) : -1,
      };
    });
    return {
      sheet: { ...box(panel), height: panel.getBoundingClientRect().height, cls: panel.className },
      pane: pane.hidden ? null : pane.scrollTop,
      page: [scrollX, scrollY, document.scrollingElement.scrollTop],
      buttons,
      lines: lines.map((e, i) => {
        e.dataset.line = String(i);
        const label = e.previousElementSibling?.matches('.slot-name') ? e.previousElementSibling : e.parentElement;
        return {
          i,
          name: e.getAttribute('aria-label') ?? e.parentElement.getAttribute('aria-label') ?? e.className,
          box: box(e),
          label: box(label),
          left: e.scrollLeft,
          over: e.scrollWidth - e.clientWidth,
          more: e.dataset.more ?? null,
          mask: getComputedStyle(e).maskImage || getComputedStyle(e).webkitMaskImage || 'none',
        };
      }),
    };
  }, root);

/** The sheet opened by a finger, on its View tab, pulled up to full by its grip. */
async function openSheet(page, root, touch) {
  for (let i = 0; i < 2 && !(await page.evaluate((r) => document.querySelector(`${r} .panel`).classList.contains('open'), root)); i++) {
    await page.locator(`${root} .handle-open`).tap();
    await page.waitForTimeout(900);
  }
  if (await page.evaluate((r) => document.querySelector(`${r} .panel [data-pane=View]`).hidden, root)) {
    await page.locator(`${root} .panel [data-tab='View']`).tap();
    await page.waitForTimeout(500);
  }
  const grip = await page.evaluate((r) => {
    const t = document.querySelector(`${r} .panel .tabs`).getBoundingClientRect();
    return { x: t.left + t.width / 2, y: t.top + t.height / 2 };
  }, root);
  await touch(grip.x, grip.y, grip.x, 40, { steps: 10 });
  return page.evaluate((r) => document.querySelector(`${r} .panel`).classList.contains('full'), root);
}

/** The checks on the View pane as it stands; `what` names it in each line. */
async function lines(page, root, touch, what) {
  const was = await look(page, root);
  const { sheet } = was;
  const inside = (b, line) =>
    b.left >= sheet.left - 0.5 &&
    b.right <= sheet.right + 0.5 &&
    (!line ||
      (b.left >= line.box.left + (line.more?.includes('left') ? FADE : 0) - 0.5 &&
        b.right <= line.box.right - (line.more?.includes('right') ? FADE : 0) + 0.5));
  check(was.buttons.length > 0 && was.pane !== null, `${what}: the View pane is up, with ${was.buttons.length} buttons in it`);

  // fade: at rest, a line fades only on the side there is more of it
  for (const line of was.lines) {
    const want = line.left <= 1 && line.over > 1 ? 'right' : line.over <= 1 ? '' : null;
    if (want === null) continue;
    check(
      line.more === want && (want ? line.mask !== 'none' : line.mask === 'none'),
      `${what}: "${line.name}" at rest ${want ? 'fades at its right only, where there is more of it' : 'fits, and has no fade'} (data-more "${line.more}", mask ${line.mask === 'none' ? 'none' : 'on'})`,
    );
  }

  // standing: a finger put down on each line (and moved a little along it) takes nothing in the pane down
  for (const line of was.lines) {
    await page.evaluate((i) => {
      if (!document.getElementById('sheet-test-anim')) {
        const s = document.createElement('style');
        s.id = 'sheet-test-anim';
        s.textContent =
          '@keyframes sheet-test { from { outline-color: transparent } to { outline-color: transparent } } .sheet-test { animation: sheet-test 1000s linear }';
        document.head.append(s);
      }
      window.__torn = 0;
      const e = document.querySelector(`[data-line="${i}"]`);
      e.classList.add('sheet-test');
      e.onanimationcancel = () => window.__torn++;
    }, line.i);
    await page.waitForTimeout(100);
    const y = (line.box.top + line.box.bottom) / 2;
    const x = Math.min(line.box.right, sheet.right) - 40;
    await touch(x, y, x - 14, y, { steps: 3, hold: 120 });
    const torn = await page.evaluate((i) => {
      const e = document.querySelector(`[data-line="${i}"]`);
      e.classList.remove('sheet-test');
      e.onanimationcancel = null;
      return window.__torn;
    }, line.i);
    check(torn === 0, `${what}: a finger put down on "${line.name}" leaves it standing (taken down and built again ${torn} times)`);
  }

  // reach and still: every button beyond the sheet's edge is brought in by swiping its line
  const lost = was.buttons.filter((b) => !inside(b.box, null) && b.line < 0);
  check(
    lost.length === 0,
    `${what}: no button is beyond the sheet's edge outside a line that scrolls${lost.length ? ` (${lost.map((b) => b.name).join(', ')})` : ''}`,
  );
  for (const line of was.lines) {
    const mine = was.buttons.flatMap((b, k) => (b.line === line.i ? [k] : []));
    const y = (line.box.top + line.box.bottom) / 2;
    const [left, right] = [Math.max(line.box.left, sheet.left), Math.min(line.box.right, sheet.right)];
    // (swiped half its width at a time, so that a button in its middle is seen whole on the way)
    const reach = (right - left) / 2;
    const seen = new Set();
    const note = (st) => mine.forEach((k) => st.buttons[k] && inside(st.buttons[k].box, st.lines[line.i]) && seen.add(k));
    let now = was;
    note(now);
    for (let i = 0; i < 16 && now.lines[line.i].left < now.lines[line.i].over - 1; i++) {
      await touch(right - 24, y, right - 24 - reach, y + 2);
      now = await look(page, root);
      note(now);
    }
    if (now === was) {
      // (one that fits is swiped all the same: the sheet and the page are not to move under it either)
      await touch(right - 24, y, right - 24 - reach, y + 2);
      now = await look(page, root);
    }
    const end = now.lines[line.i];
    if (end.over > 1) {
      const last = now.buttons[mine.at(-1)];
      check(end.left >= end.over - 1, `${what}: "${line.name}" is swiped to its end (${end.left.toFixed(0)} of ${end.over.toFixed(0)} px)`);
      check(
        last && inside(last.box, end),
        `${what}: "${line.name}" swiped to its end brings its last button, "${last?.name}", wholly into the sheet`,
      );
      check(
        end.more === 'left' && end.mask !== 'none',
        `${what}: "${line.name}" at its end fades at its left only (data-more "${end.more}")`,
      );
    }
    const out = mine.filter((k) => !seen.has(k)).map((k) => was.buttons[k].name);
    check(
      out.length === 0,
      `${what}: every button of "${line.name}" (${mine.length}) can be brought wholly into the sheet${out.length ? ` (not: ${out.join(', ')})` : ''}`,
    );
    check(
      Math.abs(now.sheet.height - was.sheet.height) < 1 && now.page.every((v, k) => v === was.page[k]) && now.pane === was.pane,
      `${what}: swiping "${line.name}" leaves the sheet (${was.sheet.height.toFixed(0)} -> ${now.sheet.height.toFixed(0)} px), the pane (${was.pane} -> ${now.pane}) and the page (${was.page.join(',')} -> ${now.page.join(',')}) where they were`,
    );
    check(
      Math.abs(end.label.left - line.label.left) < 0.5 && Math.abs(end.box.left - line.box.left) < 0.5,
      `${what}: "${line.name}"'s label stays where it was while the buttons go by`,
    );
    // and back to its start, the fade on its right again
    for (let i = 0; i < 8 && (await look(page, root)).lines[line.i].left > 1; i++) await touch(left + 24, y, right - 24, y + 2);
  }
  return was;
}

for (const [w, h] of SIZES)
  for (const p of PAGES) {
    if (only && only !== p.name) continue;
    const what = `${p.name} at ${w}`;
    console.log(what);
    const { page, context, errors, close } = await open(browser, `${url}${p.address}`, {
      context: { viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: w < 600 },
      wait: p.wait,
      timeout: 240000,
    });
    try {
      const touch = finger(await context.newCDPSession(page), page);
      await page.waitForTimeout(1500);
      check(await openSheet(page, p.root, touch), `${what}: a finger opens the sheet and pulls it up to full on its View tab`);
      if (shots) await page.screenshot({ path: join(shots, `sheet-${p.name}-${w}.png`) });
      await lines(page, p.root, touch, what);
      if (p.choose) {
        await page.locator(`${p.root} .panel [data-plinth]`, { hasText: p.choose }).first().tap();
        await page.waitForTimeout(2500);
        await lines(page, p.root, touch, `${what}, ${p.choose.toLowerCase()}`);
        if (shots) await page.screenshot({ path: join(shots, `sheet-${p.name}-${w}-${p.choose.toLowerCase()}.png`) });
      }
      // pull: a finger drawn down from a line moves the sheet down from full
      const was = await look(page, p.root);
      const line = was.lines[0] ?? null;
      if (line) {
        const y = (line.box.top + line.box.bottom) / 2;
        const x = (Math.max(line.box.left, was.sheet.left) + Math.min(line.box.right, was.sheet.right)) / 2;
        // (drawn most of the way down the page: let go, the sheet is nearest a lower stop however tall the page is)
        await touch(x, y, x + 4, h - 80, { steps: 16 });
        const after = await look(page, p.root);
        check(
          after.sheet.height < was.sheet.height - 50,
          `${what}: a finger drawn down from "${line.name}" moves the sheet down (${was.sheet.height.toFixed(0)} -> ${after.sheet.height.toFixed(0)} px, ${after.sheet.cls})`,
        );
      }
      check(errors.length === 0, `${what}: no errors${errors.length ? `: ${errors[0]}` : ''}`);
    } catch (e) {
      check(false, `${what}: ${e.message.split('\n')[0]}`);
    }
    await close();
  }

await browser.close();
console.log(failures.length ? `\n${failures.length} failed` : '\nevery line of the sheet reached under a finger');
process.exit(failures.length ? 1 : 0);
