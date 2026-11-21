// The lunar module as a craft of its own (missions/usa/apollo/vehicles/lm-plan.ts, from Apollo 11's record) and its legs on
// the ground (src/sim/surface.ts): the descent engine's lever with its fixed full-throttle position and its specific impulse
// by setting; the ascent engine fired into the descent stage while they are joined, and the Abort Stage's one command; the
// contact light at the probe's length; the struts' stroke against the energy a touchdown brings; tip-over as the rigid body
// on its pads; a hover held by a hand on the throttle; and a landed lunar module held where it stands, turning with the Moon.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { eagle } from '../missions/usa/apollo/flights/apollo-11/lm.ts';
import { flights } from '../missions/index.ts';
import { DPS_THRUST, lmPlan } from '../missions/usa/apollo/vehicles/lm-plan.ts';
import { attitudeOf, attitudeStart, errorOf } from '../src/sim/attitude.ts';
import { act, startCraft } from '../src/sim/craft.ts';
import { craftEngines, craftVehicle, flowOf } from '../src/sim/craftlive.ts';
import { handRange, Lever, onLever } from '../src/sim/lever.ts';
import { problems } from '../src/sim/plan.ts';
import { aboutAxis, multiply, turn } from '../src/sim/rigid.ts';
import { hotStage } from '../src/sim/staging.ts';
import {
  energyOf,
  gearOf,
  landerBody,
  landerStart,
  moonFixed,
  planeGround,
  bodyGround,
  pointField,
  sphereGround,
  stepLander,
  stepWithJets,
} from '../src/sim/surface.ts';
import { TICK } from '../src/sim/vehicle.ts';
import { horizontalAllowed, landingVerdict } from '../src/sim/verdict.ts';
import { fieldFor } from '../src/sim/core/gravity.ts';
import { G0, MOON } from '../src/world/bodies.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { add, cross, DEG, dot, length, scale, sub, unit } from '../src/world/frames.ts';

const plan = lmPlan(eagle);
const gear = gearOf(plan.craft[0].gear);
const body = landerBody(plan);
const GM = MOON.gm.value;
const R = MOON.equatorialRadius.value;
const field = pointField(GM);
const LB = 0.45359237;
const IN = 0.0254;
const LANDED = eagle.landed.mass.value;
const apollo11 = flights.find((f) => f.id === 'usa/apollo/apollo-11');
/** The Moon's pull at its sphere, m/s^2. */
const g = GM / R ** 2;

/** Upright over the north pole of a sphere: body +X along the local vertical (+Z), its +Z forward along the frame's +X. */
const UPRIGHT = [Math.SQRT1_2, 0, -Math.SQRT1_2, 0];

test('the lunar module’s plan holds: two stages, the staging joint over the ascent engine, sixteen thrusters on two systems, four legs', () => {
  assert.deepEqual(problems(plan), []);
  const a = attitudeOf(plan);
  assert.ok(a, 'its thrusters as hardware');
  assert.equal(new Set(a.jets.map((j) => j.name)).size, 16);
  assert.equal(a.jets.length, 24, 'the eight firing up or down are listed for pitch and for the turn about Z');
  assert.deepEqual(
    a.supplies.map((s) => Math.round(s.full / LB)),
    [317, 317],
    'each system as Apollo 11 loaded it',
  );
  // (pitch: four thrusters whose turns about Z and pushes along X cancel)
  for (const [axis, sense] of [
    [1, 1],
    [1, -1],
    [2, 1],
    [0, 1],
  ]) {
    const set = a.jets.filter((j) => j.axis === axis && j.sense === sense);
    assert.equal(set.length, 4, `${axis} ${sense}`);
    const torque = set.reduce((s, j) => add(s, j.torque), [0, 0, 0]);
    for (let i = 0; i < 3; i++) if (i !== axis) assert.ok(Math.abs(torque[i]) < 0.05 * Math.abs(torque[axis]), `coupling ${i} of ${axis}`);
  }
  const masses = plan.craft[0].bodies.reduce((s, b) => s + b.mass.value, 0);
  assert.ok(Math.abs(masses - plan.craft[0].mass.value) < 1e-6, 'the two stages sum to the lunar module at separation');
  assert.equal(gear.legs.length, 4);
  assert.deepEqual(
    gear.legs.filter((l) => l.probe > 0).map((l) => l.id),
    ['right', 'aft', 'left'],
    'no probe on the forward leg, from LM-5 on',
  );
});

