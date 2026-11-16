import * as THREE from 'three';
import type { Move } from '../../types.ts';
import { smoothstep } from '../../util/math.ts';
import { type Fn, sliderFor } from '../explode.ts';

/**
 * What a function worked by hand looks like from where it is run (walking.md, "What a part does can be worked by hand"):
 * where its nodes are now, where they will be a little further on the way they are going, and where the whole of their
 * travel takes them, worked out from the moves' own data (types.ts `Move`: each slide and swing, with its stretch of
 * the slider) rather than by posing the model, so nothing is moved or heard to find out. The camera watches it from
 * these (camera/watch.ts), and the walk bar says how far along it is (`travelOf`). Nothing here knows a flight.
 */

/** How far ahead "where it will be" is, seconds of its own pace: a few seconds of travel, never less than a twentieth of it. */
export const LEAD_SECONDS = 6;
const LEAD_LEAST = 0.05;
const LEAD_MOST = 0.5;
/** The points of its travel its whole sweep is measured at (0 and 1 are its ends). */
const SWEEP = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1];

/** How far a function is along its travel, 0 (its first end) to 1 (its second), as the readout shows it: a whole per cent, never outside its ends. */
export function travelOf(value: number): number {
  return Math.round(THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1) * 100);
}

/** Which way it is going, from how far along it was a moment ago and is now: 1 toward its second end, -1 back, 0 still. */
export function wayOf(was: number, now: number, still = 1e-5): -1 | 0 | 1 {
  return now - was > still ? 1 : was - now > still ? -1 : 0;
}

/** How far ahead along its travel "where it will be" is for a function that takes `seconds` to run the whole of it. */
export function leadOf(seconds: number): number {
  return THREE.MathUtils.clamp(LEAD_SECONDS / Math.max(1e-6, seconds), LEAD_LEAST, LEAD_MOST);
}

const localBoxes = new WeakMap<THREE.Object3D, THREE.Box3>();
const inverse = new THREE.Matrix4();
const meshIn = new THREE.Matrix4();
const corner = new THREE.Box3();

/** The box round a node and everything under it, in the node's own frame (as it was the first time it was asked: what is under it is taken to move with it). */
export function localBox(node: THREE.Object3D): THREE.Box3 {
  let box = localBoxes.get(node);
  if (box) return box;
  box = new THREE.Box3();
  node.updateWorldMatrix(true, true);
  inverse.copy(node.matrixWorld).invert();
  node.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    box!.union(corner.copy(mesh.geometry.boundingBox!).applyMatrix4(meshIn.multiplyMatrices(inverse, mesh.matrixWorld)));
  });
  if (box.isEmpty()) box.setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3());
  localBoxes.set(node, box);
  return box;
}

/** How far along its own stretch a move is when the slider reads `k`: as the model plays it (explode.ts `Sequence.set`). */
const through = (move: Move, k: number): number => smoothstep(0, 1, (k - move.from) / Math.max(1e-6, move.to - move.from));

const axis = new THREE.Vector3();
const spin = new THREE.Quaternion();

/** The turn every swing of `moves` gives its node at slider reading `k`, the first innermost (as `Sequence.set` puts them on). */
function swung(moves: readonly Move[], k: number, out: THREE.Quaternion): THREE.Quaternion {
  out.identity();
  for (const move of moves)
    if (move.kind === 'swing') out.premultiply(spin.setFromAxisAngle(axis.set(...move.axis).normalize(), move.angle * through(move, k)));
  return out;
}

/** How far every slide of `moves` has taken its node at slider reading `k`, in its parent's frame. */
function slid(moves: readonly Move[], k: number, out: THREE.Vector3): THREE.Vector3 {
  out.set(0, 0, 0);
  for (const move of moves) if (move.kind === 'slide') out.addScaledVector(axis.set(...move.by), through(move, k));
  return out;
}

const m = new THREE.Matrix4();
const now = new THREE.Quaternion();
const then = new THREE.Quaternion();
const turned = new THREE.Quaternion();
const by = new THREE.Vector3();
const was = new THREE.Vector3();
const place = new THREE.Vector3();

/**
 * Where a node of a function will be, as a box in the scene: `node` stands where its moves (`moves`, those that are its)
 * put it `from` along the function's travel, and is taken to `to` along it by the same moves. Its slides and swings
 * are played exactly; a drive along a path or a baked motion (`drive`, `run`) is not followed, and leaves the box where
 * it is. World matrices must be up to date.
 */
export function nodeBoxAt(node: THREE.Object3D, moves: readonly Move[], fn: Fn, from: number, to: number, out: THREE.Box3): THREE.Box3 {
  const a = sliderFor(fn, from);
  const b = sliderFor(fn, to);
  // the swings' turn there over the turn they have here, put on the turn it has now; the slides' difference added to where it is
  swung(moves, a, now);
  swung(moves, b, then);
  turned.copy(then).multiply(now.invert()).multiply(node.quaternion);
  place
    .copy(node.position)
    .add(slid(moves, b, by))
    .sub(slid(moves, a, was));
  const local = localBox(node); // (first: the first time, it is measured with matrices of its own)
  m.compose(place, turned, node.scale);
  if (node.parent) m.premultiply(node.parent.matrixWorld);
  return out.copy(local).applyMatrix4(m);
}

/** The moves of a part that are a node's own (Move.node; the part's own node for one that names none). */
export function movesOf(moves: readonly Move[] | undefined, node: string, partNode: string): Move[] {
  return (moves ?? []).filter((move) => (move.node ?? partNode) === node);
}

const one = new THREE.Box3();

/** Where all of a function's nodes will be `to` along its travel, from `from`: the union of `nodeBoxAt` for each. */
export function boxAt(
  nodes: readonly { object: THREE.Object3D; moves: readonly Move[] }[],
  fn: Fn,
  from: number,
  to: number,
  out: THREE.Box3,
): THREE.Box3 {
  out.makeEmpty();
  for (const { object, moves } of nodes) out.union(nodeBoxAt(object, moves, fn, from, to, one));
  return out;
}

/** Where all of a function's nodes go over the whole of its travel, from `from` (where they are now): one box. */
export function sweptBox(
  nodes: readonly { object: THREE.Object3D; moves: readonly Move[] }[],
  fn: Fn,
  from: number,
  out: THREE.Box3,
): THREE.Box3 {
  out.makeEmpty();
  const at = new THREE.Box3();
  for (const to of SWEEP) out.union(boxAt(nodes, fn, from, to, at));
  return out;
}
