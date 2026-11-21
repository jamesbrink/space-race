import { advanceTo, aimed, type AttitudeState, stepAttitude } from '../../sim/attitude.ts';
import { type CraftState, type CraftVehicle, craftVehicle } from '../../sim/craftlive.ts';
import { handRange } from '../../sim/lever.ts';
import {
  aimFor,
  aimOf,
  coastEngineState,
  coastEvents,
  coastOf,
  craftAt,
  crewWords,
  heightsBall,
  type Move,
  shipOf,
} from '../../sim/orbital.ts';
import { clockAt, type EngineDef, type FlightPlan } from '../../sim/plan.ts';
import { needsTarget, steeredKind } from '../../sim/pursuit.ts';
import { multiply, turn } from '../../sim/rigid.ts';
import type { Steering } from '../../sim/steering.ts';
import { orbitalFlown, type Run } from '../../sim/run.ts';
import { byHand, madeBy } from '../../sim/staged.ts';
import { type LiveSample, TICK } from '../../sim/vehicle.ts';
import { G0 } from '../../world/bodies.ts';
import { sunPosition } from '../../world/ephemeris.ts';
import { add, angleBetween, cross, DEG, length, scale, siteFrame, sub, unit, type Vec3 } from '../../world/frames.ts';
import { KEEP, MOST, type ThrottleView } from '../deck.ts';
import type { OrbitDeck } from '../orbitdeck.ts';
import { controlsOf, handAxis, logged, turnTo } from './coast.ts';

/**
 * A burn (phase.ts): the coast's braking burn (`burnNext`, `fire`, `retroWhy`) and the record's manoeuvres (`nextMove`,
 * `move`), each lit by a hand and flown live (sim/craftlive.ts) on the one lever until it stops: cut by the lever or Cut, dry,
 * cut by the braking engine's integrator, or a solid spent (`burnOn`). Then it is written into the plan as what it was
 * (staged.ts `madeBy`, `byHand`'s `made`: lit and cut at its instants, its impulse the one it gave) and the rest of the
 * flight flown again from where it left the spacecraft (`OrbitDeck.burnt`). Functions of the deck's state (orbitdeck.ts).
 *
 * Its axis at each tick is the attitude's: the rigid body's (sim/attitude.ts), stepped with the burn's own ticks, where the
 * craft's jets are hardware; else the hand's. With guidance on (G) as it lights, the computer steers it (sim/steering.ts,
 * `CraftVehicle.guide`): solved for what the record's burn was for where that needs no target, else External ΔV of
 * the record's impulse along the record's line at the lighting; its thrust line each tick is the line the axis is pointed
 * along (through the autopilot, or at once for a craft turned by hand) and its cut an instant the engine stops at.
 */

/** How near its burn's line guidance lights a burn on a craft its jets turn, radians: estimated, the game's (the computer's own test is not modelled). */
const ALIGNED = 5 * DEG;

/** A burn lit by hand and flown live until it stops (`burnOn`): what it stands for and how it is drawn. */
export interface LiveBurn {
  /** A manoeuvre of the record's (`movesOf`, by `index`), or the coast's braking burn. */
  kind: 'move' | 'braking';
  index: number;
  engine: string;
  label: string;
  craft: CraftVehicle;
  state: CraftState;
  /** From the coast's point to the spacecraft's centre of mass, as the run's samples draw it (staged.ts `recordSamples`). */
  offset: Vec3;
  /** The sample it lit at: what a sample of it keeps of the run's that the craft does not fly. */
  template: LiveSample;
  /** How many of the run's samples are kept (one a tenth of a second, and at its stop), and how many of its notes said. */
  kept: number;
  heard: number;
  /** Guidance's steering of it, where G was on as it lit (and not thrown off since), or null. */
  steering: Steering | null;
  /** The rigid body's state, stepped with the burn's ticks, where the craft's jets are hardware. */
  att?: AttitudeState;
}

/**
 * Whether the coast's burn is the next thing a hand could do, which Space then does: once alone, with the hands free (a
 * lock opened), or, for a spacecraft whose hand controls had no lock (`PlanRecord.manual` without a `code`), before the
 * record's own burn is made: its pilot's next act in the record's order, before the parting that follows it.
 */
