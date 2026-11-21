// One state, changed only by what pushes it (docs/agents/simulator.md): every flight into orbit, flown from the pad to the
// ground, is one integrated state. Nothing puts it on a published orbit, joins it to a tracking fix or hands it a state it
// did not fly to; the record is what the run is compared with. Held here on every flight's own record and on changed
// copies of several: between any two samples the velocity changes by gravity and by what the run itself says was pushing,
// the place by the velocity; the one step in velocity at one instant is the parting joint's push; the guidance that cuts
// its last stage on the orbit reaches the record's period whatever the vehicle weighs or pushes; and every flight leaves
// its pad along its own azimuth, in the batch run, in the samples the scene draws and on the live vehicle.
import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { thirdOf } from '../src/sim/core/gravity.ts';
import { ballisticOf, fly } from '../src/sim/fly.ts';
import { heightsBall, trackedState } from '../src/sim/orbital.ts';
import { turn } from '../src/sim/rigid.ts';
import { between, orbitalFlown, recordOf } from '../src/sim/run.ts';
import { flyWhole, guidanceOf, sequenceOf, stagesOf, steer } from '../src/sim/staged.ts';
import { stagedPilot, stagedVehicle } from '../src/sim/stagedlive.ts';
import { EARTH, G0 } from '../src/world/bodies.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { step as orbitStep } from '../src/world/orbit.ts';
import { add, DEG, dot, enuAxes, length, scale, siteFrame, sub } from '../src/world/frames.ts';
import { meanOf, periodsOf } from '../src/world/meanelements.ts';
import { missesOf } from './misses.mjs';
import { part } from './part.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const all = await Promise.all(
  globSync('missions/*/*/flights/*/flight.ts', { cwd: root })
    .sort()
    .map(async (file) => (await import(pathToFileURL(join(root, file)).href)).flight),
);
const orbital = all.filter((f) => f.plan?.kind === 'orbital' && f.plan.attitude.some((a) => 'law' in a.hold) && f.site && f.flies);
const ballistic = all.filter((f) => f.plan?.kind === 'ballistic' && f.site);
const GM = EARTH.gm.value;
const gravity = (r) => scale(r, -GM / length(r) ** 3);

/**
 * The most a run's samples leave unexplained, each pair in turn: the change in velocity less gravity's (a point mass's, at
 * the mean of the two places), against what the samples say was pushing (the load an accelerometer reads, the greater of
 * the pair and their neighbours, half as much again, and 0.3 m/s^2 for J2 and the air between samples), and the change in
 * place less the mean velocity's. Two samples at one instant are an impulse: their velocities' step is returned apart.
 * `third`: the pull of the bodies the plan names besides the Earth (core/gravity.ts `thirdOf`: the Moon on a flight bound
 * for it), taken as gravity too.
 */
function unexplained(samples, third = null) {
  let worst = { dv: 0, dr: 0, at: 0 };
  const steps = [];
  for (let i = 1; i < samples.length; i++) {
    const [a, b] = [samples[i - 1], samples[i]];
    const dt = b.t - a.t;
    if (dt < 1e-9) {
      steps.push({ t: b.t, dv: length(sub(b.v, a.v)), dr: length(sub(b.r, a.r)) });
      continue;
    }
    const g = Math.max(a.g, b.g, samples[i - 2]?.g ?? 0, samples[i + 1]?.g ?? 0);
    const allowed = 1.5 * g * G0 + 0.3;
    const free = third
      ? scale(add(add(gravity(a.r), third(a.r, a.t)), add(gravity(b.r), third(b.r, b.t))), dt / 2)
      : scale(add(gravity(a.r), gravity(b.r)), dt / 2);
    const dv = (length(sub(sub(b.v, a.v), free)) - 0.02) / (allowed * dt);
    const dr = length(sub(sub(b.r, a.r), scale(add(a.v, b.v), dt / 2))) / ((allowed + 10) * dt * dt + 0.5);
    if (dv > worst.dv) worst = { ...worst, dv, at: b.t };
    if (dr > worst.dr) worst = { ...worst, dr, at: b.t };
  }
  return { worst, steps };
}

