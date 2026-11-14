// The predicted path's line as numbers (src/viewer/pathline.ts) and its marks (src/sim/predict.ts `apsides`): a path is a
// curve that can be asked where it is at any instant; it is cut into chords as finely as the eye needs, wherever the eye
// is, and the chords stay put as the instant moves on; nothing behind the near plane is drawn; the Earth hides what is
// behind its limb and nothing on the ground; the apsides of any path are where its radial speed changes sign. Every
// rule is checked on a family of paths, not on one flight's.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { apsides } from '../src/sim/predict.ts';
import { clearOf, clipNear, curveAt, curveOf, ERROR_PX, fadeIn, limbPx, ribbon, SHORTEST_PX, sample } from '../src/viewer/pathline.ts';

const near = (got, want, tolerance, what) =>
  assert.ok(Math.abs(got - want) <= tolerance, `${what}: got ${got}, want ${want} within ${tolerance}`);

const MU = 3.986004418e14;
/** A Kepler orbit in the equator's plane turned by `tilt` about x: where it is and how fast at `t` (periapsis at t = 0). */
function kepler(a, e, tilt = 0) {
  const n = Math.sqrt(MU / a ** 3);
  return (t) => {
    const M = n * t;
    let E = M;
    for (let k = 0; k < 30; k++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    const x = a * (Math.cos(E) - e);
    const y = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const dE = n / (1 - e * Math.cos(E));
    const vx = -a * Math.sin(E) * dE;
    const vy = a * Math.sqrt(1 - e * e) * Math.cos(E) * dE;
    const c = Math.cos(tilt);
    const s = Math.sin(tilt);
    return { r: [x, y * c, y * s], v: [vx, vy * c, vy * s] };
  };
}
/** A path kept every `every` seconds from `t0` to `t1`, as a predictor keeps one. */
const kept = (at, t0, t1, every) => {
  const points = [];
  for (let t = t0; t <= t1 + 1e-9; t += every) points.push({ t, ...at(t), altitude: 0 });
  return points;
};
const R = 6_371_000;

/** The point of chord `i` (of the points in `P`) nearest `m`. */
const nearest = (P, i, m) => {
  const a = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];
  const d = [P[i * 3 + 3] - a[0], P[i * 3 + 4] - a[1], P[i * 3 + 5] - a[2]];
  const dd = d[0] ** 2 + d[1] ** 2 + d[2] ** 2;
  const k = dd > 0 ? Math.min(1, Math.max(0, ((m[0] - a[0]) * d[0] + (m[1] - a[1]) * d[1] + (m[2] - a[2]) * d[2]) / dd)) : 0;
  return [a[0] + d[0] * k, a[1] + d[1] * k, a[2] + d[2] * k];
};

test('a curve: anywhere between points kept half a minute apart, it is where the orbit is, to centimetres', () => {
  for (const [a, e] of [
    [R + 190e3, 0.01],
    [R + 300e3, 0.2],
    [R + 20000e3, 0.6],
  ]) {
    const at = kepler(a, e, 0.9);
    const c = curveOf(kept(at, 0, 6000, 30));
    const out = [0, 0, 0];
    let worst = 0;
    for (let t = 0; t < 6000; t += 7.3) {
      curveAt(c, t, out);
      const r = at(t).r;
      worst = Math.max(worst, Math.hypot(out[0] - r[0], out[1] - r[1], out[2] - r[2]));
    }
    assert.ok(worst < 0.5, `a = ${a / 1e3} km, e = ${e}: ${worst.toFixed(3)} m off at worst`);
  }
  // with no velocities given (the line flown), they are taken from the neighbours
  const c = curveOf([0, 1, 2, 3].map((t) => ({ t, r: [t * t, 0, 0] })));
  near(c.v[3], 2, 1e-9, 'the slope at the second point');
});

