/**
 * Flying a ballistic flight: a booster that burns once on a stored tilt programme, and a capsule
 * that separates, fires its retrorockets and comes down under parachutes. The whole of it is
 * integrated from the flight's plan (sim/plan.ts, written by its launch vehicle's module: mercury-redstone.ts `plan`), stepped
 * on the one machine (sim/craft.ts) by the record's pilot (`flyPlan`): nothing here knows which
 * flight it is or names a part, and nothing is adjusted to make a result come out.
 * tests/sim.test.mjs holds it against the flight's documented results.
 *
 * The state is position and velocity in an Earth-centred frame that does not turn (the flight's, world/earthframe.ts:
 * of date, or fixed at liftoff with the Greenwich meridian on +X then), in doubles, with the mass.
 *
 * Forces
 *   gravity   the Earth's, with its oblateness (J2): bodies.ts's GM and WGS 84's figure.
 *   thrust    along the vehicle's axis: sim/thrust.ts's one law, the vacuum thrust (derived from the
 *             sea-level figure and the exit area) less the exit area times the air's pressure. The flow is thrust over (g0 times specific impulse), steady
 *             from liftoff to cutoff: no build-up, no tail-off.
 *   drag      half rho v^2 Cd A against the motion through the air, which turns with the Earth and
 *             moves over it with the day's winds aloft where the plan gives them (`winds`:
 *             one sounding, the same all along the flight). Cd by Mach number at no angle of attack.
 *   air       atmosphere.ts.
 *   mass      what leaves the pad, less what each engine aboard has burned (thrust over g0 times
 *             specific impulse, from its lighting); at a parting the record gives a figure for
 *             (`JointDef.after`: the capsule at separation, and once its retropack has gone) that
 *             figure, and at any other (the escape tower, at its jettison) less what leaves.
 *
 * Attitude is prescribed, not flown. Going up, the axis is tilted from the launch vertical toward
 * the launch azimuth by the programme, in inertial space, as a gyro platform holds it. The
 * retrorockets push against the capsule's motion over the ground, pitched below the horizontal.
 * Otherwise the capsule's attitude only matters to its drag, and it is taken heat shield first.
 * A parachute's drag grows evenly from nothing to its full area over the time it takes to fill.
 *
 * Fixed-step fourth-order Runge-Kutta, with each step cut short to end exactly on the next event,
 * so a run is the same run every time.
 */
import type { Measure } from '../measure.ts';
import type { Curve } from '../types.ts';
import { EARTH_J2, G0 } from '../world/bodies.ts';
import { type EarthFrame, LIFTOFF } from '../world/earthframe.ts';
import {
  add,
  angleBetween,
  cross,
  DEG,
  dot,
  ecefToGeodetic,
  enuAxes,
  fromHorizontal,
  type Geodetic,
  geodeticToEcef,
  length,
  scale,
  sub,
  unit,
  type Vec3,
} from '../world/frames.ts';
import { gravity } from '../world/orbit.ts';
import { airAt, airDrag, blowOf } from './air.ts';
import { acceleration, rk4 } from './core/rk4.ts';
import { aboard, act, due, lit, part, type Sense, startCraft } from './craft.ts';
import { keptShare } from './forces.ts';
import { ENTRY_G } from './loads.ts';
import type { BodyDef, ChuteDef, Craft, EngineDef, EventDef, FlightPlan, Hold, JointDef } from './plan.ts';
import { nozzleThrust } from './thrust.ts';

/** The Earth's mean radius, m (IUGG): ranges over the ground are measured along a sphere of it. */
export const MEAN_RADIUS = 6_371_008.8;

/**
 * Coast: a position and velocity carried forward under gravity alone, by the same fixed-step
 * Runge-Kutta the flight uses. For orbits, and for checking the integrator against Kepler.
 */
export function coast(r: Vec3, v: Vec3, seconds: number, step = 1, j2 = EARTH_J2): { r: Vec3; v: Vec3 } {
  const steps = Math.max(1, Math.round(seconds / step));
  const h = seconds / steps;
  let s = { r, v };
  for (let i = 0; i < steps; i++) s = rk4(s, 0, h, (q) => gravity(q.r, j2));
  return s;
}

/** A curve's value at x: straight lines between its points, flat beyond its ends. */
export function along(curve: Curve, x: number): number {
  const p = curve.points;
  if (x <= p[0]![0]) return p[0]![1];
  for (let i = 1; i < p.length; i++) {
    const [x0, y0] = p[i - 1]!;
    const [x1, y1] = p[i]!;
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
  }
  return p[p.length - 1]![1];
}

