import * as THREE from 'three';
import type { EarthFrame } from '../world/earthframe.ts';
import { ecefToSite, siteToEcef, siteToEcefDirection, type Site, type Vec3 } from '../world/frames.ts';
import { type State, step } from '../world/orbit.ts';

const STEP = 8;

/** A game fragment coasts under Earth's gravity from its own release state. Coarse samples are
 * cached on a fixed time grid so looking ahead, rewinding and seeking by a different route agree. */
export class FragmentTrack {
  private readonly samples: State[];
  private ground?: { at: number; fixed: Vec3 };

  private readonly frame: EarthFrame;
  private readonly site: Site;
  private readonly sea: number;
  private readonly from: number;
  constructor(frame: EarthFrame, site: Site, sea: number, from: number, point: THREE.Vector3, velocity: THREE.Vector3) {
    this.frame = frame;
    this.site = site;
    this.sea = sea;
    this.from = from;
    const fixed = siteToEcef(site, point.toArray());
    this.samples = [
      { r: frame.toInertial(fixed, from), v: frame.velocityToInertial(fixed, siteToEcefDirection(site, velocity.toArray()), from) },
    ];
  }

  position(t: number): THREE.Vector3 {
    const elapsed = Math.max(0, t - this.from);
    const index = Math.floor(elapsed / STEP);
    while (!this.ground && this.samples.length <= index + 1) {
      const last = this.samples.at(-1)!;
      const start = this.from + (this.samples.length - 1) * STEP;
      const next = step(last, start, STEP);
      if (this.frame.place(next.r, start + STEP).height <= this.sea) {
        let lo = 0,
          hi = STEP;
        for (let i = 0; i < 22; i++) {
          const mid = (lo + hi) / 2;
          if (this.frame.place(step(last, start, mid).r, start + mid).height > this.sea) lo = mid;
          else hi = mid;
        }
        this.ground = { at: start + hi, fixed: this.frame.toFixed(step(last, start, hi).r, start + hi) };
      }
      this.samples.push(next);
    }
    if (this.ground && t >= this.ground.at) return new THREE.Vector3(...ecefToSite(this.site, this.ground.fixed));
    const state = step(this.samples[index]!, this.from + index * STEP, elapsed - index * STEP);
    return new THREE.Vector3(...ecefToSite(this.site, this.frame.toFixed(state.r, t)));
  }

  flyingFor(t: number): number {
    return Math.max(0, Math.min(t, this.ground?.at ?? Infinity) - this.from);
  }
}

/** Transform from the child's coordinates to an ancestor's, without taking a detour through
 * world coordinates (the scene may be hundreds of kilometres from its origin). */
export function relativeTo(node: THREE.Object3D, parent: THREE.Object3D): THREE.Matrix4 {
  const matrix = new THREE.Matrix4();
  for (let p: THREE.Object3D | null = node; p && p !== parent; p = p.parent) {
    if (p.matrixAutoUpdate) p.updateMatrix();
    matrix.premultiply(p.matrix);
  }
  return matrix;
}

function bounds(node: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  node.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.boundingBox ?? child.geometry.computeBoundingBox();
    if (child.geometry.boundingBox) box.union(child.geometry.boundingBox.clone().applyMatrix4(relativeTo(child, node)));
  });
  return box;
}

export interface FragmentPiece {
  node: THREE.Object3D;
  rest: THREE.Matrix4;
  centre: THREE.Vector3;
  size: number;
}

/** Rank by readable size, never by a real component's strength or expected mode of failure. */
export function fragmentPieces(roots: THREE.Object3D[], basis: THREE.Object3D, limit: number, into = new THREE.Matrix4()): FragmentPiece[] {
  const pieces = roots
    .filter((o) => o.visible)
    .flatMap((node) => {
      const rest = into.clone().multiply(relativeTo(node, basis));
      const box = bounds(node).applyMatrix4(rest);
      const size = box.getSize(new THREE.Vector3()).length();
      return size > 0.02 ? [{ node, rest, centre: box.getCenter(new THREE.Vector3()), size }] : [];
    });
  return pieces
    .sort((a, b) => Math.abs(Math.log(a.size)) - Math.abs(Math.log(b.size)) || a.node.name.localeCompare(b.node.name))
    .slice(0, limit);
}

