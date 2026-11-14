// The predicted path's promises (viewer/path.ts, its header comment), checked in the running page on what it draws:
// both flights flown through a set of instants, each seen from the chase camera, from the orbit camera close to the
// vehicle, and from far enough out to see the whole Earth (where a player goes to read an orbit), in the real look and
// at some instants the cel look, at 1280 wide (and every third instant from the chase camera and far out at 820 and 390,
// where the panels take more of the view). At each it fails on
//   - a line that does not start at the vehicle (taken onto it within two gaps, pathline.ts),
//   - a chord that strays from the curve it stands for by more than CHORD_PX as seen from the eye, the line ahead's or the
//     line flown's,
//   - either line breaking into dots or fragments, or spreading into a sheet (its own pixels: the frame drawn with it
//     and without it, the clock stopped, the difference),
//   - a point of the line jumping between frames as the clock runs at life's rate,
//   - a marker away from its place, a chip for a place that is in view, a chip that points elsewhere than its place,
//     or one that overlaps a panel or another chip,
//   - an apsis marked where the path's radial speed does not change sign, a path that does not end where it comes down.
// Then each flight is taken over at seeded instants (--seed) and flown by scripted hands (Freedom 7 pitched hard over
// and its engine cut early; Vostok 1's ascent pitched and its stages cut early or late, its braking engine fired forward
// and back in orbit), checked at each step as above, run on to its end with nothing more done, and where it ends held
// against where the path said it would when the hands let go.
//   pnpm dev, then: node tools/path-test.mjs [url] [--shots <dir>] [--only f7|v1] [--quick] [--at 60,700] [--seed n] [--hands: the hands alone]
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : null;
};
const shots = flag('--shots');
const only = flag('--only');
const at = flag('--at');
const handsOnly = args.includes('--hands') ? args.splice(args.indexOf('--hands'), 1) && true : false;
const quick = args.includes('--quick') ? args.splice(args.indexOf('--quick'), 1) && true : false;
const url = args[0] ?? process.env.SR_URL ?? 'http://localhost:5180/';
if (shots) mkdirSync(shots, { recursive: true });

/** Pixels: the most a chord may stray from its curve (pathline.ts samples to 0.35; the rest is the camera having moved since). */
const CHORD_PX = 1;
/** Summed RGB difference that counts as the line's pixel; a piece of it smaller than DOT pixels is a dot, smaller than BIT a fragment. */
const INK = 60;
const DOT = 20;
const BIT = 80;
/** Pixels: as the clock runs at life's rate, a frame that moves a point of the line further than this, and three times as far as the frames round it, is a leap. */
const JUMP_PX = 3;
/** Degrees a chip's pointer may be off the bearing to its place; pixels a marker may be off its place. */
const AIM = 15;
const OFF = 3;
/** Pixels from the page's edge within which a place counts as at the edge, where a chip may stand for it (pathmarks.ts keeps a margin). */
const EDGE = 24;

const FLIGHTS = {
  f7: { id: 'usa/mercury/mr-3-freedom-7', instants: [5, 60, 142, 200, 300, 420, 560, 700] },
  v1: { id: 'ussr/vostok/vostok-1', instants: [5, 60, 118, 125, 200, 330, 600, 700, 1500, 3000, 4600, 4750, 5200, 5900, 6100, 6500] },
};
const VIEWS = ['chase', 'locked', 'onboard', 'far'];

let failed = 0;
let cases = 0;
const fail = (where, what) => {
  failed++;
  console.log(`  FAIL ${where}: ${what}`);
};
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
/** The window sizes: a laptop's, a tablet's upright and a phone's. */
const SIZES = [
  [1280, 800],
  [820, 1180],
  [390, 844],
];
let page = null;
const errors = [];
const turn = () => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

/** Put the view where it is asked for: the chase camera, the orbit camera 60 m off the vehicle, or 26,000 km off the Earth's centre. */
const view = (v) =>
  page.evaluate(async (v) => {
    const sr = window.sr;
    const st = sr.stage;
    st.setAutoRotate(false);
    if (v === 'far') {
      st.setCamera('orbit');
      const c = sr.path.centre ?? { x: 0, y: -6.37e6, z: 0 };
      st.pose(60, 35, 2.6e7, c.y, c.x, c.z);
    } else st.setCamera(v);
    // (the camera goes there, and the chips fade to where they are laid)
    for (let i = 0; i < 300 && (st.cam.orbit?.journey || st.cam.blend); i++) await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => setTimeout(r, 500));
  }, v);

