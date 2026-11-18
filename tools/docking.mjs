/** Drive the real Fly decks with buttons and keys, including a reload partway through a burn. */
import assert from 'node:assert/strict';
import { launch, open, url } from './browser.mjs';
const base = url(process.argv.slice(2)).replace(/\/$/, '');
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
  await trial('gemini/gt-9a', async ({ page, button }) => {
    await button('next').click();
    assert.equal(await page.evaluate(() => window.sr.docking.phase), 'free');
    assert.match(await page.locator('[data-cell="phase"]').innerText(), /shroud/i);
  });
} finally {
  await browser.close();
}
