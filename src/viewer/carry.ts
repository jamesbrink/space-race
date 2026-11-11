import * as THREE from 'three';
import type { ModelDef } from '../types';
// (with their extensions: the tests run this file under Node, which adds none)
import { jointKey } from './gait.ts';
import { Hose, type KeepOut } from './hose.ts';
import type { Collide } from './ragdoll.ts';

/** What a figure carries, as its flight declares it (types.ts: ModelDef.walker.carries). */
export type CarryDef = NonNullable<NonNullable<ModelDef['walker']>['carries']>[number];

/**
 * Something a walking figure has in its hand: a case by its handle, with or without a hose back
 * to the figure. The model supplies the pieces, by a contract any crew figure can follow:
 *
 *   Grip.L / Grip.R        under each hand: where a handle lies in the hooked fingers
 *   Fingers.L / Fingers.R  the four fingers' one hinge: turned 50 degrees about its own X they hook
 *   the item               a rigid node whose origin is the middle of its handle: made a child of
 *                          a grip with no transform of its own, it is in the hand
 *   a hose, optionally     two anchors (the hose leaves each along its own +Y; the one on the
 *                          item says how long and thick the hose is) and the hose as modelled
 *                          for the figure at rest, which is hidden while a hanging one is drawn
 *
 * This takes the item up (into the hand) and puts it down (back where the model has it), keeps
 * it hanging plumb as the arm swings, and hangs the hose (hose.ts). One of these per level of
 * detail of the figure: each level has its own nodes.
 */
export class Carry {
  readonly hand: 'L' | 'R';
  private readonly root: THREE.Object3D;
  private readonly item: THREE.Object3D | undefined;
  private readonly grip: THREE.Object3D | undefined;
  private readonly fingers: THREE.Object3D | undefined;
  private readonly modelled: THREE.Object3D | undefined;
  private readonly from: THREE.Object3D | undefined;
  private readonly to: THREE.Object3D | undefined;
  private hose: Hose | null = null;
  /** Where the item belongs when it is not in the hand. */
  private readonly home: { parent: THREE.Object3D | null; position: THREE.Vector3; quaternion: THREE.Quaternion } | null = null;
  private readonly relaxed = new THREE.Quaternion();
  /** How the grip sits in the figure when the arm hangs at rest: the item is kept that way up however the arm swings. */
  private readonly plumb = new THREE.Quaternion();
  private held = false;
  /** Let go of in a fall: it is a box tumbling on its own until it is picked up again. */
  private loose: Tossed | null = null;

  /** `root` is one level of detail of the figure. `adopt` is told of any mesh made here, so that it is drawn in the look in force. */
  constructor(root: THREE.Object3D, def: CarryDef, adopt: (mesh: THREE.Mesh) => void) {
    this.root = root;
    this.hand = def.hand;
    const named = new Map<string, THREE.Object3D>();
    root.traverse((o) => {
      if (o.name && !named.has(jointKey(o.name))) named.set(jointKey(o.name), o);
    });
    const find = (name: string | undefined) => (name ? named.get(jointKey(name)) : undefined);
    this.item = find(def.node);
    this.grip = find(`Grip.${def.hand}`);
    this.fingers = find(`Fingers.${def.hand}`);
    this.modelled = find(def.hose?.mesh);
    this.from = find(def.hose?.from);
    this.to = find(def.hose?.to);
    if (this.item) this.home = { parent: this.item.parent, position: this.item.position.clone(), quaternion: this.item.quaternion.clone() };
    if (this.fingers) this.relaxed.copy(this.fingers.quaternion);
    if (this.from && this.to) {
      const length = Number(this.from.userData.hose_length) || 1;
      const radius = Number(this.from.userData.hose_radius) || 0.015;
      const like = this.modelled as THREE.Mesh | undefined;
      const material =
        (like?.userData.real as THREE.Material | undefined) ??
        (like?.material as THREE.Material | undefined) ??
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
      this.hose = new Hose(length, radius, material);
      this.hose.mesh.name = 'CarriedHose';
      this.hose.mesh.visible = false;
      root.add(this.hose.mesh);
      adopt(this.hose.mesh);
    }
  }

  /** Can it be carried at all: has the model the item and a hand to put it in? */
  get ready(): boolean {
    return Boolean(this.item && this.grip);
  }

