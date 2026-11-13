// Drives the running viewer's camera with real input and checks what it promises (AGENTS.md, "The camera").
//   node tools/camera-test.mjs [url] [--seed <n>] [--events <n>] [--only <name>] [--throttle <x>]      (default url: http://localhost:5180/)
//   (--throttle 4: the page's CPU four times slower once it has loaded, as a slow machine or a busy one: every promise is to hold at any frame rate)
//
// First the sequences that used to go wrong, each with its numbers: zooming out with the pointer anywhere, then in
// again; a zoom set by hand and then a panel opening, a resize, the slider; a distance set by hand in the chase view
// through staging; flying free and coming back to orbit. Then a soak: a few hundred mixed wheel, drag, key, click and
// touch events from one seed, with the clock running a flight and C stepping through the rigs, and on every frame:
//
//   - nothing is not a number, and the eye is above the ground or the sea;
//   - the pivot has not moved without a cause (a slide, a zoom in onto something, a journey, the vehicle itself);
//   - a zoom out, with nothing else going on, moved the pivot nowhere and turned the view not at all;
//   - the subject is where it should be: the pivot in the middle of the clear part of the frame, the vehicle in frame;
//   - with no drag in hand, nothing moved faster than a zoom, a coast and a key can move it.
//
// The dev server's reloads are kept from the page under test, so other people's edits do not restart it.
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const opt = (name, fallback) => (args.includes(name) ? args.splice(args.indexOf(name), 2)[1] : fallback);
const seed = Number(opt('--seed', 1));
const EVENTS = Number(opt('--events', 350));
const only = opt('--only', null);
const THROTTLE = Number(opt('--throttle', 1));
const url = args[0] ?? 'http://localhost:5180/';