/**
 * What a flight is at an instant, as its machine has it (sim/craft.ts): the launch vehicle still aboard (`riding`) and an
 * engine of it burning (`powered`); the launch vehicle gone and the escape tower still on, the spacecraft pulled clear on
 * its rocket (`escaping`: the live simulator's only, sim/vehicle.ts); the first 0.05 g felt coming down with nothing
 * burning (`entered`); the plan's id of the parachute out (`out`: the last let out, null for none); down (`landed`).
 */
export interface Doing {
  riding: boolean;
  powered: boolean;
  escaping: boolean;
  entered: boolean;
  out: string | null;
  landed: boolean;
}

/** On its launch vehicle, its engines out; and the spacecraft alone, nothing out: what a run that gives no machine's state (a staged run's summary) says it is doing. */
export const RIDING: Doing = { riding: true, powered: false, escaping: false, entered: false, out: null, landed: false };
export const ALONE: Doing = { riding: false, powered: false, escaping: false, entered: false, out: null, landed: false };

/** The spacecraft in free flight: its launch vehicle and its tower gone, no parachute out, not down. */
export const free = (s: Doing): boolean => !s.landed && !s.riding && !s.escaping && s.out === null;

/** Whether what a flight is doing differs between two instants (`Doing`): where a run keeps the instant a change happened at. */
export const changed = (a: Doing, b: Doing): boolean =>
  a.riding !== b.riding ||
  a.powered !== b.powered ||
  a.escaping !== b.escaping ||
  a.entered !== b.entered ||
  a.out !== b.out ||
  a.landed !== b.landed;

/** The flight at one instant. */
export interface Sample extends Doing {
  /** Seconds from liftoff. */
  t: number;
  /** Height above the sea, m; distance over the ground from the pad, m. */
  altitude: number;
  range: number;
  /** Speed in the frame that does not turn (space-fixed), and over the turning Earth, m/s. */
  speed: number;
  groundSpeed: number;
  /** Climb angle above the local horizontal in each of those, degrees. */
  climb: number;
  groundClimb: number;
  /** What an accelerometer reads, in g: every force but gravity, over the mass. */
  g: number;
  /** Dynamic pressure, Pa, and Mach number. */
  q: number;
  mach: number;
  /** kg */
  mass: number;
  /** Where it is over: degrees north and east. */
  latitude: number;
  longitude: number;
  /** Position and velocity in the frame that does not turn, m and m/s. */
  r: Vec3;
  v: Vec3;
}

/** What the reports give figures for, as the run has them: ids match a flight's `checks`. */
export interface Results {
  /** The greatest height, m, and when. */
  apogee: number;
  apogeeAt: number;
  /** Distance over the ground from pad to landing, m, and the time of landing, s. */
  range: number;
  duration: number;
  /** Space-fixed and Earth-fixed speed, climb angles and height at capsule separation. */
  separationSpeed: number;
  separationGroundSpeed: number;
  separationClimb: number;
  separationGroundClimb: number;
  separationAltitude: number;
  /** The greatest dynamic pressure, Pa, and reading in g, going up and coming down. */
  exitQ: number;
  exitG: number;
  entryQ: number;
  entryG: number;
  /** When the capsule first feels a twentieth of a g coming down, and when each parachute opens, s. */
  entryAt: number;
  drogueAt: number;
  mainAt: number;
  /** How fast it is falling when it lands, m/s. */
  landingSpeed: number;
}

export interface Flown {
  samples: Sample[];
  results: Results;
}

interface State {
  r: Vec3;
  v: Vec3;
}

/**
 * A ballistic plan flown whole: the craft (sim/craft.ts) stepped by the record's pilot, who sets off each of the plan's
 * automatic events as it comes due. Nothing here names a part or an event: what burns is what the machine has lit and
 * still aboard, what the air meets is the stack (its `drag`) while the body it stood on is aboard and the last body (its
 * `aero`) with its parachutes out after, the mass is the record's at each parting that gives one (`JointDef.after`) and
 * otherwise the bodies' less what their engines have burned. The thrust lies along the attitude held (`AttitudeDef`): a
 * tilt programme in inertial space, or the retro attitude against the motion over the ground. Every instant an event is
 * due at, and every solid motor's burning out, ends a step.
 *
 * `site` is where it stands at liftoff, and `seaLevel` where the sea is there, in metres above the ellipsoid (the geoid's
 * height, taken as the same all along the flight): heights are above the sea. `step` is the integration step in seconds
 * and `every` how often a sample is kept. The same inputs give the same flight to the last bit. `from` starts the flight
 * at the spacecraft's separation instead, with the position and velocity given (in `frame`, the flight's:
 * world/earthframe.ts, fixed at liftoff unless given): its half of the flight can then be flown from the separation the
 * reports give, whatever the booster did.
 */