  /** Into the hand. The figure must be standing as built: how the grip sits now is what "hanging plumb" will mean. */
  take(): void {
    if (!this.item || !this.grip || this.held) return;
    this.held = true;
    this.root.updateWorldMatrix(true, true);
    this.plumb
      .copy(this.root.getWorldQuaternion(new THREE.Quaternion()).invert())
      .multiply(this.grip.getWorldQuaternion(new THREE.Quaternion()));
    this.grip.add(this.item);
    this.item.position.set(0, 0, 0);
    this.item.quaternion.identity();
    if (this.fingers) this.fingers.quaternion.copy(this.relaxed).multiply(new THREE.Quaternion().setFromAxisAngle(X, HOOK));
    if (this.modelled) this.modelled.visible = false;
    if (this.hose) {
      this.hose.mesh.visible = true;
      this.hose.reset();
    }
  }

  /**
   * Let go of it (the figure has gone down): it leaves the hand at the speed the hand had and
   * tumbles on its own, a rigid box, its hose still hung between it and the figure.
   */
  drop(velocity: THREE.Vector3): void {
    if (!this.item || !this.held || this.loose) return;
    this.item.updateWorldMatrix(true, true);
    this.loose = new Tossed(this.item, velocity);
  }

  /** Is it lying where it was dropped? */
  get dropped(): boolean {
    return this.loose !== null;
  }

  /** Into the hand again from wherever it lies (the figure is on its feet). */
  pickUp(): void {
    if (!this.item || !this.grip || !this.loose) return;
    this.loose = null;
    this.grip.add(this.item);
    this.item.position.set(0, 0, 0);
    this.item.quaternion.identity();
    this.hose?.reset();
  }

  /** Back where the model has it, as the model has it. */
  putDown(): void {
    if (!this.item || !this.home || !this.held) return;
    this.held = false;
    this.loose = null;
    this.home.parent?.add(this.item);
    this.item.position.copy(this.home.position);
    this.item.quaternion.copy(this.home.quaternion);
    if (this.fingers) this.fingers.quaternion.copy(this.relaxed);
    if (this.modelled) this.modelled.visible = true;
    if (this.hose) this.hose.mesh.visible = false;
  }

  /**
   * A frame, after the figure has been posed and its matrices brought up to date. The item is
   * turned in the hand so that it hangs as it did at rest, plus `swing` radians fore and aft (a
   * weight on an arm lags the stride); the hose is hung between its anchors, above `floor` and
   * outside `body`. True while the hose is still moving: it wants drawing again.
   */
  update(dt: number, swing: number, floor: number | null, body: KeepOut | null, collide?: Collide): boolean {
    if (!this.held || !this.item || !this.grip) return false;
    let moving = false;
    if (this.loose) {
      // dropped: it falls and tumbles where it was let go, in the world, whatever the figure does
      if (collide) moving = this.loose.step(Math.max(dt, 1e-3), collide);
      this.loose.place(this.item);
    } else {
      const upright = this.root.getWorldQuaternion(q1).multiply(q2.setFromAxisAngle(X, swing)).multiply(this.plumb);
      this.item.quaternion.copy(this.grip.getWorldQuaternion(q2).invert()).multiply(upright);
    }
    this.item.updateMatrixWorld(true);
    if (!this.hose || !this.from || !this.to) return moving;
    this.hose.update(
      this.from.getWorldPosition(v1),
      v2.set(0, 1, 0).transformDirection(this.from.matrixWorld),
      this.to.getWorldPosition(v3),
      v4.set(0, 1, 0).transformDirection(this.to.matrixWorld),
      dt,
      floor,
      body,
    );
    return moving || this.hose.speed > 0.03;
  }

  /** The hose is to be laid out afresh (this level of detail has just come on show: its hose is wherever it was last). */
  relay(): void {
    this.hose?.reset();
  }
}

/** How far the fingers turn at the knuckles to hook a handle, radians. */
const HOOK = THREE.MathUtils.degToRad(50);
const X = new THREE.Vector3(1, 0, 0);
const q1 = new THREE.Quaternion();
const q2 = new THREE.Quaternion();
const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const v3 = new THREE.Vector3();
const v4 = new THREE.Vector3();

/**
 * A rigid box let go of: its eight corners fall under gravity, held their distances apart, kept
 * out of the world and slowed by it, until they lie still. Its place and turn are read back off
 * the corners. It is in the world's frame, so whatever the figure it came from does (it is moved
 * under its own hips when it gets up), the box stays where it lies.
 */