/** The worst any chord strays from the curve as seen from `eye`, in pixels, looked for at eight places along each. */
const worstStray = (place, t, p, n, eye, pxPerRad) => {
  let worst = 0;
  const m = new Float64Array(3);
  for (let i = 0; i + 1 < n; i++)
    for (let k = 1; k < 8; k++) {
      const f = k / 8;
      place(t[i] + (t[i + 1] - t[i]) * f, m, 0);
      const c = nearest(p, i, m); // (what is seen: how far the curve is from the chord, wherever along it)
      const d = Math.hypot(m[0] - eye[0], m[1] - eye[1], m[2] - eye[2]);
      worst = Math.max(worst, (Math.hypot(c[0] - m[0], c[1] - m[1], c[2] - m[2]) / d) * pxPerRad);
    }
  return worst;
};

test('sampled for the eye: no chord strays more than the stated pixels, from beside the vehicle or from far out, and coarse where it can be', () => {
  const pxPerRad = 400 / Math.tan((25 * Math.PI) / 180); // an 800 pixel tall view through 50 degrees
  const most = 4096;
  let shortKept = 0;
  let chords = 0;
  const T = new Float64Array(most + 1);
  const P = new Float64Array((most + 1) * 3);
  // a family of paths: low and high, round and long, prograde and retrograde
  for (const [a, e, tilt] of [
    [R + 190e3, 0.012, 1.13],
    [R + 400e3, 0.1, 0.5],
    [R + 1000e3, 0.3, Math.PI - 0.3],
    [R + 35786e3, 0.001, 0],
  ]) {
    const at = kepler(a, e, tilt);
    const period = 2 * Math.PI * Math.sqrt(a ** 3 / MU);
    const c = curveOf(kept(at, 0, period, 30));
    const place = (t, out, o) => curveAt(c, t, out, o);
    const ship = at(100).r;
    const v = at(100).v;
    const speed = Math.hypot(...v);
    for (const [name, eye] of [
      // 25 m behind the vehicle and 6 m up, as the chase camera is
      ['the chase camera', [ship[0] - (25 * v[0]) / speed, ship[1] - (25 * v[1]) / speed, ship[2] - (25 * v[2]) / speed + 6]],
      // far enough to see the whole Earth
      ['far out', [0, 0, 3 * a]],
    ]) {
      const n = sample(place, c.t, 100, period, { eye, pxPerRad, near: 1 }, most, T, P);
      assert.ok(n > 2 && n < most, `${name}: ${n} points`);
      const worst = worstStray(place, T, P, n, eye, pxPerRad);
      // and no chord but the last so short as seen from the eye that it has no direction on the screen
      for (let i = 0; i + 2 < n; i++) {
        const a = [0, 1, 2].map((j) => P[i * 3 + j] - eye[j]);
        const b = [0, 1, 2].map((j) => P[i * 3 + 3 + j] - eye[j]);
        const angle = Math.acos(Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (Math.hypot(...a) * Math.hypot(...b))));
        if (angle * pxPerRad < SHORTEST_PX - 1e-3) {
          // (unless letting its end go would have taken the chord further from the curve than the error allows)
          shortKept++;
        }
      }
      assert.ok(worst <= 1.5 * ERROR_PX, `${name}, a = ${(a / 1e3).toFixed(0)} km: a chord strays ${worst.toFixed(2)} px`);
      chords += n - 1;
      if (name === 'far out') assert.ok(n < 600, `from far out ${n} points: as coarse as the view allows`);
    }
  }
  assert.ok(shortKept <= 0.02 * chords, `${shortKept} of ${chords} chords are under ${SHORTEST_PX} px as seen from the eye`);
});

test('the chords stay put as the instant on show moves on', () => {
  const at = kepler(R + 200e3, 0.01, 1);
  const c = curveOf(kept(at, 0, 5400, 30));
  const place = (t, out, o) => curveAt(c, t, out, o);
  const lens = { eye: [0, 0, 2e7], pxPerRad: 900, near: 1 };
  const [T1, P1, T2, P2] = [new Float64Array(5000), new Float64Array(15000), new Float64Array(5000), new Float64Array(15000)];
  const n1 = sample(place, c.t, 100, 5400, lens, 4096, T1, P1);
  const n2 = sample(place, c.t, 100.4, 5400, lens, 4096, T2, P2);
  const later = new Set([...T2.subarray(1, n2)].map((t) => t.toFixed(6)));
  const shared = [...T1.subarray(1, n1)].filter((t) => t > 512 && later.has(t.toFixed(6))).length;
  const after = [...T1.subarray(1, n1)].filter((t) => t > 512).length; // (after the first cut, a multiple of 512 s: an eighth of the span or less)
  assert.ok(shared === after && after > 10, `${shared} of ${after} instants past the first piece are the same`);
});