export function fly(
  plan: FlightPlan,
  site: Geodetic,
  seaLevel = 0,
  step = 0.05,
  every = 0.5,
  from?: { r: Vec3; v: Vec3 },
  frame: EarthFrame = LIFTOFF,
): Flown {
  const c = plan.craft[0]!;
  const base0 = c.bodies[0]!.id;
  const last = c.bodies[c.bodies.length - 1]!;
  const lastAero = last.aero!;
  const spin = frame.spin;
  const pad = geodeticToEcef(site);
  const blow = blowOf(plan.winds);
  const engines = c.engines.map((e) => ({
    e,
    flow: e.isp ? e.count * ((e.thrust.seaLevel ?? e.thrust.vacuum).value / (G0 * (e.isp.seaLevel ?? e.isp.vacuum).value)) : 0,
  }));
  const bodyMass = new Map(c.bodies.map((b) => [b.id, b.mass.value]));
  const jointOf = new Map(c.joints.map((j) => [j.id, j]));
  const chuteOf = new Map(c.chutes.map((ch) => [ch.id, ch]));
  const holdOf = new Map(plan.attitude.map((a) => [a.id, a.hold]));
  // the tilt programme's axis, made once per programme
  const programmes = new Map<Hold, (t: number) => Vec3>();
  /** The joint that parts the last body from what it stood on: the record's separation figures are read as it goes. */
  const leaving = c.joints.find((j) => j.gone.includes(base0));
  /** Each solid motor the record's events light at their instants: its burning, from then for its burn (the entry's mark waits for them). */
  const retroWindows = plan.events.flatMap((ev) =>
    ev.at
      ? ev.do.flatMap((a) => {
          if (!('ignite' in a)) return [];
          const e = c.engines.find((x) => x.id === a.ignite);
          return e?.kind === 'solid' && e.burn ? [[ev.at!.value, ev.at!.value + e.burn.value] as const] : [];
        })
      : [],
  );
  const lastBurnout = Math.max(...retroWindows.map((w) => w[1]));

  let t = 0;
  let craft = startCraft(plan);
  /** The mass less what the engines aboard have burned (`massAt`), kg. */
  let base = c.mass.value;
  let entered = false;
  let landed = false;
  // the parachute now out: the drag area it has when full, the area the one before it had, when it was let out and how long it takes to fill
  let chute = { full: 0, was: 0, at: 0, fills: 1 };
  const pad0 = frame.toInertial(pad, 0);
  let state: State = { r: pad0, v: cross(spin, pad0) }; // standing on the turning Earth

  /** Where the Earth-fixed axes have turned to. */
  const fixed = (r: Vec3, at: number): Vec3 => frame.toFixed(r, at);
  const riding = () => aboard(craft, base0);
  const burning = (i: number, as: number): boolean => {
    const { e } = engines[i]!;
    if (!aboard(craft, e.body) || !lit(craft, e.id, as)) return false;
    return e.kind === 'solid' && e.burn ? as < craft.engines[e.id]!.lit + e.burn.value : true;
  };
  const thrustOf = (i: number, pressure: number): number => {
    const { e } = engines[i]!;
    return e.exitArea ? nozzleThrust(e.count, e.thrust.vacuum.value, 1, e.exitArea.value, pressure) : e.count * e.thrust.vacuum.value;
  };
  /** The line the engines push along under the attitude held, at a state and an instant, with the air there. */
  const axisUnder = (s: State, at: number, ground: Vec3): Vec3 => {
    const hold = holdOf.get(craft.attitude)!;
    if ('programme' in hold) {
      let p = programmes.get(hold);
      if (!p) programmes.set(hold, (p = programmeAxis(hold.programme, hold.azimuth.value, site, frame)));
      return p(at);
    }
    if ('retro' in hold) {
      // against the motion over the ground, pitched below the level
      const up = frame.up(s.r, at);
      const level = unit(sub(ground, scale(up, dot(ground, up))));
      const pitch = hold.retro.value * DEG;
      return sub(scale(level, -Math.cos(pitch)), scale(up, Math.sin(pitch)));
    }
    return scale(unit(ground), -1);
  };

  /**
   * Every force but gravity, N, and what the air is doing, at a state at `at`, with what burns as it is from instant `as`
   * (a step's start: a step ends on each lighting and burning out, so within it what burns is fixed).
   */
  const forces = (s: State, at: number, as = at): { force: Vec3; q: number; mach: number; altitude: number } => {
    // the air there, and the motion over the ground and through the air (air.ts)
    const { altitude, air, ground, wind, airspeed, mach, q } = airAt(frame, s.r, s.v, at, seaLevel, blow);
    const piece = riding() ? dragPiece() : null;
    const area = piece
      ? piece.area.value * along(piece.curve, mach)
      : lastAero.area.value * along(lastAero.drag, mach) + chuteArea(chute, at);
    let force: Vec3 = airDrag(wind, airspeed, air.density, area);
    let thrust = 0;
    engines.forEach((_, i) => {
      if (burning(i, as)) thrust += thrustOf(i, air.pressure);
    });
    if (thrust > 0) force = add(force, scale(axisUnder(s, at, ground), thrust));
    return { force, q, mach, altitude };
  };
  /** The stack's drag while it rides: the piece for the configuration it is in (the latest record instant among what has parted). */
  const dragPiece = () => {
    let shape = 0;
    for (const j of c.joints) if (Number.isFinite(craft.joints[j.id]!.gone)) shape = Math.max(shape, j.at?.value ?? 0);
    return c.drag.find((d) => shape < d.until.value) ?? c.drag[c.drag.length - 1]!;
  };

  const nudge = (s: State, d: State, h: number): State => ({ r: add(s.r, scale(d.r, h)), v: add(s.v, scale(d.v, h)) });
  const burnedBy = (at: number): number => {
    let burned = 0;
    engines.forEach(({ e, flow }) => {
      if (!flow || !aboard(craft, e.body)) return;
      const k = craft.engines[e.id]!;
      if (Number.isFinite(k.lit)) burned += flow * (Math.min(at, k.out) - k.lit);
    });
    return burned;
  };
  const massAt = (at: number): number => base - burnedBy(at);
  /** A step from `at` (core/rk4.ts), with what burns as it is from the step's start. */
  const stepOf = (s: State, at: number, h: number): State =>
    rk4(s, at, h, (q, tt) => acceleration(gravity(q.r), scale(forces(q, tt, at).force, 1 / massAt(tt))));

  const outNow = (id: string) => Number.isFinite(craft.chutes[id]!.out) && !Number.isFinite(craft.chutes[id]!.off);
  const doingNow = (): Doing => {
    const aboard = riding();
    // (the parachute out: one let out instead of another is the later)
    const out = c.chutes.filter((ch) => outNow(ch.id));
    const last = out.find((ch) => ch.instead?.length) ?? out[0];
    return {
      riding: aboard,
      powered: aboard && engines.some((_, i) => burning(i, t)),
      escaping: false,
      entered,
      out: last ? last.id : null,
      landed,
    };
  };

  const sample = (): Sample => {
    const m = massAt(t);
    const f = forces(state, t);
    const here = ecefToGeodetic(fixed(state.r, t));
    const up = frame.upOver(here, t);
    const wind = sub(state.v, cross(spin, state.r));
    const climb = (v: Vec3): number => (length(v) > 1e-9 ? Math.asin(Math.max(-1, Math.min(1, dot(v, up) / length(v)))) / DEG : 90);
    return {
      t,
      ...doingNow(),
      altitude: f.altitude,
      range: angleBetween(fixed(state.r, t), pad) * MEAN_RADIUS,
      speed: length(state.v),
      groundSpeed: length(wind),
      climb: climb(state.v),
      groundClimb: climb(wind),
      g: length(f.force) / m / G0,
      q: f.q,
      mach: f.mach,
      mass: m,
      latitude: here.latitude,
      longitude: here.longitude,
      r: state.r,
      v: state.v,
    };
  };

  const results: Results = {
    apogee: 0,
    apogeeAt: 0,
    range: 0,
    duration: 0,
    separationSpeed: 0,
    separationGroundSpeed: 0,
    separationClimb: 0,
    separationGroundClimb: 0,
    separationAltitude: 0,
    exitQ: 0,
    exitG: 0,
    entryQ: 0,
    entryG: 0,
    entryAt: Number.NaN,
    drogueAt: Number.NaN,
    mainAt: Number.NaN,
    landingSpeed: 0,
  };
  const note = (s: Sample): void => {
    if (s.altitude > results.apogee) {
      results.apogee = s.altitude;
      results.apogeeAt = s.t;
    }
    const goingUp = s.t <= results.apogeeAt;
    if (goingUp) {
      results.exitQ = Math.max(results.exitQ, s.q);
      results.exitG = Math.max(results.exitG, s.g);
    } else if (free(s)) {
      results.entryQ = Math.max(results.entryQ, s.q);
      // the retrorockets are felt too, but the reports' re-entry figure is the air's
      if (!retroWindows.some(([on, off]) => s.t >= on && s.t <= off)) results.entryG = Math.max(results.entryG, s.g);
      if (Number.isNaN(results.entryAt) && s.t > lastBurnout && s.g >= ENTRY_G) {
        results.entryAt = s.t;
        entered = true;
      }
    }
  };

  /** When an event not yet happened is due by the clock, where its triggers say: its time, or so long after one that has happened. */
  const timeOf = (ev: EventDef): number | null => {
    let at: number | null = null;
    for (const w of ev.when) {
      if ('time' in w) at = Math.max(at ?? -Infinity, w.time);
      else if ('after' in w) {
        const was = craft.fired[w.after];
        if (was === undefined) return null;
        at = Math.max(at ?? -Infinity, was + (w.wait ?? 0));
      } else return null;
    }
    return at;
  };
  /** The next instant something is due by the clock after `t`: an event's, or a solid motor's burning out. */
  const nextMark = (): number | undefined => {
    let next = Infinity;
    for (const ev of plan.events) {
      if (craft.fired[ev.id] !== undefined || !ev.automatic) continue;
      const at = timeOf(ev);
      if (at !== null && at > t + 1e-9) next = Math.min(next, at);
    }
    engines.forEach(({ e }) => {
      const k = craft.engines[e.id]!;
      if (e.kind === 'solid' && e.burn && Number.isFinite(k.lit) && k.lit + e.burn.value > t + 1e-9)
        next = Math.min(next, k.lit + e.burn.value);
    });
    return Number.isFinite(next) ? next : undefined;
  };

  /** A joint parts: the mass is the record's after it where it gives one, else less the bodies that leave; a push shared by the masses, along the axis. */
  const parting = (id: string): void => {
    const j = jointOf.get(id)!;
    const goneMass = j.gone.reduce((m, b) => m + (aboard(craft, b, t) ? bodyMass.get(b)! : 0), 0);
    const kick = j.push ? keptShare(j.push.value, j.after?.value ?? massAt(t) - goneMass, j.leaves?.value ?? goneMass) : 0;
    if (j === leaving) {
      const s = sample();
      results.separationSpeed = s.speed;
      results.separationGroundSpeed = s.groundSpeed;
      results.separationClimb = s.climb;
      results.separationGroundClimb = s.groundClimb;
      results.separationAltitude = s.altitude;
    }
    // the two are pushed apart along the joint's axis, which is the line held; the kept side's share is the other's part of the whole (forces.ts)
    if (kick) state = { r: state.r, v: add(state.v, scale(axisUnder(state, t, sub(state.v, cross(spin, state.r))), kick)) };
    craft = part(plan, act(plan, craft, { separate: id }, t, false).state, id, t);
    base = j.after ? j.after.value + burnedBy(t) : base - j.gone.reduce((m, b) => m + (craft.bodies[b] === t ? bodyMass.get(b)! : 0), 0);
  };
  /** The record's pilot: every automatic event due now, each at its own instant (one passed over by a start part-way, at its), until none is. */
  const arrive = (sense: Omit<Sense, 't'>): void => {
    for (let again = true; again; ) {
      again = false;
      const ready = due(plan, craft, { ...sense, t }, (ev) => ev.automatic);
      for (const ev of ready) {
        if (craft.fired[ev.id] !== undefined) continue;
        craft = { ...craft, fired: { ...craft.fired, [ev.id]: t } };
        for (const a of ev.do) {
          if ('separate' in a) {
            if (jointOf.has(a.separate) && !Number.isFinite(craft.joints[a.separate]!.gone)) parting(a.separate);
          } else if ('deploy' in a) {
            const ch = chuteOf.get(a.deploy)!;
            const was = (ch.instead ?? []).reduce((m, x) => m + (outNow(x) ? chuteOf.get(x)!.dragArea.value : 0), 0);
            craft = act(plan, craft, a, t, false).state;
            chute = { full: ch.dragArea.value, was, at: t, fills: ch.fills.value };
            if (Number.isNaN(results.drogueAt)) results.drogueAt = t;
            else results.mainAt = t;
          } else craft = act(plan, craft, a, at(ev), false).state;
        }
        again = true;
      }
    }
  };
  /** The instant an event is set off at: its own, where the clock says it and it is past (a start part-way), else now. */
  const at = (ev: EventDef): number => {
    const when = timeOf(ev);
    return when !== null && when < t ? when : t;
  };
  const sensed = (height: number, falling: boolean) => ({ height, falling, speed: length(state.v), apparent: () => 0, g: 0, held: false });

  arrive(sensed(forces(state, t).altitude, false));
  const samples: Sample[] = [sample()];
  if (from) {
    // from the parting, with the position and velocity given: everything before it happened as the record has it
    const ev = plan.events.find((e) => e.do.some((a) => 'separate' in a && a.separate === leaving?.id));
    t = (ev && timeOf(ev)) ?? 0;
    state = { r: from.r, v: from.v };
    samples.length = 0;
    arrive(sensed(forces(state, t).altitude, false));
    samples.push(sample());
  }

  let kept = t;
  const LIMIT = 4 * 3600; // a flight that has not come down in four hours is not this kind of flight
  while (!landed && t < LIMIT) {
    const mark = nextMark();
    const h = Math.min(step, mark === undefined ? step : mark - t);
    const before = state;
    const heightBefore = forces(state, t).altitude;
    state = stepOf(state, t, h);
    const onMark = Math.abs(t + h - (mark ?? Number.NaN)) < 1e-9;
    t = onMark ? mark! : t + h;
    // what is due now, by the clock or at a height coming down
    const height = forces(state, t).altitude;
    arrive(sensed(height, height < heightBefore));
    if (height <= 0 && t > 1) {
      // back to the instant it reached the sea, along the last step
      const part = heightBefore / (heightBefore - height);
      state = nudge(before, { r: scale(sub(state.r, before.r), 1 / h), v: scale(sub(state.v, before.v), 1 / h) }, h * part);
      t = t - h + h * part;
      const s = sample();
      results.landingSpeed = -dot(sub(state.v, cross(spin, state.r)), frame.up(state.r, t));
      results.range = s.range;
      results.duration = t;
      landed = true;
      samples.push({ ...s, landed: true });
      break;
    }
    const s = sample();
    note(s);
    if (t - kept >= every - 1e-9 || onMark) {
      samples.push(s);
      kept = t;
    }
  }
  return { samples, results };
}

