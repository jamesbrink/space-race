import * as THREE from 'three';
import { atmosphere } from '../sim/atmosphere.ts';
import { axisOf, flownOnce, type Sample } from '../sim/fly.ts';
import { normalize, type Quat, turn, unturn } from '../sim/rigid.ts';
import type { LiveSample } from '../sim/vehicle.ts';
import type { Flight } from '../types';
import { EARTH_ROTATION_RATE } from '../world/bodies.ts';
import {
  ecefToGeodetic,
  ecefToSite,
  ecefToSiteDirection,
  inertialToEcef,
  inertialToEcefVelocity,
  type Site,
  siteFrame,
  sub,
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
  }

  /** The run on show: the one being flown, or the record's, made the first time it is wanted (the readout has usually made it already: sim/fly.ts flownOnce). */
  private flown(): Run {
    if (this.live) return this.live;
    if (!this.record) {
      const tr = this.flight.trajectory!;
      const { samples, results } = flownOnce(tr, this.site, this.flight.site.seaLevel.value);
      this.record = {
        samples,
        duration: results.duration,
        cutoff: tr.engine.cutoff.value,
        dropped: this.flight.flies!.drops.map((d) => d.at),
        live: false,
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
  get drops(): readonly { at: number; nodes: string[] }[] {
    const { dropped } = this.flown();
    return this.flight.flies!.drops.map((d, i) => ({ at: dropped[i] ?? d.at, nodes: d.nodes }));
  }

  /**
   * Where something shed (drop `i`) is at `t`: the model's pose (origin and turn, as `place` gives
   * them) carried on from the moment it left. It keeps the vehicle's speed then and falls under
   * gravity in the site's frame (flat, without air: it leaves high and fast, and it is seen for
   * a minute at most), pushed off along the vehicle's axis and turning slowly end over end.
   * The escape tower leaves on its own rocket. The push, the rocket's thrust and burn, and the
   * tumble are drawn, not recorded. False if it has not left yet, or the flight is over.
   */
  shed(i: number, t: number, padTurn: THREE.Quaternion, position: THREE.Vector3, quaternion: THREE.Quaternion): boolean {
    const drop = this.drops[i];
    if (!drop || t < drop.at || !this.flying(t)) return false;
    let from = this.released[i];
    if (from && from.at !== drop.at) from = undefined; // (let go at another moment than the one worked out for)
    if (!from) {
      const p = new THREE.Vector3();
      const q = new THREE.Quaternion();
      const p2 = new THREE.Vector3();
      this.place(drop.at, padTurn, p, q);
      // (a part let go this instant has no later sample to be measured against yet: it is measured from just before)
      const back = this.flown().live;
      this.place(drop.at + (back ? -0.05 : 0.05), padTurn, p2, new THREE.Quaternion());
      from = this.released[i] = { at: drop.at, p, q, v: (back ? p.clone().sub(p2) : p2.sub(p)).divideScalar(0.05) };
    }
    const dt = t - drop.at;
    const axis = Y.clone().applyQuaternion(from.q);
    const tower = drop.nodes.some((n) => /tower/i.test(n));
    // the tower's rocket: 3 g along the axis for a second, then it coasts; anything else is eased off at a metre a second backward
    const push = tower ? 0.5 * 3 * G * Math.min(dt, 1) ** 2 + 3 * G * Math.max(0, dt - 1) : -1 * dt;
    position
      .copy(from.p)
      .addScaledVector(from.v, dt)
      .addScaledVector(axis, push)
      .addScaledVector(Y, -0.5 * G * dt * dt);
    const tumble = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0).applyQuaternion(from.q),
      THREE.MathUtils.degToRad(TUMBLE * dt),
    );
    quaternion.copy(tumble).multiply(from.q);
    return true;
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
    const spin = EARTH_ROTATION_RATE * s.t;
    const [x, y, z] = BODY.map((b) => toThree(ecefToSiteDirection(this.site, inertialToEcef(turn(s.attitude, b), spin))));
    return into.makeBasis(x!, y!, z!);
  }

  /**
   * A flight flown by hand: the model turned as the body is, from how it stood on the pad, and held by the point the
   * simulator flies. On the booster that is the stack's base. Alone, the spacecraft turns about its own centre of
   * mass, so the model's origin (far below it, where the booster's base was) is carried round that centre as it lay in
   * the body when they parted.
   */
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
    if (riding(b)) {
      const { r } = between(samples, t);
      position.copy(toThree(ecefToSite(this.site, inertialToEcef(r, spin)))).add(offset);
      return true;
    }
    // where the model's origin lay from the centre of mass, in the body's axes, when the spacecraft left
    const parted = samples.find((s) => !riding(s))!;
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
const G = 9.80665;
const BODY: readonly Vec3[] = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];
/** A sample's part of the flight: on the booster, or the spacecraft alone. */
const riding = (s: Sample): boolean => s.phase === 'powered' || s.phase === 'coast';
/** How fast something shed turns end over end, degrees a second: drawn. */
const TUMBLE = 6;
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
