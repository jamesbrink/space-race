import { G0 } from '../../world/bodies.ts';
import * as THREE from 'three';
import { sameTarget, type Target, type Workings } from '../../app/actions.ts';
import type { Action, ModelDef } from '../../types.ts';
import type { Clock } from '../../world/clock.ts';
import type { Setting } from '../backdrops.ts';
import type { Cabin } from '../cabin.ts';
import type { Cameras } from '../camera/index.ts';
import type { Fn } from '../explode.ts';
import type { Scenery, Staged } from '../lod.ts';
import type { Looks } from '../look.ts';
import type { CabinView } from '../stage/cabinview.ts';
import type { Picker } from '../stage/picker.ts';
import type { Shadows } from '../stage/shadows.ts';
import { NECK, type Watched } from '../camera/watch.ts';
import { Carry } from './carry.ts';
import { roadOn, Vehicle } from './drive.ts';
import { jointKey, pose, reach, rungs, seatFit, sitAt, step } from './gait.ts';
import { boxAt, leadOf, movesOf, sweptBox, wayOf } from './operate.ts';
import { type Collide, Ragdoll, type Tumbler } from './ragdoll.ts';
import { EYE_FRACTION, type Hit, type Walker } from './walk.ts';
import { Works } from './works.ts';

/** How far beyond a figure's bounds the camera must be, coming out of its eyes after a walk, before it is drawn again, metres. */
const EMERGE_CLEAR = 0.12;
/** How long a vehicle's door is given to swing before the figure gets in or out through it, seconds. */
const DOOR_SECONDS = 1.05;
const UP = new THREE.Vector3(0, 1, 0);
const DOWN = new THREE.Vector3(0, -1, 0);
/** How far from the figure what it is working must be over the ground before it turns round to it, metres (nearer, the head looks up or down at it). */
const TURN_BEYOND = 1.5;
/** How far round from the way it faces it must be before the body turns to it, as a share of the neck's reach (watch.ts NECK). */
const TURN_SHARE = 0.85;
/** How much room round the head the camera watching from beside it may need to find clear, metres (Solids.gather). */
const WATCH_ROOM = 9;

/** How a function worked by hand stands, for the readout (the walk bar: Ui.showWork): how far along, which way it is going, why it will not move. */
export interface WorkState {
  /** How far along its travel, 0 (its first end) to 1 (its second). */
  value: number;
  way: -1 | 0 | 1;
  refused: string | null;
}
const spin = new THREE.Quaternion();

/** What being on foot at a place asks of the stage it is on. */
export interface OnFootHost {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly cam: Cameras;
  /** The walker: footing, collision, input, the camera at the eyes or over the shoulder (walk.ts). */
  readonly walk: Walker;
  /** The bounds of the models on show. */
  readonly bounds: THREE.Sphere;
  readonly looks: Looks;
  /** The Sun's shadows: spent round the walker, his own drawn into the fine map only (stage/shadows.ts). */
  readonly shadows: Shadows;
  /** The seats of the models (stage/cabinview.ts) and what is under a ray (stage/picker.ts). */
  readonly seats: CabinView;
  readonly picker: Picker;
  defs(): readonly ModelDef[];
  staged(): readonly Staged[];
  /** The place round the pad, and its levels of detail, if it has come. */
  surroundings(): THREE.Object3D | null;
  scenery(): Scenery | null;
  setting(): Setting;
  clock(): Clock | null;
  cabin(): Cabin | null;
  /** The functions of a part of a model, each with how far along its travel it is and why it will not move, if it will not (onfoot/handworks.ts). */
  functions(model: string, node: string): { fn: Fn; value: number; refused: string | null }[];
  /** The clock moved hardware this frame: something operated by hand gives way to the script. */
  scripted(): boolean;
  /** The open ground under a point; null where there is none. */
  groundAt(x: number, z: number): number | null;
  /** Measure what is on show again. */
  fitBounds(): void;
  /** Each model drawn at the level of detail its size on screen calls for. */
  fitDetail(dt: number): void;
  /** A frame's worth of the eye getting used to where it is (indoors or out). */
  adapt(dt: number, walking: boolean): void;
  /** Go and look at a box in the place, from the orbiting camera. */
  visit(box: THREE.Box3): void;
  redraw(): void;
  onWalk(on: boolean, model: string): void;
  onWalkTarget(target: Target | null): void;
  onWalkEyes(through: boolean): void;
  /** A couch has been boarded on foot or left: what can be looked out of has changed. */
  onSeat(): void;
  /**
   * What falls at the place falls by, m/s^2: the body its site stands on (world/bodies.ts `gravityOn(bodyOf(site.body))`).
   * Where the host does not say, the Earth's standard gravity.
   */
  gravity?(): number;
}

/**
 * Being at the place on foot as one of the flight's figures (viewer/onfoot/onfoot.ts; walking.md): becoming the figure
 * and leaving it where it was walked to, what is aimed at within reach, ladders, windows, doors and lifts, getting into
 * a vehicle and driving it, a couch boarded, what the figure carries, a fall it goes limp in, and the figure posed to
 * the gait each frame. (The functions of a part worked by hand are handworks.ts's.)
 */
export class OnFoot {
  constructor(private readonly h: OnFootHost) {}

  /** Another flight is on the stage (the walk has been ended): nothing of the last is walked as, driven, boarded or worked. */
  reset(): void {
    this.walked = -1;
    this.tumble = null;
    this.wheel = null;
    this.boarding = null;
    this.boarded = null;
    this.aim = null;
    this.emerging = -1;
    this.unseen = false;
    this.satIn = null;
    this.driven.clear();
    this.works = new Works();
    this.operating = null;
  }

  /** What falls here falls by (`OnFootHost.gravity`). */
  private get gravity(): number {
    return this.h.gravity?.() ?? G0;
  }

  private throughEyes: boolean | null = null;

  /** Which model is being walked as: an index into `staged`, or -1. */
  walked = -1;

  /** A model's parts that have been driven by hand (a truck that drives itself off in the script, driven instead): the slider leaves them be until the script next moves it. */
  private readonly driven = new Map<string, { at: number; node: string }>();

  /** For a vehicle driven by hand, its named pieces paired with the same pieces in its model's other levels of detail, which are put as it is. */
  private readonly twins = new WeakMap<THREE.Object3D, [THREE.Object3D, THREE.Object3D][]>();

  /** The lifts a model marks under each of its top-level nodes, found once (markedOn). */
  private readonly lifts = new WeakMap<THREE.Object3D, Action[]>();

  /** What each level of detail of a figure carries when it is walked as (carry.ts), made the first time. */
  private readonly carries = new WeakMap<THREE.Object3D, Carry[]>();

  /** The doors and lifts of the flight's models, as they stand (works.ts). */
  private works = new Works();

  private walkDt = 0;

  private carriedLevel: THREE.Object3D | null = null;

  private readonly below = new THREE.Vector3();

  /** While walking: the figure is drawn into the shadow map only (the view is through its eyes). */
  unseen = false;

  /** A walk through the eyes has ended and the camera is still inside the figure: it is drawn when the camera is out (`emerge`). */
  emerging = -1;

  private readonly emergeBox = new THREE.Box3();

  /** While walking: what is being looked at from within reach, and where the ray met it. */
  private aim: { target: Target; hit: Hit; box?: THREE.Box3; vehicle?: THREE.Object3D } | null = null;

  /** A figure knocked off its feet by a long fall, tumbling (ragdoll.ts) until it lies still; and each level of detail's ragdoll, made once. */
  tumble: Tumbler | null = null;

  private readonly dolls = new WeakMap<THREE.Object3D, Ragdoll | null>();

