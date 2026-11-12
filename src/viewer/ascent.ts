import * as THREE from 'three';
import { atmosphere } from '../sim/atmosphere.ts';
import { axisOf, flownOnce, type Sample } from '../sim/fly.ts';
import { normalize, type Quat, turn, unturn } from '../sim/rigid.ts';
import { recordRelease, type ShedRun, Sheds } from '../sim/shed.ts';
import type { LiveSample } from '../sim/vehicle.ts';
import type { ChuteDef, Flight } from '../types';
import { EARTH_ROTATION_RATE } from '../world/bodies.ts';
import {
  cross,
  ecefToGeodetic,
  ecefToSite,
  ecefToSiteDirection,
  inertialToEcef,
  inertialToEcefVelocity,
  length,
  type Site,
  scale,
  siteFrame,
  sub,
  unit,
  type Vec3,
} from '../world/frames.ts';

/**
 * The vehicle off the pad: where the simulator (sim/fly.ts) has it at an instant, in the scene's
 * frame, and which way it points. Only the flight's data is read: the trajectory it is flown
 * from, and `Flight.flies` for which model goes and what leaves it on the way.
 *
 * The run's samples are half a second apart, in the frame that does not turn; between them the
 * position is a cubic through both ends' positions and velocities, so the path has no corners for
 * a chase camera to show. It is then put in the Earth's turning axes and in the site's frame,
 * which is flat: 487 km downrange the sea is 18.6 km below the site's level, and the vehicle is
 * drawn where it truly is relative to the pad, under a ground that is not modelled there.
 *
 * Attitude, as the simulator has it: going up, the gyros' tilt programme; from separation the
 * spacecraft turns evenly until `flies.turned`, after which it rides heat shield first, into its
 * motion through the air (which, under a parachute, is nose up). The turn's path and the pilot's
 * own attitude changes are not flown. The model keeps its roll about its axis from the pad.
 *
 * Before liftoff and after the landing the vehicle is not flying, and the scene shows the
 * inventory: the stack on its pad.
 *
 * A flight being flown by hand (sim/vehicle.ts, by way of `use`) is shown the same way from its
 * own samples, which carry the body's whole attitude: the model turns as the rigid body does,
 * about its centre of mass, and what it sheds leaves when the pilot lets it go. Such a run has no
 * end until it is put away: after the landing the spacecraft stays where it came down.
 *
 * Parachutes (`Flight.flies.chutes`) are out from when the run says (`Run.out`): `chute` gives each
 * one's moment for viewer/chute.ts to draw: how long it has been out against how long it takes to
 * fill, the motion through the air it streams along, and, on a flight flown by hand, how long it
 * has been down. Something that leaves `under` a parachute (a drop) is not dropped but left
 * behind in the air on it, slowing to a drift, and is lost to sight in a few seconds: drawn.
 */

/** A flight for the scene to show: the record's, or one being flown. */
export interface Run {
  /** In order of time. A live run's are `LiveSample`s. */
  samples: readonly Sample[];
  /** When it came down, seconds from liftoff: Infinity until it has. */
  duration: number;
  /** When the engine stopped: Infinity while it burns. */
  cutoff: number;
  /** When each of `Flight.flies.drops` left, in their order: Infinity for one still aboard. */
  dropped: number[];
  /** Flown by hand: placed by its samples' own attitude, and kept on show after it lands. */
  live: boolean;
  /** When each parachute came out: Infinity for one that has not. */
  out: { drogue: number; main: number };
  /** What it has let go, each flown beside it (sim/shed.ts): a live run's. The record's are made here. */
  sheds?: Sheds;
}

/** A parachute at an instant, for viewer/chute.ts to draw. */
export interface ChuteMoment {
  /** Seconds since it came out, and how long the simulator takes to fill it. */
  since: number;
  fills: number;
  /** What it hangs from is moving through the air this way, m/s in the scene's frame: it streams the other way. */
  air: THREE.Vector3;
  /** Up, where it is. */
  up: THREE.Vector3;
  /** 1, or less as it is lost to sight, let go with what it carried off. */
  seen: number;
  /** Seconds since the landing on a flight flown by hand (it collapses), else -1; and the height of the surface it came down on, in the scene's frame. */
  down: number;
  floor: number;
}