test('never at the eye: a chord is cut where it crosses the plane, and one behind it is not drawn', () => {
  assert.deepEqual(clipNear([0, 0, -10], [0, 0, -20], 1), [0, 1]);
  assert.equal(clipNear([0, 0, 5], [1, 0, 0.5], 1), null, 'all of it behind');
  const [a, b] = clipNear([0, 0, 9], [0, 0, -11], 1);
  near(a, 0.5, 1e-12, 'from behind: it starts at the plane');
  near(b, 1, 0, 'and runs to its far end');
  const [c, d] = clipNear([0, 0, -11], [0, 0, 9], 1);
  near(c, 0, 0, 'in front first');
  near(d, 0.5, 1e-12, 'and stopped at the plane');
});

test('behind the Earth: hidden past the limb, seen in front of it, and nothing on the ground hidden from above', () => {
  const centre = [0, 0, 0];
  const eye = [0, 0, 3 * R];
  const px = 900;
  assert.ok(limbPx(eye, [0, 0, -R - 200e3], centre, R, px) < -100, 'a point on the far side');
  assert.equal(limbPx(eye, [0, 0, R + 200e3], centre, R, px), Number.POSITIVE_INFINITY, 'one between the eye and the Earth');
  assert.ok(limbPx(eye, [R + 2000e3, 0, -10e3], centre, R, px) > 0, 'one well beside the limb, a little behind the centre');
  // a point on the ground, seen from an aeroplane's height: nothing of the sphere is between them
  assert.equal(limbPx([0, 0, R + 10e3], [50e3, 0, Math.sqrt(R ** 2 - 50e3 ** 2)], centre, R, px), Number.POSITIVE_INFINITY);
  // just over the limb as seen: a pixel or so either side
  const limb = Math.asin(R / (3 * R));
  const ray = (angle, dist) => [Math.sin(angle) * dist, 0, 3 * R - Math.cos(angle) * dist];
  const past = 3 * R * Math.cos(limb) + 1e6;
  assert.ok(limbPx(eye, ray(limb + 2 / px, past), centre, R, px) > 1.5, 'two pixels outside the limb');
  assert.ok(limbPx(eye, ray(limb - 2 / px, past), centre, R, px) < -1.5, 'two pixels inside it');
});

test('the apsides of any path: an orbit has its two, a lob its one, a fall none, each where it is', () => {
  for (const [a, e] of [
    [R + 300e3, 0.05],
    [R + 2000e3, 0.4],
  ]) {
    const at = kepler(a, e, 0.7);
    const period = 2 * Math.PI * Math.sqrt(a ** 3 / MU);
    const found = apsides(kept(at, 10, period + 40, 30)).filter((x) => x.t < period + 20);
    const apo = found.filter((x) => x.kind === 'apo');
    const peri = found.filter((x) => x.kind === 'peri');
    assert.equal(apo.length, 1, `e = ${e}: one apoapsis`);
    assert.equal(peri.length, 1, `e = ${e}: one periapsis`);
    near(apo[0].t, period / 2, 0.05, 'the apoapsis half way round');
    near(peri[0].t, period, 0.05, 'the periapsis once round');
    near(Math.hypot(...apo[0].r), a * (1 + e), 1, 'at the apoapsis distance');
  }
  // a lob: up and down again, under gravity alone
  const g = 9.8;
  const lob = [];
  for (let t = 0; t <= 300; t += 8)
    lob.push({ t, r: [0, 1000 * t, R + 1500 * t - 0.5 * g * t * t], v: [0, 1000, 1500 - g * t], altitude: 0 });
  const up = apsides(lob);
  assert.equal(up.length, 1);
  assert.equal(up[0].kind, 'apo');
  // (radial speed is along r, not along z: the top is where r . v changes sign)
  assert.ok(Math.abs(up[0].t - 153) < 3, `the lob's top at ${up[0].t.toFixed(1)} s`);
  const fall = lob.filter((p) => p.t > 160);
  assert.equal(apsides(fall).length, 0, 'a fall has none');
  assert.equal(
    apsides(kept(kepler(R + 300e3, 0.05), 10, 3000, 30), 2000).filter((x) => x.t <= 2000).length,
    0,
    'only those after the instant given',
  );
});

