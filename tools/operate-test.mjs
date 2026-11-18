// Works something by hand on foot in the running page, at each launch site, through the eyes and over the shoulder, at
// 1280 and 390 wide, and checks that what is being run can be seen and is read out (docs/agents/walking.md, "What a part
// does can be worked by hand"; AGENTS.md, "Being there"): the walker stands at the part and takes Operate from the wheel,
// runs it and lets go, three ways: at 1280 with the keys (E, its digit, W held, E); at 820 with the pointer not captured
// (a browser that refuses it), by the walk bar's own buttons (its W held under the pointer, its Done); and at 390 as a
// phone, by touch (Act, the wheel's choice, the round button named by the end it runs to held, Done). Then:
//   - the moving part's middle is in the frame the whole time it runs, and over the shoulder nothing of the figure is on
//     the line from the eye to it (the part's bounds and the figure's, projected and tested in the page)
//   - the walk bar names what is held and its travel, which changes while it runs and stops when it is let go
//   - E (at 390, the bar's Done) lets go, and the view is back where it was before Operate was taken
//   - with Motion off the camera goes there at once (a cut), and comes back at once
//   - with the keys and the mouse captured, the first Escape only frees the mouse (the work goes on; the wheel shuts),
//     and the next lets go of the controls, still on foot
//   node tools/operate-test.mjs [url] [--only <regex of case names>] [--shots <dir>]      (default url: http://localhost:5180/)
// --shots writes a still before Operate is taken and one mid-travel for every case, with the page's panels on.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { checks, launch, open, opt, url as urlOf } from './browser.mjs';

const args = process.argv.slice(2);
const only = opt(args, '--only', null);
const shots = opt(args, '--shots', null);
const url = urlOf(args);

/**
 * What is worked at each site: the flight, an instant on its clock when it can be (seconds from launch), where the walker
 * stands (metres in the site's frame, x east, z south) and the point it looks at to have the part within reach, the
 * function's name on the wheel, and how long W is held.
 */
const SITES = [
  {
    name: 'Site 1: the erector’s boom, from the ground beside the wagon',
    flight: 'ussr/vostok/vostok-1',
    at: -7019.7, // the pilot in his seat: the boom up at the rocket
    from: [-14, 0, 5.6],
    look: [-14, 1.5, 3],
    part: 'Erector',
    fn: 'Boom',
    hold: 4,
  },
  {
    name: 'Complex 5: the aerial tower’s mast, at its controls',
    flight: 'usa/mercury/mr-3-freedom-7',
    at: -15253, // the pilot going aboard: the tower on its outriggers, its mast up
    from: [17.71, 0, -2.1],
    look: [19.21, 1.25, -2.1],
    part: 'Mobile aerial tower',
    fn: 'Mast',
    hold: 4,
  },
  {
    name: 'Complex 14: the bascule, from the stage behind its hinge on the egress tower',
    flight: 'usa/mercury/ma-6-friendship-7',
    at: -1800, // the service structure parked: the tower stands alone beside the vehicle, the bascule upright
    from: [1.52, 21.391, 10.0],
    look: [0.762, 23.7, 9.17], // (its west stringer, where it stands upright: the same from the eyes and from over the shoulder)
    part: 'Umbilical and egress tower',
    fn: 'Bascule',
    hold: 4,
  },
  {
    name: 'Complex 19: the first work platform’s leaves, from the erector’s south walk at 36 ft',
    flight: 'usa/gemini/gt-3',
    at: -8040, // the crew going up: the erector standing, its platforms down round the vehicle
    from: [3.2, 36 * 0.3048, 1.2],
    look: [1.95, 36 * 0.3048 - 0.02, 0.9], // down at the leaf at his feet, south of the vehicle
    part: 'Launch vehicle erector',
    fn: 'Work platform 1 (36 ft)',
    hold: 4,
  },
  {
    name: 'Complex 34: the crew access arm at the 220-foot tower landing',
    flight: 'usa/apollo/apollo-7',
    at: -8865,
    from: [9.37, 58.8264, 0.04],
    look: [8.35, 60.48, 1.104], // the nearest upper side panel, inside the walker’s reach
    part: 'White room and access arm',
    fn: 'Crew access arm',
    hold: 4,
  },
];
const WIDTHS = [
  { w: 1280, h: 800, input: 'keys' },
  { w: 820, h: 1000, input: 'buttons' },
  { w: 390, h: 844, input: 'touch' },
];
const VIEWS = ['eyes', 'shoulder'];

if (shots) mkdirSync(shots, { recursive: true });
const browser = await launch();
const { check, failures } = checks();
let cases = 0;