export class Ascent {
  /** The model that flies. */
  readonly model: string;
  private readonly flight: Flight;
  private readonly site: Site;
  private record: Run | null = null;
  private live: Run | null = null;
  private axis: ((t: number) => Vec3) | null = null;
  /** The offset of the model's origin from the point flown, in the model's frame on the pad, and as it stood at separation. */
  private readonly home = new THREE.Vector3();
  private readonly arc = new THREE.Quaternion();

  private constructor(flight: Flight) {
    this.flight = flight;
    this.model = flight.flies!.model;
    this.site = siteFrame(flight.site);
    const def = flight.models.find((m) => m.id === this.model);
    this.home.set(...(def?.position ?? [0, 0, 0]));
  }

  /** The flight's ascent, or null if it cannot be flown or names no model to fly. */
  static of(flight: Flight): Ascent | null {
    return flight.trajectory && flight.flies && flight.models.some((m) => m.id === flight.flies!.model) ? new Ascent(flight) : null;
  }

  /** Show a flight being flown by hand instead of the record's, or (null) the record's again. */
  use(run: Run | null): void {
    this.live = run;
    this.released.length = 0;
    this.carried.length = 0;
  }

  /** The run on show: the one being flown, or the record's, made the first time it is wanted (the readout has usually made it already: sim/fly.ts flownOnce). */
  private flown(): Run {
    if (this.live) return this.live;
    if (!this.record) {
      const tr = this.flight.trajectory!;
      const { samples, results } = flownOnce(tr, this.site, this.flight.site.seaLevel.value);
      const when = (t: number): number => (Number.isFinite(t) ? t : Infinity);
      const out = { drogue: when(results.drogueAt), main: when(results.mainAt) };
      this.record = {
        samples,
        duration: results.duration,
        cutoff: tr.engine.cutoff.value,
        // (what a parachute lets go leaves when this run has the parachute out, which is not to the second when the record does)
        dropped: this.flight.flies!.drops.map((d) => (d.on === 'drogue' ? out.drogue : d.on === 'main' ? out.main : d.at)),
        live: false,
        out,
      };
      this.axis = axisOf(tr, this.site);
    }
    return this.record;
  }

  /** Whether the vehicle is off its pad at `t`, seconds from liftoff. */
  flying(t: number): boolean {
    if (!this.flight.trajectory || t <= 0) return false;
    const run = this.flown();
    return run.live ? run.samples.length > 1 : t < run.duration;
  }

  /**
   * How the engine burns at `t`: `on` from 0 (out) to 1, coming up over the first half second of
   * flight and dying over half a second at cutoff (neither the start nor the tail-off is in the
   * record: the run itself holds full thrust from liftoff to cutoff); `vacuum` from 0 in sea-level
   * air to 1 in none, from the standard air's pressure at the height flown.
   */
  burn(t: number): { on: number; vacuum: number } {
    if (!this.flying(t)) return { on: 0, vacuum: 0 };
    const { cutoff } = this.flown();
    const on = THREE.MathUtils.smoothstep(t, 0, 0.5) * (1 - THREE.MathUtils.smoothstep(t, cutoff, cutoff + 0.5));
    if (on <= 0) return { on: 0, vacuum: 1 };
    const { r } = between(this.flown().samples, t);
    const height = ecefToGeodetic(inertialToEcef(r, EARTH_ROTATION_RATE * t)).height - this.flight.site.seaLevel.value;
    return { on, vacuum: 1 - (atmosphere(height).pressure / 101_325) ** 0.25 };
  }

  /** The parts that have left the vehicle by `t`. */
  dropped(t: number): string[] {
    return this.flying(t) ? this.drops.filter((d) => t >= d.at).flatMap((d) => d.nodes) : [];
  }

