// One state through every simulator's push: the predictor's fliers (src/sim/fliers.ts) and the simulators they stand for
// push a point by the same air (src/sim/air.ts airAt), the same drag (airDrag), the same thrust (src/sim/thrust.ts) and the
// same gravity (world/orbit.ts), so at one state they agree to rounding: a part in 10^12 of the push.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { flight as freedom7 } from '../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import { flight as vostok1 } from '../missions/ussr/vostok/flights/vostok-1/flight.ts';
import { airAt, airDrag } from '../src/sim/air.ts';
import { ballistic, spacecraft, stack } from '../src/sim/fliers.ts';
import { dragArea, thrustIn } from '../src/sim/fly.ts';
import { shipPush } from '../src/sim/orbital.ts';
import { planOfOrbital } from '../src/sim/planof.ts';
import { stackOf } from '../src/sim/staged.ts';
import { nozzleThrust, vacuumOf } from '../src/sim/thrust.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { geodeticToEcef, length, scale, siteFrame, sub } from '../src/world/frames.ts';

/** Two pushes the same to a part in 10^12 of the larger. */
const same = (a, b, what) => {
  const off = length(sub(a, b));
  assert.ok(off <= 1e-12 * Math.max(length(a), length(b)), `${what}: ${off} m/s^2 apart of ${length(a)}`);
};

/** A state 40 km over a place, moving 2 km/s east and 1 km/s down through the turning air. */
function stateOver(frame, place, t) {
  const p = geodeticToEcef({ ...place, height: 40_000 });
  const up = scale(p, 1 / length(p));
  const east = [-Math.sin((place.longitude * Math.PI) / 180), Math.cos((place.longitude * Math.PI) / 180), 0];
  const ground = [2000 * east[0] - 1000 * up[0], 2000 * east[1] - 1000 * up[1], 2000 * east[2] - 1000 * up[2]];
  return { t, r: frame.toInertial(p, t), v: frame.velocityToInertial(p, ground, t) };
}

test('a ballistic flight: the predictor’s flier is the simulator’s air, drag and thrust', () => {
  const tr = { ...freedom7.trajectory, winds: undefined };
  const site = siteFrame(freedom7.site);
  const sea = freedom7.site.seaLevel.value;
  const frame = frameOf(freedom7);
  const s = stateOver(frame, site, 100);
  const air = airAt(frame, s.r, s.v, s.t, sea);
  // the stack going up, coasting: drag on the ascent's curve over the mass
  const coasting = ballistic(tr, site, sea, { ...s, mass: 5000, phase: 'coast' }, { frame });
  same(
    coasting.push(s.t, s.r, s.v, air.altitude),
    scale(airDrag(air.wind, air.airspeed, air.air.density, dragArea(tr, true, air.mach)), 1 / 5000),
    'the stack coasting',
  );
  // the spacecraft alone: the entry's curve
  const alone = ballistic(tr, site, sea, { ...s, mass: 1300, phase: 'capsule' }, { frame });
  same(
    alone.push(s.t, s.r, s.v, air.altitude),
    scale(airDrag(air.wind, air.airspeed, air.air.density, dragArea(tr, false, air.mach)), 1 / 1300),
    'the spacecraft alone',
  );
  // and burning: the one law of thrust along the axis given
  const axis = scale(s.r, 1 / length(s.r));
  const burning = ballistic(tr, site, sea, { ...s, mass: 20_000, phase: 'powered' }, { frame, burn: { axis: () => axis, until: 140 } });
  const thrust = nozzleThrust(1, vacuumOf(tr.engine).value, 1, tr.engine.exitArea.value, air.air.pressure);
  assert.ok(Math.abs(thrustIn(tr, air.air.pressure) - thrust) <= 1e-9, 'fly.ts thrustIn is thrust.ts');
  same(
    burning.push(s.t, s.r, s.v, air.altitude),
    scale(
      [
        airDrag(air.wind, air.airspeed, air.air.density, dragArea(tr, true, air.mach))[0] + axis[0] * thrust,
        airDrag(air.wind, air.airspeed, air.air.density, dragArea(tr, true, air.mach))[1] + axis[1] * thrust,
        airDrag(air.wind, air.airspeed, air.air.density, dragArea(tr, true, air.mach))[2] + axis[2] * thrust,
      ],
      1 / 20_000,
    ),
    'the stack burning',
  );
});

test('a flight into orbit: the spacecraft’s and the stopped stack’s fliers are the coast’s and the ascent’s air and drag', () => {
  const o = vostok1.orbital;
  const site = siteFrame(vostok1.site);
  const sea = vostok1.site.seaLevel.value;
  const frame = frameOf(vostok1);
  const s = stateOver(frame, site, 300);
  const air = airAt(frame, s.r, s.v, s.t, sea);
  // the spacecraft alone, its engine not lit: the coast's own push (orbital.ts shipPush, which flyOrbit flies)
  const ship = spacecraft(o, frame, site, sea, s);
  same(ship.push(s.t, s.r, s.v, air.altitude), shipPush(o, s.t, air.wind, air.altitude, null), 'the spacecraft');
  // the stack with its engines stopped: the ascent's drag area for the shape it has, over its mass
  const gone = o.stages[0].separation.value;
  const stopped = stack(o, site, sea, 30_000, gone);
  same(
    stopped.push(s.t, s.r, s.v, air.altitude),
    scale(airDrag(air.wind, air.airspeed, air.air.density, stackOf(planOfOrbital(o)).dragArea(gone, air.mach)), 1 / 30_000),
    'the stopped stack',
  );
});
