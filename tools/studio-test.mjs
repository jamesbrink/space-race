// Open an interior from its gallery view and check the actual rendered surface in both looks.
//   node tools/studio-test.mjs [url]     (default: http://localhost:5180/)
// The Apollo DSKY web faces down: the closed exhibit's polar limit and a lamp aimed at the whole
// rocket both hid it. A screenshot mask checks visibility separately from normal-frame brightness;
// an outline alone, or a successful shader compile, cannot establish that the surface is readable.
import assert from 'node:assert/strict';
import { launch, open, url as urlOf } from './browser.mjs';

const browser = await launch();
const base = urlOf(process.argv.slice(2));
try {
  for (const width of [1280, 820, 390]) {
    const { page, errors } = await open(browser, `${base.split('#')[0]}#usa/apollo/apollo-7/gallery`, {
      viewport: [width, 900],
      console: ['error', 'warning'],
      wait: 'gallery',
    });
    const narrow = width < 960;
    if (narrow) await page.locator('.handle-open').click();
    const views = page.getByRole('group', { name: 'View', exact: true });
    if (!(await page.locator('[data-view="dsky"]').isVisible())) await views.locator('[data-views]').click();
    const cut = page.locator('[data-cut]');
    const whole = views.getByRole('button', { name: 'Whole', exact: true });
    const front = views.getByRole('button', { name: 'DSKY front', exact: true });
    await front.click();
    assert.equal(await cut.getAttribute('aria-pressed'), 'true', 'an interior view opens the shell without selecting a part');
    await whole.click();
    assert.equal(await cut.getAttribute('aria-pressed'), 'false', 'leaving an interior view closes its temporary opening');
    await cut.click();
    await front.click();
    await whole.click();
    assert.equal(await cut.getAttribute('aria-pressed'), 'true', 'a manual opening is kept');
    await cut.click();
    if (narrow) await page.locator('[data-tab="Parts"]').click();
    await page.locator('[data-node="DSKYFrontWeb"]').click();
    assert.equal(await cut.getAttribute('aria-pressed'), 'true', 'selecting an interior part opens the shell too');
    if (narrow) await page.locator('[data-tab="View"]').click();
    await front.click();
    await page.waitForFunction(() => !sr.gallery.stage.cam.travelling);
    if (narrow) await page.locator('.handle-open').click();
    await page.keyboard.press('h');
    await page.evaluate(() => {
      sr.gallery.stage.setAutoRotate(false);
      sr.gallery.stage.highlight(null, null);
    });
    for (const look of ['real', 'cel']) {
      await page.evaluate((look) => sr.gallery.stage.setLook(look), look);
      await page.waitForTimeout(300);
      const canvas = page.locator('#gallery-stage');
      const actual = await canvas.screenshot();
      await page.evaluate(() => {
        const stage = sr.gallery.stage;
        const mesh = stage.scene.getObjectByName('CM_DSKYFrontWeb_Reference');
        window.studioOriginal = mesh.userData.real;
        window.studioMask = window.studioOriginal.clone();
        window.studioMask.color.set(0);
        window.studioMask.emissive.set(0xff0000);
        window.studioMask.emissiveIntensity = 1;
        window.studioMask.toneMapped = false;
        stage.looks.give(mesh, window.studioMask);
        stage.dirty = true;
      });
      await page.waitForTimeout(100);
      const mask = await canvas.screenshot();
      const result = await page.evaluate(
        async ([normalPng, maskPng]) => {
          const pixels = async (png) => {
            const image = new Image();
            image.src = `data:image/png;base64,${png}`;
            await image.decode();
            const canvas = document.createElement('canvas');
            canvas.width = image.width;
            canvas.height = image.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);
            return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          };
          const normal = await pixels(normalPng);
          const mask = await pixels(maskPng);
          let visible = 0;
          let sum = 0;
          for (let i = 0; i < mask.length; i += 4) {
            if (!(mask[i] > 150 && mask[i + 1] < 80 && mask[i + 2] < 80)) continue;
            visible++;
            sum += (normal[i] + normal[i + 1] + normal[i + 2]) / 3;
          }
          return { visible, brightness: sum / visible };
        },
        [actual.toString('base64'), mask.toString('base64')],
      );
      await page.evaluate(() => {
        const stage = sr.gallery.stage;
        stage.looks.give(stage.scene.getObjectByName('CM_DSKYFrontWeb_Reference'), window.studioOriginal);
        window.studioMask.dispose();
        stage.dirty = true;
      });
      assert.ok(result.visible > 100, `${width} ${look}: web is hidden (${JSON.stringify(result)})`);
      // Presentation readability, not a claim about the flight coating or physical illumination.
      assert.ok(result.brightness > 40, `${width} ${look}: web is too dark (${JSON.stringify(result)})`);
      console.log(`ok ${width} ${look}: ${result.visible} visible web pixels, mean brightness ${result.brightness.toFixed(1)}`);
    }
    assert.deepEqual(errors, [], `${width}: runtime errors`);
    await page.close();
  }
} finally {
  await browser.close();
}
