import * as THREE from 'three';
import { fitDistance } from './maths.ts';
import { OrbitRig } from './orbit.ts';
import type { MapOf, Pose, RigId, World } from './rig.ts';
import { ease } from '../../util/math.ts';

/**
 * The map: the orbiting camera pulled out to where the whole path is seen, round the body the flight is round. It turns
 * about the vehicle or about the body's centre (`focus`), and its angles are measured in the frame that does not turn
 * (`mapFrame`): the scene is fixed to the Earth, so held against the Earth's turn the view stands still among the stars
 * and the Earth goes round under the path, which is how an orbit lies. It knows no flight: what it is of comes through
 * `World.map` (the body, how far it has turned, how far what is shown of the flight reaches).
 *
 * What it turns about is chosen for it until someone chooses (`focusOf`: the vehicle while everything shown is near it,
 * a lob or a fall; the body once the path goes far round it), and it stands off far enough to take all of it in until a
 * distance is set by hand. The reset gives both back to it. A change of what it turns about is eased, never cut.
 */

/** What the map turns about: the vehicle, or the body it flies round. */
export type MapFocus = 'craft' | 'body';

/** How much of what the controls leave clear of the frame's height the whole of what is shown fills. */
const FILL = 0.8;
/** And how much of the frame's width, where that is the less. */
const FILL_ACROSS = 0.9;
/** The least the map takes in round the vehicle, m across: on the pad, or at the end of a fall, there is no path to frame. */
const LEAST = 300_000;
/** The nearest the map comes to the vehicle, m (nearer is the chase view's), and to the body's centre, in its radii. */
const NEAR = 5_000;
const NEAR_BODY = 1.2;
/** The furthest it goes: this many times as far as it takes everything in from, and never less than so many of the body's radii. */
const FAR_TIMES = 4;
const FAR_RADII = 12;
/** Seconds a change of what it turns about takes. */
const SLIDE = 1.2;
/** The nearest the view comes to looking along the body's axis, radians. */
const POLE = 0.02;
/** How far over the body's radius the eye stays, m: over its highest ground. */
const CLEAR = 12_000;

const v = new THREE.Vector3();
const w = new THREE.Vector3();
const q = new THREE.Quaternion();
const Y = new THREE.Vector3(0, 1, 0);

/**
 * The frame the map's angles are measured in: its vertical the body's axis (`pole`, north), and turned back about it
 * by as much as the body has turned (`turned`, radians), so a view that keeps its angles keeps its place among the stars.
 */
export function mapFrame(pole: THREE.Vector3, turned: number, out = new THREE.Quaternion()): THREE.Quaternion {
  return out.setFromAxisAngle(pole, -turned).multiply(q.setFromUnitVectors(Y, pole));
}

/**
 * What the map turns about when nobody has chosen: the vehicle while all that is shown lies within `extent` of it that
 * is small beside the body (a lob, an ascent, a fall), the body once it does not (an orbit, a path that goes a long way
 * round). Between the two it stays as it `was`, so a path growing through the line does not send the view back and forth.
 */
export function focusOf(extent: number, radius: number, was: MapFocus): MapFocus {
  if (extent > 0.6 * radius) return 'body';
  if (extent < 0.4 * radius) return 'craft';
  return was;
}

/**
 * How far off the map stands to take in all that is shown, through a lens of `fov` degrees: in `clear` of the frame's
 * height, and in its width too where the frame is narrower than it is tall (`aspect`, width over height: a phone held
 * upright sees less across than up and down).
 */
export function mapFit(focus: MapFocus, of: Pick<MapOf, 'radius' | 'reach' | 'extent'>, fov: number, clear: number, aspect = 1): number {
  const fill = Math.min(FILL * Math.min(1, Math.max(0.2, clear)), FILL_ACROSS * Math.max(0.1, aspect));
  // (about the body: the ball that holds the path; about the vehicle: the ball round it that does)
  const across = focus === 'body' ? 2.1 * Math.max(of.reach, of.radius) : Math.max(LEAST, 2.2 * of.extent);
  return fitDistance(across, fov, fill);
}

