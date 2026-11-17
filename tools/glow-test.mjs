// The glow of entry is a glow from anywhere the chase view can be, never the box it is marched in (GitHub issue #33).
//   pnpm dev, then: node tools/glow-test.mjs [url] [--shots <dir>] [--flights vostok-2,mr-3-freedom-7]
// Each flight is put on the record's flight at instants in the heating part of its descent, at a desk's width and a
// phone's, in both looks, and the chase view is set round the glow's box: in the wake on the stream's axis at 5 and 9 m
// (inside the box), beside it at 5, 9 and 20 m, and ahead of it and to one side at 9 and 20 m. At each, frozen, the frame
// is drawn with the glow and without it, and without the vehicle, and what the glow adds is read where neither the
// vehicle nor an edge of the scene behind is (a cloud's, the horizon: what the glow adds changes there with what it is
// added to), nor where the frame is white with it. A glow falls off smoothly; the box's walls, the near plane cutting
// them and a stand-in for the body with straight sides each make a straight-edged step in what it adds. So the pixels
// where what it adds changes by STEP levels or more from one pixel to the next, that change being most of the change over
// the seven pixels round it (a falloff, however steep, is spread over several), are gathered, and a line is looked for
// through them (a Hough transform, every degree): it fails if one straight line runs through more than LINE of them (a
// share of the frame's diagonal). It also fails if the glow is not seen where it is bright, or the page went wrong.
// --shots writes each frame and a map of its steps (red), of what was left out (grey) and of what the glow adds.
// Last, Liberty Bell 7's glow fitted to the model after its heat shield was let down stands where it does fitted at liftoff.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { checks, launch, open, opt, url as urlOf } from './browser.mjs';

const args = process.argv.slice(2);
const shots = opt(args, '--shots', null);
const only = opt(args, '--flights', null)?.split(',');
const url = urlOf(args);
if (shots) mkdirSync(shots, { recursive: true });

/** Each flight and its instants: Vostok 2 where it was seen (T+90400, its instrument module still on) and at its brightest; Freedom 7 at its brightest. */
const FLIGHTS = [
  { id: 'ussr/vostok/vostok-2', at: [90400, 90560] },
  { id: 'usa/mercury/mr-3-freedom-7', at: [510] },
].filter((f) => !only || only.includes(f.id.split('/').at(-1)));
/** The poses: which way from the vehicle (down the stream, across it, up it and to one side) and how far, metres. */
const POSES = [
  { name: 'in the wake', down: 1, side: 0, distance: 5 },
  { name: 'in the wake', down: 1, side: 0, distance: 9 },
  { name: 'beside', down: 0.15, side: 1, distance: 5 },
  { name: 'beside', down: 0.15, side: 1, distance: 9 },
  { name: 'beside', down: 0.15, side: 1, distance: 20 },
  { name: 'ahead', down: -1, side: 0.7, distance: 9 },
  { name: 'ahead', down: -1, side: 0.7, distance: 20 },
];
const SIZES = [
  [1280, 800],
  [390, 844],
];
const LOOKS = ['real', 'cel'];
/** A change in what the glow adds from one pixel to the next, levels of 255, that is a step and not a falloff. */
const STEP = 10;
/** The longest straight run of steps allowed, as a share of the frame's diagonal. */
const LINE = 0.06;

const { check, failures } = checks();
const browser = await launch();

