// Walk from the crew's authored starting point, ride the crew lift and board through the fairing cover.
// SR_URL=http://localhost:5180/ node tools/soyuz-boarding-test.mjs [--flight soyuz-3]
import assert from 'node:assert/strict';
import { flights } from '../missions/index.ts';
import { launch, open, opt, url } from './browser.mjs';

const args = process.argv.slice(2);
const filter = opt(args, '--flight', '');
const target = url(args);
const browser = await launch();
async function choose(page, text) {
  await page.keyboard.press('e');
  const item = page.locator('.wheel [data-item]').filter({ hasText: text });
  await item.first().waitFor({ timeout: 4000 });
  await page.keyboard.press(String(Number(await item.first().getAttribute('data-item')) + 1));
}
async function walkTo(page, points) {
  await page.evaluate((points) => {
    const { body } = window.sr.stage.walk;
    for (const [x, z] of points) {
      let remaining = 100;
      while (true) {
        const dx = x - body.position.x,
          dz = z - body.position.z;
        const d = Math.hypot(dx, dz);
        if (d <= 0.09) break;
        if (d > remaining - 0.0002) throw Error(`Blocked toward ${[x, z]} at ${body.position.toArray()}`);
        remaining = d;
        body.move((0.08 * dx) / d, (0.08 * dz) / d, 0.05);
      }
    }
  }, points);
}
async function aim(page, target) {
  await page.evaluate(([x, y, z]) => {
    const w = window.sr.stage.walk,
      p = w.body.position;
    w.yaw = Math.atan2(p.x - x, p.z - z);
    w.pitch = Math.atan2(y - p.y - w.eye, Math.hypot(x - p.x, z - p.z));
  }, target);
  await page.waitForTimeout(350);
}
try {
  const missions = flights.filter((f) => f.id.includes('/soyuz/') && f.id.endsWith(filter));
  assert.ok(missions.length, 'No matching Soyuz launch site');
  for (const flight of missions) {
    for (const seat of flight.models.find((model) => model.id === 'vehicle').seats) {
      const { page, close, errors } = await open(browser, `${target}#${flight.id}/site/pad`, { timeout: 120000 });
      try {
        const site31 = flight.site.name.includes('31');
        const lift = await page.evaluate((seat) => {
          const sr = window.sr;
          sr.clock.pause();
          if (sr.clock.t < seat.open[0] || sr.clock.t > seat.open[1]) throw Error(`Opening clock outside boarding window: ${sr.clock.t}`);
          if (!sr.stage.enterWalk(seat.figure)) throw Error('Cannot enter walk');
          const pad = sr.stage.staged[sr.flight.models.findIndex((m) => m.id === 'pad')].full;
          const car = pad.getObjectByName('SoyuzCrewLift');
          const pos = car.getWorldPosition(car.position.clone());
          return pos.toArray();
        }, seat);
        await walkTo(page, [
          ...(site31
            ? [
                [-35, 3.5],
                [-21, 3.5],
                [-14, 3.5],
              ]
            : [
                [-19, 5.6],
                [-16.6, 3.3],
              ]),
          [-14, 11],
          [-8, 15],
          [4, 15],
          [lift[0] * 1.19, lift[2] * 1.19],
          [lift[0], lift[2]],
        ]);
        await aim(page, [lift[0] * 1.016, lift[1], lift[2] * 1.016]);
        await choose(page, 'Ride to the boarding platform');
        await page.evaluate(() => {
          const { walk, onFoot } = window.sr.stage;
          // Advance the moving car and its standing passenger in the stage's normal frame order.
          for (let frame = 0; frame < 1200 && walk.body.position.y < 33.285; frame++) {
            onFoot.runWorks(1 / 20);
            walk.update(1 / 20);
          }
          if (Math.abs(walk.body.position.y - 33.3) > 0.05) throw Error(`Lift stopped with the walker at ${walk.body.position.toArray()}`);
        });
        const r = Math.hypot(lift[0], lift[2]);
        await walkTo(page, [[(2.8 * lift[0]) / r, (2.8 * lift[2]) / r]]);
        await aim(page, [(1.65 * lift[0]) / r, 34.685, (1.65 * lift[2]) / r]);
        await choose(page, `Board: ${seat.label}`);
        await page.waitForFunction(() => !!window.sr.stage.onFoot.seated, undefined, { timeout: 5000 });
        assert.equal(await page.evaluate(() => window.sr.stage.onFoot.seated.seat), seat.node);
        assert.deepEqual(errors, []);
        console.log(`PASS ${flight.id} · ${seat.label}`);
      } finally {
        await close();
      }
    }
  }
} finally {
  await browser.close();
}
