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
} finally {
  await browser.close();
}
