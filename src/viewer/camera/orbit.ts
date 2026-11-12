import * as THREE from 'three';
import {
  aimBelow,
  anchorOk,
  anglesOf,
  approach,
  Coast,
  ease,
  fitDistance,
  frameOf,
  type Journey,
  journeyAt,
  journeySeconds,
  offsetOf,
  Zoom,
  zoomBy,
} from './maths.ts';
import { type Craft, looking, type Pose, type Rig, type RigId, type World, Y } from './rig.ts';

/** The nearest the view comes to looking straight down, radians. */
const MIN_POLAR = 0.02;
/** How far the eye stays above the ground, and the pivot, metres. */
const EYE = 0.35;
const PIVOT = 0.1;
/** The drift round a subject, radians a second: a turn in two minutes. */
const DRIFT = (2 * Math.PI) / 120;
/** The fastest a flung view turns, radians a second. */
const FLING = 5;
/** How quickly the frame's clear part is followed when a panel opens or shuts, seconds. */
const INSET_TAU = 0.25;
/** The furthest the chase view backs off from the vehicle, metres: the Earth's curve and the path flown are seen from there. */
export const CHASE_FAR = 400_000;
/** How much of the frame's height the vehicle fills when the chase view frames it. */
const CHASE_FILL = 0.5;
/** Seconds to come back onto a vehicle that has just changed shape. */
const SETTLE = 1.2;

const v = new THREE.Vector3();
const w = new THREE.Vector3();
const eye = new THREE.Vector3();
const w4 = new THREE.Quaternion();

/**
 * The camera turning about a pivot: a place, a part, a model, a point. It keeps the pivot, two
 * angles and a distance, in a frame whose up is the plumb line at the pivot, and everything the
 * hands do changes one of those and nothing else:
 *
 *  - a drag turns it (the angles); let go while moving, it coasts to a stop;
 *  - a pan slides the pivot over the ground, as far in a second as the view is wide;
 *  - a zoom changes the distance by proportion; going out it changes nothing else, ever; going in
 *    over something near and solid it draws the pivot toward that (maths.ts: zoomBy);
 *  - a journey (goTo) is the only thing that moves it by itself, and any touch ends it where it is.
 *
 * The pivot is seen in the middle of the part of the frame the controls leave clear (`inset`), by
 * tipping the camera where it stands, so framing never fights the distance.
 */
export class OrbitRig implements Rig {
  readonly id: RigId = 'orbit';
  readonly pivot = new THREE.Vector3();
  readonly lens: number | null = null;
  theta = -0.67;
  phi = 1.4;
  distance = 30;
  /** The nearest and furthest the pivot is seen from, metres: set by whoever frames a subject. */
  min = 0.35;
  max = 2000;
  /** Turn slowly round the pivot while nobody has hold of the view. */
  drift = false;
  driftTimes = 1;
  /** The fraction of the frame's height the controls cover at the bottom. */
  inset = 0;
  /** An exact pose was asked for (a test, a screenshot): look straight at the pivot. */
  centred = false;
  /** No easing or coasting: everything happens at once (reduced motion). */
  calm = false;
  /** A pointer is down on the view. */
  held = false;
  /** The distance has been set by hand since the subject was last framed. */
  handSet = false;
  /** A zoom toward the pointer has moved the pivot (read and cleared by whoever shows where it is). */
  pivotMoved = false;
  journey: Journey | null = null;
  protected readonly zoomer = new Zoom(Math.log(30));
  protected anchor: THREE.Vector3 | null = null;
  protected readonly up = new THREE.Vector3(0, 1, 0);
  /** The frame the angles are measured in. */
  protected readonly turn = new THREE.Quaternion();
  protected insetNow = 0;
  /** The pivot can be slid by hand (not when it is a vehicle's). */
  protected pans = true;
  private readonly spinT = new Coast();
  private readonly spinP = new Coast();

  protected readonly world: World;
  /** The lens views are framed for, degrees. */
  protected readonly fov: number;

