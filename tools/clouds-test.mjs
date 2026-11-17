// The clouds stand in the air, not round the eye (rendering.md, "The weather is a day's": a cloud moves with the day's
// wind and with nothing else). Checked in the running page, on the day of each flight with cloud:
//   pnpm dev, then: node tools/clouds-test.mjs [url] [--shots <dir>] [--only <flight id>] [--part climb|sheets|above|glow]
// For each flight (Freedom 7's cumulus and deck, Liberty Bell 7's cumulus, deck and veil, Vostok 1's cirrus, Friendship 7's
// deck over Complex 14), in both looks:
//  - the climb: the camera is flown straight up at a vehicle's speed (250 m/s, a frame every 0.1 s) through the cumulus
//    layer, at a place a cloud stands, looking level, up and down. Each frame the march's own result (its opacity,
//    light, and where along each ray its cloud begins) is read, and every point of cloud surface it found is carried to
//    the next frame by where it is in the world (and the wind): at least 97 % must be where that frame's march has
//    cloud too, at that distance (to 3 %, the march's own tolerance); and of those the move shifts by four pixels or
//    more, no more than 0.5 % may be drawn unchanged at the pixel they were at (cloud kept in the camera's frame).
//  - each sheet (the middle deck, the high cloud): the same place of it looked at straight down from 300 m above its
//    layer and from 2,000 m above, and straight up from as far under: the frame's middle is the same place of the
//    sheet in both, and where it is cloud from far off it must be cloud from near (one place, or under 10 % of them,
//    may be 40 levels darker from near: one may be at the cel look's cut). It was cut away within 3 and 8 km of the eye: a hole that went up with the vehicle.
//  - crossing each sheet's layer straight up, nothing steps: where 25 m of climb changes the frame by more than 3
//    levels on the mean, the climb is halved four times into the half that changed more, and what changed over the
//    last 1.6 m must be no more than a quarter of it, or 2 levels. What the scene
//    does over the same 1.6 m with the clouds left off is not theirs, and is taken off (and said).
//  - from 300 m, 2, 8 and 25 km over each layer, straight down, the eye moved across by a hundredth of its height, two ways:
//    under 1 % of the frame's edges may stay at the same pixel, the same (an edge kept round the eye).
//  - the glow of entry round Freedom 7 hides nothing: from its wake at 5 m and beside it at 9 m, at 390 and 1280,
//    no pixel darker with it than without it (it had cut the cloud behind it out of a disc round the view).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checks, launch, open, opt, url as urlOf } from './browser.mjs';

const args = process.argv.slice(2);
const shots = opt(args, '--shots', null);
const only = opt(args, '--only', null);
/** `--part climb|sheets|above|glow`: only that part (the climb through the cumulus, the sheets, straight down from over each layer, the glow). */
const part = opt(args, '--part', null);
const doing = (name) => !part || part === name;
const url = urlOf(args);
if (shots) mkdirSync(shots, { recursive: true });

const FLIGHTS = [
  'usa/mercury/mr-3-freedom-7',
  'usa/mercury/mr-4-liberty-bell-7',
  'ussr/vostok/vostok-1',
  'usa/mercury/ma-6-friendship-7',
].filter((f) => !only || f === only);
const LOOKS = ['real', 'cel'];
/** The climb: metres a second, and seconds a frame. */
const SPEED = 250;
const DT = 0.1;
/** The march's tolerance on where a surface is, as a share of how far off it is (and never under 8 m). */
const TOLERANCE = 0.03;

const { check, failures } = checks();
const browser = await launch();