/**
 * The vehicle's axis going up, in the frame that does not turn: tilted from the launch vertical toward the launch azimuth
 * by the plan's programme (the attitude held from liftoff), as the gyro platform holds it. Both directions are fixed in
 * inertial space at liftoff.
 */
export function axisOf(plan: FlightPlan, site: Geodetic, frame: EarthFrame = LIFTOFF): (t: number) => Vec3 {
  const { programme } = ballisticOf(plan);
  return programmeAxis(programme.programme, programme.azimuth.value, site, frame);
}

/** A tilt programme's axis (`Hold.programme`): degrees from the launch vertical toward `azimuth` (degrees true) against seconds. */
export function programmeAxis(tilt: Curve, azimuth: number, site: Geodetic, frame: EarthFrame = LIFTOFF): (t: number) => Vec3 {
  const axes = enuAxes(site);
  const [e, n] = fromHorizontal(azimuth * DEG, 0);
  const up0 = frame.toInertial(axes.up, 0);
  const downrange0 = frame.toInertial(unit(add(scale(axes.east, e), scale(axes.north, n))), 0);
  return (t) => {
    const angle = along(tilt, t) * DEG;
    return add(scale(up0, Math.cos(angle)), scale(downrange0, Math.sin(angle)));
  };
}

const runs = new WeakMap<FlightPlan, Map<string, Flown>>();
/** The flight flown once, whoever asks first: the readout and the scene show the same run. */
export function flownOnce(plan: FlightPlan, site: Geodetic, seaLevel = 0, frame: EarthFrame = LIFTOFF): Flown {
  // (the same hardware flown from another place, over another sea, or in another frame, is another flight)
  const where = `${site.latitude},${site.longitude},${site.height},${seaLevel},${frame.gast0},${frame.jd0}`;
  let from = runs.get(plan);
  if (!from) runs.set(plan, (from = new Map()));
  let run = from.get(where);
  if (!run) from.set(where, (run = fly(plan, site, seaLevel, undefined, undefined, undefined, frame)));
  return run;
}

