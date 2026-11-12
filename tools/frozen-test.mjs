// A frozen stage draws the same frame twice: checked in the running viewer, in both looks.
//   node tools/frozen-test.mjs [url] [--shots <dir>] [--only <regex of pose names>]      (default url: http://localhost:5180/)
// --shots writes a map per pose that moved: the frame dimmed, the pixels that differed magenta.
//
// Everything that compares pictures (test:flicker, tools/lod-measure.mjs, `pnpm bench --shots`) sets `stage.frozen`
// and trusts that what differs between two grabs is what it changed. So at each pose, in each look:
//   still:   after SETTLE frames the view is drawn DRAWS times more, and every one must be the first, to the last bit;
//   thrown:  every level of detail is forced to another and back (as the measuring tools do), and after SETTLE frames
//            the picture must be the one from before, to the last bit.
//   ball:    (where the air is drawn) the air's ball moved off the eye and resized: the same picture, within a level.
//   near:    the near plane at half of where fitDepth puts it: only lines may move (depth's steps), no broad faint change.
//   step:    (orbit poses) drawn from elsewhere, put back and drawn once: the first frame is the picture, to the last bit.
// What has moved a frozen picture before, so it is looked for first: a room's lamp handed from room to room by the
// wall's clock (lamps.ts: `atOnce`), and the clouds' blend with their last frames (clouds.ts: `frozen`). The page
// is given time to finish arriving first (levels of detail, trees, maps, the other look's shaders): until then the
// picture changes because the scene does.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const NPIX = 1280 * 800;
const SETTLE = 4; // frames drawn after a pose or a switch before the picture is trusted (what the other tools give it)
const DRAWS = 4;
/** Each pose: a model to show, the clock (seconds from liftoff), and the camera: a named view from an azimuth, `Stage.pose`'s arguments, or a rig that follows the vehicle. */
const POSES = [
  { name: 'vehicle, all', show: 'vehicle', t: 0, shot: ['all', 20] },
  { name: 'pad, all', show: 'pad', t: 0, shot: ['all', 140] },
  { name: 'pad from 150 m', show: 'pad', t: 0, pose: [215, 9, 150, 14] },
  { name: 'the place from 400 m', show: 'pad', t: 0, pose: [30, 10, 400, 10] },
  { name: 'beside the gantry', show: 'pad', t: 0, pose: [120, 4, 40, 6] },
  { name: 'pad by night', show: 'pad', t: -6 * 3600, pose: [215, 9, 150, 14] },
  // following the vehicle from height: the site far below, cloud from above, the globe, the air drawn over all of it.
  // (What this pose has caught: the box round the vehicle taken in the scene's frame, so the camera and the Sun's map
  // stood by how it lay when a level last changed; a pivot and a light moved by sums, a last bit out on the way back;
  // and a frame that left the canvas less than opaque where the air is, so a copy of it showed the copy before.)
  { name: 'chase, T+80', show: 'vehicle', t: 80, rig: 'chase' },
  { name: 'chase, T+300', show: 'vehicle', t: 300, rig: 'chase' },
  // the flight deck's predicted path (viewer/path.ts), flown to the instant on its own guidance and stopped there: the line,
  // its ring where it comes down and the line flown, drawn the same twice. (Its markers are on the page, not the canvas.)
  { name: 'path, chase, T+150', fly: 150, rig: 'chase' },
  { name: 'path, pad camera, T+100', fly: 100, rig: 'pad' },
];

const args = process.argv.slice(2);
const shotsAt = args.indexOf('--shots');
const shots = shotsAt >= 0 ? args.splice(shotsAt, 2)[1] : null;
const onlyAt = args.indexOf('--only');
const only = onlyAt >= 0 ? new RegExp(args.splice(onlyAt, 2)[1]) : null;
const url = args[0] ?? 'http://localhost:5180/';
if (shots) mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${url}#vehicle`);
await page.waitForFunction(() => window.sr?.stage && document.querySelector('.loading.done'), null, { timeout: 180_000 });
await page.addStyleTag({ content: '#ui, #gallery { display: none !important }' });

