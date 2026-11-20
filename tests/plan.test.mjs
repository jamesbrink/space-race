// The plan model (src/sim/plan.ts): every flight that flies has a whole plan, which carries each figure of the record it
// was written from as it was (a Mercury-Redstone's, its day's and its stack's hardware's; a Vostok's, which says its
// braking burn's command, timer and chain as events of its own, its record's); and the model can say a flight of a kind
// not flown yet (a Gemini on its Titan) without anything new in the code.
import assert from 'node:assert/strict';
import { globSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { ballisticOf } from '../src/sim/fly.ts';
import { downOf } from '../src/sim/descent.ts';
import { coastEvents, coastOf, movesOf, shipOf } from '../src/sim/orbital.ts';
import { clockAt, eventOf, problems } from '../src/sim/plan.ts';
import { act, startCraft } from '../src/sim/craft.ts';
import { byHand, drawnFrom, givenUp, guidanceOf, movedTo, schedule, sequenceOf, stagesOf } from '../src/sim/staged.ts';
import { siiSpent } from '../missions/usa/apollo/vehicles/saturn-v-plan.ts';
import { HARDWARE } from '../missions/usa/mercury/vehicles/mercury-redstone.ts';
import { dayOf } from './ballistic.mjs';
import { recordFrom } from './records.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const all = await Promise.all(
  globSync('missions/*/*/flights/*/flight.ts', { cwd: root }).map(
    async (file) => (await import(pathToFileURL(join(root, file)).href)).flight,
  ),
);
const ballistic = all.filter((f) => f.plan?.kind === 'ballistic');
const orbital = all.filter((f) => f.plan?.kind === 'orbital');
const craftOf = (plan) => plan.craft[0];
const byId = (xs, id) => xs.find((x) => x.id === id);
/** A stage's body, engine, tank and joint, by its place in the record (vostok-plan.ts). */
const stageId = (i) => `stage:${i}`;
/** What a plan's first craft weighs whole: each body's mass times its count. */
const bodiesMass = (plan) => craftOf(plan).bodies.reduce((sum, b) => sum + b.count * b.mass.value, 0);
/** Every action an event sets off, as `kind:id`. */
const doing = (e) => e.do.map((a) => Object.entries(a)[0].join(':'));

test('there are flights of both kinds to make plans of', () => {
  assert.ok(ballistic.length >= 2, 'the Mercury-Redstones');
  assert.ok(orbital.length >= 2, 'the Vostoks');
});

for (const f of [...ballistic, ...orbital]) {
  test(`${f.id}: its plan is whole, and is the flight's own`, () => {
    assert.deepEqual(problems(f.plan), []);
    assert.ok(['ballistic', 'orbital'].includes(f.plan.kind));
    for (const e of craftOf(f.plan).engines.filter((e) => e.nozzle))
      assert.ok(e.nozzle.exit.value > 0 && e.nozzle.exit.source, `${e.id}'s nozzle`);
  });
}

for (const f of ballistic) {
  const day = dayOf(f);
  const hw = HARDWARE;
  const plan = f.plan;
  const c = craftOf(plan);
  test(`${f.id}: the ballistic plan carries its day's and its stack's figures`, () => {
    assert.equal(c.mass, day.liftoffMass);
    assert.ok(Math.abs(bodiesMass(plan) - day.liftoffMass.value) < 1e-6, 'the bodies sum to what leaves the pad');
    // (each found by what it is, as every simulator finds it: fly.ts `ballisticOf`)
    const b = ballisticOf(plan);
    const main = b.engine;
    assert.equal(main.thrust.seaLevel, day.thrust);
    assert.equal(main.isp.seaLevel, day.isp);
    assert.equal(main.exitArea, hw.exitArea);
    assert.equal(main.depletion, hw.depletion);
    assert.equal(main.thrust.vacuum.confidence, 'derived');
    const cut = plan.events.find((e) => doing(e).includes(`cut:${main.id}`) && e.automatic);
    assert.equal(cut.at, day.cutoff);
    assert.equal(b.cutoff, day.cutoff.value);
    const sep = b.separation;
    assert.equal(sep.push, day.separation.speed);
    assert.equal(sep.after, day.separation.mass);
    assert.equal(sep.leaves, day.separation.boosterMass);
    assert.equal(sep.heading, day.separation.heading);
    assert.equal(b.parting.when[0].time, day.separation.at.value);
    // the retrorockets: the first lit at its instant, each other so long after it, all as the record has them
    const lights = [b.retro, ...b.chained];
    assert.equal(lights.length, day.retro.fires.length);
    day.retro.fires.forEach((fire, k) => {
      assert.equal(lights[k].at, fire);
      assert.equal(b.motors[k].burn, hw.retro.burn);
      assert.equal(b.motors[k].thrust.vacuum, hw.retro.thrust);
      assert.deepEqual(doing(lights[k]), [`ignite:${b.motors[k].id}`]);
    });
    assert.equal(b.retroPitch, day.retro.pitch);
    assert.equal(b.packJoint.after, day.retropack.mass);
    assert.equal(b.packOff.at, day.retropack.at);
    assert.equal(b.drogueHeight, day.drogue.value);
    assert.equal(b.mainHeight, day.main.value);
    for (const [chute, own] of [
      [b.drogue, hw.drogue],
      [b.main, hw.main],
    ]) {
      assert.equal(chute.dragArea, own.dragArea);
      assert.equal(chute.fills, own.fills);
    }
    assert.deepEqual(b.main.instead, [b.drogue.id]);
    assert.equal(c.drag[0].curve, hw.ascentDrag);
    assert.equal(c.drag[0].area, hw.area);
    assert.equal(b.spacecraft.aero.drag, hw.entryDrag);
    assert.equal(b.spacecraft.aero.area, hw.area);
    assert.equal(plan.attitude[0].hold.programme, hw.tilt);
    assert.equal(plan.attitude[0].hold.azimuth, day.azimuth);
    assert.equal(plan.winds, day.winds);
    assert.equal(plan.checks.length, (f.checks ?? []).length);
  });
}