export function burnNext(deck: OrbitDeck, t = deck.clock.t): boolean {
  if (deck.can('retro')) return true;
  const manual = deck.recordPlan.record?.manual;
  if (!deck.on || deck.burn || !manual || manual.code || deck.free || deck.fired !== null || !(t > deck.parting)) return false;
  if (deck.mine === null && t >= coastOf(deck.recordPlan).on) return false;
  return retroWhy(deck) === null;
}

/** The action for the coast's burn, with any wording the plan supplies. */
export function burnAsked(deck: OrbitDeck): string {
  return coastEvents(deck.recordPlan).on?.asked ?? `Fire the ${burnName(deck).toLowerCase()}`;
}

/** The coast's burn as the plan names it ('Braking engine', 'Retrorockets'): what the deck calls it. */
export function burnName(deck: OrbitDeck): string {
  return coastEvents(deck.recordPlan).burn?.label ?? 'Braking engine';
}

/** Whether the record's own braking burn was fired by hand: its command within one of the record's periods of orientation by hand. */
export function burnByHand(deck: OrbitDeck): boolean {
  const plan = deck.recordPlan;
  const events = coastEvents(plan);
  const command = clockAt(plan, events.command ?? events.on);
  return (plan.record?.manual?.periods ?? []).some((p) => command >= p.from.value && command <= p.to.value + 1e-6);
}

/** Light the braking engine by hand, along the long axis as it points: flown live from here (`burnOn`). */
export function fire(deck: OrbitDeck, t: number): void {
  const deltaV = deck.recordPlan.record?.manual && coastEvents(deck.recordPlan).burn?.deltaV;
  const engine = coastEvents(deck.recordPlan).burn;
  if (!deltaV || !engine || deck.parts <= t) return;
  light(deck, t, { kind: 'braking', index: -1, engine, label: burnName(deck), cutAt: deltaV.value });
}

/**
 * The record's next manoeuvre a hand that is free can fire now, or null: the hands free, nothing burning from the last,
 * the coast's burn not yet fired, and the thrusters still aboard (their body not let go by the clock on the flight as it
 * stands).
 */
export function nextMove(deck: OrbitDeck, t = deck.clock.t): Move | null {
  if (!deck.free || deck.hand === null || deck.fired !== null || deck.aborted) return null;
  const plan = deck.recordPlan;
  const index = deck.priorMoves + deck.moved.length;
  const m = shipOf(plan).moves[index];
  if (!m) return null;
  // (not while a burn burns; and not before the record's own last manoeuvre has ended where the hands took over in it)
  if (deck.burn) return null;
  const previous = shipOf(plan).moves[index - 1];
  if (previous && !deck.moved.length && t < previous.off) return null;
  const base = deck.planned ?? deck.givenUp();
  const engine = plan.craft[0]!.engines.find((e) => e.id === m.engine)!;
  const resources = coastEngineState(base, engine.id, t);
  if (engine.tanks.length && (resources.starts <= 0 || resources.kg <= 0)) return null;
  const body = engine.body;
  const joint = plan.craft[0]!.joints.find((j) => j.gone.includes(body));
  const parting = joint && base.events.find((e) => e.do.some((a) => 'separate' in a && a.separate === joint.id));
  if (parting && clockAt(base, parting) <= t) return null;
  return m;
}

/** The record's next manoeuvre's engine lit by hand now, along the long axis as the hand holds it: flown live from here (`burnOn`). */
export function move(deck: OrbitDeck, t: number): void {
  const m = nextMove(deck);
  if (!m) return;
  const engine = deck.recordPlan.craft[0]!.engines.find((e) => e.id === m.engine)!;
  light(deck, t, { kind: 'move', index: deck.priorMoves + deck.moved.length, engine, label: m.label });
}

/**
 * An engine lit by hand at `t`: the craft taken up from the run on show there (the coast's state, the ship's mass less what
 * its tanks have given, the engine's starts left: orbital.ts `craftAt`) and its first tick flown, the engine lit in it (or
 * not, and the deck told why). The lever, where it stands under the engine's least, is put full: a hand lighting an engine
 * has it open. The run is cut at the lighting; `burnOn` flies the rest live.
 */