for (const flight of FLIGHTS) {
  for (const [w, h] of SIZES) {
    const where = `${flight.id.split('/').at(-1)} at ${w}`;
    const { page, errors, close } = await open(browser, `${url}#${flight.id}/site/vehicle`, { viewport: [w, h], timeout: 180000 });
    await page.addStyleTag({ content: '#ui, #gallery, #title, .notes { display: none !important }' });
    for (const t of flight.at) {
      for (const look of LOOKS) {
        for (const pose of POSES) {
          const name = `${where}, T+${t}, ${look}, ${pose.name} at ${pose.distance} m`;
          const got = await page.evaluate(
            async ([t, look, pose, STEP, keepMap]) => {
              const sr = window.sr;
              const st = sr.stage;
              const frame = () => new Promise((r) => requestAnimationFrame(r));
              st.setAutoRotate(false);
              st.setLook(look);
              sr.clock.pause();
              sr.clock.seek(t);
              st.frame();
              st.setCamera('chase');
              for (let i = 0; i < 300 && (st.cam.chase.journey || st.cam.blend); i++) await frame();
              const shock = st.effects?.shock;
              if (!shock?.mesh.visible) return { none: true };
              const V = shock.mesh.position.constructor;
              // the stream's way in the world, and a way across it as level as it can be
              const down = new V(0, 1, 0).applyQuaternion(shock.mesh.getWorldQuaternion(shock.mesh.quaternion.clone()));
              const side = new V().crossVectors(down, new V(0, 1, 0));
              if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
              side.normalize();
              const dir = down.clone().multiplyScalar(pose.down).addScaledVector(side, pose.side).normalize();
              // (the chase view put there at once, twice: the same pose whatever the camera was doing before)
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
              const picture = copy.toDataURL('image/png');
              shock.mesh.visible = false;
              const bare = await grab();
              const model = shock.profiled ?? st.effects.glow?.found; // (the flown model: what the glow stands round)
              const was = model?.visible;
              if (model) model.visible = false;
              const empty = await grab();
              if (model) model.visible = was;
              shock.mesh.visible = true;
              await grab();
              st.frozen = false;
              const eye = shock.mesh.worldToLocal(st.camera.position.clone());
              const inside = Math.max(Math.abs(eye.x), Math.abs(eye.y), Math.abs(eye.z)) < 1;

              const W = copy.width;
              const H = copy.height;
              // what the glow adds (the most of any channel); and what it is not read at: the vehicle, and every edge of the
              // scene behind it (a cloud's, the horizon), where what it adds changes with what it is added to; and where
              // the frame is white with it, where it adds only what the scene lacks of white. Each grown by a few pixels.
              const added = new Float32Array(W * H);
              const skip = new Uint8Array(W * H);
              let seen = 0;
              const most = (f, k, g, j) => Math.max(Math.abs(f[k] - g[j]), Math.abs(f[k + 1] - g[j + 1]), Math.abs(f[k + 2] - g[j + 2]));
              for (let i = 0; i < W * H; i++) {
                const k = 4 * i;
                added[i] = most(shown, k, bare, k);
                if (added[i] > 8) seen++;
                const edge = (i % W < W - 1 && most(bare, k, bare, k + 4) > 6) || (i < W * (H - 1) && most(bare, k, bare, k + 4 * W) > 6);
                const white = Math.min(shown[k], shown[k + 1], shown[k + 2]) >= 250;
                if (most(bare, k, empty, k) > 2) skip[i] = 4;
                else if (edge || white) skip[i] = 2;
              }
              const out = new Uint8Array(W * H);
              for (let y = 0; y < H; y++)
                for (let x = 0; x < W; x++) {
                  const r = skip[y * W + x];
                  if (!r) continue;
                  for (let dy = -r; dy <= r; dy++)
                    for (let dx = -r; dx <= r; dx++) {
                      const X = x + dx;
                      const Y = y + dy;
                      if (X >= 0 && Y >= 0 && X < W && Y < H) out[Y * W + X] = 1;
                    }
                }
              // steps: where what the glow adds changes by STEP or more from a pixel to the next, and that change is most of
              // the change over the seven pixels round it (a falloff, however steep, is spread over many; an edge is in one)
              const steps = [];
              const map = new Uint8Array(W * H);
              const sharp = (i, d) => {
                const one = Math.abs(added[i + d] - added[i]);
                return one >= STEP && one >= 0.6 * Math.abs(added[i + 4 * d] - added[i - 3 * d]);
              };
              for (let y = 4; y < H - 4; y++)
                for (let x = 4; x < W - 4; x++) {
                  const i = y * W + x;
                  if (out[i] || out[i + 1] || out[i + W]) continue;
                  if (sharp(i, 1) || sharp(i, W)) {
                    steps.push(x, y);
                    map[i] = 1;
                  }
                }
              let stepMap = null;
              if (keepMap) {
                const pen2 = copy.getContext('2d');
                const img = pen2.createImageData(W, H);
                for (let i = 0; i < W * H; i++) {
                  const v = map[i] ? 255 : out[i] ? 40 : Math.min(255, added[i]) * 0.5;
                  img.data[4 * i] = map[i] ? 255 : v;
                  img.data[4 * i + 1] = map[i] ? 0 : v;
                  img.data[4 * i + 2] = map[i] ? 0 : v;
                  img.data[4 * i + 3] = 255;
                }
                pen2.putImageData(img, 0, 0);
                stepMap = copy.toDataURL('image/png');
              }
              // the straightest line through them: votes for (angle, distance from the middle) in degrees and pixels
              const angles = 180;
              const reach = Math.ceil(Math.hypot(W, H) / 2);
              const votes = new Uint16Array(angles * (2 * reach + 1));
              const cos = Float64Array.from({ length: angles }, (_, a) => Math.cos((a * Math.PI) / angles));
              const sin = Float64Array.from({ length: angles }, (_, a) => Math.sin((a * Math.PI) / angles));
              let best = 0;
              let bestAt = [0, 0];
              for (let s = 0; s < steps.length; s += 2) {
                const x = steps[s] - W / 2;
                const y = steps[s + 1] - H / 2;
                for (let a = 0; a < angles; a++) {
                  const rho = Math.round(x * cos[a] + y * sin[a]) + reach;
                  const v = ++votes[a * (2 * reach + 1) + rho];
                  if (v > best) {
                    best = v;
                    bestAt = [a, rho - reach];
                  }
                }
              }
              return {
                picture,
                stepMap,
                seen,
                steps: steps.length / 2,
                line: best,
                lineAt: bestAt,
                inside,
                off: st.camera.position.distanceTo(c.pivot),
                glow: shock.uniforms.uGlow.value,
                diagonal: Math.hypot(W, H),
              };
            },
            [t, look, pose, STEP, Boolean(shots)],
          );
          if (got.none) {
            check(false, `${name}: no glow shown at T+${t}`);
            continue;
          }
          if (shots) {
            const file = name.replaceAll(/[ ,+]+/g, '-');
            writeFileSync(join(shots, `${file}.png`), Buffer.from(got.picture.split(',')[1], 'base64'));
            writeFileSync(join(shots, `${file}.steps.png`), Buffer.from(got.stepMap.split(',')[1], 'base64'));
          }
          const longest = LINE * got.diagonal;
          check(
            got.line <= longest && (got.glow < 0.5 || got.seen > 2000),
            `${name} (${got.off.toFixed(1)} m off${got.inside ? ', inside the box' : ''}, glow ${got.glow.toFixed(2)}): ${got.seen} pixels lit by it, ${got.steps} steps in it, the longest straight run ${got.line} (at ${got.lineAt[0]} degrees, ${got.lineAt[1]} px; allowed ${longest.toFixed(0)})`,
          );
        }
      }
    }
    if (errors.length) check(false, `${where}: the page said ${errors.length} thing(s) went wrong: ${errors.slice(0, 3).join(' | ')}`);
    await close();
  }
}
// And the glow stands on the shield where it is in entry, whenever the model was first seen: Liberty Bell 7's shield is
// let down four feet at T+626 on its landing bag, and a glow fitted to the model as it stood after that, with the eye near
// enough for the finest level to be drawn, had its face four feet under the capsule's (and its body's profile read from
// there). The glow is fitted as the page first sees the model (Effects.fit); here it is fitted again with the clock past
// 626 s (let go, then shown there), then looked at in entry, against how it stood fitted at liftoff: where its box is, the
// face it stands on, and how far it reaches.
if (!only || only.includes('mr-4-liberty-bell-7')) {
  const { page, errors, close } = await open(browser, `${url}#usa/mercury/mr-4-liberty-bell-7/site/vehicle`, { timeout: 180000 });
  const got = await page.evaluate(async () => {
    const sr = window.sr;
    const st = sr.stage;
    sr.demo.stop(true);
    sr.demo.start = () => {};
    sr.clock.pause();
    const frames = async (n) => {
      for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(r));
    };
    const at = async (t) => {
      sr.clock.seek(t);
      await frames(8);
      const shock = sr.effects.shock;
      if (!shock?.mesh.visible) return null;
      const u = shock.uniforms;
      return { box: shock.mesh.position.toArray(), face: shock.face.toArray(), cap: u.uCap.value, top: u.uTop.value };
    };
    let entry = null;
    for (let t = 380; t <= 640 && entry === null; t += 10) if (await at(t)) entry = t + 20;
    if (entry === null) return null;
    await at(300);
    const before = await at(entry);
    await at(700);
    // (the eye near it, so the finest level is drawn and the hardware's clocked moves are on it)
    st.setCamera('chase');
    for (let i = 0; i < 300 && (st.cam.chase.journey || st.cam.blend); i++) await frames(1);
    st.cam.chase.calm = true;
    st.cam.chase.zoom(Math.log(8 / st.cam.chase.distance), null);
    st.cam.chase.handSet = true;
    await frames(30);
    sr.effects.dispose();
    await at(701);
    await at(300);
    const after = await at(entry);
    return { entry, before, after };
  });
  if (!got?.before || !got.after) check(false, `Liberty Bell 7: the glow seen in entry (${JSON.stringify(got)})`);
  else {
    const { before: a, after: b } = got;
    const off = Math.hypot(...b.box.map((v, i) => v - a.box[i]));
    const face = Math.hypot(...b.face.map((v, i) => v - a.face[i]));
    check(
      off < 0.01 && face < 0.01 && Math.abs(b.cap - a.cap) < 0.002 && Math.abs(b.top - a.top) < 0.002,
      `Liberty Bell 7 at T+${got.entry}: fitted after the shield was let down, the glow's box stands ${off.toFixed(3)} m and its face ${face.toFixed(3)} m from where they stand fitted at liftoff, its cap ${b.cap.toFixed(3)} of ${a.cap.toFixed(3)} radii and its reach ${b.top.toFixed(3)} of ${a.top.toFixed(3)}`,
    );
  }
  if (errors.length) check(false, `Liberty Bell 7: the page said ${errors.length} thing(s) went wrong: ${errors.slice(0, 3).join(' | ')}`);
  await close();
}
await browser.close();
console.log(failures.length ? `${failures.length} failed` : 'all passed');
process.exit(failures.length ? 1 : 0);
