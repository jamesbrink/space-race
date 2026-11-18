// The last flight picture must survive both directions of an adaptive display resolution change.
import assert from 'node:assert/strict';
import { launch, open, url } from './browser.mjs';

const base = url(process.argv.slice(2)).replace(/\/$/, '');
const browser = await launch();
try {
  for (const flight of ['ussr/vostok/vostok-1', 'usa/gemini/gt-3']) {
    const { page, errors, close } = await open(browser, `${base}/#${flight}/fly`, {
      context: { viewport: { width: 640, height: 400 }, deviceScaleFactor: 2 },
      wait: () => window.sr?.cockpit?.active && document.querySelector('.loading.done'),
      timeout: 180000,
    });
    for (const [at, rig] of [
      [60, 'chase'],
      [1500, 'onboard'],
    ]) {
      const got = await page.evaluate(
        async ({ at, rig }) => {
          const { stage, clock } = window.sr;
          clock.pause();
          clock.seek(at);
          stage.setCamera(rig);
          await Promise.allSettled(stage.arriving ?? []);
          const frame = () => new Promise(requestAnimationFrame);
          for (let i = 0; i < 360 && (i < 90 || stage.cam.journey); i++) await frame();

          const src = stage.renderer.domElement;
          const copy = document.createElement('canvas');
          copy.width = 96;
          copy.height = 64;
          const pen = copy.getContext('2d', { willReadFrequently: true });
          const lit = () => {
            pen.clearRect(0, 0, 96, 64);
            pen.drawImage(src, 0, 0, 96, 64);
            const data = pen.getImageData(0, 0, 96, 64).data;
            let count = 0;
            for (let i = 0; i < data.length; i += 4) if (Math.max(data[i], data[i + 1], data[i + 2]) > 8) count++;
            return count;
          };
          const pipe = stage.pipe;
          pipe.quality.auto = true;
          stage.dirty = true;
          stage.frame();
          const original = [src.width, lit()];
          // Feed one window at 20 fps, as on a loaded display. Sample in the same task as the draw,
          // before the browser discards the WebGL back buffer. One more draw takes up the new scale.
          let now = performance.now() + 30000;
          for (let i = 0; i < 90 && pipe.quality.scale === 1; i++) pipe.paced((now += 50), true);
          const down = [src.width, lit()];
          stage.frame();
          const smaller = [src.width, lit()];
          pipe.paced(now + 1, false);
          const idle = [src.width, lit()];
          stage.frame();
          pipe.quality.auto = false;
          pipe.quality.reset();
          const full = [src.width, lit()];
          // A viewport or device-pixel-ratio notification can run between a draw and presentation.
          const oldWidth = src.style.width;
          src.style.width = `${src.clientWidth - 40}px`;
          stage.resize();
          const resized = [src.width, lit()];
          stage.frame();
          const narrower = [src.width, lit()];
          src.style.width = oldWidth;
          stage.resize();
          stage.frame();
          return { original, down, smaller, idle, full, resized, narrower, rig: stage.cameraMode, t: clock.t };
        },
        { at, rig },
      );
      console.log(flight, rig, at, JSON.stringify(got));
      assert.equal(got.rig, rig);
      assert.equal(got.t, at);
      assert.ok(got.original[1] > 150, 'the flight picture is visible');
      assert.deepEqual(got.resized, got.full, 'viewport notifications preserve the visible picture');
      assert.ok(got.narrower[0] < got.full[0] && got.narrower[1] > 150, 'the new viewport gets a complete picture');
      assert.deepEqual(got.down, got.original, 'lowering resolution preserves the picture until the next draw');
      assert.ok(got.smaller[0] < got.original[0] && got.smaller[1] > 150, 'the next picture uses the lower resolution');
      assert.deepEqual(got.idle, got.smaller, 'returning to full resolution preserves the last picture');
      assert.ok(got.full[0] === got.original[0] && got.full[1] > 150, 'the following picture returns to full resolution');
    }
    assert.deepEqual(errors, []);
    await close();
  }
} finally {
  await browser.close();
}