  /** When the engine stops, seconds from liftoff: Infinity for one still burning. */
  get cutoff(): number {
    return this.flown().cutoff;
  }

  /** What leaves the vehicle on the way, in order (`Flight.flies.drops`), each at the time it left on the run on show. */
  get drops(): readonly { at: number; nodes: string[]; under?: 'drogue' | 'main' }[] {
    const { dropped } = this.flown();
    return this.flight.flies!.drops.map((d, i) => ({ at: dropped[i] ?? d.at, nodes: d.nodes, under: d.under }));
  }

  /** The parachutes this flight has to draw (`Flight.flies.chutes`). */
  get chutes(): readonly ChuteDef[] {
    return this.flight.flies?.chutes ?? [];
  }

  /**
   * Parachute `i` at `t`, or null while it is not to be seen: before it is out, after the next one has taken over
   * (unless something left under it: then it goes with that, until both are lost to sight), and on the pad.
   */
  chute(i: number, t: number, padTurn: THREE.Quaternion): ChuteMoment | null {
    const def = this.chutes[i];
    if (!def || !this.flying(t)) return null;
    const run = this.flown();
    const at = run.out[def.on];
    if (!(t >= at)) return null;
    const tr = this.flight.trajectory!;
    const end = run.samples[run.samples.length - 1]!;
    const landed = run.live && Number.isFinite(run.duration);
    const moment: ChuteMoment = {
      since: Math.min(t, landed ? run.duration : Infinity) - at,
      fills: tr[def.on].fills.value,
      air: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
      seen: 1,
      down: landed && t >= run.duration ? t - run.duration : -1,
      floor: 0,
    };
    // the drogue's work is over when the main is out
    const over = def.on === 'drogue' ? run.out.main : Infinity;
    const carried = this.drops.findIndex((d) => d.under === def.on);
    if (t >= over) {
      const drop = this.drops[carried];
      if (!drop || t < drop.at) return null;
      // let go with what it carried off: it streams along that thing's own motion
      const from = this.release(carried, padTurn);
      if (!from) return null;
      const dt = t - drop.at;
      moment.air.copy(DRIFT).addScaledVector(from.v.clone().sub(DRIFT), Math.exp(-dt / EASES));
      moment.seen = this.seen(carried, t);
      moment.down = -1;
      return moment.seen > 0 ? moment : null;
    }
    const clamped = Math.min(t, end.t);
    const { r, v } = between(run.samples, clamped, run.live ? (s) => (s as LiveSample).centre : undefined);
    const spin = EARTH_ROTATION_RATE * clamped;
    const here = inertialToEcef(r, spin);
    moment.air.copy(toThree(ecefToSiteDirection(this.site, inertialToEcefVelocity(r, v, spin))));
    moment.up.copy(toThree(ecefToSiteDirection(this.site, unit(here))));
    if (moment.down >= 0) {
      moment.air.set(0, 0, 0);
      // (a flight flown by hand comes down where its centre of mass meets the surface: sim/vehicle.ts)
      moment.floor =
        toThree(ecefToSite(this.site, inertialToEcef((end as LiveSample).centre, EARTH_ROTATION_RATE * end.t))).y + this.home.y;
    }
    return moment;
  }

  /**
   * Which attitude jets are open at `t` on a flight flown by hand: each chamber's thrust, N, as the kept sample at or
   * before `t` has it (sim/vehicle.ts `rcs.firing`), or null where there are none (the record's run does not fly them).
   */
  jets(t: number): readonly number[] | null {
    if (!this.flying(t)) return null;
    const run = this.flown();
    if (!run.live || !Number.isFinite(t) || t >= run.duration) return null;
    const [a, b] = either(run.samples as readonly LiveSample[], t);
    // (a pulse shorter than the samples' spacing is shown for the sample it fell in)
    const firing = (t >= b.t ? b : a).rcs?.firing;
    return firing?.some((f) => f > 0) ? firing : null;
  }