await page.evaluate(async () => {
  const { stage, clock } = window.sr;
  stage.setAutoRotate(false);
  clock.pause();
  stage.frozen = true;
  await Promise.allSettled(stage.arriving ?? []);
  const src = document.querySelector('#stage');
  const copy = document.createElement('canvas');
  const pen = copy.getContext('2d', { willReadFrequently: true });
  const frame = () => new Promise((done) => requestAnimationFrame(done));
  /** Draw `frames` frames, then one more, and take it (the WebGL buffer is not kept: copied in the frame's own task). */
  window.grab = async (frames = 0) => {
    for (let i = 0; i <= frames; i++) {
      stage.dirty = true;
      await frame();
    }
    if (copy.width !== src.width || copy.height !== src.height) {
      copy.width = src.width;
      copy.height = src.height;
    }
    pen.drawImage(src, 0, 0);
    return pen.getImageData(0, 0, copy.width, copy.height).data;
  };
  /** Pixels that differ at all, the most a channel differs by, and (asked for) a map of them. */
  window.differ = (a, b, map = false) => {
    let n = 0,
      faint = 0,
      worst = 0;
    const out = map ? new Uint8ClampedArray(a.length) : null;
    for (let i = 0; i < a.length; i += 4) {
      const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]));
      if (d) n++;
      if (d && d <= 4) faint++;
      if (d > worst) worst = d;
      if (out) {
        out[i] = d ? 255 : a[i] >> 2;
        out[i + 1] = d ? 0 : a[i + 1] >> 2;
        out[i + 2] = d ? 255 : a[i + 2] >> 2;
        out[i + 3] = 255;
      }
    }
    if (!out || !n) return { n, faint, worst, map: null };
    pen.putImageData(new ImageData(out, copy.width, copy.height), 0, 0);
    return { n, faint, worst, map: copy.toDataURL('image/png') };
  };
  /** Wait until the picture has stopped changing by itself (the page still arriving): `run` identical frames one after another. */
  window.quiet = async (run = 120, most = 2400) => {
    let last = await window.grab(),
      same = 0;
    for (let i = 0; i < most && same < run; i++) {
      const next = await window.grab();
      same = window.differ(last, next).n ? 0 : same + 1;
      last = next;
    }
    return same >= run;
  };
});

/** In the page: one pose in the look in force. */
const at = (pose) =>
  page.evaluate(
    async ([pose, SETTLE, DRAWS]) => {
      const { stage, clock, show, cockpit, path } = window.sr;
      // (off the flight deck, if the last pose was on it: what it left, the vehicle back on its pad, is given time to arrive)
      const left = pose.fly === undefined && cockpit.active;
      if (pose.fly === undefined) {
        cockpit.leave();
        show(pose.show);
        clock.seek(pose.t);
        if (left) {
          clock.pause();
          await window.quiet(60, 1200);
        }
      } else {
        // on the flight deck with the path on: lit, and flown on as fast as it can be to the instant (or put back to it)
        cockpit.enter();
        path.show(true, false);
        if (!cockpit.state?.ignited) {
          cockpit.eventAt = Number.NEGATIVE_INFINITY;
          cockpit.command('next');
        }
        if (clock.t > pose.fly) clock.seek(pose.fly);
        clock.setRate(300);
        clock.play(true);
        for (let i = 0; i < 4000 && clock.t < pose.fly && !cockpit.state?.landing; i++) await window.grab();
        clock.setRate(1);
      }
      clock.pause();
      stage.setCamera(pose.rig ?? 'orbit');
      if (pose.shot) stage.shot(...pose.shot);
      else if (pose.pose) stage.pose(...pose.pose);
      // (a rig on its way to the vehicle is given the frames to get there)
      for (let i = 0; i < 600 && (stage.cam.journey || stage.lifted.t !== clock.t); i++) await window.grab();
      // (and then no time passes at all, as `pnpm bench --shots` has it: a rig that follows goes on easing and the
      // engine's fire goes on burning by the frame's own time, which `frozen` does not stop)
      const delta = stage.timer.getDelta;
      let rest = true;
      if (pose.rig || pose.fly !== undefined) {
        stage.timer.getDelta = () => 0;
        // (what arrives up there, the globe's maps, comes in over seconds of the wall's clock: waited for)
        rest = await window.quiet(60, 1200);
      }
      const first = await window.grab(SETTLE);
      const still = { n: 0, worst: 0, map: null };
      for (let i = 1; i < DRAWS; i++) {
        const d = window.differ(first, await window.grab(), true);
        if (d.n > still.n) Object.assign(still, d);
      }
      // a switch thrown and thrown back: every model and every piece of the place at another level, then at the one it had
      // (held there by `forced` both times: left to itself a level has a margin each way and need not come back)
      const models = stage.staged.map((s) => s.shownLevel);
      const pieces = Object.fromEntries((stage.scenery?.shown ?? []).map((p) => [p.name, p.level]));
      const other = (level) => (level ? level - 1 : 1);
      const force = (to) => {
        stage.staged.forEach((s, i) => {
          s.forced = to(models[i]);
        });
        if (stage.scenery) stage.scenery.forced = Object.fromEntries(Object.entries(pieces).map(([name, level]) => [name, to(level)]));
      };
      // the air's ball moved off the eye and made another size: what it draws is the eye's rays, so nothing may change
      // (the camera's shake moves the eye after it is placed, and it was once placed at the last frame's eye: in flight a
      // frame's travel off, and the limb stood 4 px out and jumped with every long frame while it drew the way from its
      // own middle)
      const globe = stage.setting.globe;
      let ball = null;
      if (globe?.air?.visible) {
        const attend = stage.setting.attend;
        stage.setting.attend = (eye) => {
          const changed = attend(eye);
          globe.air.position.x += 40;
          globe.air.position.y -= 25;
          globe.air.scale.multiplyScalar(0.6);
          return changed;
        };
        const moved = await window.grab(SETTLE);
        stage.setting.attend = attend;
        ball = window.differ(first, moved, true);
        // (and back: the frame is the first again)
        const back = window.differ(first, await window.grab(SETTLE));
        if (back.n > ball.n) ball = back;
      }
      // the near plane brought in to a half of where fitDepth put it: the picture may not depend on it (it eases out over a
      // quarter of a second after every zoom, so anything that read it would ripple while zooming)
      const fit = stage.fitDepth;
      stage.fitDepth = function (dt) {
        fit.call(this, dt);
        this.camera.near *= 0.5;
        this.camera.updateProjectionMatrix();
      };
      const nearer = await window.grab(SETTLE);
      stage.fitDepth = fit;
      const near = window.differ(first, nearer, true);
      // a step of the eye: drawn from elsewhere, then put back and drawn once. The first frame from a place must be the
      // picture from that place (the setting was told where the eye is as a frame began, before the rig moved it: the
      // plants' fading bands and the land's cells were the last frame's, a zoom's whole step behind)
      let step = null;
      if (pose.pose) {
        const [az, el, dist, y] = pose.pose;
        // (a fast zoom's frame: further than that, what is chosen with a margin each way, a level of detail or a room's
        // lamp, may rightly come back otherwise)
        stage.pose(az + 1, el + 0.5, dist * 1.08, y);
        await window.grab(SETTLE);
        stage.pose(az, el, dist, y);
        step = window.differ(first, await window.grab(0), true);
        await window.grab(SETTLE);
      }
      force((level) => level);
      const before = await window.grab(SETTLE);
      force(other);
      const coarse = await window.grab(SETTLE);
      force((level) => level);
      const after = await window.grab(SETTLE);
      for (const s of stage.staged) s.forced = null;
      if (stage.scenery) stage.scenery.forced = null;
      stage.timer.getDelta = delta;
      return { rest, still, ball, near, step, thrown: window.differ(before, after, true), changed: window.differ(before, coarse).n };
    },
    [pose, SETTLE, DRAWS],
  );

