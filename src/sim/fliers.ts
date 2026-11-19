/**
 * The vehicles the one propagator (sim/predict.ts `propagate`) flies, each as a `Flier`: what pushes it at a state, what
 * it is scheduled to do and what it does by itself on the way down. Each is made from the vehicle's own description and
 * its state as the simulator holds it, and pushes with the force functions its own simulator calls; the propagator adds
 * gravity, steps them all alike and finds the marks.
 *
 *   ballistic   a ballistic plan's vehicle (Freedom 7's Redstone and capsule; fly.ts `ballisticOf`) from any instant: the
 *               engine burning on a given axis to a given cutoff, or not; the stack's drag going up and the capsule's
 *               heat shield first once it is alone and falling (fly.ts `dragArea`), through the day's wind (forces.ts
 *               `blowing`); what its sequencer will do (separation and its push, the retrorockets as fly.ts fires them,
 *               the pack); its parachutes at their heights, filling (`chuteArea`) and torn as vehicle.ts tears them.
 *   spacecraft  an orbital flight's spacecraft alone (Vostok 1's ship): flyOrbit's forces (orbital.ts
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
import { EARTH_ROTATION_RATE } from '../world/bodies.ts';
import { type EarthFrame, LIFTOFF } from '../world/earthframe.ts';
import { sunPosition } from '../world/ephemeris.ts';
import { add, cross, dot, type Geodetic, length, scale, sub, unit, type Vec3 } from '../world/frames.ts';
import { alongPublished } from '../world/meanelements.ts';
import { airDrag, blowing, skyOf } from './air.ts';
import { crossing, integrate, sensed, trapezoid } from './apparent.ts';
import { AIR_TOP } from './atmosphere.ts';
import { Descent, type DescentContext, type DownBody, downOf } from './descent.ts';
import { ballisticOf, chuteArea, dragArea, thrustIn } from './fly.ts';
import { floorAt, keptShare } from './forces.ts';
import { tearOf } from './loads.ts';
import {
  aimFor,
  aimOf,
  type DescentFlown,
  type DescentHands,
  heightsBall,
  movingAt,
  publishedOf,
  shipOf,
  shipPush,
  solarAt,
} from './orbital.ts';
import type { FlightPlan } from './plan.ts';
import type { Arrival, Burn, EventKind, Flier, Sequence, Start } from './predict.ts';
import { aboutAxis, turn } from './rigid.ts';
import { airOf as airOfStack, lawOf, type Mode, pushAhead, type Solved, sequenceOf, stackOf, stagesOf } from './staged.ts';
import type { StagedState, StagedVehicle, Step } from './stagedlive.ts';

const SPIN: Vec3 = [0, 0, EARTH_ROTATION_RATE];

/** The ground's height above the sea under a place (vehicle.ts's): the pad's own level within a kilometre of it, the sea beyond. */
export function floorOf(site: Geodetic, seaLevel: number): (here: Geodetic) => number {
  const at = floorAt(site, seaLevel);
  return (here) => at(here.latitude, here.longitude);
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
  /** The frame the state and the path are in (world/earthframe.ts): fixed at liftoff unless given. */
  frame?: EarthFrame;
}

