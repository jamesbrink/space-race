// The predicted path's promises (viewer/path.ts, its header comment), checked in the running page on what it draws:
// both flights flown through a set of instants, each seen from the chase camera, from the orbit camera close to the
// vehicle, and from far enough out to see the whole Earth (where a player goes to read an orbit), in the real look and
// at some instants the cel look. At each it fails on
//   - a line that does not start at the vehicle (taken onto it within two gaps, pathline.ts),
//   - a chord that strays from the curve it stands for by more than CHORD_PX as seen from the eye,
//   - the line breaking into dots or fragments, or spreading into a sheet (the line's own pixels: the frame drawn with it
//     and without it, the clock stopped, the difference),
//   - a point of the line jumping between frames as the clock runs at life's rate,
//   - a marker away from its place, a chip for a place that is in view, a chip that points elsewhere than its place,
//     or one that overlaps a panel or another chip.
//   pnpm dev, then: node tools/path-test.mjs [url] [--shots <dir>] [--only f7|v1] [--quick] [--at 60,700]
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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
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
          const mid = a.clone().add(b).multiplyScalar(0.5);
          const px = (mid.distanceTo(mv) / Math.max(mv.length(), near)) * pxPerRad;
          if (px > worst) {
            worst = px;
            at = i;
          }
        }
        out.worst = worst;
        // how much of the line should be seen: chords in front of the eye, on the page, past the vehicle's three gaps and
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
          if (vessel && Math.hypot(mx - ship.x, my - ship.y, mz - ship.z) < 3 * d.gap) continue;
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
const pixels = async (name) => {
  await page
    .addStyleTag({ content: '#ui > :not(.path-marks), #gallery, #title { visibility: hidden !important }' })
    .then((h) => (pixels.style = h));
  const shot = async (on) => {
    await page.evaluate((on) => {
      // (the line ahead; the line flown and the ring hidden throughout: it is paler, and is measured with its own rules)
      const p = window.sr.path;
      p.mesh.material.visible = on;
      p.ringMesh && (p.ringMesh.material.visible = on === null); // (and the ring where it comes down: a loop of its own)
      p.flownMesh && (p.flownMesh.material.visible = on === null);
      window.sr.stage.dirty = true;
    }, on);
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
    async ([a, b, c, INK, DOT, BIT]) => {
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
        pieces.push({ n, x0, y0, x1, y1, open });
      }
      const dots = pieces.filter((p) => p.n < DOT && !p.open);
      const bits = pieces.filter((p) => p.n >= DOT && p.n < BIT && !p.open);
      return { area, pieces: pieces.length, dots: dots.length, bits: bits.map((p) => `${p.n}px@${p.x0},${p.y0}`), frac: area / (w * h) };
    },
    [a, b, c, INK, DOT, BIT],
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

for (const [key, f] of Object.entries(FLIGHTS)) {
  if (only && only !== key) continue;
  await page.goto(`${url}#${f.id}/fly`);
  await page.waitForFunction(() => window.sr && document.querySelector('.loading.done') && window.sr.cockpit.active, null, {
    timeout: 120000,
  });
  await page.evaluate(() => {
    window.sr.path.show(true, false);
    window.sr.navball?.tuck?.(false, false);
  });
  const instants = at
    ? f.instants.filter((t) => at.split(',').map(Number).includes(t))
    : quick
      ? f.instants.filter((_, i) => i % 3 === 0)
      : f.instants;
  for (const [k, t] of instants.entries()) {
    const looks = k % 4 === 1 ? ['real', 'cel'] : ['real'];
    for (const look of looks) {
      await page.evaluate((look) => window.sr.stage.setLook?.(look), look);
      for (const v of VIEWS) {
        const where = `${key} T+${t} ${v}${look === 'cel' ? ' cel' : ''}`;
        cases++;
        const s = await seek(t);
        await view(v);
        await turn();
        if (!s.shown) {
          console.log(`  ${where}: no path`);
          continue;
        }
        const m = await measure();
        if (!m.probe) fail(where, 'the page gives no line to measure (sr.path.line, sr.path.where, sr.path.drawn)');
        for (const issue of m.issues) fail(where, issue);
        const px = await pixels(shots ? `${key}-${t}-${v}${look === 'cel' ? '-cel' : ''}` : null);
        // (the line's pixels run about eight wide, its core, casing and glow over the threshold, closed by a pixel each side)
        // (from the seat the cabin's walls hide it but for the windows: not counted there)
        if (v !== 'onboard' && m.expect > 150 && px.area / 8 < 0.25 * m.expect)
          fail(where, `only about ${(px.area / 8).toFixed(0)} px of the ${m.expect.toFixed(0)} px of line in view are drawn`);
        if (px.frac > 0.2) fail(where, `the line covers ${(px.frac * 100).toFixed(0)} % of the view: a sheet`);
        if (px.dots > 2) fail(where, `the line breaks into dots: ${px.dots} pieces under ${DOT} px`);
        if (px.bits.length > 1) fail(where, `fragments of line: ${px.bits.join(', ')}`);
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
            pl.x < 1280 - EDGE &&
            pl.y > EDGE &&
            pl.y < 800 - EDGE &&
            !m.panels.some((b) => pl.x > b.x0 - 8 && pl.x < b.x1 + 8 && pl.y > b.y0 - 8 && pl.y < b.y1 + 8);
          if (inView) fail(where, `a chip for ${c.id}, whose place (${pl.x.toFixed(0)}, ${pl.y.toFixed(0)}) is in view`);
          if (c.x0 < -1 || c.y0 < -1 || c.x1 > 1281 || c.y1 > 801) fail(where, `the chip for ${c.id} is off the page`);
          for (const b of m.panels) if (overlap(c, b, 1)) fail(where, `the chip for ${c.id} overlaps a panel`);
          for (const o of m.chips) if (o !== c && o.id < c.id && overlap(c, o, 1)) fail(where, `the chips for ${c.id} and ${o.id} overlap`);
          if (pl?.front && c.laid) {
            const want = (Math.atan2(pl.y - c.laid.py, pl.x - c.laid.px) * 180) / Math.PI;
            const got = (c.laid.angle * 180) / Math.PI;
            const off = Math.abs(((want - got + 540) % 360) - 180);
            if (off > AIM) fail(where, `the chip for ${c.id} points ${off.toFixed(0)} degrees off its place`);
          }
        }
        let jump = null;
        if (v === 'chase' && look === 'real') {
          const j = await jumps();
          jump = j?.worst ?? null;
          if (j && j.worst > JUMP_PX)
            fail(
              where,
              `a point of the line leaps ${j.worst.toFixed(1)} px in a frame (it moves ${j.usual.toFixed(1)} px a frame round it)`,
            );
        }
        console.log(
          `  ${where}: ${m.chords ?? '?'} chords, ${m.expect !== undefined ? `${(px.area / 8).toFixed(0)}/${m.expect.toFixed(0)} px drawn, ` : ''}${m.worst !== undefined ? ` (worst ${m.worst.toFixed(2)} px)` : ''}, ${px.pieces} pieces, ${px.dots} dots, ${(px.frac * 100).toFixed(1)} % covered${m.drawn ? `, ${m.drawn.ms.toFixed(1)} ms` : ''}${jump !== null ? `, jump ${jump.toFixed(2)} px` : ''}, ${m.chips.length} chips`,
        );
      }
    }
    await page.evaluate(() => window.sr.stage.setLook?.('real'));
  }
}
for (const e of errors) fail('page', e);
await browser.close();
console.log(failed ? `\n${failed} failure(s) in ${cases} views` : `\nall ${cases} views pass`);
process.exit(failed ? 1 : 0);
