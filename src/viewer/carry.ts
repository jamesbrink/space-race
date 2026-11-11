import * as THREE from 'three';
import type { ModelDef } from '../types';
// (with their extensions: the tests run this file under Node, which adds none)
import { jointKey } from './gait.ts';
import { Hose, type KeepOut } from './hose.ts';

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

  /** Back where the model has it, as the model has it. */
  putDown(): void {
    if (!this.item || !this.home || !this.held) return;
    this.held = false;
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
  update(dt: number, swing: number, floor: number | null, body: KeepOut | null): boolean {
    if (!this.held || !this.item || !this.grip) return false;
    const upright = this.root.getWorldQuaternion(q1).multiply(q2.setFromAxisAngle(X, swing)).multiply(this.plumb);
    this.item.quaternion.copy(this.grip.getWorldQuaternion(q2).invert()).multiply(upright);
    this.item.updateMatrixWorld(true);
    if (!this.hose || !this.from || !this.to) return false;
    this.hose.update(
      this.from.getWorldPosition(v1),
      v2.set(0, 1, 0).transformDirection(this.from.matrixWorld),
      this.to.getWorldPosition(v3),
      v4.set(0, 1, 0).transformDirection(this.to.matrixWorld),
      dt,
      floor,
      body,
    );
    return this.hose.speed > 0.03;
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
