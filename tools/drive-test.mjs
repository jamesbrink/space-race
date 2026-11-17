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
import { launch, open, opt, url as urlOf, checks } from './browser.mjs';
import { globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const only = opt(args, '--flight', null);
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

const browser = await launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const { check, failures } = checks();

for (const id of ids) {
  console.log(id);
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
          sr.stage.onFoot.exitWalk();
          sr.stage.enterWalk(sr.flight.models.find((m) => m.walker).id, { x: p.x, y: p.y, z: p.z + 3.5 });
          window.theCar = car;
          sr.stage.onFoot.aim = { vehicle: car };
          return { boarded: sr.stage.onFoot.walkDrive() };
        }, name);
        if (start.error) continue;
        if (!start.boarded) {
          console.log(`  ${name}: has nowhere to sit (not driven)`);
          continue;
        }
        await wait(2500);
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
          if (lock) await page.keyboard.down(lock);
          await page.keyboard.down('w');
          let ahead = 0;
          for (let i = 0; i < 30 && ahead < body.length + 0.5; i++) {
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
        if (best < body.length && named) console.log(`    (held, by ${named})`);
        if (body.track)
          check(
            body.half <= body.track / 2 + 0.5,
            `${where}: its width is its body's: half ${body.half.toFixed(2)} m of a ${body.track.toFixed(2)} m track`,
          );
      }
    }
    if (!tried.size) console.log('  (no vehicle in view at any of the hours)');
    check(errors.length === 0, `${id}: no errors on the page${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
  } catch (e) {
    check(false, `${id}: ${e}`);
  } finally {
    await close();
  }
}
await browser.close();
console.log(failures.length ? `${failures.length} failed` : 'all held');
process.exit(failures.length ? 1 : 0);