test('the descent engine’s lever: 10 to 65 per cent, and past 65 its full throttle position, 92.5', () => {
  const dps = plan.craft[0].engines.find((e) => e.id === 'dps');
  const r = handRange(dps);
  assert.equal(r.least, 0.1);
  assert.equal(r.most, 0.925);
  assert.equal(r.top, 0.65);
  assert.equal(onLever(r, 0.4), 0.4);
  assert.equal(onLever(r, 0.65), 0.65);
  assert.equal(onLever(r, 0.7), 0.925, 'a command above 65 per cent is full throttle');
  assert.equal(onLever(r, 0.05), 0.1);
  const lever = new Lever(r);
  assert.equal(lever.at, 0.925);
  lever.notch(-1);
  assert.equal(lever.at, 0.65, 'down from full throttle the lever goes to the range’s top');
  lever.notch(1);
  assert.equal(lever.at, 0.925, 'and up into the gap, back to full throttle');
  // (the one machine holds the same rule)
  const s = act(plan, startCraft(plan), { throttle: 'dps', to: 0.8 }, 0, false).state;
  assert.equal(s.engines.dps.throttle, 0.925);
});

/** Apollo 11's frame, and a state in a circular lunar orbit `height` m up at `t`, s from liftoff. */
const frame = frameOf(apollo11);
const lunar = fieldFor(plan.gravity, frame);
function inOrbit(t, height) {
  const m = lunar.moon(t);
  const up = unit(m.r);
  const along = unit(cross(up, [0, 0, 1]));
  const speed = Math.sqrt(GM / (R + height));
  return { r: add(m.r, scale(up, R + height)), v: add(m.v, scale(along, speed)), axis: scale(along, -1) };
}
const T0 = 100.5 * 3600;
const tanks = { 'dps-propellant': eagle.dps.usable.value, 'aps-propellant': eagle.aps.usable.value };
const starts = { dps: 10, aps: 10 };

test('the descent engine flown live: what it draws at each setting is its thrust over g0 times R-567’s specific impulse there', () => {
  const v = craftVehicle(plan, frame, 0, { engines: ['dps', 'aps'] });
  const o = inOrbit(T0, 15_000);
  let s = v.start({ t: T0, r: o.r, v: o.v, mass: plan.craft[0].mass.value, tanks, starts, axis: o.axis });
  s = v.tick(s, { axis: o.axis, light: ['dps'], lever: 0.4 });
  assert.ok(v.burning(s, 'dps'));
  const before = s.tanks['dps-propellant'];
  const n = 640;
  for (let i = 0; i < n; i++) s = v.tick(s, { axis: o.axis });
  const drawn = before - s.tanks['dps-propellant'];
  // (R-567's table: 293.6 s at 0.252, 295.0 at 0.401)
  const isp = 293.6 + ((0.4 - 0.252) / (0.401 - 0.252)) * 1.4;
  const want = ((0.4 * DPS_THRUST.value) / (G0 * isp)) * n * TICK;
  assert.ok(Math.abs(drawn - want) / want < 1e-9, `${drawn} kg against ${want}`);
  // past 65 per cent: full throttle, at its 303 s
  s = v.tick(s, { axis: o.axis, lever: 0.8 });
  assert.equal(v.share(s, 'dps'), 0.925);
  const [e] = craftEngines(plan, ['dps']);
  assert.ok(Math.abs(flowOf(e, 0.925) - (0.925 * DPS_THRUST.value) / (G0 * 303)) < 1e-9);
  console.log(
    `# the descent engine at 40 per cent: ${(drawn / (n * TICK)).toFixed(3)} kg/s; at full throttle ${flowOf(e, 0.925).toFixed(3)} kg/s`,
  );
});

