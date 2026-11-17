// Every vehicle at every launch site can be driven forward a car's length from where it stands, or the test names what real
// thing is in its way (#29: Vostok 1's GAZ-21 would not go forward from where it stood at 07:50: it was measured with its
// door open and was taken for a metre wider than it was, so a wall's corner it cleared held it).
//   node tools/drive-test.mjs [url] [--flight <id>]      (default url: http://localhost:5180/)
// For each flight that has a site and a walker, the clock is put at a few hours round liftoff (the clock paused, the hardware
// let catch it up) and every vehicle in view is got into with the real keys and driven for up to six seconds a try
// with W: straight, then on the right lock and on the left. It passes if it gets a car's length (its nose to its tail) along
// the way it first faced. If it does not, it passes only where the drive says what real thing held it (not itself, in another level of detail) (`Vehicle.blockedBy`: the mesh
// and the nodes it hangs from; or the interlock of the function that drives it), and fails where it is held by nothing it can
// name. Its width, as the drive has measured it, must be about its track and no more (an open door is not part of it).
// A try is timed by the page's own seconds as the stage counts them (each frame's, as it is held to a tenth of a second),
// not the machine's: a busy machine drives as far as an idle one. A vehicle standing just where it was tried at an earlier
// hour of the same day is not tried again (the same car in the same place). The flights are driven on --jobs pages at once
// (default 4), each flight's lines printed together when it is done.
//   node tools/drive-test.mjs [url] [--flight <id>] [--jobs n]
import { launch, open, opt, url as urlOf } from './browser.mjs';
import { globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const only = opt(args, '--flight', null);
const jobs = Math.max(1, Number(opt(args, '--jobs', '4')) || 4);
const url = urlOf(args);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ids = [];
for (const file of globSync('missions/*/*/flights/*/flight.ts', { cwd: root })) {
  const { flight } = await import(pathToFileURL(join(root, file)).href);
  if (flight.surroundings && flight.models.some((m) => m.walker) && (!only || flight.id === only)) ids.push(flight.id);
}
ids.sort();
/** Seconds from liftoff at which the day is looked at: the vehicles of the morning, the hours before and the hour after. */
const SAMPLES = [-3 * 3600, -4500, -3000, -900, 600];

/** Seconds of driving a try is given, as the page counts them. */
const TRY = 6;

const browser = await launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const failures = [];

/** Drive every vehicle of one flight's day; its lines into `lines`. */
async function driveFlight(id, lines) {
  const check = (ok, what) => {
    lines.push(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`);
    if (!ok) failures.push(what);
    return ok;
  };
  const say = (line) => lines.push(line);
  const { page, errors, close } = await open(browser, `${url}#${id}/site/pad`, {
    viewport: [800, 500],
    console: [],
    wait: () => window.sr?.stage && document.querySelector('.loading.done'),
    timeout: 180_000,
  });
  const wait = (ms) => page.waitForTimeout(ms);
  try {
    await page.evaluate(() => Promise.allSettled(window.sr.stage.arriving ?? []));
    await page.evaluate(() => {
      window.sr.demo.stop(true);
      window.sr.demo.start = () => {};
      window.sr.stage.setAutoRotate?.(false);
      window.sr.clock.pause();
    });
    await page.mouse.click(400, 100);
    const tried = new Set();
    /** Where each vehicle has been tried from today: its name, then its place to a centimetre and its heading to a tenth of a degree. */
    const triedAt = new Set();
    for (const at of SAMPLES) {
      await page.evaluate((t) => window.sr.clock.seek(t), at);
      for (let i = 0; i < 300 && (await page.evaluate(() => window.sr.stage.catchingUp)); i++) await wait(100);
      const seen = await page.evaluate(() => {
        const found = [];
        window.sr.stage.scene.traverse((o) => {
          if (!o.userData.vehicle || !o.name) return;
          for (let p = o; p; p = p.parent) if (!p.visible) return;
          found.push({ name: o.name });
        });
        return found;
      });
      // (at each hour: what stands round it, people and cars, is not the same all day)
      for (const { name } of seen) {
        tried.add(name);
        // stand by it and get in at its wheel, as a look at it and E would
        const start = await page.evaluate((name) => {
          const { sr } = window;
          let car = null;
          sr.stage.scene.traverse((o) => {
            if (car || o.name !== name || !o.userData.vehicle) return;
            for (let p = o; p; p = p.parent) if (!p.visible) return;
            car = o;
          });
          if (!car) return { error: 'gone' };
          const p = car.getWorldPosition(car.position.clone());
          const turn = car.getWorldQuaternion(car.quaternion.clone());
          const ahead = car.getWorldDirection(p.clone());
          const pose = `${name} ${[p.x, p.y, p.z].map((x) => x.toFixed(2)).join(',')} ${((Math.atan2(ahead.x, ahead.z) * 180) / Math.PI).toFixed(1)} ${turn.w.toFixed(3)}`;
          if (window.theTried?.has(pose)) return { error: 'tried', pose };
          (window.theTried ??= new Set()).add(pose);
          sr.stage.onFoot.exitWalk();
          sr.stage.enterWalk(sr.flight.models.find((m) => m.walker).id, { x: p.x, y: p.y, z: p.z + 3.5 });
          window.theCar = car;
          sr.stage.onFoot.aim = { vehicle: car };
          return { boarded: sr.stage.onFoot.walkDrive() };
        }, name);
        if (start.error === 'tried') {
          triedAt.add(start.pose);
          continue;
        }
        if (start.error) continue;
        if (!start.boarded) {
          say(`  ${name}: has nowhere to sit (not driven)`);
          continue;
        }
        // (seated: as long as getting in takes, and on a busy machine with four pages at once that is more than it was alone)
        await wait(2500);
        for (let i = 0; i < 100 && !(await page.evaluate(() => Boolean(window.sr.stage.onFoot.wheel))); i++) await wait(200);
        const body = await page.evaluate(() => {
          const w = window.sr.stage.onFoot.wheel;
          if (!w) return null;
          const track = Number(w.root.userData.track);
          return {
            length: w.nose + w.tail,
            half: w.half,
            track: Number.isFinite(track) && track > 0 ? track : null,
            nose: w.nose,
            tail: w.tail,
          };
        });
        if (!body) {
          check(false, `${name} at ${at / 60} min: got to the wheel`);
          continue;
        }
        const refusal = await page.evaluate(() => window.sr.stage.onFoot.wheelRefusal);
        let best = 0;
        let held = null;
        // (a machine the function that drives it will not let go is not tried: it says why)
        for (const lock of refusal ? [] : [null, 'd', 'a']) {
          // (each try from where it first stood)
          await page.evaluate(() => {
            const w = window.sr.stage.onFoot.wheel;
            if (window.theBegin) Object.assign(w.motion, window.theBegin, { speed: 0, steer: 0, halted: 0 });
            else window.theBegin = { x: w.motion.x, z: w.motion.z, heading: w.motion.heading };
          });
          // (the page's own seconds while it is driven: each frame's, held to a tenth as the stage holds it)
          await page.evaluate(() => {
            window.theDriven = 0;
            window.theDriving = true;
            let last = performance.now();
            const tick = (now) => {
              window.theDriven += Math.min((now - last) / 1000, 0.1);
              last = now;
              if (window.theDriving) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          });
          if (lock) await page.keyboard.down(lock);
          await page.keyboard.down('w');
          let ahead = 0;
          // (and never more than two minutes of the machine's)
          for (let i = 0; i < 600 && ahead < body.length + 0.5 && (await page.evaluate(() => window.theDriven)) < TRY; i++) {
            await wait(200);
            ahead = Math.max(
              ahead,
              await page.evaluate(() => {
                const { motion } = window.sr.stage.onFoot.wheel;
                const b = window.theBegin;
                return (motion.x - b.x) * Math.cos(b.heading) - (motion.z - b.z) * Math.sin(b.heading);
              }),
            );
          }
          held = (await page.evaluate(() => window.sr.stage.onFoot.wheel?.blockedBy)) ?? held;
          await page.evaluate(() => {
            window.theDriving = false;
          });
          await page.keyboard.up('w');
          if (lock) await page.keyboard.up(lock);
          best = Math.max(best, ahead);
          if (best >= body.length) break;
        }
        // put it back where it stood, and out of it
        await page.evaluate(() => {
          const w = window.sr.stage.onFoot.wheel;
          if (!window.theBegin) return;
          Object.assign(w.motion, window.theBegin, { speed: 0, steer: 0, halted: 0 });
          w.drive(0, 0, 1e-4, { ground: () => null, ahead: () => null });
          window.theBegin = null;
        });
        await page.evaluate(() => window.sr.stage.onFoot.walkAlight());
        await wait(2500);
        const where = `${name} at ${at >= 0 ? '+' : '-'}${Math.abs(at / 60)} min`;
        // (held by a mesh that hangs from a node of its own name is held by itself, in another level of detail: not a real thing)
        const own = Boolean(held?.split(' < ').includes(name));
        const named = refusal ? `held by its function: ${refusal}` : own ? null : held;
        check(
          best >= body.length || Boolean(named),
          `${where}: ${best.toFixed(1)} of ${body.length.toFixed(1)} m forward${named ? `, held by ${named}` : own ? `, held by ITSELF (${held})` : ''}`,
        );
        if (best < body.length && named) say(`    (held, by ${named})`);
        if (body.track)
          check(
            body.half <= body.track / 2 + 0.5,
            `${where}: its width is its body's: half ${body.half.toFixed(2)} m of a ${body.track.toFixed(2)} m track`,
          );
      }
    }
    if (!tried.size) say('  (no vehicle in view at any of the hours)');
    if (triedAt.size) say(`  (${triedAt.size} not tried again: standing where it was tried at an earlier hour)`);
    check(errors.length === 0, `${id}: no errors on the page${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
  } catch (e) {
    check(false, `${id}: ${e}`);
  } finally {
    await close();
  }
}

// --jobs pages at once; each flight's lines printed together when it is done
const began = Date.now();
const queue = [...ids];
await Promise.all(
  Array.from({ length: Math.min(jobs, queue.length) }, async () => {
    for (let id = queue.shift(); id; id = queue.shift()) {
      const lines = [];
      const t0 = Date.now();
      try {
        await driveFlight(id, lines);
      } catch (e) {
        lines.push(`  FAIL ${id}: the run stopped: ${e?.stack ?? e}`);
        failures.push(id);
      }
      console.log(`${id} (${((Date.now() - t0) / 1000).toFixed(0)} s)\n${lines.join('\n')}`);
    }
  }),
);
await browser.close();
console.log(`(${((Date.now() - began) / 60000).toFixed(1)} min on ${jobs} pages)`);
console.log(failures.length ? `${failures.length} failed` : 'all held');
process.exit(failures.length ? 1 : 0);
