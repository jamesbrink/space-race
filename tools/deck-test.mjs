// The flight deck's promises, checked in the running page for every flight that can be flown, at a desk, a tablet and a
// phone (AGENTS.md: the flight deck; src/deck/deck.ts): the same three panels in the same order and corners on every flight,
// every key shown a button that does what the key does, nothing in the control block hidden, overlapping or (on touch)
// under 24 px, the panels tucking and H clearing them, Space walking the flight's own sequence, Vostok 1 taken over in
// the ascent with real keys: turned by W and staged by Space, and the throttle on a ballistic flight and one into orbit.
//   pnpm dev, then: node tools/deck-test.mjs [url]   (SR_ONLY=staging|leaving|touch|apollo-escape|apollo-escape-replay|throttle|by-hand for one section; SR_FLIGHTS=gatv-5003,atda for some flights)
import { launch, open, url as urlOf } from './browser.mjs';

const url = urlOf(process.argv.slice(2));
const FLIGHTS = {
  'usa/apollo/apollo-7': ['Ignition', 'Inboard H-1 engines cut off'],
  'usa/apollo/apollo-11': ['Ignition', 'S-IC centre engine cutoff'],
  'usa/mercury/mr-3-freedom-7': ['Ignition', 'Engine cutoff'],
  'usa/mercury/mr-4-liberty-bell-7': ['Ignition', 'Engine cutoff'],
  'usa/mercury/ma-6-friendship-7': ['Ignition', 'Booster engine cutoff'],
  'usa/mercury/ma-7-aurora-7': ['Ignition', 'Booster engine cutoff'],
  'usa/mercury/ma-8-sigma-7': ['Ignition', 'Booster engine cutoff'],
  'usa/mercury/ma-9-faith-7': ['Ignition', 'Booster engine cutoff'],
  'ussr/vostok/vostok-1': ['Ignition', 'Drop the strap-ons'],
  'ussr/vostok/vostok-2': ['Ignition', 'Drop the strap-ons'],
  'ussr/vostok/vostok-3': ['Ignition', 'Drop the strap-ons'],
  'ussr/vostok/vostok-5': ['Ignition', 'Drop the strap-ons'],
  'ussr/vostok/vostok-6': ['Ignition', 'Drop the strap-ons'],
  'ussr/vostok/vostok-4': ['Ignition', 'Drop the strap-ons'],
  'ussr/voskhod/voskhod-1': ['Ignition', 'Drop the strap-ons'],
  'usa/gemini/gt-3': ['Ignition', 'Staging: the second stage lit through the interstage'],
  'usa/gemini/gt-4': ['Ignition', 'Staging: the second stage lit through the interstage'],
  'usa/gemini/gt-5': ['Ignition', 'Staging: the second stage lit through the interstage'],
  // (their second stage lit from its chamber's rise, after the first stage's cutoff: gemini-titan-plan.ts, their records)
  'usa/gemini/gt-7': ['Ignition', 'First stage cutoff'],
  'usa/gemini/gt-6a': ['Ignition', 'First stage cutoff'],
  'ussr/voskhod/voskhod-2': ['Ignition', 'Drop the strap-ons'],
  'ussr/soyuz/soyuz-3': ['Ignition', 'Drop the strap-ons'],
  ...Object.fromEntries(
    ['gatv-5002', 'gatv-5003', 'gatv-5004', 'atda', 'gatv-5005', 'gatv-5006', 'gatv-5001'].map((id) => [
      `usa/gemini/${id}`,
      ['Ignition', 'Booster engine cutoff'],
    ]),
  ),
};
const SIZES = [
  [1280, 800, false],
  [820, 1180, true],
  [390, 844, true],
];
/** The deck's own keys and the command each is (deck.ts `key`). */
const COMMANDS = { Space: ['next', 'resume'], G: 'guidance', B: 'sequence', N: 'again', Esc: 'leave', X: 'abort' };
const isCommand = (key, command) => [COMMANDS[key]].flat().includes(command);
let failed = 0;
const fail = (where, what) => {
  failed++;
  console.log(`  FAIL ${where}: ${what}`);
};
const browser = await launch();
/** Throw both switches on, on the pad: the flight as flown (the deck is taken by hand: deck.ts `START`). */
const asFlown = (page) =>
  page.evaluate(() => {
    for (const which of ['guidance', 'sequence']) {
      const b = document.querySelector(`#ui > .cockpit [data-do=${which}]`);
      if (b?.getAttribute('aria-pressed') === 'false') b.click();
    }
  });
/**
 * The deck's page of `id` at this size, flown: a page of its own, which counts only what it throws. It is taken by hand;
 * unless `byHand`, both switches are thrown on as it opens, for the sections that watch it as flown and take it over.
 */
const fly = async (id, w, h, touch, console = [], byHand = false) => {
  const opened = await open(browser, `${url}#${id}/fly`, {
    context: { viewport: { width: w, height: h }, hasTouch: touch, isMobile: w < 600 },
    console,
    wait: () => window.sr && document.querySelector('.loading.done') && window.sr.cockpit.active,
    timeout: 120000,
  });
  if (!byHand) await asFlown(opened.page);
  return opened;
};

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