  /** The vehicle the walker is at the wheel of (drive.ts), and every vehicle that has been driven, by its node. */
  wheel: Vehicle | null = null;

  /** Getting into or out of a vehicle through its door: which, which way, and how long the door has been swinging. */
  boarding: { vehicle: Vehicle; out: boolean; t: number; door: ReturnType<OnFoot['doorOf']> } | null = null;

  private readonly vehicles = new WeakMap<THREE.Object3D, Vehicle>();

  /** Put the walker in a figure's place: its eyes, its height, the way it faces. The figure itself is put away. */
  embody(at: number): void {
    const walker = this.h.defs()[at]!.walker!;
    this.walked = at;
    this.setAim(null);
    const figure = this.h.staged()[at]!;
    this.h.scene.updateMatrixWorld(true);
    const feet = figure.group.getWorldPosition(new THREE.Vector3());
    const height = new THREE.Box3().setFromObject(figure.full).max.y - feet.y;
    const eyes = walker.eyes ? figure.full.getObjectByName(walker.eyes) : undefined;
    const eye = eyes ? new THREE.Box3().setFromObject(eyes).getCenter(new THREE.Vector3()).y - feet.y : height * EYE_FRACTION;
    // you look the way the figure faces: its own forward, turned as the model is turned on the stage
    const [fx, fz] = walker.forward ?? [0, 1];
    const toward = new THREE.Vector3(fx, 0, fz).transformDirection(figure.group.matrixWorld).setY(0).setLength(10).add(feet);
    figure.group.visible = false;
    this.unseen = false;
    this.leftBehind(at, false);
    // what it carries goes into its hands, at every level of detail, and its arms know the weight
    this.h.walk.gait.load.L = this.h.walk.gait.load.R = 0;
    for (const level of figure.group.children)
      for (const carry of this.carriesOf(level, at)) {
        carry.take();
        if (carry.ready) this.h.walk.gait.load[carry.hand] = 1;
      }
    this.h.renderer.shadowMap.needsUpdate = true; // its shadow goes with it
    this.h.redraw();
    this.h.walk.gravity = this.gravity;
    this.h.walk.start(feet, toward, eye, height, walker.radius);
    this.h.cam.foot(this.h.walk.view, this.h.walk.third); // (the camera is the walker's: camera/foot.ts)
    this.h.shadows.fitWalkShadows(true);
  }

  /** The figure being walked as is stood where it was walked to, facing the way it was looking, and can be seen again. */
  standFigure(): void {
    const at = this.walked;
    const figure = this.h.staged()[at];
    if (!figure) return;
    figure.group.position.copy(this.h.walk.body.position);
    figure.group.rotation.y = this.facing(at);
    this.tumble = null;
    for (const level of figure.group.children) this.h.walk.gait.rest(level); // standing as it was built, at every level of detail
    this.shadowOnly(figure.group, (this.unseen = false));
    for (const level of figure.group.children) for (const carry of this.carriesOf(level, at)) carry.putDown();
    this.h.walk.gait.load.L = this.h.walk.gait.load.R = 0;
    this.leftBehind(at, true);
    figure.group.visible = true;
    figure.group.updateMatrixWorld(true);
    figure.measure();
    this.h.fitBounds();
  }

  /**
   * After a walk seen through the figure's eyes: the figure is drawn again once the camera has come out of it, and not
   * before, so the way back from the eyes never passes through the inside of its head and suit. Out of it means beyond
   * its bounds by more than the near plane's reach.
   */
  emerge(): void {
    const at = this.emerging;
    if (at < 0) return;
    const figure = this.h.staged()[at];
    if (!figure || this.h.walk.active) {
      this.emerging = -1;
      return;
    }
    const box = this.emergeBox.setFromObject(figure.full).expandByScalar(EMERGE_CLEAR);
    if (box.containsPoint(this.h.camera.position)) return;
    this.emerging = -1;
    this.shadowOnly(figure.group, (this.unseen = false));
    this.h.redraw();
  }

  /** Stop walking: the figure is back where it stood, and the orbiting camera takes over from where the walker was looking. */
  exitWalk(): void {
    if (!this.h.walk.active) return;
    const at = this.walked;
    if (this.boarded) this.leaveSeat(); // (out of a couch first, back where he boarded it)
    if (this.wheel) {
      // leaving the walk from a driving seat: out at once, no ceremony
      const vehicle = this.wheel;
      this.wheel = null;
      this.boarding = null;
      this.h.walk.sit(null, vehicle.standing(new THREE.Vector3()));
    }
    // (seen through its eyes, the camera is inside the figure's head as the walk ends: it stays as it was through the
    // eyes, there for the light only, until the camera on its way back has come out of it: `emerge`)
    const inside = !this.h.walk.outside;
    this.standFigure();
    if (inside && this.h.staged()[at]) {
      this.shadowOnly(this.h.staged()[at].group, (this.unseen = true));
      this.emerging = at;
    }
    this.setAim(null);
    this.h.walk.stop();
    this.walked = -1;
    this.h.shadows.walkEnded = performance.now();
    // the camera takes the view up from this very place, turning about a point a few steps ahead, so the flight back starts from here
    this.h.cam.unfoot(this.h.camera.position.clone().add(this.h.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(3)));
    this.h.renderer.shadowMap.needsUpdate = true;
    this.h.redraw();
    this.h.onWalk(false, this.h.defs()[at]?.id ?? '');
  }

  /**
   * What a ray from the walker's eyes has met, in the flight's terms: which model and part, whether
   * it is a window, or which place in the surroundings. Null for scenery that is nothing in particular.
   */
  /**
   * The doors and lifts a model marks on its own nodes (extras `door` with a `swing` in degrees
   * about the vertical, anticlockwise from above; `lift` with the heights of its `stops`), as
   * the Actions they amount to: the door `mesh` is part of, and every lift under the same
   * top-level node (a lift is called from anywhere on its structure). `root` is the model.
   */
  private markedOn(mesh: THREE.Object3D, root: THREE.Object3D): Target['marked'] {
    const actions: Action[] = [];
    let top: THREE.Object3D = mesh;
    for (let o: THREE.Object3D | null = mesh; o && o !== root; o = o.parent) {
      if (o.name) top = o;
      if (o.userData.door && o.name)
        actions.push({
          id: `door:${o.name}`,
          label: 'Open',
          do: {
            kind: 'toggle',
            back: 'Close',
            moves: [
              {
                kind: 'swing',
                node: o.name,
                axis: [0, 1, 0],
                angle: THREE.MathUtils.degToRad(Number(o.userData.swing) || 100),
                from: 0,
                to: 1,
              },
            ],
          },
        });
    }
    let lifts = this.lifts.get(top);
    if (!lifts) {
      lifts = [];
      top.traverse((o) => {
        // a stop is a height above where the car was built, or [across, up] where the car also shifts
        // sideways as it rises (up a leaning leg), or all three; in metres, in the car's parent's frame
        const stops = o.userData.stops as (number | number[])[] | undefined;
        if (!o.userData.lift || !o.name || !Array.isArray(stops)) return;
        const names = o.userData.stop_names as string[] | undefined;
        lifts!.push({
          id: `lift:${o.name}`,
          label: 'Call the lift',
          do: {
            kind: 'lift',
            node: o.name,
            stops: stops.map((stop, i) => {
              const [a = 0, b = 0, c = 0] = typeof stop === 'number' ? [0, stop] : stop.length === 2 ? [stop[0], stop[1]] : stop;
              return { name: names?.[i] ?? (i ? `level ${i}` : 'the bottom'), by: [a, b, c] as [number, number, number] };
            }),
          },
        });
      });
      this.lifts.set(top, lifts);
    }
    actions.push(...lifts);
    return actions.length && top.name ? { under: top.name, actions } : undefined;
  }