function light(
  deck: OrbitDeck,
  t: number,
  what: { kind: LiveBurn['kind']; index: number; engine: EngineDef; label: string; cutAt?: number },
): void {
  turnTo(deck, t);
  const plan = deck.planned ?? deck.givenUp();
  const id = what.engine.id;
  const at = deck.sampleAt(t);
  // (the coast's point is the centre of mass less the offset it had as the spacecraft parted: staged.ts recordSamples)
  const parted = (deck.ascended ?? orbitalFlown(deck.flight).ascent).samples.at(-1)!;
  const offset = scale(parted.axis, deck.centre);
  const own = craftAt(plan, t, [id]);
  const craft = craftVehicle(plan, deck.frame, deck.flight.site.seaLevel.value, {
    engines: [id],
    ...(what.cutAt !== undefined ? { cutAt: { [id]: what.cutAt } } : {}),
    ...(plan.record?.orbit ? { radius: heightsBall(plan, siteFrame(deck.flight.site)) } : {}),
  });
  const range = handRange(what.engine);
  if (range && deck.lever.at < range.least - 1e-9) deck.leverTo(range.most);
  // (the rigid body flown to the lighting itself: from here it is stepped with the burn's ticks)
  const a = deck.attitude;
  const h = deck.hand!;
  const att = a && h.att ? advanceTo(a, h.att, controlsOf(deck), t) : undefined;
  const axis = att ? turn(att.q, [1, 0, 0]) : handAxis(deck, t);
  const s0 = craft.start({ t, r: sub(at.centre, offset), v: at.v, mass: own.mass, tanks: own.tanks, starts: own.starts, axis });
  const { rails: _, rotation: __, throttles: ___, ...template } = at;
  const guided = deck.guidesBurns(t);
  // (guidance lights a burn in its attitude, as the computer did, turned there by the autopilot first: `burnAim`)
  const wanted = guided && att ? burnAim(deck, t) : null;
  const off = wanted ? angleBetween(axis, wanted) : 0;
  if (off > ALIGNED) {
    deck.host.say?.('Not lit', `Guidance is turning to the burn's attitude: ${(off / DEG).toFixed(0)} degrees to go`);
    return;
  }
  const steering = guided ? steerOf(deck, plan, craft, { ...s0, lever: deck.lever.at }, what) : null;
  const burn: LiveBurn = { ...what, engine: id, craft, state: s0, offset, template, kept: 0, heard: 0, steering, ...(att ? { att } : {}) };
  const s1 = tickBurn(deck, burn, s0, [id]);
  if (!craft.burning(s1, id)) {
    for (const n of s1.said) deck.host.say?.(n.title, n.text);
    return;
  }
  burn.state = s1;
  burn.heard = s1.said.length;
  if (burn.att) Object.assign(h, { att: burn.att, t: s1.t, q: burn.att.q });
  const run = deck.run!;
  const samples = (run.samples as LiveSample[]).filter((x) => x.t < t - 1e-9);
  samples.push(sampleOf(deck, burn, s0, true, att), sampleOf(deck, burn, s1));
  burn.kept = samples.length;
  deck.burn = burn;
  // (while it burns its fire is drawn from its lighting, on and on: the run's fires as they would be with it burning)
  const fires =
    what.kind === 'braking'
      ? deck.fires({ on: t, off: Infinity })
      : deck.fires(
          undefined,
          madeBy(deck.recordPlan, plan, what.index, { on: t, off: Number.MAX_SAFE_INTEGER / 2, axis, flown: 0, mass: own.mass }),
        );
  deck.run = { ...run, samples, duration: Infinity, fires };
  deck.host.fly(deck.run);
  deck.host.say?.(
    what.label,
    `Lit by hand${range ? ` at ${Math.round(craft.share(s1, id) * 100)} %` : ''}: ${
      what.engine.kind === 'solid'
        ? 'a solid, it burns until it is spent'
        : steering
          ? 'guidance steers it and cuts it'
          : 'cut it with the lever, or Cut'
    }`,
  );
  if (!deck.clock.running) deck.clock.play(true);
}

/**
 * Where guidance points the nose before a burn it will steer (as the computer turned the craft to its burn attitude before
 * ignition): along the line the next burn a hand can light would push, as its record's attitude gives it now (the nose's
 * way for an engine that pushes toward the tail), or null where none is next.
 */
