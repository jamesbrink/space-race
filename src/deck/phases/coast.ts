import { bankFlown } from '../../sim/entry.ts';
import { coastOf, shipOf } from '../../sim/orbital.ts';
import { clockAt } from '../../sim/plan.ts';
import { aboutAxis, conjugate, multiply, normalize, type Quat, turn } from '../../sim/rigid.ts';
import { attitudeBetween, between, descentRecords, either, orbitalFlown } from '../../sim/run.ts';
import type { LiveSample } from '../../sim/vehicle.ts';
import { DEG, type Vec3 } from '../../world/frames.ts';
import type { OrbitDeck } from '../orbitdeck.ts';
import { burnName } from './burn.ts';
import { wall } from './surface.ts';

/**
 * The coast (phase.ts): the spacecraft alone and its hand controls. The lock (`digit`), the hands freed (`freeHands`), the
 * attitude turned by the keys (`turnTo`, `push`) or as the record turned it in its periods by hand (`planHands`), and the
 * orbit taken from the record's (`takeOrbitAt`). Functions of the deck's state (orbitdeck.ts), each what was a method of it.
 */

const KEYS: Record<string, [axis: Vec3, sense: number]> = {
  w: [[0, 1, 0], 1],
  s: [[0, 1, 0], -1],
  a: [[0, 0, 1], 1],
  d: [[0, 0, 1], -1],
  q: [[1, 0, 0], -1],
  e: [[1, 0, 0], 1],
};

/** A digit on the lock: the code in order frees the hand controls, once the spacecraft is alone in orbit. */
export function digit(deck: OrbitDeck, d: string): void {
  const code = String(deck.recordPlan.record?.manual?.code?.value ?? '');
  if (!code || deck.free || deck.padImpact) return;
  const alone = deck.clock.t > deck.parting;
  deck.typed = (deck.typed + d).slice(-code.length);
  if (deck.typed !== code) return void deck.show();
  if (!alone) {
    deck.host.say?.('Hand controls', 'Not on the launch vehicle: there were none to free');
    deck.typed = '';
    return void deck.show();
  }
  if (deck.mine === null && deck.clock.t >= coastOf(deck.recordPlan).on) {
    deck.host.say?.('Hand controls', 'The braking burn has been made: the descent is the automatic system’s');
    return;
  }
  freeHands(
    deck,
    `Manual descent: not the flight of ${deck.day}. Steer with the flight controls and use the action button to fire the ${burnName(deck).toLowerCase()}`,
  );
}

/** The hand controls free: the timer's burn given up, the attitude the hand's from this instant (and the flight flown again without that burn). */
export function freeHands(deck: OrbitDeck, why: string | null): void {
  const t = deck.clock.t;
  if (manualJetsGone(deck, t)) {
    deck.host.say?.('No attitude jets', 'The instrument module carried the attitude jets away.');
    return;
  }
  deck.free = true;
  takeOrbitAt(deck, t);
  if (deck.handover) deck.planned ??= deck.givenUp();
  const [a, b, k] = either(deck.run!.samples as LiveSample[], t);
  const attitude = attitudeBetween(a, b, k);
  const drift = deck.encounters?.contacts.rotation?.(t);
  const q = drift ? multiply(attitude, conjugate(drift.delta)) : attitude;
  deck.hand = { q, t, log: [{ t, q }] };
  if (why !== null) deck.refly();
  else drawHands(deck);
  // (the timer's burn given up: nothing of the descent happens until a hand fires the engine)
  for (const id of descentRecords(deck.recordPlan)) deck.times[id] = Infinity;
  if (why) deck.host.say?.('Hand controls free', why);
  deck.show();
}

export function takeOrbitAt(deck: OrbitDeck, t: number): void {
  const plan = deck.recordPlan;
  if (deck.mine !== null || deck.handover || !plan.record?.coastFixes?.length) return;
  const coast = orbitalFlown(deck.flight).coast.samples;
  if (t < coast[0]!.t || t >= coast.at(-1)!.t) return;
  deck.handover = { t, ...between(coast, t) };
  // (taken part-way down a steered entry, it goes on from the bank the record's run had there)
  const banks = orbitalFlown(deck.flight).coast.entry?.banks;
  deck.bankTaken = banks ? bankFlown(banks, t) : null;
  deck.priorMoves = shipOf(plan).moves.filter((move) => move.on <= t).length;
}

/**
 * The record's own periods of flying by hand (`manual.periods`: Titov's, by plan, with the lock's code given him). Within
 * one, as flown, the hands have the attitude without the lock, and the flight stays the record's (the timer's burn is
 * kept: nothing a hand turns changes the coast). Out of it the lock is shut again, and what the hands left is held until
 * the automatic orientation turns the ship to its burn over a minute, as the record's own drawing turns it
 * (staged.ts `recordSamples`). Only the attitude is drawn: no jets, no gas.
 */
