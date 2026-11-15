// A parachute's lines are drawn over everything behind them: the land, the sea, the air and the cloud (rendering.md,
// "Drawn last"; GitHub issue #1). Checked in the running page, as flown, under the main parachute.
//   pnpm dev, then: node tools/chute-test.mjs [url] [--shots <dir>]
// Freedom 7 at T+660 s and Vostok 1 at T+6000 s, each at a desk's width and a phone's, in both looks, from the chase
// view looking down the lines at the cloud and the sea and from beside or under them toward cloud. At each, the frame is
// drawn twice, frozen (stage.frozen), with the lines and without them, and each line is sampled along its middle where
// it is on the screen. Where a line is drawn over what is behind it, each pixel there is the frame without it blended
// toward the line's own colour (in the cel look, toward its ink), and nothing else: so every channel of the pixel lies
// between the two. A pixel outside them is the line letting through something that is not behind it: the bare sea or
// land under the cloud (the clouds left out at its pixels), or a cloud laid over it. Fails if more than 2 % of a pose's
// samples are; or if, of the samples where what is behind can be told from the line's colours (by 32 in a channel: a
// pale cord over a sunlit cloud top cannot), fewer than a quarter show the line, where there are 20 such or more.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checks, launch, open, opt, url as urlOf } from './browser.mjs';

const args = process.argv.slice(2);
const shots = opt(args, '--shots', null);
const url = urlOf(args);
if (shots) mkdirSync(shots, { recursive: true });

/** Each flight, the instant (its main parachute out, well above the ground), and the poses: the chase camera's angles (radians round and down from the zenith) and distance. */
const FLIGHTS = [
  {
    id: 'usa/mercury/mr-3-freedom-7',
    t: 660,
    poses: [
      { name: 'down past the lines', theta: 0, phi: 0.95, distance: 45 },
      { name: 'beside the lines', theta: 0, phi: 1.2, distance: 40 },
    ],
  },
  {
    id: 'ussr/vostok/vostok-1',
    t: 6000,
    poses: [
      { name: 'down the lines', theta: 0, phi: 0.4, distance: 40 },
      { name: 'up the lines', theta: 1.5, phi: 2.1, distance: 30 },
    ],
  },
];
const SIZES = [
  [1280, 800],
  [390, 844],
];
const LOOKS = ['real', 'cel'];
/** How far out of the span between the frame behind and the line's colour a channel may stand: the canvas's own rounding, and the ink's. */
const TOLERANCE = 6;

const { check, failures } = checks();
const browser = await launch();

