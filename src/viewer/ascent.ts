import * as THREE from 'three';
import { atmosphere } from '../sim/atmosphere.ts';
import { axisOf, flownOnce, type Sample } from '../sim/fly.ts';
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
 */
export class Ascent {
  /** The model that flies. */
  readonly model: string;
  private readonly flight: Flight;
  private readonly site: Site;
  private run: { samples: Sample[]; duration: number; axis: (t: number) => Vec3 } | null = null;
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

  /** The run, made the first time it is wanted (the readout has usually made it already: sim/fly.ts flownOnce). */
  private flown() {
    if (!this.run) {
      const tr = this.flight.trajectory!;
      const { samples, results } = flownOnce(tr, this.site, this.flight.site.seaLevel.value);
      this.run = { samples, duration: results.duration, axis: axisOf(tr, this.site) };
    }
    return this.run;
  }

  /** Whether the vehicle is off its pad at `t`, seconds from liftoff. */
  flying(t: number): boolean {
    return t > 0 && Boolean(this.flight.trajectory) && t < this.flown().duration;
  }

  /**
   * How the engine burns at `t`: `on` from 0 (out) to 1, coming up over the first half second of
   * flight and dying over half a second at cutoff (neither the start nor the tail-off is in the
   * record: the run itself holds full thrust from liftoff to cutoff); `vacuum` from 0 in sea-level
   * air to 1 in none, from the standard air's pressure at the height flown.
   */
  burn(t: number): { on: number; vacuum: number } {
    if (!this.flying(t)) return { on: 0, vacuum: 0 };
    const cutoff = this.flight.trajectory!.engine.cutoff.value;
    const on = THREE.MathUtils.smoothstep(t, 0, 0.5) * (1 - THREE.MathUtils.smoothstep(t, cutoff, cutoff + 0.5));
    if (on <= 0) return { on: 0, vacuum: 1 };
    const { r } = between(this.flown().samples, t);
    const height = ecefToGeodetic(inertialToEcef(r, EARTH_ROTATION_RATE * t)).height - this.flight.site.seaLevel.value;
    return { on, vacuum: 1 - (atmosphere(height).pressure / 101_325) ** 0.25 };
  }

  /** The parts that have left the vehicle by `t`. */
  dropped(t: number): string[] {
    return this.flying(t) ? this.flight.flies!.drops.filter((d) => t >= d.at).flatMap((d) => d.nodes) : [];
  }

  /**
   * Put the model where it is at `t`: `position` for its origin, `quaternion` for its turn, given
   * how it stands on the pad (`padTurn`). False, and nothing changed, if it is not flying.
   */
  place(t: number, padTurn: THREE.Quaternion, position: THREE.Vector3, quaternion: THREE.Quaternion): boolean {
    if (!this.flying(t)) return false;
    const { samples, axis } = this.flown();
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
}

const Y = new THREE.Vector3(0, 1, 0);
const toThree = (v: Vec3) => new THREE.Vector3(v[0], v[1], v[2]);

/** Position and velocity at `t` between the run's samples: a cubic Hermite through the two either side. */
function between(samples: readonly Sample[], t: number): { r: Vec3; v: Vec3 } {
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
  if (h <= 1e-9 || t <= a.t) return { r: a.r, v: a.v };
  if (t >= b.t) return { r: b.r, v: b.v };
  const s = (t - a.t) / h;
  const [h00, h10, h01, h11] = [2 * s ** 3 - 3 * s ** 2 + 1, s ** 3 - 2 * s ** 2 + s, -2 * s ** 3 + 3 * s ** 2, s ** 3 - s ** 2];
  const r: Vec3 = [0, 1, 2].map((i) => h00 * a.r[i]! + h10 * h * a.v[i]! + h01 * b.r[i]! + h11 * h * b.v[i]!) as unknown as Vec3;
  const v: Vec3 = [0, 1, 2].map((i) => a.v[i]! + (b.v[i]! - a.v[i]!) * s) as unknown as Vec3;
  return { r, v };
}
