// The predicted path on states that vary, not on a flight's list: a seeded family of states (lobs of many ranges and
// angles, climbs straight up and falls, circular and elliptical orbits low and high, prograde, polar and retrograde, a
// state just short of orbit and just past it, one past escape), each predicted by both predictors there are (predict.ts,
// the ballistic deck's; orbitpath.ts, the orbital deck's: one interface, one result), and each held to the same
// invariants: the path starts at the state; its marks are where the propagation says (an apsis where the radial speed
// changes sign and nowhere else, alternating; the end on the ground when it comes down; once round when it goes round);
// and, drawn from eyes placed at random (beside the vehicle, beside the path, far out), no chord strays more than the
// stated pixels from it and the chords are as coarse as the view allows.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight as freedom7 } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { flight as vostok1 } from '../missions/ussr/vostok/flights/vostok-1/flight.ts';
import { orbitPredictor } from '../src/sim/orbitpath.ts';
import { apsides, predict } from '../src/sim/predict.ts';
import { curveAt, curveOf, ERROR_PX, sample } from '../src/viewer/pathline.ts';
import { siteFrame } from '../src/world/frames.ts';
import { julianDate } from '../src/world/time.ts';

/** A seeded generator (mulberry32), so the family is the same every run. */
function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const MU = 3.986004418e14;
const R = 6_378_137;
const unit = (v) => {
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** A state `h` m up at a random place, going at `speed` m/s, `climb` degrees above the level, on a random heading (or the one given). */
function state(rand, h, speed, climb, heading = rand() * 2 * Math.PI) {
  const lat = (rand() - 0.5) * 0.9 * Math.PI;
  const lon = rand() * 2 * Math.PI;
  const up = [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
  const east = unit(cross([0, 0, 1], up));
  const north = cross(up, east);
  const c = (climb * Math.PI) / 180;
  const level = east.map((e, k) => Math.sin(heading) * e + Math.cos(heading) * north[k]);
  const v = level.map((l, k) => speed * (Math.cos(c) * l + Math.sin(c) * up[k]));
  return { r: up.map((u) => u * (R + h)), v };
}

/** The family: each with a name, made from one seed. */
function family(seed) {
  const rand = seeded(seed);
  const circular = (h) => Math.sqrt(MU / (R + h));
  const out = [];
  for (let i = 0; i < 4; i++) out.push([`lob ${i}`, state(rand, 2e3 + rand() * 60e3, 500 + rand() * 2500, 15 + rand() * 70)]);
  out.push(['straight up', state(rand, 10e3, 1500, 90)]);
  out.push(['falling', state(rand, 120e3, 800, -60)]);
  for (const h of [180e3, 400e3, 900e3]) out.push([`circular at ${h / 1e3} km`, state(rand, h, circular(h), 0)]);
  out.push(['elliptical', state(rand, 250e3, circular(250e3) * 1.08, 1.5)]);
  out.push(['retrograde', state(rand, 300e3, circular(300e3), 0, -Math.PI / 2)]);
  out.push(['polar', state(rand, 300e3, circular(300e3), 0, 0)]);
  out.push(['just short of orbit', state(rand, 160e3, circular(160e3) * 0.985, 0)]);
  out.push(['just past orbit', state(rand, 200e3, circular(200e3) * 1.002, 0)]);
  out.push(['past escape', state(rand, 300e3, circular(300e3) * 1.45, 5)]);
  return out;
}

/** The invariants every prediction is held to. */
function holds(name, start, result) {
  const P = result.points;
  if (result.outcome === 'none') return;
  assert.ok(P.length >= 2, `${name}: a path of ${P.length} points`);
  const off = Math.hypot(P[0].r[0] - start.r[0], P[0].r[1] - start.r[1], P[0].r[2] - start.r[2]);
  assert.ok(off < 1, `${name}: the path starts ${off.toFixed(2)} m from the state`);
  for (let i = 1; i < P.length; i++) assert.ok(P[i].t > P[i - 1].t, `${name}: in order of time at ${i}`);
  // the apsides: where the radial speed changes sign, alternating, and each a turn of the distance from the centre
  const curve = curveOf(P);
  const at = (t) => {
    const o = [0, 0, 0];
    curveAt(curve, t, o);
    return Math.hypot(...o);
  };
  const found = apsides(P);
  for (let i = 1; i < found.length; i++) assert.notEqual(found[i].kind, found[i - 1].kind, `${name}: apsides alternate`);
  for (const a of found) {
    if (a.t - P[0].t < 2 || P.at(-1).t - a.t < 2) continue;
    const here = at(a.t);
    const side = Math.max(at(a.t - 1), at(a.t + 1));
    const low = Math.min(at(a.t - 1), at(a.t + 1));
    if (a.kind === 'apo') assert.ok(here >= side - 1e-3, `${name}: the apoapsis at ${a.t.toFixed(1)} s is a top`);
    else assert.ok(here <= low + 1e-3, `${name}: the periapsis at ${a.t.toFixed(1)} s is a bottom`);
  }
  let changes = 0;
  for (let i = 1; i < P.length; i++) if (Math.sign(dot(P[i].r, P[i].v)) !== Math.sign(dot(P[i - 1].r, P[i - 1].v))) changes++;
  assert.ok(Math.abs(found.length - changes) <= 1, `${name}: ${found.length} apsides for ${changes} changes of sign`);
  if (result.outcome === 'impact')
    assert.ok(result.impact && Math.abs(result.impact.t - P.at(-1).t) < 1e-6, `${name}: it ends where it comes down`);
  if (result.outcome === 'orbit') {
    // once round: the angle swept about the centre comes to a whole turn (within the step of the last point)
    let swept = 0;
    for (let i = 1; i < P.length; i++) swept += Math.acos(Math.min(1, dot(unit(P[i - 1].r), unit(P[i].r))));
    assert.ok(swept > 1.9 * Math.PI && swept < 2.2 * Math.PI, `${name}: once round sweeps ${((swept * 180) / Math.PI).toFixed(0)} degrees`);
  }
  return curve;
}

/** Drawn from eyes placed at random: no chord strays more than the stated pixels, wherever the eye is. */
function drawn(name, curve, rand) {
  const pxPerRad = 400 / Math.tan((25 * Math.PI) / 180);
  const t0 = curve.t[0];
  const t1 = curve.t[curve.n - 1];
  const place = (t, out, o) => curveAt(curve, t, out, o);
  const T = new Float64Array(8193);
  const Pt = new Float64Array(8193 * 3);
  const m = new Float64Array(3);
  const p = [0, 0, 0];
  for (let k = 0; k < 4; k++) {
    // beside the vehicle (25 m), beside the path somewhere along it (a kilometre), or far out
    place(t0 + (k === 1 ? rand() * (t1 - t0) : 0), p, 0);
    const d = [25, 1000, 25, 4 * R][k];
    const dir = unit([rand() - 0.5, rand() - 0.5, rand() - 0.5]);
    const eye = p.map((x, j) => x + dir[j] * d);
    const n = sample(place, curve.t, t0, t1, { eye, pxPerRad, near: 0.5 }, 8192, T, Pt);
    let worst = 0;
    for (let i = 0; i + 1 < n; i++)
      for (let q = 1; q < 6; q++) {
        const f = q / 6;
        place(T[i] + (T[i + 1] - T[i]) * f, m, 0);
        const c = nearest(Pt, i, m); // (what is seen: how far the curve is from the chord, wherever along it)
        const dist = Math.max(0.5, Math.hypot(m[0] - eye[0], m[1] - eye[1], m[2] - eye[2]));
        worst = Math.max(worst, (Math.hypot(c[0] - m[0], c[1] - m[1], c[2] - m[2]) / dist) * pxPerRad);
      }
    assert.ok(worst <= 1.5 * ERROR_PX, `${name}, eye ${k}: a chord strays ${worst.toFixed(2)} px (${n} points)`);
    if (k === 3) assert.ok(n < 1500, `${name}: from far out ${n} points`);
  }
}

/** The point of chord `i` (of the points in `P`) nearest `m`. */
const nearest = (P, i, m) => {
  const a = [P[i * 3], P[i * 3 + 1], P[i * 3 + 2]];
  const d = [P[i * 3 + 3] - a[0], P[i * 3 + 4] - a[1], P[i * 3 + 5] - a[2]];
  const dd = d[0] ** 2 + d[1] ** 2 + d[2] ** 2;
  const k = dd > 0 ? Math.min(1, Math.max(0, ((m[0] - a[0]) * d[0] + (m[1] - a[1]) * d[1] + (m[2] - a[2]) * d[2]) / dd)) : 0;
  return [a[0] + d[0] * k, a[1] + d[1] * k, a[2] + d[2] * k];
};

test('the ballistic deck`s predictor on a family of states: the same invariants for every one', () => {
  const site = siteFrame(freedom7.site);
  const rand = seeded(7);
  for (const [name, s] of family(1961)) {
    const start = { t: 1000, r: s.r, v: s.v, mass: 1300, phase: 'capsule' };
    const result = predict(freedom7.trajectory, site, freedom7.site.seaLevel.value, start, { sequence: { chutes: false } });
    const curve = holds(`predict.ts, ${name}`, start, result);
    if (curve) drawn(`predict.ts, ${name}`, curve, rand);
  }
});

test('the orbital deck`s predictor on the same family: one result, the same invariants', () => {
  const plan = structuredClone(vostok1.orbital);
  plan.retro.on.value = plan.retro.off.value = plan.entry.separation.value = Number.MAX_SAFE_INTEGER;
  const site = siteFrame(vostok1.site);
  const jd = julianDate(vostok1.launch);
  const rand = seeded(12);
  for (const [name, s] of family(1961)) {
    // (the orbital deck's coast flies from above the air: a lob from low down is the ballistic deck's)
    if (Math.hypot(...s.r) - R < 100e3) continue;
    const start = { t: 1000, r: s.r, v: s.v };
    const p = orbitPredictor(plan, site, jd, vostok1.site.seaLevel.value, start);
    p.run();
    const curve = holds(`orbitpath.ts, ${name}`, start, p.result);
    if (curve) drawn(`orbitpath.ts, ${name}`, curve, rand);
  }
});