  constructor(world: World, fov: number) {
    this.world = world;
    this.fov = fov;
  }

  get busy(): boolean {
    return (
      Boolean(this.journey) ||
      this.zoomer.moving ||
      this.spinT.v !== 0 ||
      this.spinP.v !== 0 ||
      this.insetNow !== this.inset ||
      (this.drift && !this.held)
    );
  }

  /** The hands are on the view, or what they did is still playing out (a zoom easing, a turn coasting). */
  get handled(): boolean {
    return this.held || this.zoomer.moving || this.spinT.v !== 0 || this.spinP.v !== 0;
  }

  /** Move the whole view sideways by `by`: the pivot and the eye together, so neither the distance nor the direction changes. */
  shift(by: THREE.Vector3): void {
    this.pivot.add(by);
    this.anchor = null;
    if (this.journey) {
      this.journey.pivot0.add(by);
      this.journey.pivot1.add(by);
    }
  }

  /** The eye, in the scene. */
  eye(out = new THREE.Vector3()): THREE.Vector3 {
    return offsetOf(this.theta, this.phi, this.distance, this.turn, out).add(this.pivot);
  }

  enter(from: Pose, pivot: THREE.Vector3): void {
    this.pivot.copy(pivot);
    this.frame();
    this.keepPivot(); // (before the view is measured from it: the eye stays where it is, and looks at where the pivot may be)
    this.setOffset(v.copy(from.position).sub(this.pivot));
    // A view that looked up from under its pivot, where the place does not allow the eye that low: the eye stays where
    // it is, and the pivot comes down to where it can be turned about from there.
    const lowest = Math.max(MIN_POLAR, this.lowest());
    if (this.phi > lowest) {
      this.phi = lowest;
      this.pivot.copy(from.position).sub(offsetOf(this.theta, this.phi, this.distance, this.turn, v));
      this.keepPivot();
      this.setOffset(v.copy(from.position).sub(this.pivot));
    }
    this.still();
    this.handSet = true; // (a view taken over is as it was left: nothing frames it again)
  }

  /** Be where everything that eases is going, at once: an exact view, for a test or a picture. */
  settle(): void {
    this.still();
    this.insetNow = this.inset;
  }

  /** Stop everything that moves by itself. */
  protected still(): void {
    this.journey = null;
    this.anchor = null;
    this.spinT.v = this.spinP.v = 0;
    this.zoomer.set(Math.log(this.distance));
  }

  protected setOffset(offset: THREE.Vector3): void {
    const a = anglesOf(offset, this.turn);
    this.theta = a.theta;
    this.phi = a.phi;
    this.distance = Math.max(a.distance, 1e-3);
  }

  /** The frame for this instant: up is the plumb line at the pivot. */
  protected frame(): void {
    this.world.upAt(this.pivot, this.up);
    frameOf(this.up, this.turn);
  }

  /** Bring the pivot to where its subject has gone (a vehicle's rig); what it moved by, or null. */
  protected carry(_dt: number): THREE.Vector3 | null {
    return null;
  }

  /** Keep what must be kept of where the pivot is on its subject. */
  protected stow(): void {}

  /** The highest the eye may go round the pivot, radians from straight up: overhead, unless the place says less. */
  protected highest(): number {
    return Math.max(MIN_POLAR, this.world.minPolar?.() ?? 0);
  }

  /** The lowest the eye may go round the pivot, radians from straight up. */
  protected lowest(): number {
    return this.world.maxPolar();
  }