/** The Vostoks' records (vostok-record.ts: `stages`), and the Mercury-Atlases' (mercury-atlas-plan.ts: `atlas`). */
const vostoks = orbital.filter((f) => 'stages' in recordFrom(f));
// (a Mercury-Atlas: an Atlas and a capsule; a Gemini target's Atlas carries a payload, target-plan.ts)
const atlases = orbital.filter((f) => 'atlas' in recordFrom(f) && !('payload' in recordFrom(f)));

for (const f of vostoks) {
  const o = recordFrom(f);
  const plan = f.plan;
  const c = craftOf(plan);
  test(`${f.id}: the orbital plan carries the record's figures`, () => {
    assert.equal(c.mass, o.liftoffMass);
    o.stages.forEach((s, i) => {
      const e = byId(c.engines, stageId(i));
      assert.equal(e.thrust, s.thrust);
      assert.equal(e.isp, s.isp);
      assert.equal(byId(c.tanks, stageId(i)).load, s.propellant, 'one unit’s load');
      assert.equal(byId(c.bodies, stageId(i)).mass, s.mass, 'one unit’s mass');
      assert.equal(byId(c.bodies, stageId(i)).count, s.count);
      const lit = s.ignition.value > 0 ? eventOf(plan, `${stageId(i)}:ignite`) : eventOf(plan, 'liftoff');
      assert.ok(doing(lit).includes(`ignite:${stageId(i)}`), `${s.name} is lit`);
      if (s.separation) assert.equal(eventOf(plan, `${stageId(i)}:separate`).at, s.separation);
      const cut = eventOf(plan, `${stageId(i)}:cut`);
      if (s.velocity) {
        const w = cut.when[0];
        assert.equal(w.speed, s.velocity.speed.value + (s.velocity.over?.value ?? 0));
        assert.equal(w.apparent, s.velocity.apparent ? stageId(i) : undefined);
      }
    });
    // every instant of the record is either an event's or a mark
    const instants = new Set([...plan.events.flatMap((e) => (e.at ? [e.at.value] : [])), ...plan.record.marks.map((m) => m.at.value)]);
    for (const e of o.events) assert.ok(instants.has(e.at.value), `${e.id} at ${e.at.value} s`);
    // ...and by its id: each record event is the record of an event the plan sets off, or a mark (none is lost at an instant it shares)
    const named = new Set([...plan.events.flatMap((e) => (e.record ? [e.record.id] : [])), ...plan.record.marks.map((m) => m.id)]);
    for (const e of o.events) assert.ok(named.has(e.id), `the record's ${e.id} is in the plan`);
    assert.equal(eventOf(plan, 'retro-on').at, o.retro.on);
    assert.equal(eventOf(plan, 'retro-off').at, o.retro.off);
    // every event the clock sets off at a record instant is set off at it to the bit, chained or not (one that follows a cut
    // the guidance makes on the orbit is not the clock's: it comes as long after that cut as the record has between them)
    for (const e of plan.events)
      if (e.at && e.when.some((w) => 'time' in w || 'after' in w) && Number.isFinite(clockAt(plan, e)))
        assert.equal(clockAt(plan, e), e.at.value, `${e.id} at its record instant`);
    for (const e of plan.events) {
      const follows = e.when.find((w) => 'after' in w);
      const root = follows && eventOf(plan, follows.after);
      if (e.at && root?.at && !Number.isFinite(clockAt(plan, e)))
        assert.ok(Math.abs(root.at.value + (follows.wait ?? 0) - e.at.value) < 1e-9, `${e.id} as long after ${root.id} as the record has`);
    }
    assert.equal(c.engines.find((e) => e.flown).flown, o.retro.deltaV);
    assert.equal(byId(c.joints, 'modules').after, o.entry.mass);
    assert.equal(eventOf(plan, downOf(plan).ejection).when.find((w) => 'height' in w).height, o.ejection.altitude.value);
    for (const b of o.descent?.bodies ?? []) {
      assert.equal(byId(c.bodies, b.id).mass, b.mass);
      for (const ch of b.chutes) assert.equal(byId(c.chutes, `${b.id}/${ch.name}`).dragArea, ch.dragArea);
    }
    assert.equal(plan.checks.length, (o.ascent?.checks.length ?? 0) + o.checks.length + (o.descent?.checks.length ?? 0));
    assert.equal(plan.record.orbit.period, o.orbit.period);
  });
  test(`${f.id}: the braking burn is commanded, lit, cut and the modules parted in a chain; a timer is started by the command`, () => {
    const k = coastEvents(plan);
    const has = (id) => o.events.some((e) => e.id === id);
    assert.equal(k.command?.record?.id, has('retro-command') ? 'retro-command' : undefined, 'the lighting follows the command');
    assert.equal(k.on.when[0].after, k.command?.id);
    assert.equal(k.off.when[0].after, k.on.id, 'the cut follows the lighting');
    assert.equal(k.parting.when[0].after, k.off.id, 'the parting follows the cut');
    assert.deepEqual(
      k.armed.map((e) => [e.record?.id, e.armed]),
      has('retro-timer') ? [['retro-timer', false]] : [],
      'the timer waits for the command to start it',
    );
    // the pilot set loose and the landings carry the record's names for them
    // (a crew that stays in the ball has the record's own event at that height: the parachute container's cover)
    assert.equal(eventOf(plan, downOf(plan).ejection).record?.id, o.ejection.event?.id ?? 'seat-ejected');
    assert.deepEqual(
      plan.record.marks.filter((m) => m.lands).map((m) => [m.id, m.lands]),
      (o.descent?.bodies ?? []).filter((b) => has(`${b.id}-down`)).map((b) => [`${b.id}-down`, b.id]),
    );
    // a hand's burn: commanded and lit at its instant, cut by its integrator, the modules parting after; no timer started
    const t = o.retro.on.value - 600;
    const hand = byHand(plan, t, [1, 0, 0]);
    const h = coastEvents(hand);
    assert.equal(clockAt(hand, h.command), k.command ? t : Infinity);
    assert.equal(clockAt(hand, h.on), t);
    assert.ok(clockAt(hand, h.off) > t && clockAt(hand, h.parting) === clockAt(hand, h.off) + plan.record.manual.parting.value);
    assert.deepEqual(h.armed, [], 'a hand’s command starts no timer');
    // given up: nothing on the clock
    const never = coastEvents(givenUp(plan));
    for (const e of [never.command, never.on, never.off, never.parting].filter(Boolean))
      assert.equal(clockAt(givenUp(plan), e), Number.MAX_SAFE_INTEGER);
  });
}