export function burnAim(deck: OrbitDeck, t: number): Vec3 | null {
  const m = nextMove(deck, t);
  const engine = m
    ? deck.recordPlan.craft[0]!.engines.find((e) => e.id === m.engine)
    : burnNext(deck, t)
      ? coastEvents(deck.recordPlan).burn
      : undefined;
  if (!engine || engine.kind === 'solid') return null;
  const s = deck.sampleAt(t);
  // (from the centre of mass, which the attitude drawn does not move)
  const r = s.centre ?? s.r;
  const frame = deck.frame;
  const sun = () => frame.fromDate(sunPosition(frame.jdTT(t)));
  const up = () => frame.upOver(frame.place(r, t), t);
  try {
    const push = m ? scale(aimFor(m.aim, r, s.v, sun, up), m.accel < 0 ? -1 : 1) : aimOf(deck.planned ?? deck.givenUp(), r, s.v, sun, up);
    return scale(push, engine.astern ? -1 : 1);
  } catch {
    // (a coast with no aim for its burn: nothing to turn to)
    return null;
  }
}

/**
 * Guidance's steering of a burn lit now (sim/craftlive.ts `guide`): for a manoeuvre of the record's, what it was for where
 * that is solved without a target, else its impulse along its line as the record's attitude gives it here; for the braking
 * burn, its integrator's impulse along the coast's aim. Null where there is nothing to steer to (a solid).
 */
function steerOf(
  deck: OrbitDeck,
  plan: FlightPlan,
  craft: CraftVehicle,
  s: CraftState,
  what: { kind: LiveBurn['kind']; index: number; engine: EngineDef; cutAt?: number },
): Steering | null {
  const frame = deck.frame;
  const sun = () => frame.fromDate(sunPosition(frame.jdTT(s.t)));
  const up = () => frame.upOver(frame.place(s.r, s.t), s.t);
  if (what.kind === 'braking') {
    if (what.cutAt === undefined) return null;
    try {
      return craft.guide(s, what.engine.id, { line: aimOf(plan, s.r, s.v, sun, up), size: what.cutAt });
    } catch {
      // (a coast with no aim for its burn: the hands point it)
      return null;
    }
  }
  const m: Move | undefined = shipOf(deck.recordPlan).moves[what.index];
  if (!m) return null;
  const line = scale(aimFor(m.aim, s.r, s.v, sun, up), m.accel < 0 ? -1 : 1);
  const toward = m.toward && steeredKind(m.toward) && !needsTarget(m.toward) ? m.toward : undefined;
  return craft.guide(s, what.engine.id, { line, size: Math.abs(m.accel) * (m.off - m.on), ...(toward ? { toward } : {}) });
}

/**
 * One tick of a burn flown live: guidance's thrust line (where it steers) the axis is pointed along and its cut, the axis
 * the attitude's at the tick's start, the craft's tick, what the accelerometers sensed given back to guidance, and the rigid
 * body stepped over the same tick (or, a craft turned by hand, pointed at once).
 */
function tickBurn(deck: OrbitDeck, burn: LiveBurn, s: CraftState, light?: string[], frame = s.t): CraftState {
  const st = burn.steering;
  const engine = burn.craft.engines[0]!;
  let aim: Vec3 | null = null;
  let stop: Record<string, number> | undefined;
  if (st && (light || burn.craft.burning(s, burn.engine))) {
    const thrust = st.thrustAt({ r: s.r, v: s.v }, s.t);
    if (length(thrust) > 0) aim = scale(unit(thrust), engine.def.astern ? -1 : 1);
    if (st.cutAt !== undefined) stop = { [burn.engine]: st.cutAt };
  }
  const a = deck.attitude;
  const h = deck.hand!;
  if (!burn.att && aim) {
    h.q = aimed(h.q, aim);
    const last = h.log.at(-1)!;
    if (angleBetween(turn(last.q, [1, 0, 0]), turn(h.q, [1, 0, 0])) > 0.5 * DEG) h.log.push({ t: s.t, q: h.q });
  }
  const axis = burn.att ? turn(burn.att.q, [1, 0, 0]) : aim ? turn(h.q, [1, 0, 0]) : handAxis(deck, frame);
  const before = s.burns.at(-1)?.push ?? [0, 0, 0];
  const opened = s.burns.length;
  const next = burn.craft.tick(s, { axis, lever: deck.lever.at, ...(light ? { light } : {}), ...(stop ? { stop } : {}) });
  if (st && next.burns.length) st.felt(sub(next.burns.at(-1)!.push, next.burns.length > opened ? [0, 0, 0] : before), 1);
  if (burn.att && a) {
    burn.att = stepAttitude(a, burn.att, { ...controlsOf(deck, aim), mass: s.mass });
    logged(deck, burn.att);
  }
  return next;
}