test('fire in the hole: the ascent engine lit on the descent stage pushes only what escapes the joint, and past what the deck stands the craft breaks up', () => {
  const v = craftVehicle(plan, frame, 0, { engines: ['dps', 'aps'] });
  const o = inOrbit(T0, 15_000);
  const m0 = plan.craft[0].mass.value;
  let s = v.start({ t: T0, r: o.r, v: o.v, mass: m0, tanks, starts, axis: o.axis });
  const free = v.tick(s, { axis: o.axis });
  s = v.tick(s, { axis: o.axis, light: ['aps'] });
  assert.ok(v.burning(s, 'aps'));
  const hot = plan.craft[0].joints[0].hot;
  // (the push the tick gave, beyond gravity's: the engine's thrust times the share that escapes, over the mass)
  const gained = length(sub(s.v, free.v));
  const want = ((15_568.8 * hotStage(hot)) / m0) * TICK;
  assert.ok(Math.abs(gained - want) / want < 1e-3, `${gained} against ${want} m/s`);
  const lit = s.burns[0].on;
  for (let i = 0; i < 200 && !s.broke; i++) s = v.tick(s, { axis: o.axis });
  assert.ok(s.broke, 'it broke up');
  assert.ok(Math.abs(s.broke.t - lit - hot.endures.value) < 1e-6, `after ${(s.broke.t - lit).toFixed(4)} s at full thrust`);
  assert.ok(!v.burning(s, 'aps'));
  console.log(
    `# fire in the hole: ${(hotStage(hot) * 100).toFixed(1)} per cent of the ascent engine pushes; broke up ${(s.broke.t - lit).toFixed(3)} s after it lit`,
  );
});

test('Abort Stage: one command parts the stages at 0.447 s and lights the ascent engine at 0.687 s; the descent stage leaves with what it has left', () => {
  const v = craftVehicle(plan, frame, 0, { engines: ['dps', 'aps'] });
  const o = inOrbit(T0, 15_000);
  let s = v.start({ t: T0, r: o.r, v: o.v, mass: plan.craft[0].mass.value, tanks, starts, axis: o.axis });
  const second = Math.round(1 / TICK);
  s = v.tick(s, { axis: o.axis, light: ['dps'], lever: 0.5 });
  for (let i = 0; i < second; i++) s = v.tick(s, { axis: o.axis });
  const at = s.t;
  s = v.tick(s, { axis: o.axis, stage: ['staging'] });
  for (let i = 0; i < second; i++) s = v.tick(s, { axis: o.axis });
  assert.ok(Math.abs(s.parts.joints.staging.gone - (at + 0.447)) < 1e-9, 'parted 0.447 s after the command');
  assert.equal(s.parts.bodies.descent, s.parts.joints.staging.gone);
  const dps = s.burns.find((b) => b.engine === 'dps');
  assert.equal(dps.ended, 'gone');
  const aps = s.burns.find((b) => b.engine === 'aps');
  assert.ok(Math.abs(aps.on - (at + 0.687)) < 1e-9, 'the ascent engine lit 0.687 s after it');
  assert.equal(s.broke, null);
  assert.equal(s.scorch.aps ?? 0, 0, 'lit after the parting, it fired into nothing');
  // (the ascent stage alone: its mass at separation less what its engine has drawn since it lit)
  const apsDrawn = eagle.aps.usable.value - s.tanks['aps-propellant'];
  assert.ok(Math.abs(s.mass - (eagle.ascent.value - apsDrawn)) < 1e-6, `${s.mass} kg`);
  assert.equal(s.tanks['dps-propellant'], undefined);
});

/**
 * A lander upright over the north pole of the ground, its lowest footpad `h` m over the ground under it, coming down at
 * `down` m/s and across at `across` (along +X of the frame).
 */
function dropped(ground, h, down, across = 0, mass = LANDED, q = UPRIGHT) {
  const { centre } = body(mass);
  const base = ground.at([0, 0, 1]).height + R;
  let p = [0, 0, base + (centre[0] - gear.legs[0].pad[0])];
  // (raised until every footpad clears the ground under it by `h`)
  const clear = () =>
    Math.min(
      ...gear.legs.map((l) => {
        const x = add(p, turn(q, sub(l.pad, centre)));
        return length(x) - (R + ground.at(x).height);
      }),
    );
  for (let i = 0; i < 4; i++) p = add(p, [0, 0, h - clear()]);
  return landerStart(0, p, [across, 0, -down], q, [0, 0, 0], mass, gear);
}
const idle = { thrust: 0, flow: 0, torque: [0, 0, 0] };
const fly = (ground, s, seconds, push = idle) => {
  for (let i = 0; i < Math.round(seconds / TICK) && !s.landed && !Number.isFinite(s.toppled); i++)
    s = stepLander(gear, ground, body, field, s, push, TICK);
  return s;
};