  private targetOf(hit: Hit): { target: Target; box?: THREE.Box3 } | null {
    const material = hit.mesh.material as THREE.Material | THREE.Material[];
    const pane = (Array.isArray(material) ? material[0] : material)?.name.startsWith('glass') || undefined;
    const climb = Boolean(hit.mesh.userData.climb || hit.mesh.parent?.userData.climb) || undefined;
    const place = this.h.picker.placeOf(hit.mesh, hit.point);
    if (place)
      return { target: { place: place.name, pane, climb, marked: this.markedOn(hit.mesh, this.h.surroundings()!) }, box: place.box };
    const names: string[] = [];
    for (let o: THREE.Object3D | null = hit.mesh; o; o = o.parent) {
      const at = this.h.staged().findIndex((s) => s.shown === o);
      if (at < 0) {
        names.push(o.name);
        continue;
      }
      const def = this.h.defs()[at]!;
      return {
        target: {
          model: def.id,
          node: def.parts.find((p) => names.includes(p.node))?.node,
          pane,
          climb,
          path: names.filter(Boolean),
          marked: this.markedOn(hit.mesh, o),
        },
      };
    }
    return pane || climb ? { target: { pane, climb } } : null;
  }

  private setAim(aim: OnFoot['aim']): void {
    const changed = !sameTarget(aim?.target ?? null, this.aim?.target ?? null);
    this.aim = aim;
    if (changed) this.h.onWalkTarget(aim?.target ?? null);
  }

  /** While walking: lean in to the window being looked at, and look through it. */
  walkLookIn(): void {
    const hit = this.aim?.hit;
    if (!hit || !this.aim?.target.pane) return;
    const centre = this.h.picker.paneCentre(hit.mesh, hit.point);
    this.h.walk.peek(centre.clone().addScaledVector(hit.normal, 0.4), hit.normal.clone().negate());
  }

  /** While walking: get onto the ladder being looked at, from its foot or from the deck at its top. */
  walkClimb(): void {
    const hit = this.aim?.hit;
    if (hit && this.aim?.target.climb) this.h.walk.body.mount(this.h.walk.solids.ladderOf(hit.mesh));
  }

  /** Is the walker at the wheel of something? */
  get driving(): boolean {
    return this.wheel !== null;
  }

  /**
   * While walking: get into the vehicle being looked at and drive it (drive.ts). The walking
   * keys become its pedals and wheel, the eyes are at its driver's seat, and it is not in its
   * own way. False if it has nowhere to sit.
   */
  walkDrive(): boolean {
    const root = this.aim?.vehicle;
    if (!root || this.wheel || this.boarding) return false;
    let vehicle = this.vehicles.get(root);
    if (!vehicle) this.vehicles.set(root, (vehicle = new Vehicle(root)));
    if (!vehicle.drivable) return false;
    // through the driver's door, if it has one: it opens, he gets in, it shuts
    const door = vehicle.door ? this.doorOf(vehicle.door) : null;
    if (door && !this.works.isOpen(door.key)) this.works.toggle(door.key, door.action, door.levels, door.under);
    this.boarding = { vehicle, out: false, t: door ? 0 : DOOR_SECONDS, door };
    this.h.walk.hold(
      () => {},
      () => {},
    );
    this.setAim(null);
    return true;
  }

  /** The working of a door a model marks (`door`, `swing`): the same one the wheel's Open and Close use, so the two agree on how it stands. */
  private doorOf(node: THREE.Object3D): { key: string; action: Action; levels: THREE.Object3D[]; under: string } | null {
    let at = -1;
    let root: THREE.Object3D | null = null;
    for (let o: THREE.Object3D | null = node; o && !root; o = o.parent) {
      at = this.h.staged().findIndex((s) => s.shown === o);
      if (at >= 0 || o === this.h.surroundings()) root = o;
    }
    if (!root) return null;
    // the flight's own working of that door, where it declares one, is the one its Open and Close use
    const model = at >= 0 ? this.h.defs()[at]!.id : '';
    for (const part of at >= 0 ? this.h.defs()[at]!.parts : [])
      for (const action of part.actions ?? [])
        if (action.do.kind === 'toggle' && action.do.moves[0]?.node === node.name)
          return { key: `${model}/${part.node}/${action.id}`, action, levels: this.levelsOf(model), under: part.node };
    const marked = this.markedOn(node, root);
    const action = marked?.actions.find((a) => a.id === `door:${node.name}`);
    if (!marked || !action) return null;
    return { key: `${model}/${marked.under}/${action.id}`, action, levels: this.levelsOf(model), under: marked.under };
  }

  /** A frame of getting in or out: once the door has swung, the figure changes places and the door is shut behind it. */
  private board(dt: number): void {
    const b = this.boarding;
    if (!b) return;
    b.t += dt;
    if (b.t < DOOR_SECONDS) return;
    this.boarding = null;
    this.h.walk.release();
    if (b.out) {
      this.wheel = null;
      b.vehicle.motion.speed = 0;
      this.h.walk.sit(null, b.vehicle.standing(new THREE.Vector3()));
    } else this.takeWheel(b.vehicle);
    if (b.door && this.works.isOpen(b.door.key)) this.works.toggle(b.door.key, b.door.action, b.door.levels, b.door.under);
  }

  /** The model and part a vehicle's node is, if it is one of a model's parts (not scenery). */
  ownerOf(node: THREE.Object3D): { at: number; node: string } | null {
    for (let o: THREE.Object3D | null = node.parent; o; o = o.parent) {
      const at = this.h.staged().findIndex((s) => s.group === o);
      if (at >= 0) return this.h.defs()[at]!.parts.some((p) => p.node === node.name) ? { at, node: node.name } : null;
    }
    return null;
  }

  /** Why the vehicle at the wheel will not move, if it will not: the interlocks of the function that drives it, if it is a part that has one. */
  get wheelRefusal(): string | null {
    const root = (this.wheel ?? this.boarding?.vehicle)?.root;
    const owner = root && this.ownerOf(root);
    if (!owner) return null;
    const def = this.h.defs()[owner.at]!;
    return this.h.functions(def.id, owner.node).find((f) => f.fn.nodes.includes(owner.node))?.refused ?? null;
  }

  /** Put a vehicle's pieces in its model's other levels of detail where they are in the one being driven. */
  private mirror(root: THREE.Object3D): void {
    let pairs = this.twins.get(root);
    if (!pairs) {
      pairs = [];
      const owner = this.ownerOf(root);
      for (const level of owner ? this.h.staged()[owner.at]!.group.children : []) {
        const twin = level.getObjectByName(root.name);
        if (!twin || twin === root) continue;
        const named = new Map<string, THREE.Object3D>();
        twin.traverse((o) => o.name && named.set(o.name, o));
        root.traverse((o) => {
          const other = named.get(o.name);
          if (other) pairs!.push([o, other]);
        });
      }
      this.twins.set(root, pairs);
    }
    for (const [from, to] of pairs) {
      to.position.copy(from.position);
      to.quaternion.copy(from.quaternion);
    }
  }

  /** Sitting: how far he has sunk into the cushion (seatFit), where his eyes are in the seat's frame, and in his head's. */
  private sunk = 0;

  /** How far the first thing over the seat's hip point is above it, metres. */
  private headroom = Number.POSITIVE_INFINITY;

  private seatEyes: THREE.Vector3 | null = null;

  private headEye: THREE.Vector3 | null = null;