/** The flight flown live by its own sequence from the pad to `t` (the clock run fast, as the bench does), stopped there, and a prediction made from there and drawn. */
const seek = (t) =>
  page.evaluate(async (t) => {
    const sr = window.sr;
    const c = sr.cockpit;
    const st = sr.stage;
    if (!window.__lit) {
      window.__lit = true;
      c.eventAt = -1e9;
      c.command('next'); // ignition
    }
    sr.clock.setRate(300);
    sr.clock.play(true);
    for (let i = 0; i < 20000 && sr.clock.t < t && !c.state?.landing; i++) {
      st.frame();
      if (i % 20 === 0) await new Promise((r) => requestAnimationFrame(r));
    }
    sr.clock.pause();
    const p = sr.path;
    const began = performance.now();
    while (performance.now() - began < 8000) {
      await new Promise((r) => requestAnimationFrame(r));
      if (p.shown && p.sample && !p.job && (!p.drawn || Math.abs(p.drawn.now - sr.clock.t) < 30)) break;
    }
    for (let i = 0; i < 6; i++) await new Promise((r) => requestAnimationFrame(r));
    return { shown: Boolean(p.shown), t: sr.clock.t, live: Boolean(p.live) };
  }, t);

/** What the page says of the line, the camera and the markers, measured from the line's own points where it gives them. */
const measure = () =>
  page.evaluate((CHORD_PX) => {
    const sr = window.sr;
    const p = sr.path;
    const cam = sr.stage.camera;
    const V = cam.position.constructor;
    const q = cam.quaternion.clone().invert();
    const W = innerWidth;
    const H = innerHeight;
    const tanHalf = Math.tan((cam.fov * Math.PI) / 360) / cam.zoom;
    const pxPerRad = H / 2 / tanHalf;
    const toView = (x, y, z) => new V(x, y, z).sub(cam.position).applyQuaternion(q);
    const toPage = (v) => {
      const c = v.clone().applyMatrix4(cam.projectionMatrix);
      return { x: ((c.x + 1) / 2) * W, y: ((1 - c.y) / 2) * H, front: v.z < 0 };
    };
    const out = { probe: typeof p.line === 'function' && typeof p.where === 'function', issues: [], marks: [], chips: [], panels: [] };
    const ship = new V();
    const vessel = sr.stage.vessel(ship);
    out.ship = vessel ? toPage(toView(ship.x, ship.y, ship.z)) : null;
    // the ball of the gap and the fade round the vehicle (path.ts: so many pixels at it), where the line comes in from nothing, as it is seen
    if (vessel && p.drawn && out.ship.front) {
      const d = ship.distanceTo(cam.position);
      out.fade = {
        x: out.ship.x,
        y: out.ship.y,
        r: Math.atan2(p.drawn.gap + p.drawn.fade, Math.max(d - p.drawn.gap - p.drawn.fade, 1e-3)) * pxPerRad,
      };
    }
    if (out.probe) {
      const L = p.line();
      const d = p.drawn;
      out.drawn = d;
      const n = L.t.length;
      out.chords = Math.max(0, n - 1);
      if (n > 1) {
        if (Math.abs(L.t[0] - d.now) > 1e-6)
          out.issues.push(`the line starts at ${L.t[0].toFixed(2)} s, not at the instant on show ${d.now.toFixed(2)}`);
        for (let i = 1; i < n; i++)
          if (!(L.t[i] > L.t[i - 1])) {
            out.issues.push(`the line goes back in time at its point ${i}`);
            break;
          }
        if (vessel) {
          const off = Math.hypot(L.p[0] - ship.x, L.p[1] - ship.y, L.p[2] - ship.z);
          if (off > Math.max(2 * d.gap, 0.01))
            out.issues.push(`the line starts ${off.toFixed(1)} m from the vehicle (gap ${d.gap.toFixed(1)} m)`);
        }
        // every chord against the curve it was cut from, as an angle from the eye
        let worst = 0;
        let at = -1;
        const near = 1.02 * cam.near;
        for (let i = 0; i + 1 < n; i++) {
          const tm = 0.5 * (L.t[i] + L.t[i + 1]);
          const m = p.where(tm);
          const a = toView(L.p[i * 3], L.p[i * 3 + 1], L.p[i * 3 + 2]);
          const b = toView(L.p[i * 3 + 3], L.p[i * 3 + 4], L.p[i * 3 + 5]);
          if (a.z > -near && b.z > -near) continue;
          const mv = toView(m[0], m[1], m[2]);
          // (what is seen: how far the curve is from the chord, wherever along it)
          const ab = b.clone().sub(a);
          const k = Math.min(1, Math.max(0, mv.clone().sub(a).dot(ab) / Math.max(ab.lengthSq(), 1e-12)));
          const mid = a.clone().addScaledVector(ab, k);
          const px = (mid.distanceTo(mv) / Math.max(mid.length(), near)) * pxPerRad;
          if (px > worst) {
            worst = px;
            at = i;
          }
        }
        out.worst = worst;
        // how much of the line should be seen: chords in front of the eye, on the page, past the vehicle's gap and fade and
        // not behind the Earth (the polar radius, as the shader has it), in pixels along them
        const C = p.centre;
        let expect = 0;
        for (let i = 0; i + 1 < n; i++) {
          const a = toView(L.p[i * 3], L.p[i * 3 + 1], L.p[i * 3 + 2]);
          const b = toView(L.p[i * 3 + 3], L.p[i * 3 + 4], L.p[i * 3 + 5]);
          if (a.z > -near || b.z > -near) continue;
          const mx = (L.p[i * 3] + L.p[i * 3 + 3]) / 2;
          const my = (L.p[i * 3 + 1] + L.p[i * 3 + 4]) / 2;
          const mz = (L.p[i * 3 + 2] + L.p[i * 3 + 5]) / 2;
          // (and not within three gaps: a path that doubles back there, straight up and down, lies on itself on the page)
          if (vessel && Math.hypot(mx - ship.x, my - ship.y, mz - ship.z) < Math.max(3 * d.gap, d.gap + d.fade)) continue;
          if (C) {
            const f = new V(mx, my, mz).sub(cam.position);
            const c = C.clone().sub(cam.position);
            const k = c.dot(f) / f.lengthSq();
            if (k > 0 && k < 1 && c.distanceTo(f.multiplyScalar(k)) < 6356752) continue;
          }
          const pa = toPage(a);
          const pb = toPage(b);
          const on = (q) => q.x >= 0 && q.x <= W && q.y >= 0 && q.y <= H;
          if (on(pa) && on(pb)) expect += Math.hypot(pb.x - pa.x, pb.y - pa.y);
        }
        out.expect = expect;
        if (worst > CHORD_PX) out.issues.push(`chord ${at} of ${n - 1} strays ${worst.toFixed(2)} px from its curve`);
        // the line flown, against the curve it was cut from, the same way
        const FT = L.flownT ?? [];
        out.flownChords = Math.max(0, FT.length - 1);
        out.flownWorst = 0;
        if (typeof p.flownWhere === 'function')
          for (let i = 0; i + 1 < FT.length; i++) {
            const a = toView(L.flown[i * 3], L.flown[i * 3 + 1], L.flown[i * 3 + 2]);
            const b = toView(L.flown[i * 3 + 3], L.flown[i * 3 + 4], L.flown[i * 3 + 5]);
            if (a.z > -near && b.z > -near) continue;
            const m = p.flownWhere(0.5 * (FT[i] + FT[i + 1]));
            const mv = toView(m[0], m[1], m[2]);
            const ab = b.clone().sub(a);
            const k = Math.min(1, Math.max(0, mv.clone().sub(a).dot(ab) / Math.max(ab.lengthSq(), 1e-12)));
            const mid = a.clone().addScaledVector(ab, k);
            out.flownWorst = Math.max(out.flownWorst, (mid.distanceTo(mv) / Math.max(mid.length(), near)) * pxPerRad);
          }
        if (out.flownWorst > CHORD_PX) out.issues.push(`a chord of the line flown strays ${out.flownWorst.toFixed(2)} px from its curve`);
        // the markers against the propagation they were found in: an apoapsis where the radial speed goes from rising to
        // falling, a periapsis the other way, the end where the path ends
        const r = p.prediction;
        if (r) {
          const P = r.points;
          const radial = (t) => {
            let i = 0;
            while (i + 2 < P.length && P[i + 1].t <= t) i++;
            // (on the cubic through the two points either side: their places and speeds, as predict.ts `between`)
            const [a, b] = [P[i], P[i + 1]];
            const h = b.t - a.t;
            const s = Math.min(1, Math.max(0, (t - a.t) / Math.max(h, 1e-9)));
            const [s2, s3] = [s * s, s * s * s];
            const w = [2 * s3 - 3 * s2 + 1, (s3 - 2 * s2 + s) * h, -2 * s3 + 3 * s2, (s3 - s2) * h];
            const dw = [(6 * s2 - 6 * s) / h, 3 * s2 - 4 * s + 1, (-6 * s2 + 6 * s) / h, 3 * s2 - 2 * s];
            let rv = 0;
            for (let k = 0; k < 3; k++) {
              const x = w[0] * a.r[k] + w[1] * a.v[k] + w[2] * b.r[k] + w[3] * b.v[k];
              const u = dw[0] * a.r[k] + dw[1] * a.v[k] + dw[2] * b.r[k] + dw[3] * b.v[k];
              rv += x * u;
            }
            return rv;
          };
          for (const mk of p.marks ?? []) {
            if ((mk.kind !== 'apogee' && mk.kind !== 'perigee') || mk.t - P[0].t < 3 || P.at(-1).t - mk.t < 3) continue;
            const [before, after] = [radial(mk.t - 2), radial(mk.t + 2)];
            const ok = mk.kind === 'apogee' ? before > 0 && after < 0 : before < 0 && after > 0;
            if (!ok) out.issues.push(`${mk.id} at T+${mk.t.toFixed(1)} is not where the path's radial speed changes sign`);
          }
          if (r.impact && Math.abs(r.impact.t - P.at(-1).t) > 1e-6) out.issues.push('the path does not end where it comes down');
        }
      }
    }
    // the markers and the chips, and the panels
    out.panels = sr.ui.panels().map((r) => ({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }));
    const now = p.drawn?.now ?? p.now ?? 0;
    for (const m of p.marks ?? []) {
      if (m.t <= now) continue;
      const v = m.at ? toView(m.at.x, m.at.y, m.at.z) : null;
      const place = v ? toPage(v) : null;
      const glyph = !m.el.classList.contains('gone') && getComputedStyle(m.el).display !== 'none' && !m.el.parentElement.hidden;
      const ce = m.chip.el;
      const op = Number(ce.style.opacity || getComputedStyle(ce).opacity);
      const box = ce.getBoundingClientRect();
      out.marks.push({ id: m.id, place, glyph, ex: m.ex, ey: m.ey });
      if (op > 0.5 && box.width > 0 && !ce.parentElement.hidden) {
        const laid = p.chipsLaid?.get(m.id);
        out.chips.push({
          id: m.id,
          x0: box.left,
          y0: box.top,
          x1: box.right,
          y1: box.bottom,
          place,
          laid: laid ? { px: laid.px, py: laid.py, angle: laid.angle } : null,
        });
      }
    }
    return out;
  }, CHORD_PX);