  /**
   * The spacecraft's body axes (sim/vehicle.ts: +X to the small end) as a frame in the flown model's own, at the
   * spacecraft's centre of mass: what is given in the body's axes from there (a thruster's place) is put on the model by
   * it. Worked from how the model stands on the pad, where the two are the same thing; null if the flight has no body.
   */
  bodyFrame(padTurn: THREE.Quaternion): THREE.Matrix4 | null {
    const body = this.flight.trajectory?.body;
    if (!body) return null;
    const live = this.live?.samples[0] as LiveSample | undefined;
    const into = padTurn.clone().invert();
    let axes: THREE.Vector3[];
    if (live?.attitude) {
      axes = BODY.map((b) => toThree(ecefToSiteDirection(this.site, inertialToEcef(turn(live.attitude, b), EARTH_ROTATION_RATE * live.t))));
    } else {
      // on the pad the nose is up, +Z against the azimuth: the site frame's +X bears `bearingX`, +Z a quarter turn clockwise of it
      const bearing = THREE.MathUtils.degToRad(this.flight.trajectory!.azimuth.value - this.flight.site.bearingX.value);
      const downrange = new THREE.Vector3(Math.cos(bearing), 0, Math.sin(bearing));
      axes = [Y.clone(), Y.clone().cross(downrange), downrange.clone().negate()];
    }
    const [x, y, z] = axes.map((v) => v.applyQuaternion(into));
    const centre = this.home.clone().negate().applyQuaternion(into).addScaledVector(x!, body.capsule.centre.value);
    return new THREE.Matrix4().makeBasis(x!, y!, z!).setPosition(centre);
  }

  /** How much of drop `i` is still to be seen at `t`: 1, but for something that left under a parachute, which is lost to sight (drawn smaller, to nothing) a few seconds on. */
  seen(i: number, t: number): number {
    const drop = this.drops[i];
    if (!drop?.under) return 1;
    return 1 - THREE.MathUtils.smoothstep(t - drop.at, LOST - 4, LOST);
  }

  /**
   * Where something shed (drop `i`) is at `t`: the model's pose (origin and turn, as `place` gives them) for the node to
   * be drawn in. It is flown (sim/shed.ts): a rigid body of its own from the instant it left, under gravity and the air,
   * tumbling or weathercocking as its shape says, down to the sea; on a flight flown by hand by the cockpit beside the
   * vehicle (`Run.sheds`), on the record's from the record's run at the time it left, as far as the clock has asked.
   * The node is carried by its body: turned about its own centre of mass as the body has turned since it left, and moved
   * as that centre has moved. What a parachute carries off (`under`) is not flown: it is left behind in the air, drawn.
   * False if it has not left yet, if the flight gives no body for it, or if the flight is over.
   */
  shed(i: number, t: number, padTurn: THREE.Quaternion, position: THREE.Vector3, quaternion: THREE.Quaternion): boolean {
    const drop = this.drops[i];
    if (!drop || t < drop.at || !this.flying(t)) return false;
    const from = this.release(i, padTurn);
    if (!from) return false;
    if (drop.under) {
      // left behind in the air on its parachute: its speed eases from the vehicle's to a drift straight down, and it does not tumble
      const dt = t - drop.at;
      const ease = EASES * (1 - Math.exp(-dt / EASES));
      position.copy(from.p).addScaledVector(DRIFT, dt).addScaledVector(from.v.clone().sub(DRIFT), ease);
      quaternion.copy(from.q);
      return true;
    }
    const body = this.body(i);
    const now = body?.at(t);
    if (!body || !now) return false;
    let held = this.carried[i];
    if (!held || held.at !== from.at || held.body !== body) {
      // as it left: where its centre of mass was drawn (along the model's axis from its origin), and how its body lay
      const then = body.at(Math.max(from.at, body.from))!;
      const centre = new THREE.Vector3(0, body.shedder.release.centre - (this.flight.flies!.datum ?? 0), 0)
        .applyQuaternion(from.q)
        .add(from.p);
      held = this.carried[i] = {
        at: from.at,
        body,
        centre,
        arm: from.p.clone().sub(centre),
        lay: this.axes(then.q, from.at, new THREE.Matrix4()).transpose(), // (a rotation's inverse)
        was: this.where(then.r, from.at),
      };
    }
    // how the body has turned since, in the site's frame, and how far its centre of mass has gone
    const turned = new THREE.Quaternion().setFromRotationMatrix(this.axes(now.q, t, new THREE.Matrix4()).multiply(held.lay));
    quaternion.copy(turned).multiply(from.q);
    position.copy(held.arm).applyQuaternion(turned).add(held.centre).add(this.where(now.r, t)).sub(held.was);
    return true;
  }