/** A state of a burn flown live as the run's sample: the template's, moved to where the craft is and lying as the hand holds it. */
function sampleOf(deck: OrbitDeck, burn: LiveBurn, s: CraftState, before = false, att = burn.att): LiveSample {
  const centre = add(s.r, burn.offset);
  const drift = deck.encounters?.contacts.rotation?.(s.t);
  const q = att ? att.q : drift ? multiply(deck.hand!.q, drift.delta) : deck.hand!.q;
  const axis = turn(q, [1, 0, 0]);
  const here = deck.frame.place(s.r, s.t);
  const wind = sub(s.v, cross(deck.frame.spin, s.r));
  const thrust = before ? 0 : burn.craft.thrustOf(s, burn.engine);
  const share = burn.craft.share(s, burn.engine);
  return {
    ...burn.template,
    t: s.t,
    r: sub(centre, scale(axis, deck.centre)),
    v: s.v,
    centre,
    axis,
    attitude: q,
    altitude: here.height,
    latitude: here.latitude,
    longitude: here.longitude,
    speed: length(s.v),
    groundSpeed: length(wind),
    g: thrust / s.mass / G0,
    mass: s.mass,
    alpha: angleBetween(axis, wind) / DEG,
    burning: thrust > 0 ? [{ engine: burn.engine, thrust }] : [],
    ...(thrust > 0 && share < 1 ? { throttles: { [burn.engine]: share } } : {}),
  };
}

/**
 * The burn flown live up to the clock (no more than `MOST` a frame, as the ascent is): a tick at a time on the hand's
 * attitude and the lever, a sample kept each tenth of a second and where it stops. Stopped, it is written into the plan and
 * the rest of the flight flown again from there (`burnt`).
 */
export function burnOn(deck: OrbitDeck, t: number): void {
  const burn = deck.burn!;
  let s = burn.state;
  if (t <= s.t) return;
  // (a craft turned by hand: the keys turn it on to the clock; a rigid body is stepped with the ticks below)
  if (!burn.att) turnTo(deck, t);
  const run = deck.run! as Run & { samples: LiveSample[] };
  const upTo = s.t + Math.min(t - s.t, MOST);
  let lit = true;
  while (s.t < upTo - TICK / 2) {
    s = tickBurn(deck, burn, s, undefined, t);
    lit = burn.craft.burning(s, burn.engine);
    const last = run.samples[burn.kept - 1]!;
    const end = !lit || s.t >= upTo - TICK / 2;
    if (lit && !end && s.t - last.t < KEEP - TICK / 2) continue;
    run.samples.length = burn.kept;
    run.samples.push(sampleOf(deck, burn, s));
    if (!lit || s.t - last.t >= KEEP - TICK / 2) burn.kept = run.samples.length;
    if (!lit) break;
  }
  burn.state = s;
  if (burn.att) Object.assign(deck.hand!, { att: burn.att, t: s.t, q: burn.att.q });
  for (const n of s.said.slice(burn.heard)) deck.host.say?.(n.title, n.text);
  burn.heard = s.said.length;
  if (lit) {
    // (the run's samples grow in place, as the ascent's do: the scene reads them as they come)
    if (t - s.t > MOST) deck.clock.seek(s.t);
    return;
  }
  made(deck);
}