/** The line's own pixels: the frame with it and without it, the clock stopped and the camera still, the page's panels hidden. */
const pixels = async (name, fade = null, which = 'ahead') => {
  await page
    .addStyleTag({ content: '#ui > :not(.path-marks), #gallery, #title { visibility: hidden !important }' })
    .then((h) => (pixels.style = h));
  const shot = async (on) => {
    await page.evaluate(
      ([on, which]) => {
        // (one line at a time: the line ahead, or the line flown; the ring where it comes down, a loop of its own, hidden)
        const p = window.sr.path;
        p.mesh.material.visible = which === 'ahead' && on;
        if (p.ringMesh) p.ringMesh.material.visible = false;
        if (p.flownMesh) p.flownMesh.material.visible = which === 'flown' && on;
        window.sr.stage.dirty = true;
      },
      [on, which],
    );
    for (let i = 0; i < 6; i++) await turn();
    return (await page.screenshot({ type: 'png' })).toString('base64');
  };
  // (the dashes drawn under power are a pattern, not breaks: the line's pieces are counted with them off)
  const cut = await page.evaluate(() => {
    const u = window.sr.path.uniforms?.uCut;
    const was = u?.value ?? -1;
    if (u) u.value = -1;
    return was;
  });
  const a = await shot(true);
  const b = await shot(false);
  const c = await shot(true);
  await page.evaluate(() => {
    const p = window.sr.path;
    p.mesh.material.visible = true;
    if (p.flownMesh) p.flownMesh.material.visible = true;
    if (p.ringMesh) p.ringMesh.material.visible = true;
  });
  await page.evaluate((cut) => {
    const u = window.sr.path.uniforms?.uCut;
    if (u) u.value = cut;
  }, cut);
  await pixels.style.evaluate((el) => el.remove());
  if (shots && name) writeFileSync(join(shots, `${name}.png`), Buffer.from(a, 'base64'));
  return page.evaluate(
    async ([a, b, c, INK, DOT, BIT, fade]) => {
      const load = async (s) => {
        const img = new Image();
        img.src = `data:image/png;base64,${s}`;
        await img.decode();
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        return g.getImageData(0, 0, c.width, c.height);
      };
      const A = await load(a);
      const B = await load(b);
      const C = await load(c);
      const w = A.width;
      const h = A.height;
      const mask = new Uint8Array(w * h);
      // (what changes between two frames drawn alike, with the line both times, is not the line: the fire, a glint; it and two pixels round it are left out)
      const still = new Uint8Array(w * h).fill(1);
      for (let i = 0; i < w * h; i++) {
        const d =
          Math.abs(A.data[i * 4] - C.data[i * 4]) +
          Math.abs(A.data[i * 4 + 1] - C.data[i * 4 + 1]) +
          Math.abs(A.data[i * 4 + 2] - C.data[i * 4 + 2]);
        if (d > INK / 2) {
          const x = i % w;
          const y = (i - x) / w;
          for (let dy = -2; dy <= 2; dy++)
            for (let dx = -2; dx <= 2; dx++) if (x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < h) still[(y + dy) * w + x + dx] = 0;
        }
      }
      let area = 0;
      for (let i = 0; i < w * h; i++) {
        if (!still[i]) continue;
        const d =
          Math.abs(A.data[i * 4] - B.data[i * 4]) +
          Math.abs(A.data[i * 4 + 1] - B.data[i * 4 + 1]) +
          Math.abs(A.data[i * 4 + 2] - B.data[i * 4 + 2]);
        if (d > INK) {
          mask[i] = 1;
          area++;
        }
      }
      // its pieces (eight neighbours), after closing gaps of a pixel: the soft edge of a line fading in thresholds to a
      // ragged run of pixels, which is one piece; dots a few pixels apart (a ribbon under a pixel wide) stay apart
      const grown = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) {
        if (!mask[i]) continue;
        const x = i % w;
        const y = (i - x) / w;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) if (x + dx >= 0 && x + dx < w && y + dy >= 0 && y + dy < h) grown[(y + dy) * w + x + dx] = 1;
      }
      mask.set(grown);
      const seen = new Uint8Array(w * h);
      const pieces = [];
      const stack = [];
      for (let i = 0; i < w * h; i++) {
        if (!mask[i] || seen[i]) continue;
        let n = 0;
        // (a piece that runs off the page, or into what moves of itself, may go on there: it is not counted as a fragment)
        let open = false;
        let x0 = w;
        let y0 = h;
        let x1 = 0;
        let y1 = 0;
        stack.push(i);
        seen[i] = 1;
        while (stack.length) {
          const j = stack.pop();
          n++;
          const x = j % w;
          const y = (j - x) / w;
          if (x === 0 || y === 0 || x === w - 1 || y === h - 1 || !still[j]) open = true;
          x0 = Math.min(x0, x);
          x1 = Math.max(x1, x);
          y0 = Math.min(y0, y);
          y1 = Math.max(y1, y);
          for (let dy = -1; dy <= 1; dy++)
            for (let dx = -1; dx <= 1; dx++) {
              const xx = x + dx;
              const yy = y + dy;
              if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
              const k = yy * w + xx;
              if (!still[k]) open = true;
              if (mask[k] && !seen[k]) {
                seen[k] = 1;
                stack.push(k);
              }
            }
        }
        // (and one within the vehicle's gap and fade as seen, where the line comes in from nothing, may be its faint tail)
        if (fade && Math.hypot(Math.max(fade.x - x1, 0, x0 - fade.x), Math.max(fade.y - y1, 0, y0 - fade.y)) < fade.r) open = true;
        pieces.push({ n, x0, y0, x1, y1, open });
      }
      const dots = pieces.filter((p) => p.n < DOT && !p.open);
      const bits = pieces.filter((p) => p.n >= DOT && p.n < BIT && !p.open);
      return { area, pieces: pieces.length, dots: dots.length, bits: bits.map((p) => `${p.n}px@${p.x0},${p.y0}`), frac: area / (w * h) };
    },
    [a, b, c, INK, DOT, BIT, fade],
  );
};