/** The Soyuz records (soyuz-record.ts: an R-7 flight's with its ship's `modules`, its main engine and its burns). */
for (const f of vostoks.filter((x) => 'modules' in recordFrom(x))) {
  const o = recordFrom(f);
  const plan = f.plan;
  const c = craftOf(plan);
  test(`${f.id}: one main engine on one load makes every burn in orbit and the braking burn; three modules part; the descent module lifts`, () => {
    const k = coastEvents(plan);
    assert.equal(k.burn.body, 'instrument');
    assert.equal(k.burn.tanks.length, 1);
    assert.equal(byId(c.tanks, k.burn.tanks[0]).load, o.engine.propellant);
    assert.equal(k.burn.thrust.vacuum, o.engine.thrust);
    assert.equal(k.burn.starts.count, o.engine.starts.count);
    // each burn of the record: turned, lit with its own impulse, cut, on the same engine, before the braking burn
    const moves = movesOf(plan);
    assert.deepEqual(
      moves.map((m) => [m.engine, m.on, m.off]),
      o.burns.map((b) => [k.burn.id, b.on.value, b.off.value]),
    );
    for (const b of o.burns) {
      const lit = eventOf(plan, b.id);
      assert.equal(lit.do.find((a) => 'ignite' in a).flown, b.deltaV);
      assert.ok(b.off.value < o.retro.on.value);
    }
    // the orbital and the instrument modules go together, the descent module left at the record's mass; or the orbital
    // module first, in orbit at its own instant before the braking burn, where the record has it so
    const parted = k.parting.do.flatMap((a) => ('separate' in a ? [a.separate] : []));
    if (o.modules.parted) {
      assert.deepEqual(parted, ['modules']);
      const off = plan.events.find((e) => e.do.some((a) => 'separate' in a && a.separate === 'orbital-module'));
      assert.equal(clockAt(plan, off), o.modules.parted.value);
      assert.ok(o.modules.parted.value < o.retro.on.value, 'before the braking burn');
      assert.equal(byId(c.joints, 'orbital-module').at, o.modules.parted);
    } else assert.deepEqual(parted, ['orbital-module', 'modules']);
    assert.equal(byId(c.bodies, 'orbital-module').mass, o.modules.orbital);
    assert.equal(byId(c.bodies, 'instrument').mass, o.modules.instrument);
    // (with what the ship let go in orbit that was none of them: Soyuz 16's docking ring, a drop after the ship's separation)
    const shed = (o.ascent?.drops ?? []).filter((d) => d.at.value > o.stages.at(-1).separation.value).reduce((m, d) => m + d.mass.value, 0);
    assert.ok(
      Math.abs(o.modules.orbital.value + o.modules.instrument.value + o.entry.mass.value + shed - o.mass.value) < 1e-6,
      'the three modules are the ship',
    );
    // its lift at its trim, held from the bank's instant; an entry the record has flown ballistic holds no bank at all
    const module = c.bodies.find((b) => b.aero);
    assert.equal(module.aero.lift, o.entry.lift);
    assert.equal(module.aero.passiveSphere, undefined);
    if (o.entry.bank) {
      const bank = eventOf(plan, 'entry-bank');
      assert.equal(clockAt(plan, bank), o.entry.banked.value);
      assert.equal(plan.attitude.find((a) => a.id === 'banked-attitude').hold.bank, o.entry.bank);
    } else {
      assert.equal(o.entry.banked, undefined);
      assert.ok(!plan.events.some((e) => e.id === 'entry-bank'));
      assert.ok(!plan.attitude.some((a) => 'bank' in a.hold), 'ballistic: no bank held, so its lift is never flown');
    }
    // the braking attitude stays the last aim, turned to at the record's instant
    assert.equal(clockAt(plan, eventOf(plan, 'braking-attitude')), o.retro.turned.value);
  });
}