/**
 * The drag area (coefficient times reference area), m^2, of what is flying at a Mach number: the
 * stack going up nose first (`riding`), or the spacecraft alone, heat shield first. Parachutes are
 * `chuteArea`'s. For what looks ahead from a state (predict.ts): the same curves the flight is flown from.
 */
export function dragArea(plan: FlightPlan, riding: boolean, mach: number): number {
  const b = ballisticOf(plan);
  return riding ? b.stack.area.value * along(b.stack.curve, mach) : b.entry.area.value * along(b.entry.drag, mach);
}

/** A parachute's drag area at `at`, m^2: growing evenly from the one before it (`was`) to its own (`full`) over the time it takes to fill. */
export function chuteArea(chute: { full: number; was: number; at: number; fills: number }, at: number): number {
  return chute.was + (chute.full - chute.was) * Math.min(1, Math.max(0, (at - chute.at) / chute.fills));
}

/** The booster's engine's thrust in air of a pressure, N (thrust.ts: its vacuum figure less exit area times pressure). */
export function thrustIn(plan: FlightPlan, pressure: number): number {
  const { engine } = ballisticOf(plan);
  return nozzleThrust(1, engine.thrust.vacuum.value, 1, engine.exitArea?.value ?? 0, pressure);
}

/**
 * A ballistic plan's hardware and events, found by what they are and never by their ids: what every ballistic simulator
 * (the batch above, the live vehicle, the flier ahead of it, what it sheds, its autopilot) reads the plan by.
 */
