// The simulators' figures, to the last digit: every run the tests fly (a ballistic flight whole, its capsule's half from
// the record's separation, its live vehicle by the autopilot, what it sheds, an abort off the pad, the predictor from
// fixed states; an orbital flight's coast from the published orbit, its ascent on the solved law, the coast and the
// descent flown on from it, the live staged vehicle steered and placed, the predictor from fixed states), each run's key
// results as doubles, held against the capture in tests/fixtures/figures.json.
//
//   pnpm figures            what moved against the capture (exit 1 if anything did), largest first
//   pnpm figures --write    record this tree's figures as the capture
//   pnpm figures --against <file> [--write]   the same against (or into) another file
//
// A refactor of the simulator quotes this diff in its commit, and a figure it moves is explained there. Exact doubles
// differ between machines (Math's functions are not the same last bit on every libm), so the capture is made on one
// machine (hal9000, x86_64-linux) and compared there, and this is not part of `pnpm check`. Only figures that do not
// depend on the inertial frame chosen are captured (heights, speeds, times, places on the Earth, elements): a change of
// frame is held to rounding by them.
import { globSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { autopilot, blend, flyLive, Tally } from '../src/sim/autopilot.ts';
import { stack, spacecraft, guided, apparentBy } from '../src/sim/fliers.ts';
import { fly, sampleAt } from '../src/sim/fly.ts';
import { flyOrbit } from '../src/sim/orbital.ts';
import { planOfOrbital } from '../src/sim/planof.ts';
import { predict, propagate } from '../src/sim/predict.ts';
import { Sheds } from '../src/sim/shed.ts';
import { flyWhole, published, steer } from '../src/sim/staged.ts';
import { stagedPilot, stagedVehicle } from '../src/sim/stagedlive.ts';
import { vehicle } from '../src/sim/vehicle.ts';
import { orbitalRecord } from '../src/viewer/ascent.ts';
import { DEG, dot, enuToEcefDirection, fromHorizontal, geodeticToEcef, length, scale, siteFrame, unit } from '../src/world/frames.ts';
import { elementsOf } from '../src/world/orbit.ts';
import { frameOf } from '../src/world/earthframe.ts';

const root = join(import.meta.dirname, '..');
// (`--against <file>`: another capture, such as one made on this machine before a change)
const against = process.argv.indexOf('--against');
const FIXTURE = against > 0 ? process.argv[against + 1] : join(root, 'tests/fixtures/figures.json');
const write = process.argv.includes('--write');

const flights = (
  await Promise.all(
    globSync('missions/*/*/flights/*/flight.ts', { cwd: root }).map(async (f) => (await import(pathToFileURL(join(root, f)).href)).flight),
  )
).sort((a, b) => a.launch.localeCompare(b.launch));

/** Every figure, by `<flight> <run> <field>`. */
const figures = {};
const put = (flight, run, values) => {
  for (const [k, v] of Object.entries(values)) {
    // (JSON has no NaN or Infinity: those are kept as their names)
    if (typeof v === 'number') figures[`${flight.id} ${run} ${k}`] = Number.isFinite(v) ? v : String(v);
    else if (v === null || v === undefined) figures[`${flight.id} ${run} ${k}`] = null;
  }
};
const pathFigures = (p) => ({
  outcome: { impact: 0, orbit: 1, none: 2 }[p.outcome] ?? 3,
  points: p.points.length,
  impactT: p.impact?.t ?? null,
  impactLatitude: p.impact?.latitude ?? null,
  impactLongitude: p.impact?.longitude ?? null,
  impactSpeed: p.impact?.speed ?? null,
  apogee: p.apogee?.altitude ?? null,
  apogeeT: p.apogee?.t ?? null,
  events: p.events.length,
  lastEventT: p.events.at(-1)?.t ?? null,
});

// ---- ballistic flights ----
for (const flight of flights.filter((f) => f.trajectory)) {
  const tr = flight.trajectory;
  const site = siteFrame(flight.site);
  const sea = flight.site.seaLevel.value;
  // (in the frame the app flies it in: world/earthframe.ts frameOf)
  const frame = frameOf(flight);

  const whole = fly(tr, site, sea, undefined, undefined, undefined, frame);
  put(flight, 'whole', { ...whole.results, samples: whole.samples.length });

  // the capsule's half from the separation the record gives (as tests/sim.test.mjs builds it)
  {
    const want = Object.fromEntries(flight.checks.map((c) => [c.id, c.value]));
    const at = sampleAt(whole.samples, tr.separation.at.value);
    const record = (id) => want[id] ?? whole.results[id];
    const at0 = tr.separation.at.value;
    const place = { latitude: at.latitude, longitude: at.longitude, height: record('separationAltitude') + sea };
    const heading = tr.separation.heading?.value ?? headingOf(at, frame);
    const moving = scale(
      enuToEcefDirection(place, fromHorizontal(heading * DEG, record('separationGroundClimb') * DEG)),
      want.separationGroundSpeed,
    );
    const r = frame.toInertial(geodeticToEcef(place), at0);
    const v = frame.velocityToInertial(geodeticToEcef(place), moving, at0);
    put(flight, 'capsule', fly(tr, site, sea, 0.05, 0.5, { r, v }, frame).results);
  }

  // the live vehicle, by the autopilot, and what it sheds
  const v = vehicle(tr, site, sea, { frame });
  const live = flyLive(v);
  const end = live.state.landing;
  put(flight, 'live', { ...live.results, landingT: end?.t, landingLatitude: end?.latitude, landingLongitude: end?.longitude });
  const sheds = new Sheds(tr, site, sea, { frame });
  sheds.follow(live.state);
  for (const body of sheds.all) {
    const l = body.finish();
    put(flight, `shed:${body.shedder.def.on}`, {
      t: l.t,
      latitude: l.latitude,
      longitude: l.longitude,
      speed: l.speed,
      apogee: body.now.apogee,
      peakQ: body.now.peakQ,
    });
  }

  // the predictor from the record's run at fixed instants
  for (const t0 of [60, 200, 400]) {
    const s = sampleAt(whole.samples, t0);
    put(flight, `predict:T+${t0}`, pathFigures(predict(tr, site, sea, s, { frame })));
  }

  // an abort off the pad, the engine never lit, in still air
  if (tr.body?.escape) {
    const still = { ...tr, winds: undefined };
    const av = vehicle(still, site, sea, { frame });
    const auto = autopilot(av, { launch: false });
    const tally = new Tally();
    let state = av.start();
    while (!state.landing && state.t < 600) {
      const next = av.tick(state, (x) => blend(auto(x), { events: ['abort'] }));
      if (next.ticks === state.ticks) break;
      state = next;
      tally.note(av.sample(state), state, av);
    }
    put(flight, 'abort', {
      apogee: tally.results.apogee,
      range: tally.results.range,
      landingT: state.landing?.t,
      landingSpeed: state.landing?.vertical,
      peakG: tally.abort?.peakG,
      towerAt: state.towerAt,
    });
  }
}

// ---- orbital flights ----
for (const flight of flights.filter((f) => f.orbital && f.site)) {
  const o = flight.orbital;
  const site = siteFrame(flight.site);
  const dated = frameOf(flight);
  const sea = flight.site.seaLevel.value;

  const plan = planOfOrbital(o);
  put(flight, 'coast', flyOrbit(plan, site, dated, sea).results);
  if (!o.ascent) continue;

  const x = steer(plan, site, dated, sea);
  put(flight, 'solved', x);
  const shown = flyWhole(plan, site, dated, sea, x, 10, 'published');
  const a = shown.ascent;
  put(flight, 'ascent', a.summary);
  for (const [id, e] of Object.entries(a.at)) put(flight, `ascent@${id}`, { t: e.t, altitude: e.altitude, speed: e.speed, mass: e.mass });
  a.stops.forEach((t, i) => put(flight, `ascent stage${i}`, { stop: t, left: a.left[i] }));
  put(flight, 'shown', shown.coast.results);
  if (shown.down) {
    for (const [id, l] of Object.entries(shown.down.landed)) put(flight, `down:${id}`, l);
    put(flight, 'down', { apart: shown.down.apart });
  }
  const flown = flyWhole(plan, site, dated, sea, x, 10, 'flown');
  put(flight, 'flown', { ...flown.coast.results, samples: flown.coast.samples.length });

  // the live staged vehicle, from the pad, by its pilot: steered, and with the law's attitude placed
  for (const prescribed of [false, true]) {
    const sv = stagedVehicle(o, site, dated, sea, x);
    const pilot = stagedPilot(sv, x, site, dated, sea, { guidance: true, sequence: true, prescribed });
    let s = sv.start();
    s = sv.tick(s, {
      pitch: 0,
      yaw: 0,
      roll: 0,
      steps: [
        { kind: 'ignite', stage: 0 },
        { kind: 'ignite', stage: 1 },
      ],
    });
    const last = o.stages.length - 1;
    let cut = null;
    while (!s.parted && !s.landed && s.t < 2000) {
      const was = s;
      s = sv.tick(s, pilot);
      if (s.ticks === was.ticks && !s.parted) break;
      if (!cut && sv.burning(was, last) && !sv.burning(s, last)) cut = was;
    }
    if (cut) {
      const el = elementsOf(cut.r, cut.v);
      put(flight, prescribed ? 'live:prescribed' : 'live:steered', {
        cutoffT: cut.t,
        cutoffRadius: length(cut.r),
        cutoffSpeed: length(cut.v),
        cutoffClimb: Math.asin(dot(unit(cut.r), unit(cut.v))) / DEG,
        a: el.a,
        e: el.e,
        inclination: el.i / DEG,
        partedT: s.t,
      });
    }
  }

  // the record's run as the scene shows it, and what it drops flown from it (viewer/ascent.ts)
  {
    const run = orbitalRecord(flight);
    const end = run.samples.at(-1);
    put(flight, 'record', {
      samples: run.samples.length,
      endT: end.t,
      endAltitude: end.altitude,
      endLatitude: end.latitude,
      endLongitude: end.longitude,
    });
    for (const body of run.sheds.all) {
      const l = body.finish();
      put(flight, `record shed:${body.shedder.def.on}`, {
        t: l.t,
        latitude: l.latitude,
        longitude: l.longitude,
        speed: l.speed,
        range: l.range,
      });
    }
  }

  // the predictor from fixed states (in fly.ts's frame, as the deck gives them)
  const where = { site, seaLevel: sea, frame: dated };
  {
    // from separation; on a flight whose burn is more than a revolution away (a day in orbit), from the coast forty minutes
    // before it (as tests/staged.test.mjs)
    const sep = published(planOfOrbital(o), a.separation);
    const late = o.retro.on.value - sep.t > 5000 ? shown.coast.samples.find((p) => p.t >= o.retro.on.value - 2400) : null;
    const from = late ?? sep;
    const start = { t: from.t, r: from.r, v: from.v };
    const job = propagate(spacecraft(planOfOrbital(o), dated, site, sea, start), start, where);
    job.run();
    put(flight, 'predict:spacecraft', pathFigures(job.result));
  }
  {
    const s = a.samples.find((p) => p.t >= 100);
    const start = { t: s.t, r: s.r, v: s.v };
    const gone = o.stages.filter((st) => (st.separation?.value ?? Infinity) <= s.t).reduce((m, st) => Math.max(m, st.separation.value), 0);
    const job = propagate(stack(o, site, sea, s.mass, gone), start, where);
    job.run();
    put(flight, 'predict:stack@100', pathFigures(job.result));
  }
  {
    const sv = stagedVehicle(o, site, dated, sea, x);
    for (const t0 of [40, 150, 400]) {
      const s = a.samples.find((p) => p.t >= t0);
      const state = {
        stages: o.stages.map((st, i) => ({
          from: st.ignition.value <= s.t ? st.ignition.value : Infinity,
          to: a.stops[i] <= s.t ? a.stops[i] : Infinity,
          gone: (st.separation?.value ?? Infinity) <= s.t ? st.separation.value : Infinity,
          loose: (st.separation?.value ?? Infinity) <= s.t ? st.separation.value : Infinity,
        })),
        drops: Object.fromEntries(o.ascent.drops.filter((d) => d.at.value <= s.t).map((d) => [d.id, d.at.value])),
      };
      state.apparent = apparentBy(o, sv, state, s.t);
      const start = { t: s.t, r: s.r, v: s.v };
      const job = propagate(
        guided(o, site, sea, start, {
          vehicle: sv,
          solved: x,
          state,
          sequence: true,
          thetaTurn: s.t > o.ascent.guidance.turn.value ? a.thetaTurn : null,
          plan: o,
        }),
        start,
        where,
      );
      job.run();
      const p = job.result;
      const parted = p.events.find((e) => e.kind === 'separation');
      const cut = p.events.find((e) => e.kind === 'cutoff');
      put(flight, `predict:guided@${t0}`, {
        ...pathFigures(p),
        cutoffT: cut?.t,
        partedT: parted?.t,
        partedRadius: parted ? length(parted.r) : null,
        partedSpeed: parted ? length(parted.v) : null,
      });
    }
  }
}

/** The heading over the ground of a sample's motion in `frame`, degrees true (as tests/sim.test.mjs has it). */
function headingOf(s, frame) {
  const place = { latitude: s.latitude, longitude: s.longitude, height: 0 };
  const east = enuToEcefDirection(place, fromHorizontal(90 * DEG, 0));
  const north = enuToEcefDirection(place, fromHorizontal(0, 0));
  const g = frame.toFixed(frame.overGround(s.r, s.v), s.t);
  return (((Math.atan2(dot(g, east), dot(g, north)) / DEG) % 360) + 360) % 360;
}

const keys = Object.keys(figures).sort();
if (write) {
  writeFileSync(FIXTURE, `${JSON.stringify(Object.fromEntries(keys.map((k) => [k, figures[k]])), null, 2)}\n`);
  console.log(`${keys.length} figures written to ${FIXTURE}`);
  process.exit(0);
}

const was = JSON.parse(readFileSync(FIXTURE, 'utf8'));
const moved = [];
const same = [];
for (const k of new Set([...Object.keys(was), ...keys])) {
  const a = was[k];
  const b = figures[k];
  if (a === b) {
    same.push(k);
    continue;
  }
  const rel = typeof a === 'number' && typeof b === 'number' ? Math.abs(b - a) / Math.max(Math.abs(a), Math.abs(b), 1e-300) : Infinity;
  moved.push({ k, a, b, rel });
}
moved.sort((p, q) => q.rel - p.rel);
const show = (x) => (x === undefined ? 'absent' : x === null ? 'null' : String(x));
for (const m of moved)
  console.log(`${m.k}: ${show(m.a)} -> ${show(m.b)}${Number.isFinite(m.rel) ? ` (${m.rel.toExponential(2)} of itself)` : ''}`);
console.log(
  moved.length
    ? `${moved.length} of ${same.length + moved.length} figures moved; the largest by ${moved[0].rel.toExponential(2)} of itself`
    : `all ${same.length} figures bit for bit`,
);
process.exit(moved.length ? 1 : 0);