for (const f of atlases) {
  const o = recordFrom(f);
  const plan = f.plan;
  const c = craftOf(plan);
  test(`${f.id}: the Mercury-Atlas plan carries the record's figures, the Atlas a stage and a half on one tank`, () => {
    assert.equal(c.mass, o.liftoffMass);
    const [booster, sustainer] = stagesOf(plan);
    assert.equal(booster.engine.thrust.seaLevel, o.atlas.booster.engine.thrust.seaLevel);
    assert.equal(booster.engine.isp.vacuum, o.atlas.booster.engine.isp.vacuum);
    assert.equal(sustainer.engine.thrust.vacuum, o.atlas.tank.engine.thrust.vacuum);
    // both engines draw on the one tank, which the tank section carries: the booster section carries none, and leaves empty
    assert.equal(booster.tank, sustainer.tank);
    assert.equal(booster.tank.load, o.atlas.tank.propellant);
    assert.deepEqual(
      [booster.shares, sustainer.shares],
      [
        [0, 1],
        [0, 1],
      ],
    );
    assert.equal(booster.holder.id, sustainer.body.id);
    assert.notEqual(booster.body.id, booster.holder.id);
    assert.equal(booster.body.mass, o.atlas.booster.mass);
    assert.equal(
      drawnFrom(stagesOf(plan), booster.body.id, () => 1),
      0,
      'nothing is drawn from the booster section',
    );
    assert.equal(
      drawnFrom(stagesOf(plan), sustainer.body.id, () => 1),
      3,
      'its tank is drawn on by three chambers',
    );
    // the booster section is dropped by a joint of its own, at the record's instant, after its engines' cut
    const drop = plan.events.find((e) =>
      e.do.some((a) => 'separate' in a && c.joints.find((j) => j.id === a.separate)?.gone.join() === booster.body.id),
    );
    assert.equal(drop.at, o.atlas.booster.separation);
    const cut = plan.events.find((e) => e.do.some((a) => 'cut' in a && a.cut === booster.engine.id));
    assert.equal(cut.at, o.atlas.booster.cutoff);
    // the sustainer is cut on the ground guidance's speed, and its record instant is a mark
    const seco = plan.events.find((e) => e.do.some((a) => 'cut' in a && a.cut === sustainer.engine.id));
    assert.deepEqual(seco.when, [{ orbit: 'published' }]);
    assert.equal(plan.checks.find((c) => c.id === 'cutoffSpeed').value, o.atlas.tank.velocity.value);
    assert.ok(plan.record.marks.some((m) => m.at.value === o.atlas.tank.cutoff.value));
    // a shared tank runs dry for both at once, on both their flows: with the booster engines cut at their instant, later
    const burns = schedule(plan);
    assert.equal(burns[0].to, o.atlas.booster.cutoff.value);
    assert.ok(burns[1].to > burns[0].to);
    // every instant of the record is an event's or a mark, by its id; every event the clock sets off is set off at it to the bit
    const named = new Set([...plan.events.flatMap((e) => (e.record ? [e.record.id] : [])), ...plan.record.marks.map((m) => m.id)]);
    for (const e of o.events) assert.ok(named.has(e.id), `the record's ${e.id} is in the plan`);
    for (const e of plan.events)
      if (e.at && e.when.some((w) => 'time' in w || 'after' in w) && Number.isFinite(clockAt(plan, e)))
        assert.equal(clockAt(plan, e), e.at.value, `${e.id} at its record instant`);
    assert.equal(plan.checks.length, o.ascent.checks.length + 1 + o.checks.length + o.descent.checks.length);
  });
  test(`${f.id}: the retrofire is three solids as one burn, spent and not cut; the pack goes so long after, and a hand's burn is the same burn`, () => {
    const k = coastEvents(plan);
    assert.equal(k.burn.kind, 'solid');
    assert.equal(k.burn.flown, o.retro.deltaV);
    assert.equal(k.off, undefined, 'nothing cuts a solid');
    const coast = coastOf(plan);
    assert.equal(coast.on, o.retro.on.value);
    assert.equal(coast.off, o.retro.on.value + o.retro.spacing.value * 2 + o.retro.burn.value, 'the first lit to the third spent');
    assert.equal(coast.parted, o.retro.gone.value);
    assert.equal(k.parting.when[0].after, k.on.id, 'the pack goes so long after retrofire');
    assert.equal(byId(c.joints, 'retropack-straps').after, o.entry.mass);
    assert.equal(downOf(plan).floor, o.descent.drogue.altitude.value, 'what comes down is let loose at the drogue');
    const t = o.retro.on.value - 600;
    const hand = coastOf(byHand(plan, t, [1, 0, 0]));
    assert.equal(hand.on, t);
    assert.equal(hand.off, t + coast.off - coast.on, 'a solid burns as long by hand');
    assert.equal(hand.parted, t + plan.record.manual.parting.value);
    assert.equal(coastOf(givenUp(plan)).on, Number.MAX_SAFE_INTEGER);
  });
}

