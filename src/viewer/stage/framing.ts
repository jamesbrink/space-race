import * as THREE from 'three';
import type { ModelDef } from '../../types.ts';
import type { Setting } from '../backdrops.ts';
import type { Cameras } from '../camera/index.ts';

const UP = new THREE.Vector3(0, 1, 0);

/** What framing asks of the stage: what is on show and where, and whom to tell. */
export interface FramingHost {
  readonly canvas: HTMLCanvasElement;
  readonly camera: THREE.PerspectiveCamera;
  readonly cam: Cameras;
  /** The orbiting camera's lens, vertical degrees: views are framed for it. */
  readonly lens: number;
  /** The section's parts, by node; its definition, and its model. */
  parts(): ReadonlyMap<string, THREE.Object3D>;
  def(): ModelDef | null;
  main(): THREE.Object3D | null;
  /** All the flight's models, or null before any has come. */
  root(): THREE.Object3D | null;
  /** The section is the model that flies: a view of it is the chase view's while it is in the air. */
  onCraft(): boolean;
  /** The flown vehicle's group while it is off its pad (not part of the place while it is away); null on the pad. */
  flying(): THREE.Object3D | null;
  /** The bounds of the flight's models, but for `without`. */
  modelsBox(without?: THREE.Object3D | null): THREE.Box3;
  /** Put the flown vehicle where the clock has it now. */
  lift(): void;
  setting(): Setting;
  /** The height of the middle of what is on show: where an exact pose turns about by default. */
  centreY(): number;
  redraw(): void;
  /** The framing has become a named view, or stopped being one. */
  onView(id: string | null): void;
  /** The view was taken by an explicit act (the idle show stands down). */
  onInteract(): void;
  /** The camera has been sent to something in the place round the pad. */
  onVisit(): void;
}

/**
 * What the camera is sent to frame and how (stage/framing.ts; camera.md): a named view, a part, a place, a window; in
 * the part of the canvas the controls leave clear (`setInset`); framed again when the subject or the canvas changes
 * shape while it is still being followed, and watched once the hands have taken it (`keepWatched`).
 */
export class Framing {
  constructor(private readonly h: FramingHost) {}

  /**
   * Taking hold of the view (a drag, moving or turning it by key) stops the drift round it and lets go of whatever
   * it was framed on. Zooming lets go of the framing but leaves it turning; a tilt changes neither.
   */
  taken(how: 'move' | 'zoom' | 'tilt'): void {
    if (how === 'tilt') return;
    if (this.following) {
      // what it was framed on is still watched: the hands' distance and direction are kept, and the subject is kept in frame (keepWatched)
      this.watched = { ...this.following, seen: true, stale: true };
      this.following = null;
      this.h.onView(null);
    } else if (this.watched) this.watched.stale = true;
    if (how === 'move') this.h.onInteract();
  }

  /** How much of the bottom of the canvas the controls cover, 0 to 1: views are framed above it. */
  private inset = 0.26;

  /** What the camera was last sent to look at; cleared when the user moves it. */
  following: { view?: string; part?: string } | null = null;

  /**
   * Tell the stage how many pixels at the bottom of the canvas the controls cover, and (`top`) how many at the top
   * something else does: views are framed in what is left between them. `across`: the width a view is fitted to, as a
   * share of the canvas's width, about its middle. Left at 1 a view is fitted to the whole width as if nothing covered
   * any of the height, which leaves room to spare; whoever knows what is clear (panels down the sides, a short wide
   * strip between a title and a control block) gives the clear width over the clear height's share.
   */
  setInset(pixels: number, top = 0, across = 1): void {
    const tall = Math.max(1, this.h.canvas.clientHeight);
    const inset = THREE.MathUtils.clamp(pixels / tall, 0, 0.65);
    const head = THREE.MathUtils.clamp(top / tall, 0, 0.3);
    const sides = THREE.MathUtils.clamp(across, 0.25, 4);
    if (Math.abs(inset - this.inset) < 0.01 && Math.abs(head - this.head) < 0.01 && Math.abs(sides - this.sides) < 0.01) return;
    this.inset = inset;
    this.head = head;
    this.sides = sides;
    this.h.cam.inset = inset - head; // (the pivot is seen in the middle of what is left clear, whatever the distance)
    this.h.cam.clear = 1 - inset - head;
    this.refollow();
  }

  /** How much of the top of the canvas is covered, 0 to 0.3 (setInset). */
  private head = 0;

  /** The width a view is fitted to, as a share of the canvas's (setInset). */
  private sides = 1;

  /** Frame again whatever the camera was last sent to: the canvas or the model has changed shape. */
  refollow(): void {
    const snap = !this.h.cam.travelling; // a flight under way is sent to the new framing instead of cut short
    if (this.following?.part) this.focus(this.following.part, snap, undefined, true);
    else if (this.following?.view) this.view(this.following.view, snap, true);
    else this.keepWatched();
  }

  /**
   * What the hands took the view from (the subject last framed), whether it was in the frame when they last let go,
   * and whether they have had hold of the view since that was looked at.
   */
  watched: { view?: string; part?: string; seen: boolean; stale: boolean } | null = null;

