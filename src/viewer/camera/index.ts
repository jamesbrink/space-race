import * as THREE from 'three';
import { FreeRig } from './free.ts';
import { type Hands, listen } from './input.ts';
import { anchorOk, blendPose, ease, fitDistance, nudgeIntoFrame } from './maths.ts';
import { OnboardRig } from './onboard.ts';
import { ChaseRig, OrbitRig } from './orbit.ts';
import { looking, type Pose, type Rig, type RigId, type World } from './rig.ts';
import { TrackRig } from './track.ts';

export { RIGS, type RigId } from './rig.ts';

/**
 * The camera: one place that says where the view is from, whatever is holding it. `Stage` owns one
 * of these and asks it for everything; nothing else moves the camera when nobody is being walked as.
 *
 * It holds a rig for each way of seeing (rig.ts: RigId) and one of them is in charge. Hands on the
 * page (input.ts) are passed to that rig; a change of rig is a handover in which the new rig is in
 * charge from the first frame and what is left of the old view fades out on top of it, so nothing
 * jumps and nothing has to be waited for. What is promised, whatever the rig (tests/camera.test.mjs,
 * and the browser's soak):
 *
 *  1. Zooming out pulls straight back from the pivot. It never moves the pivot or turns the view.
 *  2. Zooming in goes toward the pointer only onto something near and solid; never to the sky, the
 *     far ground or the globe. The pivot is shown for a moment whenever it has been moved.
 *  3. Once the hands have set a distance or a direction, only an explicit act changes it: choosing
 *     something, a view button, 0, C. Nothing that happens by itself (a slider, the clock, a panel
 *     opening, a stage leaving) frames the view again.
 *  4. Every motion is by time, not by frame, and any touch ends a journey where it is.
 *  5. The eye never goes under the ground or the sea.
 *
 * It knows nothing of any flight: what there is to turn about, sit in and follow comes through `Scene`.
 */
export interface Scene extends World {
  /**
   * What a ray from the eye through this place in the view (-1 to 1 across and up) first meets that is solid: a
   * model, the place round it, or the ground (`ground`: bare ground, not a thing).
   */
  solidAt(x: number, y: number): { point: THREE.Vector3; ground: boolean } | null;
  /** Nobody is being walked as: the view is the camera's. */
  free(): boolean;
  /** The vehicle is being flown by hand: W A S D Q E are its keys. */
  piloted(): boolean;
  /** The vehicle is what is being looked at (its section is open, and the page is being used, not shown). */
  watching(): boolean;
}

export interface Told {
  /** The hands have taken the view: turned or slid it (`move`), zoomed it, or only tilted it. */
  taken(how: 'move' | 'zoom' | 'tilt'): void;
  /** The reset key. */
  home(): void;
  /** The reset key in a view that is about the vehicle: true if that was all it meant (the view came back to the vehicle from something else it was following). */
  back?(): boolean;
  /** The rig in charge has changed. */
  rig(id: RigId): void;
}

/** The rigs that are about a vehicle. */
const VEHICLE: readonly RigId[] = ['chase', 'locked', 'onboard', 'pad'];
/** How high a tripod holds a camera, metres. */
const TRIPOD = 1.7;
const NO_KEYS: ReadonlySet<string> = new Set();
const v = new THREE.Vector3();

