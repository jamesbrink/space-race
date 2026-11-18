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
      assert.deepEqual(errors, []);
      console.log(flight, release, difference(released, later), 'rad in first second');
    } finally {
      await close();
    }
  }
} finally {
  await browser.close();
}