for (const flight of FLIGHTS) {
  for (const [w, h] of SIZES) {
    const where = `${flight.id.split('/').at(-1)} at ${w}`;
    const { page, errors, close } = await open(browser, `${url}#${flight.id}/fly`, {
      viewport: [w, h],
      wait: () => window.sr && document.querySelector('.loading.done') && window.sr.cockpit?.active,
      timeout: 180000,
    });
    await page.addStyleTag({ content: '#ui, #gallery, #title, .notes { display: none !important }' });
    // flown live by its own sequence to the instant, five seconds a step (as tools/path-test.mjs flies it)
    const at = await page.evaluate(async (to) => {
      const { cockpit: c, stage: st, clock } = window.sr;
      c.eventAt = -1e9;
      c.command('next'); // ignition
      clock.pause();
      for (let i = 0; i < 20000 && clock.t < to - 1e-9 && !c.state?.landing; i++) {
        const was = clock.t;
        clock.seek(Math.min(to, was + 5));
        st.frame();
        if (i % 20 === 0) await new Promise((r) => requestAnimationFrame(r));
        if (!(clock.t > was)) break;
      }
      st.setAutoRotate(false);
      // (the chase view taken up and let settle once: its first frames ease onto the vehicle)
      st.setCamera('chase');
      await new Promise((r) => setTimeout(r, 3000));
      const copy = document.createElement('canvas');
      const pen = copy.getContext('2d', { willReadFrequently: true });
      const src = document.querySelector('#stage');
      const frame = () => new Promise((r) => requestAnimationFrame(r));
      /** Draw a frame and take it in its own task (the WebGL buffer is not kept): its pixels. */
      window.grab = async () => {
        for (let i = 0; i < 3; i++) {
          st.dirty = true;
          await frame();
        }
        if (copy.width !== src.width || copy.height !== src.height) {
          copy.width = src.width;
          copy.height = src.height;
        }
        pen.drawImage(src, 0, 0);
        return { data: pen.getImageData(0, 0, copy.width, copy.height).data, w: copy.width, h: copy.height };
      };
      window.picture = () => copy.toDataURL('image/png');
      return { t: clock.t, chutes: (st.show.chutes ?? []).filter((ch) => ch.group.visible).length };
    }, flight.t);
    check(at.chutes > 0, `${where}: T+${at.t.toFixed(0)} s, ${at.chutes} parachute(s) out`);

    for (const look of LOOKS) {
      for (const pose of flight.poses) {
        const name = `${where}, ${look}, ${pose.name}`;
        const got = await page.evaluate(
          async ([look, pose, TOLERANCE]) => {
            const st = window.sr.stage;
            st.setLook(look);
            st.setCamera('chase');
            for (let i = 0; i < 300 && (st.cam.chase.journey || st.cam.blend); i++) await new Promise((r) => requestAnimationFrame(r));
            // (at once, not eased, and twice: the same pose whatever the camera was doing before)
            const c = st.cam.chase;
            c.calm = true;
            c.max = Math.max(c.max, pose.distance * 2);
            for (let i = 0; i < 2; i++) {
              c.theta = pose.theta;
              c.phi = pose.phi;
              c.zoom(Math.log(pose.distance / c.distance), null);
              c.handSet = true;
              await new Promise((r) => setTimeout(r, 1500));
            }
            c.calm = false;
            const off = st.camera.position.distanceTo(c.pivot);
            st.frozen = true;
            const lines = (st.show.chutes ?? []).filter((ch) => ch.group.visible).map((ch) => ch.lines);
            const shown = await window.grab();
            for (const l of lines) l.visible = false;
            const behind = await window.grab();
            for (const l of lines) l.visible = true;
            await window.grab();
            const picture = window.picture();
            st.frozen = false;

            // the colour a line is drawn in, as the canvas has it: the renderer's tone mapping at its exposure (three's ACES
            // filmic in the real look, its Khronos PBR Neutral in the cel: stage.ts setLook), then sRGB
            const exposure = st.renderer.toneMappingExposure;
            const neutral = st.renderer.toneMapping === 7; // (THREE.NeutralToneMapping)
            const fit = (v) => (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081);
            const aces = ([x, y, z]) => {
              const i = [
                0.59719 * x + 0.35458 * y + 0.04823 * z,
                0.076 * x + 0.90834 * y + 0.01566 * z,
                0.0284 * x + 0.13383 * y + 0.83777 * z,
              ].map(fit);
              return [
                1.60475 * i[0] - 0.53108 * i[1] - 0.07367 * i[2],
                -0.10208 * i[0] + 1.10813 * i[1] - 0.00605 * i[2],
                -0.00327 * i[0] - 0.07276 * i[1] + 1.07602 * i[2],
              ];
            };
            const pbrNeutral = (c) => {
              const x = Math.min(...c);
              const offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
              c = c.map((v) => v - offset);
              const peak = Math.max(...c);
              const start = 0.76;
              if (peak < start) return c;
              const d = 1 - start;
              const top = 1 - (d * d) / (peak + d - start);
              const g = 1 - 1 / (0.15 * (peak - top) + 1);
              return c.map((v) => v * (top / peak) * (1 - g) + top * g);
            };
            const shown8 = (rgb) => {
              const mapped = neutral ? pbrNeutral(rgb.map((v) => v * exposure)) : aces(rgb.map((v) => (v * exposure) / 0.6));
              return mapped.map((v) => {
                const s = Math.min(1, Math.max(0, v));
                return 255 * (s <= 0.0031308 ? 12.92 * s : 1.055 * s ** (1 / 2.4) - 0.055);
              });
            };
            const colours = [];
            for (const l of lines) {
              const m = l.material;
              const own = m.uniforms?.uColour?.value ?? m.color;
              colours.push(shown8([own.r, own.g, own.b]));
              const ink = m.uniforms?.uInk?.value;
              if (ink && look === 'cel') colours.push(shown8([ink.r, ink.g, ink.b]));
            }

            // each line's middle on the screen, sampled every few pixels between a tenth of the way along and nine tenths
            const cam = st.camera;
            cam.updateMatrixWorld();
            const { w, h } = shown;
            const v = new cam.position.constructor();
            const project = (p) => {
              v.copy(p).applyMatrix4(cam.matrixWorldInverse);
              if (v.z > -cam.near) return null;
              v.applyMatrix4(cam.projectionMatrix);
              return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h];
            };
            let samples = 0;
            let seen = 0;
            let against = 0;
            let seenAgainst = 0;
            let outside = 0;
            const worst = [];
            for (const l of lines) {
              l.updateWorldMatrix(true, false);
              const position = l.geometry.getAttribute('position');
              for (let k = 0; k < position.count / 4; k++) {
                const a = project(
                  v
                    .clone()
                    .fromBufferAttribute(position, k * 4)
                    .applyMatrix4(l.matrixWorld),
                );
                const b = project(
                  v
                    .clone()
                    .fromBufferAttribute(position, k * 4 + 2)
                    .applyMatrix4(l.matrixWorld),
                );
                if (!a || !b) continue;
                const n = Math.min(60, Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / 4));
                for (let s = 0; s <= n; s++) {
                  const f = 0.1 + (0.8 * s) / Math.max(n, 1);
                  const x = Math.floor(a[0] + (b[0] - a[0]) * f);
                  const y = Math.floor(a[1] + (b[1] - a[1]) * f);
                  if (x < 0 || y < 0 || x >= w || y >= h) continue;
                  const i = (y * w + x) * 4;
                  const A = [shown.data[i], shown.data[i + 1], shown.data[i + 2]];
                  const B = [behind.data[i], behind.data[i + 1], behind.data[i + 2]];
                  samples++;
                  const shows = Math.max(...A.map((c, j) => Math.abs(c - B[j]))) > 8;
                  if (shows) seen++;
                  // (where what is behind differs from every colour the line is drawn in, the line can be told from it)
                  if (colours.every((c) => Math.max(...c.map((x, j) => Math.abs(x - B[j]))) >= 32)) {
                    against++;
                    if (shows) seenAgainst++;
                  }
                  let off = 0;
                  for (let j = 0; j < 3; j++) {
                    const lo = Math.min(B[j], ...colours.map((c) => c[j]));
                    const hi = Math.max(B[j], ...colours.map((c) => c[j]));
                    off = Math.max(off, lo - A[j], A[j] - hi);
                  }
                  if (off > TOLERANCE) {
                    outside++;
                    if (worst.length < 4) worst.push(`(${x}, ${y}) ${A.join(',')} over ${B.join(',')}`);
                  }
                }
              }
            }
            return {
              off,
              samples,
              seen,
              against,
              seenAgainst,
              outside,
              worst,
              picture,
              colours: colours.map((c) => c.map(Math.round).join(',')),
            };
          },
          [look, pose, TOLERANCE],
        );
        if (shots) writeFileSync(join(shots, `${name.replaceAll(/[ ,]+/g, '-')}.png`), Buffer.from(got.picture.split(',')[1], 'base64'));
        const share = got.samples ? got.outside / got.samples : 1;
        check(
          share <= 0.02 && (got.against < 20 || got.seenAgainst >= 0.25 * got.against),
          `${name} (from ${got.off.toFixed(0)} m): ${got.seen} of ${got.samples} samples show a line (${got.seenAgainst} of the ${got.against} against something it can be told from); ${got.outside} (${(100 * share).toFixed(1)} %) let through what is not behind it` +
            (got.worst.length ? ` [e.g. ${got.worst.join('; ')}; line ${got.colours.join(' / ')}]` : ''),
        );
      }
    }
    if (errors.length) check(false, `${where}: the page said ${errors.length} thing(s) went wrong: ${errors.slice(0, 3).join(' | ')}`);
    await close();
  }
}
await browser.close();
console.log(failures.length ? `${failures.length} failed` : 'all passed');
process.exit(failures.length ? 1 : 0);