test('the contact light: lit as a probe’s tip reaches the ground, the footpads 5.6 ft over it', () => {
  const ground = sphereGround(R, -1200);
  let s = dropped(ground, 10, 1);
  const { centre } = body(LANDED);
  let lampAt = null;
  for (let i = 0; i < 2000 && !Number.isFinite(s.lamp); i++) s = stepLander(gear, ground, body, field, s, idle, TICK);
  assert.ok(Number.isFinite(s.lamp), 'lit');
  // (where the pads were at the instant it lit: back from the step's end along its motion)
  const back = s.t - s.lamp;
  const pads = length(sub(s.p, scale(s.u, back))) - (R - 1200) - (centre[0] - gear.legs[0].pad[0]);
  lampAt = pads;
  assert.ok(Math.abs(lampAt - 5.6 * 0.3048) < 2e-3, `the footpads ${lampAt.toFixed(4)} m up as it lit`);
  console.log(`# the lunar contact light lit with the footpads ${lampAt.toFixed(3)} m over the ground (5.6 ft = 1.707 m)`);
});

test('a touchdown just inside the gear’s 10 ft/s: what the struts crush takes the energy it brought, and they stroke as their loads say', () => {
  const ground = sphereGround(R, -1200);
  const v0 = 9.9 * 0.3048;
  let s = dropped(ground, 0.01, v0);
  const { inertia } = body(LANDED);
  const e0 = energyOf(s, inertia, g, R);
  s = fly(ground, s, 10);
  assert.ok(s.landed, 'it came to rest');
  assert.ok(!Number.isFinite(s.toppled));
  const e1 = energyOf(s, inertia, g, R);
  const brought = e0 - e1;
  // (all of it is somewhere: crushed, taken by the legs' damping, or held in their springs)
  const accounted = s.crushed + s.damped + s.stored;
  assert.ok(
    Math.abs(accounted - brought) / brought < 0.02,
    `${(accounted / 1000).toFixed(2)} kJ of ${(brought / 1000).toFixed(2)} kJ accounted for`,
  );
  assert.ok(s.crushed > 0.75 * brought, `crushed ${(s.crushed / 1000).toFixed(1)} kJ of ${(brought / 1000).toFixed(1)} kJ`);
  // (the stroke the struts' loads give: four struts at 4,500 lb for 10 in, then 9,500 lb, against what they crushed of the
  // kinetic energy and the fall over the stroke, each strut 27.4 degrees off the vertical: its stroke goes up it)
  const along = gear.legs[0].strut[0];
  const w = LANDED * g * along;
  const [first, second] = gear.legs[0].crush;
  const k = 0.5 * LANDED * v0 ** 2 * (s.crushed / brought);
  const s1 = first.until;
  const left = k - (4 * first.load - w) * s1;
  const want = left > 0 ? s1 + left / (4 * second.load - w) : k / (4 * first.load - w);
  for (const x of s.strokes)
    assert.ok(Math.abs(x - want) / want < 0.05, `stroke ${(x / IN).toFixed(1)} in against ${(want / IN).toFixed(1)} in`);
  assert.equal(s.bottomed, null);
  const verdict = landingVerdict(s, gear.limits);
  assert.equal(verdict.survivable, true, verdict.why.join(' '));
  console.log(
    `# at 9.9 ft/s: strokes ${s.strokes.map((x) => (x / IN).toFixed(1)).join(', ')} in (the loads give ${(want / IN).toFixed(1)}); crushed ${(s.crushed / 1000).toFixed(1)}, damped ${(s.damped / 1000).toFixed(1)} of ${(brought / 1000).toFixed(1)} kJ`,
  );
});