/** The burn flown live has stopped: written into the plan as it was made, and the flight flown on from where it left it. */
function made(deck: OrbitDeck): void {
  const burn = deck.burn!;
  const s = burn.state;
  const b = s.burns.at(-1)!;
  deck.burn = null;
  deck.craftTicks += s.ticks;
  // (the ship as the burn left it: the rigid body's moments are read at its mass from here)
  if (deck.hand?.att) deck.hand.mass = s.mass;
  const base = deck.planned ?? deck.givenUp();
  const engine = burn.craft.engines[0]!;
  // (the line it pushed along on the whole: the nose's way for one that pushes toward the tail, as the plan's aim is read)
  const line = length(b.push) > 0 ? scale(unit(b.push), engine.def.astern ? -1 : 1) : s.axis;
  const done = { off: b.off, flown: b.sensed, mass: b.mass };
  if (burn.kind === 'move') {
    deck.planned = madeBy(deck.recordPlan, base, burn.index, { on: b.on, axis: line, ...done });
    deck.moved.push(b.on);
  } else {
    deck.planned = byHand(base, b.on, line, done);
    deck.fired = b.on;
  }
  deck.burnt = { t: s.t, r: s.r, v: s.v, past: (deck.run!.samples as LiveSample[]).slice() };
  deck.refly();
  const why = {
    cut: 'Cut',
    lever: 'Cut by the lever',
    dry: 'Tanks empty',
    integrator: 'Cut by its integrator',
    spent: 'Burned out',
    guidance: 'Cut by guidance',
    gone: 'Staged',
    broke: 'Broke up',
  }[b.ended ?? 'cut'];
  deck.host.say?.(
    burn.label,
    `${why}: ${(b.off - b.on).toFixed(1)} s, ${b.sensed.toFixed(1)} m/s${engine.tank ? `, ${b.fuel.toFixed(0)} kg drawn` : ''}`,
  );
}

/** What the lever works in the coast: the burn flown live, or the engine Space lights next (the lever set for it), or nothing. */
export function coastThrottle(deck: OrbitDeck): ThrottleView | null {
  const burn = deck.burn;
  if (burn) {
    const s = burn.state;
    const e = burn.craft.engines[0]!;
    const thrust = burn.craft.thrustOf(s, e.id);
    return {
      engines: e.label,
      burning: thrust > 0,
      range: e.range,
      thrust,
      left: e.tank ? (s.tanks[e.tank] ?? 0) : 0,
      flow: e.flow * burn.craft.share(s, e.id),
      isp: e.exhaust / G0,
      mass: s.mass,
    };
  }
  const t = deck.clock.t;
  const m = nextMove(deck);
  const engine = m
    ? deck.recordPlan.craft[0]!.engines.find((e) => e.id === m.engine)
    : burnNext(deck)
      ? coastEvents(deck.recordPlan).burn
      : undefined;
  if (!engine || t >= deck.parts) return null;
  const plan = deck.planned ?? deck.givenUp();
  const own = craftAt(plan, t, [engine.id]);
  const tank = engine.tanks[0];
  return {
    engines: engine.label,
    burning: false,
    range: handRange(engine),
    thrust: 0,
    left: tank && tank in own.tanks ? own.tanks[tank]! : 0,
    flow: 0,
    isp: engine.isp?.vacuum.value ?? 0,
    mass: own.mass,
    ...(engine.kind === 'solid' ? { not: 'fired whole by Space' } : { doing: 'Space lights it' }),
  };
}

/** Why the braking engine cannot be fired now by a hand that is free, or null: it went with the instrument module, or he has left. */
export function retroWhy(deck: OrbitDeck): string | null {
  const t = deck.clock.t;
  if (deck.aborted && deck.planned && shipOf(deck.planned).moves.some((move) => t < move.off))
    return 'The abort propulsion sequence is in progress';
  if (deck.handover && deck.handover.t >= coastOf(deck.recordPlan).on) return 'The deorbit firing has already started';
  const plan = deck.planned ?? (deck.free ? deck.givenUp() : deck.recordPlan);
  const engine = coastEvents(plan).burn;
  if (engine?.tanks.length) {
    const state = coastEngineState(plan, engine.id, t);
    if (state.starts <= 0) return 'No engine starts left';
    if (state.kg <= 0) return 'The propulsion tanks are empty';
  }
  if (deck.parts <= t) return 'Gone with the instrument module: the modules have parted';
  const down = deck.flown?.down;
  if (down && down.ejected <= t && deck.recordPlan.craft[0]!.crew?.alone)
    return `${crewWords(deck.recordPlan.craft[0]!.crew).who} has left the ship`;
  return null;
}