/** As the clock runs at life's rate for a second, how far the line's point a minute ahead moves from one frame to the next, in pixels from the eye. */
const jumps = () =>
  page.evaluate(async () => {
    const sr = window.sr;
    const p = sr.path;
    if (typeof p.where !== 'function') return null;
    const cam = sr.stage.camera;
    const T = sr.clock.t + 60;
    sr.clock.setRate(1);
    sr.clock.play(true);
    let last = null;
    const moves = [];
    for (let i = 0; i < 40; i++) {
      await new Promise((r) => requestAnimationFrame(r));
      const end = p.line().t.at(-1);
      if (!(end > T)) continue;
      const w = p.where(T);
      const d = Math.hypot(w[0] - cam.position.x, w[1] - cam.position.y, w[2] - cam.position.z);
      const pxPerRad = innerHeight / 2 / (Math.tan((cam.fov * Math.PI) / 360) / cam.zoom);
      if (last) moves.push((Math.hypot(w[0] - last[0], w[1] - last[1], w[2] - last[2]) / d) * pxPerRad);
      last = w;
    }
    sr.clock.pause();
    // a leap: a frame that moves it more than JUMP_PX and three times as far as the frames round it do (under power the
    // future itself moves, eased, frame by frame: that is motion, not a jump)
    let worst = 0;
    for (let i = 0; i < moves.length; i++) {
      const round = moves
        .slice(Math.max(0, i - 4), i + 5)
        .filter((_, k) => k !== Math.min(i, 4))
        .sort((a, b) => a - b);
      const usual = round.length ? round[Math.floor(round.length / 2)] : 0;
      if (moves[i] > 3 * usual) worst = Math.max(worst, moves[i]);
    }
    return { worst, usual: moves.length ? [...moves].sort((a, b) => a - b)[Math.floor(moves.length / 2)] : 0 };
  });