  /** The body flown for drop `i` (sim/shed.ts), if the flight gives one: the cockpit's on a flight flown by hand, else made here from the record's run as it left. */
  private body(i: number): ShedRun | undefined {
    const run = this.flown();
    const on = this.flight.flies!.drops[i]?.on;
    if (run.live) return run.sheds?.get(on);
    const tr = this.flight.trajectory!;
    this.sheds ??= new Sheds(tr, this.site, this.flight.site.seaLevel.value);
    const had = this.sheds.get(on);
    const def = tr.body?.sheds?.find((d) => d.on === on);
    if (had || !def) return had;
    const at = this.drops[i]!.at;
    const { r, v } = between(run.samples, at);
    // which way the long axis points, as `place` has it: the gyros' going up, heat shield first once the spacecraft is alone
    const riding = at <= tr.separation.at.value;
    const through = sub(v, cross([0, 0, EARTH_ROTATION_RATE], r));
    const axis = riding || length(through) < 1e-6 ? this.axis!(at) : scale(unit(through), -1);
    return this.sheds.add(recordRelease(tr, def, at, r, v, axis, riding));
  }

  /** A place in the frame that does not turn, at `t`, in the scene's frame. */
  private where(r: Vec3, t: number): THREE.Vector3 {
    return toThree(ecefToSite(this.site, inertialToEcef(r, EARTH_ROTATION_RATE * t)));
  }

  /** A body's three axes (attitude `q`, body to the frame that does not turn) at `t`, as directions in the site's frame. */
  private axes(q: Quat, t: number, into: THREE.Matrix4): THREE.Matrix4 {
    const spin = EARTH_ROTATION_RATE * t;
    const [x, y, z] = BODY.map((b) => toThree(ecefToSiteDirection(this.site, inertialToEcef(turn(q, b), spin))));
    return into.makeBasis(x!, y!, z!);
  }

  /** The record's run's shed bodies, and each drop's body as it is carried: worked out once for the moment it left at. */
  private sheds: Sheds | null = null;
  private readonly carried: (
    | { at: number; body: ShedRun; centre: THREE.Vector3; arm: THREE.Vector3; lay: THREE.Matrix4; was: THREE.Vector3 }
    | undefined
  )[] = [];

  /** Drop `i`'s pose and velocity as it left: worked out once for the moment it left at. */
  private release(
    i: number,
    padTurn: THREE.Quaternion,
  ): { at: number; p: THREE.Vector3; q: THREE.Quaternion; v: THREE.Vector3 } | undefined {
    const drop = this.drops[i];
    if (!drop) return undefined;
    let from = this.released[i];
    if (from && from.at !== drop.at) from = undefined; // (let go at another moment than the one worked out for)
    if (!from) {
      const p = new THREE.Vector3();
      const q = new THREE.Quaternion();
      const p2 = new THREE.Vector3();
      if (!this.place(drop.at, padTurn, p, q)) return undefined;
      // (a part let go this instant has no later sample to be measured against yet: it is measured from just before)
      const back = this.flown().live;
      this.place(drop.at + (back ? -0.05 : 0.05), padTurn, p2, new THREE.Quaternion());
      from = this.released[i] = { at: drop.at, p, q, v: (back ? p.clone().sub(p2) : p2.sub(p)).divideScalar(0.05) };
    }
    return from;
  }