// (SR_ONLY=staging: of the sections at each size, staging by hand alone)
const staging = process.env.SR_ONLY === 'staging';
for (const [w, h, touch] of process.env.SR_ONLY && !staging ? [] : SIZES) {
  const seen = {};
  for (const [id, steps] of staging ? [] : Object.entries(FLIGHTS)) {
    // (SR_FLIGHTS=a,b: only the flights whose ids hold one of these)
    if (process.env.SR_FLIGHTS && !process.env.SR_FLIGHTS.split(',').some((part) => id.includes(part))) continue;
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
      else if (k.do && COMMANDS[k.key] && !isCommand(k.key, k.do)) fail(where, `${k.key} is ${COMMANDS[k.key]} but its button is ${k.do}`);
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
    const labelFits = await page.locator('.cockpit-next [data-cell=next]').evaluate((el) => {
      const button = el.parentElement.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(el);
      return [...range.getClientRects()].every((line) => line.left >= button.left && line.right <= button.right);
    });
    if (!labelFits) fail(where, `the next action's label extends beyond its button: "${await label()}"`);
    if (id.startsWith('ussr') && w === 1280) {
      // taken over in the ascent with real keys: G takes it, W held turns it (the attitude held), B and Space drop the strap-ons
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
      // (with Hold, on by default, W turns the attitude held at 3 degrees a second and the steering follows it: deck.ts `HOLD_TURN`)
      if (!(turned.rate > 0.01)) fail(where, `W did not turn it: pitch rate ${turned.rate}`);
      if (!(turned.pitch <= before.pitch - 2)) fail(where, `W did not pitch it over: ${before.pitch} to ${turned.pitch}`);
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
    for (const id of Object.keys(FLIGHTS).filter(
      (f) =>
        (f.startsWith('ussr/') || f.startsWith('usa/gemini/gt-')) &&
        (!process.env.SR_FLIGHTS || process.env.SR_FLIGHTS.split(',').some((part) => f.includes(part))),
    )) {
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
        published: window.sr.flight.plan.record.orbit.apogee.value / 1000,
      }));
      // (as flown, in orbit it is the published orbit begun where the ascent left the ship, and says so)
      if (/Not the record/.test(up.mode)) fail(where, `in orbit the deck says "${up.mode}": taken over`);
      // (within some tens of kilometres of the published apogee: the deck's is over the sea, the record's over its own ball)
      if (!(Math.abs(up.apogee - up.published) < 40))
        fail(where, `in orbit the deck's apogee is ${up.apogee} km, where the published orbit's is ${up.published} km`);
      await seek(1e7);
      const down = await page.evaluate(() => ({
        mode: document.querySelector('[data-cell=mode]').textContent,
        ball: document.querySelector('.navball [data-cell=speed]').textContent,
        deck: document.querySelector('.deck-main [data-cell=speed]')?.textContent ?? '0',
      }));
      if (/Not the record/.test(down.mode) || down.ball !== '0' || down.deck !== '0')
        fail(where, `at the run's end: "${down.mode}", the navball ${down.ball} m/s, the deck ${down.deck}`);
      if (errors.length) fail(where, errors.slice(0, 2).join(' | '));
      console.log(`  ${where}: in orbit at T+1800 with an apogee of ${up.apogee} km, down at the end, "${down.mode}"`);
      await ctx.close();
    }
  // a spacecraft whose hand controls had no lock (a Mercury capsule's): in orbit Space is the retrofire by hand before the pack,
  // the next thing its pilot could do in the record's order; after the record's retrofire, the pack's jettison
  if (w === 1280)
    for (const id of Object.keys(FLIGHTS).filter((f) => f.startsWith('usa/mercury/ma-'))) {
      const where = `${id}'s Space in orbit at ${w}`;
      const { page, errors, context: ctx } = await fly(id, w, h, touch);
      const seek = async (t) => {
        await page.evaluate((x) => window.sr.clock.seek(x), t);
        await page.waitForTimeout(400);
      };
      const read = () =>
        page.evaluate(() => ({
          next: document.querySelector('[data-cell=next]').textContent,
          mode: document.querySelector('[data-cell=mode]').textContent,
          prompt: document.querySelector('[data-cell=prompt]').textContent,
        }));
      const fired = await page.evaluate(() => window.sr.flight.plan.events.find((e) => e.id === 'retrofire')?.at?.value ?? 0);
      await seek(3000);
      const before = await read();
      if (before.next !== 'Fire the retrorockets') fail(where, `before the retrofire Space is "${before.next}"`);
      await seek(fired + 30);
      const after = await read();
      if (after.next !== 'Jettison the retropack') fail(where, `after the record's retrofire Space is "${after.next}"`);
      await seek(3000);
      await page.keyboard.press('Space');
      await page.waitForTimeout(1500);
      const hand = await read();
      if (!/Manual descent/.test(hand.mode) || hand.next !== 'Jettison the retropack')
        fail(where, `Space fired nothing by hand: ${JSON.stringify(hand)}`);
      if (errors.length) fail(where, errors.slice(0, 2).join(' | '));
      console.log(`  ${where}: "${before.next}" before the retrofire, "${after.next}" after; Space fired them by hand ("${hand.mode}")`);
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
    // the Skin switch says whether the skin is on, whoever took it off: the key here, then the switch itself
    const skin = () =>
      page.evaluate(() => [document.querySelector('[data-skin]').getAttribute('aria-pressed'), String(!window.sr.stage.cutaway)]);
    const before = await skin();
    await page.keyboard.press('KeyY');
    await page.waitForTimeout(300);
    const taken = await skin();
    await page.evaluate(() => document.querySelector('[data-skin]').click());
    await page.waitForTimeout(300);
    const back = await skin();
    if (before.join() !== 'true,true' || taken.join() !== 'false,false' || back.join() !== 'true,true')
      fail(where, `the Skin switch does not show the skin (lamp, skin on): ${before} at first, ${taken} after Y, ${back} after the switch`);
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
      // (a flight flown by hand is asked about before it is left, and stays until it is: answer Leave, as someone going on
      // to another flight would; until November 2026 this went unanswered and the next flight's cases were asked of the last)
      const asked = await page
        .waitForSelector('.deck-ask [role=alertdialog]', { timeout: 3000 })
        .then(() => true)
        .catch(() => false);
      if (asked) await page.click('.deck-ask [data-ask=leave]');
      await page.waitForFunction(
        (id) => window.sr && window.sr.flight?.id === id && document.querySelector('.loading.done') && window.sr.cockpit.active,
        id,
        { timeout: 120000 },
      );
      await asFlown(page);
      await page.waitForTimeout(500);
    };
    // the clock run on to `t` a few seconds a frame, as the deck flies it (it steps no more than five seconds a frame)
    const run = async (t) => {
      // Drive these timed commands by simulated time. A busy renderer must not move the clock
      // past a scheduled ignition while the harness waits for the last frame to draw.
      await page.evaluate(() => window.sr.clock.pause());
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
    /**
     * N, a new flight: with a run flown by hand going on it is asked first (deck/leaving.ts, 'again'), and answered Start over
     * (N), as a visitor starting the next case would. Then, both switches thrown on (it stands on the pad by hand), it is the
     * flight as flown: the clock at nought, nothing flown, guidance and the sequencer on.
     */
    const again = async (what) => {
      await page.keyboard.press('KeyN');
      await page.waitForTimeout(300);
      if (await page.$('.deck-ask [role=alertdialog]')) await page.keyboard.press('KeyN');
      await page.waitForTimeout(500);
      // (N stands it on the pad by hand, deck.ts `START`: both switches thrown on again for the next case, as flown)
      await asFlown(page);
      await page.waitForTimeout(200);
      const on = await page.evaluate(() => ({
        t: window.sr.clock.t,
        asking: Boolean(document.querySelector('.deck-ask [role=alertdialog]')),
        state: window.sr.cockpit.state ? { t: window.sr.cockpit.state.t, held: window.sr.cockpit.state.held } : null,
        steering: window.sr.cockpit.steering,
        mode: document.querySelector('[data-cell=mode]')?.textContent ?? '',
      }));
      if (
        on.asking ||
        on.t > 0 ||
        (on.state && on.state.t > 0) ||
        !on.steering.guidance ||
        !on.steering.sequence ||
        /Not the record|Hands only|leaned|Manual|by hand/.test(on.mode)
      )
        fail(where, `${what}: N did not stand the flight on the pad as flown: ${JSON.stringify(on)}`);
    };
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
    // a minute early: the one command lights the third stage and cuts and lets go the core with it, as the hardware's did
    await again('a minute early');
    await page.keyboard.press('Space');
    await run(240);
    await ask('step:ignite:2');
    await run(250);
    r = await read();
    if (r.card || r.core !== 'Gone' || !/as the hardware/.test(r.notes))
      fail(
        where,
        `lit a minute early, the core not let go with it: core "${r.core}", card "${r.card.slice(0, 120)}", notes "${r.notes.slice(0, 120)}"`,
      );
    await shot('hot-early');
    console.log(`  ${where}: lit at 240 s: the core ${r.core}, no card`);
    // lit with the strap-ons on, at four times: the core is let go but pressed on and its top burns; the prompt says how
    // long it has, and Space is not held back by its guard (a second's press in real time is four in flight)
    await again('lit with the strap-ons on');
    await page.keyboard.press('Space');
    await run(100);
    await ask('step:ignite:2');
    await page.evaluate(() => window.sr.clock.setRate(4));
    await run(100.5);
    r = await read();
    if (!/is due now · [\d.]+ s before the core’s top gives/.test(r.prompt))
      fail(where, `lit with the strap-ons on, the prompt does not say what is due: "${r.prompt}"`);
    await shot('hot-strap-ons-due');
    await page.keyboard.press('Space');
    await run(106);
    r = await read();
    const strapOns = await page.evaluate(() => {
      const c = window.sr.cockpit;
      const run = c.run.sheds?.get('stage:0/B');
      return { gone: c.state.stages[0].gone, mass: run?.shedder.release.mass ?? null, record: run?.shedder.def.mass.value ?? null };
    });
    if (r.card || r.core !== 'Gone' || !(strapOns.gone < 101.5))
      fail(
        where,
        `lit with the strap-ons on, Space at 4x did not drop them in time: ${JSON.stringify(strapOns)}, card "${r.card.slice(0, 120)}"`,
      );
    if (!(strapOns.mass > strapOns.record + 5000))
      fail(where, `the strap-ons dropped at 100 s leave at the record's leftover mass: ${JSON.stringify(strapOns)}`);
    if (/Spacecraft contact|Impact breakup/.test(r.notes))
      fail(where, `the strap-ons striking each other is said to be the spacecraft's: "${r.notes.slice(0, 200)}"`);
    console.log(
      `  ${where}: lit at 100 s with the strap-ons on, Space at 4x dropped them at ${strapOns.gone.toFixed(2)} s (${strapOns.mass.toFixed(0)} kg each); notes "${r.notes.slice(0, 120)}"`,
    );
    await page.evaluate(() => window.sr.clock.setRate(1));
    // the fairing at max q, the core early
    await again('the fairing at max q');
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
    // the escape's modes (PlanRecord.aborts, X twice): to 40 s the pilot ejected at once and comes down on his own while the
    // stack flies on; from 40 s every engine cut and the seat waits for 7 km, the stack breaking up first; from 150 s the
    // descent module parts and comes down as from orbit
    const abort = async () => {
      await page.keyboard.press('KeyX');
      await page.waitForTimeout(100);
      await page.keyboard.press('KeyX');
      await page.waitForTimeout(300);
    };
    await again('aborted at 20 s');
    await page.keyboard.press('Space');
    await run(20);
    await abort();
    r = await read();
    if (!/Ejected/.test(r.notes)) fail(where, `aborted at 20 s, no ejection said: "${r.notes}"`);
    await shot('abort-seat');
    await run(720);
    r = await read();
    if (!/Ejected from the launch vehicle/.test(r.card) || !/by the limits taken/.test(r.card))
      fail(where, `aborted at 20 s, no card of the ejection: "${r.card.slice(0, 160)}"`);
    else console.log(`  ${where}: aborted at 20 s: "${r.card.slice(0, 160)}…"`);
    await again('aborted at 60 s');
    await page.keyboard.press('Space');
    await run(60);
    await abort();
    await run(130);
    r = await read();
    if (!/Broke up on the launch vehicle/.test(r.card) || !/where the seat was to take the pilot out/.test(r.card))
      fail(where, `aborted at 60 s, no card of the breakup before 7 km: "${r.card.slice(0, 160)}"`);
    else console.log(`  ${where}: aborted at 60 s: "${r.card.slice(0, 160)}…"`);
    await again('aborted at 200 s');
    await page.keyboard.press('Space');
    await run(200);
    await abort();
    await run(206);
    r = await read();
    if (!/descent module separated/.test(r.notes)) fail(where, `aborted at 200 s, the modules not parted: "${r.notes}"`);
    else console.log(`  ${where}: aborted at 200 s, the descent module separated`);
    // Gemini 3's staging signal by hand half a minute early: the one command lights the second stage, cuts the first and
    // lets it go; and the first stage let go burning by hand is cut by its letting go and parts at once
    await goTo('usa/gemini/gt-3');
    await page.keyboard.press('Space');
    await run(120);
    await ask('step:ignite:1');
    await run(123);
    r = await read();
    const first = await page.evaluate(() => window.sr.cockpit.state.stages[0]);
    if (r.card || !(first.gone < 121) || !(first.to <= first.gone))
      fail(where, `Gemini 3 staged by hand at 120 s: ${JSON.stringify(first)}, card "${r.card.slice(0, 120)}"`);
    else
      console.log(
        `  ${where}: Gemini 3 staged by hand at 120 s: the first stage cut at ${first.to.toFixed(2)} s and gone at ${first.gone.toFixed(2)} s`,
      );
    await again('Gemini 3’s first stage let go burning');
    await page.keyboard.press('Space');
    await run(100);
    await ask('step:separate:0');
    await run(101);
    r = await read();
    const loose = await page.evaluate(() => window.sr.cockpit.state.stages[0]);
    if (/still pushing/.test(r.notes) || !(loose.gone < 100.5))
      fail(where, `Gemini 3's first stage let go burning at 100 s: ${JSON.stringify(loose)}, notes "${r.notes}"`);
    else console.log(`  ${where}: Gemini 3's first stage let go burning at 100 s parted at once`);
    // Gemini 3's record gives no mode of escape: the abort is not offered, and X says why (its seats are not in its data)
    await again('Gemini 3 abort');
    await page.keyboard.press('Space');
    await run(30);
    const offered = await page.evaluate(() => !document.querySelector('[data-do=abort]')?.disabled);
    await abort();
    r = await read();
    if (offered || !/no mode of escape/.test(r.notes)) fail(where, `Gemini 3 at 30 s: the abort offered ${offered}, notes "${r.notes}"`);
    else console.log(`  ${where}: Gemini 3 at 30 s: no abort offered, and said so`);
    // an upper stage lit by hand into the closed interstage over the stage below (no hot staging): the Saturn V's S-II on
    // the S-IC and the Saturn IB's S-IVB on the S-IB. The hand may do it; the jet is shut in and the stack breaks up, and
    // the deck says why and what the record's sequence did
    for (const [id, stage, what] of [
      ['usa/apollo/apollo-11', 3, 'Apollo 11’s S-II'],
      ['usa/apollo/apollo-7', 2, 'Apollo 7’s S-IVB'],
    ]) {
      await goTo(id);
      await page.keyboard.press('Space');
      await run(100);
      await ask(`step:ignite:${stage}`);
      await run(102);
      r = await read();
      const broke = await page.evaluate(() => window.sr.cockpit.state.broke);
      if (broke?.by !== 'closed' || !/closed interstage/.test(r.card) || !/not vented/.test(r.card) || !/no interlock/.test(r.card))
        fail(
          where,
          `${what} lit at 100 s on the stage below: broke ${JSON.stringify(broke?.by)}, card "${r.card.slice(0, 160)}", notes "${r.notes.slice(0, 200)}"`,
        );
      else
        console.log(
          `  ${where}: ${what} lit at 100 s into the closed interstage broke up at T+${broke.t.toFixed(2)} s: "${r.card.slice(0, 120)}…"`,
        );
    }
    // Apollo 11's escape tower let go on the record's sequence and by hand: nothing strikes it (its jettison motor pulls it
    // clear of the stack under the S-II's thrust; tests/separation.test.mjs has it struck without the motor)
    await goTo('usa/apollo/apollo-11');
    await page.keyboard.press('Space');
    await run(203);
    r = await read();
    const towerAsFlown = r.notes;
    await again('Apollo 11’s tower by hand');
    await page.keyboard.press('Space');
    await run(185);
    await ask('step:drop:les-jettison');
    await run(190);
    r = await read();
    const towerGone = await page.evaluate(() => Number.isFinite(window.sr.cockpit.state.craft.joints['les-jettison']?.loose ?? Number.NaN));
    if (/struck at/.test(towerAsFlown) || /struck at/.test(r.notes) || !towerGone)
      fail(where, `Apollo 11's tower: as flown "${towerAsFlown.slice(0, 160)}", by hand (let go ${towerGone}) "${r.notes.slice(0, 160)}"`);
    else console.log(`  ${where}: Apollo 11's tower let go as flown and by hand at 185 s, struck by nothing`);
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
    // Freedom 7: the tower let go on the pad, unlit: it goes on its rockets, the clock runs, and the stack stands to be lit
    await again("Freedom 7's tower on the pad");
    const padTower = await page.evaluate(() => window.sr.cockpit.can('tower'));
    if (!padTower) fail(where, 'Freedom 7: the tower is not offered on the pad');
    await ask('tower');
    await page.waitForTimeout(1500);
    const pad = await page.evaluate(() => ({
      towerAt: window.sr.cockpit.state?.towerAt ?? null,
      held: window.sr.cockpit.state?.held,
      t: window.sr.cockpit.state?.t ?? 0,
    }));
    if (pad.towerAt === null || !pad.held || !(pad.t > 0.5)) fail(where, `Freedom 7: the tower on the pad: ${JSON.stringify(pad)}`);
    console.log(`  ${where}: Freedom 7's tower let go on the pad, the stack standing at T+${pad.t.toFixed(1)} s`);
    // Freedom 7: retrofire with the spacecraft still on its booster, after the cutoff: fired, and said
    await again("Freedom 7's retrofire on the booster");
    await page.keyboard.press('Space');
    await run(145);
    await ask('retro');
    await run(146);
    r = await read();
    if (!/Retrofire on the booster/.test(r.notes)) fail(where, `Freedom 7's retrofire on the booster said nothing: "${r.notes}"`);
    console.log(`  ${where}: Freedom 7's retrofire on the booster said so`);
    // Liberty Bell 7: the hatch blown in flight, and down in the sea the capsule fills and goes under
    await goTo('usa/mercury/mr-4-liberty-bell-7');
    await page.keyboard.press('Space');
    await run(200);
    await ask('hatch');
    let down = null;
    for (let i = 0; i < 20 && !down; i++) {
      await run(400 + 100 * i);
      down = await page.evaluate(() => window.sr.cockpit.state?.landing?.t ?? null);
    }
    await run((down ?? 0) + 2);
    // (afloat with its sill open from the landing it floods and goes under as sim/afloat.ts has it; the hatch flew as a body of its own)
    const sank = await page.evaluate(() => {
      const run = window.sr.cockpit.run;
      return run?.afloat ? { from: run.afloat.from, under: run.afloat.under, hatch: run.loose?.some((l) => l) ?? false } : null;
    });
    r = await read();
    if (
      !down ||
      !sank ||
      Math.abs(sank.from - down) > 1e-6 ||
      !Number.isFinite(sank.under) ||
      !sank.hatch ||
      !/filled and sank, its hatch gone/.test(r.card) // (Liberty Bell 7's own words: its lands `sank`)
    )
      fail(where, `Liberty Bell 7's hatch blown in flight: down ${down}, afloat ${JSON.stringify(sank)}, card "${r.card.slice(0, 80)}"`);
    else
      console.log(
        `  ${where}: Liberty Bell 7's hatch blown at 200 s: down at T+${down.toFixed(0)} s, under ${(sank.under - down).toFixed(0)} s later`,
      );
    if (errors.length) fail(where, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }
  if (staging) continue;
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
// Leaving a flight (src/deck/leaving.ts, tape.ts, ask.ts, app/runs.ts, app/stake.ts): watched as flown, it asks nothing and
// nothing is kept. Flown by hand, every way out keeps it and asks nothing: within the flight (the deck's Leave, Esc, the
// Gallery and Launch site tabs, the flight's crumb) it is parked in the page, beyond it (the Space Race crumb, another
// flight's address) and through a reload it is kept in the browser's storage, and Fly offers it again, to the digit, Resume
// or Start over. What throws a run away asks first (N with it going on, the mark beside Fly); where the browser will not
// keep it a way out asks, as it always did; a run kept by another simulator or of changed data is said not to be
// resumable and let go. The browser's own question is set only while a hand-flown flight would be lost, and the page uses
// no alert, confirm or prompt of its own.
if (!process.env.SR_ONLY || process.env.SR_ONLY === 'leaving') {
  const HAND = ['ussr/vostok/vostok-1', 'usa/mercury/mr-3-freedom-7'];
  const read = (page) =>
    page.evaluate(() => ({
      t: window.sr.clock.t,
      running: window.sr.clock.running,
      cells: Object.fromEntries(
        [...document.querySelectorAll('#ui > .cockpit [data-cell]')]
          .filter((c) => c.dataset.cell !== 'kept-at')
          .map((c) => [c.dataset.cell, c.textContent]),
      ),
      mode: document.querySelector('[data-cell=mode]')?.textContent ?? '',
      active: window.sr.cockpit.active,
      keeping: window.sr.cockpit.keeping,
      warns: (() => {
        const e = new Event('beforeunload', { cancelable: true });
        window.dispatchEvent(e);
        return e.defaultPrevented;
      })(),
      hash: decodeURIComponent(location.hash),
      length: history.length,
      asking: Boolean(document.querySelector('.deck-ask [role=alertdialog]')),
      question: document.querySelector('.deck-ask [role=alertdialog]')?.textContent ?? '',
      focus: document.activeElement?.dataset?.ask ?? document.activeElement?.dataset?.do ?? '',
      card: Boolean(document.querySelector('.cockpit-kept:not([hidden])')),
      said: document.querySelector('.cockpit-kept:not([hidden])')?.textContent.replace(/\s+/g, ' ') ?? '',
      ready:
        !document.querySelector('.cockpit-kept [data-do=resume]')?.disabled &&
        !document.querySelector('.cockpit-kept [data-do=resume]')?.hidden,
      stored: (() => {
        try {
          return Object.keys(JSON.parse(localStorage.getItem('space-race.runs') ?? '{}'));
        } catch {
          return null;
        }
      })(),
    }));
  const same = (where, a, b, what) => {
    const keys = [...new Set([...Object.keys(a.cells), ...Object.keys(b.cells)])].filter((k) => a.cells[k] !== b.cells[k]);
    if (a.t !== b.t || keys.length)
      fail(
        where,
        `${what}: not the same flight: t ${a.t} to ${b.t}; ${keys.map((k) => `${k} "${a.cells[k]}" to "${b.cells[k]}"`).join(', ')}`,
      );
  };
  const handFly = async (page, id) => {
    await page.keyboard.press('Space');
    if (id.startsWith('ussr')) {
      for (let i = 0; i < 100 && (await page.evaluate(() => window.sr.clock.t)) < 50; i++) {
        await page.evaluate(() => window.sr.clock.seek(Math.min(50, window.sr.clock.t + 4)));
        await page.waitForTimeout(50);
      }
      await page.keyboard.press('KeyG');
    } else await page.waitForTimeout(1200);
    await page.keyboard.down('KeyW');
    await page.waitForTimeout(700);
    await page.keyboard.up('KeyW');
    await page.waitForTimeout(300);
  };
  const stop = async (page) => {
    await page.evaluate(() => window.sr.clock.pause());
    await page.waitForTimeout(300);
  };
  const toFly = async (page) => {
    // (from the gallery its own Resume where a flight is kept, or else the launch site's way and then Launch: the site's
    // own ways stand under the gallery meanwhile)
    const resume = page.locator('#gallery .ways [data-way=fly]:visible');
    if ((await page.locator('#gallery').isVisible()) && (await resume.count())) {
      await resume.first().click();
      await page.waitForFunction(() => window.sr.cockpit.active, null, { timeout: 60000 });
      await page.waitForTimeout(800);
      return;
    }
    if (await page.locator('#gallery').isVisible()) {
      await page.locator('#gallery .ways [data-way=site]:visible').first().click();
      await page.waitForFunction(() => document.querySelector('#gallery')?.hidden !== false);
    }
    await page.locator('#ui .ways [data-way=fly]:visible').first().click();
    await page.waitForFunction(() => window.sr.cockpit.active, null, { timeout: 60000 });
    await page.waitForTimeout(800);
  };
  /** Fly taken up from the browser's storage: the card up, and the run flown again to where it was left (Resume ready, or refused). */
  const takenUp = (page) =>
    page.waitForFunction(
      () => {
        const card = document.querySelector('.cockpit-kept:not([hidden])');
        const resume = card?.querySelector('[data-do=resume]');
        return window.sr?.cockpit?.active && card && (resume.hidden || !resume.disabled);
      },
      null,
      { timeout: 120000 },
    );
  const dialogs = [];
  const trap = (page) =>
    page.on('dialog', (d) => {
      dialogs.push(d.type());
      void d.dismiss();
    });
  for (const id of HAND) {
    const w = 1280;
    const h = 800;
    const where = `${id} leaving`;
    // watched as flown: nothing at stake, nothing asked, nothing kept, no browser question
    {
      const { page, errors, context: ctx } = await fly(id, w, h, false);
      trap(page);
      await page.keyboard.press('Space');
      await page.waitForTimeout(1500);
      let r = await read(page);
      if (r.warns) fail(where, 'the browser is set to ask while the flight is only watched as flown');
      await page.keyboard.press('Escape'); // (Leave: on a wide page the ways are the way out, and the deck's foot has the time's keys)
      await page.waitForTimeout(500);
      r = await read(page);
      if (r.active || r.keeping || r.asking || r.stored?.length)
        fail(where, `watched as flown, leaving: active ${r.active}, kept ${r.keeping}, asking ${r.asking}, stored ${r.stored}`);
      if (await page.$('.kept-mark')) fail(where, 'a flight only watched is marked as kept');
      if (errors.length) fail(where, errors.slice(0, 2).join(' | '));
      await ctx.close();
    }
    // flown by hand, each way out within the flight keeps it, and Fly resumes it to the digit
    const within = [
      [
        "the deck's Leave, in its list",
        async (page) => {
          await page.click('#ui > .cockpit [data-do=keys]');
          await page.click('#ui > .cockpit .cockpit-keys [data-do=leave]');
        },
      ],
      ['Esc', (page) => page.keyboard.press('Escape')],
      ['the Gallery tab', (page) => page.click('#ui .ways [data-way=gallery]:visible')],
      ['the Launch site tab', (page) => page.click('#ui .ways [data-way=site]:visible')],
      ['the flight crumb', (page) => page.evaluate(() => document.querySelector('#ui [data-flight-home]').click())],
    ];
    for (const [name, out] of within) {
      const at = `${where} by ${name}`;
      const { page, errors, context: ctx } = await fly(id, w, h, false);
      trap(page);
      await handFly(page, id);
      await stop(page);
      const before = await read(page);
      if (!/Not the record|Hands only|leaned/.test(before.mode)) fail(at, `not taken over: "${before.mode}"`);
      if (before.warns) fail(at, 'the browser asks before the page goes, though the flight would be kept');
      await out(page);
      await page.waitForTimeout(1200);
      let r = await read(page);
      if (r.asking) fail(at, 'asked, though the flight is kept');
      if (r.active || !r.keeping) fail(at, `not kept: active ${r.active}, kept ${r.keeping}`);
      if (!r.stored?.includes(id)) fail(at, `not kept in the browser's storage: ${r.stored}`);
      if (r.warns) fail(at, 'the browser asks before the page goes, though the flight is kept');
      if (!(await page.$('.ways .kept-mark'))) fail(at, 'the Fly tab does not say a flight is kept');
      const note = await page.evaluate(() => document.querySelector('.notes')?.textContent ?? '');
      if (!/kept/i.test(note)) fail(at, `no note that it is kept: "${note}"`);
      const here = r.hash;
      // back to Fly: the card, the clock stopped where it was, and the figures to the digit
      await toFly(page);
      r = await read(page);
      if (!r.card || !r.ready) fail(at, 'resumed with no card saying it is kept, or no Resume');
      if (r.focus !== 'resume') fail(at, `the card's focus is "${r.focus}", not Resume`);
      if (r.running) fail(at, 'the clock runs before the visitor has chosen');
      same(at, before, r, 'resumed');
      // a hand to the stick under the card does nothing
      await page.keyboard.down('KeyW');
      await page.waitForTimeout(400);
      await page.keyboard.up('KeyW');
      r = await read(page);
      same(at, before, r, 'a steering key under the card');
      await page.click('.cockpit-kept [data-do=resume]');
      await page.waitForTimeout(300);
      r = await read(page);
      if (r.card) fail(at, 'the card is still there after Resume');
      console.log(`  ${at}: kept at T${before.t.toFixed(1)} (${here}), resumed to the digit`);
      if (errors.length) fail(at, errors.slice(0, 2).join(' | '));
      await ctx.close();
    }
    // what throws a run away asks first: N with it going on, and the mark beside Fly; Start over on the card does not (it is the question)
    {
      const at = `${where} thrown away`;
      const { page, errors, context: ctx } = await fly(id, w, h, false);
      trap(page);
      await handFly(page, id);
      await stop(page);
      const before = await read(page);
      await page.keyboard.press('KeyN');
      await page.waitForTimeout(400);
      let r = await read(page);
      if (!r.asking || !/Start over\?/.test(r.question) || r.focus !== 'stay')
        fail(at, `N flying by hand: "${r.question}", focus ${r.focus}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(400);
      r = await read(page);
      if (r.asking) fail(at, 'Keep flying: the question is still up');
      same(at, before, r, 'N, then Keep flying');
      await page.keyboard.press('KeyN');
      await page.waitForTimeout(400);
      await page.keyboard.press('KeyN');
      await page.waitForTimeout(600);
      r = await read(page);
      // (a new flight stands by hand, deck.ts `START`: its mode line is no sign of the old run)
      if (r.asking || r.t > 1 || r.stored?.includes(id))
        fail(at, `N, then Start over: asking ${r.asking}, t ${r.t}, "${r.mode}", stored ${r.stored}`);
      // the mark beside Fly asks, and throws it away
      await handFly(page, id);
      await stop(page);
      // (at the launch site: on a wide page the gallery's ways lead on only to the site, and its Fly and mark are the site's)
      await page.click('#ui .ways [data-way=site]:visible');
      await page.locator('.kept-mark:visible').first().waitFor();
      await page.waitForTimeout(800);
      await page.locator('.kept-mark:visible').first().click();
      await page.waitForTimeout(300);
      r = await read(page);
      if (!r.asking || !/Throw your flight away\?/.test(r.question)) fail(at, `the mark: "${r.question}"`);
      await page.keyboard.press('KeyN');
      await page.waitForTimeout(400);
      r = await read(page);
      if (r.keeping || r.warns || r.stored?.includes(id) || (await page.$('.kept-mark')))
        fail(at, `the mark did not throw it away: kept ${r.keeping}, stored ${r.stored}`);
      await toFly(page);
      r = await read(page);
      if (r.card || r.t > 1) fail(at, `thrown away, it left something to resume: card ${r.card}, t ${r.t}`);
      // Start over on the card
      await handFly(page, id);
      await stop(page);
      await page.click('#ui .ways [data-way=site]:visible');
      await page.waitForTimeout(800);
      await toFly(page);
      await page.click('.cockpit-kept [data-do=again]');
      await page.waitForTimeout(500);
      r = await read(page);
      if (r.asking || r.card || r.t > 1 || r.stored?.includes(id))
        fail(at, `Start over: asking ${r.asking}, card ${r.card}, t ${r.t}, "${r.mode}", stored ${r.stored}`);
      if (r.warns) fail(at, 'after Start over, nothing is flown by hand and the browser still asks');
      console.log(
        `  ${at}: N asked (Keep flying kept it, Start over began again); the mark asked and threw it away; Start over on the card`,
      );
      if (errors.length) fail(at, errors.slice(0, 2).join(' | '));
      await ctx.close();
    }
    // beyond the flight: the Space Race crumb, another flight's address and a reload keep it in the browser, and ask nothing;
    // Fly offers it again, to the digit, and Resume flies on
    const other = id === 'usa/mercury/mr-3-freedom-7' ? 'ussr/vostok/vostok-2' : 'usa/mercury/mr-3-freedom-7';
    const beyond = [
      [
        'the Space Race crumb',
        (page) => page.evaluate(() => document.querySelector('#ui .crumbs [data-home]').click()),
        (hash) => !hash.includes(id),
      ],
      [
        "another flight's address",
        (page) => page.evaluate((o) => (location.hash = `#${o}/gallery`), other),
        (hash) => hash.includes(other),
      ],
      ['a reload', (page) => page.reload(), (hash) => hash.includes(`${id}/fly`)],
    ];
    for (const [name, out, gone] of beyond) {
      const at = `${where} by ${name}`;
      const { page, errors, context: ctx } = await fly(id, w, h, false);
      trap(page);
      await handFly(page, id);
      await stop(page);
      const before = await read(page);
      await out(page);
      await page.waitForTimeout(3000);
      const to = await page.evaluate(() => decodeURIComponent(location.hash));
      if (!gone(to)) fail(at, `the address is "${to}"`);
      const asked = await page.evaluate(() => Boolean(document.querySelector('.deck-ask [role=alertdialog]')));
      if (asked) fail(at, 'asked, though the flight is kept');
      if (name !== 'a reload') {
        if (!to.includes(other)) {
          await page.waitForFunction(() => document.querySelector('#title [data-flight]'), null, { timeout: 60000 });
          const row = await page.evaluate((id) => document.querySelector(`#title [data-flight="${id}"] .run-mark`)?.textContent ?? '', id);
          if (!/In flight/.test(row)) fail(at, `the front page's row does not say a flight is in progress: "${row}"`);
        }
        await page.goto(`${url}#${id}/fly`);
      }
      await takenUp(page);
      await page.waitForTimeout(600);
      let r = await read(page);
      if (!r.card || !r.ready) fail(at, `come back, no Resume offered: ${r.said}`);
      if (!/left (a moment|\d+ minutes?) ago/.test(r.said)) fail(at, `the card does not say when it was left: "${r.said}"`);
      if (r.focus !== 'resume') fail(at, `the card's focus is "${r.focus}", not Resume`);
      same(at, before, r, 'taken up again');
      await page.keyboard.press('Space');
      await page.waitForTimeout(200);
      await page.evaluate(() => window.sr.clock.play(true));
      await page.waitForTimeout(1500);
      r = await read(page);
      if (r.card || !(r.t > before.t)) fail(at, `Resume: card ${r.card}, t ${before.t} to ${r.t}`);
      console.log(
        `  ${at}: kept at T${before.t.toFixed(1)}, nothing asked; Fly offered it again to the digit, and Resume flew on (T${r.t.toFixed(1)})`,
      );
      if (errors.length) fail(at, errors.slice(0, 2).join(' | '));
      await ctx.close();
    }
    // a run kept by another simulator, or of a flight whose data has changed, is not flown again: said so, and let go
    {
      const at = `${where} stale`;
      const { page, errors, context: ctx } = await fly(id, w, h, false);
      trap(page);
      await handFly(page, id);
      await stop(page);
      // (out to the front page, which holds no run, before the run kept is made another simulator's: in the flight's page it
      // would be written again, as it is, on the way out)
      await page.evaluate(() => document.querySelector('#ui .crumbs [data-home]').click());
      await page.waitForFunction(() => document.querySelector('#title [data-flight]'), null, { timeout: 60000 });
      await page.evaluate((id) => {
        const k = `space-race.run:${id}`;
        const run = JSON.parse(localStorage.getItem(k));
        localStorage.setItem(k, JSON.stringify({ ...run, stamp: `${run.stamp}-older` }));
      }, id);
      await page.goto(`${url}#${id}/fly`);
      await takenUp(page);
      let r = await read(page);
      if (!/cannot be resumed/.test(r.said) || r.ready) fail(at, `a stale run offered: "${r.said}"`);
      if (r.stored?.includes(id)) fail(at, 'a stale run is still kept');
      await page.keyboard.press('KeyN');
      await page.waitForTimeout(500);
      r = await read(page);
      if (r.card || r.t > 1) fail(at, `after it: card ${r.card}, t ${r.t}`);
      console.log(`  ${at}: said it cannot be resumed, let go; N stood it on the pad`);
      if (errors.length) fail(at, errors.slice(0, 2).join(' | '));
      await ctx.close();
    }
    // where the browser will not keep it (storage off), a way beyond the flight asks, as it always did: Keep flying changes
    // nothing, Leave lets it go; the browser's own question is set while it would be lost
    {
      const at = `${where} unkept`;
      const {
        page,
        errors,
        context: ctx,
      } = await open(browser, `${url}#${id}/fly`, {
        context: { viewport: { width: w, height: h } },
        before: (page) =>
          page.addInitScript(() =>
            Object.defineProperty(window, 'localStorage', {
              get() {
                throw new DOMException('denied', 'SecurityError');
              },
            }),
          ),
        console: [],
        wait: () => window.sr && document.querySelector('.loading.done') && window.sr.cockpit.active,
        timeout: 120000,
      });
      await asFlown(page);
      trap(page);
      await handFly(page, id);
      await stop(page);
      const before = await read(page);
      if (!before.warns) fail(at, 'the browser is not set to ask while a flight that cannot be kept is flown by hand');
      await page.evaluate(() => document.querySelector('#ui .crumbs [data-home]').click());
      await page.waitForTimeout(500);
      let r = await read(page);
      if (!r.asking || !/will not keep it/.test(r.question) || r.focus !== 'stay') fail(at, `the crumb: "${r.question}", focus ${r.focus}`);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1200);
      r = await read(page);
      if (r.asking || !r.active) fail(at, `Keep flying: asking ${r.asking}, active ${r.active}`);
      same(at, before, r, 'Keep flying');
      await page.evaluate(() => document.querySelector('#ui .crumbs [data-home]').click());
      await page.waitForTimeout(500);
      await page.keyboard.press('KeyL');
      await page.waitForTimeout(3000);
      const to = await page.evaluate(() => decodeURIComponent(location.hash));
      if (to.includes(id)) fail(at, `Leave: the address is "${to}"`);
      console.log(`  ${at}: asked (the browser will not keep it); Keep flying changed nothing; Leave went to "${to || 'the front page'}"`);
      if (errors.length) fail(at, errors.slice(0, 2).join(' | '));
      await ctx.close();
    }
  }
  if (dialogs.length) fail('leaving', `the browser showed a dialog: ${dialogs.join(', ')}`);
}
// Manual controls and return to the recorded flight are both available without a keyboard.
if (!process.env.SR_ONLY || process.env.SR_ONLY === 'touch') {
  for (const id of ['usa/mercury/mr-3-freedom-7', 'usa/apollo/apollo-7']) {
    const where = `${id} by touch at 320`;
    const { page, errors, context } = await fly(id, 320, 844, true, ['error']);
    try {
      const guidance = page.locator('.cockpit [data-do=guidance]');
      const sequence = page.locator('.cockpit [data-do=sequence]');
      const next = page.locator('.cockpit [data-do=next]');
      const modesRead = async (pressed, label) => {
        for (const button of [guidance, sequence]) {
          if ((await button.getAttribute('aria-pressed')) !== pressed || !(await button.getByText(label, { exact: true }).isVisible()))
            fail(where, `touch control does not show ${label}`);
        }
      };
      await modesRead('true', 'Auto');
      if (!(await page.locator('.deck-takeover').isVisible())) fail(where, 'the touch takeover cue is missing on the pad');
      const pose = () =>
        page.evaluate(async () => {
          await new Promise((drawn) => requestAnimationFrame(() => requestAnimationFrame(drawn)));
          const { stage, clock } = window.sr;
          const craft = stage.show.craft();
          return {
            flying: craft.flying,
            t: clock.t,
            position: craft.matrix.elements.slice(12, 15),
            quaternion: craft.of.group.quaternion.toArray(),
          };
        });
      const pauseAt = (t) =>
        page.evaluate((at) => {
          window.sr.clock.pause();
          window.sr.clock.seek(at);
        }, t);
      const apollo = id === 'usa/apollo/apollo-7';
      if (apollo) {
        await page.waitForFunction(() => getComputedStyle(document.querySelector('.loading')).opacity === '0');
        const distance = await page.evaluate(() => window.sr.stage.camera.position.distanceTo(window.sr.stage.cam.pivot));
        if (!(distance < 500)) fail(where, `the opening camera is ${distance.toFixed(0)} m from the rocket`);
      }
      const pad = apollo ? await pose() : null;
      if (apollo && process.env.SR_SHOTS) await page.screenshot({ path: `${process.env.SR_SHOTS}/apollo-7-touch-pad.png` });
      if (!apollo) {
        await guidance.tap();
        await sequence.tap();
        await modesRead('false', 'Manual');
      }
      await next.tap();
      await page.waitForFunction((t) => window.sr.clock.t > t, apollo ? 1 : 3);
      if (pad) {
        if (pad.t !== 0 || pad.flying) fail(where, `the vehicle is already flying on the pad at T+${pad.t}`);
        await pauseAt(5);
        const risen = await pose();
        const [dx, dy, dz] = risen.position.map((x, i) => x - pad.position[i]);
        const sideways = Math.hypot(dx, dz);
        if (!(risen.flying && sideways < 1 && dy > 20)) fail(where, `liftoff moved ${sideways} m sideways and ${dy} m up`);
        console.log(`  ${where}: T+5 moved ${sideways.toFixed(3)} m sideways and ${dy.toFixed(3)} m up from its pad pose`);
        await pauseAt(62);
      }
      const before = apollo ? await pose() : null;
      if (before) {
        await guidance.tap();
        const after = await pose();
        const metres = Math.hypot(...before.position.map((x, i) => x - after.position[i]));
        const dot = before.quaternion.reduce((n, x, i) => n + x * after.quaternion[i], 0);
        const degrees = (2 * Math.acos(Math.min(1, Math.abs(dot))) * 180) / Math.PI;
        if (!(before.t === 62 && after.t === 62 && metres <= 1 && degrees <= 0.1))
          fail(where, `manual takeover at T+62 jumped ${metres} m and ${degrees}° (T+${before.t} to T+${after.t})`);
        console.log(`  ${where}: manual takeover at T+62 changed the rendered pose by ${metres.toFixed(3)} m and ${degrees.toFixed(3)}°`);
        await sequence.tap();
      } else {
        const stick = await page.locator('.cockpit-stick').boundingBox();
        if (!stick) fail(where, 'there is no touch control for steering');
        else {
          const touch = await context.newCDPSession(page);
          await touch.send('Input.dispatchTouchEvent', {
            type: 'touchStart',
            touchPoints: [{ x: stick.x + stick.width / 2, y: stick.y + stick.height * 0.3 }],
          });
          await page.waitForFunction(() => window.sr.cockpit.finger.pitch > 0.2 && window.sr.cockpit.state.w[1] > 0.01);
          await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        }
      }
      await modesRead('false', 'Manual');
      const overflow = await page.evaluate(() =>
        [...document.querySelectorAll('.deck-modes button, .gauge, .cockpit-next')].flatMap((el) => {
          const box = el.getBoundingClientRect();
          if (!box.width || !box.height) return [];
          const text = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          const range = document.createRange();
          while (text.nextNode()) {
            range.selectNodeContents(text.currentNode);
            for (const line of range.getClientRects())
              if (line.width && (line.left < box.left - 0.5 || line.right > Math.min(box.right, innerWidth) + 0.5))
                return [text.currentNode.textContent];
          }
          return [];
        }),
      );
      if (overflow.length) fail(where, `text overflows its controls or figures: ${overflow.join(', ')}`);
      if (apollo && process.env.SR_SHOTS) await page.screenshot({ path: `${process.env.SR_SHOTS}/apollo-7-touch-t62.png` });
      const action = await next.locator('[data-cell=next]').textContent();
      await next.tap();
      await page.waitForFunction((previous) => document.querySelector('[data-cell=next]').textContent !== previous, action);
      await page.locator('.cockpit [data-do=keys]').tap();
      await page.getByRole('button', { name: 'Restart', exact: true }).tap();
      await page.locator('.deck-ask [data-ask=leave]').tap();
      await page.waitForFunction(() => window.sr.clock.t <= 0 && document.querySelector('[data-cell=next]').textContent === 'Ignition');
      await modesRead('false', 'Manual'); // (started again by hand, as every flight is)
      if (errors.length) fail(where, errors.slice(0, 2).join(' | '));
      console.log(`  ${where}: tapped Ignition, took the steering and events over, tapped ${action}, and restarted by hand`);
    } finally {
      await context.close();
    }
  }
}
if (!process.env.SR_ONLY || process.env.SR_ONLY === 'apollo-escape') {
  const where = 'Apollo 7 tower jettison';
  const { page, context, errors } = await open(browser, `${url}#usa/apollo/apollo-7/fly`, { timeout: 120_000 });
  await asFlown(page);
  try {
    await page.evaluate(() => {
      window.sr.clock.pause();
      window.sr.clock.seek(22);
    });
    await page.waitForFunction(() => Math.abs(window.sr.stage.lifted.t - 22) < 0.01);
    await page.keyboard.press('KeyX');
    await page.keyboard.press('KeyX');
    await page.waitForFunction(() => window.sr.stage.show.ascent.flown().launchAborted);
    await page.evaluate(() => window.sr.clock.pause());
    const result = await page.evaluate(() => {
      const run = window.sr.stage.show.ascent.flown();
      const at = run.events.find((event) => event.event === 'les-jettison').t;
      const i = run.samples.findIndex((sample) => sample.t === at);
      const from = run.samples[i];
      const next = run.samples[i + 1];
      const dot = (a, b) => a.reduce((sum, x, j) => sum + x * b[j], 0);
      const difference = (a, b) => a.map((x, j) => x - b[j]);
      const tower = run.sheds.get('les-jettison').shedder.release;
      const expectedTowerCentre = from.r.map((x, j) => x + tower.centre * from.axis[j]);
      return {
        at,
        station: dot(difference(from.centre, from.r), from.axis),
        turn: (2 * Math.acos(Math.min(1, Math.abs(dot(from.attitude, next.attitude)))) * 180) / Math.PI,
        towerError: Math.hypot(...difference(tower.r, expectedTowerCentre)),
        gap: Math.hypot(...difference(from.centre, next.centre)),
        travel: Math.hypot(...from.v) * (next.t - from.t),
      };
    });
    if (!(result.station > 50 && result.station < 70)) fail(where, `capsule centre is ${result.station} m from the stack base`);
    if (!(result.turn < 10)) fail(where, `the capsule turns ${result.turn}° between the release and the first descent sample`);
    if (!(result.towerError < 0.01)) fail(where, `the released tower is ${result.towerError} m from its attached centre`);
    if (!(Math.abs(result.gap - result.travel) < 3))
      fail(where, `the capsule moves ${result.gap} m across the handover, expected ${result.travel}`);
    if (errors.length) fail(where, errors.slice(0, 2).join(' | '));
    console.log(`  ${where}: continuous capsule pose, and the tower leaves from its attached station`);
    if (process.env.SR_SHOTS) {
      for (const [label, dt] of [
        ['attached', -0.18],
        ['departing', 0.18],
      ]) {
        await page.evaluate((t) => window.sr.clock.seek(t), result.at + dt);
        await page.waitForFunction((t) => Math.abs(window.sr.stage.lifted.t - t) < 0.01, result.at + dt);
        await page.screenshot({ path: `${process.env.SR_SHOTS}/apollo-7-les-${label}.png` });
      }
    }
  } finally {
    await context.close();
  }

  const pad = 'Apollo 7 abort at LC-34';
  const { page: padPage, context: padContext, errors: padErrors } = await fly('usa/apollo/apollo-7', 390, 844, true);
  try {
    for (const strike of [false, true]) {
      await padPage.evaluate((blocked) => {
        window.sr.clock.pause();
        window.sr.cockpit.fresh();
        if (!blocked) return;
        // Deliberately intercept the escape with the actual LC-34 mesh. The historical configuration clears it.
        const pad = window.sr.stage.staged.find((model) => model.full.getObjectByName('Umbilical_Tower'));
        for (const level of pad.group.children) {
          const tower = level.getObjectByName('Umbilical_Tower');
          if (!tower) continue;
          tower.userData.home.y += 45;
          tower.userData.home.z += 12;
          tower.position.copy(tower.userData.home);
          tower.updateWorldMatrix(true, true);
        }
        window.sr.stage.dirty = true;
      }, strike);
      await padPage.keyboard.press('KeyX');
      await padPage.keyboard.press('KeyX');
      const result = await padPage.evaluate(() => {
        window.sr.clock.pause();
        const run = window.sr.stage.show.ascent.flown();
        const hit = run.events.find((event) => event.event === 'escape-impact');
        const towerOff = run.events.some((event) => event.event === 'les-jettison');
        const final = run.samples.at(-1);
        if (hit) window.sr.clock.seek(hit.t + 0.01);
        return { hit, towerOff, final: final.t, speed: final.groundSpeed, burning: final.burning.length };
      });
      if (strike) {
        if (!(result.hit && result.hit.t > 0.5 && result.hit.t < 2 && result.hit.t === result.final && !result.towerOff))
          fail(pad, `intercepted escape did not stop at the modeled tower: ${JSON.stringify(result)}`);
        if (result.speed > 0.01 || result.burning) fail(pad, `intercepted escape kept moving or burning: ${JSON.stringify(result)}`);
        if (result.hit) {
          await padPage.getByRole('heading', { name: 'Launch structure strike' }).waitFor();
          for (const control of ['next', 'guidance', 'sequence']) {
            if (await padPage.locator(`[data-do=${control}]`).isEnabled())
              fail(pad, `${control} is still actionable after a structure strike`);
          }
        }
      } else {
        if (result.hit || !result.towerOff || result.final <= 14)
          fail(pad, `clear escape did not reach recovery: ${JSON.stringify(result)}`);
        await padPage.evaluate(() => window.sr.clock.seek(1.5));
      }
      if (process.env.SR_SHOTS)
        await padPage.screenshot({ path: `${process.env.SR_SHOTS}/apollo-7-pad-${strike ? 'impact' : 'clear'}.png` });
    }
    if (padErrors.length) fail(pad, padErrors.slice(0, 2).join(' | '));
    console.log(`  ${pad}: nominal pad clearance and positive contact with a posed tower mesh at 390 px`);
  } finally {
    await padContext.close();
  }
}
if (!process.env.SR_ONLY || process.env.SR_ONLY === 'apollo-escape-replay') {
  const where = 'Apollo 7 kept pad escape';
  const id = 'usa/apollo/apollo-7';
  const { page, context } = await fly(id, 1280, 800, false);
  try {
    await page.evaluate(() => {
      const { stage } = window.sr;
      stage.staged.find((model) => model.full.getObjectByName('White_Room_Pivot')).hold('White_Room_Pivot', 0.92);
    });
    await page.keyboard.press('KeyX');
    await page.keyboard.press('KeyX');
    const saved = await page.evaluate((id) => {
      const { cockpit, stage, clock } = window.sr;
      clock.pause();
      clock.seek(0.4);
      cockpit.save();
      const kept = JSON.parse(localStorage.getItem(`space-race.run:${id}`));
      const tape = JSON.parse(kept.run);
      const abort = tape.entries.filter((entry) => entry[0] === 'c' && entry[5] === 'abort').at(-1);
      const run = stage.show.ascent.flown();
      return { held: abort.slice(6), events: run.events, duration: run.duration };
    }, id);
    if (JSON.stringify(saved.held) !== JSON.stringify(['White_Room_Pivot', 0.92]))
      fail(where, `the command tape omitted the held pad pose: ${JSON.stringify(saved.held)}`);
    await page.goto(`${url}#${id}/site/pad`);
    await page.reload();
    await page.waitForFunction(() => document.querySelector('.loading.done') && window.sr?.cockpit.keeping, null, { timeout: 120_000 });
    await page.evaluate(() => {
      const { stage } = window.sr;
      const mechanism = stage.staged.find((model) => model.full.getObjectByName('White_Room_Pivot'));
      mechanism.hold('White_Room_Pivot', 0.6);
      const withEscapePad = stage.withEscapePad.bind(stage);
      stage.withEscapePad = (time, held, query) => {
        window.escapePose = { time, held, displayed: window.sr.clock.t };
        return withEscapePad(time, held, query);
      };
    });
    await page.evaluate((id) => {
      location.hash = `${id}/fly`;
    }, id);
    await page.locator('.cockpit-kept [data-do=resume]').waitFor();
    const replayed = await page.evaluate(() => {
      const run = window.sr.stage.show.ascent.flown();
      return { pose: window.escapePose, events: run.events, duration: run.duration };
    });
    if (
      !(replayed.pose?.time === 0 && replayed.pose.displayed === 0.4) ||
      JSON.stringify(replayed.pose.held) !== JSON.stringify([['White_Room_Pivot', 0.92]])
    )
      fail(where, `replay polled the displayed pad instead of its own abort time and held arm: ${JSON.stringify(replayed.pose)}`);
    if (replayed.duration !== saved.duration || JSON.stringify(replayed.events) !== JSON.stringify(saved.events))
      fail(where, 'the saved escape and its replay have different events or duration');
    console.log(`  ${where}: replay used the same held pad pose at T+0 with the displayed clock at T+0.4`);
  } finally {
    await context.close();
  }
}
// The throttle (deck.ts `lever`, sim/lever.ts): a row under the figures on every flight, the same keys on every flight.
// A ballistic flight's engine and a flight into orbit's stages follow the down arrow a notch at a time (taking the flight
// over), Cut puts the engines out, and a range the game gives an engine that ran at one thrust says so.
if (!process.env.SR_ONLY || process.env.SR_ONLY === 'throttle') {
  for (const id of ['usa/mercury/mr-3-freedom-7', 'ussr/vostok/vostok-1']) {
    const where = `${id} throttle`;
    const { page, errors, context: ctx } = await fly(id, 1280, 800, false);
    const read = () =>
      page.evaluate(() => {
        const row = document.querySelector('#ui > .cockpit .deck-throttle');
        const c = window.sr.cockpit;
        const s = c.state;
        return {
          shown: Boolean(row && !row.hidden && row.getBoundingClientRect().height > 0),
          lever: row?.querySelector('[data-cell=lever]')?.textContent ?? '',
          what: row?.querySelector('[data-cell=lever-engine]')?.textContent ?? '',
          left: row?.querySelector('[data-cell=lever-left]')?.textContent ?? '',
          title: row?.title ?? '',
          mode: document.querySelector('[data-cell=mode]')?.textContent ?? '',
          throttle: s?.throttle,
          hand: s?.hand?.[0]?.at(-1)?.[1],
          burning: s && 'stages' in s ? s.stages.map((g) => Number.isFinite(g.from) && !Number.isFinite(g.to)) : null,
        };
      });
    const pad = await read();
    if (!pad.shown) fail(where, 'no throttle row on the pad');
    if (pad.lever !== '100 %') fail(where, `on the pad the lever reads "${pad.lever}", not full`);
    if (!/real: fixed thrust|range: the game’s/.test(pad.what) || !/the game’s range/.test(pad.title))
      fail(where, `the game's range is not said: "${pad.what}" / "${pad.title}"`);
    await page.keyboard.press('Space');
    for (let t = 0; t <= 20; t += 4) {
      await page.evaluate((x) => window.sr.clock.seek(x), t);
      await page.waitForTimeout(80);
    }
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.evaluate(() => window.sr.clock.seek(window.sr.clock.t + 1));
    await page.waitForTimeout(300);
    const low = await read();
    if (low.lever !== '90 %') fail(where, `two notches down the lever reads "${low.lever}"`);
    const held = low.throttle ?? low.hand;
    if (Math.abs(held - 0.9) > 1e-9) fail(where, `the engines are not at nine tenths: ${held}`);
    if (!/Δv \d+ m\/s/.test(low.left)) fail(where, `no speed left to give: "${low.left}"`);
    if (id.startsWith('ussr') && !/Not the record/.test(low.mode)) fail(where, `the throttle did not take the flight over: "${low.mode}"`);
    await page.click('#ui > .cockpit .deck-throttle [data-do=cut]');
    await page.evaluate(() => window.sr.clock.seek(window.sr.clock.t + 1));
    await page.waitForTimeout(300);
    const cut = await read();
    if (cut.lever !== 'Cut') fail(where, `Cut reads "${cut.lever}"`);
    if (cut.burning ? cut.burning.some(Boolean) : cut.throttle !== 0) fail(where, `Cut left an engine burning: ${JSON.stringify(cut)}`);
    console.log(`  ${where}: ${pad.lever} on the pad, ${low.lever} two notches down (${held}), then ${cut.lever}: ${cut.what}`);
    if (errors.length) fail(where, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }
}
// Taken by hand (deck.ts `START`): every entry to Fly has guidance and the sequencer off; the navball's flight director
// shows the record's attitude on the pad and going up; the next step is offered with the record's time; and a flight left
// on its pad untouched keeps nothing.
if (!process.env.SR_ONLY || process.env.SR_ONLY === 'by-hand') {
  for (const id of ['usa/mercury/mr-3-freedom-7', 'ussr/vostok/vostok-1']) {
    const where = `${id} by hand`;
    const { page, errors, context: ctx } = await fly(id, 1280, 800, false, [], true);
    const read = () =>
      page.evaluate(() => ({
        guidance: document.querySelector('#ui > .cockpit [data-do=guidance]').getAttribute('aria-pressed'),
        sequence: document.querySelector('#ui > .cockpit [data-do=sequence]').getAttribute('aria-pressed'),
        prompt: document.querySelector('[data-cell=prompt]')?.textContent ?? '',
        director: !document.querySelector('.navball [data-mark=target]')?.hidden,
        warns: window.sr.cockpit.warning,
        stakes: window.sr.cockpit.stakes,
      }));
    const pad = await read();
    if (pad.guidance !== 'false' || pad.sequence !== 'false')
      fail(where, `on the pad G is ${pad.guidance} and B ${pad.sequence}: not by hand`);
    if (!/by hand/.test(pad.prompt)) fail(where, `the pad does not say it is by hand: "${pad.prompt}"`);
    if (!pad.director) fail(where, 'no flight director on the navball on the pad');
    if (pad.stakes || pad.warns) fail(where, 'a flight standing untouched on its pad is at stake');
    await page.keyboard.press('Space');
    for (let t = 0; t <= 20; t += 4) {
      await page.evaluate((x) => window.sr.clock.seek(x), t);
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(300);
    const up = await read();
    if (!up.director) fail(where, 'no flight director going up');
    if (!/Next: .* at T\+/.test(up.prompt)) fail(where, `no next step with the record's time: "${up.prompt}"`);
    if (!up.stakes) fail(where, 'flown by hand, the flight is not at stake');
    console.log(`  ${where}: G and B off on the pad ("${pad.prompt}"), going up "${up.prompt}"`);
    if (errors.length) fail(where, errors.slice(0, 2).join(' | '));
    await ctx.close();
  }
}
await browser.close();
console.log(failed ? `deck: ${failed} failed` : 'deck: every promise kept');
process.exit(failed ? 1 : 0);
