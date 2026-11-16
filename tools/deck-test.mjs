// The flight deck's promises, checked in the running page for every flight that can be flown, at a desk, a tablet and a
// phone (AGENTS.md: the flight deck; src/deck/deck.ts): the same three panels in the same order and corners on every flight,
// every key shown a button that does what the key does, nothing in the control block hidden, overlapping or (on touch)
// under 24 px, the panels tucking and H clearing them, Space walking the flight's own sequence, and Vostok 1 taken over in
// the ascent with real keys: turned by W and staged by Space.
//   pnpm dev, then: node tools/deck-test.mjs [url]
import { launch, open, url as urlOf } from './browser.mjs';

const url = urlOf(process.argv.slice(2));
const FLIGHTS = {
  'usa/mercury/mr-3-freedom-7': ['Ignition', 'Engine cutoff'],
  'usa/mercury/mr-4-liberty-bell-7': ['Ignition', 'Engine cutoff'],
  'ussr/vostok/vostok-1': ['Ignition', 'Drop the strap-ons'],
  'ussr/vostok/vostok-2': ['Ignition', 'Drop the strap-ons'],
  'ussr/vostok/vostok-3': ['Ignition', 'Drop the strap-ons'],
};
const SIZES = [
  [1280, 800, false],
  [820, 1180, true],
  [390, 844, true],
];
/** The deck's own keys and the command each is (deck.ts `key`). */
const COMMANDS = { Space: 'next', G: 'guidance', B: 'sequence', N: 'again', Esc: 'leave', X: 'abort' };
let failed = 0;
const fail = (where, what) => {
  failed++;
  console.log(`  FAIL ${where}: ${what}`);
};
const browser = await launch();
/** The deck's page of `id` at this size, flown: a page of its own, which counts only what it throws. */
const fly = (id, w, h, touch) =>
  open(browser, `${url}#${id}/fly`, {
    context: { viewport: { width: w, height: h }, hasTouch: touch, isMobile: w < 600 },
    console: [],
    wait: () => window.sr && document.querySelector('.loading.done') && window.sr.cockpit.active,
    timeout: 120000,
  });

/** Each panel's box and the deck's order, as the page has them. */
const layout = (page) =>
  page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, shown: r.width > 0 && r.height > 0 && getComputedStyle(el).display !== 'none' };
    };
    const deck = document.querySelector('#ui > .cockpit');
    return {
      // (the corners are the grid's areas: the navball's panel is put in last, and stands first)
      order: ['.navball', '.deck-main', '.deck-sys'].map((s) => getComputedStyle(deck.querySelector(s)).gridArea.split(' ')[0]),
      nav: box(deck.querySelector('.navball')),
      main: box(deck.querySelector('.deck-main')),
      sys: box(deck.querySelector('.deck-sys')),
      foot: [...deck.querySelectorAll('.deck-foot kbd')].filter((k) => k.getBoundingClientRect().width > 0).map((k) => k.textContent),
      viewport: { w: innerWidth, h: innerHeight },
    };
  });

