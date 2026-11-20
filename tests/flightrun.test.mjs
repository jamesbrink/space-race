// src/sim/run.ts: a flight's run is asked the same things whatever kind of flight it is. The record's run of every flight
// that flies says what happened on it (the plan's events by id, the record's instants), when each body left, what it gave
// for each of the record's checks, its sample at an instant and its line flown; a run flown by hand says the same as it
// grows, from its machine.
import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { autopilot, flyLive } from '../src/sim/autopilot.ts';
import { clockAt } from '../src/sim/plan.ts';
import { grown, orbitalEvents, orbitalFlown, recordOf, recordTimes } from '../src/sim/run.ts';
import { vehicle } from '../src/sim/vehicle.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { siteFrame } from '../src/world/frames.ts';

const root = join(import.meta.dirname, '..');
const flights = (
  await Promise.all(
    globSync('missions/*/*/flights/*/flight.ts', { cwd: root }).map(async (f) => (await import(pathToFileURL(join(root, f)).href)).flight),
  )
).filter((f) => f.plan && f.site && f.flies);

test('every flight that flies has a run of the record', () => {
  assert.ok(flights.length >= 4, `${flights.length} flights fly`);
  for (const f of flights) assert.ok(recordOf(f), f.id);
});

for (const f of flights) {
  test(`${f.callsign}: the record's run says what happened, when each body left and what it gave`, () => {
    const run = recordOf(f);
    const plan = f.plan;
    const clocked = (event, seen = new Set()) =>
      event &&
      !seen.has(event.id) &&
      event.when.every(
        (trigger) =>
          'time' in trigger ||
          ('after' in trigger &&
            clocked(
              plan.events.find((e) => e.id === trigger.after),
              new Set([...seen, event.id]),
            )),
      );
    assert.equal(run.frame.gast0, frameOf(f).gast0);
    // in order of time, each of the plan's events once, and each a real one
    for (let i = 1; i < run.events.length; i++) assert.ok(run.events[i].t >= run.events[i - 1].t, `${f.id}: events in order`);
    const ids = run.events.flatMap((e) => (e.event ? [e.event] : []));
    assert.equal(new Set(ids).size, ids.length, `${f.id}: an event once`);
    for (const id of ids)
      assert.ok(
        plan.events.some((e) => e.id === id),
        `${f.id}: ${id} is the plan's`,
      );
    // what the clock sets off happens at the record's instant, unless the run decides it (the pilot let loose at a height;
    // a burn guidance solved on the flight's target, cut when it had given what was solved: orbital.ts `BurnFlown`)
    const solved = new Map(
      (plan.kind === 'orbital' ? (orbitalFlown(f).coast.burns ?? []) : []).filter((x) => x.solved).map((x) => [x.cut, x.off]),
    );
    for (const e of run.events) {
      const def = e.event && plan.events.find((x) => x.id === e.event);
      if (solved.has(e.event)) assert.equal(e.t, solved.get(e.event), `${f.id}: ${e.event} when guidance cut it`);
      else if (def?.at && clocked(def)) {
        // (the plan as the run flew it: a braking burn timed for the landing place, and what follows it, sim/plan.ts `LandingAim`)
        const as = plan.kind === 'orbital' ? (orbitalFlown(f).plan ?? plan) : plan;
        const lit = as.events.find((x) => x.id === def.id);
        assert.ok(
          Math.abs(e.t - (def.at.value + clockAt(as, lit) - clockAt(plan, def))) < 1e-6,
          `${f.id}: ${e.event} at its clock's instant`,
        );
      }
    }
    // the record's instants by the record's ids, as the orbital record's events give them
    if (plan.kind === 'orbital')
      assert.deepEqual(recordTimes(run.events), orbitalEvents(f, orbitalFlown(f)), `${f.id}: the record's instants`);
    // each body leaves when the joint that lets it go parts, the last body (the spacecraft) never
    const bodies = plan.craft[0].bodies;
    assert.deepEqual(Object.keys(run.bodies).sort(), bodies.map((b) => b.id).sort(), `${f.id}: every body`);
    for (const j of plan.craft[0].joints) {
      if (!j.at) continue;
      const release = plan.events.find((e) => e.do.some((action) => 'separate' in action && action.separate === j.id));
      // (a joint the run parts itself, at a height or so long after a cut its guidance made on the state, parts when the run has it)
      const runs = release?.when.some((w) => 'height' in w) || (release && !Number.isFinite(clockAt(plan, release)));
      // (or when the plan as the run flew it has it: after a braking burn timed for the landing place, as much later as the burn)
      const as = plan.kind === 'orbital' ? (orbitalFlown(f).plan ?? plan) : plan;
      const shift =
        release && Number.isFinite(clockAt(plan, release))
          ? clockAt(
              as,
              as.events.find((e) => e.id === release.id),
            ) - clockAt(plan, release)
          : 0;
      const at = runs ? (run.events.find((e) => e.event === release.id)?.t ?? j.at.value) : j.at.value + shift;
      for (const b of j.gone) assert.ok(run.bodies[b] <= at + 1e-9, `${f.id}: ${b} gone by ${j.id}'s ${at} s (${run.bodies[b]})`);
    }
    // what it gave for each check: one row a check, each a number
    const checks = plan.kind === 'ballistic' ? f.checks : plan.checks;
    assert.equal(run.results.length, checks.length, `${f.id}: a row a check`);
    for (const r of run.results) assert.equal(typeof r.got, 'number', `${f.id}: ${r.id}`);
    // the sample at an instant is the last at or before it (or, in a quiet stretch of a coast kept as its two ends, the
    // sample at that instant itself, flown again: sim/rails.ts), and the line flown is the samples
    const mid = run.samples[Math.floor(run.samples.length / 2)];
    assert.equal(run.at(mid.t), mid);
    const just = run.at(mid.t + 1e-6);
    if (mid.rails) {
      assert.equal(just.t, mid.t + 1e-6);
      assert.ok(Math.hypot(...just.r.map((x, i) => x - mid.r[i])) < 0.05, `${f.id}: a microsecond on, where it was`);
    } else assert.equal(just, mid);
    assert.equal(run.at(-5), run.samples[0]);
    assert.equal(run.track(), run.samples);
  });
}

test("a run flown by hand says what has happened as its machine does: the autopilot's is the record's", () => {
  for (const f of flights.filter((x) => x.plan.kind === 'ballistic')) {
    const v = vehicle(f.plan, siteFrame(f.site), f.site.seaLevel.value, { frame: frameOf(f) });
    const flown = flyLive(v, autopilot(v), 0.5);
    const live = grown(f.plan, flown.craft);
    const record = recordOf(f);
    // the same events, in the same order, at the clock's events the same instants within a tick
    assert.deepEqual(
      live.events.map((e) => e.event),
      record.events.map((e) => e.event),
      `${f.id}: the same events`,
    );
    for (const [i, e] of live.events.entries()) {
      const def = f.plan.events.find((x) => x.id === e.event);
      if (def.at) assert.ok(Math.abs(e.t - record.events[i].t) <= 0.05, `${f.id}: ${e.event} ${e.t} against ${record.events[i].t}`);
    }
    for (const [b, t] of Object.entries(record.bodies))
      assert.ok(Number.isFinite(t) === Number.isFinite(live.bodies[b]), `${f.id}: ${b} gone on both or neither`);
  }
});
