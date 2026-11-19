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
import { STILL } from '../src/sim/air.ts';
import { autopilot, blend, flyLive, Tally } from '../src/sim/autopilot.ts';
import { ballisticOf, fly, sampleAt } from '../src/sim/fly.ts';
import { flyOrbit } from '../src/sim/orbital.ts';
import { Sheds } from '../src/sim/shed.ts';
import { flyWhole, sequenceOf, steer } from '../src/sim/staged.ts';
import { stagedPilot, stagedVehicle } from '../src/sim/stagedlive.ts';
import { vehicle } from '../src/sim/vehicle.ts';
import { orbitalRecord, recordOf } from '../src/sim/run.ts';
import { DEG, dot, enuToEcefDirection, fromHorizontal, geodeticToEcef, length, scale, siteFrame, unit } from '../src/world/frames.ts';
import { elementsOf } from '../src/world/orbit.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { predictions } from './predictions.mjs';

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

// ---- ballistic flights ----
for (const flight of flights.filter((f) => f.plan?.kind === 'ballistic')) {
  const b = ballisticOf(flight.plan);
  const site = siteFrame(flight.site);
  const sea = flight.site.seaLevel.value;
  // (in the frame the app flies it in: world/earthframe.ts frameOf)
  const frame = frameOf(flight);

  const whole = fly(flight.plan, site, sea, undefined, undefined, undefined, frame);
  put(flight, 'whole', { ...whole.results, samples: whole.samples.length });

  // the capsule's half from the separation the record gives (as tests/sim.test.mjs builds it)
  {
    const want = Object.fromEntries(flight.checks.map((c) => [c.id, c.value]));
    const at = sampleAt(whole.samples, b.separation.at.value);
    const record = (id) => want[id] ?? whole.results[id];
    const at0 = b.separation.at.value;
    const place = { latitude: at.latitude, longitude: at.longitude, height: record('separationAltitude') + sea };
    // (the heading at separation where the record gives one: the record's, which no plan is flown from)
    const heading = ballisticOf(flight.plan).separation.heading?.value ?? headingOf(at, frame);
    const moving = scale(
      enuToEcefDirection(place, fromHorizontal(heading * DEG, record('separationGroundClimb') * DEG)),
      want.separationGroundSpeed,
    );
    const r = frame.toInertial(geodeticToEcef(place), at0);
    const v = frame.velocityToInertial(geodeticToEcef(place), moving, at0);
    put(flight, 'capsule', fly(flight.plan, site, sea, 0.05, 0.5, { r, v }, frame).results);
  }

  // the live vehicle, by the autopilot, and what it sheds
  const v = vehicle(flight.plan, site, sea, { frame });
  const live = flyLive(v);
  const end = live.state.landing;
  put(flight, 'live', { ...live.results, landingT: end?.t, landingLatitude: end?.latitude, landingLongitude: end?.longitude });
  const sheds = new Sheds(flight.plan, site, sea, { frame });
  sheds.follow(live.state);
  for (const body of sheds.all) {
    const l = body.finish();
    put(flight, `shed:${body.shedder.def.on}`, {
      t: l?.t,
      latitude: l?.latitude,
      longitude: l?.longitude,
      speed: l?.speed,
      apogee: body.now.apogee,
      peakQ: body.now.peakQ,
    });
  }

  // the predictor from the record's run at fixed instants (tools/predictions.mjs)
  for (const p of predictions(flight)) put(flight, p.run, p.make());

  // an abort off the pad, the engine never lit, in still air
  if (b.craft.rigid?.escape) {
    const still = { ...flight.plan, winds: STILL };
    const av = vehicle(still, site, sea, { frame });
    const auto = autopilot(av, { launch: false });
    const tally = new Tally();
    let state = av.start();
    while (!state.landing && state.t < 600) {
      const next = av.tick(state, (x) => blend(auto(x), { events: [b.abort.id] }));
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
  // the record's run on into the sea, where its flight floats it (sim/afloat.ts), and its hatch thrown off (sim/loose.ts)
  const run = flight.flies?.afloat ? recordOf(flight) : undefined;
  const afloat = run?.afloat;
  if (run && afloat) {
    const i = (flight.flies.drops ?? []).findIndex((d) => d.nodes.includes(flight.flies.hatch?.node));
    const hatch = i >= 0 ? run.loose?.[i] : undefined;
    put(flight, 'afloat', {
      under: afloat.under,
      end: afloat.end,
      flooded: afloat.flooded,
      held: afloat.held,
      rose: afloat.rose,
      heeled: afloat.heeled,
      heeledAt: afloat.heeledAt,
      hatchDown: hatch?.down.t,
    });
  }
}

// ---- orbital flights ----
for (const flight of flights.filter((f) => f.plan?.kind === 'orbital' && f.site)) {
  const site = siteFrame(flight.site);
  const dated = frameOf(flight);
  const sea = flight.site.seaLevel.value;

  const plan = flight.plan;
  put(flight, 'coast', flyOrbit(plan, site, dated, sea).results);
  if (!plan.attitude.some((a) => 'law' in a.hold)) continue; // (only the coast: no ascent on a law to fly)
  const seq = sequenceOf(plan);

  const x = steer(plan, site, dated, sea);
  put(flight, 'solved', x);
  const shown = flyWhole(plan, site, dated, sea, x, 10);
  const a = shown.ascent;
  put(flight, 'ascent', a.summary);
  for (const [id, e] of Object.entries(a.at)) put(flight, `ascent@${id}`, { t: e.t, altitude: e.altitude, speed: e.speed, mass: e.mass });
  a.stops.forEach((t, i) => put(flight, `ascent stage${i}`, { stop: t, left: a.left[i] }));
  put(flight, 'shown', shown.coast.results);
  if (shown.down) {
    for (const [id, l] of Object.entries(shown.down.landed)) put(flight, `down:${id}`, l);
    put(flight, 'down', { apart: shown.down.apart });
  }
  put(flight, 'flown', { samples: shown.coast.samples.length });

  // the live staged vehicle, from the pad, by its pilot: steered, and with the law's attitude placed
  for (const prescribed of [false, true]) {
    const sv = stagedVehicle(flight.plan, site, dated, sea, x);
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
    const last = seq.stages.length - 1;
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
        t: l?.t,
        latitude: l?.latitude,
        longitude: l?.longitude,
        speed: l?.speed,
        range: l?.range,
      });
    }
  }

  // the predictor from fixed states (in fly.ts's frame, as the deck gives them: tools/predictions.mjs)
  for (const p of predictions(flight)) put(flight, p.run, p.make());
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