const titans = orbital.filter((f) => 'titan' in recordFrom(f));
for (const f of titans) {
  const o = recordFrom(f);
  const plan = f.plan;
  const c = craftOf(plan);
  test(`${f.id}: the Gemini-Titan plan carries the record's figures: two stages, hot staging, the burns, the lifting entry`, () => {
    assert.equal(c.mass, o.liftoffMass);
    const [first, second] = stagesOf(plan);
    assert.equal(first.engine.thrust.seaLevel, o.titan.first.engine.thrust.seaLevel);
    assert.equal(second.engine.thrust.vacuum, o.titan.second.engine.thrust.vacuum);
    assert.equal(first.tank.load, o.titan.first.propellant);
    assert.equal(second.tank.load, o.titan.second.propellant);
    assert.equal(stagesOf(plan).length, 2, 'the thrusters and the rockets are not stages: they draw on no tank');
    // fire in the hole: the second stage lit at the first's cutoff, the stages let go after, through the joint's open side
    const staging = c.joints.find((j) => j.gone.length === 1 && j.gone[0] === first.body.id);
    assert.equal(staging.hot.engine, second.engine.id);
    assert.equal(staging.at, o.titan.staging);
    assert.equal(sequenceOf(plan).stages[1].from, o.titan.second.ignition.value);
    // each burn in orbit at the record's instants, its impulse the indicator's where it gave one, the forward pair astern
    const moves = movesOf(plan);
    assert.equal(moves.length, o.moves.length);
    moves.forEach((m, i) => {
      const r = o.moves[i];
      assert.equal(m.on, r.on.value);
      assert.equal(m.off, r.off.value);
      if (r.deltaV) assert.ok(Math.abs(Math.abs(m.accel) * (m.off - m.on) - r.deltaV.value) < 1e-12, `${r.id}: its impulse`);
      assert.equal(m.accel < 0, r.thrusters === 'forward', `${r.id}: which way it pushes`);
    });
    // the coast's burn the four rockets as one, spent and not cut; the section goes so long after
    const coast = coastOf(plan);
    assert.equal(coast.on, o.retro.on.value);
    assert.equal(coast.off, o.retro.on.value + o.retro.spacing.value * 3 + o.retro.burn.value);
    assert.equal(coast.parted, o.retro.gone.value);
    // the lift is the module's own, flown at the bank the record holds from its instant
    const entry = c.bodies.find((b) => b.aero);
    assert.equal(entry.aero.lift, o.entry.lift);
    assert.deepEqual(shipOf(plan).banks, [
      { at: o.entry.banked.value, bank: o.entry.bank.value },
      ...(o.entry.banks ?? []).map((b) => ({ at: b.at.value, bank: b.bank.value })),
    ]);
    assert.equal(c.crew.words.many, true, 'two men');
  });

  test(`${f.id}: given up, no burn happens on the clock; moved by hand, each is the record's, lit when the hand lights it`, () => {
    const gone = givenUp(plan);
    assert.deepEqual(movesOf(gone), []);
    const axis = [1, 0, 0];
    const t = o.moves[0].on.value + 600;
    const moved = movedTo(plan, gone, 0, t, axis);
    const [m] = movesOf(moved);
    const r = movesOf(plan)[0];
    assert.equal(m.on, t);
    assert.equal(m.off, t + (r.off - r.on));
    assert.equal(m.accel, r.accel);
    assert.deepEqual(m.aim.vector, axis);
    assert.deepEqual(eventOf(moved, r.lit).at, o.moves[0].on, 'the record’s instant kept');
    assert.deepEqual(problems(moved), []);
  });
}