  /** One of the fifteen joints of a figure's level of detail, by name. */
  private jointOf(root: THREE.Object3D, joint: string): THREE.Object3D | undefined {
    let found: THREE.Object3D | undefined;
    const key = jointKey(joint);
    root.traverse((o) => {
      if (!found && jointKey(o.name) === key) found = o;
    });
    return found;
  }

  /** Sit the walker at a vehicle's wheel: the keys are its pedals and wheel from now on. */
  private takeWheel(vehicle: Vehicle): void {
    const root = vehicle.root;
    vehicle.read();
    this.wheel = vehicle;
    const walk = this.h.walk;
    // How he fits: the first thing over the seat's hip point (before the vehicle is left out of the
    // solids) against the top of his head over his hips. A tall man sinks and leans back (seatFit).
    const shown = this.h.staged()[this.walked]?.shown ?? this.h.scene;
    const hip = vehicle.hips(new THREE.Vector3());
    walk.solids.gather(hip, 1, 0.5, 2.5);
    // (straight up from the hips, past the steering wheel if that is over them)
    const up = new THREE.Vector3(hip.x, hip.y + 0.15, hip.z);
    let roof = walk.solids.cast(up, UP, 2.5);
    for (let i = 0; roof && vehicle.steers(roof.mesh) && i < 3; i++) roof = walk.solids.cast(up.setY(roof.point.y + 0.01), UP, 2.5);
    this.headroom = roof ? roof.point.y - hip.y : Number.POSITIVE_INFINITY;
    const fit = seatFit(walk.body.height - walk.gait.hipHeight(shown), this.headroom);
    walk.gait.recline = fit.recline;
    this.sunk = fit.drop;
    this.seatEyes = null;
    // where the eyes are in the head: measured off the figure as it stands at the door
    const head = this.jointOf(shown, 'Head');
    if (head) {
      head.updateWorldMatrix(true, false);
      const feet = walk.body.position;
      this.headEye = head.worldToLocal(head.getWorldPosition(new THREE.Vector3()).setY(feet.y + walk.eye));
      this.headEye.z += 0.09; // (in front of the neck's pivot)
    } else this.headEye = null;
    walk.solids.without = root;
    // (a gather of its own round it each frame: not whatever the walker's camera or the near plane last gathered)
    const road = roadOn(walk.solids, (x, z) => this.h.groundAt(x, z));
    const driven = vehicle;
    // a part of a model (a truck the script drives off) is taken out of the slider's hands while it is driven, and left where it is driven to
    const owner = this.ownerOf(root);
    if (owner) {
      this.driven.set(`${owner.at}/${root.name}`, owner);
      this.h.staged()[owner.at]!.loosen(root.name, true);
    }
    walk.sit({
      drive: (pedal, steer, dt) => {
        // (it will not move while its interlocks say no: a tower up, its legs down)
        driven.drive(this.wheelRefusal ? 0 : pedal, steer, dt, road);
        if (driven.motion.speed || driven.motion.steer) {
          if (owner) this.mirror(root);
          this.h.redraw();
          this.h.renderer.shadowMap.needsUpdate = true;
        }
      },
      // a sitter's eyes are where the posed head has them, in the seat's frame (so they go with it at once); until it has been posed, as far over the hips as standing
      eyes: (to) =>
        this.seatEyes
          ? driven.fromSeat(to.copy(this.seatEyes))
          : driven.hips(to).setY(to.y + walk.eye - walk.gait.hipHeight(this.h.staged()[this.walked]?.shown ?? this.h.scene)),
      facing: () => driven.motion.heading,
      chase: () => driven.chase(this.h.camera.position),
      driving: () => driven.driving(), // (heard: sound/audio.ts)
    });
    this.setAim(null);
  }

  /** In a place in a model (ModelDef.seats): which, the node the eyes are carried by, and where the walker stood to board it. */
  boarded: {
    model: string;
    seat: NonNullable<ModelDef['seats']>[number];
    node: THREE.Object3D;
    from: THREE.Vector3;
    facing: number;
  } | null = null;

  /** The place in a model the walker is in, if it is in one. */
  get seated(): { model: string; seat: string; label: string } | null {
    const b = this.boarded;
    return b && { model: b.model, seat: b.seat.node, label: b.seat.label };
  }

  /**
   * While walking: take a place in a model (a couch). Refused, with the reason, outside the time
   * it could be boarded: the clock is not moved for it. The eyes go to the place's, its view is
   * the walker's to turn, and E (leaveSeat) gets out again where he got in.
   */
  boardSeat(model: string, name: string): string | null {
    const at = this.h.defs().findIndex((m) => m.id === model);
    const seat = this.h.defs()[at]?.seats?.find((s) => s.node === name);
    if (!seat || this.wheel || this.boarded || !this.h.walk.active) return 'there is nowhere to sit';
    const now = this.h.clock()?.t ?? 0;
    if (now < seat.open[0] || now > seat.open[1]) {
      // (as the count would say it: T− hours and minutes)
      const span = (t: number) =>
        `T${t < 0 ? '−' : '+'}${Math.floor(Math.abs(t) / 3600)} h ${String(Math.floor((Math.abs(t) % 3600) / 60)).padStart(2, '0')} min`;
      return `${seat.label} could be boarded from ${span(seat.open[0])} to ${span(seat.open[1])}`;
    }
    const place = this.h.seats.seatNode(at, seat);
    if (!place) return 'there is nowhere to sit';
    const node: THREE.Object3D = place;
    node.updateWorldMatrix(true, false);
    const ahead = new THREE.Vector3(0, 0, 1).transformDirection(node.matrixWorld);
    // (looking nearly straight up or down, which way is ahead over the ground is the way the place's top points)
    const flat = Math.hypot(ahead.x, ahead.z) > 0.2 ? ahead : new THREE.Vector3(0, 1, 0).transformDirection(node.matrixWorld);
    const facing = Math.atan2(-flat.z, flat.x);
    this.boarded = { model, seat, node, from: this.h.walk.body.position.clone(), facing };
    this.h.seats.showSeatHidden(at, seat.hide, false);
    const eye = new THREE.Vector3(...(seat.eye ?? [0, 0, 0]));
    // a couch with a cabin round it is sat in as a strapped-in person sits (camera/head.ts): the head turns about the neck
    // within the cabin's limits, in the couch's own frame, as it does on board in flight
    const cabin = this.h.defs()[at]?.cabin;
    const toEye = new THREE.Matrix4().makeTranslation(eye);
    this.h.walk.sit({
      drive: () => {},
      eyes: (to) => node.localToWorld(to.copy(eye)),
      facing: () => facing,
      ...(cabin
        ? {
            frame: (out: THREE.Matrix4) => {
              node.updateWorldMatrix(true, false);
              return out.copy(node.matrixWorld).multiply(toEye);
            },
            limits: cabin.head ?? this.h.cam.onboard.limits,
          }
        : {}),
    });
    this.h.walk.pitch = THREE.MathUtils.clamp(Math.asin(THREE.MathUtils.clamp(ahead.y, -1, 1)), -1.45, 1.45);
    this.setAim(null);
    // (in the couch he is aboard: the cabin's periscope shows what it sees, and its windows light it)
    if (cabin) this.h.cabin()?.board(true);
    this.h.redraw();
    this.h.onSeat();
    return null;
  }

  /** Out of the place taken (boardSeat), standing where he boarded it from. */
  leaveSeat(): void {
    const b = this.boarded;
    if (!b) return;
    this.boarded = null;
    this.h.seats.showSeatHidden(
      this.h.defs().findIndex((m) => m.id === b.model),
      b.seat.hide,
      true,
    );
    this.h.walk.sit(null, b.from);
    this.h.cabin()?.board(this.h.cam.rig === 'onboard');
    const figure = this.h.staged()[this.walked];
    if (figure) figure.group.visible = true;
    this.h.renderer.shadowMap.needsUpdate = true;
    this.h.redraw();
    this.h.onSeat();
  }