test('the ribbon: four vertices a chord, each with its chord`s other end and the point past its own end', () => {
  const p = [0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0, 0, 0, 0];
  const t = [0, 1, 2, 3, 4];
  const out = {
    position: new Float32Array(4 * 12),
    other: new Float32Array(4 * 12),
    beyond: new Float32Array(4 * 12),
    at: new Float32Array(16),
  };
  assert.equal(ribbon(t, p, 3, [0, 0, 0], 0, out), 2);
  assert.deepEqual([...out.position.slice(0, 3)], [0, 0, 0]);
  assert.deepEqual([...out.other.slice(0, 3)], [10, 0, 0]);
  assert.deepEqual([...out.beyond.slice(0, 3)], [0, 0, 0], 'an open line`s start has nothing past it: itself');
  assert.deepEqual([...out.beyond.slice(6, 9)], [10, 10, 0], 'the first chord`s end looks on to the next point');
  assert.deepEqual([...out.at.slice(0, 4)], [0, 0, 1, 1]);
  // closed: the last point is the first again, and the join there is mitred like any other
  assert.equal(ribbon(t, p, 5, [0, 0, 0], 0, out, true), 4);
  assert.deepEqual([...out.beyond.slice(0, 3)], [0, 10, 0], 'the first chord`s start looks back to the point before the end');
  assert.deepEqual(
    [...out.beyond.slice((3 * 4 + 2) * 3, (3 * 4 + 2) * 3 + 3)],
    [10, 0, 0],
    'the last chord`s end looks on to the second point',
  );
  // offsets from the anchor, in single precision near it
  ribbon([0, 1], [6.4e6, 1, 2, 6.4e6 + 5, 1, 2], 2, [6.4e6, 0, 0], 0, out);
  assert.deepEqual([...out.position.slice(0, 3)], [0, 1, 2]);
});

test("nothing within the gap, all of it from three gaps, and lunar-lift's stops on the way", () => {
  for (const gap of [0.5, 19, 2000]) {
    for (const d of [0, 0.1 * gap, 0.5 * gap, gap]) assert.equal(fadeIn(d, gap), 0, `at ${d / gap} gaps`);
    for (const d of [3 * gap, 10 * gap, 1e9]) assert.equal(fadeIn(d, gap), 1, `at ${d / gap} gaps`);
    // (lunar-lift: [1, 1.4, 2, 2.8, 4] gaps ahead, [0, 0.14, 0.42, 0.78, 1] of the line; here over three gaps, not four)
    const at = (stop) => gap * (1 + ((stop - 1) * 2) / 3);
    near(fadeIn(at(1.4), gap), 0.14, 0.04, 'at the first stop');
    near(fadeIn(at(2), gap), 0.42, 0.06, 'at the second');
    near(fadeIn(at(2.8), gap), 0.78, 0.06, 'at the third');
    // over a span of its own (path.ts: so many pixels at the vehicle), the same curve from the gap to the span's end
    for (const span of [0.05 * gap, 40 * gap]) {
      assert.equal(fadeIn(gap, gap, span), 0, 'nothing at the gap');
      assert.equal(fadeIn(gap + span, gap, span), 1, 'all of it a span on');
      near(fadeIn(gap + span / 3, gap, span), fadeIn(at(2), gap), 1e-9, 'the second stop a third of the span on');
    }
  }
});

test('nothing within the outline on the screen, all of it a margin beyond', () => {
  assert.equal(clearOf(10, 40, 16), 0);
  assert.equal(clearOf(56, 40, 16), 1);
  assert.ok(clearOf(48, 40, 16) > 0 && clearOf(48, 40, 16) < 1);
  assert.equal(clearOf(0, 0, 16), 1, 'with no outline (from inside the vehicle), nothing is held off');
});