export class MapRig extends OrbitRig {
  override readonly id: RigId = 'map';
  /** What it turns about, and whether that was chosen by hand (C): if not, it is chosen for it (`focusOf`). */
  focus: MapFocus = 'body';
  focusSet = false;
  /** How much of the frame's height is clear of the controls, top and bottom; and the frame's width over its height. */
  clear = 1;
  aspect = 1.5;
  /** It has been in charge before: there is a view of its own to come back to. */
  private been = false;
  /** The pivot on its way from what it turned about to what it turns about now: where it was from there, and how far along. */
  private slide: { from: THREE.Vector3; t: number } | null = null;
  private of: MapOf | null = null;

  constructor(world: World, fov: number) {
    super(world, fov);
    this.pans = false;
  }

  override get busy(): boolean {
    return super.busy || Boolean(this.slide);
  }

  /** Where what it turns about is. */
  private at(out: THREE.Vector3): THREE.Vector3 {
    const of = this.of;
    const craft = this.world.craft();
    if (this.focus === 'craft' && craft) return out.copy(craft.centre).applyMatrix4(craft.matrix);
    return of ? out.copy(of.centre) : out.copy(this.pivot);
  }

  /** How far off everything shown is taken in from, and the limits of the zoom for what it turns about. */
  private fit(): number {
    const of = this.of;
    if (!of) return this.distance;
    const fit = mapFit(this.focus, of, this.fov, this.clear, this.aspect);
    this.min = this.focus === 'body' ? NEAR_BODY * of.radius : NEAR;
    this.max = Math.max(FAR_TIMES * fit, FAR_RADII * of.radius);
    return fit;
  }

  /**
   * Taken up: the first time, and whenever nobody has set it, everything shown is framed, from the side the view left
   * saw the vehicle from, raised so that the vehicle is on the near side of the body; a view that was set by hand is
   * come back to as it was left, where it was among the stars.
   */
  override enter(from: Pose, pivot: THREE.Vector3): void {
    const of = (this.of = this.world.map?.() ?? null);
    const craft = this.world.craft();
    if (!of) {
      super.enter(from, pivot);
      return;
    }
    this.slide = null;
    if (!this.focusSet) this.focus = craft ? focusOf(of.extent, of.radius, 'craft') : 'body';
    if (!craft) this.focus = 'body';
    this.frame();
    const fit = this.fit();
    const middle = this.at(new THREE.Vector3());
    if (this.been && this.handSet) {
      const distance = THREE.MathUtils.clamp(this.distance, this.min, this.max);
      super.enter({ ...from, position: this.eyeFrom(middle, distance) }, middle);
      return;
    }
    this.been = true;
    // over the vehicle and to the side the last view saw it from: the vehicle is then well inside the near side of the body
    const up = (craft ? v.copy(craft.centre).applyMatrix4(craft.matrix) : v.copy(from.position)).sub(of.centre);
    if (up.lengthSq() < 1) up.copy(of.pole);
    up.normalize();
    const side = w.copy(from.position).sub(pivot);
    side.addScaledVector(up, -side.dot(up));
    if (side.lengthSq() < 1e-6) side.crossVectors(of.pole, up);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    const way = up.clone().addScaledVector(side, 0.7).normalize();
    super.enter({ ...from, position: way.multiplyScalar(fit).add(middle) }, middle);
    this.handSet = false;
  }

  /** The eye at this rig's own angles, `distance` from `pivot`. */
  private eyeFrom(pivot: THREE.Vector3, distance: number): THREE.Vector3 {
    const s = Math.sin(this.phi);
    return new THREE.Vector3(s * Math.sin(this.theta), Math.cos(this.phi), s * Math.cos(this.theta))
      .multiplyScalar(distance)
      .applyQuaternion(this.turn)
      .add(pivot);
  }

  protected override frame(): void {
    const of = this.of;
    if (!of) {
      super.frame();
      return;
    }
    this.up.copy(of.pole);
    mapFrame(of.pole, of.turned, this.turn);
  }

  protected override carry(dt: number): THREE.Vector3 | null {
    const to = this.at(v);
    const s = this.slide;
    if (s) {
      s.t = this.calm ? 1 : Math.min(1, s.t + dt / SLIDE);
      to.addScaledVector(s.from, 1 - ease(s.t));
      if (s.t >= 1) this.slide = null;
    }
    const moved = to.clone().sub(this.pivot);
    this.pivot.copy(to);
    return moved;
  }