/**
 * The state the guidance's cut on the orbit is read at: the spacecraft as the coast begins; or, where the stopped stage
 * goes on pushing before it lets the spacecraft go (`Craft.vents`: an S-IVB's vent and dump), the stack as the stage stopped.
 */
const cutOn = (plan, whole) =>
  plan.craft[0].vents?.length ? whole.ascent.samples.find((x) => x.t >= whole.ascent.stops.at(-1) - 1e-9) : whole.coast.samples[0];

/** The most the last joint of a plan pushes its two sides apart at, m/s. */
const pushOf = (plan) => {
  const c = plan.craft[0];
  const joint = sequenceOf(plan).stages.at(-1).joint;
  return (c.joints.find((j) => j.id === joint)?.push ?? c.sheds?.find((s) => s.on === joint)?.push)?.value ?? 0;
};
/** The most a step in the run's velocity can be, m/s: the last joint's push, or what a joint below it gives the stack flying on as it parts (`JointDef.ahead`: an upper stage's ullage motors). */
const stepOf = (plan) => Math.max(pushOf(plan), ...plan.craft[0].joints.map((j) => j.ahead?.value ?? 0));

/** The bearing from the pad of where a state is over, degrees from true north. */
function bearingFrom(f, frame, r, t) {
  const pad = siteFrame(f.site);
  const here = frame.place(r, t);
  const north = here.latitude - pad.latitude;
  const east = (here.longitude - pad.longitude) * Math.cos(pad.latitude * DEG);
  return (Math.atan2(east, north) / DEG + 360) % 360;
}
const turned = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

/** The way a flight should leave its pad, degrees from true north: its aiming azimuth, or (none given) the one its orbit's inclination asks of a turning Earth. */
function azimuthOf(f) {
  const g = guidanceOf(f.plan);
  if (g.azimuth) return g.azimuth.value;
  const o = f.plan.record.orbit;
  const lat = f.site.latitude.value * DEG;
  const inertial = Math.asin(Math.cos(o.inclination.value * DEG) / Math.cos(lat));
  const v = 7800;
  const east = v * Math.sin(inertial) - 465.1 * Math.cos(lat);
  const north = v * Math.cos(inertial) * (o.injection.heading === 'north' ? 1 : -1);
  return (Math.atan2(east, north) / DEG + 360) % 360;
}