test('tip-over is the rigid body on its pads: held on a slope past the angle its pads stand it on, it goes over; on the gear’s 12° it stands', () => {
  // (the footpads held where they touch, as the stability analysis's constrained footpads: friction that does not let them slide)
  const held = { ...gear, friction: 2 };
  const { centre } = body(LANDED);
  // the static tip angle down a diagonal, between two legs: the centre of mass over the line between their pads
  const reach = (gear.legs[0].pad[2] ** 2 / 2) ** 0.5;
  const tip = Math.atan(reach / (centre[0] - gear.legs[0].pad[0])) / DEG;
  const on = (slope) => {
    const ground = planeGround(R, { latitude: 90, longitude: 0 }, -1200, slope, 45);
    let s = dropped(ground, 0.05, 0.5);
    for (let i = 0; i < Math.round(30 / TICK) && !s.landed && !Number.isFinite(s.toppled); i++)
      s = stepLander(held, ground, body, field, s, idle, TICK);
    return s;
  };
  const steep = on(tip + 5);
  assert.ok(Number.isFinite(steep.toppled), `on ${(tip + 5).toFixed(1)}°: toppled`);
  const verdict = landingVerdict(steep, gear.limits);
  assert.equal(verdict.survivable, false);
  assert.ok(
    verdict.why.some((w) => w.includes('sloped')),
    verdict.why.join(' '),
  );
  const twelve = on(12);
  assert.ok(twelve.landed && !Number.isFinite(twelve.toppled), 'on 12°: it stands');
  console.log(
    `# the static tip angle down the diagonal: ${tip.toFixed(1)}°; on ${(tip + 5).toFixed(1)}° it toppled, on 12° it stood ${twelve.landed.tilt.toFixed(1)}° off the vertical`,
  );
});

test('the envelope: the horizontal speed allowed falls from 4 ft/s at 7 ft/s down to none at 10', () => {
  const ft = 0.3048;
  assert.equal(horizontalAllowed(gear.limits, 5 * ft), 4 * ft);
  assert.ok(Math.abs(horizontalAllowed(gear.limits, 8.5 * ft) - 2 * ft) < 1e-12);
  assert.equal(horizontalAllowed(gear.limits, 10 * ft), 0);
});

test('a hover held by a hand on the throttle: the lever at the lunar module’s weight, inside the descent engine’s range', () => {
  const ground = sphereGround(R, -1200);
  const [dps] = craftEngines(plan, ['dps']);
  const range = handRange(dps.def);
  let s = dropped(ground, 30, 1);
  let sum = 0;
  let count = 0;
  let drawn = 0;
  let worst = 0;
  for (let i = 0; i < Math.round(90 / TICK); i++) {
    const up = unit(s.p);
    const climb = dot(s.u, up);
    // (a pilot's hand: the lever for the weight, and more or less as it sinks or climbs, a notch's worth at a time)
    const weight = (s.mass * length(field.gravity(s.p))) / dps.thrust;
    const lever = Math.round((weight - 0.5 * climb * (s.mass / dps.thrust)) / 0.005) * 0.005;
    const share = onLever(range, lever);
    const push = { thrust: dps.thrust * share, flow: flowOf(dps, share), torque: [0, 0, 0] };
    s = stepLander(gear, ground, body, field, s, push, TICK);
    drawn += push.flow * TICK;
    if (s.t > 30) {
      sum += share;
      count += 1;
      worst = Math.max(worst, Math.abs(climb));
    }
  }
  const mean = sum / count;
  const weight = (s.mass * g) / dps.thrust;
  assert.ok(Math.abs(mean - weight) < 0.01, `the lever at ${(mean * 100).toFixed(1)} per cent, the weight ${(weight * 100).toFixed(1)}`);
  assert.ok(mean > range.least && mean < range.top, 'within the throttling range');
  assert.ok(worst < 0.3, `its climb or sink held within ${worst.toFixed(3)} m/s`);
  assert.equal(s.touch, null, 'it never touched');
  assert.ok(Math.abs(LANDED - drawn - s.mass) < 1e-6, 'what it drew is what it lost');
  console.log(
    `# the hover: the lever at ${(mean * 100).toFixed(1)} per cent for ${(s.mass / LB).toFixed(0)} lb (Apollo 11's hover about 26, TN D-7143 fig. 18)`,
  );
});