function seeded(from) {
  let s = from >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function open({ model = 'vehicle', width = 1440, height = 900, touch = false } = {}) {
  const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, hasTouch: touch, isMobile: touch });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.routeWebSocket(/.*/, () => {});
  await page.goto(`${url}#${model}`);
  await page.waitForFunction(() => window.sr && document.querySelector('.loading.done'), null, { timeout: 90000 });
  if (touch) await page.addStyleTag({ content: '#ui { display: none !important }' });
  // every frame: where the camera is, and what the hands did since the last one
  await page.evaluate(() => {
    const st = window.sr.stage;
    const cam = st.cam;
    const canvas = document.querySelector('#stage');
    const did = { drag: 0, pan: 0, wheelIn: 0, wheelOut: 0, key: 0, click: 0, dbl: 0, touch: 0 };
    let down = null;
    canvas.addEventListener(
      'pointerdown',
      (e) => {
        down = { b: e.button, shift: e.shiftKey || e.ctrlKey || e.metaKey };
        did.click++;
        if (e.pointerType === 'touch') did.touch++;
      },
      true,
    );
    canvas.addEventListener(
      'pointermove',
      (e) => {
        if (!e.buttons && e.pointerType === 'mouse') return;
        if (e.pointerType === 'touch') did.touch++;
        if (down && (down.b !== 0 || down.shift)) did.pan++;
        else did.drag++;
      },
      true,
    );
    canvas.addEventListener('wheel', (e) => (e.deltaY < 0 ? did.wheelIn++ : did.wheelOut++), { capture: true, passive: true });
    canvas.addEventListener('dblclick', () => did.dbl++, true);
    window.addEventListener('keydown', () => did.key++, true);
    const v = (p) => [p.x, p.y, p.z];
    const tmp = st.camera.position.clone();
    window.__frames = [];
    window.__probe = () => {
      const c = st.camera;
      const e = c.matrixWorld.elements;
      const craft = st.crafted;
      const middle = craft ? craft.centre.clone().applyMatrix4(craft.matrix) : null;
      const ndc = (p) => v(tmp.copy(p).project(c));
      return {
        t: performance.now(),
        rig: cam.rig,
        stepped: st.camStepped,
        p: v(c.position),
        dir: [-e[8], -e[9], -e[10]],
        pivot: v(cam.pivot),
        fov: c.fov,
        clear: cam.scene.clearance(c.position),
        journey: cam.travelling,
        blend: Boolean(cam.blend),
        keys: cam.keys.size,
        craft: middle ? v(middle) : null,
        craftAt: craft ? [craft.matrix.elements[12], craft.matrix.elements[13], craft.matrix.elements[14]] : null,
        craftNdc: middle ? ndc(middle) : null,
        pivotNdc: ndc(cam.pivot),
        // what the vehicle has shed and is drawn: where each holder puts its node, by the drop it left with
        shed: (st.debris ?? []).filter((d) => d.holder.visible).map((d) => [d.drop, ...d.holder.matrix.elements.slice(12, 15)]),
        flying: Boolean(craft?.flying),
        shape: craft?.shape ?? 0,
        radius: craft?.radius ?? 0,
        walking: st.walk.active,
        clock: window.sr.clock.t,
        turning: Boolean(window.__turning), // (the self-check's fault is being applied: soak's `fault`)
      };
    };
    // Wait on the page's own time, not the wall's: until `done(probe)` holds or the camera has been given `seconds` of its
    // time. The stage steps the camera by each frame's interval but never by more than a tenth of a second (Stage: `dt`),
    // so a machine drawing three frames a second gives it a third of the wall's time; counted in the camera's own time,
    // a slow machine is given what a fast one is, and keeps the same promise. (A minute of the wall is the ceiling.)
    window.__until = (done, seconds) =>
      new Promise((resolve) => {
        const wall = performance.now();
        let given = 0;
        let last = wall;
        const look = (now) => {
          given += Math.min(Math.max(0, now - last) / 1000, 0.1);
          last = now;
          const p = window.__probe();
          if (done(p) || given >= seconds || now - wall > 60000) resolve(p);
          else requestAnimationFrame(look);
        };
        requestAnimationFrame(look);
      });
    // (a frame's instant is when it began, as the page's own loop has it: taken after the frame's work instead, a frame
    // that ran long was followed by one that seemed short, and what the camera rightly made up in it read as a lurch)
    const loop = (began) => {
      requestAnimationFrame(loop);
      if (!window.__recording) return;
      window.__frames.push({ ...window.__probe(), t: began, did: { ...did } });
      for (const k in did) did[k] = 0;
    };
    requestAnimationFrame(loop);
  });
  const cdp = await context.newCDPSession(page);
  if (THROTTLE > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });
  const wheel = (x, y, deltaY, ctrl = false) =>
    cdp.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x, y, deltaX: 0, deltaY, modifiers: ctrl ? 2 : 0, pointerType: 'mouse' });
  const fingers = async (from, to, steps) => {
    const at = (k) => from.map((p, i) => ({ x: p[0] + (to[i][0] - p[0]) * k, y: p[1] + (to[i][1] - p[1]) * k, id: i + 1 }));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: at(0) });
    for (let i = 1; i <= steps; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: at(i / steps) });
      await page.waitForTimeout(12);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const drag = async (x0, y0, x1, y1, button = 'left', steps = 8) => {
    await page.mouse.move(x0, y0);
    await page.mouse.down({ button });
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps);
      await page.waitForTimeout(10);
    }
    await page.mouse.up({ button });
  };
  return {
    browser,
    page,
    errors,
    wheel,
    fingers,
    drag,
    probe: () => page.evaluate(() => window.__probe()),
    wait: (ms) => page.waitForTimeout(ms),
  };
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (len(a) * len(b) || 1))));
const far = (s) => len(sub(s.p, s.pivot));
const side = (s) => sub(s.p, s.pivot);
let failed = 0;
const check = (ok, what) => {
  if (!ok) failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`);
};

/** What the separation's frames say: the booster left after the first was kept, drifted off, and the capsule kept its place. */
function separation(frames) {
  const sep = frames.findIndex((f) => f.shed.some((s) => s[0] === 1));
  check(
    sep > 0,
    `the booster left at T+${frames[Math.max(0, sep)]?.clock.toFixed(2)} and is drawn (recorded from T+${frames[0]?.clock.toFixed(2)})`,
  );
  if (sep <= 0) return;
  // the booster as seen from the capsule: it drifts off at a few metres a second, and never jumps
  let jump = 0;
  let fastest = 0;
  for (let i = sep + 1; i < frames.length; i++) {
    const [a, b] = [frames[i - 1], frames[i]];
    const ba = a.shed.find((s) => s[0] === 1);
    const bb = b.shed.find((s) => s[0] === 1);
    if (!ba || !bb || b.clock <= a.clock) continue;
    const step = len(sub(sub(bb.slice(1), ba.slice(1)), sub(b.craftAt, a.craftAt)));
    jump = Math.max(jump, step);
    fastest = Math.max(fastest, step / (b.clock - a.clock));
  }
  check(fastest < 25, `the booster from the capsule: never faster than ${fastest.toFixed(1)} m/s, ${jump.toFixed(2)} m in a frame at most`);
  // the capsule comes to the middle of the frame and is never further from it than it was as the booster left
  const off = (f) => Math.hypot(f.craftNdc[0] - f.pivotNdc[0], (f.craftNdc[1] - f.pivotNdc[1]) * 0.625);
  const start = off(frames[sep]);
  const most = Math.max(...frames.slice(sep).map(off));
  const out = frames.slice(sep).some((f) => Math.abs(f.craftNdc[0]) > 1 || Math.abs(f.craftNdc[1]) > 1);
  check(
    !out && most <= start * 1.02 + 0.01,
    `the capsule stays in frame: ${start.toFixed(3)} from the middle as it left, ${most.toFixed(3)} at most after`,
  );
  check(off(frames.at(-1)) < 0.02, `and is at the middle when the view has settled (${off(frames.at(-1)).toFixed(3)})`);
}

const sequences = {
  // The one that was reported: "zoom out and it'll just zoom back in at a totally random location". From above (a steep
  // view), with the view taken, wheel out with the pointer in a corner, then in with it somewhere else.
  async 'zoom out, then in'(h) {
    for (const model of ['vehicle', 'pad', 'crew']) {
      await h.page.evaluate((m) => window.sr.show(m, true), model);
      await h.wait(600);
      await h.page.evaluate(([d]) => window.sr.stage.pose(215, 35, d, 8), [model === 'crew' ? 8 : model === 'pad' ? 150 : 80]);
      await h.drag(700, 450, 706, 452);
      await h.wait(900);
      const before = await h.probe();
      for (let i = 0; i < 16; i++) {
        await h.wheel(950, 650, 120);
        await h.wait(30);
      }
      await h.wait(1200);
      const out = await h.probe();
      check(
        len(sub(out.pivot, before.pivot)) < 1e-6,
        `${model}: 16 notches out with the pointer in a corner: the pivot moved ${len(sub(out.pivot, before.pivot)).toFixed(4)} m`,
      );
      check(
        ang(side(out), side(before)) < 1e-4,
        `${model}: and the view turned ${((ang(side(out), side(before)) * 180) / Math.PI).toFixed(3)} degrees (${far(before).toFixed(0)} m to ${far(out).toFixed(0)} m)`,
      );
      // what is under the pointer now: a thing draws the zoom to itself; bare ground a field away, or sky, does not
      const under = await h.page.evaluate(() => {
        const r = document.querySelector('#stage').getBoundingClientRect();
        const hit = window.sr.stage.cam.scene.solidAt(((700 - r.left) / r.width) * 2 - 1, -((150 - r.top) / r.height) * 2 + 1);
        return hit ? (hit.ground ? 'bare ground' : 'a thing') : 'the sky';
      });
      for (let i = 0; i < 16; i++) {
        await h.wheel(700, 150, -120);
        await h.wait(30);
      }
      await h.wait(1200);
      const back = await h.probe();
      const moved = len(sub(back.pivot, before.pivot));
      if (under === 'a thing')
        check(moved > 0, `${model}: 16 notches in with the pointer on a thing: the pivot went ${moved.toFixed(1)} m toward it`);
      else
        check(
          moved < 1e-6,
          `${model}: 16 notches in with the pointer left over ${under} far from the subject: the pivot moved ${moved.toFixed(4)} m, back at ${far(back).toFixed(1)} m`,
        );
    }
  },
  // A distance set by hand is not taken back by anything that happens by itself.
  async 'nothing frames a taken view again'(h) {
    await h.page.evaluate(() => window.sr.show('vehicle', true));
    await h.wait(2500);
    for (let i = 0; i < 8; i++) {
      await h.wheel(720, 420, 120);
      await h.wait(30);
    }
    await h.wait(1200);
    const set = await h.probe();
    await h.page.setViewportSize({ width: 1300, height: 820 });
    await h.wait(1500);
    check(
      Math.abs(far(await h.probe()) - far(set)) < 1e-6,
      `after a resize the distance set by the wheel is still ${far(set).toFixed(2)} m`,
    );
    await h.page.keyboard.press('h');
    await h.wait(1500);
    check(Math.abs(far(await h.probe()) - far(set)) < 1e-6, 'and after the panels are put away (H)');
    await h.page.keyboard.press('h');
    await h.page.evaluate(() => window.sr.stage.setExplode(0.3));
    await h.wait(2500);
    check(Math.abs(far(await h.probe()) - far(set)) < 1e-6, 'and after the slider takes the vehicle apart');
    await h.page.evaluate(() => window.sr.stage.setExplode(0));
    await h.page.setViewportSize({ width: 1440, height: 900 });
  },
  // In the chase view a distance set by hand used to be thrown away each time the vehicle shed something.
  async 'the chase view through staging'(h) {
    await h.page.evaluate(() => {
      window.sr.show('vehicle', true);
      window.sr.clock.seek(136);
      window.sr.stage.setCamera('chase');
    });
    await h.wait(2500);
    for (let i = 0; i < 6; i++) {
      await h.wheel(720, 420, 120);
      await h.wait(30);
    }
    await h.wait(1200);
    const set = await h.probe();
    await h.page.evaluate(() => {
      window.__frames = [];
      window.__recording = true;
      window.sr.clock.play();
    });
    await h.wait(22000);
    const frames = await h.page.evaluate(() => {
      window.__recording = false;
      window.sr.clock.pause();
      return window.__frames;
    });
    const end = frames.at(-1);
    check(
      Math.abs(far(end) - far(set)) < 1e-3 * far(set),
      `T+${set.clock.toFixed(0)} to T+${end.clock.toFixed(0)}, ${end.shape - set.shape} changes of shape: the distance set by hand, ${far(set).toFixed(1)} m, is ${far(end).toFixed(1)} m`,
    );
    let worst = 0;
    for (let i = 1; i < frames.length; i++) {
      const a = frames[i - 1];
      const b = frames[i];
      worst = Math.max(worst, len(sub(sub(b.p, a.p), sub(b.craftAt, a.craftAt))) / far(a) / Math.max(1e-3, (b.t - a.t) / 1000));
    }
    check(worst < 0.5, `beside the vehicle the eye never moved faster than ${(worst * 100).toFixed(1)} % of its distance a second`);
    check(len(sub(end.pivot, end.craft)) < 0.05, 'and the pivot is on the middle of what is left');
    await h.page.evaluate(() => {
      window.sr.clock.reset();
      window.sr.stage.setCamera('orbit');
    });
    await h.wait(800);
  },
  // Separation flown on the flight deck, at life's pace, in the chase view nobody has set. The booster was drawn at the
  // clock's instant and the capsule at its last tick, up to 5 ms apart: 10 m of jitter between them every frame. And the
  // view came onto the capsule by zooming in faster than its pivot came over, so the capsule swung to the frame's edge
  // and back. What the camera does at an event moves the view no faster than the event itself.
  async 'the chase view through separation, flown'(h) {
    await h.page.evaluate(() => {
      const sr = window.sr;
      sr.show('vehicle', true);
      sr.cockpit.enter();
    });
    await h.wait(2500);
    await h.page.evaluate(() => {
      const sr = window.sr;
      sr.cockpit.eventAt = -1e9;
      sr.cockpit.command('next'); // ignition: the sequencer and the autopilot fly the rest
      sr.stage.setCamera('chase');
      sr.clock.setRate(25);
      sr.clock.play(true);
    });
    // At 25 times to some seconds short of the booster's leaving, then at life's pace and recording, decided in the page on
    // the frame that gets there. (Decided from here, at T+149, it was a round trip late: a busy machine's page ran frames
    // of 2.5 s of the flight each meanwhile, and the separation could be past before the first frame was kept, which
    // failed this check and, left running, the next sequence's.)
    await h.page.evaluate(() => {
      const sr = window.sr;
      const near = () => {
        if (sr.clock.t < 140) return void requestAnimationFrame(near);
        sr.clock.setRate(1);
        sr.stage.cam.chase.home?.(); // (a view nobody has set: the one that frames what is left again)
        window.__frames = [];
        window.__recording = true;
      };
      requestAnimationFrame(near);
    });
    // and on by the flight's own clock until ten seconds after it has gone, however many frames a second that takes
    await h.page.waitForFunction(
      () => {
        if (!window.__recording) return false;
        const gone = window.__frames.find((f) => f.shed.some((s) => s[0] === 1));
        return gone ? window.sr.clock.t >= gone.clock + 10 : window.sr.clock.t >= 170;
      },
      null,
      { timeout: 600000, polling: 500 },
    );
    const frames = await h.page.evaluate(() => {
      window.__recording = false;
      return window.__frames;
    });
    try {
      separation(frames);
    } finally {
      // (put back whatever was found: a flight left running would be the next sequence's)
      await h.page.evaluate(() => {
        window.sr.cockpit.leave();
        window.sr.clock.reset();
        window.sr.stage.setCamera('orbit');
      });
      await h.wait(1500);
    }
  },

  // At the controls of the flight the mouse is still the camera's, in every rig offered, before ignition and after.
  async 'the mouse while flying'(h) {
    await h.page.evaluate(() => {
      window.sr.show('vehicle', true);
      window.sr.cockpit.enter();
    });
    await h.wait(2500);
    const under = await h.page.evaluate(() => document.elementFromPoint(720, 300)?.id);
    check(under === 'stage', `what is under the pointer over the view is the canvas (${under})`);
    const tried = async (when) => {
      for (const rig of await h.page.evaluate(() => window.sr.stage.cameras)) {
        await h.page.evaluate((r) => window.sr.stage.setCamera(r), rig);
        await h.wait(1800);
        const about = rig === 'chase' || rig === 'locked';
        const a = await h.probe();
        await h.drag(720, 300, 840, 260);
        // (600 ms of the camera's time, as it was 600 ms of the wall's on a machine that draws every frame)
        const b = await h.page.evaluate(() => window.__until(() => false, 0.6));
        // (beside the vehicle: it is moving, and the pad camera turns to follow it by itself)
        const turned =
          rig === 'pad'
            ? Math.hypot(b.craftNdc[0] - a.craftNdc[0], b.craftNdc[1] - a.craftNdc[1]) > 0.05
            : ang(a.dir, b.dir) > 0.02 || ang(side(a), side(b)) > 0.02;
        for (let i = 0; i < 5; i++) {
          await h.wheel(720, 300, about ? 120 : -120); // (out round the vehicle; a longer lens on board and at the pad camera)
          await h.wait(30);
        }
        // until the zoom has gone as far as it was asked, within a second of the camera's time (it was 900 ms of the wall's
        // after the wheel's 150, which a slow machine spent in a few frames of a tenth of a second each)
        const c = await h.page.evaluate(
          ([b, about]) => {
            const far = (s) => Math.hypot(s.p[0] - s.pivot[0], s.p[1] - s.pivot[1], s.p[2] - s.pivot[2]);
            return window.__until((p) => (about ? far(p) > 1.3 * far(b) : p.fov < 0.87 * b.fov), 1.05);
          },
          [b, about],
        );
        const zoomed = about ? far(c) > 1.3 * far(b) : c.fov < 0.87 * b.fov;
        check(
          turned && zoomed,
          `${when}, ${rig}: a drag ${turned ? 'turned' : 'DID NOT turn'} the view, the wheel ${zoomed ? 'zoomed' : 'DID NOT zoom'} it`,
        );
        await h.page.keyboard.press('0');
      }
    };
    await tried('on the pad');
    await h.page.keyboard.press('Space');
    await h.wait(4000);
    await tried('after ignition');
    await h.page.keyboard.press('Escape');
    await h.wait(2500);
  },
  // Flying free used to leave the orbit's pivot two metres in front of the lens.
  async 'free, and back to orbit'(h) {
    await h.page.evaluate(() => {
      window.sr.show('vehicle', true);
      window.sr.stage.setCamera('free');
    });
    await h.wait(1500);
    await h.page.keyboard.down('s');
    await h.wait(700);
    await h.page.keyboard.up('s');
    await h.wait(300);
    const free = await h.probe();
    await h.page.evaluate(() => window.sr.stage.setCamera('orbit'));
    await h.wait(1500);
    const orbit = await h.probe();
    check(len(sub(orbit.p, free.p)) < 1e-6, 'back in orbit the eye is where the free camera left it');
    check(far(orbit) > 10, `and turns about what it was looking at, ${far(orbit).toFixed(1)} m off, not a point just in front of the lens`);
  },

  // The near plane was put by the pivot's distance and the ground: orbiting the pad from 150 m it stood 19.5 m out and
  // cut pad 6's gantry, 15 m in front of the eye, clean away. It must stop short of whatever is nearest (Stage.uncut).
  async 'the near plane cuts nothing the camera passes'(h) {
    await h.page.evaluate(() => window.sr.show('pad', true));
    await h.wait(800);
    const poses = {
      'past pad 6’s gantry': [91, 4.2, 152, 14],
      'low over the scrub': [200, 2, 40, 2.2, -180, -130],
      'beside the service structure': [100, 20, 30, 20],
      'across the pad': [215, 9, 150, 14],
    };
    for (const [name, pose] of Object.entries(poses)) {
      const r = await h.page.evaluate(async (pose) => {
        const st = window.sr.stage;
        st.pose(...pose);
        for (let i = 0; i < 5; i++) await new Promise((done) => requestAnimationFrame(done));
        const eye = st.camera.position;
        const corner = Math.hypot(1, Math.tan((st.camera.fov * Math.PI) / 360) * Math.hypot(1, st.camera.aspect));
        const solids = st.walk.solids;
        solids.set(st.solidRoots());
        solids.gather(eye, 300, 300);
        return {
          reach: st.camera.near * corner,
          solid: solids.nearest(eye, 300),
          plant: st.setting.plantsClear?.(eye, 300) ?? 300,
          near: st.camera.near,
        };
      }, pose);
      const clear = Math.min(r.solid, r.plant);
      check(
        r.reach <= clear + 1e-6,
        `${name}: the plane's corner is ${r.reach.toFixed(2)} m out and the nearest thing ${clear.toFixed(2)} m`,
      );
      check(r.near >= Math.min(0.03, clear), `${name}: and it is no nearer than it need be (${r.near.toFixed(3)} m)`);
    }
    // From height the plane must also go OUT: the pad's slab lies 12 cm over the ground under it, and with the plane
    // 15 m from a free camera 20 km up (a quarter of the way to a pivot just in front of the lens) one step of the
    // depth buffer down there was 1.6 m: the site flickered, a hundred pixels a frame.
    for (const [name, height] of [
      ['20 km over the site, looking down', 20_000],
      ['2 km over the site, looking down', 2_000],
    ]) {
      const r = await h.page.evaluate(async (height) => {
        const st = window.sr.stage;
        st.setCamera('free');
        const V = st.cam.orbit.pivot.clone();
        st.cam.free.goTo(V.clone().set(0, height, 0), V.clone().set(35, height - 197, 0), true);
        for (let i = 0; i < 120; i++) await new Promise((done) => requestAnimationFrame(done));
        const eye = st.camera.position;
        const corner = Math.hypot(1, Math.tan((st.camera.fov * Math.PI) / 360) * Math.hypot(1, st.camera.aspect));
        const solids = st.walk.solids;
        solids.set(st.solidRoots());
        solids.gather(eye, 1e6, 1e6);
        const out = { reach: st.camera.near * corner, solid: solids.nearest(eye, 1e6), ground: eye.y, near: st.camera.near };
        st.setCamera('orbit');
        return out;
      }, height);
      const clear = Math.min(r.solid, r.ground);
      const step = clear ** 2 / (r.near * 2 ** 24);
      check(
        r.reach <= clear + 1e-6,
        `${name}: the plane's corner is ${r.reach.toFixed(0)} m out and the nearest thing ${clear.toFixed(0)} m`,
      );
      check(
        step < 0.03,
        `${name}: one step of depth at the ground is ${(step * 100).toFixed(1)} cm, under the 12 cm between the pad and the ground`,
      );
    }
  },
};