for (const f of part(orbital)) {
  const plan = f.plan;
  const frame = frameOf(f);
  const site = siteFrame(f.site);
  const sea = f.site.seaLevel.value;
  let whole;

  test(`${f.designation}: one state from the pad to the ground, changed only by gravity and what the run says pushes it`, () => {
    whole = orbitalFlown(f);
    const push = pushOf(plan);
    const ascent = unexplained(whole.ascent.samples, thirdOf(plan.gravity, frame));
    const coast = unexplained(whole.coast.samples, thirdOf(plan.gravity, frame));
    console.log(
      `  #   ${f.id}: the most unexplained, as a share of what the samples allow: ascent ${ascent.worst.dv.toFixed(3)} in velocity (T+${ascent.worst.at.toFixed(1)}), ${ascent.worst.dr.toFixed(3)} in place; coast ${coast.worst.dv.toFixed(3)}, ${coast.worst.dr.toFixed(3)}; ${whole.ascent.samples.length} and ${whole.coast.samples.length} samples`,
    );
    for (const [what, run] of [
      ['the ascent', ascent],
      ['the coast', coast],
    ]) {
      assert.ok(run.worst.dv < 1, `${what}: the velocity changes by more than gravity and its own push at T+${run.worst.at}`);
      assert.ok(run.worst.dr < 1, `${what}: the place changes by more than its velocity at T+${run.worst.at}`);
      for (const s of run.steps) {
        assert.ok(s.dr < 1e-6, `${what}: a step in place at T+${s.t}`);
        assert.ok(s.dv <= stepOf(plan) + 1e-9, `${what}: a step of ${s.dv} m/s at T+${s.t}, where the joints push ${stepOf(plan)}`);
      }
    }
    // the coast begins from the state the ascent left the spacecraft in: the stack's place, and its velocity with the
    // spacecraft's share of the joint's push, and nothing else
    const [last, first] = [whole.ascent.samples.at(-1), whole.coast.samples[0]];
    assert.equal(first.t, last.t);
    assert.deepEqual(first.r, last.r);
    assert.deepEqual({ t: first.t, r: first.r, v: first.v }, whole.ascent.separation);
    const step = length(sub(first.v, last.v));
    assert.ok(step <= push + 1e-9, `the velocity steps ${step} m/s at the parting, where the joint pushes ${push}`);
    if (push > 0) assert.ok(step > 0.2 * push, `the spacecraft has its share of the joint's ${push} m/s: ${step}`);
    // the descent begins where the coast ends
    if (whole.down) {
      const end = whole.coast.samples.at(-1);
      for (const track of Object.values(whole.down.tracks).slice(0, 1))
        assert.ok(length(sub(track[0].r, end.r)) < 1e-6, 'the descent begins where the coast ends');
    }
  });

  // The craft a flight's manoeuvres are made on is one state too (sim/pursuit.ts): from where it began, every ten seconds
  // of its first two days are gravity's (world/orbit.ts `step`: with the Earth's flattening) and the thin air's, through
  // every burn the spacecraft makes on it, and the spacecraft's burns on it are forces on the spacecraft (the test above).
  test(`${f.designation}: its target is a craft of its own, moved by gravity and the air alone`, { skip: !plan.target }, () => {
    whole ??= orbitalFlown(f);
    const target = whole.target;
    assert.ok(target, 'the run has its target');
    // (a stage let go begins at the parting; a published orbit or another flight's vehicle is there before it, and is
    // held from the parting on, where the spacecraft can be made on it)
    if ('joint' in plan.target) assert.equal(target.from, whole.ascent.separation.t, 'it begins at the parting');
    else assert.ok(target.from <= whole.ascent.separation.t, 'it is there by the parting');
    const begin = Math.max(target.from, whole.ascent.separation.t);
    const end = Math.min(whole.coast.samples.at(-1).t, begin + 48 * 3600);
    let worst = { dv: 0, dr: 0, at: 0 };
    // (where the spacecraft let go of it after flying joined to it, it is begun again there, FlightPlan.parted: the step
    // across that instant is not gravity's, and is held to the spacecraft's state there instead)
    const releases = (plan.parted ?? []).map((m) => m.value);
    for (const at of releases) {
      const [it, ship] = [target.at(at), between(whole.coast.samples, at)];
      assert.ok(length(sub(it.r, ship.r)) < 1e-3 && length(sub(it.v, ship.v)) < 1e-6, `begun again where the spacecraft is at T+${at}`);
    }
    for (let t = begin; t + 10 <= end; t += 10) {
      if (releases.some((at) => at > t && at <= t + 10)) continue;
      const [a, b] = [target.at(t), target.at(t + 10)];
      assert.ok(a && b, `the target is there at T+${t}`);
      const free = orbitStep(a, t, 10);
      const [dv, dr] = [length(sub(b.v, free.v)), length(sub(b.r, free.r))];
      if (dv > worst.dv) worst = { ...worst, dv, at: t };
      if (dr > worst.dr) worst = { ...worst, dr };
    }
    console.log(
      `  #   ${f.id}: the target's most in ten seconds beyond gravity: ${worst.dv.toExponential(2)} m/s (T+${worst.at}), ${worst.dr.toExponential(2)} m`,
    );
    assert.ok(worst.dv < 2e-3, `the target's velocity changes by ${worst.dv} m/s in ten seconds beyond gravity at T+${worst.at}`);
    assert.ok(worst.dr < 0.02, `the target's place steps ${worst.dr} m`);
    // every burn solved on it ended when it had given what was solved, and is in the run's own account of its burns
    for (const b of whole.coast.burns ?? []) assert.ok(b.off > b.on && Number.isFinite(b.velocity), `${b.lit}: lit ${b.on}, cut ${b.off}`);
  });

  test(`${f.designation}: the run is flown through the record's tracking, and what it misses each fix by is a figure`, {
    skip: !plan.record.coastFixes?.length,
  }, () => {
    for (const fix of plan.record.coastFixes) {
      const t = fix.at.value;
      const samples = t <= whole.ascent.separation.t ? whole.ascent.samples : whole.coast.samples;
      const at = samples.findIndex((s) => Math.abs(s.t - t) < 1e-6);
      if (at < 0) continue;
      const want = trackedState(fix, frame);
      // a sample is kept at the fix's instant, and it is the run's own: the samples either side of it are joined by the
      // same forces (the test above), so the fix has moved nothing
      console.log(
        `  #   T+${t.toFixed(1)}: ${(length(sub(samples[at].r, want.r)) / 1000).toFixed(1)} km and ${length(sub(samples[at].v, want.v)).toFixed(1)} m/s from the tracking`,
      );
    }
  });

  test(`${f.designation}: a last stage its guidance cuts on the orbit leaves the spacecraft on the record's period`, {
    skip: !sequenceOf(plan).stages.at(-1).orbit,
  }, () => {
    const o = plan.record.orbit;
    if (!o.period) return;
    const first = cutOn(plan, whole);
    const m = meanOf({ r: frame.toDate(first.r), v: frame.toDate(first.v) });
    const period = periodsOf(m.a, m.e, m.i, m.argp)[o.kind?.is ?? 'nodal'];
    const dry = whole.ascent.left.at(-1) < 1;
    console.log(
      `  #   left on ${(period / 60).toFixed(3)} min where the record has ${(o.period.value / 60).toFixed(3)}; cut at T+${whole.ascent.stops.at(-1).toFixed(2)} (the record: ${sequenceOf(plan).stages.at(-1).cutAt}), ${whole.ascent.left.at(-1).toFixed(0)} kg left`,
    );
    // (the guidance cuts for the push to come by the plan's masses; the run parts by its own: a few hundredths of a metre a second)
    if (!dry) assert.ok(Math.abs(period - o.period.value) < 1, `the period left on is ${period} s, the record's ${o.period.value}`);
  });

  test(`${f.designation}: it leaves the pad along its azimuth: the run, the samples drawn and the live vehicle`, () => {
    const want = azimuthOf(f);
    const loose = guidanceOf(plan).azimuth ? 1.5 : 3;
    const at = whole.ascent.samples.find((s) => s.t >= 120);
    const flown = bearingFrom(f, frame, at.r, at.t);
    assert.ok(
      turned(flown, want) < loose,
      `at T+120 the run is ${flown.toFixed(2)} degrees from the pad, where its azimuth is ${want.toFixed(2)}`,
    );
    // the samples the scene draws: where they are, and the way the long axis leans
    const run = recordOf(f);
    const drawn = run.samples.find((s) => s.t >= 120);
    const shown = bearingFrom(f, frame, drawn.r, drawn.t);
    assert.ok(turned(shown, want) < loose, `at T+120 the run drawn is ${shown.toFixed(2)} degrees from the pad`);
    const nose = turn(drawn.attitude, [1, 0, 0]);
    const here = frame.place(drawn.r, drawn.t);
    const axes = enuAxes(here);
    const [east, north] = [frame.toInertial(axes.east, drawn.t), frame.toInertial(axes.north, drawn.t)];
    const leans = (Math.atan2(dot(nose, east), dot(nose, north)) / DEG + 360) % 360;
    assert.ok(
      turned(leans, want) < 8,
      `at T+120 the long axis leans toward ${leans.toFixed(1)} degrees, where the azimuth is ${want.toFixed(2)}`,
    );
    // the live vehicle, flown by its pilot from the pad
    const x = whole.ascent.solved;
    const v = stagedVehicle(plan, site, frame, sea, x);
    const pilot = stagedPilot(v, x, site, frame, sea, { guidance: true, sequence: true });
    let s = v.tick(v.start(), {
      pitch: 0,
      yaw: 0,
      roll: 0,
      steps: sequenceOf(plan).stages.flatMap((st, i) => (st.from <= 0 ? [{ kind: 'ignite', stage: i }] : [])),
    });
    while (s.t < 120 && !s.broke && !s.landed) s = v.tick(s, pilot);
    // (a breakup the live vehicle meets in the day's air that the record's flight did not, recorded with its reason in
    // src/sim/misses.ts, run `aloft`: held to its instant, and failed if it has gone away)
    const broke = missesOf(f.id, 'aloft').breakup;
    if (broke) {
      assert.ok(s.broke, `a breakup at T+${broke.by} is recorded (src/sim/misses.ts, aloft): the live vehicle now flies on; take it out`);
      assert.ok(
        Math.abs(s.t - broke.by) <= broke.slack,
        `it breaks up at T+${s.t.toFixed(1)}, where its miss has T+${broke.by} ± ${broke.slack}`,
      );
      console.log(`  #   MISSES the live vehicle breaks up at T+${s.t.toFixed(1)} (${s.broke.text}): ${broke.why}`);
      return;
    }
    assert.ok(!s.broke && !s.landed, 'the live vehicle is flying at T+120');
    const live = bearingFrom(f, frame, s.r, s.t);
    console.log(
      `  #   azimuth ${want.toFixed(2)}: the run ${flown.toFixed(2)}, drawn ${shown.toFixed(2)} (leaning ${leans.toFixed(1)}), live ${live.toFixed(2)}`,
    );
    assert.ok(
      turned(live, want) < loose,
      `at T+120 the live vehicle is ${live.toFixed(2)} degrees from the pad, where its azimuth is ${want.toFixed(2)}`,
    );
  });
}