  /** Each drop's pose and velocity as it left, worked out once. */
  private readonly released: ({ at: number; p: THREE.Vector3; q: THREE.Quaternion; v: THREE.Vector3 } | undefined)[] = [];

  /**
   * Put the model where it is at `t`: `position` for its origin, `quaternion` for its turn, given
   * how it stands on the pad (`padTurn`). False, and nothing changed, if it is not flying.
   */
  place(t: number, padTurn: THREE.Quaternion, position: THREE.Vector3, quaternion: THREE.Quaternion): boolean {
    if (!this.flying(t)) return false;
    const run = this.flown();
    if (run.live) return this.placeLive(run.samples as readonly LiveSample[], t, padTurn, position, quaternion);
    const { samples } = run;
    const axis = this.axis!;
    const separation = this.flight.trajectory!.separation.at.value;
    const turned = Math.max(separation, this.flight.flies!.turned ?? separation);
    const { r, v } = between(samples, t);
    const spin = EARTH_ROTATION_RATE * t;
    const at = ecefToSite(this.site, inertialToEcef(r, spin));
    // which way the axis points: the gyros' going up, heat shield first coming down
    const up = (s: number) => toThree(ecefToSiteDirection(this.site, inertialToEcef(axis(s), EARTH_ROTATION_RATE * s)));
    this.arc.setFromUnitVectors(Y, up(Math.min(t, separation)));
    if (t > separation) {
      const air = toThree(ecefToSiteDirection(this.site, inertialToEcefVelocity(r, v, spin)));
      const back = air.lengthSq() > 1e-6 ? air.normalize().negate() : Y.clone();
      const k = turned > separation ? THREE.MathUtils.smoothstep(t, separation, turned) : 1;
      // nearly end for end: the shortest turn between the two attitudes, not the pilot's path
      this.arc.slerp(new THREE.Quaternion().setFromUnitVectors(Y, back), k);
    }
    quaternion.copy(this.arc).multiply(padTurn);
    // the point flown is where the vehicle stood on the pad; the model's origin is held off it as on the pad, turned with the
    // vehicle up to separation and as it was then afterwards, so the spacecraft does not jump as the booster leaves
    const offset = this.home.clone();
    if (t <= separation) offset.applyQuaternion(this.arc);
    else offset.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(Y, up(separation)));
    position.copy(toThree(at)).add(offset);
    return true;
  }

  /** The body's three axes at a sample (nose, left, against the azimuth: sim/vehicle.ts) as directions in the site's frame. */
  private basis(s: LiveSample, into: THREE.Matrix4): THREE.Matrix4 {
    return this.axes(s.attitude, s.t, into);
  }

  /**
   * A flight flown by hand: the model turned as the body is, from how it stood on the pad, and held by the point the
   * simulator flies. On the booster that is the stack's base. Alone, the spacecraft turns about its own centre of
   * mass, so the model's origin (far below it, where the booster's base was) is carried round that centre as it lay in
   * the body when they parted.
   */
  /** The live run's first sample of the spacecraft alone, found once. */
  private parted: LiveSample | null = null;

  private placeLive(
    samples: readonly LiveSample[],
    t: number,
    padTurn: THREE.Quaternion,
    position: THREE.Vector3,
    quaternion: THREE.Quaternion,
  ): boolean {
    t = Math.min(t, samples[samples.length - 1]!.t); // (past its last sample it is where that left it, on an Earth that has not turned under it)
    const [a, b, k] = either(samples, t);
    const first = samples[0]!;
    const stood = this.basis(first, new THREE.Matrix4()).transpose(); // (a rotation's inverse)
    const qa = new THREE.Quaternion().setFromRotationMatrix(this.basis(a, new THREE.Matrix4()).multiply(stood));
    const qb = new THREE.Quaternion().setFromRotationMatrix(this.basis(b, new THREE.Matrix4()).multiply(stood));
    this.arc.copy(qa).slerp(qb, k);
    quaternion.copy(this.arc).multiply(padTurn);
    const spin = EARTH_ROTATION_RATE * t;
    const offset = this.home.clone().applyQuaternion(this.arc);
    // (by the earlier of the two: up to the first sample of the spacecraft alone the point flown is the stack's, which that
    // sample's `r` carries on, so the model does not jump as the reference changes)
    if (riding(a)) {
      const { r } = between(samples, t);
      position.copy(toThree(ecefToSite(this.site, inertialToEcef(r, spin)))).add(offset);
      return true;
    }
    // where the model's origin lay from the centre of mass, in the body's axes, when the spacecraft left
    if (!this.parted || !samples.includes(this.parted)) this.parted = samples.find((s) => !riding(s))!;
    const parted = this.parted;
    const arm = unturn(parted.attitude, sub(parted.r, parted.centre));
    const centre = between(samples, t, (s) => (s as LiveSample).centre).r;
    const now = turn(nlerp(a.attitude, b.attitude, k), arm);
    position
      .copy(toThree(ecefToSite(this.site, inertialToEcef(centre, spin))))
      .add(toThree(ecefToSiteDirection(this.site, inertialToEcef(now, spin))))
      .add(offset);
    return true;
  }
}

