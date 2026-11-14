/**
 * The vehicles the one propagator (sim/predict.ts `propagate`) flies, each as a `Flier`: what pushes it at a state, what
 * it is scheduled to do and what it does by itself on the way down. Each is made from the vehicle's own description and
 * its state as the simulator holds it, and pushes with the force functions its own simulator calls; the propagator adds
 * gravity, steps them all alike and finds the marks.
 *
 *   ballistic   a ballistic flight's vehicle (a `Trajectory`: Freedom 7's Redstone and capsule) from any instant: the
 *               engine burning on a given axis to a given cutoff, or not; the stack's drag going up and the capsule's
 *               heat shield first once it is alone and falling (fly.ts `dragArea`), through the day's wind (forces.ts
 *               `blowing`); what its sequencer will do (separation and its push, the retrorockets as fly.ts fires them,
 *               the pack); its parachutes at their heights, filling (`chuteArea`) and torn as vehicle.ts tears them.
 *
 * What differs between them is the vehicles', not the predictor's: each is a point mass at its centre of mass whose
 * forces are its own simulator's, with the attitude those forces need prescribed (along the programme, against the
 * motion, heat shield first). Where a live vehicle is a rigid body (vehicle.ts: the Redstone's moments, its autopilot's
 * lag behind its programme, under a degree) the prediction holds the attitude its guidance asks for.
 */
import type { Trajectory } from '../types';
import { EARTH_ROTATION_RATE } from '../world/bodies.ts';
import {
  add,
  cross,
  dot,
  ecefToGeodetic,
  type Geodetic,
  geodeticToEcef,
  inertialToEcef,
  length,
  scale,
  sub,
  unit,
  type Vec3,
} from '../world/frames.ts';
import { AIR_TOP, atmosphere } from './atmosphere.ts';
import { chuteArea, dragArea, G0, thrustIn } from './fly.ts';
import { blowing, blowOf, upAt } from './forces.ts';
import type { Arrival, Burn, EventKind, Flier, Sequence, Start } from './predict.ts';

const SPIN: Vec3 = [0, 0, EARTH_ROTATION_RATE];

/** The ground's height above the sea under a place (vehicle.ts's): the pad's own level within a kilometre of it, the sea beyond. */
export function floorOf(site: Geodetic, seaLevel: number): (here: Geodetic) => number {
  const pad = geodeticToEcef(site);
  const padHeight = site.height - seaLevel;
  return (here) =>
    padHeight !== 0 && length(sub(geodeticToEcef({ latitude: here.latitude, longitude: here.longitude, height: site.height }), pad)) < 1000
      ? padHeight
      : 0;
}

/** The next of a list of instants after `t`, in order (Infinity: none). */
const after = (marks: readonly number[], t: number): number => {
  for (const m of marks) if (m > t + 1e-9) return m;
  return Infinity;
};

export interface BallisticOptions {
  /** The engine burning on to its cutoff along the axis given. */
  burn?: Burn;
  /** What the sequencer does from here: without it, nothing but the parachutes of a spacecraft alone. */
  sequence?: Sequence;
}