export function planHands(deck: OrbitDeck, t: number): void {
  const plan = deck.recordPlan;
  const periods = plan.record?.manual?.periods ?? [];
  if (!periods.length || !deck.run) return;
  const i = periods.findIndex((p) => t >= p.from.value && t < p.to.value);
  const now = i >= 0 ? i : null;
  if (now !== deck.byPlan) {
    if (now !== null) {
      deck.planBase ??= deck.run.samples as readonly LiveSample[];
      const s = deck.sampleAt(t);
      deck.hand = { q: s.attitude, t, log: [{ t, q: s.attitude }] };
      deck.host.say?.(
        'By hand, as flown',
        `${periods[now]!.what}: the flight controls steer the ship until ${wall(deck, periods[now]!.to.value)}`,
      );
    } else if (deck.byPlan !== null)
      deck.host.say?.('Hands off, as flown', `The hand controller off at ${wall(deck, periods[deck.byPlan]!.to.value)}`);
    deck.byPlan = now;
  }
  if (deck.byPlan === null || !deck.hand || !deck.planBase) return;
  turnTo(deck, t);
  const from = deck.hand.log[0]!.t;
  const q = deck.hand.q;
  // (turned to the burn's aim where the plan turns it, where that comes before the burn; else a minute before: as staged.ts recordSamples)
  const ship = shipOf(plan);
  const turned = clockAt(
    plan,
    plan.events.find((e) => e.automatic && e.do.some((a) => 'attitude' in a && a.attitude === ship.aimId)),
  );
  const oriented = turned < ship.on ? turned : ship.on - 60;
  // (the hands' attitude from where they took it until the automatic orientation, then turned over a minute to the record's)
  const samples = deck.planBase.map((x) => {
    if (x.t < from) return x;
    const k = x.t < oriented ? 0 : Math.min(1, (x.t - oriented) / 60);
    if (k >= 1) return x;
    const sign = q[0] * x.attitude[0] + q[1] * x.attitude[1] + q[2] * x.attitude[2] + q[3] * x.attitude[3] < 0 ? -1 : 1;
    const a = normalize([0, 1, 2, 3].map((j) => q[j]! + (sign * x.attitude[j]! - q[j]!) * k) as unknown as Quat);
    return { ...x, attitude: a, axis: turn(a, [1, 0, 0]) };
  });
  deck.run = { ...deck.run, samples };
  deck.host.fly(deck.run);
}

export function drawHands(deck: OrbitDeck): void {
  const run = deck.run!;
  const samples = (run.samples as LiveSample[]).map((s) => ({ ...s }));
  deck.handSamples(samples, shipOf(deck.planned ?? deck.recordPlan));
  deck.run = { ...run, samples, fires: deck.fires() };
  deck.host.fly(deck.run);
}

export function handAxis(deck: OrbitDeck, t: number): Vec3 {
  const drift = deck.encounters?.contacts.rotation?.(t);
  return turn(drift ? multiply(deck.hand!.q, drift.delta) : deck.hand!.q, [1, 0, 0]);
}

export function manualJetsGone(deck: OrbitDeck, t: number): boolean {
  if (t < deck.parts) return false;
  const craft = deck.recordPlan.craft[0]!;
  const jets = craft.thrusters.find((set) => set.mode === 'manual' && set.rate);
  const brake = craft.engines.find((e) => e.flown);
  return !!jets && !!brake && craft.joints.some((joint) => joint.gone.includes(brake.body) && joint.gone.includes(jets.body));
}

/** Turn the hand's attitude on to `t` by the keys held and the finger's stick. */
export function turnTo(deck: OrbitDeck, t: number): void {
  const h = deck.hand;
  if (!h || deck.fired !== null) return;
  const until = manualJetsGone(deck, t) ? deck.parts : t;
  const from = h.t;
  const dt = until - from;
  h.t = t;
  const push = pushOf(deck);
  const steering = dt > 0 && (push.pitch !== 0 || push.yaw !== 0 || push.roll !== 0) && until >= h.log[0]!.t;
  if (t < from || h.log.at(-1)!.t > from) {
    // Browsing the tape preserves every recorded turn. A new command branches where the stick was taken.
    const at = steering ? from : until;
    let i = h.log.length - 1;
    while (i > 0 && h.log[i]!.t > at) i--;
    h.q = h.log[i]!.q;
    if (steering) h.log.length = i + 1;
  }
  // (the hand controller's rate: the thruster set worked by hand; a craft with none, an uncrewed target, is not turned by
  // the keys at all, where it threw and stopped the deck)
  const manual = deck.recordPlan.craft[0]!.thrusters.find((x) => x.mode === 'manual' && x.rate);
  if (!steering || !manual) return;
  const rate = manual.rate!.value * DEG;
  let q = h.q;
  q = normalize(multiply(q, aboutAxis(KEYS.w![0], push.pitch * rate * dt)));
  q = normalize(multiply(q, aboutAxis(KEYS.a![0], push.yaw * rate * dt)));
  q = normalize(multiply(q, aboutAxis(KEYS.e![0], push.roll * rate * dt)));
  h.q = q;
  h.log.push({ t: until, q });
}

/** Which way the hands push, each -1 to 1: the keys held, and the finger's stick and roll laid over them. */
export function pushOf(deck: OrbitDeck, fine = 1): { pitch: number; yaw: number; roll: number } {
  const axis = (plus: string, minus: string, finger: number) =>
    Math.max(-1, Math.min(1, fine * (Number(deck.held.has(plus)) - Number(deck.held.has(minus))) + finger));
  return { pitch: axis('w', 's', deck.finger.pitch), yaw: axis('a', 'd', deck.finger.yaw), roll: axis('e', 'q', deck.finger.roll) };
}