const overlap = (a, b, m = 0) => a.x0 < b.x1 - m && b.x0 < a.x1 - m && a.y0 < b.y1 - m && b.y0 < a.y1 - m;

/** Everything checked of what is drawn now, from view `v`: the line ahead, the line flown, the markers and the chips. */
async function inspect(where, v, look, W, H) {
  const m = await measure();
  if (!m.probe) fail(where, 'the page gives no line to measure (sr.path.line, sr.path.where, sr.path.drawn)');
  for (const issue of m.issues) fail(where, issue);
  const px = await pixels(shots ? where.replaceAll(/[ +]/g, '-') : null, m.fade);
  // (the line's pixels run about eight wide, its core, casing and glow over the threshold, closed by a pixel each side)
  // (from the seat the cabin's walls hide it but for the windows: not counted there)
  if (v !== 'onboard' && m.expect > 150 && px.area / 8 < 0.25 * m.expect)
    fail(where, `only about ${(px.area / 8).toFixed(0)} px of the ${m.expect.toFixed(0)} px of line in view are drawn`);
  if (px.frac > 0.2) fail(where, `the line covers ${(px.frac * 100).toFixed(0)} % of the view: a sheet`);
  if (px.dots > 2) fail(where, `the line breaks into dots: ${px.dots} pieces under ${DOT} px`);
  if (px.bits.length > 1) fail(where, `fragments of line: ${px.bits.join(', ')}`);
  // the line flown, drawn alone: the same rules (it is paler, so fewer of its pixels pass the threshold: no count of them)
  const fl = m.flownChords > 1 ? await pixels(null, m.fade, 'flown') : null;
  if (fl) {
    if (fl.frac > 0.2) fail(where, `the line flown covers ${(fl.frac * 100).toFixed(0)} % of the view: a sheet`);
    if (fl.dots > 2) fail(where, `the line flown breaks into dots: ${fl.dots} pieces under ${DOT} px`);
    if (fl.bits.length > 1) fail(where, `fragments of the line flown: ${fl.bits.join(', ')}`);
  }
  // the markers on their places, the chips for those not in view, pointing at them, clear of the panels and each other
  for (const mk of m.marks) {
    if (mk.glyph && mk.place?.front && Math.hypot(mk.ex - mk.place.x, mk.ey - mk.place.y) > OFF)
      fail(where, `${mk.id} drawn ${Math.hypot(mk.ex - mk.place.x, mk.ey - mk.place.y).toFixed(0)} px from its place`);
  }
  for (const c of m.chips) {
    const pl = c.place;
    const inView =
      pl?.front &&
      pl.x > EDGE &&
      pl.x < W - EDGE &&
      pl.y > EDGE &&
      pl.y < H - EDGE &&
      !m.panels.some((b) => pl.x > b.x0 - 8 && pl.x < b.x1 + 8 && pl.y > b.y0 - 8 && pl.y < b.y1 + 8);
    if (inView) fail(where, `a chip for ${c.id}, whose place (${pl.x.toFixed(0)}, ${pl.y.toFixed(0)}) is in view`);
    if (c.x0 < -1 || c.y0 < -1 || c.x1 > W + 1 || c.y1 > H + 1) fail(where, `the chip for ${c.id} is off the page`);
    for (const b of m.panels) if (overlap(c, b, 1)) fail(where, `the chip for ${c.id} overlaps a panel`);
    for (const o of m.chips) if (o !== c && o.id < c.id && overlap(c, o, 1)) fail(where, `the chips for ${c.id} and ${o.id} overlap`);
    if (pl?.front && c.laid) {
      const want = (Math.atan2(pl.y - c.laid.py, pl.x - c.laid.px) * 180) / Math.PI;
      const got = (c.laid.angle * 180) / Math.PI;
      const off = Math.abs(((want - got + 540) % 360) - 180);
      if (off > AIM) fail(where, `the chip for ${c.id} points ${off.toFixed(0)} degrees off its place`);
    }
  }
  for (const issue of m.marksAgree ?? []) fail(where, issue);
  let jump = null;
  if (v === 'chase' && look === 'real') {
    const j = await jumps();
    jump = j?.worst ?? null;
    if (j && j.worst > JUMP_PX)
      fail(where, `a point of the line leaps ${j.worst.toFixed(1)} px in a frame (it moves ${j.usual.toFixed(1)} px a frame round it)`);
  }
  console.log(
    `  ${where}: ${m.chords ?? '?'} chords, ${m.expect !== undefined ? `${(px.area / 8).toFixed(0)}/${m.expect.toFixed(0)} px drawn, ` : ''}${m.worst !== undefined ? ` (worst ${m.worst.toFixed(2)} px)` : ''}, ${px.pieces} pieces, ${px.dots} dots, ${(px.frac * 100).toFixed(1)} % covered${fl ? `; flown ${m.flownChords} chords (worst ${m.flownWorst.toFixed(2)} px), ${fl.pieces} pieces` : ''}${m.drawn ? `, ${m.drawn.ms.toFixed(1)} ms` : ''}${jump !== null ? `, jump ${jump.toFixed(2)} px` : ''}, ${m.chips.length} chips`,
  );
}