for (const f of ballistic) {
  test(`${f.designation}: it leaves the pad along its azimuth`, () => {
    const frame = frameOf(f);
    const want = ballisticOf(f.plan).programme.azimuth.value;
    const flown = fly(f.plan, siteFrame(f.site), f.site.seaLevel.value, undefined, undefined, undefined, frame);
    const at = flown.samples.find((s) => s.t >= 100);
    const bearing = bearingFrom(f, frame, at.r, at.t);
    console.log(`  #   azimuth ${want.toFixed(2)}: the run ${bearing.toFixed(2)} at T+100`);
    // (the day's wind carries it a little off: three degrees)
    assert.ok(turned(bearing, want) < 3, `at T+100 it is ${bearing.toFixed(2)} degrees from the pad, where its azimuth is ${want}`);
  });
}

// A last stage that runs dry short of the orbit has still made its cutoff: the spacecraft is let go as long after as the
// plan says, on the live vehicle as in the batch run. (A stage its guidance cuts on the orbit has no instant to be cut at.)
test('a last stage that runs dry short of its orbit still lets the spacecraft go, on the live vehicle as in the run', () => {
  const f = orbital.find((x) => x.id === 'ussr/voskhod/voskhod-1');
  const frame = frameOf(f);
  const site = siteFrame(f.site);
  const sea = f.site.seaLevel.value;
  const plan = structuredClone(f.plan);
  // (the stage's tank, found on the flight's own plan: the copy's stages are read once its load is changed)
  const tank = plan.craft[0].tanks.find((t) => t.id === stagesOf(f.plan).at(-1).tank.id);
  (tank.usable ?? tank.load).value *= 0.9;
  const x = orbitalFlown(f).ascent.solved;
  const whole = flyWhole(plan, site, frame, sea, x, 10);
  const wait = sequenceOf(plan).stages.at(-1).wait;
  assert.ok(whole.ascent.left.at(-1) < 1, 'the batch run’s last stage runs dry');
  assert.ok(Math.abs(whole.ascent.separation.t - (whole.ascent.stops.at(-1) + wait)) < 1e-6, 'and it parts so long after');
  const v = stagedVehicle(plan, site, frame, sea, x);
  const pilot = stagedPilot(v, x, site, frame, sea, { guidance: true, sequence: true, prescribed: true });
  let s = v.tick(v.start(), {
    pitch: 0,
    yaw: 0,
    roll: 0,
    steps: sequenceOf(plan).stages.flatMap((st, i) => (st.from <= 0 ? [{ kind: 'ignite', stage: i }] : [])),
  });
  while (!s.parted && !s.broke && !s.landed && s.t < whole.ascent.separation.t + 60) s = v.tick(s, pilot);
  assert.ok(s.parted, 'the live vehicle lets the spacecraft go');
  console.log(
    `  #   dry at T+${whole.ascent.stops.at(-1).toFixed(2)}; parted at T+${whole.ascent.separation.t.toFixed(2)} in the run, T+${s.parted.t.toFixed(2)} live`,
  );
  assert.ok(Math.abs(s.parted.t - whole.ascent.separation.t) < 0.5, `parted at T+${s.parted.t}, the run at T+${whole.ascent.separation.t}`);
});