export class Tossed {
  private readonly corners: THREE.Vector3[] = [];
  private readonly points: THREE.Vector3[] = [];
  private readonly before: THREE.Vector3[] = [];
  private readonly sticks: [number, number, number][] = [];
  /** The middle of the box in the item's own frame: its origin is its handle, not its middle. */
  private readonly middle = new THREE.Vector3();
  private still = 0;

  constructor(item: THREE.Object3D, velocity: THREE.Vector3, dt = 1 / 60) {
    // the box round everything under the item, in its own frame
    const box = new THREE.Box3();
    const inverse = item.matrixWorld.clone().invert();
    item.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || mesh.name === 'CarriedHose') return;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      box.union(mesh.geometry.boundingBox!.clone().applyMatrix4(m1.multiplyMatrices(inverse, mesh.matrixWorld)));
    });
    if (box.isEmpty()) box.setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3(0.2, 0.2, 0.2));
    box.getCenter(this.middle);
    for (let i = 0; i < 8; i++) {
      const corner = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z);
      this.corners.push(corner);
      const p = corner.clone().applyMatrix4(item.matrixWorld);
      this.points.push(p);
      this.before.push(p.clone().addScaledVector(velocity, -dt));
    }
    for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) this.sticks.push([i, j, this.corners[i]!.distanceTo(this.corners[j]!)]);
  }

  /** A frame. True while it is still moving. */
  step(dt: number, collide: Collide): boolean {
    if (this.still > 0.5) return false;
    const ticks = Math.max(1, Math.min(4, Math.ceil(dt * 60)));
    const h = dt / ticks;
    let fastest = 0;
    for (let t = 0; t < ticks; t++) {
      const touching = this.points.map(() => false);
      this.points.forEach((p, i) => {
        const was = this.before[i]!;
        const v = v1.subVectors(p, was).multiplyScalar(this.grounded ? 0.6 : 0.995);
        was.copy(p);
        p.add(v).setY(p.y - 9.81 * h * h);
      });
      for (let pass = 0; pass < 8; pass++) {
        for (const [i, j, length] of this.sticks) {
          const a = this.points[i]!;
          const b = this.points[j]!;
          const d = v1.subVectors(b, a);
          const now = d.length() || 1e-9;
          d.multiplyScalar((now - length) / now / 2);
          a.add(d);
          b.sub(d);
        }
        this.points.forEach((p, i) => {
          const out = collide(p, 0.01);
          if (!out) return;
          touching[i] = true;
          const was = this.before[i]!;
          const into = v1.subVectors(p, was).dot(out);
          if (into < 0) was.addScaledVector(out, into);
        });
      }
      this.grounded = touching.some(Boolean);
      fastest = Math.max(fastest, ...this.points.map((p, i) => p.distanceTo(this.before[i]!) / h));
    }
    this.still = fastest < 0.05 ? this.still + dt : 0;
    return true;
  }

  private grounded = false;

  /** Put the item where the corners say it is, in whatever frame its parent is in. */
  place(item: THREE.Object3D): void {
    const p = this.points;
    // its own axes, from the corners: x from the four on its -x face to the four on its +x face, and so on
    const axis = (bit: number, to: THREE.Vector3) => {
      to.set(0, 0, 0);
      for (let i = 0; i < 8; i++) to.addScaledVector(p[i]!, i & bit ? 1 : -1);
      return to.normalize();
    };
    const x = axis(1, v1);
    const y = axis(2, v2);
    y.addScaledVector(x, -y.dot(x)).normalize();
    const z = v3.crossVectors(x, y);
    const centre = v4.set(0, 0, 0);
    for (const c of p) centre.addScaledVector(c, 1 / 8);
    const turn = q1.setFromRotationMatrix(m1.makeBasis(x, y, z));
    // the world place of its origin: the middle, less the middle's offset turned as it lies
    const origin = centre.sub(v2.copy(this.middle).applyQuaternion(turn));
    const world = m1.compose(origin, turn, v3.set(1, 1, 1));
    item.parent?.updateWorldMatrix(true, false);
    if (item.parent) world.premultiply(m2.copy(item.parent.matrixWorld).invert());
    world.decompose(item.position, item.quaternion, v3);
  }
}
const m1 = new THREE.Matrix4();
const m2 = new THREE.Matrix4();