export interface Ballistic {
  craft: Craft;
  /** The body that stands on the pad, the engine on it (the one a hand's lever works) and its flow, kg/s: its sea-level thrust over g0 times its specific impulse there. */
  booster: BodyDef;
  engine: EngineDef;
  flow: number;
  /** The instant the record's clock cuts it, s from liftoff. */
  cutoff: number;
  /** The tilt programme held from liftoff; the retro attitude's pitch below the level, degrees. */
  programme: { programme: Curve; azimuth: Measure };
  retroPitch: Measure;
  /** The stack's drag going up, and the last body (the spacecraft) and its own air, heat shield first. */
  stack: { area: Measure; curve: Curve };
  spacecraft: BodyDef;
  entry: { area: Measure; drag: Curve };
  /** The joint that lets the booster go (the spacecraft's separation), and the event that lets it go by the record's clock. */
  separation: JointDef;
  parting: EventDef | undefined;
  /** The abort: the event a hand's command sets off, and the escape rocket it lights. */
  abort: EventDef | undefined;
  escape: EngineDef | undefined;
  /** The spacecraft's motors (its retrorockets): every solid that burns for a time but the escape rocket; the event that begins their sequence, and the events their own timer sets off. */
  motors: EngineDef[];
  retro: EventDef | undefined;
  chained: EventDef[];
  /** From the first motor's lighting to the last one's burning out, as the plan's sequence has them, s. */
  retroEnd: number;
  /** The record clock's instant the sequence begins at, s from liftoff (Infinity: it has none), and each motor's wait after the first, s, in the sequence's order. */
  retroAt: number;
  retroWaits: number[];
  /** The tower (what the escape rocket is on) and the pack (what the motors are on), and the joints that let each go. */
  tower: string | undefined;
  towerJoint: JointDef | undefined;
  pack: string | undefined;
  packJoint: JointDef | undefined;
  /** The parachutes: the main takes the drogue's place (`instead`); the height each comes out at coming down, m. */
  drogue: ChuteDef;
  main: ChuteDef;
  drogueHeight: number;
  mainHeight: number;
  /** What a torn canopy keeps of its drag area, where the flight says. */
  torn: Measure | undefined;
}