export class Cameras {
  readonly orbit: OrbitRig;
  readonly chase: ChaseRig;
  readonly locked: ChaseRig;
  readonly onboard: OnboardRig;
  readonly pad: TrackRig;
  readonly free: FreeRig;
  /** Keys being held down, lower case, and whether Shift is. */
  readonly keys = new Set<string>();
  private fast = false;
  private active: Rig;
  private readonly now: Pose = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), fov: 35 };
  /** What is left of the last rig's view, fading out over the new one. */
  private blend: { p: THREE.Vector3; q: THREE.Quaternion; fov: number; t: number; seconds: number } | null = null;
  private wasFlying = false;
  private stood = false;
  private quiet = false;
  /** The press under way has already been counted as taking the view. */
  private took = false;
  private readonly mark: HTMLElement;
  private marked = 0;
  /** What is under the pointer for the zoom gesture going on: looked up once a gesture, when it first goes in. */
  private under: THREE.Vector3 | null | undefined;

  private readonly camera: THREE.PerspectiveCamera;
  private readonly canvas: HTMLElement;
  private readonly scene: Scene;
  private readonly told: Told;
  /** The lens views are framed for, degrees. */
  private readonly lens: number;

  constructor(camera: THREE.PerspectiveCamera, canvas: HTMLElement, scene: Scene, told: Told, lens: number) {
    this.camera = camera;
    this.canvas = canvas;
    this.scene = scene;
    this.told = told;
    this.lens = lens;
    this.orbit = new OrbitRig(scene, lens);
    this.chase = new ChaseRig(scene, lens, 'chase');
    this.locked = new ChaseRig(scene, lens, 'locked');
    this.onboard = new OnboardRig(scene);
    this.pad = new TrackRig(scene);
    this.free = new FreeRig(scene, lens);
    this.active = this.orbit;
    this.now.position.copy(camera.position);
    this.now.quaternion.copy(camera.quaternion);
    this.mark = document.createElement('i');
    this.mark.setAttribute('aria-hidden', 'true');
    this.mark.style.cssText =
      'position:fixed;left:0;top:0;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;pointer-events:none;opacity:0;z-index:2;' +
      'border:1.5px solid rgba(255,255,255,.85);box-shadow:0 0 0 1px rgba(0,0,0,.45),inset 0 0 0 1px rgba(0,0,0,.45);' +
      'background:radial-gradient(circle,rgba(255,255,255,.95) 0 1.5px,transparent 2.5px)';
    canvas.parentElement?.append(this.mark);
    listen(canvas, this.hands());
  }

  /** The rig in charge. */
  get rig(): RigId {
    return this.active.id;
  }

  /** What the view is about: the point it turns round or looks at. */
  get pivot(): THREE.Vector3 {
    return this.active.pivot;
  }

  /** The rig in charge has a lens of its own (the stage's walker leaves the lens alone). */
  get ownsLens(): boolean {
    return this.active.lens !== null || Boolean(this.blend?.fov);
  }

  /** A journey to something chosen is under way. */
  get travelling(): boolean {
    return this.active === this.orbit ? Boolean(this.orbit.journey) : this.active.busy;
  }

  /** Something is still moving by itself: the frame is drawn again. */
  get busy(): boolean {
    return this.active.busy || Boolean(this.blend);
  }

  /** No easing, coasting or flying about: for anyone who has asked for less motion. */
  set calm(on: boolean) {
    this.quiet = on;
    for (const rig of [this.orbit, this.chase, this.locked, this.onboard, this.pad, this.free]) rig.calm = on;
  }

  get calm(): boolean {
    return this.quiet;
  }

  /**
   * The rigs there are to choose from as things stand: on the pad, about the place; with a flight in the air, about the
   * vehicle. The pad camera only while it can see the vehicle (`padSees`): not once it is down the range below the horizon.
   */
  available(): RigId[] {
    const craft = this.scene.craft();
    // (an exhibit stands still to be sat in: there is the view of it, and the view from its seat)
    if (craft?.exhibit) return craft.seat ? ['orbit', 'onboard'] : ['orbit'];
    const about: RigId[] = craft
      ? ['chase', 'locked', ...(craft.seat ? (['onboard'] as const) : []), ...(this.padSees() ? (['pad'] as const) : [])]
      : [];
    if (this.scene.piloted() && about.length) return about;
    return craft?.flying ? [...about, 'free'] : ['orbit', 'free'];
  }

  /** Whether the pad camera can see the vehicle from where it stands (or, not yet stood anywhere, from the place). */
  private padSees(): boolean {
    return this.pad.sees(this.stood ? this.pad.at : this.scene.reach().centre);
  }

  /** The rig C goes to next. */
  next(): RigId {
    const all = this.available();
    return all[(all.indexOf(this.active.id) + 1) % all.length]!;
  }

  private rigOf(id: RigId): Rig {
    return this[id];
  }

  /**
   * Put another rig in charge. It takes over from the view as it stands; what differs between that
   * and its own view fades over a moment (not at all with `snap`), while it already answers the hands.
   */
  set(id: RigId, snap = false): void {
    const craft = this.scene.craft();
    if (
      id === this.active.id ||
      (VEHICLE.includes(id) && (!craft || (craft.exhibit && id !== 'onboard'))) ||
      (id === 'onboard' && !craft?.seat) ||
      (id === 'pad' && !this.padSees())
    )
      return;
    const last = this.active;
    this.refresh();
    const from: Pose = { position: this.now.position.clone(), quaternion: this.now.quaternion.clone(), fov: this.now.fov };
    const next = this.rigOf(id);
    if (id === 'pad') this.pad.stand(this.tripod(last, from));
    // Out of an exhibit's seat to the view it was taken from: that view is as it was left (it has not been stepped since),
    // and is taken up as it stands. Into one, the view it is taken from is remembered for that.
    const back = last === this.onboard && id === this.seatedFrom && Boolean(craft?.exhibit);
    this.seatedFrom = id === 'onboard' && craft?.exhibit && (last === this.orbit || last === this.free) ? last.id : null;
    if (!back)
      next.enter(
        from,
        id === 'orbit' ? this.pivotFor(last, from) : last.pivot.clone(),
        last === this.onboard || last === this.pad,
        // (the place's view at a distance nobody chose: a rig about the vehicle frames the vehicle, it does not inherit it)
        last === this.orbit && !this.orbit.handSet,
      );
    this.active = next;
    if (next === this.orbit && !back) this.orbit.centred = false;
    this.under = undefined;
    this.handOver(from, snap);
    if (id === 'orbit') this.showPivot();
    this.told.rig(id);
  }

  /** The view an exhibit's seat was taken from (`set`): where leaving the seat goes back to, as it was left. */
  private seatedFrom: RigId | null = null;

  /** Out of an exhibit's seat: back to the view it was taken from, as that was left (the orbiting view, if none). */
  unseat(): void {
    if (this.active === this.onboard) this.set(this.seatedFrom ?? 'orbit');
  }

  /**
   * The seat the on-board view is from has changed (another seat of the same exhibit): the head is a fresh one in it,
   * and the handover carries the eye across, as a change of rig does.
   */
  reseat(): void {
    if (this.active !== this.onboard || !this.scene.craft()?.seat) return;
    const from: Pose = { position: this.now.position.clone(), quaternion: this.now.quaternion.clone(), fov: this.now.fov };
    this.onboard.enter();
    this.handOver(from, false);
  }

  /**
   * What the rigs about the vehicle are about has become another body (the view was sent to a stage that has left, or
   * back from one): the chase view takes it up afresh from the view as it stands, the whole of it framed from the side
   * it is seen from now, and the handover carries the eye there.
   */
  retake(): void {
    if (!this.scene.craft()) return;
    const last = this.active;
    this.refresh();
    const from: Pose = { position: this.now.position.clone(), quaternion: this.now.quaternion.clone(), fov: this.now.fov };
    this.chase.enter(from, last.pivot.clone(), false, true);
    this.active = this.chase;
    this.under = undefined;
    this.handOver(from, false);
    if (last !== this.chase) this.told.rig('chase');
  }

  /** What the orbiting rig turns about when it takes over: what the last rig was about, or, after flying free, what is in the middle of the view. */
  private pivotFor(last: Rig, from: Pose): THREE.Vector3 {
    if (last !== this.free) return last.pivot.clone();
    const hit = this.scene.solidAt(0, 0)?.point;
    return hit && from.position.distanceTo(hit) <= this.scene.far() ? hit : last.pivot.clone();
  }

  /**
   * Where the pad camera stands: where the view was, set down on the ground, if the view was one of
   * the place (orbiting or free) and within reach of it; otherwise where it last stood, or to one
   * side of the place, far enough off to see the whole vehicle go.
   */
  private tripod(last: Rig, from: Pose): THREE.Vector3 {
    const { centre, radius } = this.scene.reach();
    const onGround = (p: THREE.Vector3) => {
      const above = this.scene.clearance(p);
      if (Number.isFinite(above)) p.y += TRIPOD - above;
      return p;
    };
    if ((last === this.orbit || last === this.free) && from.position.distanceTo(centre) <= radius) {
      this.stood = true;
      return onGround(from.position.clone());
    }
    if (this.stood) return this.pad.at.clone();
    this.stood = true;
    const far = Math.max(120, 8 * (this.scene.craft()?.radius ?? 15));
    return onGround(new THREE.Vector3(centre.x - 0.62 * far, centre.y, centre.z + 0.78 * far));
  }

  /**
   * Frame a subject: its `centre`, from `distance`, seen from `direction` (pivot to eye; left out,
   * from where the view is now). An explicit act: it is the only thing, with the reset key, that
   * may move a view the hands have set. `onCraft`: the subject is part of the flown vehicle (`whole`:
   * all of it); in flight that is the chase view's to show, since nothing else can keep up with it.
   * `again`: the subject framed last time, framed again because it moved or the frame changed shape.
   */
  frame(to: {
    centre: THREE.Vector3;
    distance: number;
    direction?: THREE.Vector3;
    min: number;
    max?: number;
    snap?: boolean;
    onCraft?: boolean;
    whole?: boolean;
    again?: boolean;
  }): void {
    if (to.onCraft && this.scene.craft()?.flying && this.scene.watching()) {
      if (!(this.active instanceof ChaseRig)) this.set('chase', to.snap);
      const chase = this.active as ChaseRig;
      if (to.whole) chase.home();
      else chase.aimAt(to.centre, to.distance, to.min);
      return;
    }
    if (VEHICLE.includes(this.active.id)) this.set('orbit', to.snap);
    const from = to.direction?.clone().normalize() ?? this.direction();
    const eye = to.centre.clone().addScaledVector(from, to.distance);
    if (this.active === this.free) {
      this.free.goTo(to.centre, eye, Boolean(to.snap));
      return;
    }
    this.orbit.min = to.min;
    if (to.max !== undefined) this.orbit.max = to.max;
    this.orbit.centred = false;
    this.orbit.handSet = false;
    this.orbit.goTo(to.centre, eye, Boolean(to.snap), to.again);
    if (to.snap) this.blend = null;
  }

  /** How far off a subject `span` metres across is framed from, to fill `fill` of the frame's height. */
  fit(span: number, fill: number): number {
    return fitDistance(span, this.lens, fill);
  }

  /** Come round the subject by `turn` radians, to `rise` radians above the level, at the same distance: a new angle on the same thing. */
  swing(turn: number, rise: number): void {
    if (this.active !== this.orbit) return;
    const o = this.orbit;
    // (round where the view is going, if it is on its way somewhere)
    const pivot = o.journey?.pivot1.clone() ?? o.pivot.clone();
    const offset = o.journey?.offset1.clone() ?? o.eye().sub(o.pivot);
    const distance = offset.length();
    const flat = new THREE.Vector3(offset.x, 0, offset.z).normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), turn);
    offset
      .copy(flat.multiplyScalar(Math.cos(rise)))
      .setY(Math.sin(rise))
      .multiplyScalar(distance);
    o.goTo(pivot, pivot.clone().add(offset), false);
  }

  /** For tests and screenshots: the orbiting rig, exactly here, looking straight at `pivot`, and still. */
  place(pivot: THREE.Vector3, eye: THREE.Vector3): void {
    this.set('orbit', true);
    this.blend = null;
    this.orbit.drift = false;
    this.orbit.centred = true;
    this.orbit.goTo(pivot, eye, true);
    this.orbit.settle();
    this.orbit.handSet = true;
  }

  /** Turn the orbiting view about the vertical where it is, at once and with nothing left easing (a test's view from another side). */
  turn(angle: number): void {
    this.orbit.theta += angle;
    this.orbit.settle();
    this.blend = null;
  }

  /** Drift slowly round the subject while nobody has hold of the view. */
  set drift(on: boolean) {
    this.orbit.drift = on;
  }

  get drift(): boolean {
    return this.orbit.drift;
  }

  /** How fast the drift is, as a multiple of the usual. */
  set driftTimes(times: number) {
    this.orbit.driftTimes = times;
  }

  /** The fraction of the frame's height the controls cover at the bottom: subjects are seen in the middle of what is left. */
  set inset(fraction: number) {
    this.orbit.inset = this.chase.inset = this.locked.inset = this.pad.inset = fraction;
  }

  get inset(): number {
    return this.orbit.inset;
  }

  /** The fraction of the frame's height nothing covers, top or bottom: the chase views frame the whole vehicle inside it. */
  set clear(fraction: number) {
    this.chase.clear = this.locked.clear = fraction;
  }

  /** The hands are on the orbiting view, or what they did is still playing out. */
  get handled(): boolean {
    return this.orbit.handled;
  }

  /**
   * The least sideways move of the orbiting view that brings `centre` back inside the middle of the clear part of
   * the frame: zero if it is there already. For a subject that has moved by itself under a view the hands have set.
   */
  offFrame(centre: THREE.Vector3, keep = 0.85): THREE.Vector3 {
    const o = this.orbit;
    const eye = o.eye();
    const straight = looking(eye, o.pivot, this.scene.upAt(o.pivot, v), 0, new THREE.Quaternion());
    return nudgeIntoFrame(eye, straight, this.lens, this.camera.aspect, centre, keep * (1 - o.inset));
  }

  /** Move the orbiting view sideways by `by`, changing neither its distance nor its direction. */
  shift(by: THREE.Vector3): void {
    this.orbit.shift(by);
  }

  /** Where the view is from the pivot, as it stands: the direction a subject is framed from when the view's own is to be kept. */
  direction(out = new THREE.Vector3()): THREE.Vector3 {
    this.refresh();
    return out.copy(this.now.position).sub(this.pivot).normalize();
  }

  /**
   * Where the view is from at this instant, worked out again without time passing: the rig may have been put
   * somewhere since the last frame (a view framed at once, then another rig asked for in the same breath).
   */
  private refresh(): void {
    const fov = this.now.fov;
    this.active.update(0, NO_KEYS, false);
    this.active.pose(this.now);
    const b = this.blend;
    if (b) {
      blendPose(this.now.position, this.now.quaternion, b.p, b.q, ease(b.t));
      this.now.fov += b.fov * (1 - ease(b.t));
    }
    if (this.active.lens === null && !b?.fov) this.now.fov = fov;
  }

  /**
   * The view has been walked or carried somewhere by something else (a walk has ended): the rig in
   * charge takes it up from where the camera now is, turning about `pivot`.
   */
  adopt(pivot: THREE.Vector3): void {
    const from: Pose = { position: this.camera.position.clone(), quaternion: this.camera.quaternion.clone(), fov: this.now.fov };
    this.active.enter(from, pivot);
    this.handOver(from, false);
  }

  /** Start fading what is left of the view `from` over the rig now in charge. */
  private handOver(from: Pose, snap: boolean): void {
    const to: Pose = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), fov: this.lens };
    this.active.update(0, NO_KEYS, false);
    this.active.pose(to);
    const p = from.position.clone().sub(to.position);
    this.blend =
      snap || this.quiet
        ? null
        : {
            p,
            q: to.quaternion.clone().invert().multiply(from.quaternion),
            fov: this.active.lens === null ? 0 : from.fov - to.fov,
            t: 0,
            seconds: THREE.MathUtils.clamp(0.45 + 0.2 * Math.log2(1 + p.length() / 3), 0.45, 1.4),
          };
  }

  /** Bring the view back to what it is about; with a flight in the air and the view elsewhere, to the vehicle. */
  refind(): void {
    if (!VEHICLE.includes(this.active.id) && this.scene.craft()?.flying) {
      this.set('chase');
      return;
    }
    this.active.home();
    this.showPivot();
  }

  /** `dt` seconds on: the rig in charge moves, and the camera is put where it says. */
  update(dt: number): void {
    const craft = this.scene.craft();
    const flying = Boolean(craft?.flying);
    if (flying !== this.wasFlying) {
      this.wasFlying = flying;
      // The vehicle has left the pad while it was being looked at: the view goes with it, or it is lost in a moment.
      // Back on the pad (the clock put back, the flight over), the place is the subject again.
      if (flying && this.active === this.orbit && !this.orbit.centred && this.scene.watching()) this.set('chase');
      else if (!flying && VEHICLE.includes(this.active.id) && !this.scene.piloted()) {
        // The vehicle is on its pad again, all at once. A view that was turning about it comes with it, as it
        // was beside it; one from inside it or from the pad camera goes to where the section starts.
        const about = this.active instanceof ChaseRig;
        if (about) {
          this.active.update(0, NO_KEYS, false);
          this.active.pose(this.now);
        }
        this.set('orbit', true);
        if (!about) this.told.home();
      }
    }
    // The vehicle has gone below the pad camera's horizon (or out of its reach) while it was being watched from there:
    // the camera would look into the ground, so the chase takes over with the usual handover (C no longer offers it).
    if (this.active === this.pad && flying && !this.pad.sees(this.pad.at)) this.set('chase');
    this.pad.aspect = this.camera.aspect;
    const keys = this.scene.piloted() ? this.unspoken() : this.keys;
    this.active.update(dt, keys, this.fast);
    const now = this.now;
    this.active.pose(now);
    const b = this.blend;
    if (b) {
      b.t = Math.min(1, b.t + dt / b.seconds);
      const k = ease(b.t);
      blendPose(now.position, now.quaternion, b.p, b.q, k);
      now.fov += b.fov * (1 - k);
      if (b.t >= 1) this.blend = null;
    }
    if (b || this.travelling) {
      // (between two views, or on the way to one, the line taken may pass under a rise in the ground)
      const under = 0.2 - this.scene.clearance(now.position);
      if (under > 0 && Number.isFinite(under)) now.position.addScaledVector(this.scene.upAt(now.position, v), under);
    }
    const camera = this.camera;
    camera.position.copy(now.position);
    camera.quaternion.copy(now.quaternion);
    this.scene.upAt(this.pivot, camera.up);
    if (this.active.lens !== null || b?.fov) {
      if (camera.fov !== now.fov) {
        camera.fov = now.fov;
        camera.updateProjectionMatrix();
      }
    } else now.fov = camera.fov;
    if (this.orbit.pivotMoved || this.chase.pivotMoved || this.locked.pivotMoved) {
      this.orbit.pivotMoved = this.chase.pivotMoved = this.locked.pivotMoved = false;
      this.showPivot();
    }
    if (this.marked) this.placeMark();
  }

  /** The keys held, less the ones a vehicle being flown has taken. */
  private unspoken(): ReadonlySet<string> {
    const out = new Set(this.keys);
    for (const k of 'wasdqe') out.delete(k);
    return out;
  }

  /** Show where the pivot is, for a moment: a small ring that fades. */
  showPivot(): void {
    if (this.active !== this.orbit && !(this.active instanceof ChaseRig)) return;
    const at = performance.now();
    this.marked = at;
    this.mark.getAnimations().forEach((a) => a.cancel());
    this.mark.animate([{ opacity: 0.95 }, { opacity: 0.95, offset: 0.55 }, { opacity: 0 }], {
      duration: 950,
      easing: 'ease-out',
    }).onfinish = () => {
      if (this.marked === at) this.marked = 0;
    };
  }

  private placeMark(): void {
    v.copy(this.pivot).project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    const shown = v.z < 1 && Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1;
    this.mark.style.transform = `translate(${r.left + ((v.x + 1) / 2) * r.width}px, ${r.top + ((1 - v.y) / 2) * r.height}px)`;
    this.mark.style.visibility = shown ? 'visible' : 'hidden';
  }

  /** Where a place on the page is in the view: -1 to 1 across and up. */
  private inView(x: number, y: number): [number, number] {
    const r = this.canvas.getBoundingClientRect();
    return [((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1];
  }

  private hands(): Hands {
    const height = () => Math.max(1, this.canvas.clientHeight);
    return {
      on: () => this.scene.free(),
      spoken: () => this.scene.piloted(),
      grab: () => {
        this.orbit.held = this.chase.held = this.locked.held = true;
        this.took = false;
      },
      release: () => this.release(),
      drag: (dx, dy, slide) => {
        if (!this.took) this.told.taken('move');
        this.took = true;
        this.active.drag(dx, dy, height(), slide);
        if (slide && this.active === this.orbit) this.showPivot();
      },
      fling: (vx, vy) => this.active.fling(vx, vy, height()),
      zoom: (nepers, x, y, fresh) => {
        if (!nepers) return;
        this.told.taken('zoom');
        if (fresh) this.under = undefined;
        // going in, what is under the pointer is looked up, once a gesture; going out it does not matter what is
        if (nepers < 0 && this.under === undefined) {
          const hit = this.scene.solidAt(...this.inView(x, y));
          const point = hit?.point ?? null;
          this.under = this.active === this.free || anchorOk(this.now.position, this.pivot, point, hit?.ground) ? point : null;
        }
        this.active.zoom(nepers, nepers < 0 ? (this.under ?? null) : null);
      },
      twist: (angle) => this.active.twist(angle),
      pivotAt: (x, y) => {
        // turn about what was clicked, from the same side and as far off: only the pivot moves
        const hit = this.scene.solidAt(...this.inView(x, y))?.point;
        if (!hit || this.active !== this.orbit || this.now.position.distanceTo(hit) > this.scene.far()) return;
        this.told.taken('move');
        const o = this.orbit;
        o.goTo(hit, hit.clone().add(o.eye().sub(o.pivot)), false);
        this.showPivot();
      },
      key: (key, down, first) => {
        if (!down) return void this.keys.delete(key);
        this.keys.add(key);
        if (!first) return;
        // Tilting and zooming adjust the view and leave it drifting; a tilt even keeps it framed on what was chosen.
        // Moving or turning it by hand takes it over.
        const tilt = key === 'arrowup' || key === 'arrowdown';
        const zoom = ['r', 'f', '+', '=', '-'].includes(key);
        const steers = this.active === this.orbit || this.active === this.free || key.startsWith('arrow');
        if (zoom || tilt || steers) this.told.taken(tilt ? 'tilt' : zoom ? 'zoom' : 'move');
      },
      shift: (on) => {
        this.fast = on;
      },
      home: () => {
        if (this.active === this.orbit || this.active === this.free) this.told.home();
        else if (!this.told.back?.()) this.refind();
      },
      clear: () => {
        this.keys.clear();
        this.release();
      },
    };
  }

  private release(): void {
    this.orbit.held = this.chase.held = this.locked.held = false;
  }
}
