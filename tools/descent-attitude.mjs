// A camera change and a pilot command after separation must leave the detached sphere's attitude alone.
import assert from 'node:assert/strict';
import { launch, open, url } from './browser.mjs';

const browser = await launch();
try {
  for (const flight of ['vostok/vostok-1', 'voskhod/voskhod-2']) {
    const { page, close, errors } = await open(browser, url(process.argv.slice(2)) + '#ussr/' + flight + '/fly', { timeout: 240000 });
    try {
      const release = await page.evaluate(() => {
        const { cockpit, clock } = window.sr;
        clock.pause();
        return cockpit.run.samples.find((s) => s.passive).t;
      });
      async function draw(at) {
        await page.evaluate((t) => window.sr.clock.seek(t), at);
        await page.waitForFunction((t) => Math.abs(window.sr.stage.lifted.t - t) < 1e-5, at, { timeout: 60000 });
        return page.evaluate(() => window.sr.stage.main.quaternion.toArray());
      }
      const released = await draw(release);
      await page.keyboard.press('c');
      await page.keyboard.press('g');
      await page.keyboard.down('w');
      const later = await draw(release + 1);
      await page.keyboard.up('w');
      const difference = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(a.reduce((sum, x, i) => sum + x * b[i], 0))));
      // The stage uses the Earth-fixed frame. Earth's own rotation is visible in a one-second interval.
      assert.ok(difference(released, later) < 0.002, flight + ' detached sphere rotated in one second');
      const back = await draw(release);
      assert.ok(difference(back, released) < 1e-5, flight + ' camera or rewind changed the rendered release orientation');
      const result = await page.evaluate(() => {
        const { cockpit } = window.sr;
        return { hand: cockpit.free, engine: cockpit.sampleAt(cockpit.clock.t).burning.length };
      });
      assert.deepEqual(result, { hand: false, engine: 0 });
      if (flight === 'vostok/vostok-1') {
        await draw(1800);
        await page.keyboard.press('g');
        await page.waitForFunction(() => window.sr.cockpit.free);
        await page.keyboard.down('d');
        await draw(1804);
        await page.keyboard.up('d');
        await draw(1808);
        await page.evaluate(() => {
          const { cockpit, clock, flight } = window.sr;
          const module = flight.plan.craft[0].joints.find((x) => x.gone.includes('instrument'));
          const parting = flight.plan.events.find((e) => e.do.some((action) => action.separate === module.id));
          cockpit.obey('descent:' + parting.id);
          clock.pause();
        });
        const at = await page.evaluate(() => window.sr.cockpit.partedBy);
        assert.ok(at >= 1800 && at < 1820);
        const initial = await draw(at);
        await page.keyboard.down('w');
        const unpowered = await draw(at + 5);
        await page.keyboard.up('w');
        assert.ok(difference(initial, unpowered) < 0.002, 'held stick turned the manually released sphere');
        assert.equal(await page.evaluate(() => window.sr.cockpit.can('retro')), false);
        await draw(1802);
        await page.keyboard.down('w');
        await draw(1806);
        await page.keyboard.up('w');
        await draw(at + 5);
        const branch = await page.evaluate(() => {
          const { cockpit } = window.sr;
          const log = cockpit.hand.log.map((entry) => entry.t);
          return { sorted: log.every((t, i) => i === 0 || t >= log[i - 1]), last: log.at(-1), canFire: cockpit.can('retro') };
        });
        assert.ok(branch.sorted && branch.last > 1804 && branch.last <= at && !branch.canFire);
      }
      assert.deepEqual(errors, []);
      console.log(flight, release, difference(released, later), 'rad in first second');
    } finally {
      await close();
    }
  }
} finally {
  await browser.close();
}