/** What the page is given to measure with (a function, run in the page once): see the header. */
function install() {
  const st = window.sr.stage;
  const p = st.pipe.clouds;
  const copy = document.createElement('canvas');
  const pen = copy.getContext('2d', { willReadFrequently: true });
  const src = document.querySelector('#stage');
  const frame = () => new Promise((r) => requestAnimationFrame(r));
  const half = (h) => {
    const s = h & 0x8000 ? -1 : 1,
      e = (h >> 10) & 31,
      f = h & 1023;
    return e === 0 ? s * 2 ** -14 * (f / 1024) : e === 31 ? (f ? Number.NaN : s * Infinity) : s * 2 ** (e - 15) * (1 + f / 1024);
  };
  const T = {};
  /** The scene's y of a height above the sea, over the site. */
  T.y = (h) => h + p.airShown.base;
  /** Put the eye at (x, y, z) in the scene, looking `el` degrees up (toward +X when level), and draw. */
  // (the camera is the test's: no rig moves it, so it is exactly where it is put, however high or low)
  st.cam.update = () => {};
  T.at = async (x, y, z, el) => {
    const e = (el * Math.PI) / 180;
    st.camera.position.set(x, y, z);
    st.camera.lookAt(x + Math.cos(e), y + Math.sin(e), z);
    st.camera.updateMatrixWorld();
    for (let i = 0; i < 3; i++) {
      st.dirty = true;
      await frame();
    }
    const c = st.camera.position;
    const off = Math.hypot(c.x - x, c.y - y, c.z - z);
    if (off > 1)
      throw new Error(`the eye was asked for (${x.toFixed(0)}, ${y.toFixed(0)}, ${z.toFixed(0)}) and is ${off.toFixed(1)} m off it`);
    return [c.x, c.y, c.z];
  };
  /** The canvas as drawn, and its pixels. */
  T.grab = () => {
    copy.width = src.width;
    copy.height = src.height;
    pen.drawImage(src, 0, 0);
    return { w: copy.width, h: copy.height, data: pen.getImageData(0, 0, copy.width, copy.height).data };
  };
  T.picture = () => copy.toDataURL('image/jpeg', 0.85);
  /** Draw with the clouds and the sheets left off (true) or on: to tell their steps from the rest of the scene's. */
  const render = p.render.bind(p);
  T.cloudless = (off) => {
    p.render = off
      ? (...a) => {
          render(...a);
          p.uniforms.uClouds.value = 0;
        }
      : render;
  };
  /** The march's result as it stands, with what it was marched from. */
  T.snap = () => {
    const rt = p.low;
    const w = rt.width,
      h = rt.height;
    const a = new Uint16Array(w * h * 4),
      b = new Uint16Array(w * h * 4);
    st.renderer.readRenderTargetPixels(rt, 0, 0, w, h, a, undefined, 0);
    st.renderer.readRenderTargetPixels(rt, 0, 0, w, h, b, undefined, 1);
    const alpha = new Float32Array(w * h),
      lum = new Float32Array(w * h),
      front = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) {
      alpha[i] = half(a[i * 4 + 3]);
      lum[i] = 0.2126 * half(a[i * 4]) + 0.7152 * half(a[i * 4 + 1]) + 0.0722 * half(a[i * 4 + 2]);
      front[i] = half(b[i * 4]);
    }
    const cam = st.camera;
    const u = p.uniforms;
    const eye = [cam.position.x, cam.position.y, cam.position.z];
    return {
      w,
      h,
      alpha,
      lum,
      front,
      eye,
      drift: [eye[0] - u.uField.value.x, eye[2] - u.uField.value.y],
      m: cam.matrixWorld.elements.slice(),
      pm: cam.projectionMatrix.elements.slice(),
      pi: cam.projectionMatrixInverse.elements.slice(),
    };
  };
  /** The ray through a pixel of a snapshot (its pixel's middle), in the scene. */
  T.ray = (S, i, j) => {
    const x = ((i + 0.5) / S.w) * 2 - 1,
      y = ((j + 0.5) / S.h) * 2 - 1;
    const q = S.pi;
    const vw = q[3] * x + q[7] * y + q[11] + q[15];
    let cx = (q[0] * x + q[4] * y + q[8] + q[12]) / vw,
      cy = (q[1] * x + q[5] * y + q[9] + q[13]) / vw,
      cz = (q[2] * x + q[6] * y + q[10] + q[14]) / vw;
    const n = Math.hypot(cx, cy, cz);
    cx /= n;
    cy /= n;
    cz /= n;
    const M = S.m;
    return [M[0] * cx + M[4] * cy + M[8] * cz, M[1] * cx + M[5] * cy + M[9] * cz, M[2] * cx + M[6] * cy + M[10] * cz];
  };
  /** Where a point of the scene falls in a snapshot (its pixels, fractional), and how far off it is. */
  T.project = (S, P) => {
    const M = S.m;
    const d = [P[0] - S.eye[0], P[1] - S.eye[1], P[2] - S.eye[2]];
    const cx = M[0] * d[0] + M[1] * d[1] + M[2] * d[2],
      cy = M[4] * d[0] + M[5] * d[1] + M[6] * d[2],
      cz = M[8] * d[0] + M[9] * d[1] + M[10] * d[2];
    const q = S.pm;
    const X = q[0] * cx + q[4] * cy + q[8] * cz + q[12],
      Y = q[1] * cx + q[5] * cy + q[9] * cz + q[13],
      W = q[3] * cx + q[7] * cy + q[11] * cz + q[15];
    if (W <= 0) return null;
    return [((X / W) * 0.5 + 0.5) * S.w - 0.5, ((Y / W) * 0.5 + 0.5) * S.h - 0.5, Math.hypot(...d)];
  };
  /** One snapshot against the next: see the header. */
  T.compare = (L, S, tolerance) => {
    const out = { pairs: 0, fixed: 0, moved: 0, kept: 0 };
    const { w, h } = S;
    if (L.w !== w || L.h !== h) return out;
    for (let j = 1; j < h - 1; j += 2)
      for (let i = 1; i < w - 1; i += 2) {
        const k = j * w + i;
        if (!(L.alpha[k] > 0.5) || !(L.front[k] < 3e4)) continue;
        const r = T.ray(L, i, j);
        const P = [
          L.eye[0] + r[0] * L.front[k] + (S.drift[0] - L.drift[0]),
          L.eye[1] + r[1] * L.front[k],
          L.eye[2] + r[2] * L.front[k] + (S.drift[1] - L.drift[1]),
        ];
        const s = T.project(S, P);
        if (!s) continue;
        const [x, y, dist] = s;
        if (x < 1 || y < 1 || x > w - 2 || y > h - 2) continue;
        const tol = Math.max(8, tolerance * dist);
        let ok = false,
          hidden = false;
        for (let dy = -1; dy <= 1 && !ok; dy++)
          for (let dx = -1; dx <= 1 && !ok; dx++) {
            const kk = (Math.round(y) + dy) * w + Math.round(x) + dx;
            if (S.alpha[kk] > 0.3 && Math.abs(S.front[kk] - dist) < tol) ok = true;
            else if (S.alpha[kk] > 0.5 && S.front[kk] < dist - tol) hidden = true;
          }
        if (!ok && hidden) continue; // (behind nearer cloud now)
        out.pairs++;
        if (ok) out.fixed++;
        if (Math.hypot(x - i, y - j) >= 4) {
          out.moved++;
          if (
            S.alpha[k] > 0.3 &&
            Math.abs(S.front[k] - L.front[k]) < Math.max(1, 0.002 * L.front[k]) &&
            Math.abs(S.lum[k] - L.lum[k]) < 0.01 * Math.max(L.lum[k], 1e-3) + 1e-4
          )
            out.kept++;
        }
      }
    return out;
  };
  window.cloudsTest = T;
}