  /**
   * Put the view somewhere: `pivot`, seen from `eyeAt`. At once (`snap`), or flown there along an
   * arc. A flight to somewhere very far off is cut to: nothing is learnt from seconds of blur.
   * `again`: the same subject, framed again because it moved; a journey under way is pointed at where
   * it is now and goes on, instead of starting over (started over every frame, it would never arrive).
   */
  goTo(pivot: THREE.Vector3, eyeAt: THREE.Vector3, snap: boolean, again = false): void {
    const offset1 = eyeAt.clone().sub(pivot);
    if (again && !snap && this.journey) {
      this.journey.pivot1.copy(pivot);
      this.journey.offset1.copy(offset1);
      return;
    }
    const offset0 = offsetOf(this.theta, this.phi, this.distance, this.turn);
    const far = this.pivot.distanceTo(pivot);
    this.still();
    if (snap || this.calm || far > Math.max(20_000, 200 * offset1.length())) {
      this.pivot.copy(pivot);
      this.frame();
      this.setOffset(offset1);
      this.zoomer.set(Math.log(this.distance));
      return;
    }
    this.journey = {
      pivot0: this.pivot.clone(),
      pivot1: pivot.clone(),
      offset0,
      offset1,
      t: 0,
      seconds: journeySeconds(this.pivot, offset0, pivot, offset1),
    };
  }

  update(dt: number, keys: ReadonlySet<string>, fast: boolean): void {
    const moved = this.carry(dt);
    if (moved) {
      this.anchor?.add(moved);
      if (this.journey) {
        this.journey.pivot0.add(moved);
        this.journey.pivot1.add(moved);
      }
    }
    this.frame();
    const j = this.journey;
    if (j) {
      j.t = Math.min(1, j.t + dt / j.seconds);
      journeyAt(j, this.pivot, v);
      this.frame();
      this.setOffset(v);
      this.zoomer.set(Math.log(this.distance));
      if (j.t >= 1) this.journey = null;
    }
    this.keys(dt, keys, fast);
    if (!this.journey) {
      if (this.drift && !this.held) this.theta -= DRIFT * this.driftTimes * dt;
      if (!this.held) {
        this.theta += this.spinT.step(dt);
        this.phi += this.spinP.step(dt);
      }
      const by = this.zoomer.step(dt, this.calm);
      if (by !== 0) {
        const factor = Math.exp(by);
        this.eye(eye);
        w.copy(this.pivot);
        const did = zoomBy(this.pivot, eye, factor, by < 0 ? this.anchor : null, this.min, this.max);
        if (w.distanceToSquared(this.pivot) > 1e-10) this.pivotMoved = true;
        this.distance = eye.distanceTo(this.pivot);
        this.zoomer.now = Math.log(this.distance);
        if (Math.abs(did - factor) > 1e-9 * factor) this.zoomer.goal = this.zoomer.now; // (a limit was met: nothing is owed)
      }
      this.limit();
    }
    this.insetNow = this.calm ? this.inset : approach(this.insetNow, this.inset, INSET_TAU, dt);
    if (Math.abs(this.insetNow - this.inset) < 1e-4) this.insetNow = this.inset;
    this.stow();
  }

  /** What the keys held do: the arrows turn and tilt, R and F zoom, and (where the pivot can be slid) W A S D E Q slide it. */
  protected keys(dt: number, keys: ReadonlySet<string>, fast: boolean): void {
    if (!keys.size) return;
    const has = (...names: string[]) => Number(names.some((k) => keys.has(k)));
    const turn = (has('arrowleft') - has('arrowright')) * 1.2 * dt;
    const tilt = (has('arrowup') - has('arrowdown')) * 0.9 * dt;
    const zoom = (has('f', '-') - has('r', '+', '=')) * 1.4 * dt;
    const along = has('w') - has('s');
    const across = has('d') - has('a');
    const rise = has('e') - has('q');
    const slide = this.pans && (along || across || rise);
    if (turn || tilt || zoom || slide) this.journey = null;
    this.theta += turn;
    this.phi -= tilt;
    if (zoom) {
      this.anchor = null;
      this.handSet = true;
      this.zoomer.set(
        THREE.MathUtils.clamp(
          this.zoomer.now + zoom,
          Math.min(this.zoomer.now, Math.log(this.min)),
          Math.max(this.zoomer.now, Math.log(this.max)),
        ),
      );
      this.distance = Math.exp(this.zoomer.now);
    }
    if (slide) {
      // a screen's width in about a second, at any zoom; Shift hurries
      const step = this.distance * 0.9 * dt * (fast ? 3 : 1);
      this.pivot
        .addScaledVector(this.ahead(v), along * step)
        .addScaledVector(this.right(v), across * step)
        .addScaledVector(this.up, rise * 0.7 * step);
    }
  }