  /** While driving: get out (the door opens first, and shuts behind), and stand beside the driver's door. */
  walkAlight(): void {
    const vehicle = this.wheel;
    if (!vehicle || this.boarding) return;
    vehicle.motion.speed = 0;
    const door = vehicle.door ? this.doorOf(vehicle.door) : null;
    if (door && !this.works.isOpen(door.key)) this.works.toggle(door.key, door.action, door.levels, door.under);
    this.boarding = { vehicle, out: true, t: door ? 0 : DOOR_SECONDS, door };
    this.h.walk.hold(
      () => {},
      () => {},
    );
  }

  /** While walking: stop, and go and look at the place in the surroundings that was being looked at. */
  walkVisit(): void {
    const box = this.aim?.box;
    this.exitWalk();
    if (box) this.h.visit(box);
  }

  /** A frame of what is driven by hand: a vehicle goes back where the script has it when the script moves it, unless it is being driven. */
  runDriven(): void {
    if (this.h.scripted())
      for (const [key, { at, node }] of this.driven) {
        if (this.wheel?.root.name === node && this.ownerOf(this.wheel.root)?.at === at) continue;
        this.driven.delete(key);
        this.h.staged()[at]?.loosen(node, false);
        this.h.redraw();
        this.h.renderer.shadowMap.needsUpdate = true;
      }
  }

  /** The levels of detail of a model: an action moves the same node in each. */
  private levelsOf(model: string): THREE.Object3D[] {
    const place = this.h.surroundings();
    if (!model) return this.h.scenery()?.all ?? (place ? [place] : []); // scenery: its levels, finest first
    return this.h.staged()[this.h.defs().findIndex((m) => m.id === model)]?.group.children ?? [];
  }

  /**
   * Work something a part declares as an action (types.ts: Action): open or shut a toggle, or
   * send a lift to a stop (`'call'`: to the stop nearest the walker's feet).
   */
  workAction(model: string, node: string, action: Action, stop?: number | 'call'): void {
    const key = `${model}/${node}/${action.id}`;
    const levels = this.levelsOf(model);
    if (action.do.kind === 'toggle') this.works.toggle(key, action, levels, node);
    else if (action.do.kind === 'lift') {
      const at = stop === 'call' || stop === undefined ? this.works.nearest(key, action, levels, node, this.h.walk.body.position.y) : stop;
      this.works.send(key, action, levels, node, at);
    }
  }

  /** How the doors and lifts stand: what the wheel needs to know to name their verbs. */
  readonly workings: Workings = {
    open: (model, node, action) => this.works.isOpen(`${model}/${node}/${action.id}`),
    stop: (model, node, action) => this.works.stopOf(`${model}/${node}/${action.id}`),
    riding: (model, node, action) =>
      this.standsOn(this.works.platform(`${model}/${node}/${action.id}`, action, this.levelsOf(model), node)),
  };

  /** Is the walker standing on (a mesh under) one of these nodes? */
  private standsOn(nodes: THREE.Object3D[]): boolean {
    const walk = this.h.walk;
    if (!walk.active || !walk.body.grounded || !nodes.length) return false;
    const from = walk.body.position.clone().setY(walk.body.position.y + 0.3);
    const under = walk.solids.cast(from, new THREE.Vector3(0, -1, 0), 0.7);
    for (let o: THREE.Object3D | null = under?.mesh ?? null; o; o = o.parent) if (nodes.includes(o)) return true;
    return false;
  }

  /** A frame of the doors and lifts: whatever is on its way goes on, and a lift takes the walker with it. */
  runWorks(dt: number): void {
    const carried = this.works.step(dt);
    if (!carried) return;
    this.h.redraw();
    this.h.renderer.shadowMap.needsUpdate = true;
    // (whoever stands on a lift is carried by the walker's own rule: Walker.ride)
  }

  /** What one level of detail of a figure carries, as its flight says (ModelDef.walker.carries). */
  private carriesOf(level: THREE.Object3D, at: number): Carry[] {
    let made = this.carries.get(level);
    if (!made) {
      const defs = level.children.length ? (this.h.defs()[at]!.walker?.carries ?? []) : [];
      made = defs.map((def) => new Carry(level, def, (mesh) => this.h.looks.add(mesh)));
      for (const carry of made) carry.gravity = this.gravity;
      this.carries.set(level, made);
    }
    return made;
  }

  /** How a figure's model is turned on the stage to face the way the walker's body faces (which looks along (-sin, -cos) of its heading). */
  private facing(at: number): number {
    const [fx, fz] = this.h.defs()[at]!.walker?.forward ?? [0, 1];
    return this.h.walk.heading + Math.PI - Math.atan2(fx, fz);
  }

  /** Show or hide what a figure does not take with it when it walks (walker.hide), at every level of detail. */
  private leftBehind(at: number, shown: boolean): void {
    const names = this.h.defs()[at]!.walker?.hide;
    if (names?.length) this.h.staged()[at]!.group.traverse((o) => names.includes(o.name) && (o.visible = shown));
  }

  /** The seat the figure is in, or was in and is still getting up out of. */
  private satIn: Vehicle | null = null;

  /**
   * Seen over the shoulder, the figure being walked as is drawn: where the walker's body is,
   * facing the way it is going, its limbs in the stride of the moment if its model has joints
   * (gait.ts) and rigid if it has not. Through its own eyes, or with the camera pressed up
   * against its head by a wall, it is not drawn.
   */
  private poseFigure(): void {
    const at = this.walked;
    const figure = this.h.staged()[at];
    if (!figure) return;
    const walk = this.h.walk;
    const group = figure.group;
    // at the wheel of something it sits: its hips on the seat's hip point, its hands on the wheel and going round with it
    walk.gait.seated = this.wheel !== null;
    if (this.wheel) walk.gait.wheel = this.wheel.lock;
    // in a couch the figure is the model's own (the pilot built into it): the walker's is not drawn
    if (this.boarded) {
      if (group.visible) {
        group.visible = false;
        this.h.renderer.shadowMap.needsUpdate = true;
        this.h.redraw();
      }
      return;
    }
    if (this.fallen(figure, at)) return;
    // Through its own eyes the figure is still there for the light: it is drawn into the shadow
    // map and into nothing else, so you see your own shadow walk in front of you.
    const unseen = !walk.outside;
    const was = this.placedAs.copy(group.quaternion);
    const from = this.below.copy(group.position);
    // (on foot it is where the walker has it: a moment behind a body put on to a ladder or off one at once)
    group.rotation.set(0, this.facing(at), 0);
    group.position.copy(walk.stands);
    // the seat it is in, or is still getting up out of
    const sat = walk.gait.sitting;
    if (this.wheel) this.satIn = this.wheel;
    else if (!sat) this.satIn = null;
    const seat = this.satIn;
    if (seat) {
      // Seated, it is turned as the seat is (the seat has a figure's axes: a tilted seat tilts him)
      // and its hips are on the seat's hip point, sunk into the cushion as far as he must be to fit.
      // It goes between there and where it stands beside the door as its pose goes between sitting
      // and standing (sitAt): put in the seat at once, it stood upright in the cab for a moment.
      const [fx, fz] = this.h.defs()[at]!.walker?.forward ?? [0, 1];
      const turn = seat.seatTurn(this.seatQ).multiply(spin.setFromAxisAngle(UP, -Math.atan2(fx, fz)));
      group.parent?.updateWorldMatrix(true, false);
      const parent = group.parent?.getWorldQuaternion(new THREE.Quaternion()) ?? new THREE.Quaternion();
      const hips = seat.hips(new THREE.Vector3()).addScaledVector(UP, -this.sunk);
      hips.sub(new THREE.Vector3(0, walk.gait.hipHeight(figure.shown), 0).applyQuaternion(turn));
      const stand = { position: group.position.clone(), quaternion: group.quaternion.clone() };
      // (at the wheel the walker's body is in the seat: he stands where he got in)
      if (this.wheel) {
        seat.standing(stand.position);
        group.parent?.worldToLocal(stand.position);
      }
      sitAt(
        group,
        stand,
        { position: group.parent ? group.parent.worldToLocal(hips) : hips, quaternion: parent.invert().multiply(turn) },
        sat,
      );
    }
    const placed = !group.visible || this.unseen !== unseen || !group.quaternion.equals(was) || !group.position.equals(from);
    group.visible = true;
    if (this.unseen !== unseen) this.shadowOnly(group, (this.unseen = unseen));
    // (getting up, the gait takes it from however it was lying to the first of the get-up: Gait.rise)
    walk.gait.apply(figure.shown);
    if (this.wheel) this.atTheWheel(figure.shown, group);
    if (walk.body.on && walk.gait.climbing > 0) this.onTheLadder(figure.shown, group);
    if (walk.down === 'rising' && walk.gait.rising === null) {
      walk.stand(group.position); // on its feet: the legs are the walker's again
      for (const level of group.children) for (const carry of this.carriesOf(level, at)) carry.pickUp(); // and what it dropped is in its hand again
    }
    this.carryOn(figure, at);
    // Breathing alone moves him by millimetres: seen from outside it is worth drawing, but
    // nobody's shadow is redrawn for it.
    if (placed || walk.stir === 2) this.h.shadows.far.nearOnly(); // its shadow walks with it (in the fine map: the far one leaves it out)
    if (placed || walk.stir === 2 || (walk.stir === 1 && !unseen)) this.h.redraw();
  }