// Not a flight's data: figures of 1 stand in for every number, so nothing here can be read as a Gemini's. What is
// held is that a Gemini's kind of flight is said in the plan's own terms.
const m = (value = 1) => ({ value, confidence: 'estimated', source: 'shape only' });
const curve = { points: [[0, 1]], confidence: 'estimated', source: 'shape only' };
const starts = { count: 1, ground: false, confidence: 'estimated', source: 'shape only' };
const gemini = {
  kind: 'orbital',
  craft: [
    {
      id: 'stack',
      label: 'Gemini-Titan',
      mass: m(),
      bodies: [
        { id: 'first', label: 'Stage I', count: 1, mass: m() },
        { id: 'second', label: 'Stage II', count: 1, mass: m() },
        { id: 'adapter', label: 'Adapter', count: 1, mass: m() },
        { id: 'reentry', label: 'Reentry module', count: 1, mass: m(), aero: { area: m(), drag: curve, lift: curve, trim: m() } },
      ],
      joints: [
        { id: 'staging', label: 'Staging', gone: ['first'], hot: { engine: 'second', open: m(), turn: m(), endures: m() } },
        { id: 'spacecraft', label: 'Spacecraft separation', gone: ['second'], push: m() },
        { id: 'adapter', label: 'Adapter let go', gone: ['adapter'] },
      ],
      engines: [
        {
          id: 'first',
          label: 'LR87',
          body: 'first',
          count: 2,
          tanks: ['first-ox', 'first-fuel'],
          thrust: { seaLevel: m(), vacuum: m() },
          isp: { vacuum: m() },
          kind: 'liquid',
          starts,
        },
        {
          id: 'second',
          label: 'LR91',
          body: 'second',
          count: 1,
          tanks: ['second-ox', 'second-fuel'],
          thrust: { vacuum: m() },
          isp: { vacuum: m() },
          kind: 'liquid',
          starts,
        },
        {
          id: 'retro',
          label: 'Retrorockets',
          body: 'adapter',
          count: 4,
          tanks: [],
          thrust: { vacuum: m() },
          kind: 'solid',
          burn: m(),
          starts,
        },
      ],
      tanks: [
        { id: 'first-ox', label: 'Stage I oxidizer', body: 'first', load: m(), holds: 'oxidizer' },
        { id: 'first-fuel', label: 'Stage I fuel', body: 'first', load: m(), holds: 'fuel' },
        { id: 'second-ox', label: 'Stage II oxidizer', body: 'second', load: m(), holds: 'oxidizer' },
        { id: 'second-fuel', label: 'Stage II fuel', body: 'second', load: m(), holds: 'fuel' },
        { id: 'oams', label: 'OAMS propellant', body: 'adapter', load: m(), holds: 'control', isp: m() },
        { id: 'rcs', label: 'RCS propellant', body: 'reentry', load: m(), holds: 'control', isp: m() },
      ],
      thrusters: [
        { id: 'oams', label: 'OAMS', body: 'adapter', does: ['rotation', 'translation'], tank: 'oams', mode: 'manual', push: m() },
        { id: 'rcs', label: 'Reentry control', body: 'reentry', does: ['rotation'], tank: 'rcs', mode: 'automatic', authority: m() },
      ],
      chutes: [{ id: 'main', label: 'Main', body: 'reentry', dragArea: m(), fills: m() }],
      limits: [],
      drag: [{ until: m(), area: m(), curve }],
    },
  ],
  events: [
    {
      id: 'liftoff',
      label: 'Liftoff',
      when: [{ time: 0 }],
      do: [{ ignite: 'first' }, { attitude: 'ascent' }],
      automatic: true,
      source: 'shape only',
    },
    // fire in the hole: Stage II lit before the joint lets go, cut on its guidance's velocity
    {
      id: 'staging',
      label: 'Staging',
      when: [{ time: 1 }],
      do: [{ ignite: 'second' }, { cut: 'first' }, { separate: 'staging' }],
      automatic: true,
      source: 'shape only',
    },
    { id: 'seco', label: 'SECO', when: [{ speed: 1 }], do: [{ cut: 'second' }], automatic: true, source: 'shape only' },
    {
      id: 'insertion',
      label: 'Spacecraft separation',
      when: [{ after: 'seco', wait: 1 }],
      do: [{ separate: 'spacecraft' }, { attitude: 'free' }],
      automatic: false,
      source: 'shape only',
    },
    {
      id: 'translate',
      label: 'Translate',
      when: [{ command: 'translate' }],
      do: [{ arm: 'retro' }],
      automatic: false,
      source: 'shape only',
    },
    {
      id: 'retro',
      label: 'Retrofire',
      when: [{ after: 'translate', wait: 1 }],
      do: [{ ignite: 'retro' }, { attitude: 'retro' }],
      automatic: true,
      armed: false,
      source: 'shape only',
    },
    {
      id: 'adapter',
      label: 'Adapter let go',
      when: [{ after: 'retro', wait: 1 }],
      do: [{ separate: 'adapter' }, { attitude: 'bank' }],
      automatic: true,
      source: 'shape only',
    },
    {
      id: 'main',
      label: 'Main out',
      when: [{ height: 1, going: 'down' }, { after: 'adapter' }],
      do: [{ deploy: 'main' }],
      automatic: true,
      source: 'shape only',
    },
  ],
  attitude: [
    { id: 'ascent', label: 'Programme', hold: { programme: curve, azimuth: m() }, source: 'shape only' },
    { id: 'free', label: 'Free', hold: { free: true }, source: 'shape only' },
    { id: 'retro', label: 'Retro', hold: { retro: m() }, source: 'shape only' },
    { id: 'bank', label: 'Lifting entry', hold: { bank: m() }, source: 'shape only' },
  ],
  checks: [],
};