/** Thousands of frames of mixed input, and the promises checked on every one. */
async function soak(name, { touch = false, at = -4, fault = false } = {}) {
  const random = seeded(seed + (touch ? 1000 : 0) + Math.round(at));
  const pick = (list) => list[Math.floor(random() * list.length)];
  const h = await open(touch ? { touch, width: 390, height: 800 } : {});
  const { page } = h;
  await h.wait(2000);
  await page.evaluate((t) => {
    window.sr.clock.seek(t);
    window.sr.clock.play();
    window.__recording = true;
  }, at);
  // where the pointer may go: the part of the view the panels leave clear
  const area = touch ? { x0: 30, x1: 360, y0: 60, y1: 740 } : { x0: 430, x1: 1030, y0: 140, y1: 690 };
  const spot = () => [area.x0 + random() * (area.x1 - area.x0), area.y0 + random() * (area.y1 - area.y0)];
  const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'w', 'a', 's', 'd', 'q', 'e', 'r', 'f'];
  // The proof that the check below still catches what it is there for: with no hands on the view at all, the page is
  // made to turn the orbiting view 18 radians a second for 60 frames. Nearly every frame drawn while it turns the orbiting
  // view must be flagged: a share, and a turn by the second, so that it holds at any frame rate (0.3 radians a frame and
  // more than 20 frames counted, it caught 12 at 34 frames a second and none at 10).
  if (fault) {
    await h.wait(2200);
    await page.evaluate(() => {
      let n = 60;
      const cam = window.sr.stage.cam;
      const update = cam.update;
      // 18 radians a second of the time the rig is stepped through, which is what the check measures by, put into the
      // step itself: each frame's turn is 18 times that frame's own step, made before the rig says where the view is. (Turned
      // from a frame callback of its own, by the step of the frame before, it landed a frame late: where one frame ran
      // longer than the last the turn read as less than the check's 9 radians a second, and some 3 % of the faulted
      // frames went unflagged at any load, 12 % on a busy machine. And a turn of so much a frame was only 3 radians a
      // second at ten frames a second.)
      cam.update = function (dt, ...rest) {
        const faulted = n > 0 && cam.rig === 'orbit';
        if (faulted) cam.orbit.theta += 18 * dt;
        window.__turning = faulted;
        if (n > 0) n--;
        else cam.update = update;
        return update.call(this, dt, ...rest);
      };
    });
    await h.wait(1500);
  }
  for (let i = 0; i < (fault ? 0 : EVENTS); i++) {
    const r = random();
    const [x, y] = spot();
    if (touch && r < 0.35) await h.fingers([[x, y]], [spot()], 4 + Math.floor(random() * 6));
    else if (touch && r < 0.8) {
      const two = (cx, cy, s, a) => [
        [cx + s * Math.cos(a), cy + s * Math.sin(a)],
        [cx - s * Math.cos(a), cy - s * Math.sin(a)],
      ];
      const a = random() * 6.28;
      await h.fingers(
        two(x, y, 30 + random() * 80, a),
        two(x + (random() - 0.5) * 80, y + (random() - 0.5) * 80, 30 + random() * 120, a + (random() - 0.5) * 1.2),
        4 + Math.floor(random() * 6),
      );
    } else if (touch && r < 0.9) await page.touchscreen.tap(x, y);
    else if (r < 0.4) {
      const dir = random() < 0.5 ? -1 : 1;
      const pinch = random() < 0.25; // (a trackpad's pinch: small numbers, with ctrlKey)
      for (let k = 1 + Math.floor(random() * 6); k > 0; k--) {
        await h.wheel(x, y, dir * (pinch ? 2 + random() * 10 : pick([4, 16, 53, 120, 240, 480])), pinch);
        await h.wait(8 + random() * 20);
      }
    } else if (r < 0.62) {
      const shift = random() < 0.12;
      if (shift) await page.keyboard.down('Shift');
      await h.drag(x, y, ...spot(), pick(['left', 'left', 'left', 'right', 'middle']), 2 + Math.floor(random() * 8));
      if (shift) await page.keyboard.up('Shift');
    } else if (r < 0.84) {
      const key = pick(KEYS);
      await page.keyboard.down(key);
      await h.wait(30 + random() * 250);
      await page.keyboard.up(key);
    } else if (r < 0.9) await page.mouse.click(x, y);
    else if (r < 0.93) await page.mouse.dblclick(x, y);
    else if (r < 0.97) await page.keyboard.press('c');
    else await page.keyboard.press('0');
    if (random() < 0.3) await h.wait(random() * 120);
    if (i % 50 === 49) await page.evaluate(() => window.sr.stage.walk.active && window.sr.stage.exitWalk()); // (a double click on the crew goes on foot)
  }
  await h.wait(2500);
  const frames = await page.evaluate(() => {
    window.__recording = false;
    return window.__frames;
  });
  await h.browser.close();

  const fails = {
    'not a number': [],
    'under the ground': [],
    'the pivot moved without cause': [],
    'a zoom out moved or turned the view': [],
    'the subject was lost': [],
    'faster than the hands asked': [],
  };
  const rigs = {};
  /** For the self-check: what each frame was, so a faulted frame that went unflagged can say why. */
  const seen = [];
  let quiet = 9;
  let sinceIn = 9;
  let sinceAny = 9;
  let sinceChange = 9;
  let sinceShape = 9;
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1];
    const b = frames[i];
    const dt = Math.max(1e-3, (b.t - a.t) / 1000);
    rigs[b.rig] = (rigs[b.rig] ?? 0) + 1;
    const d = b.did;
    const moving = d.drag || d.pan || d.key || d.click || d.dbl || d.touch || b.keys || a.keys;
    sinceAny = moving || d.wheelIn || d.wheelOut ? 0 : sinceAny + dt;
    sinceIn = d.wheelIn || d.touch ? 0 : sinceIn + dt;
    sinceChange = a.rig !== b.rig || a.walking || b.walking || a.flying !== b.flying ? 0 : sinceChange + dt;
    sinceShape = a.shape !== b.shape ? 0 : sinceShape + dt;
    quiet = moving ? 0 : quiet + dt;
    if (b.walking || a.walking) continue;
    if (![...b.p, ...b.dir, ...b.pivot, b.fov].every(Number.isFinite)) fails['not a number'].push(i);
    if (b.clear < 0.15) fails['under the ground'].push([i, b.rig, b.clear.toFixed(3)]);
    const settled = sinceChange > 1.6 && !a.blend && !b.blend;
    const about = b.rig === 'chase' || b.rig === 'locked';
    const carried = a.craft && b.craft && (about || b.rig === 'onboard' || b.rig === 'pad') ? sub(b.craftAt, a.craftAt) : [0, 0, 0];
    const dist = Math.max(far(a), 0.05);
    if (settled && (b.rig === 'orbit' || about) && sinceShape > 1.5) {
      const moved = len(sub(sub(b.pivot, a.pivot), carried));
      if (!(quiet < 3 || sinceIn < 1.5 || a.journey || b.journey) && moved > 1e-4 * dist + 1e-6)
        fails['the pivot moved without cause'].push([i, b.rig, moved.toFixed(4)]);
    }
    if (settled && b.rig === 'orbit' && d.wheelOut && quiet > 3 && sinceIn > 1.5 && !a.journey && !b.journey) {
      const moved = len(sub(b.pivot, a.pivot));
      const turned = ang(side(a), side(b));
      // (the eye may come up round the pivot to stay above the ground: that is a turn with a cause)
      if (moved > 1e-6 || far(b) < far(a) * (1 - 1e-6) || (turned > 1e-4 && b.clear > 0.5))
        fails['a zoom out moved or turned the view'].push([i, moved.toExponential(1), turned.toExponential(1)]);
    }
    if (settled && b.rig === 'pad' && b.craftNdc) {
      const [x, y, z] = b.craftNdc;
      if (!(z < 1 && Math.abs(x) <= 1.02 && Math.abs(y) <= 1.02))
        fails['the subject was lost'].push([i, b.rig, x.toFixed(2), y.toFixed(2)]);
    }
    if (settled && (b.rig === 'orbit' || about)) {
      // the pivot in the middle of the clear part of the frame; about a vehicle, the pivot on the vehicle
      const [x, y] = b.pivotNdc;
      const off = about && b.craft && sinceShape > 1.5 ? len(sub(b.pivot, b.craft)) > 1.25 * b.radius + 0.01 : false;
      if (off || Math.abs(x) > 2e-3 || y < -0.02 || y > 0.55) fails['the subject was lost'].push([i, b.rig, x.toFixed(4), y.toFixed(3)]);
    }
    if (
      settled &&
      !d.drag &&
      !d.pan &&
      !d.touch &&
      !a.journey &&
      !b.journey &&
      sinceShape > 1.5 &&
      sinceAny > 0.05 &&
      (b.rig === 'orbit' || about)
    ) {
      // The rate is the camera's movement over the time its rig was stepped through to make it (Stage.camStepped), not
      // over the time between two frames as seen from here: a frame that runs long is made up for in the next, by the
      // same law, and against the wall clock that read as a lurch. So this holds every frame's step to what the coast
      // allows for the time it was stepped: 9 times its distance from the pivot a second (the fastest a flick is let coast).
      const stepped = b.stepped - a.stepped;
      const rate =
        stepped > 0 ? len(sub(sub(b.p, a.p), carried)) / dist / stepped : len(sub(sub(b.p, a.p), carried)) > 1e-6 * dist ? Infinity : 0;
      if (rate > 9) fails['faster than the hands asked'].push([i, b.rig, rate.toFixed(1)]);
    }
    if (fault) {
      const stepped = b.stepped - a.stepped;
      seen[i] = {
        i,
        rig: b.rig,
        stepped: +stepped.toFixed(4),
        between: +dt.toFixed(4),
        rate: +(stepped > 0 ? len(sub(sub(b.p, a.p), carried)) / dist / stepped : 0).toFixed(2),
        settled,
        journey: a.journey || b.journey,
        blend: a.blend || b.blend,
        shape: +sinceShape.toFixed(2),
        hands: !(sinceAny > 0.05),
      };
    }
  }
  const seconds = (frames.at(-1).t - frames[0].t) / 1000;
  console.log(
    `\n${name}: ${EVENTS} events, ${frames.length} frames in ${seconds.toFixed(0)} s, T${frames[0].clock.toFixed(0)} to T+${frames.at(-1).clock.toFixed(0)}, by rig ${JSON.stringify(rigs)}`,
  );
  if (fault) {
    // (a frame whose step was turned by the fault, from one drawn in the same rig: the frame's move is the fault's)
    const turned = new Set();
    for (let i = 1; i < frames.length; i++)
      if (frames[i].turning && frames[i].rig === 'orbit' && frames[i - 1].rig === 'orbit') turned.add(i);
    const caught = fails['faster than the hands asked'].filter(([i]) => turned.has(i)).length;
    const flagged = new Set(fails['faster than the hands asked'].map(([i]) => i));
    for (const i of turned) if (!flagged.has(i)) console.log('    unflagged', JSON.stringify(seen[i]));
    const share = turned.size ? caught / turned.size : 0;
    check(
      turned.size >= 10 && share >= 0.9,
      `a view turned 18 radians a second with no hand on it is caught: ${caught} of the ${turned.size} frames it turned the orbiting view flagged (${(100 * share).toFixed(0)} %, at least 90 % of at least 10)`,
    );
    return;
  }
  for (const [what, list] of Object.entries(fails))
    check(!list.length, `${what}: ${list.length}${list.length ? ` e.g. ${JSON.stringify(list.slice(0, 3))}` : ''}`);
  check(!h.errors.length, `errors on the page's console: ${h.errors.length}${h.errors.length ? ` e.g. ${h.errors[0]}` : ''}`);
}

const named = (name) => !only || only.split('|').some((o) => name.includes(o));
if (Object.keys(sequences).some(named)) {
  const h = await open();
  await h.page.evaluate(() => window.sr.stage.setAutoRotate(false));
  for (const [name, run] of Object.entries(sequences)) {
    if (!named(name)) continue;
    console.log(`\n${name}`);
    await run(h);
  }
  check(!h.errors.length, `errors on the page's console: ${h.errors.length}${h.errors.length ? ` e.g. ${h.errors[0]}` : ''}`);
  await h.browser.close();
}
const soaks = {
  'soak, from the pad through liftoff': {},
  'soak, through staging': { at: 128 },
  'soak, fingers on a phone': { touch: true },
  'proof, a turn nobody asked for': { fault: true },
};
for (const [name, how] of Object.entries(soaks)) if (named(name)) await soak(name, how);
console.log(failed ? `\n${failed} failed` : '\nall held');
process.exit(failed ? 1 : 0);