/** The two samples either side of `t`, and how far between them it is: both the last, at or past the end. */
function either<S extends Sample>(samples: readonly S[], t: number): [S, S, number] {
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid]!.t <= t) lo = mid;
    else hi = mid;
  }
  const a = samples[lo]!;
  const b = samples[hi]!;
  if (t >= b.t) return [b, b, 0];
  return [a, b, b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0];
}

/** An attitude between two close ones: the straight blend, made a rotation again (they are a tenth of a second apart at most). */
function nlerp(a: Quat, b: Quat, k: number): Quat {
  const sign = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3] < 0 ? -1 : 1;
  return normalize([0, 1, 2, 3].map((i) => a[i]! + (sign * b[i]! - a[i]!) * k) as unknown as Quat);
}

const Y = new THREE.Vector3(0, 1, 0);
const BODY: readonly Vec3[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
/** A sample's part of the flight: on the booster, or the spacecraft alone. */
const riding = (s: Sample): boolean => s.phase === 'powered' || s.phase === 'coast';
/** Something left behind under a parachute: the drift it slows to, m/s, in how many seconds, and by when it is lost to sight, s. Drawn, not flown. */
const DRIFT = new THREE.Vector3(0, -25, 0);
const EASES = 1;
const LOST = 8;
const toThree = (v: Vec3) => new THREE.Vector3(v[0], v[1], v[2]);

/** Position and velocity at `t` between the run's samples: a cubic Hermite through the two either side. */
function between(samples: readonly Sample[], t: number, point: (s: Sample) => Vec3 = (s) => s.r): { r: Vec3; v: Vec3 } {
  let lo = 0;
  let hi = samples.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid]!.t <= t) lo = mid;
    else hi = mid;
  }
  const a = samples[lo]!;
  const b = samples[hi]!;
  const h = b.t - a.t;
  if (h <= 1e-9 || t <= a.t) return { r: point(a), v: a.v };
  if (t >= b.t) return { r: point(b), v: b.v };
  const s = (t - a.t) / h;
  const [h00, h10, h01, h11] = [2 * s ** 3 - 3 * s ** 2 + 1, s ** 3 - 2 * s ** 2 + s, -2 * s ** 3 + 3 * s ** 2, s ** 3 - s ** 2];
  const r: Vec3 = [0, 1, 2].map((i) => h00 * point(a)[i]! + h10 * h * a.v[i]! + h01 * point(b)[i]! + h11 * h * b.v[i]!) as unknown as Vec3;
  const v: Vec3 = [0, 1, 2].map((i) => a.v[i]! + (b.v[i]! - a.v[i]!) * s) as unknown as Vec3;
  return { r, v };
}