/** A page of the size given, on a flight's deck with the path drawn. */
async function open(W, H, f) {
  if (page) await page.close();
  page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${url}#${f.id}/fly`);
  await page.waitForFunction(() => window.sr && document.querySelector('.loading.done') && window.sr.cockpit.active, null, {
    timeout: 120000,
  });
  await page.evaluate(() => {
    window.sr.path.show(true, false);
    window.sr.navball?.tuck?.(false, false);
  });
}

// The record's flight through its instants: at 1280 wide every instant and view; at 820 and 390 (the tablet and the
// phone, where the panels take more of the view) every third instant from the chase camera and from far out.
for (const [W, H] of handsOnly ? [] : SIZES) {
  for (const [key, f] of Object.entries(FLIGHTS)) {
    if (only && only !== key) continue;
    await open(W, H, f);
    const all = W === 1280 && !quick;
    const instants = at
      ? f.instants.filter((t) => at.split(',').map(Number).includes(t))
      : all
        ? f.instants
        : f.instants.filter((_, i) => i % 3 === 0);
    for (const [k, t] of instants.entries()) {
      const looks = all && k % 4 === 1 ? ['real', 'cel'] : ['real'];
      for (const look of looks) {
        await page.evaluate((look) => window.sr.stage.setLook?.(look), look);
        for (const v of all ? VIEWS : ['chase', 'far']) {
          const where = `${key} ${W} T+${t} ${v}${look === 'cel' ? ' cel' : ''}`;
          cases++;
          const s = await seek(t);
          await view(v);
          await turn();
          if (!s.shown) {
            console.log(`  ${where}: no path`);
            continue;
          }
          await inspect(where, v, look, W, H);
        }
      }
      await page.evaluate(() => window.sr.stage.setLook?.('real'));
    }
  }
}