  /**
   * Seated at a wheel and posed: the hands are put on its rim at ten to two (they go round with
   * it), and where the eyes are is taken off the posed head, in the seat's frame, for the view.
   */
  private atTheWheel(root: THREE.Object3D, group: THREE.Object3D): void {
    const wheel = this.wheel!;
    group.updateMatrixWorld(true);
    const left = new THREE.Vector3(1, 0, 0).transformDirection(group.matrixWorld);
    const toL = new THREE.Vector3();
    const toR = new THREE.Vector3();
    if (wheel.grips(left, toL, toR)) {
      reach(root, 'L', toL);
      reach(root, 'R', toR);
    }
    const head = this.headEye && this.jointOf(root, 'Head');
    if (!head) return;
    // (and always under its roof: a cab too low for him puts his helmet through it, not the view)
    this.seatEyes = wheel.toSeat(head.localToWorld(this.headEye!.clone()));
    this.seatEyes.y = Math.min(this.seatEyes.y, this.headroom - 0.12);
  }

  /**
   * On a ladder and posed: the feet are put on its rungs and the hands on the rungs above, each on the one its height
   * up the ladder gives it (gait.ts: `rungs`), as far as the pose is the climb's. The ladder is known by its box: the
   * rungs run across the middle of it, a foot apart from a foot above its foot.
   */
  private onTheLadder(root: THREE.Object3D, group: THREE.Object3D): void {
    const walk = this.h.walk;
    const on = walk.body.on!;
    const k = walk.gait.climbing;
    group.updateMatrixWorld(true);
    const at = rungs(walk.body.position.y - on.bottom);
    // (he faces the rungs: his left is across them)
    const left = new THREE.Vector3(-on.nz, 0, on.nx);
    const ankle = this.jointOf(root, 'Foot.L');
    // (the ankle over the sole, as the figure stands: its joint's height in the figure's own frame, as built)
    const sole = ankle ? Math.max(0.05, Math.min(0.15, walk.gait.ankleHeight(root))) : 0.1;
    const to = new THREE.Vector3();
    const now = new THREE.Vector3();
    for (const side of ['L', 'R'] as const) {
      const s = side === 'L' ? 1 : -1;
      // the ball of the foot on the rung: the ankle a little out from it and over it; a hand round the rung
      const foot = this.jointOf(root, `Foot.${side}`);
      if (foot) {
        to.set(on.x + on.nx * 0.06, on.bottom + at[`Foot.${side}`] + sole, on.z + on.nz * 0.06).addScaledVector(left, s * 0.1);
        step(root, side, foot.getWorldPosition(now).lerp(to, k));
      }
      // (a hand that carries something stays on what it carries: he climbs with the other)
      const hand = walk.gait.load[side] > 0.5 ? null : (this.jointOf(root, `Grip.${side}`) ?? this.jointOf(root, `Hand.${side}`));
      if (hand) {
        to.set(on.x + on.nx * 0.02, on.bottom + at[`Hand.${side}`], on.z + on.nz * 0.02).addScaledVector(left, s * 0.15);
        reach(root, side, hand.getWorldPosition(now).lerp(to, k));
      }
    }
  }

  /** What is in the figure's hands hangs plumb and swings a little behind the stride; a hose hangs from it. */
  private carryOn(figure: Staged, at: number, collide?: Collide): void {
    const carried = this.carriesOf(figure.shown, at);
    if (!carried.length) return;
    const walk = this.h.walk;
    figure.group.updateMatrixWorld(true);
    const now = pose(walk.gait.moment);
    const p = walk.body.position;
    // (down, there is no upright body to keep the hose out of)
    const body = walk.down ? null : { x: p.x, z: p.z, radius: 0.17, bottom: p.y, top: p.y + walk.eye - 0.25 };
    // a level of detail that has just come on show lays its hose afresh; and a hose still swinging after he has stopped is drawn until it hangs still
    const fresh = this.carriedLevel !== figure.shown;
    this.carriedLevel = figure.shown;
    for (const carry of carried) {
      if (fresh) carry.relay();
      // (one let go of in a fall is kept out of the world as the figure is)
      if (!carry.update(this.walkDt, now[`Hand.${carry.hand}`], walk.body.grounded ? p.y + 0.02 : null, body, collide ?? this.solid))
        continue;
      this.h.redraw();
      // (what he carries is part of him: on foot its shadow is the fine map's alone, as his is, and asking for all the
      // shadows had the far map drawn again ten times a second for a hose it leaves out)
      if (this.h.walk.active) this.h.shadows.far.nearOnly();
      else this.h.renderer.shadowMap.needsUpdate = true;
    }
  }

