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
 *   spacecraft  an orbital flight's spacecraft alone (`OrbitalFlight`: Vostok 1's ship): flyOrbit's forces (orbital.ts
 *               `shipPush`), the braking burn as planned along its line (`aimOf`), the modules' parting; it stops at the
 *               height its pilot left at, as flyOrbit does.
 *   stack       an orbital flight's staged launch vehicle with its engines stopped now: what it carries, on the drag of
 *               the shape it has (staged.ts `stackOf`, which the batch ascent and the live staged vehicle fly on).
 *
 * What differs between them is the vehicles', not the predictor's: each is a point mass at its centre of mass whose
 * forces are its own simulator's, with the attitude those forces need prescribed (along the programme, against the
 * motion, heat shield first, along the braking engine's line). Where a live vehicle is a rigid body (vehicle.ts: the
 * Redstone's moments, its autopilot's lag behind its programme, under a degree; stagedlive.ts's turning by hand) the
 * prediction holds the attitude its guidance asks for, or has no thrust to point. What was the two old predictors'
 * and is no longer: their own steps (a fixed ladder of heights and a twentieth of a second in the air) and their own
 * stopping rules; the orbital coast's drag on the launch vehicle (it was the spacecraft's ball's, so a vehicle cut low
 * came down nearer than drawn); and a burn's end falling on a stage of the step that had it off.
 */
import type { Trajectory } from '../types';
import { EARTH_ROTATION_RATE } from '../world/bodies.ts';
import { sunPosition } from '../world/ephemeris.ts';
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
import { greenwichSiderealTime, terrestrialTime } from '../world/time.ts';
import { AIR_TOP, atmosphere } from './atmosphere.ts';
import { chuteArea, dragArea, G0, thrustIn } from './fly.ts';
import { blowing, blowOf, upAt } from './forces.ts';
import { aimOf, type OrbitalFlight, shipPush } from './orbital.ts';
import type { Arrival, Burn, EventKind, Flier, Sequence, Start } from './predict.ts';
import { stackOf } from './staged.ts';

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

/**
 * A spacecraft alone (`OrbitalFlight`: Vostok 1's ship) from any instant after it has parted: the coast's forces
 * (orbital.ts `shipPush`: the air on the entry body, the whole ship's mass until the modules part), the braking burn as the
 * plan has it (the timer's, a hand's, or none: `on` at or past `Number.MAX_SAFE_INTEGER` is none), its line fixed as it
 * lights (`aimOf`), and the modules' parting; and it stops where its pilot leaves, at the ejection height, burn or no burn,
 * as flyOrbit does. Begun within the burn, the line is the one it would have lit along from the state at the start.
 */
export function spacecraft(
  o: OrbitalFlight,
  launchJd: number,
  site: Geodetic,
  seaLevel: number,
  start: { t: number; r: Vec3; v: Vec3 },
): Flier {
  const gast0 = greenwichSiderealTime(launchJd);
  // (fly.ts's frame is frames.ts's inertial frame of date turned back by the sidereal time at liftoff)
  const flat = (u: Vec3): Vec3 => inertialToEcef(u, gast0);
  const never = (x: number): boolean => !(x < Number.MAX_SAFE_INTEGER);
  const [on, off, parted] = [o.retro.on.value, o.retro.off.value, o.entry.separation.value];
  const marks = [on, off, parted].filter((x) => !never(x) && x >= start.t).sort((a, b) => a - b);
  const aimAt = (t: number, r: Vec3, v: Vec3): Vec3 =>
    aimOf(o, r, v, () => flat(sunPosition(terrestrialTime(launchJd + t / 86_400))), flat);
  let burning = !never(on) && start.t > on && start.t < off && start.t < parted;
  let aim: Vec3 | null = burning ? aimAt(start.t, start.r, start.v) : null;
  return {
    kind: 'coast',
    cutoff: null,
    quiet: never(on) ? Number.NEGATIVE_INFINITY : off,
    chute: false,
    radius: o.orbit.radius.value,
    ground: floorOf(site, seaLevel),
    burning: () => burning,
    push: (at, p, u, altitude) => shipPush(o, at, sub(u, cross(SPIN, p)), altitude, burning ? aim : null),
    next: (t) => after(marks, t),
    below: () => o.ejection.altitude.value,
    arrive(t, r, v, _altitude, by): Arrival {
      if (by === 'height') return { end: true };
      const events: EventKind[] = [];
      if (t === on && t < parted) {
        aim = aimAt(t, r, v);
        burning = true;
        events.push('retro');
      }
      if (t === off && burning) {
        burning = false;
        events.push('burnout');
      }
      if (t === parted) {
        burning = false;
        events.push('separation');
      }
      return { events };
    },
  };
}

/**
 * A staged launch vehicle with its engines stopped now (`OrbitalFlight.ascent`: Vostok 1's R-7 with what it still
 * carries): a point mass of `mass` kg on the drag of the shape it has (staged.ts `stackOf`'s area for the record instant
 * `gone`, the latest separation among what has been let go: `StagedVehicle.shape`), through the same air, nothing more
 * let go and nothing lit, down to the ground or once round. What the deck shows on the launch vehicle (orbitdeck.ts).
 */
export function stack(o: OrbitalFlight, site: Geodetic, seaLevel: number, mass: number, gone: number): Flier {
  const drag = stackOf(o).dragArea;
  return {
    kind: 'coast',
    cutoff: null,
    quiet: Number.NEGATIVE_INFINITY,
    chute: false,
    radius: o.orbit.radius.value,
    ground: floorOf(site, seaLevel),
    burning: () => false,
    push(_at, p, u, altitude) {
      const air = atmosphere(altitude);
      const wind = sub(u, cross(SPIN, p));
      const airspeed = length(wind);
      if (!(airspeed > 0)) return [0, 0, 0];
      const q = 0.5 * air.density * airspeed * airspeed;
      return scale(wind, (-q * drag(gone, airspeed / air.soundSpeed)) / (airspeed * mass));
    },
    next: () => Infinity,
    below: () => Number.NEGATIVE_INFINITY,
    arrive: () => ({}),
  };
}
