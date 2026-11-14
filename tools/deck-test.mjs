// The flight deck's promises, checked in the running page for every flight that can be flown, at a desk, a tablet and a
// phone (AGENTS.md: the flight deck; src/deck.ts): the same three panels in the same order and corners on every flight,
// every key shown a button that does what the key does, nothing in the control block hidden, overlapping or (on touch)
// under 24 px, the panels tucking and H clearing them, Space walking the flight's own sequence, and Vostok 1 taken over in
// the ascent with real keys: turned by W and staged by Space.
//   pnpm dev, then: node tools/deck-test.mjs [url]
import { chromium } from 'playwright-core';

const url = process.argv[2] ?? process.env.SR_URL ?? 'http://localhost:5180/';
const FLIGHTS = { 'usa/mercury/mr-3-freedom-7': ['Ignition', 'Engine cutoff'], 'ussr/vostok/vostok-1': ['Ignition', 'Drop the strap-ons'] };
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
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });

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
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: w < 600 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${url}#${id}/fly`);
    await page.waitForFunction(() => window.sr && document.querySelector('.loading.done') && window.sr.cockpit.active, null, {
      timeout: 120000,
    });
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
  // the descent by hand (orbitdeck.ts `descent:` commands): offered when the simulator would hear it, B its sequencer, Space its steps
  {
    const where = `vostok-1's descent at ${w}`;
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: touch, isMobile: w < 600 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`${url}#ussr/vostok/vostok-1/fly`);
    await page.waitForFunction(() => window.sr && document.querySelector('.loading.done') && window.sr.cockpit.active, null, {
      timeout: 120000,
    });
    const can = () =>
      page.evaluate(() =>
        Object.fromEntries(['descent:modules', 'descent:ejection', 'descent:pilot/main canopy'].map((a) => [a, window.sr.cockpit.can(a)])),
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
    if (!c['descent:modules'] || c['descent:ejection']) fail(where, `before the burn: ${JSON.stringify(c)}`);
    await seek(4800); // (the burn made)
    c = await can();
    if (!c['descent:ejection'] || c['descent:pilot/main canopy']) fail(where, `after the burn: ${JSON.stringify(c)}`);
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
    if (c['descent:ejection'] || !c['descent:pilot/main canopy']) fail(where, `after the ejection: ${JSON.stringify(c)}`);
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