for (const id of FLIGHTS) {
  const name = id.split('/').at(-1);
  const { page, errors, close } = await open(browser, `${url}#${id}/fly`, { viewport: [1280, 800], timeout: 240000 });
  await page.addStyleTag({ content: '#ui, #gallery, #title, .notes, .deck, #cockpit { display: none !important }' });
  await page.evaluate(install);
  const day = await page.evaluate(() => {
    const air = window.sr.stage.pipe.clouds.airShown;
    const d = air?.day;
    return {
      cumulus: air?.clouds ? { base: air.clouds.height, top: air.clouds.height + air.clouds.depth } : null,
      deck: d && d.deck.cover > 0 ? d.deck.height : null,
      high: d && (d.high.cover ?? 0) > 0 ? d.high.height : null,
    };
  });
  // (the layers as clouds.ts has them: SHEET_DEPTH)
  const layers = [
    ...(day.deck !== null ? [{ sheet: 'the middle deck', lo: day.deck, hi: day.deck + 300 }] : []),
    ...(day.high !== null ? [{ sheet: 'the high cloud', lo: day.high - 400, hi: day.high + 400 }] : []),
  ];
  console.log(
    `${name}: cumulus ${day.cumulus ? `${day.cumulus.base}-${day.cumulus.top} m` : 'none'}; sheets ${layers.map((l) => `${l.sheet} ${l.lo}-${l.hi} m`).join(', ') || 'none'}`,
  );

  for (const look of LOOKS) {
    await page.evaluate((look) => window.sr.stage.setLook(look), look);
    const where = `${name}, ${look}`;

    // From high over each layer, straight down: the eye moved across by a hundredth of its height (one way, then
    // another), everything on the ground and in the air moves across the view by four pixels or more. An edge (a step of 24 levels from one pixel to
    // the next) that is drawn at the same pixel in both, the same, is one kept round the eye: the edge of a fade, a
    // hand-over or a hole. Fewer than 1 % of the frame's edges may be.
    const tops = [...(day.cumulus ? [['the cumulus', day.cumulus.top]] : []), ...layers.map((l) => [l.sheet, l.hi])];
    for (const [layer, top] of doing('above') ? tops : [])
      for (const gap of [300, 2000, 8000, 25000]) {
        const got = await page.evaluate(
          async ([top, gap, keep]) => {
            const T = window.cloudsTest;
            const h = top + gap;
            await T.at(0, T.y(h), 0, -89.9);
            const a = T.grab();
            const picture = keep ? T.picture() : null;
            // (moved two ways in turn, across and along: a straight edge lying the way the eye moved, a road, is drawn
            // on itself after the move, and is not kept round the eye unless it is so after the other move as well)
            await T.at(0.01 * h, T.y(h), 0, -89.9);
            const b = T.grab();
            await T.at(0, T.y(h), 0.01 * h, -89.9);
            const c = T.grab();
            const marks = [];
            const lum = (d, i) => 0.2126 * d[4 * i] + 0.7152 * d[4 * i + 1] + 0.0722 * d[4 * i + 2];
            const { w, h: hh } = a;
            let edges = 0,
              kept = 0;
            for (let y = 2; y < hh - 2; y += 2)
              for (let x = 2; x < w - 2; x += 2) {
                const i = y * w + x;
                const gx = lum(a.data, i + 1) - lum(a.data, i),
                  gy = lum(a.data, i + w) - lum(a.data, i);
                if (Math.max(Math.abs(gx), Math.abs(gy)) < 24) continue;
                edges++;
                const same = (o) =>
                  Math.abs(lum(o.data, i) - lum(a.data, i)) <= 3 &&
                  Math.abs(lum(o.data, i + 1) - lum(o.data, i) - gx) <= 4 &&
                  Math.abs(lum(o.data, i + w) - lum(o.data, i) - gy) <= 4;
                if (same(b) && same(c)) {
                  kept++;
                  if (keep) marks.push(x, y);
                }
              }
            return { edges, kept, picture, marks };
          },
          [top, gap, Boolean(shots)],
        );
        if (shots) {
          writeFileSync(
            join(shots, `${name}-${look}-above-${Math.round(top)}-${gap}.png`),
            Buffer.from(got.picture.split(',')[1], 'base64'),
          );
          writeFileSync(join(shots, `${name}-${look}-above-${Math.round(top)}-${gap}.kept.json`), JSON.stringify(got.marks));
        }
        const share = got.kept / Math.max(got.edges, 1);
        check(
          got.edges < 50 || share < 0.01,
          `${where}: ${layer}, ${gap} m over it, straight down: ${got.kept} of ${got.edges} edges kept round the eye as it moved (${(100 * share).toFixed(2)} %)`,
        );
      }

    if (day.cumulus && doing('climb')) {
      // a cloud to climb through: looked for from over the layer, straight down, nearest the middle of the view
      const spot = await page.evaluate(
        async ([top]) => {
          const T = window.cloudsTest;
          for (const [x, z] of [
            [0, 0],
            [3000, 2000],
            [-4000, 1500],
            [2000, -5000],
          ]) {
            await T.at(x, T.y(top + 1500), z, -89.9);
            const S = T.snap();
            let best = null;
            for (let j = 0; j < S.h; j++)
              for (let i = 0; i < S.w; i++) {
                const k = j * S.w + i;
                if (!(S.alpha[k] > 0.95)) continue;
                const r2 = (i - S.w / 2) ** 2 + (j - S.h / 2) ** 2;
                if (!best || r2 < best.r2) best = { r2, i, j, front: S.front[k] };
              }
            if (best) {
              const r = T.ray(S, best.i, best.j);
              return [S.eye[0] + r[0] * (best.front + 40), S.eye[2] + r[2] * (best.front + 40)];
            }
          }
          return null;
        },
        [day.cumulus.top],
      );
      check(spot !== null, `${where}: a cumulus to climb through`);
      if (spot)
        for (const el of [0, 35, -35]) {
          const got = await page.evaluate(
            async ([x, z, from, to, el, SPEED, DT, TOLERANCE, keep]) => {
              const T = window.cloudsTest;
              const sum = { pairs: 0, fixed: 0, moved: 0, kept: 0, frames: 0 };
              const pictures = [];
              let last = null;
              for (let h = from; h <= to; h += SPEED * DT) {
                await T.at(x, T.y(h), z, el);
                const S = T.snap();
                if (last) for (const [key, n] of Object.entries(T.compare(last, S, TOLERANCE))) sum[key] += n;
                last = S;
                sum.frames++;
                if (keep && sum.frames % 4 === 1) {
                  T.grab();
                  pictures.push(T.picture());
                }
              }
              return { sum, pictures };
            },
            [spot[0], spot[1], day.cumulus.base - 300, day.cumulus.top + 300, el, SPEED, DT, TOLERANCE, Boolean(shots)],
          );
          const { sum } = got;
          const fixed = sum.fixed / Math.max(sum.pairs, 1),
            kept = sum.kept / Math.max(sum.moved, 1);
          check(
            sum.pairs > 2000 && fixed >= 0.97,
            `${where}, climbing through the cumulus looking ${el > 0 ? 'up' : el < 0 ? 'down' : 'level'}: ${(100 * fixed).toFixed(1)} % of ${sum.pairs} points of cloud where the world has them next frame`,
          );
          check(
            kept <= 0.005,
            `${where}, the same: ${(100 * kept).toFixed(2)} % of ${sum.moved} the move shifts drawn unchanged on the screen`,
          );
          if (shots)
            got.pictures.forEach((pic, i) =>
              writeFileSync(
                join(shots, `${name}-${look}-climb${el}-${String(i).padStart(2, '0')}.jpg`),
                Buffer.from(pic.split(',')[1], 'base64'),
              ),
            );
        }
    }

    for (const layer of doing('sheets') ? layers : []) {
      // the same place of the sheet from near and far, looking straight down at it from over the layer and straight up from under it
      for (const [side, el] of [
        ['over', -89.9],
        ['under', 89.9],
      ]) {
        const got = await page.evaluate(
          async ([lo, hi, el]) => {
            const T = window.cloudsTest;
            // (straight down or up the middle of the view is one line, near or far: the same place of the sheet, and the
            // same of everything behind it. So only the middle is compared, at places 230 m apart over 1.6 km.)
            const middle = (im) => {
              let s = 0;
              for (let dy = -2; dy <= 2; dy++)
                for (let dx = -2; dx <= 2; dx++) {
                  const i = ((im.h / 2 + dy) * im.w + im.w / 2 + dx) * 4;
                  s += 0.2126 * im.data[i] + 0.7152 * im.data[i + 1] + 0.0722 * im.data[i + 2];
                }
              return s / 25;
            };
            let bright = 0,
              lost = 0;
            for (let i = -3; i <= 3; i++)
              for (let j = -3; j <= 3; j++) {
                const look = async (gap) => {
                  await T.at(230 * i + 11, T.y(el < 0 ? hi + gap : lo - gap), 230 * j + 7, el);
                  return middle(T.grab());
                };
                const far = await look(2000),
                  near = await look(300);
                if (far < 170) continue;
                bright++;
                if (near < far - 40) lost++;
              }
            return { bright, lost };
          },
          [layer.lo, layer.hi, el],
        );
        const share = got.lost / Math.max(got.bright, 1);
        check(
          got.lost <= 1 || share < 0.1,
          `${where}: ${layer.sheet} from ${side} it, near and far: ${got.lost} of ${got.bright} places of cloud from 2 km gone from 300 m (${(100 * share).toFixed(1)} %)`,
        );
      }
      // and crossed straight up at a vehicle's speed, looking level and down: nothing steps. Where a frame changes from
      // the last by more than 3 levels on the mean, the climb between them is halved four times, each time into the
      // half that changed more: a change that is continuous shrinks with it (to a sixteenth, and a little more where
      // it is steep), a step does not
      for (const el of [0, -35]) {
        const got = await page.evaluate(
          async ([lo, hi, el, SPEED, DT, keep]) => {
            const T = window.cloudsTest;
            const at = async (h) => {
              await T.at(0, T.y(h), 0, el);
              return T.grab().data.slice();
            };
            const differ = (a, b) => {
              let sum = 0,
                n = 0;
              for (let i = 0; i < a.length; i += 4 * 37) {
                sum += Math.abs(0.2126 * (a[i] - b[i]) + 0.7152 * (a[i + 1] - b[i + 1]) + 0.0722 * (a[i + 2] - b[i + 2]));
                n++;
              }
              return sum / n;
            };
            const pictures = [];
            const steps = [];
            let lastH = null,
              last = null;
            for (let h = lo - 250; h <= hi + 250; h += SPEED * DT) {
              const im = await at(h);
              if (keep) pictures.push([h, T.picture()]);
              if (last) {
                const whole = differ(last, im);
                if (whole > 3) {
                  let a = lastH,
                    b = h,
                    ia = last,
                    ib = im,
                    left = whole;
                  for (let k = 0; k < 4; k++) {
                    const m = 0.5 * (a + b),
                      im2 = await at(m);
                    const d1 = differ(ia, im2),
                      d2 = differ(im2, ib);
                    if (d1 >= d2) {
                      b = m;
                      ib = im2;
                      left = d1;
                    } else {
                      a = m;
                      ia = im2;
                      left = d2;
                    }
                  }
                  // (and the same 1.6 m drawn without the clouds: a step the scene has without them is not theirs)
                  let bare = 0;
                  if (left > 2 && left > 0.25 * whole) {
                    T.cloudless(true);
                    bare = differ(await at(a), await at(b));
                    T.cloudless(false);
                  }
                  steps.push({ h, whole, left, a, b, bare });
                }
                await at(h); // (back where the climb is)
              }
              last = im;
              lastH = h;
            }
            // (the clouds' own share of a step: what it was less what the scene does there without them)
            for (const st of steps) st.own = Math.max(0, st.left - st.bare);
            steps.sort((x, y) => y.own / y.whole - x.own / x.whole);
            return { steps: steps.slice(0, 3), pictures };
          },
          [layer.lo, layer.hi, el, SPEED, DT, Boolean(shots)],
        );
        if (shots)
          for (const [h, pic] of got.pictures)
            writeFileSync(
              join(shots, `${name}-${look}-${layer.lo}-cross${el}-${Math.round(h)}.jpg`),
              Buffer.from(pic.split(',')[1], 'base64'),
            );
        const worst = got.steps[0];
        check(
          !worst || worst.own <= 2 || worst.own <= 0.25 * worst.whole,
          `${where}: crossing ${layer.sheet} looking ${el < 0 ? 'down' : 'level'}: ${
            worst
              ? `the most a ${(SPEED * DT).toFixed(0)} m climb changed it that did not shrink with the climb: ${worst.whole.toFixed(1)} levels, ${worst.left.toFixed(1)} of them within ${(worst.b - worst.a).toFixed(1)} m at ${worst.a.toFixed(0)} m${worst.bare > 0.5 ? ` (${worst.bare.toFixed(1)} the scene's own, without the clouds)` : ''}`
              : 'no climb changed it by more than 3 levels'
          }`,
        );
      }
    }
  }
  check(errors.length === 0, `${name}: no errors on the page${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
  await close();
}

// A glow hides nothing: the glow of entry round Freedom 7 at T+510 (tools/glow-test.mjs's poses: in its wake at 5 m,
// looking down the stream at the cloud far below, and beside it at 9 m), at a desk's width and a phone's, in both
// looks. Light only adds: with the glow, no pixel may be darker than without it by 24 levels or more (fewer than
// 0.2 % of them). It had hidden the cloud behind it and not the sea: a disc round the view with the cloud cut away.
if (FLIGHTS.includes('usa/mercury/mr-3-freedom-7') && doing('glow'))
  for (const [w, h] of [
    [390, 844],
    [1280, 800],
  ]) {
    const { page, errors, close } = await open(browser, `${url}#usa/mercury/mr-3-freedom-7/site/vehicle`, {
      viewport: [w, h],
      timeout: 240000,
    });
    await page.addStyleTag({ content: '#ui, #gallery, #title, .notes { display: none !important }' });
    for (const look of LOOKS)
      for (const pose of [
        { name: 'in its wake at 5 m', down: 1, side: 0, distance: 5 },
        { name: 'beside it at 9 m', down: 0.15, side: 1, distance: 9 },
      ]) {
        const got = await page.evaluate(
          async ([look, pose, keep]) => {
            const sr = window.sr;
            const st = sr.stage;
            const frame = () => new Promise((r) => requestAnimationFrame(r));
            st.setAutoRotate(false);
            st.setLook(look);
            sr.clock.pause();
            sr.clock.seek(510);
            st.frame();
            st.setCamera('chase');
            for (let i = 0; i < 300 && (st.cam.chase.journey || st.cam.blend); i++) await frame();
            const shock = st.effects?.shock;
            if (!shock?.mesh.visible) return null;
            const V = shock.mesh.position.constructor;
            const down = new V(0, 1, 0).applyQuaternion(shock.mesh.getWorldQuaternion(shock.mesh.quaternion.clone()));
            const side = new V().crossVectors(down, new V(0, 1, 0));
            if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
            side.normalize();
            const dir = down.clone().multiplyScalar(pose.down).addScaledVector(side, pose.side).normalize();
            const c = st.cam.chase;
            c.calm = true;
            c.min = 0.2;
            const o = dir.clone().applyQuaternion(c.turn.clone().invert());
            for (let i = 0; i < 2; i++) {
              c.theta = Math.atan2(o.x, o.z);
              c.phi = Math.acos(Math.max(-1, Math.min(1, o.y)));
              c.zoom(Math.log(pose.distance / c.distance), null);
              c.handSet = true;
              await new Promise((r) => setTimeout(r, 1200));
            }
            c.calm = false;
            st.frozen = true;
            const src = document.querySelector('#stage');
            const copy = document.createElement('canvas');
            copy.width = src.width;
            copy.height = src.height;
            const pen = copy.getContext('2d', { willReadFrequently: true });
            const grab = async () => {
              for (let i = 0; i < 3; i++) {
                st.dirty = true;
                await frame();
              }
              pen.drawImage(src, 0, 0);
              return pen.getImageData(0, 0, copy.width, copy.height).data;
            };
            const shown = await grab();
            const picture = keep ? copy.toDataURL('image/png') : null;
            shock.mesh.visible = false;
            const bare = await grab();
            shock.mesh.visible = true;
            await grab();
            st.frozen = false;
            const lum = (d, k) => 0.2126 * d[k] + 0.7152 * d[k + 1] + 0.0722 * d[k + 2];
            let darker = 0;
            for (let k = 0; k < shown.length; k += 4) if (lum(shown, k) < lum(bare, k) - 24) darker++;
            return { darker, all: shown.length / 4, picture, eyeH: st.pipe.clouds.uniforms.uEyeH.value };
          },
          [look, pose, Boolean(shots)],
        );
        const where = `freedom 7 at ${w}, T+510, ${look}, the glow of entry from ${pose.name}`;
        if (!got) {
          check(false, `${where}: the glow is on`);
          continue;
        }
        if (shots && got.picture)
          writeFileSync(
            join(shots, `glow-${w}-${look}-${pose.name.replaceAll(' ', '-')}.png`),
            Buffer.from(got.picture.split(',')[1], 'base64'),
          );
        const share = got.darker / got.all;
        check(
          share < 0.002,
          `${where} (${(got.eyeH / 1000).toFixed(1)} km up): ${got.darker} pixels darker with it than without it (${(100 * share).toFixed(2)} %)`,
        );
      }
    check(
      errors.length === 0,
      `freedom 7's glow at ${w}: no errors on the page${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`,
    );
    await close();
  }

await browser.close();
console.log(failures.length ? `${failures.length} failed` : 'all passed');
process.exit(failures.length ? 1 : 0);
