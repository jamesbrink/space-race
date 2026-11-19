// In Chrome, fly Freedom 7 until its booster has left. Set up a controlled side-on return at two
// speeds, then let the live flight deck fly both encounters. Read the rendered vehicle and pieces.
// pnpm test:impact [url] [--frames directory]
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { launch, open, opt, url } from './browser.mjs';

const args = process.argv.slice(2);
const frames = opt(args, '--frames', null);
const address = `${url(args)}#usa/mercury/mr-3-freedom-7/fly`;
const browser = await launch();
try {
  for (const [label, speed] of [
    ['glancing', 6],
    ['hard', 35],
  ]) {
    const { page, close, errors } = await open(browser, address, { timeout: 180000, viewport: [1100, 680] });
    try {
      const result = await page.evaluate(async (speed) => {
        const { cockpit, stage, clock } = window.sr;
        const source = (path) => import(new URL(path, document.baseURI).href);
        const { autopilot } = await source('src/sim/autopilot.ts');
        const { add, scale } = await source('src/world/frames.ts');
        const { aboutAxis, multiply, turn } = await source('src/sim/rigid.ts');
        clock.pause();
        const pilot = autopilot(cockpit.vehicle);
        let state = cockpit.state;
        while (state.t < 250 && (!state.separation || state.t < state.separation.t + 1)) state = cockpit.tick(state, pilot);
        if (!state.separation) throw new Error('the spacecraft did not separate');
        const run = cockpit.run;
        const booster = run.sheds.get(cockpit.roles.separation.id);
        const loose = booster.at(state.t);
        const side = turn(loose.q, [0, 1, 0]);
        const axial = turn(loose.q, [1, 0, 0]);
        // The only imposed inputs are the pose and relative velocity before contact. A short
        // approach from the side puts the capsule beside the rim rather than over the mating face.
        state = {
          ...state,
          q: multiply(loose.q, aboutAxis([0, 0, 1], 0.7)),
          w: [0, 0, 0],
          r: add(add(loose.r, scale(axial, booster.shedder.def.to.value - booster.shedder.release.centre)), scale(side, -3)),
          v: add(loose.v, scale(side, speed)),
        };
        const start = state.t;
        run.samples.length = cockpit.kept;
        run.samples.push(cockpit.vehicle.sample(state));
        cockpit.kept = run.samples.length;
        const coast = autopilot(cockpit.vehicle, { launch: false, pitch: false, yaw: false, roll: false, sequence: false });
        let first,
          spin = 0;
        while (state.t < start + 2) {
          const free = cockpit.vehicle.tick(state, coast);
          state = cockpit.tick(state, coast);
          const hit = cockpit.hardestImpact;
          if (!first && hit && hit.t >= start) {
            first = hit.t;
            spin = Math.hypot(...state.w.map((rate, i) => rate - free.w[i]));
          }
        }
        cockpit.state = state;
        stage.setAutoRotate(false);
        stage.setCamera('chase');
        const chase = stage.cam.chase;
        chase.zoomer.set(Math.log(14));
        chase.distance = 14;
        chase.handSet = true;
        stage.frozen = true;
        return { start, first, spin, hit: cockpit.hardestImpact };
      }, speed);
      assert.ok(result.first > result.start && result.spin > 0.01, `${label}: no impact-induced spin: ${JSON.stringify(result)}`);
      const read = async (t) => {
        await page.evaluate((t) => window.sr.clock.seek(t), t);
        await page.waitForFunction((t) => Math.abs(window.sr.stage.lifted.t - t) < 1e-6, t);
        return page.evaluate(() => {
          const { stage } = window.sr;
          const pieces = stage.show.breakupReport().map((p) => ({
            ...p,
            local: stage.main.worldToLocal(stage.main.position.clone().fromArray(p.position)).toArray(),
          }));
          return { q: stage.main.quaternion.toArray(), pieces };
        });
      };
      const before = await read(result.first - 0.02);
      const after = await read(result.first + 0.45);
      const angle = 2 * Math.acos(Math.min(1, Math.abs(before.q.reduce((s, q, i) => s + q * after.q[i], 0))));
      assert.ok(angle > 0.02, `${label}: rendered spacecraft turned only ${angle} rad`);
      assert.equal(before.pieces.length, 0);
      assert.equal(after.pieces.length > 0, label === 'hard', JSON.stringify(after.pieces));
      if (label === 'hard') {
        const early = await read(result.first + 0.08);
        const pack = (s) => s.pieces.find((p) => p.physical && p.source === 'active');
        assert.ok(pack(early) && pack(after), 'an assembly left the active capsule');
        const drift = Math.hypot(...pack(after).local.map((n, i) => n - pack(early).local[i]));
        assert.ok(drift > 0.1, `released ${pack(after).name} moved only ${drift} m in the capsule frame`);
        assert.ok(
          after.pieces.some((p) => p.source === 'adapter-clamp'),
          'the struck booster shed a piece',
        );
        console.log(
          `${pack(after).name} moved ${drift.toFixed(2)} m in the capsule frame; visible pieces: ${after.pieces.map((p) => p.name).join(', ')}`,
        );
      }
      assert.deepEqual(await read(result.first - 0.02), before);
      assert.deepEqual(await read(result.first + 0.45), after);
      console.log(
        `${label}: ${((result.spin * 180) / Math.PI).toFixed(1)} deg/s added by impact, ${((angle * 180) / Math.PI).toFixed(1)}° rendered turn, ${after.pieces.length} loose pieces`,
      );
      if (frames) {
        const dir = join(frames, label);
        await mkdir(dir, { recursive: true });
        await page.keyboard.press('KeyH');
        for (let i = 0; i < 38; i++) {
          await read(Math.max(result.start, result.first - 0.22 + i / 24));
          await page.screenshot({ path: join(dir, `${String(i).padStart(3, '0')}.png`) });
        }
      }
      assert.deepEqual(errors, []);
    } finally {
      await close();
    }
  }
  // A structure struck: Freedom 7, a second and a half up, pushed sideways into whatever of its pad stands nearest. The page's
  // own deck flies it (the site's solids fetched by the page), and says what was struck; the rendered vehicle is left
  // outside it. Both looks.
  {
    const { page, close, errors } = await open(browser, address, { timeout: 180000, viewport: [1100, 680] });
    try {
      const result = await page.evaluate(async () => {
        const { cockpit, stage, clock } = window.sr;
        const source = (path) => import(new URL(path, document.baseURI).href);
        const { autopilot } = await source('src/sim/autopilot.ts');
        const { add, scale, siteFrame, siteToEcefDirection, ecefToSite } = await source('src/world/frames.ts');
        const { frameOf } = await source('src/world/earthframe.ts');
        clock.pause();
        const solids = cockpit.pageHost.solids?.();
        if (!solids) throw new Error('the page has no solids for the site');
        const site = siteFrame(cockpit.flight.site);
        const frame = frameOf(cockpit.flight);
        const pilot = autopilot(cockpit.vehicle);
        let state = cockpit.state;
        while (state.t < 1.5) state = cockpit.tick(state, pilot);
        if (cockpit.hardestImpact) throw new Error(`struck before it was pushed: ${JSON.stringify(cockpit.hardestImpact)}`);
        // the nearest thing standing beside it, looked for round the compass at half its height
        const here = ecefToSite(site, frame.toFixed(state.r, state.t));
        let nearest = null;
        for (let k = 0; k < 32; k++) {
          const d = [Math.cos((k * Math.PI) / 16), 0, Math.sin((k * Math.PI) / 16)];
          const hit = solids.world.sweep(here, [here[0] + 80 * d[0], here[1], here[2] + 80 * d[2]], 0.9, state.t);
          if (hit && (!nearest || hit.fraction < nearest.fraction)) nearest = { ...hit, d };
        }
        if (!nearest) throw new Error('nothing stands beside the vehicle');
        // the one imposed input: 40 m/s toward it (it is there in half a second, still beside what it was aimed at)
        const start = state.t;
        state = { ...state, v: add(state.v, scale(frame.toInertial(siteToEcefDirection(site, nearest.d), state.t), 40)) };
        cockpit.run.samples.length = cockpit.kept;
        cockpit.run.samples.push(cockpit.vehicle.sample(state));
        cockpit.kept = cockpit.run.samples.length;
        const coast = autopilot(cockpit.vehicle, { launch: false, pitch: false, yaw: false, roll: false, sequence: false });
        let first = null;
        while (state.t < start + 12 && !state.landing) {
          state = cockpit.tick(state, coast);
          if (!first && cockpit.hardestImpact) first = { ...cockpit.hardestImpact };
          if (first && state.t > first.t + 1.5) break;
        }
        cockpit.state = state;
        stage.setAutoRotate(false);
        stage.setCamera('chase');
        const chase = stage.cam.chase;
        chase.zoomer.set(Math.log(45));
        chase.distance = 45;
        chase.handSet = true;
        stage.frozen = true;
        // where the hull is at the end, against the site: no sphere of it in anything it was not in at liftoff
        return { start, first, toward: `${nearest.model}/${nearest.node}`, away: 80 * nearest.fraction, end: state.t };
      });
      assert.ok(result.first, `nothing was struck: ${JSON.stringify(result)}`);
      assert.match(result.first.on, /^pad\//, `what was struck is of the pad: ${JSON.stringify(result.first)}`);
      assert.ok(result.first.t > result.start && result.first.speed > 1, JSON.stringify(result.first));
      console.log(
        `structure: pushed toward ${result.toward}, ${result.away.toFixed(1)} m off; struck ${result.first.name} (${result.first.on}) at T+${result.first.t.toFixed(2)} s, ${result.first.speed.toFixed(1)} m/s, ${(result.first.energy / 1000).toFixed(0)} kJ`,
      );
      for (const look of ['real', 'cel']) {
        await page.evaluate((look) => window.sr.stage.setLook(look), look);
        const seen = [];
        for (const t of [result.first.t - 0.3, result.first.t, result.first.t + 1]) {
          await page.evaluate((t) => window.sr.clock.seek(t), t);
          await page.waitForFunction((t) => Math.abs(window.sr.stage.lifted.t - t) < 1e-6, t);
          seen.push(await page.evaluate(() => window.sr.stage.main.position.toArray()));
          if (frames) {
            const dir = join(frames, 'structure');
            await mkdir(dir, { recursive: true });
            await page.screenshot({ path: join(dir, `${look}-${seen.length}.png`) });
          }
        }
        // the rendered vehicle is somewhere, and moving, through the strike
        assert.ok(
          seen.every((p) => p.every(Number.isFinite)),
          `${look}: the vehicle is drawn`,
        );
        assert.ok(Math.hypot(...seen[0].map((v, i) => v - seen[2][i])) > 0.5, `${look}: it moved through the strike`);
      }
      assert.deepEqual(errors, []);
    } finally {
      await close();
    }
  }
} finally {
  await browser.close();
}
