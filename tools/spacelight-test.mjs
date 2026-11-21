// The light on a vehicle above the air holds still from one frame to the next: checked in the running page.
//   pnpm dev, then: node tools/spacelight-test.mjs [url] [--flights apollo-11] [--from 300]
// Each flight is flown on its deck with guidance and the sequencer on (the record's flight), the clock run fast to
// `--from` seconds from liftoff (above the air and over the cloud), and then a run of frames is drawn at 8x and at 1x
// from the chase view. In each frame the mean luminance of a box round the vehicle on the screen is read; a flicker is
// a change from one frame to the next undone by the following one, both over a level. A vehicle in the Sun above the
// air has nothing between it and the Sun: its light changes as it turns and as the Sun sets, smoothly. (The cloud's
// shadows were read for it where the ray to the Sun crossed each layer's height, behind it: at 8x Apollo 11 at T+320
// flickered 63 times in 300 frames, 23 of them by more than 3 levels. air.ts `underLayer`.)
import { checks, launch, open, opt, url as urlOf } from './browser.mjs';
import { flights } from '../missions/index.ts';

const args = process.argv.slice(2);
const ids = (opt(args, '--flights', null) ?? 'apollo-11').split(',');
const from = Number(opt(args, '--from', '300'));
const url = urlOf(args);
const MOST = 2; // flickers of over a level allowed in a run: a staging event or a rig's own step may give one
const { check, failures } = checks();
const browser = await launch();

for (const id of ids) {
  const flight = flights.find((f) => f.id.split('/').at(-1) === id);
  if (!check(Boolean(flight), `${id} is a flight`)) continue;
  const { page, errors, close } = await open(browser, `${url}#${flight.id}/fly`, {
    wait: () => window.sr && document.querySelector('.loading.done') && window.sr.cockpit?.active,
    timeout: 240000,
  });
  await page.waitForTimeout(1500);
  // the record's flight: guidance and the sequencer on, then lit
  await page.evaluate(() => {
    for (const which of ['guidance', 'sequence']) {
      const b = document.querySelector(`#ui > .cockpit [data-do=${which}]`);
      if (b?.getAttribute('aria-pressed') === 'false') b.click();
    }
  });
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  const began = Date.now();
  for (;;) {
    const t = await page.evaluate(() => {
      const c = window.sr.clock;
      if (c.rate !== 16) c.setRate(16);
      if (!c.running) c.play(true);
      return c.t;
    });
    if (t >= from || Date.now() - began > 600000) break;
    await page.waitForTimeout(500);
  }
  for (const [rate, frames] of [
    [8, 300],
    [1, 120],
  ]) {
    await page.evaluate((r) => window.sr.clock.setRate(r), rate);
    await page.waitForTimeout(1500);
    const run = await page.evaluate(
      async ([rate, frames]) => {
        const sr = window.sr;
        const stage = sr.stage;
        const src = document.querySelector('#stage');
        const W = 320,
          H = 200;
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        const g = c.getContext('2d', { willReadFrequently: true });
        const ship = stage.camera.position.clone();
        const rows = [];
        for (let k = 0; k < frames; k++) {
          await new Promise((r) => requestAnimationFrame(r));
          if (sr.clock.rate !== rate) sr.clock.setRate(rate);
          if (!sr.clock.running) sr.clock.play(true);
          g.drawImage(src, 0, 0, W, H);
          const d = g.getImageData(0, 0, W, H).data;
          let px = W / 2,
            py = H / 2;
          if (stage.show.vessel(ship)) {
            const p = ship.clone().project(stage.camera);
            px = Math.round(((p.x + 1) / 2) * W);
            py = Math.round(((1 - p.y) / 2) * H);
          }
          const b = 15,
            bx = Math.max(0, Math.min(W - 2 * b, px - b)),
            by = Math.max(0, Math.min(H - 2 * b, py - b));
          let s = 0;
          for (let y = by; y < by + 2 * b; y++)
            for (let x = bx, i = (y * W + bx) * 4; x < bx + 2 * b; x++, i += 4) s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
          rows.push({ t: sr.clock.t, lum: s / (4 * b * b), alt: stage.setting.globe?.altitude(stage.camera.position) ?? null });
        }
        return rows;
      },
      [rate, frames],
    );
    const steps = run.slice(1).map((r, i) => r.lum - run[i].lum);
    const flickers = (least) =>
      steps.slice(1).filter((a, i) => a * steps[i] < 0 && Math.abs(a) > least && Math.abs(steps[i]) > least).length;
    const most = Math.max(...steps.map(Math.abs));
    const where = `${id} at ${rate}x, T+${run[0].t.toFixed(0)} to T+${run.at(-1).t.toFixed(0)}, ${((run[0].alt ?? 0) / 1000).toFixed(0)} km up`;
    check(
      flickers(1) <= MOST && flickers(3) === 0,
      `${where}: the vehicle's light flickers ${flickers(1)} times by over a level (${MOST} allowed), ${flickers(3)} by over 3 (none); its largest step ${most.toFixed(2)}`,
    );
  }
  if (errors.length) check(false, `${id}: the page said ${errors.length} thing(s) went wrong: ${errors.slice(0, 3).join(' | ')}`);
  await close();
}
await browser.close();
console.log(failures.length ? `${failures.length} failed` : 'all passed');
process.exit(failures.length ? 1 : 0);