  /** The box round one model, or (null) round everything on show: but for a vehicle in flight, which is not part of the place while it is away. */
  private wholeOf(model: THREE.Object3D | null, box: THREE.Box3): THREE.Box3 {
    if (model) return box.setFromObject(model);
    // (the models only: what a flight leaves under the root, shed parts and effects, is not part of the place)
    return box.copy(this.h.modelsBox(this.h.flying()));
  }

  /** The middle of what `of` names: a part, or a view's subject as `view` frames it. */
  private middleOf(of: { view?: string; part?: string }): THREE.Vector3 | null {
    const box = new THREE.Box3();
    const part = of.part ? this.h.parts().get(of.part) : undefined;
    if (part) box.setFromObject(part);
    else if (of.view && this.h.root()) {
      const named = this.h.def()?.views.find((v) => v.id === of.view);
      const subjects = (named?.nodes ?? []).flatMap((n) => this.h.parts().get(n) ?? []);
      if (subjects.length) for (const o of subjects) box.expandByObject(o);
      else this.wholeOf(named ? this.h.main() : null, box);
    }
    return box.isEmpty() ? null : box.getCenter(new THREE.Vector3());
  }

  /**
   * A view the hands have set is not framed again when its subject moves by itself (the slider, the clock): its
   * distance and direction are theirs. Only if the subject was in the frame and would leave it does the view move,
   * sideways, and no further than brings it back to the edge of the middle of the frame.
   */
  keepWatched(): void {
    const w = this.watched;
    if (!w?.seen || w.stale || this.h.cam.rig !== 'orbit') return;
    const middle = this.middleOf(w);
    const by = middle && this.h.cam.offFrame(middle);
    if (by?.lengthSq()) this.h.cam.shift(by);
  }

  /** Once the hands have let go of a view they took, look whether its subject is in the frame: what `keepWatched` goes by. */
  lookWatched(): void {
    const w = this.watched;
    if (!w?.stale || this.h.cam.handled || this.h.cam.keys.size) return;
    w.stale = false;
    const middle = this.h.cam.rig === 'orbit' ? this.middleOf(w) : null;
    w.seen = Boolean(middle) && this.h.cam.offFrame(middle!).lengthSq() === 0;
  }

  /** Fly to one part and frame it, keeping the direction the camera is already looking from. */
  focus(node: string, snap = false, from?: { turn: number; rise: number }, again = false): void {
    const object = this.h.parts().get(node);
    if (!object) return;
    this.h.lift(); // (what is framed is where the clock has it now, not where it was last drawn)
    this.frameBox(new THREE.Box3().setFromObject(object), snap, from, this.h.onCraft(), again);
    this.following = { part: node };
  }

  /** Fly to whatever fills `box` and frame it, keeping the direction the camera is already looking from. */
  frameBox(box: THREE.Box3, snap: boolean, from?: { turn: number; rise: number }, onCraft = false, again = false): void {
    const size = box.getSize(new THREE.Vector3());
    const target = box.getCenter(new THREE.Vector3());
    // never closer than a 1.6 m subject would be: a small part is seen with its surroundings
    const span = Math.max(size.y, Math.hypot(size.x, size.z) / (this.h.camera.aspect * this.sides), 1.6);
    const dir = this.h.cam.direction();
    if (from) {
      // seen from somewhere else: round from where the camera is, and at a height of its own
      const flat = new THREE.Vector3(dir.x, 0, dir.z).normalize().applyAxisAngle(UP, from.turn);
      dir.copy(flat.multiplyScalar(Math.cos(from.rise)).addScaledVector(UP, Math.sin(from.rise)));
    }
    if (this.h.setting().floor) dir.setY(Math.max(dir.y, 0.12)).normalize();
    this.following = this.watched = null;
    this.h.onView(null);
    // no closer than just outside the part: nearer than that the camera is inside its skin
    this.h.cam.frame({
      centre: target,
      distance: this.h.cam.fit(span, 0.5),
      direction: dir,
      min: Math.max(0.35, Math.min(size.x, size.z) * 0.62),
      snap,
      onCraft,
      again,
    });
  }

  /**
   * Go up to a window and look through it: the camera swings round to face the pane square on,
   * close enough that the opening fills the view, looking at what is just inside.
   */
  lookIn(point: THREE.Vector3, normal: THREE.Vector3): void {
    this.following = this.watched = null;
    this.h.onView(null);
    this.h.onInteract(); // drifting round would carry the view off the window again
    this.h.cam.frame({ centre: point.clone().addScaledVector(normal, -0.45), distance: 1, direction: normal, min: 0.2 });
  }