  /** Level, away from the eye. */
  private ahead(out: THREE.Vector3): THREE.Vector3 {
    return out.set(-Math.sin(this.theta), 0, -Math.cos(this.theta)).applyQuaternion(this.turn);
  }

  /** Level, to the eye's right. */
  private right(out: THREE.Vector3): THREE.Vector3 {
    return out.set(Math.cos(this.theta), 0, -Math.sin(this.theta)).applyQuaternion(this.turn);
  }

  /**
   * What holds whatever the hands do: the tilt stays between straight down and the lowest the
   * place allows; a pivot that can be slid stays within reach of the place and above its ground;
   * and the eye stays above the ground, by coming up round the pivot at the same distance (never
   * by moving in, which would be a zoom nobody asked for).
   */
  protected limit(): void {
    const highest = this.highest();
    this.phi = THREE.MathUtils.clamp(this.phi, highest, Math.max(highest, this.lowest()));
    this.keepPivot();
    if (this.world.clearance(this.eye(eye)) >= EYE) return;
    let clear = MIN_POLAR;
    let low = this.phi;
    if (this.world.clearance(offsetOf(this.theta, clear, this.distance, this.turn, eye).add(this.pivot)) < EYE) return; // (nowhere round here is clear)
    for (let i = 0; i < 12; i++) {
      const mid = (clear + low) / 2;
      if (this.world.clearance(offsetOf(this.theta, mid, this.distance, this.turn, eye).add(this.pivot)) >= EYE) clear = mid;
      else low = mid;
    }
    this.phi = clear;
    this.spinP.v = 0;
  }

  /** A pivot that can be slid stays within reach of the place and above its ground. */
  protected keepPivot(): void {
    if (!this.pans) return;
    const { centre, radius } = this.world.reach();
    const off = v.copy(this.pivot).sub(centre);
    if (off.length() > radius) this.pivot.copy(centre).add(off.setLength(radius));
    const under = PIVOT - this.world.clearance(this.pivot);
    if (under > 0 && Number.isFinite(under)) this.pivot.addScaledVector(this.up, under);
  }

  pose(out: Pose): void {
    this.eye(out.position);
    const below = this.centred ? 0 : aimBelow(this.insetNow, this.fov);
    looking(out.position, this.pivot, v.copy(Y).applyQuaternion(this.turn), below, out.quaternion);
    out.fov = this.fov;
  }

  drag(dx: number, dy: number, height: number, pan: boolean): void {
    this.journey = null;
    this.spinT.v = this.spinP.v = 0;
    if (pan) {
      if (!this.pans) return;
      // the ground under the pointer goes with it
      const scale = (2 * this.distance * Math.tan(THREE.MathUtils.degToRad(this.fov / 2))) / height;
      this.pivot.addScaledVector(this.right(v), -dx * scale).addScaledVector(this.ahead(w), dy * scale);
      this.anchor = null;
      return;
    }
    this.theta -= (2 * Math.PI * dx) / height;
    this.phi -= (2 * Math.PI * dy) / height;
  }

  fling(vx: number, vy: number, height: number): void {
    if (this.calm) return;
    this.spinT.v = THREE.MathUtils.clamp((-2 * Math.PI * vx) / height, -FLING, FLING);
    this.spinP.v = THREE.MathUtils.clamp((-2 * Math.PI * vy) / height, -FLING, FLING);
  }

  zoom(nepers: number, hit: THREE.Vector3 | null): void {
    if (!nepers) return;
    this.journey = null;
    this.handSet = true;
    // toward the pointer only going in, only onto something near and solid, and not while the view drifts round its subject
    this.anchor = nepers < 0 && !this.drift && anchorOk(this.eye(eye), this.pivot, hit) ? hit.clone() : null;
    this.zoomer.push(nepers, this.anchor ? -Infinity : Math.log(this.min), Math.log(this.max));
  }