const saturns = orbital.filter((f) => 'sic' in recordFrom(f));
for (const f of saturns) {
  const o = recordFrom(f);
  const plan = f.plan;
  const c = craftOf(plan);
  test(`${f.id}: the Saturn V plan carries the record's figures: five F-1s, five J-2s, the S-IVB twice on one tank, the injection on its own law`, () => {
    assert.equal(c.mass, o.liftoff);
    assert.ok(Math.abs(bodiesMass(plan) - o.liftoff.value) < 5, `the bodies sum to the record's first-motion mass: ${bodiesMass(plan)}`);
    const stages = stagesOf(plan);
    assert.deepEqual(
      stages.map((s) => [s.engine.id, s.count]),
      [
        ['f1-centre', 1],
        ['f1-outboard', 4],
        ['j2-centre', 1],
        ['j2-outboard', 4],
        ['sivb-j2', 1],
        ['sivb-tli', 1],
      ],
    );
    assert.equal(stages[0].engine.thrust.seaLevel, o.sic.f1.thrust);
    assert.equal(stages[0].tank.load, o.sic.propellant.load);
    assert.equal(stages[2].engine.thrust.vacuum, o.sii.centre.thrust);
    assert.equal(stages[4].engine.thrust.vacuum, o.sivb.first.thrust);
    assert.equal(stages[5].engine.thrust.vacuum, o.sivb.second.thrust);
    // (the S-IVB's two burns: one J-2 under two names, drawing on one tank)
    assert.equal(stages[4].tank, stages[5].tank);
    assert.deepEqual(stages[4].shares, [4, 5]);
    assert.equal(stages[5].engine.again, 'sivb-j2');
    const seq = sequenceOf(plan);
    assert.equal(seq.stages[0].cut, o.sic.centreCut.value);
    assert.equal(seq.stages[1].cut, o.sic.outboardCut.value);
    assert.equal(seq.stages[2].cut, o.sii.centre.cut.value);
    // (the four cut at the record's instant, or where its depletion sensors cut them, when the run's propellant is spent)
    assert.equal(seq.stages[3].cut, o.sii.outboard.spent ? siiSpent(o) : o.sii.outboard.cut.value);
    assert.ok(seq.stages[4].orbit, 'the first burn cut by its guidance on the orbit reached');
    assert.equal(seq.stages[5].speed.value, o.sivb.second.speed.value, 'the injection cut on its speed');
    assert.equal(seq.stages[5].from, o.sivb.second.ignition.value);
    assert.equal(seq.stages[5].joint, null, 'the S-IVB is let go of by nothing: the run ends at its second cutoff');
    // (the drops: the aft interstage and the tower, each let go at the record's instant)
    assert.deepEqual(
      seq.drops.map((d) => [d.joint, d.at]),
      [
        ['sii-skirt', o.sii.skirt.at.value],
        ['les-jettison', o.les.at.value],
      ],
    );
    const law = guidanceOf(plan);
    assert.equal(law.injection.engine, 'sivb-tli');
    assert.equal(law.injection.target, o.sivb.second.target);
    assert.equal(law.target.at, 'sivb-cutoff');
    // nothing burns in the coast and nothing comes down: it is bound for the Moon, which pulls on it
    assert.equal(coastOf(plan).on, Number.POSITIVE_INFINITY);
    assert.equal(downOf(plan), null);
    assert.deepEqual(plan.gravity, { central: 'earth', terms: ['j2', 'moon'] });
    assert.equal(plan.record.bound, o.bound);
  });

  if (o.sii.outboard.spent)
    test(`${f.id}: the S-II's four are cut when the run has spent its propellant, and what follows that cutoff keeps the record's intervals`, () => {
      // the instant the simulator's own schedule finds the S-II's tank dry, with no cut of the four's own (siiSpent's figure)
      const open = structuredClone(plan);
      const cut = open.events.find((e) => e.id === 'sii-outboard-cutoff');
      cut.when = [{ time: o.sii.ignition.value + 3600 }];
      const i = stagesOf(open).findIndex((s) => s.engine.id === 'j2-outboard');
      const dry = schedule(open)[i];
      assert.ok(dry.dry, 'the tank runs dry');
      assert.ok(Math.abs(dry.to - siiSpent(o)) < 0.02, `siiSpent ${siiSpent(o)} s, the schedule's dry tank ${dry.to} s`);
      const t4 = siiSpent(o);
      const seq = sequenceOf(plan);
      assert.ok(Math.abs(seq.stages[3].sep - (t4 + o.sii.separation.value - o.sii.outboard.cut.value)) < 1e-9);
      assert.ok(Math.abs(seq.stages[4].from - (t4 + o.sivb.first.ignition.value - o.sii.outboard.cut.value)) < 1e-9);
      // (each instant the run's own, derived; the record's kept as a figure in its source, to hold the run to)
      const at = plan.events.find((e) => e.id === 'sii-outboard-cutoff').at;
      assert.equal(at.confidence, 'derived');
      assert.equal(at.value, t4);
      assert.ok(at.source.includes(String(o.sii.outboard.cut.value)));
      console.log(`  # ${f.id}: the S-II's four spent at ${t4.toFixed(2)} s, the record's cutoff at ${o.sii.outboard.cut.value} s`);
    });

  test(`${f.id}: the S-IVB's J-2 cannot be lit again while it burns, and is once it is cut`, () => {
    let s = startCraft(plan);
    s = act(plan, s, { ignite: 'sivb-j2' }, 600, false).state;
    const twice = act(plan, s, { ignite: 'sivb-tli' }, 650, false);
    assert.deepEqual(twice.refused, [{ action: { ignite: 'sivb-tli' }, why: 'burning', engine: 'sivb-j2' }]);
    s = act(plan, s, { cut: 'sivb-j2' }, 700, false).state;
    const again = act(plan, s, { ignite: 'sivb-tli' }, 9_000, false);
    assert.deepEqual(again.refused, []);
    assert.equal(act(plan, again.state, { ignite: 'sivb-j2' }, 9_100, false).refused[0].why, 'burning');
  });
}