  /** Frame 'all' (everything on show) or one of the model's named views. */
  view(id: string, snap = false, keepDirection = false): void {
    const def = this.h.def();
    if (!this.h.root() || !def) return;
    this.h.lift(); // (what is framed is where the clock has it now, not where it was last drawn: the clock may just have been put back)
    const named = def.views.find((v) => v.id === id);
    // 'all' is everything on show; a named view with no numbers is the model alone, as it stands;
    // one that names parts is those parts wherever they are now, so it follows them as they come apart
    const box = new THREE.Box3();
    const subjects = (named?.nodes ?? []).flatMap((n) => this.h.parts().get(n) ?? []);
    if (subjects.length) for (const o of subjects) box.expandByObject(o);
    else this.wholeOf(named ? this.h.main() : null, box);
    const size = box.getSize(new THREE.Vector3());
    const centreY = named?.centreY ?? (box.min.y + box.max.y) / 2;
    // a wide, low subject (a launch pad) must fit by width as well as by height
    const span =
      named?.span ?? Math.max(size.y, Math.hypot(size.x, size.z) / (this.h.camera.aspect * this.sides)) * (subjects.length ? 1.12 : 1);
    // the subject fills most of the frame above the controls, which sit over the bottom of it
    const fill = (1 - this.inset - this.head) * 0.9;
    const distance = span / 2 / Math.tan(THREE.MathUtils.degToRad(this.h.lens / 2)) / fill;
    // a named view looks at the model's own axis; 'all' looks at the middle of everything
    const mid = box.getCenter(new THREE.Vector3());
    const target =
      named && !subjects.length
        ? new THREE.Vector3(this.h.main()!.position.x, centreY, this.h.main()!.position.z)
        : new THREE.Vector3(mid.x, centreY, mid.z);
    const lift = this.h.setting().floor ? 0.16 : span < 4 ? 0.22 : 0.1;
    // (the subject sits in the middle of the frame that the controls leave clear: the camera aims under it, camera/maths.ts aimBelow)
    // Framed again because the subject changed shape (the slider, a resize): from wherever the
    // camera has got to, so a view that is drifting round or has been tilted is not thrown back.
    const from = keepDirection
      ? this.h.cam.direction()
      : named?.from
        ? // a view's direction is given for the model as the flight stands it: it turns with a model that has been turned (a figure walked somewhere else)
          new THREE.Vector3(...named.from).applyAxisAngle(UP, (this.h.main()?.rotation.y ?? 0) - (def.rotationY ?? 0))
        : new THREE.Vector3(-0.62, lift, 0.78); // the sunlit side, and the one the cutaway opens toward
    this.following = { view: id };
    this.watched = null;
    this.h.onView(id);
    // no further out than half as far again as it takes to see everything on show: beyond that
    // the subject is a speck in a field of scrub
    const all = this.h.modelsBox().getSize(new THREE.Vector3());
    const widest = Math.max(all.y, Math.hypot(all.x, all.z) / this.h.camera.aspect);
    const wide = (1.5 * widest) / 2 / Math.tan(THREE.MathUtils.degToRad(this.h.lens / 2)) / fill;
    this.h.cam.frame({
      centre: target,
      distance,
      direction: from,
      min: Math.max(0.35, Math.min(1.4, span * 0.2)),
      // ...unless there is a place round it worth seeing from the air: then as far as the place goes
      max: Math.max(30, wide, this.h.setting().horizon ?? this.h.setting().reach ?? 0),
      snap,
      onCraft: this.h.onCraft(),
      whole: !subjects.length,
      again: keepDirection,
    });
  }

  /** Go over to something that is not part of any model (a building beside the pad) and look at it: the view then turns about it. */
  visit(box: THREE.Box3): void {
    this.frameBox(box, false);
    this.h.onVisit();
  }

  /** Come round the subject on show by `turn` radians, to `rise` radians above the level, at the same distance: a new angle on the same thing. */
  swing(turn: number, rise: number): void {
    this.h.cam.swing(turn, rise);
  }

  /** How fast the view drifts round its subject, as a multiple of the usual: a show turns faster than a study. */
  setDrift(times: number): void {
    this.h.cam.driftTimes = times;
  }

  /** For tests: a named view, turned `azimuthDeg` about the vertical and nudged `nudgeDeg` more. */
  shot(viewId: string, azimuthDeg: number, nudgeDeg = 0): void {
    this.h.cam.drift = false;
    this.h.cam.set('orbit', true);
    this.view(viewId, true);
    this.following = this.watched = null; // an exact pose: a resize must not frame it again
    this.h.cam.turn(THREE.MathUtils.degToRad(azimuthDeg + nudgeDeg));
  }

  /** For tests and screenshots: stop the drift and put the camera somewhere exact. */
  pose(azimuthDeg: number, elevationDeg: number, distance: number, targetY = this.h.centreY(), targetX = 0, targetZ = 0): void {
    this.following = this.watched = null;
    const az = THREE.MathUtils.degToRad(azimuthDeg),
      el = THREE.MathUtils.degToRad(elevationDeg);
    const pivot = new THREE.Vector3(targetX, targetY, targetZ);
    this.h.cam.place(
      pivot,
      new THREE.Vector3(
        targetX + distance * Math.cos(el) * Math.cos(az),
        targetY + distance * Math.sin(el),
        targetZ + distance * Math.cos(el) * Math.sin(az),
      ),
    );
    this.h.redraw();
  }
}