  twist(angle: number): void {
    this.journey = null;
    this.theta += angle;
  }

  home(): void {}
}

/**
 * The chase view: the orbiting camera with a vehicle for its pivot. The pivot is the middle of what
 * is left of the vehicle (or a place on it that has been zoomed to), carried with it wherever the
 * flight takes it, so the view moves only as the hands move it. `locked` measures its angles in the
 * vehicle's own frame, so the vehicle holds still and the world turns; otherwise they are measured
 * from the plumb line where the vehicle is, and the horizon stays level.
 *
 * When the vehicle changes shape (a stage leaves), the pivot is eased onto what is left; the
 * distance is kept if it was set by hand, and eased to fit what is left if it was not.
 */
export class ChaseRig extends OrbitRig {
  /** The pivot, from the middle of the vehicle, in the vehicle's own frame. */
  private readonly rel = new THREE.Vector3();
  private readonly middle = new THREE.Vector3();
  private readonly own = new THREE.Quaternion();
  /** The middle of the vehicle in its own frame, as it was last seen. */
  private readonly local = new THREE.Vector3();
  /** A place on the vehicle the pivot is being taken to (aimAt). */
  private goal: { from: THREE.Vector3; to: THREE.Vector3; t: number } | null = null;
  private shape = Number.NaN;
  /** It has been in charge before: there is a view of its own to come back to. */
  private been = false;
  private radius = 1;
  private flying = false;
  private settling: { from: THREE.Vector3; t: number } | null = null;
  /** Where `carry` last put the pivot: `stow` reads it back onto the vehicle only if something has moved it since. */
  private readonly carried = new THREE.Vector3(Number.NaN, Number.NaN, Number.NaN);

  override readonly id: 'chase' | 'locked';

  constructor(world: World, fov: number, id: 'chase' | 'locked') {
    super(world, fov);
    this.id = id;
    this.pans = false;
    this.max = CHASE_FAR;
  }

  override get busy(): boolean {
    return super.busy || Boolean(this.settling);
  }

  /** How far off the whole of what is left is framed from. */
  private get fit(): number {
    return fitDistance(2 * this.radius, this.fov, CHASE_FILL);
  }

  private read(craft: Craft): void {
    craft.matrix.decompose(v, this.own, w);
    this.middle.copy(craft.centre).applyMatrix4(craft.matrix);
    this.radius = craft.radius;
    this.flying = craft.flying;
    // (no nearer by the wheel or the keys than outside its skin; a zoom toward a place on it goes closer, to NEAREST)
    this.min = Math.max(0.35, 0.75 * craft.radius);
  }

  override enter(from: Pose, pivot: THREE.Vector3, resume = false): void {
    const craft = this.world.craft();
    if (!craft) {
      super.enter(from, pivot);
      return;
    }
    this.read(craft);
    this.local.copy(craft.centre);
    this.shape = craft.shape;
    this.rel.set(0, 0, 0);
    this.goal = null;
    this.settling = null;
    // From near it, the view is taken up as it stands. From far off (the vehicle lost to sight) or from inside it, it
    // is seen from the side the last view saw its subject from, and from where the whole of it is seen: the handover
    // carries the eye there, on top of however fast the vehicle is going.
    // Coming back from on board or from the pad camera, it is as it was last left: the same side, the same distance.
    if (resume && this.been) {
      const set = this.handSet;
      this.frame();
      super.enter(
        { ...from, position: offsetOf(this.theta, this.phi, set ? this.distance : this.fit, this.turn).add(this.middle) },
        this.middle,
      );
      this.handSet = set;
      return;
    }
    this.been = true;
    const far = from.position.distanceTo(this.middle);
    const near = !resume && far <= 6 * this.fit && far >= this.min;
    const seen = v.copy(from.position).sub(pivot);
    if (!near)
      from = {
        ...from,
        position: (seen.lengthSq() > 1e-6 ? seen : seen.set(-0.62, 0.2, 0.78)).setLength(this.fit).add(this.middle).clone(),
      };
    super.enter(from, this.middle);
    this.handSet = near;
  }