export interface FragmentMotion {
  track: FragmentTrack;
  releaseTurn: THREE.Quaternion;
  earthAxis: THREE.Vector3;
  earthRate: number;
  rates: THREE.Vector3;
}

/** The original scene node, carried by a new holder. Its geometry and materials stay shared
 * with the renderer. Returning before impact restores the original parent and child order. */
export class BreakupFragment {
  readonly holder = new THREE.Group();
  readonly position = new THREE.Vector3();
  private readonly parent: THREE.Object3D;
  private readonly index: number;
  private readonly relative: THREE.Matrix4;
  private readonly spin: THREE.Vector3;
  private readonly rate: number;
  private readonly aliases = new Map<THREE.Object3D, boolean>();

  readonly source: number | 'active';
  readonly at: number;
  readonly piece: FragmentPiece;
  private readonly motion: FragmentMotion;

  constructor(source: number | 'active', at: number, piece: FragmentPiece, motion: FragmentMotion, root: THREE.Object3D) {
    this.source = source;
    this.at = at;
    this.piece = piece;
    this.motion = motion;
    this.spin = new THREE.Vector3(0.3, 0.8, -0.4).normalize().multiplyScalar(0.9).add(motion.rates);
    this.rate = this.spin.length();
    this.spin.normalize();
    this.parent = piece.node.parent!;
    this.index = this.parent.children.indexOf(piece.node);
    this.relative = new THREE.Matrix4().makeTranslation(-piece.centre.x, -piece.centre.y, -piece.centre.z).multiply(piece.rest);
    this.holder.name = `Breakup_${piece.node.name}`;
    this.holder.matrixAutoUpdate = false;
    root.add(this.holder);
    this.holder.add(piece.node);
  }

  hideLowerLevels(group: THREE.Object3D, full: THREE.Object3D) {
    for (const level of group.children) {
      if (level === full) continue;
      const other = level.getObjectByName(this.piece.node.name);
      if (!other || this.aliases.has(other)) continue;
      this.aliases.set(other, other.visible);
      other.visible = false;
    }
  }

  place(t: number) {
    const p = this.position.copy(this.motion.track.position(t));
    const dt = this.motion.track.flyingFor(t);
    const turn = new THREE.Quaternion()
      .setFromAxisAngle(this.motion.earthAxis, -this.motion.earthRate * dt)
      .multiply(this.motion.releaseTurn)
      .multiply(new THREE.Quaternion().setFromAxisAngle(this.spin, dt * this.rate));
    if (this.piece.node.matrixAutoUpdate) this.piece.node.updateMatrix();
    this.holder.matrix
      .makeRotationFromQuaternion(turn)
      .setPosition(p)
      .multiply(this.relative)
      .multiply(this.piece.node.matrix.clone().invert());
    this.holder.matrixWorldNeedsUpdate = true;
  }

  restore() {
    const node = this.piece.node;
    this.parent.add(node);
    this.parent.children.splice(this.parent.children.indexOf(node), 1);
    this.parent.children.splice(this.index, 0, node);
    for (const [o, visible] of this.aliases) o.visible = visible;
    this.holder.removeFromParent();
  }
}

/** Choose disjoint, mesh-bearing branches. Walk through single-child wrappers until the
 * existing assembly has pieces that can visibly part. Keep at least one branch aboard. */
export function separableBranches(node: THREE.Object3D): THREE.Object3D[] {
  const branches = node.children.filter((o) => o.visible && !bounds(o).isEmpty());
  if (branches.length > 1) return branches;
  return branches.length === 1 && !(node instanceof THREE.Mesh) ? separableBranches(branches[0]!) : [];
}
