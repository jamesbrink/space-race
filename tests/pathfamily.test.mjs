// The predicted path on states that vary, not on a flight's list: a seeded family of states (lobs of many ranges and
// angles, climbs straight up and falls, circular and elliptical orbits low and high, prograde, polar and retrograde, a
// state just short of orbit and just past it, one past escape), each predicted by the one propagator (predict.ts) for both
// kinds of vehicle that coast there (sim/fliers.ts: the ballistic flight's and the orbital flight's spacecraft), each held to the same
// invariants: the path starts at the state; its marks are where the propagation says (an apsis where the radial speed
// changes sign and nowhere else, alternating; the end on the ground when it comes down; once round when it goes round);
// and, drawn from eyes placed at random (beside the vehicle, beside the path, far out), no chord strays more than the
// stated pixels from it and the chords are as coarse as the view allows.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight as freedom7 } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { flight as vostok1 } from '../missions/ussr/vostok/flights/vostok-1/flight.ts';
import { spacecraft } from '../src/sim/fliers.ts';
import { flyOrbit } from '../src/sim/orbital.ts';
import { apsides, between, predict, propagate } from '../src/sim/predict.ts';
import { fromAxes } from '../src/sim/rigid.ts';
import { HANDS_OFF, vehicle } from '../src/sim/vehicle.ts';
import { curveAt, curveOf, ERROR_PX, sample } from '../src/viewer/pathline.ts';
import { siteFrame } from '../src/world/frames.ts';
import { greenwichSiderealTime, julianDate } from '../src/world/time.ts';

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
    const p = propagate(spacecraft(plan, jd, site, vostok1.site.seaLevel.value, start), start, {
      site,
      seaLevel: vostok1.site.seaLevel.value,
    });
    p.run();
    const curve = holds(`spacecraft, ${name}`, start, p.result);
    if (curve) drawn(`spacecraft, ${name}`, curve, rand);
  }
});

// Prediction against outcome: each state of the family that comes down or goes round predicted by the one propagator and
// then flown by the simulator from the same state, and where the path said it would end held against where the flight
// does. The ballistic flight's spacecraft alone is flown by its live simulator (vehicle.ts: a rigid body that finds its own
// attitude in the air, where the path holds it heat shield first), with no hand and no sequencer; the orbital spacecraft by
// its coast (orbital.ts flyOrbit, fixed steps). The table is printed; the bounds are stated with each.
const R_E = 6_371_008.8;
const ecef = (r, t) => {
  const w = 7.292115e-5 * t;
  return [r[0] * Math.cos(w) + r[1] * Math.sin(w), -r[0] * Math.sin(w) + r[1] * Math.cos(w), r[2]];
};
const apartKm = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) / 1000;
const table = [];

