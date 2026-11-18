/** Drive the real Fly decks with buttons and keys, including a reload partway through a burn. */
import assert from 'node:assert/strict';
import { launch, open, url } from './browser.mjs';

const base = url(process.argv.slice(2).filter((arg) => arg !== '--primary')).replace(/\/$/, '');
const browser = await launch();
const ready = () => document.querySelector('.loading.done');
async function trial(flight, fn) {
  const { page, errors, close } = await open(browser, base + '/#usa/' + flight + '/fly', { wait: ready, timeout: 120000 });
  try {
    const button = (cmd) => page.locator('button[data-do="' + cmd + '"]:visible').first();
    const tick = () => page.evaluate(() => window.sr.docking.t);
    const wait = (phase) => page.waitForFunction((phase) => window.sr.docking.phase === phase, phase, { timeout: 60000 });
    const fast = async () => {
      for (let i = 0; i < 4; i++) await page.keyboard.press(']');
    };
    await fn({ page, button, tick, wait, fast });
    assert.deepEqual(errors, []);
    console.log(flight + ' passed');
  } finally {
    await close();
  }
}
try {
  if (process.argv.includes('--primary')) {
    for (const id of ['gt-8', 'gt-9a', 'gt-10', 'gt-11', 'gt-12']) {
      await trial('gemini/' + id, async ({ page, button }) => {
        await button('keys').click();
        await button('orbital-transfer').click();
        assert.equal(await page.evaluate(() => window.sr.docking.plan.craft.length), 2);
        for (let i = 0; i < 8; i++) await page.keyboard.press(']');
        const next = button('next-translation');
        const config = await page.evaluate(() => ({
          station: window.sr.flight.docking.transfer.station,
          brake: window.sr.flight.docking.transfer.brake,
        }));
        for (let i = 0; i < 14; i++) {
          await page.waitForFunction(
            (at) => !document.querySelector('[data-do="next-translation"]').disabled || window.sr.docking.t >= at,
            config.brake,
            { timeout: 30000 },
          );
          if (await page.evaluate((at) => window.sr.docking.t >= at, config.brake)) break;
          await next.click();
        }
        await page.waitForFunction(
          (x) => window.sr.docking.phase === 'hard' || (window.sr.docking.limits.blocked && window.sr.docking.t > x + 30),
          config.station,
          { timeout: 150000 },
        );
        assert.equal(await page.evaluate(() => window.sr.docking.phase), id === 'gt-9a' ? 'free' : 'hard');
      });
    }
  } else {
    await trial('apollo/apollo-9', async ({ page, button, wait, fast }) => {
      await fast();
      await wait('hard');
      assert.ok(await page.evaluate(() => window.sr.docking.mounted));
      await button('next').click();
      const distance = () =>
        page.evaluate(() => {
          const r = window.sr.docking;
          return Math.hypot(...r.released.r.map((x, i) => x - r.bodies[1].r[i]));
        });
      const initial = await distance();
      await page.waitForFunction((initial) => {
        const r = window.sr.docking;
        return r.released && Math.hypot(...r.released.r.map((x, i) => x - r.bodies[1].r[i])) > initial + 1;
      }, initial);
      await button('keys').click();
      await button('crew-transfer').click();
      assert.match(await button('crew-transfer').innerText(), /Return crew/i);
      await button('second').click();
      await fast();
      await wait('hard');
      assert.equal(await page.evaluate(() => window.sr.docking.mounted), false);
      await button('rendezvous').click();
      assert.equal(await page.evaluate(() => window.sr.docking.phase), 'free');
      const range = await page.evaluate(() => {
        const [a, b] = window.sr.docking.bodies;
        return Math.hypot(...a.r.map((v, i) => v - b.r[i]));
      });
      assert.ok(range > 21 * 1852 && range < 22 * 1852);
      for (let i = 0; i < 8; i++) await page.keyboard.press(']');
      await page.waitForFunction(() => window.sr.docking.phase === 'hard', null, { timeout: 180000 });
    });
    await trial('gemini/gt-11', async ({ page, button, wait, fast }) => {
      await fast();
      await wait('hard');
      await button('keys').click();
      await button('next-burn').click();
      await page.waitForFunction(() => !document.querySelector('[data-do="next-burn"]').disabled);
      await page.keyboard.press('[');
      await page.keyboard.press('[');
      await page.keyboard.press('[');
      await page.keyboard.press('[');
      await button('next-burn').click();
      await page.waitForFunction(() => window.sr.docking.t > 40 * 3600 + 30 * 60 + 16);
      await page.keyboard.press('p');
      assert.equal(await page.locator('[data-do="change-craft"]').count(), 0);
      const saved = await page.evaluate(() => window.sr.docking.t);
      await page.reload();
      await page.waitForFunction(ready, null, { timeout: 120000 });
      await page.waitForFunction(() => document.querySelector('[data-do="resume"]')?.disabled === false);
      await button('resume').click();
      assert.ok(Math.abs((await page.evaluate(() => window.sr.docking.t)) - saved) < 0.15);
      await page.keyboard.press('p');
      await fast();
      await page.waitForFunction(() => !document.querySelector('[data-do="next-burn"]').disabled);
      assert.match(await page.locator('[data-cell="apogee"]').innerText(), /1,?3\d\d/);
    });
    await trial('gemini/gt-10', async ({ page, button, wait, fast }) => {
      await fast();
      await wait('hard');
      await button('keys').click();
      for (let n = 0; n < 3; n++) {
        await button('next-burn').click();
        await page.waitForFunction(
          (last) => !document.querySelector(last ? '[data-do="second-target"]' : '[data-do="next-burn"]').disabled,
          n === 2,
        );
      }
      await button('second-target').click();
      assert.match(await page.locator('.dockflight strong').innerText(), /5003/);
      assert.ok(await page.evaluate(() => window.sr.docking.released && window.sr.docking.phase === 'free'));
      await button('eva-target').click();
      assert.match(await page.locator('[data-cell="phase"]').innerText(), /EVA/);
    });
    await trial('gemini/gt-8', async ({ page, button, wait, fast }) => {
      await fast();
      await wait('hard');
      await button('keys').click();
      await button('oams-failure').click();
      assert.equal(await page.locator('[data-do="change-craft"]').count(), 0);
      await page.waitForFunction(() => window.sr.docking.bodies[0].w.some((v) => Math.abs(v) > 0.001));
      await button('next').click();
      await wait('free');
      const agenaSpin = await page.evaluate(() => Math.hypot(...window.sr.docking.bodies[1].w));
      await page.waitForFunction((n) => Math.hypot(...window.sr.docking.bodies[0].w) > n + 0.04, agenaSpin);
    });
    await trial('gemini/gt-9a', async ({ page, button }) => {
      await button('next').click();
      assert.equal(await page.evaluate(() => window.sr.docking.phase), 'free');
      assert.match(await page.locator('[data-cell="phase"]').innerText(), /shroud/i);
    });
  }
} finally {
  await browser.close();
}
