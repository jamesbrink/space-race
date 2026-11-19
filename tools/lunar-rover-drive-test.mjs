// Drives the production rover from its plinth with real keyboard and touchscreen input.
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { launch, open, opt, url } from './browser.mjs';

const args = process.argv.slice(2);
const shots = opt(args, '--shots');
const only = opt(args, '--mission');
if (shots) mkdirSync(shots, { recursive: true });
const base = url(args);
const browser = await launch();
try {
  for (const [mission, width] of [
    [15, 1280],
    [16, 390],
    [17, 1280],
    [17, 390],
  ]) {
    if (only && mission !== Number(only)) continue;
    const phone = width === 390;
    const { page, errors, close } = await open(browser, `${base}#usa/apollo/apollo-${mission}/gallery`, {
      context: { viewport: { width, height: 800 }, deviceScaleFactor: 1, hasTouch: phone, isMobile: phone },
      wait: 'gallery',
      timeout: 150000,
    });
    const enter = page.locator('[data-drive-rover]');
    async function viewControls() {
      if (!phone) return;
      if (!(await page.locator('#gallery .panel').evaluate((p) => p.classList.contains('open'))))
        await page.locator('#gallery .handle-open').tap();
      if (await page.locator('#gallery .panel [data-pane=View]').evaluate((p) => p.hidden))
        await page.locator('#gallery [data-tab=View]').tap();
    }
    await viewControls();
    await page.locator('[data-craft=rover]').click();
    await page.waitForFunction(() => location.hash.endsWith('/gallery/rover') && sr.gallery.ready);
    await viewControls();
    const gpu = async () =>
      page.evaluate(async () => {
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return { ...sr.gallery.stage.renderer.info.memory };
      });
    const drive = async () => {
      await enter.click();
      await page.locator('.rover-instruments').waitFor({ timeout: 90000 });
    };
    const shot = async (view) => {
      if (shots) await page.screenshot({ path: join(shots, `apollo-${mission}-${width}-${view}.jpg`), type: 'jpeg', quality: 90 });
    };
    await drive();
    assert.equal(await page.locator('#gallery-stage').evaluate((c) => c.clientHeight), 800);
    assert.equal(await page.evaluate(() => !!sr.gallery.roverDrive.rover.body.getObjectByName('LRV_Driver')), true);
    await shot('chase');
    const look = page.locator('[data-rover-look]');
    const toggleLook = async () => (phone ? await look.tap() : await page.keyboard.press('t'));
    await toggleLook();
    assert.equal(await look.getAttribute('aria-pressed'), 'true');
    await shot('cel');
    await toggleLook();
    assert.equal(await look.getAttribute('aria-pressed'), 'false');
    await page.mouse.move(width * 0.2, 370);
    await page.mouse.down();
    await page.mouse.move(width * 0.62, 441, { steps: 8 });
    await page.mouse.up();
    await shot('lander');
    await page.mouse.move(width * 0.62, 441);
    await page.mouse.down();
    await page.mouse.move(width * 0.2, 370, { steps: 8 });
    await page.mouse.up();
    const cdp = await page.context().newCDPSession(page);
    const touch = async (pedals) => {
      const touchPoints = [];
      for (const id of pedals) {
        const b = await page.locator(`[data-rover-pedal="${id}"]`).boundingBox();
        touchPoints.push({ x: b.x + b.width / 2, y: b.y + b.height / 2, id: id + 1 });
      }
      await cdp.send('Input.dispatchTouchEvent', { type: pedals.length ? 'touchStart' : 'touchEnd', touchPoints });
    };
    if (phone) await touch([0, 1]);
    else {
      await page.keyboard.down('w');
      await page.keyboard.down('a');
    }
    await page.waitForFunction(() => sr.gallery.roverDrive.rover.distance > 3 && sr.gallery.roverDrive.rover.motion.heading > 0.2);
    if (phone) await touch([]);
    else {
      await page.keyboard.up('a');
      await page.keyboard.up('w');
    }
    if (phone) await touch([4]);
    else await page.keyboard.down('Space');
    await page.waitForFunction(() => sr.gallery.roverDrive.rover.motion.speed === 0);
    if (phone) await touch([]);
    else await page.keyboard.up('Space');
    if (phone) await touch([2]);
    else await page.keyboard.down('s');
    await page.waitForFunction(() => sr.gallery.roverDrive.rover.motion.speed < -0.5);
    if (phone) await touch([]);
    else await page.keyboard.up('s');
    if (phone) await page.locator('[data-rover-camera]').tap();
    else await page.keyboard.press('c');
    await page.waitForFunction(() => !sr.gallery.roverDrive.rover.body.getObjectByName('LRV_Driver').visible);
    await shot('driver');
    const distance = await page.evaluate(() => sr.gallery.roverDrive.rover.distance);
    if (phone) await page.locator('[data-rover-exit]').tap();
    else await page.keyboard.press('Escape');
    await page.locator('.rover-drive').waitFor({ state: 'detached' });
    assert.match(page.url(), /\/gallery\/rover$/);
    const released = await gpu();
    await drive();
    assert.ok(
      await page.evaluate((d) => sr.gallery.roverDrive.rover.distance >= d && sr.gallery.roverDrive.rover.motion.speed === 0, distance),
    );
    await page.keyboard.press('Escape');
    const after = await gpu();
    assert.ok(
      after.geometries <= released.geometries && after.textures <= released.textures,
      `A returned traverse retained GPU objects: ${JSON.stringify(released)} → ${JSON.stringify(after)}`,
    );
    // A traverse cancelled before the remote data arrives must never claim the gallery later.
    let resume;
    const held = new Promise((resolve) => {
      resume = resolve;
    });
    const terrain = '**/lunar/*.terrain.bin';
    await page.route(terrain, async (route) => {
      await held;
      await route.continue().catch(() => {});
    });
    await enter.click();
    await page.locator('.rover-message').waitFor();
    await page.keyboard.press('Escape');
    resume();
    await page.unroute(terrain);
    await page.locator('.rover-drive').waitFor({ state: 'detached' });
    assert.ok(await enter.isVisible());
    assert.deepEqual(errors, []);
    console.log(`Apollo ${mission} · ${width}px · drove, turned, braked, reversed, sat at the wheel and resumed the parked traverse`);
    await close();
  }
} finally {
  await browser.close();
}