test('landed, it is held where it stands on the Moon, turning with it: the state an ascent starts from', () => {
  const fixed = moonFixed(frame, lunar.moon);
  const ground = sphereGround(R, -1200);
  let s = fly(ground, dropped(ground, 0.02, 0.5), 20);
  assert.ok(s.landed);
  // (where it stands taken round the Moon's level sphere to its equator, where its turn carries it fastest)
  const round = aboutAxis([0, 1, 0], Math.PI / 2);
  const p = turn(round, s.landed.p);
  const q = multiply(round, s.landed.q);
  const at = (t) => fixed.toFlight(p, [0, 0, 0], q, t);
  const t0 = T0 + 2 * 3600;
  const a = at(t0);
  const b = at(t0 + 3600);
  for (const x of [a, b]) {
    const m = lunar.moon(x === a ? t0 : t0 + 3600);
    assert.ok(Math.abs(length(sub(x.r, m.r)) - length(p)) < 1e-3, 'at its distance from the Moon’s centre');
    // (carried round by the Moon's turn, 2.66e-6 rad/s: 4.6 m/s at its equator)
    const over = length(sub(x.v, m.v));
    assert.ok(Math.abs(over - 2.6617e-6 * length(p)) < 0.01, `${over.toFixed(3)} m/s`);
  }
  assert.ok(length(sub(sub(b.r, lunar.moon(t0 + 3600).r), sub(a.r, lunar.moon(t0).r))) > 10_000, 'an hour on it has turned with the Moon');
  // and back: the flight's state taken to the Moon's frame is where it stands
  const back = fixed.toFixed(b.r, b.v, b.q, t0 + 3600);
  assert.ok(length(sub(back.p, p)) < 1e-6);
  assert.ok(length(back.u) < 1e-6);
  // a push over its weight lets it go again
  const { centre: _ } = body(s.mass);
  const lift = stepLander(gear, ground, body, field, s, { thrust: 2 * s.mass * g, flow: 0, torque: [0, 0, 0] }, TICK);
  assert.equal(lift.landed, null);
  const stays = stepLander(gear, ground, body, field, s, { thrust: 0.5 * s.mass * g, flow: 0, torque: [0, 0, 0] }, TICK);
  assert.ok(stays.landed);
});

test('Hold in the hover: the autopilot works the lunar module’s jets against a turn begun, on its gas, with its legs and its engine', () => {
  const ground = sphereGround(R, -1200);
  const a = attitudeOf(plan);
  const [dps] = craftEngines(plan, ['dps']);
  let s = dropped(ground, 30, 0);
  s = { ...s, w: [0, 3 * DEG, 0] };
  let att = attitudeStart(a, s.t, s.q, s.w);
  for (let i = 0; i < Math.round(20 / TICK); i++) {
    const share = (s.mass * length(field.gravity(s.p))) / dps.thrust;
    const r = stepWithJets(
      gear,
      ground,
      body,
      field,
      a,
      s,
      att,
      { hold: true, stick: [0, 0, 0], mass: s.mass },
      { thrust: dps.thrust * share, flow: flowOf(dps, share) },
      TICK,
    );
    s = r.lander;
    att = r.att;
  }
  assert.ok(Math.abs(s.w[1]) < 0.5 * DEG, `pitch rate ${(s.w[1] / DEG).toFixed(3)} deg/s`);
  const off = length(errorOf(att)) / DEG;
  assert.ok(off < 2, `${off.toFixed(2)}° off what it holds`);
  const used = a.supplies.reduce((sum, x) => sum + x.full, 0) - att.left.reduce((sum, x) => sum + x, 0);
  assert.ok(used > 0, 'it drew on its systems');
  assert.equal(s.touch, null);
  console.log(
    `# Hold in the hover: a 3 deg/s pitch taken out, ${off.toFixed(2)}° off what it holds after 20 s, ${used.toFixed(2)} kg of the systems' propellant`,
  );
});

test('a landing site’s ground as the legs meet it: its height by latitude and longitude, its normal from its slope', () => {
  // (a site's ground rising 1 m in 10 to the east, as a world/lunar-ground.ts BodyGround is asked)
  const [lat0, lon0] = [0.67, 23.47];
  const site = { covers: () => true, height: (lat, lon) => 0.1 * R * (lon - lon0) * DEG * Math.cos(lat * DEG) - 1900 };
  const ground = bodyGround(site, R);
  const p = [Math.cos(lat0 * DEG) * Math.cos(lon0 * DEG), Math.cos(lat0 * DEG) * Math.sin(lon0 * DEG), Math.sin(lat0 * DEG)];
  const { height, normal } = ground.at(scale(p, R));
  assert.ok(Math.abs(height + 1900) < 1e-6);
  const tilt = Math.acos(dot(normal, p)) / DEG;
  assert.ok(Math.abs(tilt - Math.atan(0.1) / DEG) < 0.01, `${tilt.toFixed(3)}°`);
  const east = [-Math.sin(lon0 * DEG), Math.cos(lon0 * DEG), 0];
  assert.ok(dot(normal, east) < 0, 'leaning away from the rise');
});