// The loop is closed on the live state, not on a solution made beforehand: the live vehicle steered by its pilot (a rigid
// body a tick behind its law, where the batch run's attitude is placed), and with a hand leaning the law a degree up range
// and to the left for a minute, still has its last stage cut where the orbit reached has the record's period. Four seconds
// of period, which is two metres a second at the cutoff: a tick of the last stage's push and the pilot's lag.
for (const id of ['ussr/voskhod/voskhod-1', 'usa/gemini/gt-3', 'usa/mercury/ma-7-aurora-7']) {
  const f = orbital.find((x) => x.id === id);
  test(`${f.designation}: steered live, and leaned by a hand, the guidance still cuts on the record's orbit`, () => {
    const frame = frameOf(f);
    const site = siteFrame(f.site);
    const sea = f.site.seaLevel.value;
    const plan = f.plan;
    const o = plan.record.orbit;
    const x = orbitalFlown(f).ascent.solved;
    for (const lean of [0, 0.02]) {
      const v = stagedVehicle(plan, site, frame, sea, x);
      const trim = { pitch: 0, yaw: 0 };
      const pilot = stagedPilot(v, x, site, frame, sea, { guidance: true, sequence: true, trim });
      let s = v.tick(v.start(), {
        pitch: 0,
        yaw: 0,
        roll: 0,
        steps: sequenceOf(plan).stages.flatMap((st, i) => (st.from <= 0 ? [{ kind: 'ignite', stage: i }] : [])),
      });
      while (!s.parted && !s.broke && !s.landed && s.t < 2000) {
        const leaning = s.t > 200 && s.t < 260;
        trim.pitch = leaning ? -lean : 0;
        trim.yaw = leaning ? lean : 0;
        s = v.tick(s, pilot);
      }
      assert.ok(s.parted, `leaned ${lean} rad: the spacecraft parts`);
      const m = meanOf({ r: frame.toDate(s.parted.r), v: frame.toDate(s.parted.v) });
      const period = periodsOf(m.a, m.e, m.i, m.argp)[o.kind?.is ?? 'nodal'];
      const radius = heightsBall(plan, site);
      console.log(
        `  #   ${f.id}, leaned ${lean} rad: parted at T+${s.parted.t.toFixed(2)} on ${((m.a * (1 - m.e) - radius) / 1000).toFixed(0)} by ${((m.a * (1 + m.e) - radius) / 1000).toFixed(0)} km, ${(period / 60).toFixed(3)} min (the record: ${(o.period.value / 60).toFixed(3)})`,
      );
      assert.ok(Math.abs(period - o.period.value) < 4, `leaned ${lean} rad: left on ${period} s, the record's ${o.period.value}`);
    }
  });
}