let failed = 0;
for (const look of ['real', 'cel']) {
  await page.evaluate((look) => window.sr.stage.setLook(look), look);
  if (!(await page.evaluate(() => window.quiet()))) console.log(`     (${look}: the page had not come to rest)`);
  for (const pose of POSES) {
    if (only && !only.test(pose.name)) continue;
    const r = await at(pose);
    if (!r.rest) {
      failed++;
      console.log(
        `FAIL ${look.padEnd(4)} ${pose.name.padEnd(22)} never came to rest: a frame drawn again went on differing for 1200 frames with no time passing`,
      );
    }
    for (const [what, d] of [
      ['still', r.still],
      ['ball', r.ball],
      ['near', r.near],
      ['step', r.step],
      ['thrown', r.thrown],
    ]) {
      if (!d) continue; // (no air drawn in this pose, or no step taken: a rig that follows)
      // (the ball moved draws the same rays through other triangles: a last bit of rounding, one level at most)
      // (the near plane at half: what its depth steps decide moves along lines and edges, the ink, the cel clouds' cut
      // and layers a few steps apart, mostly by a few levels: up to 15,000 pixels in the cel look beside the gantry, 5,000
      // in the real; anything that read the plane, a haze or a veil, would move the broad part of the frame it covers)
      const ok = what === 'ball' ? d.worst <= 1 : what === 'near' ? d.faint <= 0.03 * NPIX : d.n === 0;
      const open = !ok && pose.open?.includes(what);
      if (!ok && !open) failed++;
      console.log(
        `${ok ? 'ok  ' : open ? 'open' : 'FAIL'} ${look.padEnd(4)} ${pose.name.padEnd(22)} ${what.padEnd(6)}  differing ${String(d.n).padStart(6)}${d.n ? `  (by up to ${d.worst} of 255${what === 'near' ? `; ${d.faint} by 4 or less` : ''})` : ''}${what === 'thrown' ? `   (at the other level: ${r.changed})` : ''}`,
      );
      if (shots && d.map)
        writeFileSync(join(shots, `${look}-${pose.name.replace(/\W+/g, '-')}-${what}.png`), Buffer.from(d.map.split(',')[1], 'base64'));
    }
  }
}
if (errors.length) {
  failed++;
  console.log(`FAIL console: ${errors.length} errors\n  ${errors.slice(0, 8).join('\n  ')}`);
}
await browser.close();
console.log(failed ? `frozen-test: ${failed} FAILED` : 'frozen-test: ok');
process.exit(failed ? 1 : 0);