/** In the page: how the moving part and the figure lie in the view now (the camera's own matrices; nothing is drawn for it). */
const framing = () => {
  const sr = window.sr;
  const stage = sr.stage;
  const work = stage.onFoot.working;
  if (!work) return null;
  const at = sr.flight.models.findIndex((m) => m.id === work.model);
  const staged = stage.staged[at];
  const fn = stage.hands.functions(work.model, work.node).find((f) => f.fn.id === work.fn).fn;
  const Box3 = staged.box.constructor;
  const box = new Box3();
  staged.shown.updateWorldMatrix(true, true);
  for (const n of fn.nodes) {
    const o = staged.part(n);
    if (o) box.union(new Box3().setFromObject(o));
  }
  const centre = box.getCenter(box.min.clone());
  const camera = stage.camera;
  camera.updateMatrixWorld();
  const ndc = centre.clone().project(camera);
  // the figure, as drawn (over the shoulder), or nothing (through the eyes it is drawn into the shadows only)
  const walked = stage.staged[stage.onFoot.walked];
  const drawn = walked?.group.visible && !stage.onFoot.unseen && stage.walk.outside;
  let blocked = false;
  if (drawn) {
    const fig = new Box3().setFromObject(walked.shown);
    // does the segment from the eye to the part's middle pass through the figure's box? (the slab test)
    const o = camera.position;
    const d = centre.clone().sub(o);
    let t0 = 0;
    let t1 = 1;
    for (const k of ['x', 'y', 'z']) {
      if (Math.abs(d[k]) < 1e-9) {
        if (o[k] < fig.min[k] || o[k] > fig.max[k]) t1 = -1;
        continue;
      }
      const a = (fig.min[k] - o[k]) / d[k];
      const b = (fig.max[k] - o[k]) / d[k];
      t0 = Math.max(t0, Math.min(a, b));
      t1 = Math.min(t1, Math.max(a, b));
    }
    blocked = t0 <= t1;
  }
  const bar = document.querySelector('.walkbar').getBoundingClientRect();
  const travel = document.querySelector('.walkbar .travel');
  return {
    ndc: [ndc.x, ndc.y, ndc.z],
    inFrame: Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1 && ndc.z < 1,
    drawn,
    blocked,
    value: Number(travel?.dataset.value ?? Number.NaN),
    shown: travel?.getAttribute('aria-valuenow'),
    name: document.querySelector('.walkbar .work-name')?.textContent ?? '',
    working: !document.querySelector('.walkbar .work')?.hidden,
    bar: [bar.left, bar.right, innerWidth],
    by: stage.cam[stage.walk.third ? 'shoulder' : 'eyes'].watchedBy,
    eye: camera.position.toArray(),
  };
};

/** In the page: the camera as it stands. */
const pose = () => {
  const c = window.sr.stage.camera;
  return { p: c.position.toArray(), q: c.quaternion.toArray() };
};
const apart = (a, b) => ({
  metres: Math.hypot(a.p[0] - b.p[0], a.p[1] - b.p[1], a.p[2] - b.p[2]),
  degrees: (2 * Math.acos(Math.min(1, Math.abs(a.q.reduce((s, v, i) => s + v * b.q[i], 0)))) * 180) / Math.PI,
});