const roles = new WeakMap<FlightPlan, Ballistic>();
/** A ballistic plan's hardware by what it is (above): found once for a plan. */
export function ballisticOf(plan: FlightPlan): Ballistic {
  let b = roles.get(plan);
  if (!b) roles.set(plan, (b = findRoles(plan)));
  return b;
}

function findRoles(plan: FlightPlan): Ballistic {
  const craft = plan.craft[0]!;
  const booster = craft.bodies[0]!;
  const spacecraft = craft.bodies[craft.bodies.length - 1]!;
  const engine = craft.engines.find((e) => e.body === booster.id)!;
  const sea = engine.thrust.seaLevel ?? engine.thrust.vacuum;
  const isp = engine.isp!.seaLevel ?? engine.isp!.vacuum;
  const cuts = (ev: EventDef) => ev.automatic && ev.do.some((a) => 'cut' in a && a.cut === engine.id);
  const cutoff = Math.min(...plan.events.flatMap((ev) => (cuts(ev) ? ev.when.flatMap((w) => ('time' in w ? [w.time] : [])) : [])));
  const holdOf = (test: (h: Hold) => boolean) => plan.attitude.find((a) => test(a.hold))?.hold;
  const programme = holdOf((h) => 'programme' in h) as { programme: Curve; azimuth: Measure };
  const retroHold = holdOf((h) => 'retro' in h) as { retro: Measure } | undefined;
  const abort = plan.events.find((ev) => ev.when.some((w) => 'command' in w));
  const escapeId = abort?.do.flatMap((a) => ('ignite' in a && a.ignite !== engine.id ? [a.ignite] : []))[0];
  const rocket = craft.engines.find((e) => e.id === escapeId);
  const motors = craft.engines.filter((e) => e.kind === 'solid' && e.burn && e.id !== escapeId);
  const lights = (ev: EventDef) => ev.do.length > 0 && ev.do.every((a) => 'ignite' in a && motors.some((m) => m.id === a.ignite));
  const chained = plan.events.filter((ev) => lights(ev) && ev.when.every((w) => 'after' in w));
  const retro = plan.events.find((ev) => lights(ev) && !chained.includes(ev));
  // each motor's wait after the first and its burn: the last one out ends the sequence
  const lit = [retro, ...chained].flatMap((ev) => {
    if (!ev) return [];
    const wait = ev.when.reduce((w, x) => ('after' in x ? (x.wait ?? 0) : w), 0);
    return ev.do.flatMap((a) => ('ignite' in a ? [{ wait, burn: motors.find((m) => m.id === a.ignite)!.burn!.value }] : []));
  });
  const ends = lit.map((m) => m.wait + m.burn);
  const first = retro?.when.find((w) => 'time' in w);
  const letting = (body: string | undefined) => (body === undefined ? undefined : craft.joints.find((j) => j.gone.includes(body)));
  const separation = letting(booster.id)!;
  const tower = rocket?.body;
  const pack = motors[0]?.body;
  const main = craft.chutes.find((ch) => ch.instead?.length)!;
  const drogue = craft.chutes.find((ch) => ch !== main)!;
  const heightOf = (ch: ChuteDef): number => {
    const ev = plan.events.find((e) => e.do.some((a) => 'deploy' in a && a.deploy === ch.id));
    for (const w of ev?.when ?? []) if ('height' in w) return w.height;
    return Number.NEGATIVE_INFINITY;
  };
  return {
    craft,
    booster,
    engine,
    flow: sea.value / (G0 * isp.value),
    cutoff,
    programme,
    retroPitch: retroHold?.retro ?? { value: 0, confidence: 'estimated', source: 'not given: level' },
    stack: { area: craft.drag[0]!.area, curve: craft.drag[0]!.curve },
    spacecraft,
    entry: { area: spacecraft.aero!.area, drag: spacecraft.aero!.drag },
    separation,
    parting: plan.events.find((ev) => ev.automatic && ev.do.some((a) => 'separate' in a && a.separate === separation.id)),
    abort,
    escape: rocket,
    motors,
    retro,
    chained,
    retroEnd: ends.length ? Math.max(...ends) : 0,
    retroAt: first && 'time' in first ? first.time : Number.POSITIVE_INFINITY,
    retroWaits: lit.map((m) => m.wait),
    tower,
    towerJoint: letting(tower),
    pack,
    packJoint: letting(pack),
    drogue,
    main,
    drogueHeight: heightOf(drogue),
    mainHeight: heightOf(main),
    torn: plan.record?.torn,
  };
}

/** The flight at an instant between samples: the nearest kept sample at or before `t`. */
export function sampleAt(samples: readonly Sample[], t: number): Sample {
  let lo = 0;
  let hi = samples.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (samples[mid]!.t <= t) lo = mid;
    else hi = mid - 1;
  }
  return samples[lo]!;
}