  /** Turn about `focus` from now on: the pivot is eased there from where it is, and a distance nobody set goes to where all of it is seen. */
  private turnAbout(focus: MapFocus): void {
    if (focus === this.focus) return;
    const was = this.pivot.clone();
    this.focus = focus;
    this.slide = { from: was.sub(this.at(v)), t: 0 };
    const fit = this.fit();
    this.anchor = null;
    this.zoomer.goal = Math.log(this.handSet ? THREE.MathUtils.clamp(Math.exp(this.zoomer.goal), this.min, this.max) : fit);
  }

  /** The other thing to turn about, chosen by hand (C). Says which it now is. */
  refocus(): MapFocus {
    this.of = this.world.map?.() ?? this.of;
    this.focusSet = true;
    // (from as far off as it is: the distance is kept, and is from now on the one that was chosen)
    this.handSet = true;
    this.turnAbout(this.focus === 'body' && this.world.craft() ? 'craft' : 'body');
    return this.focus;
  }

  override update(dt: number, keys: ReadonlySet<string>, fast: boolean): void {
    const of = (this.of = this.world.map?.() ?? this.of);
    if (of) {
      if (!this.world.craft()) this.turnAbout('body');
      else if (!this.focusSet) this.turnAbout(focusOf(of.extent, of.radius, this.focus));
      // (what is shown has grown or shrunk, or what the controls leave clear has changed: a view nobody has set takes it all in again)
      const fit = this.fit();
      if (!this.handSet && !this.journey && Math.abs(Math.log(fit) - this.zoomer.goal) > 1e-3) this.zoomer.goal = Math.log(fit);
    }
    super.update(dt, keys, fast);
  }

  // (seen from anywhere round it but along the axis itself, where which way is up is lost)
  protected override highest(): number {
    return POLE;
  }
  protected override lowest(): number {
    return Math.PI - POLE;
  }

  /**
   * The eye stays out of the body: where a turn or a zoom would take it under `CLEAR` metres over the body's radius, it
   * comes up round what it turns about, at the same distance, by the least that clears it. Where no place at that
   * distance clears (the pivot on its way between the body's centre and the vehicle, with the eye close in), it is
   * further off for as long as that lasts, by the least that does: the zoom still goes where it was asked.
   */
  protected override limit(): void {
    this.phi = THREE.MathUtils.clamp(this.phi, POLE, Math.PI - POLE);
    const of = this.of;
    if (!of) return;
    const offset = this.eye(v).sub(this.pivot);
    let d = offset.length();
    const up = w.copy(this.pivot).sub(of.centre);
    const p = up.length();
    const floor = of.radius + CLEAR;
    if (d < 1 || p < 1 || offset.clone().add(up).length() >= floor) return;
    if (d < floor - p + CLEAR) {
      d = floor - p + CLEAR;
      offset.setLength(d);
      this.zoomer.now = Math.log(d);
    }
    // the eye's radius is p^2 + d^2 + 2 p d cos(a), a the angle from straight up at the pivot to the eye: the least cos(a) that clears
    const need = (floor * floor - p * p - d * d) / (2 * p * d);
    if (!(need < 1)) return;
    up.divideScalar(p);
    const along = offset.dot(up) / d;
    const side = offset.addScaledVector(up, -along * d);
    if (side.lengthSq() < 1e-9) return;
    side.normalize();
    const cos = Math.max(need, -1);
    this.setOffset(side.multiplyScalar(Math.sqrt(1 - cos * cos) * d).addScaledVector(up, cos * d));
  }

  /** The zoom is about what it turns about: nothing at this distance is near and solid enough to be gone toward. */
  override zoom(nepers: number, _hit: THREE.Vector3 | null): void {
    super.zoom(nepers, null);
  }

  /** The reset: what it turns about and how far off are chosen for it again, and everything shown is framed. */
  override home(): void {
    this.focusSet = false;
    this.handSet = false;
    const of = this.of;
    if (!of) return;
    this.turnAbout(this.world.craft() ? focusOf(of.extent, of.radius, 'craft') : 'body');
    this.zoomer.goal = Math.log(this.fit());
  }
}