for (const site of SITES)
  for (const { w, h, input } of WIDTHS)
    for (const view of VIEWS) {
      const name = `${site.name} · ${view === 'eyes' ? 'through the eyes' : 'over the shoulder'} · ${w} wide, by ${input}`;
      if (only && !new RegExp(only).test(name)) continue;
      cases++;
      console.log(name);
      const touch = input === 'touch';
      const { page, errors, context } = await open(browser, `${url}#${site.flight}/site/pad`, {
        context: { viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: touch, isMobile: touch },
        console: [],
        timeout: 120000,
        // (with the buttons, a browser that will not capture the pointer: the bar is there to be pressed)
        before: (p) =>
          input === 'buttons' &&
          p.addInitScript(() => {
            HTMLCanvasElement.prototype.requestPointerLock = () => Promise.reject(new Error('refused'));
          }),
      });
      const cdp = touch ? await context.newCDPSession(page) : null;
      /** A finger on the middle of `selector` (held for `ms`, or until `lift` is called). */
      const finger = async (selector) => {
        const r = await page.locator(selector).boundingBox();
        const at = [{ x: r.x + r.width / 2, y: r.y + r.height / 2, id: 1 }];
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at });
        return () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      };
      const tap = async (selector) => {
        const lift = await finger(selector);
        await page.waitForTimeout(60);
        await lift();
      };
      await page.evaluate(() => Promise.allSettled(window.sr.stage.arriving ?? []));
      // the morning's hardware where it was, the motion full, and on foot at the part, looking at it
      const named = await page.evaluate(
        async ({ at, from, look, third }) => {
          const sr = window.sr;
          sr.stage.setAutoRotate(false);
          sr.clock.pause();
          sr.clock.seek(at);
          await new Promise((done) => setTimeout(done, 4000));
          const walker = sr.flight.models.find((m) => m.walker).id;
          sr.stage.enterWalk(walker, { x: from[0], y: from[1], z: from[2] });
          sr.stage.walk.setThird(third);
          await new Promise((done) => setTimeout(done, 600));
          // (over the shoulder what is in reach is found along the view from beside the head, over the right shoulder: walk.ts)
          const walk = sr.stage.walk;
          const feet = walk.body.position;
          for (let i = 0; i < 3; i++) {
            const side = third ? 0.55 : 0;
            const x = feet.x + Math.cos(walk.yaw) * side;
            const y = feet.y + walk.eye + (third ? 0.3 : 0);
            const z = feet.z - Math.sin(walk.yaw) * side;
            walk.yaw = Math.atan2(-(look[0] - x), -(look[2] - z));
            walk.pitch = Math.atan2(look[1] - y, Math.hypot(look[0] - x, look[2] - z));
          }
          await new Promise((done) => setTimeout(done, 1500));
          return document.querySelector('.reticle span')?.textContent ?? '';
        },
        { at: site.at, from: site.from, look: site.look, third: view === 'shoulder' },
      );
      if (!check(named === site.part, `the reticle names the ${site.part} (it names "${named}")`)) {
        await context.close();
        continue;
      }
      const before = await page.evaluate(pose);
      if (shots) await page.screenshot({ path: join(shots, `operate-${cases}-before.png`) });
      // E (Act, by touch), then the wheel's digit for Operate (its choice, tapped)
      if (touch) await tap('[data-walk-act]');
      else await page.keyboard.press('e');
      await page.waitForTimeout(400);
      const digit = await page.evaluate(
        (fn) => [...document.querySelectorAll('.wheel [data-item]')].findIndex((b) => b.textContent.includes(`Operate: ${fn}`)) + 1,
        site.fn,
      );
      if (!check(digit > 0, `the wheel offers Operate: ${site.fn}`)) {
        await context.close();
        continue;
      }
      if (touch) await tap(`.wheel [data-item="${digit - 1}"]`);
      else await page.keyboard.press(String(digit));
      await page.waitForTimeout(1600); // (the view goes to it in under a second, and settles)
      const held = await page.evaluate(framing);
      check(held.working && held.name === site.fn, `the walk bar reads out what is held ("${held.name}")`);
      check(
        held.bar[0] >= 0 && held.bar[1] <= held.bar[2] + 0.5,
        `the walk bar is within the window (${held.bar.map(Math.round).join(', ')})`,
      );
      const moved = apart(before, await page.evaluate(pose));
      check(
        view === 'shoulder' ? moved.metres > 0.5 : moved.degrees > 2,
        `the view has gone to it (${moved.metres.toFixed(2)} m, ${moved.degrees.toFixed(1)} degrees)`,
      );
      // run it: W held; the bar's own button held under the pointer; a finger on the round button named by where it runs to
      let lift = null;
      if (input === 'buttons') {
        const r = await page.locator('.walkbar .work-on').boundingBox();
        await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
        await page.mouse.down();
      } else if (touch) {
        const label = await page.evaluate(() => document.querySelector('[data-walk-push="1"]')?.textContent ?? '');
        const end = await page.evaluate(() => document.querySelector('.walkbar .end1')?.textContent ?? '');
        check(label === end && !!label, `the round button is named by the end it runs to ("${label}")`);
        lift = await finger('[data-walk-push="1"]');
      } else await page.keyboard.down('w');
      const samples = [];
      const t0 = Date.now();
      let shot = false;
      while (Date.now() - t0 < site.hold * 1000) {
        await page.waitForTimeout(150);
        samples.push(await page.evaluate(framing));
        if (shots && !shot && Date.now() - t0 > (site.hold * 1000) / 2) {
          shot = true;
          await page.screenshot({ path: join(shots, `operate-${cases}-running.png`) });
        }
      }
      if (input === 'buttons') await page.mouse.up();
      else if (lift) await lift();
      else await page.keyboard.up('w');
      const out = samples.filter((s) => !s.inFrame);
      const hidden = samples.filter((s) => s.blocked);
      check(!out.length, `the moving part's middle is in the frame while it runs (${samples.length - out.length} of ${samples.length})`);
      check(
        !hidden.length,
        `nothing of the figure is between the eye and it (${samples.length - hidden.length} of ${samples.length}${view === 'shoulder' ? `; drawn in ${samples.filter((s) => s.drawn).length}` : ''})`,
      );
      const first = held.value;
      const last = samples.at(-1).value;
      check(last - first > 0.004, `its travel goes on while it runs (${(first * 100).toFixed(1)} to ${(last * 100).toFixed(1)} per cent)`);
      check(
        samples.every((s, i) => i === 0 || s.value >= samples[i - 1].value - 1e-9),
        'and only one way, the way it is run',
      );
      await page.waitForTimeout(1200);
      const a = (await page.evaluate(framing)).value;
      await page.waitForTimeout(700);
      const b = (await page.evaluate(framing)).value;
      check(Math.abs(b - a) < 1e-4, `let go, it stops (${(a * 100).toFixed(2)} then ${(b * 100).toFixed(2)} per cent)`);
      // done: E; the bar's Done; Act, which says Done
      if (input === 'buttons') await page.locator('.walkbar .work [data-press]').click();
      else if (touch) {
        check((await page.locator('[data-walk-act]').textContent()) === 'Done', 'by touch, Act says Done');
        await tap('[data-walk-act]');
      } else await page.keyboard.press('e');
      await page.waitForTimeout(1600);
      const after = await page.evaluate(pose);
      const back = apart(before, after);
      const ended = await page.evaluate(() => document.querySelector('.walkbar .work')?.hidden !== false);
      check(ended, 'the readout is put away');
      check(
        back.metres < 0.06 && back.degrees < 2,
        `the view is back where it was (${back.metres.toFixed(3)} m, ${back.degrees.toFixed(2)} degrees)`,
      );
      // with Motion off the view goes there at once, and comes back at once
      if (input === 'keys') {
        await page.evaluate(() => {
          const button = document.querySelector('[data-walk-motion]');
          for (let i = 0; i < 3 && !button.textContent.includes('off'); i++) button.click();
        });
        await page.keyboard.press('e');
        await page.waitForTimeout(400);
        await page.keyboard.press(String(digit));
        await page.waitForTimeout(150);
        const cut = await page.evaluate(framing);
        check(cut?.by === 1, `with Motion off it is a cut (watched by ${cut?.by.toFixed(2)} at once)`);
        await page.keyboard.press('e');
        await page.waitForTimeout(150);
        const gone = apart(before, await page.evaluate(pose));
        check(gone.metres < 0.06 && gone.degrees < 2, `and back at once (${gone.metres.toFixed(3)} m, ${gone.degrees.toFixed(2)} degrees)`);
      }
      // Escape with the mouse captured (walking.md, "Escape frees the mouse first"): worked by hand, the first Escape only
      // frees the mouse and the work goes on, and the next lets go of the controls, still on foot; with the wheel open, the
      // first shuts it as a menu, the mouse free. (Headless Chrome gives the page the key and lets nothing go: the walker
      // lets it go itself, as a desktop browser would.)
      if (input === 'keys') {
        const state = () =>
          page.evaluate(() => ({
            locked: document.pointerLockElement === document.querySelector('#stage'),
            working: document.querySelector('.walkbar .work')?.hidden === false,
            wheel: document.querySelector('.wheel')?.hidden === false,
            active: window.sr.stage.walk.active,
          }));
        const capture = () => page.evaluate(() => document.querySelector('#stage').requestPointerLock());
        await capture();
        await page.keyboard.press('e');
        await page.waitForTimeout(400);
        await page.keyboard.press(String(digit));
        await page.waitForTimeout(600);
        const w0 = await state();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
        const w1 = await state();
        check(
          w0.locked && w0.working && w1.active && w1.working && !w1.locked,
          `worked with the mouse captured, the first Escape frees the mouse and the work goes on (captured ${w0.locked}, then working ${w1.working}, free ${!w1.locked})`,
        );
        await page.keyboard.press('Escape');
        await page.waitForTimeout(600);
        const w2 = await state();
        check(
          w2.active && !w2.working,
          `the next Escape lets go of the controls, still on foot (working ${w2.working}, on foot ${w2.active})`,
        );
        await capture();
        await page.waitForTimeout(200);
        await page.keyboard.press('e');
        await page.waitForTimeout(400);
        const w3 = await state();
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
        const w4 = await state();
        check(
          w3.wheel && w3.locked && !w4.wheel && !w4.locked && w4.active,
          `the wheel open with the mouse captured, the first Escape shuts it and frees the mouse, still on foot (open ${w3.wheel}, captured ${w3.locked}; then open ${w4.wheel}, captured ${w4.locked}, on foot ${w4.active})`,
        );
      }
      if (errors.length) check(false, `the page threw: ${errors[0]}`);
      await context.close();
    }
await browser.close();
console.log(`operate-test: ${failures.length ? `${failures.length} checks FAILED` : `ok, ${cases} cases`}`);
process.exit(failures.length ? 1 : 0);