// Changed copies: the guidance closes the loop on whatever vehicle it is given. One flight of each way of solving the law
// (the plane solved; the azimuth given; a stored programme first), its last stage 3 per cent weaker and stronger, the law
// solved afresh: the orbit left on is still the record's, the cutoff has moved the way the change says, and the state is
// still one state.
const varied = ['ussr/voskhod/voskhod-1', 'usa/gemini/gt-3', 'usa/apollo/apollo-7'];
for (const f of part(orbital.filter((x) => varied.includes(x.id)))) {
  test(`${f.designation}: changed, the guidance still reaches the orbit, by physics alone`, () => {
    const frame = frameOf(f);
    const site = siteFrame(f.site);
    const sea = f.site.seaLevel.value;
    const o = f.plan.record.orbit;
    const base = orbitalFlown(f);
    const lastEngine = stagesOf(f.plan).at(-1).engine.id;
    const changes = {
      'the last stage 3 per cent weaker': (p) => {
        const e = p.craft[0].engines.find((k) => k.id === lastEngine);
        e.thrust.vacuum.value *= 0.97;
        return 1;
      },
      'the last stage 3 per cent stronger': (p) => {
        const e = p.craft[0].engines.find((k) => k.id === lastEngine);
        e.thrust.vacuum.value *= 1.03;
        return -1;
      },
    };
    for (const [what, change] of Object.entries(changes)) {
      const plan = structuredClone(f.plan);
      const later = change(plan);
      const whole = flyWhole(plan, site, frame, sea, steer(plan, site, frame, sea), 10);
      const first = cutOn(plan, whole);
      const m = meanOf({ r: frame.toDate(first.r), v: frame.toDate(first.v) });
      const period = periodsOf(m.a, m.e, m.i, m.argp)[o.kind?.is ?? 'nodal'];
      const moved = whole.ascent.stops.at(-1) - base.ascent.stops.at(-1);
      const radius = heightsBall(plan, site);
      console.log(
        `  #   ${f.id}, ${what}: cut ${moved >= 0 ? '+' : ''}${moved.toFixed(2)} s, ${whole.ascent.left.at(-1).toFixed(0)} kg left; left on ${((m.a * (1 - m.e) - radius) / 1000).toFixed(0)} by ${((m.a * (1 + m.e) - radius) / 1000).toFixed(0)} km, ${(period / 60).toFixed(3)} min (the record: ${(o.period.value / 60).toFixed(3)})`,
      );
      // (a flow that falls with the thrust burns as long for the same impulse: a weaker stage cuts later, a stronger sooner)
      assert.ok(moved * later > 0, `${what}: the cutoff moves ${later > 0 ? 'later' : 'sooner'}: ${moved}`);
      if (whole.ascent.left.at(-1) > 1) assert.ok(Math.abs(period - o.period.value) < 1, `${what}: the period left on is ${period} s`);
      const run = unexplained(whole.ascent.samples);
      assert.ok(run.worst.dv < 1 && run.worst.dr < 1, `${what}: still one state`);
      const begun = whole.coast.samples[0];
      assert.deepEqual({ t: begun.t, r: begun.r }, { t: whole.ascent.separation.t, r: whole.ascent.samples.at(-1).r });
    }
  });
}

test('every craft of a run flown together is one state: between samples its velocity changes by gravity and what pushes it', async () => {
  const { flownOnce } = await import('./transposition.mjs');
  const run = flownOnce();
  assert.ok(run.tracks.length >= 5);
  for (const track of run.tracks) {
    // (no engine is lit among craft flown together: the most that pushes one is its thrusters, under the 0.3 m/s^2 allowed)
    const { worst, steps } = unexplained(track.samples.map((x) => ({ ...x, g: 0 })));
    assert.ok(worst.dv < 1 && worst.dr < 1, `craft ${track.id} (${track.bodies.join(', ')}) at ${worst.at} s: ${JSON.stringify(worst)}`);
    assert.deepEqual(steps, [], `craft ${track.id}: no step within a craft's own track; a parting begins new ones`);
  }
});