test('prediction against outcome: the ballistic flight`s spacecraft, predicted, then flown live from the same state', () => {
  const site = siteFrame(freedom7.site);
  const sea = freedom7.site.seaLevel.value;
  const tr = freedom7.trajectory;
  const V = vehicle(tr, site, sea);
  for (const [name, s] of family(1961)) {
    const h = Math.hypot(...s.r) - R;
    if (h > 130e3 && !name.startsWith('lob') && name !== 'falling') continue;
    const start = { t: 1000, r: s.r, v: s.v, mass: tr.retropack.mass.value, phase: 'capsule' };
    // (alone, the spacecraft lets its parachutes out at their heights by itself, in the live simulator and in the path)
    const p = predict(tr, site, sea, start);
    if (p.outcome !== 'impact') continue;
    // the capsule alone, heat shield first into the wind, not turning, nothing to do
    const wind = s.v.map((x, k) => x - [-7.292115e-5 * s.r[1], 7.292115e-5 * s.r[0], 0][k]);
    const x = unit(wind.map((w) => -w));
    const y = unit(cross(x, Math.abs(x[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0]));
    let state = {
      ...V.start(),
      t: 1000,
      ticks: Math.round(1000 / 0.01),
      r: s.r,
      v: s.v,
      q: fromAxes(x, y, cross(x, y)),
      w: [0, 0, 0],
      mass: tr.retropack.mass.value,
      ignited: true,
      cutoff: true,
      held: false,
      shed: { tower: true, booster: true, retropack: true },
    };
    while (!state.landing && state.t < 1000 + 3 * 3600) {
      const next = V.tick(state, HANDS_OFF);
      if (next.ticks === state.ticks) break;
      state = next;
    }
    assert.ok(state.landing, `${name}: the live flight came down`);
    const flown = V.sample(state);
    const miss = apartKm(ecef(p.impact.r, p.impact.t), ecef(flown.centre ?? flown.r, state.landing.t));
    const way = (angleOf(s.r, 1000, p.impact.r, p.impact.t) * R_E) / 1000;
    table.push([`ballistic, ${name}`, `${way.toFixed(0)} km, down at T+${p.impact.t.toFixed(0)}`, `T+${state.landing.t.toFixed(0)}`, miss]);
    // (the live capsule finds its own attitude, and its parachutes open as its own barometric switches have them: a few
    // metres apart over hundreds of kilometres on 14 November 2026; a hundred is the bound)
    assert.ok(miss < 0.1, `${name}: predicted ${miss.toFixed(3)} km from where it came down, over ${way.toFixed(0)} km`);
  }
});

test('prediction against outcome: the orbital spacecraft, predicted, then flown by its coast from the same state', () => {
  const plan = structuredClone(vostok1.orbital);
  plan.retro.on.value = plan.retro.off.value = plan.entry.separation.value = Number.MAX_SAFE_INTEGER;
  const site = siteFrame(vostok1.site);
  const sea = vostok1.site.seaLevel.value;
  const jd = julianDate(vostok1.launch);
  const g = greenwichSiderealTime(jd);
  const turn = (v, a) => [Math.cos(a) * v[0] - Math.sin(a) * v[1], Math.sin(a) * v[0] + Math.cos(a) * v[1], v[2]];
  for (const [name, s] of family(1961)) {
    if (Math.hypot(...s.r) - R < 100e3) continue;
    const start = { t: 1000, r: s.r, v: s.v };
    const job = propagate(spacecraft(plan, jd, site, sea, start), start, { site, seaLevel: sea });
    job.run();
    const p = job.result;
    const run = flyOrbit(plan, site, jd, sea, 10, { t: 1000, r: turn(s.r, g), v: turn(s.v, g) });
    let miss;
    let flownAt;
    let end;
    if (p.outcome === 'impact') {
      // (down to the height the pilot leaves at, both)
      const e = run.samples.at(-1);
      flownAt = e.t;
      miss = apartKm(ecef(p.impact.r, p.impact.t), ecef(turn(e.r, -g), e.t));
      end = `down at T+${p.impact.t.toFixed(0)}`;
    } else {
      // (once round: where the coast is at the instant the path ends)
      const last = p.points.at(-1);
      const i = run.samples.findIndex((x) => x.t > last.t);
      if (i < 1) continue;
      const [a, b] = [run.samples[i - 1], run.samples[i]];
      const r = between(a.t, a.r, a.v, b.t, b.r, b.v, last.t).r;
      flownAt = last.t;
      miss = apartKm(last.r, turn(r, -g));
      end = `round at T+${last.t.toFixed(0)}`;
    }
    table.push([`spacecraft, ${name}`, end, `T+${flownAt.toFixed(0)}`, miss]);
    // (the same forces, an error-controlled step against fixed ones: a metre or less once round and down through the air on
    // 14 November 2026; ten metres round, fifty down, are the bounds)
    assert.ok(miss < (p.outcome === 'impact' ? 0.05 : 0.01), `${name}: ${miss.toFixed(3)} km from the coast flown`);
  }
  console.log(
    ['  # case | predicted | flown | apart, km', ...table.map((r) => `  # ${r[0]} | ${r[1]} | ${r[2]} | ${r[3].toFixed(3)}`)].join('\n'),
  );
});

/** The angle about the Earth's centre between two places, each at its instant (the Earth turned under them). */
function angleOf(r0, t0, r1, t1) {
  const a = unit(ecef(r0, t0));
  const b = unit(ecef(r1, t1));
  return Math.acos(Math.min(1, Math.max(-1, dot(a, b))));
}