/** The Saturn IB flights' records (saturn-ib-record.ts: `sib`), which saturn-ib-plan.ts writes the plan from. */
for (const f of orbital.filter((x) => 'sib' in recordFrom(x))) {
  const o = recordFrom(f);
  const plan = f.plan;
  const c = craftOf(plan);
  const at = (id) => byId(plan.events, id).at;
  test(`${f.id}: the Saturn IB plan carries the record's figures: eight H-1s, the J-2, the burns in orbit, the landing system`, () => {
    assert.deepEqual(problems(plan), []);
    assert.equal(c.mass, o.liftoff);
    assert.deepEqual(
      c.engines.filter((e) => e.body === 'sib' || e.body === 'sivb').map((e) => [e.id, e.count]),
      [
        ['h1-inboard', 4],
        ['h1-outboard', 4],
        ['sivb-j2', 1],
      ],
    );
    assert.equal(byId(c.engines, 'h1-outboard').thrust, o.sib.h1.thrust);
    assert.equal(byId(c.engines, 'sivb-j2').thrust.vacuum, o.sivb.j2.thrust);
    assert.equal(byId(c.engines, 'sps').thrust.vacuum, o.csm.sps.thrust);
    assert.equal(byId(c.tanks, 'sivb-propellant').load, o.sivb.propellant.load);
    // (the joints part where the record has them, and each event of the ascent is the record's instant)
    assert.equal(byId(c.joints, 'sib-separation').at, o.sib.separation);
    assert.equal(byId(c.joints, 'spacecraft-separation').at, o.csm.separation.at);
    assert.equal(byId(c.joints, 'cm-sm-separation').at, o.csm.modules.at);
    assert.equal(at('sivb-cutoff'), o.sivb.cutoff);
    assert.deepEqual(byId(plan.events, 'sivb-cutoff').when, [{ orbit: 'published' }]);
    // (each burn is lit in its own attitude, held to the record's impulse, and cut at its record's instant)
    for (const b of o.burns) {
      const lit = byId(plan.events, b.id);
      assert.equal(lit.at, b.on);
      assert.deepEqual(doing(lit), [`attitude:${b.aim.id}`, `ignite:${b.engine}`]);
      assert.equal(lit.do[1].flown, b.flown);
      assert.ok(plan.attitude.includes(b.aim));
      assert.equal(at(`${b.id}-cutoff`), b.off.at);
    }
    assert.equal(plan.target, o.target);
    assert.deepEqual(byId(plan.events, 'main-deployment').when, [{ height: o.els.mains.height.value, going: 'down' }]);
    const times = plan.events.map((e) => e.at.value);
    assert.deepEqual(
      times,
      [...times].sort((a, b) => a - b),
      'the events in order',
    );
  });
}

test('the plan says a Gemini: two stages on their own tanks, hot staging, translation thrusters, a lifting entry', () => {
  assert.deepEqual(problems(gemini), []);
});

test('a plan that names what is not there says so', () => {
  const broken = structuredClone(gemini);
  const c = broken.craft[0];
  c.engines[1].tanks.push('third-ox');
  c.joints.push({ ...c.joints[0] });
  broken.events.push({ id: 'nowhere', label: 'x', when: [{ after: 'never' }], do: [{ deploy: 'drogue' }], automatic: true, source: 'x' });
  broken.events.find((e) => e.id === 'translate').do = [];
  const said = problems(broken);
  assert.ok(said.some((s) => s.includes("'third-ox'")));
  assert.ok(said.some((s) => s.includes("joint 'staging' is named twice")));
  assert.ok(said.some((s) => s.includes("event 'never'")));
  assert.ok(said.some((s) => s.includes("chute 'drogue'")));
  assert.ok(said.some((s) => s.includes('nothing arms it')));
});

// GATV-5004's Agena never lit, and its record's insertion was written from a cutoff it never had: an instant with no
// value, which flew the coast from the published orbit from no time at all and threw in the day's air (`pnpm figures`,
// November 2026). A figure that is not a number is said here, wherever in the plan it is.
test('a figure that is not a number is a problem, wherever it is in the plan', () => {
  for (const bad of [undefined, Number.NaN, '12']) {
    const broken = structuredClone(gemini);
    broken.craft[0].mass.value = bad;
    broken.craft[0].joints[0].push = { value: bad, confidence: 'documented', source: 'x' };
    const said = problems(broken);
    assert.ok(
      said.some((s) => s.includes('plan.craft[0].mass is not a number')),
      `${String(bad)}: ${said.join('; ')}`,
    );
    assert.ok(said.some((s) => s.includes('craft[0].joints[0].push is not a number')));
  }
  // (an instant that never comes is a number)
  const never = structuredClone(gemini);
  never.craft[0].joints[0].push = { value: Infinity, confidence: 'documented', source: 'x' };
  assert.deepEqual(problems(never), []);
});

/** The Gemini targets' records (target-plan.ts: `payload`): the Mercury flights' Atlas, and what it carried. */
for (const f of orbital.filter((x) => 'payload' in recordFrom(x))) {
  const o = recordFrom(f);
  const c = craftOf(f.plan);
  test(`${f.id}: the target's plan carries its record: the Atlas, its verniers alone, and what it carried`, () => {
    assert.equal(c.mass, o.liftoffMass);
    assert.equal(byId(c.bodies, 'atlas-booster-section').mass, o.atlas.booster.mass);
    assert.equal(byId(c.tanks, 'atlas-propellant').load, o.atlas.tank.propellant);
    assert.equal(byId(c.engines, 'verniers').thrust.vacuum, o.atlas.verniers.engine.thrust.vacuum);
    const payload = c.bodies.at(-1);
    assert.equal(payload.id, o.payload.id);
    assert.equal(payload.mass, o.payload.mass);
    assert.equal(byId(c.joints, 'target-separation').at, o.separation.at);
    // (no braking burn and no parachutes: a target stays up, or falls)
    assert.ok(!c.engines.some((e) => e.flown));
    assert.equal(c.chutes.length, 0);
    const engine = byId(c.engines, 'agena-engine');
    assert.equal(Boolean(engine), Boolean(o.payload.engine), 'the Agena’s engine where it was lit');
    if (engine) {
      const cut = f.plan.events.find((e) => e.do.some((a) => a.cut === 'agena-engine'));
      assert.equal(
        cut.when.find((w) => 'speed' in w)?.speed,
        o.payload.engine.speed?.value,
        'cut at the planned speed, where it reached it',
      );
    }
    assert.equal(Boolean(f.plan.planned), Boolean(o.planned), 'a failed flight carries its plan as planned');
  });
}