/** A seeded generator (mulberry32): the same instants every run of the same seed. */
function seeded(n) {
  let a = n >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The clock run at `rate` until `t` (or the flight is down), the stage drawn every frame. */
const runTo = (t, rate) =>
  page.evaluate(
    async ([t, rate]) => {
      const sr = window.sr;
      sr.clock.setRate(rate);
      sr.clock.play(true);
      for (let i = 0; i < 40000 && sr.clock.t < t && !sr.cockpit.state?.landing && !sr.cockpit.state?.landed; i++) {
        sr.stage.frame();
        if (i % 10 === 0) await new Promise((r) => requestAnimationFrame(r));
      }
      sr.clock.pause();
      return sr.clock.t;
    },
    [t, rate],
  );
/** A key held for `seconds` of the flight's clock at life's rate. */
const hold = async (key, seconds) => {
  const t = await page.evaluate(() => window.sr.clock.t);
  await page.keyboard.down(key);
  await runTo(t + seconds, 1);
  await page.keyboard.up(key);
};
const deck = (what) =>
  page.evaluate((what) => {
    const c = window.sr.cockpit;
    c.eventAt = -1e9;
    c.command(what);
  }, what);
/** The prediction on show once it is of the instant on show, and where it says the flight ends, in the Earth's frame. */
const predicted = () =>
  page.evaluate(async () => {
    const sr = window.sr;
    const p = sr.path;
    const began = performance.now();
    while (performance.now() - began < 8000) {
      await new Promise((r) => requestAnimationFrame(r));
      // (one made from this instant, or one the flight has kept to since: path.ts `holds`, which gives it this instant's key)
      if (p.shown && !p.job && p.prediction && Number(p.shown.key.split('|')[0]) === p.sample?.t) break;
    }
    const r = p.prediction;
    const held = p.shown && Number(p.shown.key.split('|')[0]) === p.sample?.t;
    if (!r?.impact) return r ? { outcome: r.outcome, from: held ? sr.clock.t : r.from } : null;
    const w = 7.292115e-5 * r.impact.t;
    const i = r.impact.r;
    return {
      outcome: r.outcome,
      from: held ? sr.clock.t : r.from,
      t: r.impact.t,
      ecef: [i[0] * Math.cos(w) + i[1] * Math.sin(w), -i[0] * Math.sin(w) + i[1] * Math.cos(w), i[2]],
      altitude: r.impact.altitude,
    };
  });
/** Where the flight on show is now, in the Earth's frame. */
const here = () =>
  page.evaluate(() => {
    const s = window.sr.path.sample;
    const r = s.centre ?? s.r;
    const w = 7.292115e-5 * s.t;
    return {
      t: s.t,
      altitude: s.altitude,
      ecef: [r[0] * Math.cos(w) + r[1] * Math.sin(w), -r[0] * Math.sin(w) + r[1] * Math.cos(w), r[2]],
    };
  });
const apart = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const views = async (where) => {
  // (the prediction of the instant on show, first: a hand has just moved the flight off the last one)
  const p = await predicted();
  const now = await page.evaluate(() => window.sr.clock.t);
  if (!p || Math.abs(p.from - now) > 1)
    fail(where, `no prediction of the instant on show (T+${now.toFixed(1)}): ${p ? `from T+${p.from.toFixed(1)}` : 'none'}`);
  for (const v of ['chase', 'far']) {
    cases++;
    await view(v);
    await turn();
    await inspect(`${where} ${v}`, v, 'real', 1280, 800);
  }
};
/**
 * The prediction against the outcome: where the path said the flight would end, made at the instant on show, against
 * where the flight, run on with nothing more done, does end (within `tolerance` metres, and as a share of how far it had
 * to go).
 */
const outcome = async (where, end, tolerance) => {
  const p = await predicted();
  const from = await here();
  if (!p?.ecef) return fail(where, `no end predicted (${p?.outcome ?? 'no prediction'})`);
  await end();
  const got = await here();
  const miss = apart(p.ecef, got.ecef);
  const way = apart(from.ecef, got.ecef);
  console.log(
    `  ${where}: predicted at T+${from.t.toFixed(0)} to end at T+${p.t.toFixed(0)}; it ends at T+${got.t.toFixed(0)}, ${(miss / 1000).toFixed(2)} km from the prediction over ${(way / 1000).toFixed(0)} km (${((100 * miss) / Math.max(way, 1)).toFixed(2)} %)`,
  );
  hands.push({ where, miss, way, dt: got.t - p.t });
  if (miss > tolerance(way))
    fail(where, `it ends ${(miss / 1000).toFixed(2)} km from where the path said, over ${(way / 1000).toFixed(0)} km`);
};
const hands = [];

// Taken over at seeded instants and flown by scripted hands, each step checked as the record's instants are, then run on
// to its end and held against what the path said when the hands let go.
const rand = seeded(Number(flag('--seed') ?? 1961));
if (!quick && !at) {
  for (const [key, f] of Object.entries(FLIGHTS)) {
    if (only && only !== key) continue;
    if (key === 'f7') {
      for (let n = 0; n < 2; n++) {
        // guidance off and the nose pitched hard over, then the engine cut early (the sequencer off, Space), then
        // nothing more: the booster and the spacecraft come down together
        const t1 = 20 + rand() * 100;
        await open(1280, 800, f);
        await seek(t1);
        await deck('guidance');
        await hold('KeyW', 1 + rand() * 2);
        await views(`f7 hands ${n} pitched at T+${t1.toFixed(0)}`);
        await runTo(t1 + 5 + rand() * 10, 2);
        await deck('sequence');
        await deck('next');
        await runTo((await page.evaluate(() => window.sr.clock.t)) + 2, 1);
        await views(`f7 hands ${n} cut`);
        // (the live vehicle is a rigid body that tumbles as it falls; the path a point mass on the stack's drag, nose first)
        await outcome(
          `f7 hands ${n} cut, then down`,
          () => runTo(4000, 40),
          (way) => 2000 + 0.02 * way,
        );
      }
    } else {
      // the ascent taken over (G), pitched by hand, a stage's engines cut early or late (the sequencer off, Space at the
      // step), and the stack let fall with nothing lit: the path is the stack's fall from the cut
      for (let n = 0; n < 2; n++) {
        const t1 = 30 + rand() * (n === 0 ? 80 : 400);
        await open(1280, 800, f);
        await seek(t1);
        await deck('guidance');
        await hold('KeyW', 1 + rand());
        await views(`v1 hands ${n} pitched at T+${t1.toFixed(0)}`);
        await deck('sequence');
        // (Space walks the steps: the next is a stage's cut or its drop; each is taken until nothing is lit)
        for (let k = 0; k < 6; k++) {
          const lit = await page.evaluate(() => {
            const c = window.sr.cockpit;
            return c.vehicle && c.state ? c.vehicle.thrust(c.state) > 0 : false;
          });
          if (!lit) break;
          await deck('next');
          await runTo((await page.evaluate(() => window.sr.clock.t)) + 1 + rand() * 4, 1);
        }
        await views(`v1 hands ${n} cut`);
        await outcome(
          `v1 hands ${n} cut, then down`,
          () => runTo(4000, 40),
          (way) => 2000 + 0.02 * way,
        );
      }
      // in orbit: the hands freed (G), and the braking engine fired along the long axis as it lies (forward, along the
      // motion, as the record's ship lay before its burn), or turned half round first (back); then down to the height the
      // pilot leaves at, against the path's end
      for (const turnFor of [0, 70]) {
        const t1 = 900 + rand() * 2500;
        await open(1280, 800, f);
        await seek(t1);
        await deck('guidance');
        if (turnFor) await hold('KeyD', turnFor);
        await deck('next');
        await runTo((await page.evaluate(() => window.sr.clock.t)) + 60, 2);
        await views(`v1 burn ${turnFor ? 'back' : 'forward'} at T+${t1.toFixed(0)}`);
        const p = await predicted();
        if (p?.outcome === 'impact')
          await outcome(
            `v1 burn ${turnFor ? 'back' : 'forward'}, then down`,
            async () => {
              await page.evaluate(() => window.sr.clock.seek(window.sr.path.prediction.impact.t));
              await runTo((await page.evaluate(() => window.sr.clock.t)) + 0.1, 1);
            },
            // (the deck's run is flyOrbit's, whose step ending on a burn's cutoff takes its last stage unpushed: tests/staged.test.mjs)
            (way) => 3000 + 0.005 * way,
          );
        else console.log(`  v1 burn ${turnFor ? 'back' : 'forward'}: ${p?.outcome ?? 'no prediction'} (stays up: no end to hold it to)`);
      }
    }
  }
}

for (const e of errors) fail('page', e);
await browser.close();
if (hands.length)
  console.log(
    `\nprediction against outcome: ${hands.map((h) => `${h.where.split(',')[0]} ${(h.miss / 1000).toFixed(2)} km/${(h.way / 1000).toFixed(0)} km`).join('; ')}`,
  );
console.log(failed ? `\n${failed} failure(s) in ${cases} views` : `\nall ${cases} views pass`);
process.exit(failed ? 1 : 0);