  protected override frame(): void {
    this.world.upAt(this.pivot, this.up);
    if (this.id === 'locked') this.turn.copy(this.own);
    else frameOf(this.up, this.turn);
  }

  protected override carry(dt: number): THREE.Vector3 | null {
    const craft = this.world.craft();
    if (!craft) return null;
    this.read(craft);
    if (craft.shape !== this.shape) {
      // what is left of it has changed: the pivot stays where it was on the vehicle for this instant (the middle has
      // moved in the vehicle's frame, so the pivot is as far the other way from it), then comes onto the new middle
      this.shape = craft.shape;
      this.rel.add(this.local).sub(craft.centre);
      this.local.copy(craft.centre);
      this.goal = null;
      this.settling = { from: this.rel.clone(), t: 0 };
      if (!this.handSet) this.zoomer.goal = Math.log(this.fit);
    }
    if (this.settling) {
      const s = this.settling;
      s.t = this.calm ? 1 : Math.min(1, s.t + dt / SETTLE);
      this.rel.copy(s.from).multiplyScalar(1 - ease(s.t));
      if (s.t >= 1) this.settling = null;
    }
    const to = v.copy(this.rel).applyQuaternion(this.own).add(this.middle);
    const moved = to.clone().sub(this.pivot);
    this.pivot.copy(to);
    this.carried.copy(to);
    return moved;
  }

  protected override stow(): void {
    if (this.settling) return;
    // (a pivot nothing has moved since it was carried is where `rel` put it: `rel` read back from it would come back
    // a last bit out every frame, and a vehicle that moved away and back would not find the eye where it had been)
    if (this.pivot.equals(this.carried)) return;
    this.rel.copy(this.pivot).sub(this.middle).applyQuaternion(w4.copy(this.own).invert());
    if (this.rel.length() > 1.2 * this.radius) {
      this.rel.setLength(1.2 * this.radius);
      this.pivot.copy(this.rel).applyQuaternion(this.own).add(this.middle);
    }
  }

  protected override lowest(): number {
    return this.flying || this.id === 'locked' ? Math.PI - 0.05 : this.world.maxPolar();
  }

  // (a vehicle in flight is seen from anywhere round it)
  protected override highest(): number {
    return this.flying || this.id === 'locked' ? MIN_POLAR : super.highest();
  }

  /** Look at a place on the vehicle (`centre`, in the scene) from `distance`, keeping the direction: a part chosen while it flies. */
  aimAt(centre: THREE.Vector3, distance: number, min: number): void {
    this.rel.copy(this.pivot).sub(this.middle).applyQuaternion(w4.copy(this.own).invert());
    const to = centre.clone().sub(this.middle).applyQuaternion(w4);
    // eased as a change of shape is: from where the pivot is to where it is wanted
    this.settling = null;
    this.goal = { from: this.rel.clone(), to, t: 0 };
    this.min = Math.max(0.2, min);
    this.anchor = null;
    this.handSet = false;
    this.zoomer.goal = Math.log(THREE.MathUtils.clamp(distance, this.min, this.max));
  }

  override update(dt: number, keys: ReadonlySet<string>, fast: boolean): void {
    const g = this.goal;
    if (g) {
      g.t = this.calm ? 1 : Math.min(1, g.t + dt / SETTLE);
      this.rel.lerpVectors(g.from, g.to, ease(g.t));
      if (g.t >= 1) this.goal = null;
    }
    super.update(dt, keys, fast);
  }

  override drag(dx: number, dy: number, height: number, pan: boolean): void {
    if (!pan) super.drag(dx, dy, height, false);
  }

  /** Back onto the middle of the vehicle, from where the whole of it is seen. */
  override home(): void {
    this.goal = null;
    this.settling = { from: this.rel.clone(), t: 0 };
    this.anchor = null;
    this.handSet = false;
    this.zoomer.goal = Math.log(this.fit);
  }
}