  /**
   * A figure off its feet. A fall the walker could not land (`walk.fell`) hands the figure to a
   * ragdoll, from the pose it hit in and at the speed it hit; while that tumbles the figure is
   * wherever its points are and the walker's body is held under its hips. When it lies still it
   * is turned over to the gait to get up: the figure's own place is moved to under its hips,
   * facing the way it lies, without moving a bone in the world, and the get-up starts from
   * there. True while the ragdoll has the figure (the caller has nothing to pose).
   */
  private fallen(figure: Staged, at: number): boolean {
    const walk = this.h.walk;
    const group = figure.group;
    const root = figure.shown;
    if (walk.fell) {
      const { velocity } = walk.fell;
      walk.fell = null;
      let doll = this.dolls.get(root);
      if (doll === undefined) {
        // its bones are measured standing as built, once; then it is put back in the pose it was in
        // (the joints only: the stride, the fall it is in, are the gait's still, or it would be thrown as it was built)
        group.position.copy(walk.body.position);
        group.rotation.y = this.facing(at);
        walk.gait.asBuilt(root);
        group.updateMatrixWorld(true);
        doll = Ragdoll.of(root);
        this.dolls.set(root, doll);
      }
      if (!doll) {
        walk.stand(walk.body.position); // a figure with no joints cannot go limp: it lands on its feet after all
        return false;
      }
      walk.gait.apply(root);
      group.updateMatrixWorld(true);
      doll.gravity = this.gravity;
      doll.throw(velocity);
      this.tumble = doll;
      // what was in its hands goes as it hits, and lands on its own
      for (const carry of this.carriesOf(root, at)) {
        carry.gravity = this.gravity;
        carry.drop(velocity);
      }
    }
    const doll = this.tumble;
    if (!doll) return false;
    group.visible = true;
    // (seen from outside as it falls; but where the camera cannot pull back from the head, a wall
    // behind it, the figure and what it carried are not drawn in front of the eyes)
    const unseen = !walk.outside;
    if (this.unseen !== unseen) this.shadowOnly(group, (this.unseen = unseen));
    const lift = new THREE.Vector3();
    doll.step(Math.max(this.walkDt, 1e-3), this.solid);
    this.carryOn(figure, at);
    // the walker's body lies under the hips, on whatever is there
    const hips = doll.hips;
    const floor = walk.solids.below(hips.x, hips.y + 0.2, hips.z, this.h.groundAt(hips.x, hips.z)) ?? hips.y;
    walk.pin(lift.set(hips.x, floor, hips.z));
    this.h.renderer.shadowMap.needsUpdate = true;
    this.h.redraw();
    if (!doll.atRest) return true;
    // Lying still. The figure is put under its own hips, facing the way it lies (head first on its
    // front, feet first on its back), and its hips are given back the place and turn they have
    // in the world: nothing is seen to move. Then it gets up.
    this.tumble = null;
    const joint = root.getObjectByName('Hips');
    const [hx, hz] = doll.headward;
    const [fx, fz] = doll.faceDown ? [hx, hz] : [-hx, -hz];
    walk.heading = Math.atan2(-fx, -fz);
    if (joint?.parent) {
      const where = joint.getWorldPosition(new THREE.Vector3());
      const turned = joint.getWorldQuaternion(new THREE.Quaternion());
      group.position.set(hips.x, floor, hips.z);
      group.rotation.y = this.facing(at);
      group.updateMatrixWorld(true);
      joint.position.copy(joint.parent.worldToLocal(where));
      joint.quaternion.copy(joint.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(turned);
    }
    walk.pin(group.position);
    walk.down = 'rising';
    walk.gait.rise(doll.faceDown, root);
    return false;
  }

  private readonly sweep = new THREE.Vector3();

  private readonly seatQ = new THREE.Quaternion();

  private readonly placedAs = new THREE.Quaternion();

  /** The world as something falling meets it (ragdoll.ts: Collide): the solids round the walker, and under everything the open ground, which is a level and not a mesh. */
  private readonly solid: Collide = (point, radius, from) => {
    let swept: THREE.Vector3 | null = null;
    // gone right through a surface since `from`: back on the side it came from, touching it
    if (from) {
      const way = this.sweep.subVectors(point, from);
      const far = way.length();
      const hit = far > 1e-5 ? this.h.walk.solids.cast(from, way.divideScalar(far), far + radius) : null;
      if (hit && hit.distance < far + radius) {
        // (back along the way it came, to where it met the surface: not out sideways, which would throw it)
        point.copy(from).addScaledVector(way, Math.max(0, hit.distance - radius));
        swept = hit.normal;
      }
    }
    // (put back where it came from, it is touching what it went through: pushed out of the nearest surface instead, a point inside a slab can be sent out of its underside)
    const out = swept ?? this.h.walk.solids.out(point, radius);
    const ground = this.h.groundAt(point.x, point.z);
    if (ground === null || point.y >= ground + radius) return out;
    point.y = ground + radius;
    return out ? out.setY(out.y + 1).normalize() : new THREE.Vector3(0, 1, 0);
  };

  /**
   * Make everything under `root` cast its shadow and otherwise draw nothing, or put it back. It
   * is done as each mesh is drawn (the shadow pass does not call these), on whatever material
   * the look in force has given it, so it survives a change of look and touches no shared state.
   */
  private shadowOnly(root: THREE.Object3D, on: boolean): void {
    const hide = (_r: unknown, _s: unknown, _c: unknown, _g: unknown, material: THREE.Material) => {
      material.userData.wrote ??= [material.colorWrite, material.depthWrite];
      material.colorWrite = material.depthWrite = false;
    };
    const show = (_r: unknown, _s: unknown, _c: unknown, _g: unknown, material: THREE.Material) => {
      const wrote = material.userData.wrote as [boolean, boolean] | undefined;
      if (!wrote) return;
      [material.colorWrite, material.depthWrite] = wrote;
      material.userData.wrote = undefined;
    };
    const nothing = THREE.Object3D.prototype.onBeforeRender;
    root.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return;
      o.onBeforeRender = on ? hide : nothing;
      o.onAfterRender = on ? show : nothing;
    });
  }

  /** For the diagnostics: the figure is being shown from outside but its model has no joints, so it glides. */
  get walkRigid(): boolean {
    const figure = this.h.staged()[this.walked];
    return Boolean(figure && this.h.walk.active && this.h.walk.third && !this.h.walk.gait.jointed(figure.shown));
  }

  /**
   * A function of a part being worked by hand from where the walker stands (walking.md: Operate), and what is watched of
   * it: where its nodes are, will be and can go (operate.ts, from the moves' data), the figure working it, and what is
   * solid round it. `tell` hears how it stands, every frame it changes.
   */
  private operating: {
    model: string;
    node: string;
    fn: string;
    at: number;
    seconds: number;
    nodes: string[];
    watched: Watched & { now: THREE.Box3; ahead: THREE.Box3; travel: THREE.Box3; feet: THREE.Vector3; height: number; radius: number };
    /** The way the body faced when it was taken: turned round to watch it, it turns back to there when it is let go. */
    facing: number;
    turned: boolean;
    was: number;
    told: WorkState | null;
    taken: boolean;
    tell(state: WorkState): void;
  } | null = null;

  /**
   * Work a function by hand (Part.functions; handworks.ts runs it): the view goes to what it moves (camera/foot.ts
   * `FootRig.watch`), the body turns to it if it is beyond the neck, and `tell` hears how it stands each frame it
   * changes. False if there is no such function.
   */
  operate(model: string, node: string, fn: string, tell: (state: WorkState) => void): boolean {
    const at = this.h.defs().findIndex((m) => m.id === model);
    const found = this.h.functions(model, node).find((f) => f.fn.id === fn);
    if (at < 0 || !found || !this.h.walk.active) return false;
    const walk = this.h.walk;
    const watched = {
      now: new THREE.Box3(),
      ahead: new THREE.Box3(),
      travel: new THREE.Box3(),
      feet: new THREE.Vector3(),
      height: walk.body.height,
      radius: walk.body.radius,
      // (what is solid round the camera's place beside the head was gathered for it this frame: watchWork)
      clear: (from: THREE.Vector3, dir: THREE.Vector3, far: number) =>
        walk.solids.cast(from, dir, far)?.distance ?? Number.POSITIVE_INFINITY,
    };
    this.operating = {
      model,
      node,
      fn,
      at,
      seconds: found.fn.seconds,
      nodes: found.fn.nodes,
      watched,
      facing: walk.heading,
      turned: false,
      was: found.value,
      told: null,
      taken: false,
      tell,
    };
    this.watchWork();
    this.h.cam.watch(watched);
    return true;
  }

  /**
   * Let go of what is being worked by hand: the view comes back to the walker's (as it eases: camera/foot.ts), and a body
   * that turned round to watch it turns back the way it faced, unless the hands had taken the view.
   */
  unoperate(): void {
    const work = this.operating;
    if (!work) return;
    this.operating = null;
    this.h.walk.turnTo(work.turned && !work.taken && this.h.walk.active ? work.facing : null);
    this.h.cam.watch(null, !this.h.walk.active);
  }

  /**
   * The hands have moved the view while something is being worked by hand: it is theirs from now on. The walker looks
   * where the camera was looking, so the view goes on from there (over the shoulder it comes back in behind the head as
   * it turns), and nothing turns it to what is being worked again until Operate is taken again.
   */
  operateLooked(): void {
    const work = this.operating;
    if (!work || work.taken) return;
    work.taken = true;
    this.h.walk.turnTo(null);
    if (!this.h.cam.watchingWork) return;
    this.h.walk.lookAlong(this.h.camera.quaternion);
    this.h.cam.watch(null, !this.h.walk.third);
  }

  /** How the function being worked by hand stands now, or null: what the readout shows. */
  get working(): (WorkState & { model: string; node: string; fn: string }) | null {
    const work = this.operating;
    if (!work) return null;
    return { model: work.model, node: work.node, fn: work.fn, ...(work.told ?? { value: work.was, way: 0, refused: null }) };
  }

  /** A frame of something being worked by hand: where it is and is going, the body turned to it if need be, and the readout told. */
  private watchWork(): void {
    const work = this.operating;
    if (!work) return;
    const found = this.h.functions(work.model, work.node).find((f) => f.fn.id === work.fn);
    const staged = this.h.staged()[work.at];
    const part = this.h.defs()[work.at]?.parts.find((p) => p.node === work.node);
    if (!found || !staged || !part) return;
    const { fn, value, refused } = found;
    const way = wayOf(work.was, value);
    work.was = value;
    const state: WorkState = { value, way, refused };
    const told = work.told;
    if (!told || told.way !== state.way || told.refused !== state.refused || Math.abs(told.value - state.value) > 1e-4) {
      work.told = state;
      work.tell(state);
    }
    // where its nodes are, as drawn now, and where they will be and can go, from their moves
    staged.shown.updateWorldMatrix(true, true);
    const nodes = fn.nodes.flatMap((name) => {
      const object = staged.part(name);
      return object ? [{ object, moves: movesOf(part.moves, name, part.node) }] : [];
    });
    if (!nodes.length) return;
    const w = work.watched;
    boxAt(nodes, fn, value, value, w.now);
    boxAt(nodes, fn, value, THREE.MathUtils.clamp(value + way * leadOf(fn.seconds), 0, 1), w.ahead);
    sweptBox(nodes, fn, value, w.travel);
    const walk = this.h.walk;
    w.feet.copy(walk.stands);
    w.height = walk.body.height;
    w.radius = walk.body.radius;
    // what is solid round the head, as far as the camera beside it may stand (the walker gathered only within its own reach)
    const head = this.headAt.set(w.feet.x, w.feet.y + w.height, w.feet.z);
    if (walk.third && this.h.cam.watchingWork) walk.solids.gather(head, WATCH_ROOM, w.height + 1, WATCH_ROOM);
    // beyond what a neck turns to, the body turns round to it
    if (work.taken) return;
    const centre = w.now.getCenter(new THREE.Vector3());
    const dx = centre.x - head.x;
    const dz = centre.z - head.z;
    if (Math.hypot(dx, dz) < TURN_BEYOND) return;
    const toward = Math.atan2(-dx, -dz);
    const off = Math.atan2(Math.sin(toward - walk.heading), Math.cos(toward - walk.heading));
    if (Math.abs(off) > NECK.side * TURN_SHARE) {
      walk.turnTo(toward);
      work.turned = true;
    }
  }

  private readonly headAt = new THREE.Vector3();

  private readonly lastView = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion() };

  /** A frame on foot. None of the orbiting camera's rules apply: no drift, no bounds, no picking, its own depth range. */
  stepWalk(dt: number): void {
    if (this.h.walk.update(dt)) this.h.redraw();
    this.watchWork();
    this.h.cam.update(dt); // (the walker has said where its view is: the camera is put there, camera/foot.ts)
    // (the camera may move with the walker still: watching something worked by hand)
    const camera = this.h.camera;
    if (!camera.position.equals(this.lastView.position) || !camera.quaternion.equals(this.lastView.quaternion)) {
      this.lastView.position.copy(camera.position);
      this.lastView.quaternion.copy(camera.quaternion);
      this.h.redraw();
    }
    this.h.adapt(dt, true);
    const through = !this.h.walk.outside;
    if (through !== this.throughEyes) this.h.onWalkEyes((this.throughEyes = through));
    const hit = this.h.walk.aimed;
    const found = hit && this.targetOf(hit);
    if (found && hit) {
      // is it the very thing being stood on? (the page is slower to point that out)
      const feet = this.h.walk.body.position;
      const floor = this.h.walk.body.grounded && this.h.walk.solids.cast(this.below.set(feet.x, feet.y + 0.3, feet.z), DOWN, 0.8);
      const under = floor ? this.targetOf(floor)?.target : null;
      const t = found.target;
      if (under && under.model === t.model && under.node === t.node && under.place === t.place) t.underfoot = true;
    }
    // is it (part of) something that can be driven? the nearest node above it that says it is a vehicle
    let vehicle: THREE.Object3D | undefined;
    for (let o: THREE.Object3D | null = hit?.mesh ?? null; o && !vehicle; o = o.parent) if (o.userData.vehicle && o.name) vehicle = o;
    const called = typeof vehicle?.userData.vehicle === 'string' ? (vehicle.userData.vehicle as string) : undefined;
    if (found && vehicle) Object.assign(found.target, { vehicle: vehicle.name, vehicleName: called });
    const aim =
      found && hit
        ? { ...found, hit, vehicle }
        : hit && vehicle
          ? { target: { vehicle: vehicle.name, vehicleName: called }, hit, vehicle }
          : null;
    this.setAim(this.wheel || this.boarded ? null : aim); // (at the wheel, or in a couch, there is nothing to point at)
    this.h.fitDetail(dt);
    this.walkDt = dt;
    this.board(dt);
    this.poseFigure();
    this.h.shadows.fitWalkShadows();
    // the walker keeps its own near plane (centimetres, indoors); the far one is the site's, as for orbiting
    const far = Math.max(
      this.h.camera.position.distanceTo(this.h.bounds.center) + this.h.bounds.radius + (this.h.setting().horizon ?? 10),
      this.h.setting().globe?.reach(this.h.camera.position) ?? 0,
    );
    if (Math.abs(far - this.h.camera.far) > far * 0.02) {
      this.h.camera.far = far;
      this.h.camera.updateProjectionMatrix();
    }
  }

  /** The model being walked as, or null. */
  get walkingAs(): string | null {
    return this.h.defs()[this.walked]?.id ?? null;
  }

  /**
   * While walking as one figure, become another (a model with a `walker`): the first is left
   * standing where it was walked to, and the walk goes on from where the second stands.
   */
  becomeWalk(model: string): boolean {
    const at = this.h.defs().findIndex((m) => m.walker && m.id === model);
    if (at < 0 || !this.h.walk.active || at === this.walked) return false;
    this.standFigure();
    this.embody(at);
    return true;
  }
}