/** A ballistic flight's vehicle from `start`, as its live simulator has it (above). `site` and `seaLevel` as fly.ts's. */
export function ballistic(tr: Trajectory, site: Geodetic, seaLevel: number, start: Start, options: BallisticOptions = {}): Flier {
  const blow = blowOf(tr.winds);
  const burn = options.burn && start.t < options.burn.until ? options.burn : null;
  const flow = tr.engine.thrust.value / (G0 * tr.engine.isp.value);
  const floor = floorOf(site, seaLevel);

  // what the sequencer does from here: each instant at or after the start (one that is late happens at once)
  const seq = options.sequence ?? null;
  const chutes = seq?.chutes ?? true;
  const ahead = (x: number | undefined): number | null => (x !== undefined && Number.isFinite(x) ? Math.max(x, start.t) : null);
  const towerAt = ahead(seq?.tower);
  const separationAt = ahead(seq?.separation);
  const packAt = ahead(seq?.retropack);
  const retroBurn = tr.retro.burn.value;
  const fires = (seq?.retro ?? []).filter((f) => f + retroBurn > start.t && (packAt === null || f < packAt));
  const retroEnd = fires.length ? Math.max(...fires.map((f) => f + retroBurn)) : Number.NEGATIVE_INFINITY;
  /** How many retrorockets burn from `at` until the next instant (none once the pack has gone). */
  const lit = (at: number): number => {
    if (packAt !== null && at >= packAt) return 0;
    let n = 0;
    for (const f of fires) if (at >= f && at < f + retroBurn) n++;
    return n;
  };
  /** The instants it changes at: the cutoff, the sequence's, each retrorocket's start and end. */
  const marks = [
    ...new Set(
      [burn?.until, towerAt, separationAt, packAt, ...fires, ...fires.map((f) => f + retroBurn)].filter(
        (x): x is number => x !== undefined && x !== null && x >= start.t,
      ),
    ),
  ].sort((a, b) => a - b);

  let burning = burn !== null;
  let mass = start.mass;
  let massAt = start.t;
  let retros = lit(start.t);
  // what the air sees: the stack (or the spacecraft with its tower on), nose first; or the spacecraft alone, with whatever parachute is out
  let riding = start.phase === 'powered' || start.phase === 'coast' || start.phase === 'escape';
  let alone = start.phase !== 'powered' && start.phase !== 'coast';
  let chute = { full: 0, was: 0, at: 0, fills: 1 };
  let drogue = start.phase === 'drogue' || start.phase === 'main';
  let main = start.phase === 'main';
  if (main) chute = start.chute ?? { full: tr.main.dragArea.value, was: tr.main.dragArea.value, at: start.t, fills: 1 };
  else if (drogue) chute = start.chute ?? { full: tr.drogue.dragArea.value, was: tr.drogue.dragArea.value, at: start.t, fills: 1 };
  // what the parachutes can take (vehicle.ts `worn`): one that is out tears in more air than its cloth or its lines hold
  const limits = tr.body?.limits ?? null;
  // (one that is out at the start with nothing said of how far it has filled is taken as it is and held to nothing: full at once
  // in the air it was let out in, it would be torn by a pull it never had)
  let torn = start.chute
    ? (main && chute.full < tr.main.dragArea.value) || (drogue && !main && chute.full < tr.drogue.dragArea.value)
    : drogue || main;

  const place = (p: Vec3, at: number): Geodetic => ecefToGeodetic(inertialToEcef(p, EARTH_ROTATION_RATE * at));
  /** The motion through the air: over the ground, less the day's wind there. */
  const windOf = (p: Vec3, u: Vec3, at: number, altitude: number): Vec3 => {
    const over = sub(u, cross(SPIN, p));
    return blow ? sub(over, blowing(blow, place(p, at), altitude, at)) : over;
  };
  const weight = (at: number): number => (burning ? mass - flow * (at - massAt) : mass);

  return {
    kind: burn ? 'guided' : 'coast',
    cutoff: burn ? burn.until : null,
    quiet: retroEnd,
    get chute() {
      return drogue || main;
    },
    ground: floor,
    burning: () => burning || retros > 0,
    push(at, p, u, altitude) {
      let a: Vec3 = [0, 0, 0];
      const m = weight(at);
      const air = altitude < AIR_TOP || burning ? atmosphere(altitude) : null;
      if (air && altitude < AIR_TOP) {
        const wind = windOf(p, u, at, altitude);
        const speed = length(wind);
        if (speed > 0) {
          const area = dragArea(tr, riding, speed / air.soundSpeed) + (riding ? 0 : chuteArea(chute, at));
          a = scale(wind, (-0.5 * air.density * speed * area) / m);
        }
      }
      if (burning && burn) a = add(a, scale(burn.axis(at), thrustIn(tr, air ? air.pressure : 0) / m));
      if (retros > 0) {
        // each retrorocket against the motion over the ground, pitched below the level (fly.ts)
        const up = upAt(p, at);
        const over = sub(u, cross(SPIN, p));
        const level = sub(over, scale(up, dot(over, up)));
        const across = length(level);
        if (across > 0) {
          const pitch = tr.retro.pitch.value * (Math.PI / 180);
          const push = sub(scale(level, -Math.cos(pitch) / across), scale(up, Math.sin(pitch)));
          a = add(a, scale(push, (retros * tr.retro.thrust.value) / m));
        }
      }
      return a;
    },
    next(t) {
      // (and a parachute's end of filling, where its drag stops growing)
      const filled = drogue || main ? chute.at + chute.fills : Number.NEGATIVE_INFINITY;
      return Math.min(after(marks, t), filled > t + 1e-9 ? filled : Infinity);
    },
    below() {
      if (!alone || !chutes) return Number.NEGATIVE_INFINITY;
      return !drogue ? tr.drogue.altitude.value : !main ? tr.main.altitude.value : Number.NEGATIVE_INFINITY;
    },
    arrive(t, _r, v, _altitude, by): Arrival {
      const events: EventKind[] = [];
      let dv: Vec3 | undefined;
      if (by === 'height') {
        if (!drogue) {
          drogue = true;
          chute = { full: tr.drogue.dragArea.value, was: 0, at: t, fills: tr.drogue.fills.value };
          events.push('drogue');
        } else {
          main = true;
          chute = { full: tr.main.dragArea.value, was: chute.full, at: t, fills: tr.main.fills.value };
          events.push('main');
        }
        torn = false;
        return { events };
      }
      if (burning && burn && t >= burn.until - 1e-9) {
        mass = weight(t);
        massAt = t;
        burning = false;
        events.push('cutoff');
      }
      if (t === towerAt) events.push('tower');
      if (t === separationAt && !alone) {
        // the two are pushed apart along the motion; the spacecraft's share is the booster's part of the whole (fly.ts)
        const share = tr.separation.boosterMass.value / (tr.separation.boosterMass.value + tr.separation.mass.value);
        const wind = sub(v, cross(SPIN, _r));
        if (length(wind) > 0) dv = add(v, scale(unit(wind), tr.separation.speed.value * share));
        mass = tr.separation.mass.value;
        massAt = t;
        alone = true;
        events.push('separation');
      }
      if (fires.length && t === fires[0]) events.push('retro');
      if (fires.length && t === retroEnd) events.push('burnout');
      if (t === packAt) {
        mass = tr.retropack.mass.value;
        massAt = t;
        events.push('retropack');
      }
      retros = lit(t);
      return dv ? { events, v: dv } : { events };
    },
    settle(t, p, u, altitude, falling) {
      // what a spacecraft alone does by itself, coming down (vehicle.ts): the tower's shape gives way to the heat shield
      if (alone && falling) riding = false;
      if (limits && !riding && !torn && (drogue || main) && altitude < AIR_TOP) {
        const which = main ? 'main' : 'drogue';
        const wind = windOf(p, u, t, altitude);
        const q = 0.5 * atmosphere(altitude).density * dot(wind, wind);
        const area = chuteArea(chute, t);
        if (q > limits[which].value || q * area > (limits.pull?.[which]?.value ?? Infinity)) {
          const left = Math.min(area, tr[which].dragArea.value * limits.torn.value);
          chute = { full: left, was: left, at: t, fills: 1 };
          torn = true;
        }
      }
    },
  };
}