for (const [w, h, touch] of SIZES) {
  const seen = {};
  for (const [id, steps] of Object.entries(FLIGHTS)) {
    const where = `${id} at ${w}`;
    const { page, errors, context: ctx } = await fly(id, w, h, touch);
    await page.waitForTimeout(800);
    const l = await layout(page);
    seen[id] = l;
    if (l.order.join() !== 'nav,main,sys') fail(where, `panels in the order ${l.order.join()}`);
    if (!l.main?.shown) fail(where, 'the middle panel is not shown');
    // every key shown is a button, and a command's key is the command the deck gives that key
    const keys = await page.evaluate(() =>
      [...document.querySelectorAll('#ui > .cockpit kbd')].map((k) => {
        // (a two-way control's key stands before its two buttons, each of which does one way of what the key does)
        const pair = k.parentElement.querySelectorAll(':scope > button[data-path]').length === 2;
        const b = k.closest('button') ?? (pair ? k.parentElement.querySelector('button') : null);
        const d = b?.dataset ?? {};
        return {
          key: k.textContent,
          button: Boolean(b),
          do: d.do ?? null,
          press: d.press ?? null,
          hold: d.hold ?? null,
          work: d.work ?? d.nav ?? d.path ?? null,
        };
      }),
    );
    for (const k of keys) {
      if (!k.button) fail(where, `the key ${k.key} is shown with no button`);
      else if (!k.do && !k.press && !k.hold && !k.work) fail(where, `the key ${k.key}'s button does nothing`);
      else if (k.do && COMMANDS[k.key] && COMMANDS[k.key] !== k.do) fail(where, `${k.key} is ${COMMANDS[k.key]} but its button is ${k.do}`);
      else if (k.hold && k.hold.toUpperCase() !== k.key) fail(where, `${k.key}'s button holds ${k.hold}`);
      else if (k.press && k.press.length === 1 && k.press.toUpperCase() !== k.key.toUpperCase())
        fail(where, `${k.key}'s button presses ${k.press}`);
    }
    // the control block: each control shown is whole on the page, apart from the others, and big enough for a finger on touch
    const controls = await page.evaluate(() =>
      [...document.querySelectorAll('#ui > .cockpit .deck-main button, #ui > .cockpit .cockpit-stick, #ui > .cockpit .cockpit-roll button')]
        .filter((b) => b.getBoundingClientRect().width > 0 && getComputedStyle(b).visibility !== 'hidden' && !b.closest('[hidden]'))
        .map((b) => {
          const r = b.getBoundingClientRect();
          return { name: b.dataset.do ?? b.dataset.hold ?? b.dataset.press ?? b.className, x: r.x, y: r.y, w: r.width, h: r.height };
        }),
    );
    for (const c of controls) {
      if (c.x < -1 || c.y < -1 || c.x + c.w > w + 1 || c.y + c.h > h + 1) fail(where, `${c.name} is cut off the page`);
      if (touch && (c.w < 24 || c.h < 24)) fail(where, `${c.name} is ${c.w.toFixed(0)} by ${c.h.toFixed(0)} px on touch`);
    }
    for (let i = 0; i < controls.length; i++)
      for (let j = i + 1; j < controls.length; j++) {
        const [a, b] = [controls[i], controls[j]];
        const over = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 1 && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 1;
        if (over) fail(where, `${a.name} and ${b.name} overlap`);
      }
    // the keys tuck: Keys (More on a phone) opens the list and shuts it
    await page.click('#ui > .cockpit [data-do=keys]');
    const open = await page.evaluate(() => document.querySelector('#ui > .cockpit').classList.contains('keys-open'));
    await page.click('#ui > .cockpit [data-do=keys]');
    const shut = await page.evaluate(() => !document.querySelector('#ui > .cockpit').classList.contains('keys-open'));
    if (!open || !shut) fail(where, 'the key list does not open and shut');
    // H clears every panel, and H brings them back
    await page.keyboard.press('KeyH');
    await page.waitForTimeout(600);
    const bare = await page.evaluate(() => getComputedStyle(document.querySelector('#ui > .cockpit')).opacity === '0');
    await page.keyboard.press('KeyH');
    await page.waitForTimeout(400);
    if (!bare) fail(where, 'H does not clear the deck');
    // Space walks the flight's sequence: on the pad it is the first step, and pressed, the next is the second
    const label = () => page.evaluate(() => document.querySelector('[data-cell=next]').textContent);
    if ((await label()) !== steps[0]) fail(where, `on the pad Space is "${await label()}", not "${steps[0]}"`);
    await page.keyboard.press('Space');
    await page.waitForTimeout(600);
    if ((await label()) !== steps[1]) fail(where, `after Space it is "${await label()}", not "${steps[1]}"`);
    if (id.startsWith('ussr') && w === 1280) {
      // taken over in the ascent with real keys: G takes it, W held turns it, B and Space drop the strap-ons
      for (let i = 0; i < 100 && (await page.evaluate(() => window.sr.clock.t)) < 50; i++) {
        await page.evaluate(() => window.sr.clock.seek(Math.min(50, window.sr.clock.t + 4)));
        await page.waitForTimeout(50);
      }
      const read = () =>
        page.evaluate(() => ({
          mode: document.querySelector('[data-cell=mode]').textContent,
          pitch: Number(document.querySelector('[data-cell=pitch]').textContent),
          boosters: document.querySelector('[data-cell=stage-0]').textContent,
          rate: window.sr.cockpit.state?.w[1] ?? 0,
        }));
      const before = await read();
      await page.keyboard.press('KeyG');
      await page.waitForTimeout(300);
      const taken = await read();
      if (!/Not the record/.test(taken.mode)) fail(where, `G did not take the flight over: "${taken.mode}"`);
      await page.keyboard.down('KeyW');
      await page.waitForTimeout(1500);
      await page.keyboard.up('KeyW');
      await page.waitForTimeout(300);
      const turned = await read();
      if (!(turned.rate > 0.05)) fail(where, `W did not turn it: pitch rate ${turned.rate}`);
      if (!(turned.pitch < before.pitch - 3)) fail(where, `W did not pitch it over: ${before.pitch} to ${turned.pitch}`);
      await page.keyboard.press('KeyB');
      await page.keyboard.press('Space');
      await page.waitForTimeout(800);
      const staged = await read();
      if (staged.boosters !== 'Gone') fail(where, `Space did not drop the strap-ons: ${staged.boosters}`);
      console.log(`  ${where}: taken over at T+50: pitch ${before.pitch} to ${turned.pitch} under W, strap-ons ${staged.boosters}`);
    }
    if (errors.length) fail(where, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // each flight into orbit as flown, untouched: in orbit with its apogee on the deck once the ship is alone, and down at the
  // run's end with the deck and the navball at nought
  if (w === 1280)
    for (const id of Object.keys(FLIGHTS).filter((f) => f.startsWith('ussr/'))) {
      const where = `${id} as flown at ${w}`;
      const { page, errors, context: ctx } = await fly(id, w, h, touch);
      const seek = async (t) => {
        await page.evaluate((x) => window.sr.clock.seek(x), t);
        await page.waitForTimeout(500);
      };
      await seek(1800);
      const up = await page.evaluate(() => ({
        mode: document.querySelector('[data-cell=mode]').textContent,
        apogee: Number(document.querySelector('.deck-main [data-cell=apogee]')?.textContent.replace(/[^\d.-]/g, '')),
      }));
      if (!/As flown/.test(up.mode)) fail(where, `in orbit the deck says "${up.mode}", not as flown`);
      if (!(up.apogee > 150 && up.apogee < 400)) fail(where, `in orbit the deck's apogee is ${up.apogee} km`);
      await seek(1e7);
      const down = await page.evaluate(() => ({
        mode: document.querySelector('[data-cell=mode]').textContent,
        ball: document.querySelector('.navball [data-cell=speed]').textContent,
        deck: document.querySelector('.deck-main [data-cell=speed]')?.textContent ?? '0',
      }));
      if (!/As flown/.test(down.mode) || down.ball !== '0' || down.deck !== '0')
        fail(where, `at the run's end: "${down.mode}", the navball ${down.ball} m/s, the deck ${down.deck}`);
      if (errors.length) fail(where, errors.slice(0, 2).join(' | '));
      console.log(`  ${where}: in orbit at T+1800 with an apogee of ${up.apogee} km, down at the end, "${down.mode}"`);
      await ctx.close();
    }
  // the descent by hand (orbitdeck.ts `descent:` commands): offered when the simulator would hear it, B its sequencer, Space its steps
  {
    const where = `vostok-1's descent at ${w}`;
    const { page, errors, context: ctx } = await fly('ussr/vostok/vostok-1', w, h, touch);
    const can = () =>
      page.evaluate(() =>
        Object.fromEntries(
          ['descent:modules', 'descent:seat-ejection', 'descent:pilot/main canopy'].map((a) => [a, window.sr.cockpit.can(a)]),
        ),
      );
    const seek = async (t) => {
      await page.evaluate((x) => window.sr.clock.seek(x), t);
      await page.waitForTimeout(300);
    };
    const label = () => page.evaluate(() => document.querySelector('[data-cell=next]').textContent);
    await seek(600);
    let c = await can();
    if (Object.values(c).some(Boolean)) fail(where, `offered on the launch vehicle: ${JSON.stringify(c)}`);
    await seek(4600); // (alone, the timer's burn still to come)
    c = await can();
    if (!c['descent:modules'] || c['descent:seat-ejection']) fail(where, `before the burn: ${JSON.stringify(c)}`);
    await seek(4800); // (the burn made)
    c = await can();
    if (!c['descent:seat-ejection'] || c['descent:pilot/main canopy']) fail(where, `after the burn: ${JSON.stringify(c)}`);
    await page.keyboard.press('KeyB');
    await page.waitForTimeout(400);
    const off = await page.evaluate(() => ({
      pressed: document.querySelector('[data-do=sequence]').getAttribute('aria-pressed'),
      mode: document.querySelector('[data-cell=mode]').textContent,
      prompt: document.querySelector('[data-cell=prompt]').textContent,
    }));
    if (off.pressed !== 'false' || !/descent by hand/.test(off.mode) || !/Sequencer off/.test(off.prompt))
      fail(where, `B did not switch the descent's sequence off: ${JSON.stringify(off)}`);
    if ((await label()) !== 'Part the modules') fail(where, `Space is "${await label()}", not "Part the modules"`);
    await page.keyboard.press('Space');
    await page.waitForTimeout(1700);
    if ((await label()) !== 'Eject') fail(where, `after the modules Space is "${await label()}", not "Eject"`);
    await page.keyboard.press('Space');
    await page.waitForTimeout(600);
    c = await can();
    if (c['descent:seat-ejection'] || !c['descent:pilot/main canopy']) fail(where, `after the ejection: ${JSON.stringify(c)}`);
    const next = await page.evaluate(() => {
      const r = document.querySelector('[data-do=next]').getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height };
    });
    if (next.x < -1 || next.y < -1 || next.x + next.w > w + 1 || next.y + next.h > h + 1)
      fail(where, `the step's button is cut off: ${JSON.stringify(next)}`);
    if (errors.length) fail(where, errors.slice(0, 2).join(' | '));
    console.log(`  ${where}: offered when heard, B off, Space parted the modules and ejected him; next "${await label()}"`);
    // down at the run's end: the navball's speed agrees with the deck's nought, in both of its frames, and shows no way it is going
    await seek(1e6);
    for (const frame of ['Surface', 'Orbit']) {
      const down = await page.evaluate(() => ({
        frame: document.querySelector('.navball [data-cell=mode]').textContent,
        ball: document.querySelector('.navball [data-cell=speed]').textContent,
        deck: document.querySelector('.deck-main [data-cell=speed]')?.textContent ?? '0',
        marks: [...document.querySelectorAll('.navball [data-mark]')].filter((m) => !m.hidden && m.dataset.mark !== 'target').length,
      }));
      if (down.ball !== '0' || down.deck !== '0' || down.marks)
        fail(where, `down, the navball (${down.frame}) reads ${down.ball} m/s with ${down.marks} markers, the deck ${down.deck}`);
      if (frame === 'Surface') {
        await page.keyboard.press('KeyO');
        await page.waitForTimeout(300);
      }
    }
    await page.keyboard.press('KeyO');
    await ctx.close();
  }
  // staging by hand (sim/staging.ts): hot staging explained where it is offered and harmless at its moment, a minute early
  // the stack breaks up and the card says by what; the fairing let go at max q and the core let go early say what they did;
  // Freedom 7's capsule let go under thrust rides on to the cutoff
  if (w !== 820) {
    const where = `staging by hand at ${w}`;
    const {
      page,
      errors,
      context: ctx,
    } = await open(browser, null, {
      context: { viewport: { width: w, height: h }, hasTouch: touch, isMobile: w < 600 },
      console: [],
    });
    const goTo = async (id) => {
      await page.goto(`${url}#${id}/fly`);
      await page.waitForFunction(() => window.sr && document.querySelector('.loading.done') && window.sr.cockpit.active, null, {
        timeout: 120000,
      });
      await page.waitForTimeout(500);
    };
    // the clock run on to `t` a few seconds a frame, as the deck flies it (it steps no more than five seconds a frame)
    const run = async (t) => {
      for (let i = 0; i < 400 && (await page.evaluate(() => window.sr.clock.t)) < t - 0.05; i++) {
        await page.evaluate((x) => window.sr.clock.seek(Math.min(x, window.sr.clock.t + 4)), t);
        await page.waitForTimeout(30);
      }
      await page.waitForTimeout(200);
    };
    const read = () =>
      page.evaluate(() => ({
        t: window.sr.clock.t,
        prompt: document.querySelector('[data-cell=prompt]')?.textContent ?? '',
        notes: document.querySelector('.notes')?.textContent ?? '',
        card: document.querySelector('.cockpit-card:not([hidden])')?.textContent ?? '',
        core: document.querySelector('[data-cell=stage-1]')?.textContent ?? '',
        phase: document.querySelector('[data-cell=phase]')?.textContent ?? '',
      }));
    const ask = (what) => page.evaluate((x) => window.sr.cockpit.ask(x), what);
    const shot = async (name) => {
      if (process.env.SR_SHOTS) await page.screenshot({ path: `${process.env.SR_SHOTS}/${name}-${w}.png` });
    };
    await goTo('ussr/vostok/vostok-1');
    await page.keyboard.press('Space');
    await run(290);
    let r = await read();
    if (!/hot staging, as it flew/.test(r.prompt))
      fail(where, `before the third stage the prompt does not say it is hot staging: "${r.prompt}"`);
    await shot('hot-offered');
    await run(299);
    await ask('step:ignite:2');
    await run(299.6);
    r = await read();
    if (!/Hot staging/.test(r.notes)) fail(where, `lit at 299 s, no note of hot staging: "${r.notes}"`);
    await shot('hot-lit');
    await run(306);
    r = await read();
    if (r.card || r.core !== 'Gone')
      fail(where, `lit at its moment it did not part clean: core "${r.core}", card "${r.card.slice(0, 80)}"`);
    console.log(`  ${where}: hot staging at 299 s: "${r.notes.slice(0, 90)}…", the core ${r.core}`);
    // a minute early
    await page.keyboard.press('KeyN');
    await page.waitForTimeout(500);
    await page.keyboard.press('Space');
    await run(240);
    await ask('step:ignite:2');
    await run(250);
    r = await read();
    if (!/Broke up on the launch vehicle/.test(r.card) || !/estimated/.test(r.card))
      fail(where, `lit a minute early, no breakup card: "${r.card.slice(0, 120)}"`);
    await shot('hot-early-card');
    console.log(`  ${where}: lit at 240 s: ${r.phase}; "${r.card.slice(0, 160)}…"`);
    // the fairing at max q, the core early
    await page.keyboard.press('KeyN');
    await page.waitForTimeout(500);
    await page.keyboard.press('Space');
    await run(60);
    await ask('step:drop:fairing');
    await run(61);
    r = await read();
    if (!/let go in the air/.test(r.notes)) fail(where, `the fairing at max q said nothing: "${r.notes}"`);
    await shot('fairing-maxq');
    await ask('step:separate:1');
    await run(63);
    r = await read();
    if (!/still pushing/.test(r.notes)) fail(where, `the core let go early under the strap-ons said nothing: "${r.notes}"`);
    await shot('core-early');
    console.log(`  ${where}: the fairing at 60 s and the core at 61 s said so`);
    // Freedom 7: the capsule let go under thrust rides the booster to its cutoff
    await goTo('usa/mercury/mr-3-freedom-7');
    await page.keyboard.press('Space');
    await run(100);
    await ask('separate');
    await run(101);
    r = await read();
    if (!/still pushing/.test(r.notes)) fail(where, `Freedom 7 let go under thrust said nothing: "${r.notes}"`);
    await shot('mr3-pressed');
    const apart = await page.evaluate(() =>
      ((s, f) => s && Number.isFinite(s.craft.bodies[f.plan.craft[0].bodies[0].id] ?? Infinity))(window.sr.cockpit.state, window.sr.flight),
    );
    if (apart) fail(where, 'Freedom 7 parted at once under thrust');
    await run(146);
    if (
      !(await page.evaluate(() =>
        ((s, f) => s && Number.isFinite(s.craft.bodies[f.plan.craft[0].bodies[0].id] ?? Infinity))(
          window.sr.cockpit.state,
          window.sr.flight,
        ),
      ))
    )
      fail(where, 'Freedom 7 had not parted after the cutoff');
    console.log(`  ${where}: Freedom 7 let go at 100 s parted after its cutoff`);
    if (errors.length) fail(where, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }
  // the same panels in the same corners on both flights
  const [a, b] = Object.values(seen);
  for (const p of ['nav', 'main', 'sys']) {
    const near = (x, y) => Math.abs(x - y) < 0.12 * w;
    if (!a[p] || !b[p] || a[p].shown !== b[p].shown) fail(`${w}`, `${p} shown on one flight and not the other`);
    else if (a[p].shown && (!near(a[p].x, b[p].x) || !near(a[p].x + a[p].w, b[p].x + b[p].w) || !near(a[p].y + a[p].h, b[p].y + b[p].h)))
      fail(`${w}`, `${p} stands elsewhere: ${JSON.stringify(a[p])} against ${JSON.stringify(b[p])}`);
  }
  if (a.foot.join(' ') !== b.foot.join(' ')) fail(`${w}`, `the key lines differ: "${a.foot.join(' ')}" against "${b.foot.join(' ')}"`);
  console.log(`${w} x ${h}${touch ? ' (touch)' : ''}: checked`);
}
await browser.close();
console.log(failed ? `deck: ${failed} failed` : 'deck: every promise kept');
process.exit(failed ? 1 : 0);