/** A ballistic flight's vehicle from `start`, as its live simulator has it (above). `site` and `seaLevel` as fly.ts's. */
export function ballistic(plan: FlightPlan, site: Geodetic, seaLevel: number, start: Start, options: BallisticOptions = {}): Flier {
  const b = ballisticOf(plan);
  const sky = skyOf(plan);
  const blow = sky.blow;
  const burn = options.burn && start.t < options.burn.until ? options.burn : null;
  const flow = b.flow;
  const floor = floorOf(site, seaLevel);
  const frame = options.frame ?? LIFTOFF;

  // what the sequencer does from here: each instant at or after the start (one that is late happens at once)
  const seq = options.sequence ?? null;
  const chutes = seq?.chutes ?? true;
  const ahead = (x: number | undefined): number | null => (x !== undefined && Number.isFinite(x) ? Math.max(x, start.t) : null);
  const towerAt = ahead(seq?.tower);
  const separationAt = ahead(seq?.separation);
  const separationAxis = seq?.axis ?? null;
  if (separationAt !== null && !separationAxis) throw new Error('a separation to come needs the joint’s axis (Sequence.axis)');
  const packAt = ahead(seq?.retropack);
  const retroBurn = b.motors[0]?.burn?.value ?? 0;
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
  let riding = Boolean(start.riding || start.escaping);
  let alone = !start.riding;
  let chute = { full: 0, was: 0, at: 0, fills: 1 };
  // (a parachute out: the first, or the one let out instead of it)
  let main = start.out === b.main.id;
  let drogue = main || start.out === b.drogue.id;
  if (main) chute = start.chute ?? { full: b.main.dragArea.value, was: b.main.dragArea.value, at: start.t, fills: 1 };
  else if (drogue) chute = start.chute ?? { full: b.drogue.dragArea.value, was: b.drogue.dragArea.value, at: start.t, fills: 1 };
  // what the parachutes can take (vehicle.ts `worn`): one that is out tears in more air than its cloth or its lines hold
  // (one that is out at the start with nothing said of how far it has filled is taken as it is and held to nothing: full at once
  // in the air it was let out in, it would be torn by a pull it never had)
  let torn = start.chute
    ? (main && chute.full < b.main.dragArea.value) || (drogue && !main && chute.full < b.drogue.dragArea.value)
    : drogue || main;

  const place = (p: Vec3, at: number): Geodetic => frame.place(p, at);
  /** The motion through the air: over the ground, less the day's wind there. */
  const windOf = (p: Vec3, u: Vec3, at: number, altitude: number): Vec3 => {
    const over = sub(u, cross(SPIN, p));
    return blow ? sub(over, blowing(frame, blow, place(p, at), altitude, at)) : over;
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
      const air = altitude < AIR_TOP || burning ? sky.air(altitude) : null;
      if (air && altitude < AIR_TOP) {
        const wind = windOf(p, u, at, altitude);
        const speed = length(wind);
        if (speed > 0) {
          const area = dragArea(plan, riding, speed / air.soundSpeed) + (riding ? 0 : chuteArea(chute, at));
          a = scale(airDrag(wind, speed, air.density, area), 1 / m);
        }
      }
      if (burning && burn) a = add(a, scale(burn.axis(at), thrustIn(plan, air ? air.pressure : 0) / m));
      if (retros > 0) {
        // each retrorocket against the motion over the ground, pitched below the level (fly.ts)
        const up = frame.up(p, at);
        const over = sub(u, cross(SPIN, p));
        const level = sub(over, scale(up, dot(over, up)));
        const across = length(level);
        if (across > 0) {
          const pitch = b.retroPitch.value * (Math.PI / 180);
          const push = sub(scale(level, -Math.cos(pitch) / across), scale(up, Math.sin(pitch)));
          a = add(a, scale(push, (retros * b.motors[0]!.thrust.vacuum.value) / m));
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
      return !drogue ? b.drogueHeight : !main ? b.mainHeight : Number.NEGATIVE_INFINITY;
    },
    arrive(t, _r, v, _altitude, by): Arrival {
      const events: EventKind[] = [];
      let dv: Vec3 | undefined;
      if (by === 'height') {
        if (!drogue) {
          drogue = true;
          chute = { full: b.drogue.dragArea.value, was: 0, at: t, fills: b.drogue.fills.value };
          events.push('drogue');
        } else {
          main = true;
          chute = { full: b.main.dragArea.value, was: chute.full, at: t, fills: b.main.fills.value };
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
        // the two are pushed apart along the joint's axis, as every simulator parts them (fly.ts; vehicle.ts by forces.ts
        // `part`); the spacecraft's share is the booster's part of the whole
        dv = add(v, scale(separationAxis!, keptShare(b.separation.push!.value, b.separation.after!.value, b.separation.leaves!.value)));
        mass = b.separation.after!.value;
        massAt = t;
        alone = true;
        events.push('separation');
      }
      if (fires.length && t === fires[0]) events.push('retro');
      if (fires.length && t === retroEnd) events.push('burnout');
      if (t === packAt) {
        mass = b.packJoint!.after!.value;
        massAt = t;
        events.push('retropack');
      }
      retros = lit(t);
      return dv ? { events, v: dv } : { events };
    },
    settle(t, p, u, altitude, falling) {
      // what a spacecraft alone does by itself, coming down (vehicle.ts): the tower's shape gives way to the heat shield
      if (alone && falling) riding = false;
      const out = main ? b.main : b.drogue;
      if (out.strength && b.torn && !riding && !torn && (drogue || main) && altitude < AIR_TOP) {
        const wind = windOf(p, u, t, altitude);
        const q = 0.5 * sky.air(altitude).density * dot(wind, wind);
        const area = chuteArea(chute, t);
        const tear = tearOf(q, area, out.dragArea.value, {
          strength: out.strength.value,
          pull: out.pull?.value,
          torn: b.torn.value,
        });
        if (tear) {
          const left = tear.left;
          chute = { full: left, was: left, at: t, fills: 1 };
          torn = true;
        }
      }
    },
  };
}

/**
 * A spacecraft alone (an orbital plan's: Vostok 1's ship) from any instant after it has parted: the coast's forces
 * (orbital.ts `shipPush`: the air on the joined ship until the modules part and on the entry body after, `orbitDrag`), the braking burn as the
 * plan has it (the timer's, a hand's, or none: `on` at or past `Number.MAX_SAFE_INTEGER` is none), its line fixed as it
 * lights (`aimOf`), and the modules' parting; and it stops where its pilot leaves, at the ejection height, burn or no burn,
 * as flyOrbit does. Begun within the burn, the burn in progress goes on as it is: along the line it was fixed on as it
 * lit, from where the ship was then (`lit`, the run's own state at the burn's start: the line is a function of that
 * state and the Sun then, `aimOf`); without it, the line it would have lit along from the state at the start. The
 * coast's manoeuvres (orbital.ts `movesOf`) are flown as flyOrbit flies them, each along the line it lights on (one in
 * progress at the start, along the line from the state then), and the entry body's lift while a bank is held.
 */
export function spacecraft(
  plan: FlightPlan,
  frame: EarthFrame,
  site: Geodetic,
  seaLevel: number,
  start: { t: number; r: Vec3; v: Vec3 },
  options: { lit?: { r: Vec3; v: Vec3 }; descend?: Descend } = {},
): Flier {
  // (the Sun is of date: turned into the frame the state is in)
  const never = (x: number): boolean => !(x < Number.MAX_SAFE_INTEGER);
  const ship = shipOf(plan);
  const [on, off, parted] = [ship.on, ship.off, ship.parted];
  const moves = ship.moves;
  const marks = [on, off, parted, ...moves.flatMap((m) => [m.on, m.off]), ...ship.banks.map((b) => b.at)]
    .filter((x) => !never(x) && x >= start.t)
    .sort((a, b) => a - b);
  const aimAt = (t: number, r: Vec3, v: Vec3): Vec3 =>
    aimOf(
      plan,
      r,
      v,
      () => frame.fromDate(sunPosition(frame.jdTT(t))),
      () => frame.upOver(frame.place(r, t), t),
    );
  let burning = !never(on) && start.t > on && start.t < off && start.t < parted;
  let aim: Vec3 | null = burning ? (options.lit ? aimAt(on, options.lit.r, options.lit.v) : aimAt(start.t, start.r, start.v)) : null;
  // (each manoeuvre's line, fixed as it lit: one in progress at the start along the line from the state then)
  const lineOf = (m: (typeof moves)[number], t: number, r: Vec3, v: Vec3): Vec3 =>
    aimFor(
      m.aim,
      r,
      v,
      () => frame.fromDate(sunPosition(frame.jdTT(t))),
      () => frame.upOver(frame.place(r, t), t),
    );
  const lines: (Vec3 | undefined)[] = moves.map((m) =>
    start.t > m.on && start.t < m.off ? lineOf(m, start.t, start.r, start.v) : undefined,
  );
  const lifts = Boolean(ship.entry.aero.lift && ship.banks.length);
  const moving = () => moves.some((m, i) => lines[i] && since >= m.on && since < m.off);
  // (the ship as it is from the last instant it changed at: its mass, the whole ship's until the modules part, is read
  // there and not at a step's own instants, the last of which is the parting itself)
  let since = start.t;
  // (with `descend`, at the height the pilot leaves at the descent flies on from there, the followed body down to the ground)
  let down: Flier | null = null;
  const ground = floorOf(site, seaLevel);
  return {
    kind: 'coast',
    cutoff: null,
    quiet: Math.max(never(on) ? Number.NEGATIVE_INFINITY : off, ...moves.map((m) => m.off)),
    get chute() {
      return down?.chute ?? false;
    },
    radius: heightsBall(plan, site),
    ground: (here) => (down ? down.ground(here) : ground(here)),
    burning: () => !down && (burning || moving()),
    push: (at, p, u, altitude) =>
      down
        ? down.push(at, p, u, altitude)
        : shipPush(
            plan,
            since,
            sub(u, cross(SPIN, p)),
            altitude,
            burning ? aim : null,
            solarAt(frame, p, at, altitude),
            moves.length || lifts ? { push: movingAt(moves, lines, since), up: () => frame.upOver(frame.place(p, at), at) } : undefined,
          ),
    next: (t) => (down ? down.next(t) : after(marks, t)),
    below: () => (down ? down.below() : ship.floor),
    settle(t, r, v, altitude, falling) {
      down?.settle?.(t, r, v, altitude, falling);
    },
    arrive(t, r, v, altitude, by): Arrival {
      if (down) return down.arrive(t, r, v, altitude, by);
      if (by === 'height') {
        if (!options.descend) return { end: true };
        down = descending(plan, frame, seaLevel, { t }, options.descend);
        return down.arrive(t, r, v, altitude, 'time');
      }
      since = t;
      const events: EventKind[] = [];
      moves.forEach((m, i) => {
        if (t === m.on) lines[i] = lineOf(m, t, r, v);
      });
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

/** What a prediction of a descent follows: the body (`Down.bodies[].id`, descent.ts), the hands' commands, and the run, for a start part-way down. */
export interface Descend {
  follow: string;
  hands?: DescentHands;
  /** The descent flown on show (orbital.ts `flyDown`): each body's state from each instant it changed, to begin from part-way down. */
  from?: DescentFlown;
}

/**
 * One body of an orbital flight's descent from any instant of it, by the descent's own object (sim/descent.ts `Descent`,
 * which flyDown flies): its mass and drag, what it puts out by height, by time after the ejection and by hand, the
 * air's tearing. It follows `follow`: until that body is let loose it flies the one that carries it (the entry body),
 * and from the event that lets it go (thrown clear as flyDown throws it) it is that body. Begun at the coast's handing
 * over, everything is as flyDown begins it; begun part-way down, each body is as the run had it at its last change
 * before the start (`DescentFlown.states`). Down to the descent's ground.
 */
export function descending(plan: FlightPlan, frame: EarthFrame, seaLevel: number, start: { t: number }, options: Descend): Flier {
  const d = downOf(plan);
  if (!d) throw new Error('this orbital plan has no descent');
  const [first, ...rest] = d.bodies;
  if (!first) throw new Error('a descent needs its entry body');
  const given = Object.values(options.hands?.given ?? {});
  const switched = (options.hands?.switched ?? []).map((x) => x.t);
  const parted = d.parted;
  let handover: { body: DownBody; t: number; s: { r: Vec3; v: Vec3 } } | null = null;
  const ctx: DescentContext = {
    down: d,
    frame,
    seaLevel,
    ...(options.hands ? { hands: options.hands } : {}),
    ejected: { at: Number.NaN },
    loose: (event, t, s) => {
      for (const body of rest) {
        if (body.id !== options.follow || !body.with.includes(event)) continue;
        // (thrown clear against its motion through the air, as flyDown throws it)
        const wind = flying.airOf(s);
        const speed = length(wind);
        handover = { body, t, s: { r: s.r, v: body.thrown && speed > 0 ? sub(s.v, scale(wind, body.thrown.value / speed)) : s.v } };
      }
    },
    leaves: (body, t, s) => {
      if (body.id === options.follow) handover = { body, t, s };
    },
  };
  // the body flown from the start: the followed one where it had begun by then, else the one that carries it
  const states = options.from?.states;
  const begunBy = (id: string) => states?.[id]?.filter((x) => x.t <= start.t + 1e-9).at(-1);
  const own = begunBy(options.follow);
  const body = own ? (d.bodies.find((b) => b.id === options.follow) ?? first) : first;
  const was = own ?? begunBy(first.id);
  let flying = was ? Descent.restore(ctx, body, body === first, start.t, was.state) : new Descent(ctx, first, true, start.t);
  let fresh = !was;
  const out = () => flying.out.size;
  const s = (r: Vec3, v: Vec3) => ({ r, v });
  /** What `events` did, as the path marks it: the followed body's first parachute out, and any after it. */
  const marked = (before: number): EventKind[] => (out() > before ? [before === 0 ? 'drogue' : 'main'] : []);
  return {
    kind: 'coast',
    cutoff: null,
    quiet: Number.NEGATIVE_INFINITY,
    get chute() {
      return flying.filling !== null || flying.kept.size > 0;
    },
    ground: () => d.ground,
    burning: () => flying.thrustAt(flying.as) > 0,
    push: (t, r, v) => flying.push(s(r, v), t),
    next(t) {
      const f = flying.filling;
      const marks = [...given, ...switched, parted, ...(f ? [f.at + f.fills] : []), ...flying.ends(t)];
      return after(
        marks.filter((x) => Number.isFinite(x)).sort((a, b) => a - b),
        t,
      );
    },
    below: () => flying.heights()[0] ?? Number.NEGATIVE_INFINITY,
    arrive(t, r, v, _altitude, by): Arrival {
      const q = s(r, v);
      flying.as = t;
      const before = out();
      const falling = by === 'height' || dot(flying.airOf(q), r) < 0;
      // (a body begins as flyDown begins it, with only what a hand gave; what is due at that instant by itself, a
      // parachute 0 s after the ejection, follows at once: flyDown has it a step later, this flier at no later step)
      const begin = (d: Descent, at: { r: Vec3; v: Vec3 }, f: boolean) => {
        d.events(at, d.heightOf(at, t), f, true, t);
        d.events(at, d.heightOf(at, t), f, false, t);
      };
      if (fresh) begin(flying, q, falling);
      else flying.events(q, flying.heightOf(q, t), falling, false, t);
      fresh = false;
      const events = marked(before);
      if (!handover) return { events };
      const h = handover as { body: DownBody; t: number; s: { r: Vec3; v: Vec3 } };
      handover = null;
      flying = new Descent(ctx, h.body, false, t);
      begin(flying, h.s, dot(flying.airOf(h.s), h.s.r) < 0);
      return { events, v: h.s.v };
    },
    settle(t, r, v) {
      const q = s(r, v);
      flying.as = t;
      flying.wear(q, flying.heightOf(q, t), t);
    },
  };
}

/**
 * A staged launch vehicle with its engines stopped now (an orbital plan's stages: Vostok 1's R-7 with what it still
 * carries): a point mass of `mass` kg on the drag of the shape it has (staged.ts `stackOf`'s area for the record instant
 * `gone`, the latest separation among what has been let go: `StagedVehicle.shape`), through the same air, nothing more
 * let go and nothing lit, down to the ground or once round. What the deck shows on the launch vehicle (orbitdeck.ts). In
 * `frame` (the flight's: world/earthframe.ts) it goes with the plan's wind (air.ts `skyOf`); left out, through still air.
 */
export function stack(plan: FlightPlan, site: Geodetic, seaLevel: number, mass: number, gone: number, frame?: EarthFrame): Flier {
  const drag = stackOf(plan).dragArea;
  const sky = skyOf(plan);
  const blow = frame ? sky.blow : null;
  return {
    kind: 'coast',
    cutoff: null,
    quiet: Number.NEGATIVE_INFINITY,
    chute: false,
    radius: heightsBall(plan, site),
    ground: floorOf(site, seaLevel),
    burning: () => false,
    push(at, p, u, altitude) {
      const air = sky.air(altitude);
      const over = sub(u, cross(SPIN, p));
      const wind = blow && frame ? sub(over, blowing(frame, blow, frame.place(p, at), altitude, at)) : over;
      const airspeed = length(wind);
      if (!(airspeed > 0)) return [0, 0, 0];
      return scale(airDrag(wind, airspeed, air.density, drag(gone, airspeed / air.soundSpeed)), 1 / mass);
    },
    next: () => Infinity,
    below: () => Number.NEGATIVE_INFINITY,
    arrive: () => ({}),
  };
}

/** What a guided staged vehicle (`guided`) is given of the flight as it stands. */
export interface GuidedNow {
  /** The live vehicle (stagedlive.ts), whose stages, propellant and record sequence the future is flown on. */
  vehicle: StagedVehicle;
  /** The law's unknowns, as solved for the flight. */
  solved: Solved;
  /** The vehicle as it stands: each stage lit, stopped and let go, the drops let go, each integrator's sum. */
  state: Pick<StagedState, 'stages' | 'drops' | 'apparent'>;
  /** Whether the sequencer sets off the record's steps; with it off nothing is lit, cut or let go but what runs dry. */
  sequence: boolean;
  /** A hand-flown ascent (the deck's). Every ascent, the record's too, hands the spacecraft its share of the joint's push. */
  live?: boolean;
  /** How far the hands have leaned the law, radians; and the law's angle as its tangent took over, where it has. */
  trim?: { pitch: number; yaw: number };
  thetaTurn?: number | null;
  /** The plan the spacecraft flies once parted (its braking burn). */
  plan: FlightPlan;
}

/**
 * A staged launch vehicle flown on by its guidance (above, `guided`): from `start` (in the vehicle's frame, `vehicle.frame`)
 * with `now` as it stands. The law is staged.ts's (`lawOf`), its axis worked as the live vehicle and the batch run work it; the forces are theirs (`stackOf`'s thrust, drag and shape flown, the live vehicle's mass). Its
 * steps are at their instants, worked out first in one sweep over the time ahead (a stage cut on its apparent velocity at
 * the instant its integrator's sum reaches the setting: its vacuum thrust over the mass, summed, as stagedlive.ts sums
 * it), so the propagator ends a step on each; a stage runs dry when its load is gone. A stage cut on its space-fixed speed,
 * or by its guidance on the orbit reached, is cut where the path reaches that (`faster`), and what the plan lets go so
 * long after such a cut follows it. The attitude is the law's, placed (the live vehicle's
 * steering lag, a few hundredths of a degree, is not stepped), as the batch run places it.
 */
export function guided(fp: FlightPlan, site: Geodetic, seaLevel: number, start: { t: number; r: Vec3; v: Vec3 }, now: GuidedNow): Flier {
  const v = now.vehicle;
  const stages = stagesOf(fp);
  const seq = sequenceOf(fp);
  const stack = stackOf(fp);
  // (the law, the air and the path are all in the vehicle's frame)
  const law = lawOf(fp, site, v.frame, now.solved);
  const sky = skyOf(fp);
  const airOf = airOfStack(seaLevel, v.frame, sky);
  const last = stages.length - 1;
  const trim = now.trim ?? { pitch: 0, yaw: 0 };
  // the vehicle as it stands, changed by each step as it comes (only in `arrive`)
  const cur: StagedState = {
    ...v.start(),
    stages: now.state.stages.map((x) => ({ ...x })),
    drops: { ...now.state.drops },
    apparent: [...now.state.apparent],
  };
  const doneIn = (k: Step, s: StagedState): boolean =>
    k.kind === 'drop'
      ? Number.isFinite(s.drops[k.id] ?? Infinity)
      : k.kind === 'ignite'
        ? Number.isFinite(s.stages[k.stage]!.from)
        : k.kind === 'cut'
          ? Number.isFinite(s.stages[k.stage]!.to) || Number.isFinite(s.stages[k.stage]!.gone)
          : Number.isFinite(s.stages[k.stage]!.gone);
  const apply = (k: Step, t: number, into: StagedState): void => {
    if (k.kind === 'drop') {
      into.drops = { ...into.drops, [k.id]: t };
      return;
    }
    const stages = into.stages.map((x) => ({ ...x }));
    const st = stages[k.stage]!;
    if (Number.isFinite(st.gone)) return;
    if (k.kind === 'ignite' && !Number.isFinite(st.from)) st.from = t;
    else if (k.kind === 'cut' && Number.isFinite(st.from) && st.to === Infinity) st.to = t;
    // (let go and gone at once: the stagedlive.ts `settle` of a stage pressed on after its release is not predicted)
    else if (k.kind === 'separate')
      for (let j = 0; j <= k.stage; j++)
        if (!Number.isFinite(stages[j]!.gone)) {
          stages[j]!.gone = t;
          stages[j]!.loose = Math.min(stages[j]!.loose, t);
        }
    into.stages = stages;
  };
  // The steps ahead and their instants: the record's, each at its time (one due already, at the start), a cut on the
  // apparent velocity found by summing the integrator over the time ahead with the steps before it applied
  // The steps ahead and their instants: the record's, each at its time (one due already, at the start), a cut on the
  // apparent velocity found by summing the integrator over the time ahead with the steps before it applied. Worked out in
  // slices (`prepare`, which the propagator runs in its own: a few milliseconds in one go was a phone's whole frame).
  const plan: { at: number; step: Step }[] = [];
  // A stage its guidance cuts on the orbit (plan.ts `{ orbit }`): the speed at which the state last asked of the forces is on
  // the record's orbit, going as it goes (world/meanelements.ts `alongPublished`: the reading `orbitShort` falls through
  // nothing at). It moves with the place by a few hundredths of a metre a second over a step, so the step that passes it is
  // flown back to it as a fixed speed's is.
  const record = seq.stages.some((k) => k.orbit) ? publishedOf(fp, site) : null;
  const ahead = record ? pushAhead(fp) : 0;
  let seen: { r: Vec3; v: Vec3 } = { r: start.r, v: start.v };
  let onOrbit: { of: { r: Vec3; v: Vec3 }; speed: number } | null = null;
  const orbitSpeed = (): number => {
    // (less what the parting will add: staged.ts `orbitShort` cuts for the orbit the spacecraft is left on)
    if (onOrbit?.of !== seen) onOrbit = { of: seen, speed: length(alongPublished(record!, seen.r, seen.v).state.v) - ahead };
    return onOrbit.speed;
  };
  /** A stage's space-fixed speed its guidance cuts it at (a Mercury-Atlas's sustainer; the orbit's, above), or null: found as the path reaches it (`faster`). */
  const speedOf = (i: number): number | null => {
    if (seq.stages[i]!.orbit) return orbitSpeed();
    const speed = seq.stages[i]!.speed;
    return speed && !speed.apparent ? speed.value : null;
  };
  /** The speed `faster` last gave: what the step was flown back to. */
  let asked = Number.POSITIVE_INFINITY;
  /** The steps cut on a space-fixed speed still ahead, while the sequence is on. */
  const spaced: Step[] = now.sequence
    ? v.sequence.filter((k) => !doneIn(k.step, cur) && k.step.kind === 'cut' && speedOf(k.step.stage) !== null).map((k) => k.step)
    : [];
  // A stage let go so long after its own stop, where its cut is not the clock's (staged.ts `sequenceOf`: `wait`): placed
  // when the stage stops, cut or dry.
  const following: { step: Step; stage: number; wait: number }[] = [];
  const follows = (k: Step): number | null => (k.kind === 'separate' ? seq.stages[k.stage]!.wait : null);
  /** When a stage stopped, by `t`: its cut, or its running dry. Null while it burns or before it is lit. */
  const stopped = (i: number, t: number): number | null => {
    const st = cur.stages[i]!;
    if (Number.isFinite(st.to)) return st.to;
    if (!Number.isFinite(st.from)) return null;
    const dry = v.dry(i, st.from, cur);
    return dry <= t + 1e-9 ? dry : null;
  };
  /** Each step that follows a stage's stop put at its instant, once the stage has stopped. */
  const place = (t: number): void => {
    for (let j = following.length - 1; j >= 0; j--) {
      const k = following[j]!;
      const at = stopped(k.stage, t);
      if (at === null) continue;
      plan.push({ at: Math.max(at + k.wait, t), step: k.step });
      plan.sort((a, b) => a.at - b.at);
      marks = [...new Set([...marks, at + k.wait].filter((x) => x > t))].sort((a, b) => a - b);
      following.splice(j, 1);
    }
  };
  /** One more piece of the sweep ahead; false when there is no more. */
  let sweepOn: () => boolean = () => false;
  if (now.sequence) {
    const setting = (i: number): number | null => {
      const speed = seq.stages[i]!.speed;
      return speed?.apparent ? speed.value : null;
    };
    for (const k of v.sequence) {
      const wait = follows(k.step);
      if (wait !== null && !doneIn(k.step, cur)) following.push({ step: k.step, stage: (k.step as { stage: number }).stage, wait });
    }
    const ahead = v.sequence
      .filter((k) => !doneIn(k.step, cur) && !spaced.includes(k.step) && follows(k.step) === null)
      .map((k) => ({ at: Math.max(k.at, start.t), step: k.step }));
    const summed = ahead.filter((k) => k.step.kind === 'cut' && setting(k.step.stage) !== null);
    const timed = ahead.filter((k) => !summed.includes(k)).sort((a, b) => a.at - b.at);
    const sweep: StagedState = { ...cur, stages: cur.stages.map((x) => ({ ...x })), drops: { ...cur.drops } };
    const sums = [...cur.apparent];
    const pushOf = (i: number, at: number) =>
      v.burning(sweep, i, at)
        ? sensed(stages[i]!.count, stack.throttle(i, at), stages[i]!.engine.thrust.vacuum.value, v.mass(sweep, at))
        : 0;
    // (the sum's step, s: the live vehicle sums every tick by the trapezoid; this is the same sum over whole seconds, whose
    // error on a thrust over a mass that change smoothly is a few millimetres a second (a quarter of a millisecond on the cut); and only while a stage cut
    // on it burns: before, the sweep goes from one step to the next)
    const H = 1;
    let k = 0;
    const end = Math.max(start.t, ...timed.map((x) => x.at)) + 2000;
    let t = start.t;
    sweepOn = () => {
      if (!(t < end && (k < timed.length || summed.length > 0))) return false;
      while (k < timed.length && timed[k]!.at <= t + 1e-9) {
        apply(timed[k]!.step, timed[k]!.at, sweep);
        plan.push(timed[k]!);
        k++;
      }
      const event = k < timed.length ? timed[k]!.at : Number.POSITIVE_INFINITY;
      const summing = summed.some((x) => v.burning(sweep, (x.step as { stage: number }).stage, t));
      const next = summing ? Math.min(t + H, event) : Math.min(event, end);
      for (let j = summed.length - 1; j >= 0; j--) {
        const i = (summed[j]!.step as { stage: number }).stage;
        const want = setting(i)!;
        const add = trapezoid(pushOf(i, t), pushOf(i, next), next - t);
        if (add > 0 && sums[i]! + add >= want) {
          const at = crossing(t, next - t, sums[i]!, add, want);
          plan.push({ at, step: summed[j]!.step });
          apply(summed[j]!.step, at, sweep);
          summed.splice(j, 1);
        } else sums[i] = sums[i]! + add;
      }
      t = next;
      return true;
    };
  }
  let marks: number[] = [];
  // the last stage's stop: the burn under guidance ends there (the path is drawn dashed to it)
  let lastCut: number | null = null;
  let ready = false;
  /** The sweep worked on until done, or until `until` (performance.now()): whether it is done. */
  const prepare = (until = Number.POSITIVE_INFINITY): boolean => {
    if (ready) return true;
    for (let n = 1; sweepOn(); n++) if (n % 32 === 0 && performance.now() >= until) return false;
    plan.sort((a, b) => a.at - b.at);
    marks = [...new Set([...plan.map((p) => p.at), law.tVertical, law.tTurn].filter((x) => x > start.t))].sort((a, b) => a - b);
    lastCut = plan.find((p) => p.step.kind === 'cut' && p.step.stage === last)?.at ?? null;
    place(start.t);
    ready = true;
    return true;
  };
  let since = start.t;
  let thetaTurn = now.thetaTurn ?? null;
  let alone: Flier | null = null;
  const axisAt = (r: Vec3, u: Vec3, at: number): Vec3 => {
    const s = { r, v: u };
    const mode: Mode = law.modeAt(since);
    let axis = law.axisAt(s, at, mode === 'tangent' && thetaTurn === null ? 'turn' : mode, airOf(s, at).ground, thetaTurn ?? 0);
    if (trim.pitch) axis = turn(aboutAxis(law.n, trim.pitch), axis);
    if (trim.yaw) axis = turn(aboutAxis(unit(s.r), trim.yaw), axis);
    return axis;
  };
  const lit = (): boolean => stages.some((_, i) => v.burning(cur, i, since));
  return {
    get kind() {
      return lastCut !== null || spaced.some((k) => (k as { stage: number }).stage === last) ? 'guided' : 'coast';
    },
    get cutoff() {
      return lastCut;
    },
    prepare,
    get quiet() {
      return alone ? alone.quiet : Number.POSITIVE_INFINITY;
    },
    chute: false,
    radius: heightsBall(fp, site),
    ground: floorOf(site, seaLevel),
    burning: () => (alone ? alone.burning() : lit()),
    push(at, p, u, altitude) {
      if (alone) return alone.push(at, p, u, altitude);
      if (record) seen = { r: p, v: u };
      const air = sky.air(altitude);
      const over = sub(u, cross(SPIN, p));
      const wind = sky.blow ? sub(over, blowing(v.frame, sky.blow, v.frame.place(p, at), altitude, at)) : over;
      const airspeed = length(wind);
      let thrust = 0;
      for (let i = 0; i < stages.length; i++) if (v.burning(cur, i, since)) thrust += stack.thrust(i, at, air.pressure);
      const mass = v.mass(cur, at);
      let f: Vec3 = thrust > 0 ? scale(axisAt(p, u, at), thrust / mass) : [0, 0, 0];
      if (airspeed > 0)
        f = add(f, scale(airDrag(wind, airspeed, air.density, stack.dragArea(v.shape(cur), airspeed / air.soundSpeed)), 1 / mass));
      return f;
    },
    next(t) {
      if (alone) return alone.next(t);
      // (and each stage running dry, where its load runs out before its cut)
      let n = after(marks, t);
      for (let i = 0; i < stages.length; i++) {
        if (!v.burning(cur, i, since)) continue;
        const dry = v.dry(i, cur.stages[i]!.from, cur);
        if (dry > t + 1e-9 && dry < n) n = dry;
      }
      return n;
    },
    below: () => (alone ? alone.below() : Number.NEGATIVE_INFINITY),
    faster() {
      if (alone) return alone.faster?.() ?? Number.POSITIVE_INFINITY;
      let most = Number.POSITIVE_INFINITY;
      for (const k of spaced) {
        const i = (k as { stage: number }).stage;
        if (!doneIn(k, cur) && v.burning(cur, i, since)) most = Math.min(most, speedOf(i)!);
      }
      asked = most;
      return most;
    },
    arrive(t, r, u, altitude, by): Arrival {
      if (alone) return alone.arrive(t, r, u, altitude, by);
      const events: EventKind[] = [];
      // a stage cut on its speed, reached: cut now (the step was flown again to the instant it reached it)
      if (by === 'speed')
        for (const k of spaced) {
          const i = (k as { stage: number }).stage;
          if (doneIn(k, cur) || (seq.stages[i]!.orbit ? asked : speedOf(i)!) > length(u) + 1e-9) continue;
          apply(k, t, cur);
          if (i === last) {
            lastCut = t;
            events.push('cutoff');
          }
        }
      // the law's own change: the tangent takes over from the axis it had then (staged.ts `ascend`)
      if (thetaTurn === null && law.modeAt(t) === 'tangent') {
        const s = { r, v: u };
        thetaTurn = law.thetaAt(s, t, airOf(s, t).ground);
      }
      place(t);
      for (const p of plan) {
        if (p.at > t + 1e-9 || doneIn(p.step, cur)) continue;
        const parting = p.step.kind === 'separate' && p.step.stage === last;
        const before = parting ? v.mass(cur, t) : 0;
        apply(p.step, t, cur);
        if (p.step.kind === 'cut' && p.step.stage === last) events.push('cutoff');
        if (parting) {
          events.push('separation');
          since = t;
          const kept = v.mass(cur, t);
          const speed = v.separationSpeed(kept, before - kept);
          const outgoing = speed ? add(u, scale(axisAt(r, u, t), speed)) : u;
          alone = spacecraft(now.plan, v.frame, site, seaLevel, { t, r, v: outgoing });
          const then = alone.arrive(t, r, outgoing, altitude, 'time');
          return { ...then, v: then.v ?? outgoing, events: [...events, ...(then.events ?? [])] };
        }
      }
      since = t;
      return { events };
    },
  };
}

/**
 * Each stage's integrator's sum by `t` (its vacuum thrust over the mass, summed from its ignition, as stagedlive.ts sums
 * it every tick), for a vehicle whose stages stood as `state` has them: the record's run, which keeps no such sum, as the
 * live vehicle would have it. Whole seconds, by the trapezoid (as `guided` sums it).
 */
export function apparentBy(plan: FlightPlan, v: StagedVehicle, state: Pick<StagedState, 'stages' | 'drops'>, t: number): number[] {
  const stack = stackOf(plan);
  const seq = sequenceOf(plan);
  const s = { ...v.start(), stages: state.stages, drops: state.drops } as StagedState;
  return stagesOf(plan).map((st, i) => {
    const from = state.stages[i]!.from;
    if (!Number.isFinite(from) || !seq.stages[i]!.speed?.apparent) return 0;
    const push = (at: number) =>
      v.burning(s, i, at) ? sensed(st.count, stack.throttle(i, at), st.engine.thrust.vacuum.value, v.mass(s, at)) : 0;
    return integrate(push, from, t, 1).sum;
  });
}
