import type * as THREE from 'three';
import { Box3, Group, MeshDepthMaterial, ShaderChunk, Sphere, Vector2, Vector3 } from 'three';
import type { Part } from '../types';
import { markDriven } from './drive.ts';
import { Exploder } from './explode.ts';

/**
 * Pixels per metre above which each level of detail is worth drawing. Level 0 is the model as
 * built; 1 and 2 are the same scripts run at `--detail 0.6` and `0.3` (tools/build-model.mjs).
 *
 * A coarser level is not only the same shape with fewer sides. Below 1.0 the scripts leave out
 * what stands behind a window, rail spikes and door furniture; below 0.5, fasteners, a truss's
 * lighter bracing, panel lines. Measured (the same view drawn at both levels, pixel by pixel, at
 * 1280 x 800), the two levels of a building never agree at any size at which the building can be
 * seen: the pixels that differ fall off with its area on screen, and no faster. So the thresholds
 * are set where what changes is small (some tens of pixels in a million for 0 to 1 at 8 px/m,
 * a few hundred for 1 to 2 at 2 px/m, most of them a pixel wide), and the change itself is never
 * a cut: the two levels are drawn together for `FADE` seconds, one giving way to the other pixel
 * by pixel (`Crossfade`). At the old thresholds (40 and 12) a gantry's bracing and the table
 * behind a window came and went in one frame, sixty metres off.
 */
export const LOD_ABOVE = [8, 2] as const;

/**
 * A thing's own thresholds, where it has them. The two numbers above are for the worst of what was measured: a truss
 * whose bracing goes, a room behind a window. Most things differ far less from one level to the next (a road and a
 * cable trench not at all), and are as well drawn from the coarser level long before. So each model, and each piece
 * of a place, carries the thresholds measured for it: `lod_above` in its GLB (the scene's extras for a model, a
 * node's for a piece), put there from the `.lod.json` beside its script (tools/lod-thresholds.mjs), where the
 * measurement is kept: the largest size on screen, in pixels a metre, at and under which the two levels drawn side by
 * side differ by no more than the pixels allowed there. Never under the numbers above (a thing is never held finer
 * for longer than before); what is not there, or not sound, is those numbers.
 */
export function thresholdsOf(extras: unknown): readonly number[] {
  if (!Array.isArray(extras) || extras.length !== LOD_ABOVE.length) return LOD_ABOVE;
  const above: number[] = [];
  for (const [i, v] of extras.entries()) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v < LOD_ABOVE[i]! || (i > 0 && v > above[i - 1]!)) return LOD_ABOVE;
    above.push(v);
  }
  return above;
}

/** Seconds one level takes to give way to another. */
export const FADE = 0.6;

/** Where level `n` of a model lives, given the model's own URL. */
export const lodUrl = (url: string, level: number) => (level ? url.replace(/\.glb$/, `.lod${level}.glb`) : url);

/**
 * Which level to show at `ppm` pixels per metre, given the one on show: a change needs a clear margin, so a camera
 * resting on a boundary does not flutter between two (going finer at 12 % over the threshold, coarser at 10 % under).
 */
export function chooseLevel(ppm: number, current: number, above: readonly number[] = LOD_ABOVE): number {
  let level = Math.min(current, above.length);
  while (level > 0 && ppm > above[level - 1]! * 1.12) level--;
  while (level < above.length && ppm < above[level]! * 0.9) level++;
  return level;
}

/**
 * How far the eye is from a thing, for choosing its level: to the nearest point of the box round it, and never less
 * than a metre. Not to its middle: a row of poles 260 m long, or the pad with its apron, has parts a hundred metres
 * from its middle, and someone standing beside one of those is standing beside the thing. Inside the box the answer
 * is the least there is, so what the eye is among is always drawn in full.
 */
export function distanceTo(box: Box3, eye: Vector3): number {
  return Math.max(1, box.distanceToPoint(eye));
}

/**
 * The shader's side of a cross-fade. A material that is fading is compiled with `LOD_FADE` and discards the pixels
 * the other level is to have: each pixel of the screen has a threshold of its own (interleaved gradient noise: no
 * pattern the eye picks out, and the same every frame, so nothing shimmers), the level coming in is drawn where the
 * fade has passed the threshold and the one going out where it has not. Where the two levels are the same surface
 * every pixel is drawn by one of them and nothing shows; where they differ the difference comes in pixel by pixel.
 * The same test runs in the shadow map's texels, so a shadow is handed over as its caster is. Only materials that
 * are fading carry the test: a shader that may discard gives up the GPU's early depth test, which the rest keep.
 */
ShaderChunk.clipping_planes_pars_fragment = /* glsl */ `
#ifdef LOD_FADE
  uniform vec2 uLodFade; // how far through, and which side: 1 coming in, -1 going out
#endif
${ShaderChunk.clipping_planes_pars_fragment}`;
ShaderChunk.clipping_planes_fragment = /* glsl */ `
#ifdef LOD_FADE
  {
    float lodNoise = fract(52.9829189 * fract(dot(floor(gl_FragCoord.xy), vec2(0.06711056, 0.00583715))));
    if (uLodFade.y > 0.0 ? lodNoise >= uLodFade.x : lodNoise < uLodFade.x) discard;
  }
#endif
${ShaderChunk.clipping_planes_fragment}`;

let proxies = 0;

/** One side of a cross-fade: the materials of the level coming in, or of the one going out, while it lasts. */
class Fading {
  readonly fade = { value: new Vector2(0, 1) };
  private readonly twins = new Map<THREE.Material, THREE.Material>();
  private readonly was = new Map<THREE.Mesh, { material: THREE.Material; fading: THREE.Material; depth: THREE.Material | undefined }>();
  private depthMaterial: THREE.Material | null = null;

  constructor(side: 1 | -1) {
    this.fade.value.y = side;
  }

  /**
   * A material's fading twin: the material itself (an object whose prototype it is, so whatever is done to the
   * material is done to the twin: the cutaway's planes, its colour, its maps) with the fade's test compiled in and
   * this side's uniform. It has an id of its own, so three sends its uniforms when the draw goes from the material
   * to its twin, and each side of each fade has its own twin, so two pieces fading at once do not share a value.
   */
  private twin(real: THREE.Material): THREE.Material {
    const made = this.twins.get(real);
    if (made) return made;
    const twin = Object.create(real) as THREE.Material & { _listeners?: unknown };
    Object.defineProperty(twin, 'id', { value: -++proxies });
    twin._listeners = undefined; // (its own: three listens for each material's disposal)
    twin.defines = { ...real.defines, LOD_FADE: '' };
    twin.onBeforeCompile = (shader, renderer) => {
      real.onBeforeCompile.call(twin, shader, renderer);
      shader.uniforms.uLodFade = this.fade;
    };
    real.addEventListener('dispose', () => {
      twin.dispose();
      this.twins.delete(real);
    });
    this.twins.set(real, twin);
    return twin;
  }

  private get depth(): THREE.Material {
    if (this.depthMaterial) return this.depthMaterial;
    const depth = new MeshDepthMaterial();
    depth.defines = { LOD_FADE: '' };
    depth.onBeforeCompile = (shader) => {
      shader.uniforms.uLodFade = this.fade;
    };
    depth.customProgramCacheKey = () => 'lod-fade';
    return (this.depthMaterial = depth);
  }

  /** Every mesh under `root` is drawn fading from now on, in the view and in the shadow map. */
  put(root: THREE.Object3D): void {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material) || this.was.has(mesh)) return;
      const material = mesh.material;
      // (a material that is all its own shader has no place for the test: it changes over at the end)
      if ((material as THREE.ShaderMaterial).isShaderMaterial) return;
      const fading = this.twin(material);
      this.was.set(mesh, { material, fading, depth: mesh.customDepthMaterial });
      mesh.material = fading;
      if (!mesh.customDepthMaterial) mesh.customDepthMaterial = this.depth;
    });
  }

  /** Give every mesh back what it had, unless something else has changed it since (a change of look). */
  lift(): void {
    for (const [mesh, { material, fading, depth }] of this.was) {
      if (mesh.material === fading) mesh.material = material;
      if (mesh.customDepthMaterial === this.depthMaterial) mesh.customDepthMaterial = depth;
    }
    this.was.clear();
  }
}

/**
 * One thing changing from one of its levels to another: both are drawn for `FADE` seconds, the first going out as
 * the second comes in. A change asked for while one is under way finishes the one under way at once (the margins in
 * `chooseLevel` keep that for a camera that is travelling, when it is not seen).
 */
export class Crossfade {
  private readonly coming = new Fading(1);
  private readonly going = new Fading(-1);
  private from: THREE.Object3D | null = null;
  private to: THREE.Object3D | null = null;
  private f = 1;
  private warming = false;

  get running(): boolean {
    return this.to !== null;
  }

  /** `to` takes over from `from`, which is on show. */
  start(from: THREE.Object3D, to: THREE.Object3D): void {
    this.finish();
    this.from = from;
    this.to = to;
    this.f = 0;
    from.visible = to.visible = true;
    this.going.put(from);
    this.coming.put(to);
    this.set();
  }

  /** `dt` seconds on. True while there is a fade to draw. */
  step(dt: number): boolean {
    if (!this.to) return false;
    this.f += dt / FADE;
    if (this.f >= 1) this.finish();
    else this.set();
    return true;
  }

  /** Have done with it now: the level coming in is the one on show. */
  finish(): void {
    if (this.warming) {
      this.going.lift();
      this.coming.lift();
      this.warming = false;
    }
    if (!this.from || !this.to) return;
    this.going.lift();
    this.coming.lift();
    this.from.visible = false;
    this.to.visible = true;
    this.from = this.to = null;
    this.f = 1;
  }

  /** Draw both as they are drawn half way through a fade, so that their fading shaders are built (`finish` undoes it; neither is hidden by it if `from` is null). */
  warm(from: THREE.Object3D, to: THREE.Object3D): void {
    this.going.put(from);
    this.coming.put(to);
    this.warming = true;
    this.coming.fade.value.x = this.going.fade.value.x = 0.5;
  }

  private set(): void {
    // eased at both ends: the first and last pixels to change are the ones most noticed
    const f = this.f * this.f * (3 - 2 * this.f);
    this.coming.fade.value.x = this.going.fade.value.x = f;
  }
}

/** One piece of the place round the pad: a top-level node, at each of its levels. */
interface Piece {
  name: string;
  box: Box3;
  nodes: (THREE.Object3D | undefined)[];
  /** The level its size on screen calls for, and the one drawn (the nearest finer one that has arrived). */
  wanted: number;
  shown: number;
  fade: Crossfade;
  /** The box round each of its meshes at the full level, made when first asked for (`Scenery.clearance`). */
  parts?: Box3[];
  /** Its own thresholds (`thresholdsOf`). */
  above: readonly number[];
}

/** The box round each mesh under `node`, in the scene's frame. */
function partsOf(node: THREE.Object3D): Box3[] {
  const boxes: Box3[] = [];
  node.updateWorldMatrix(true, true);
  node.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) boxes.push(new Box3().setFromObject(o));
  });
  return boxes;
}

/**
 * The place round the pad (Flight.surroundings) at its levels of detail, chosen piece by piece:
 * it spreads over half a kilometre, so one level for all of it would be the finest whenever any
 * of it is near, or a coarse one for the building in front of the walker. Each top-level node (a
 * building, the track, the poles) is a piece and is drawn at the level its own size on screen
 * calls for, measured to the nearest point of its box. Level 0 is the one the stage knows (picked,
 * walked on, lit, worked: a hidden node still answers a ray); the coarser levels are only drawn. A
 * piece that is driven (it carries a `vehicle`) is always drawn from level 0, which is the one that moves.
 */
export class Scenery {
  private readonly levels: (THREE.Object3D | undefined)[] = [];
  private readonly pieces: Piece[] = [];
  private every = false;
  /** For tests: draw every piece (or the pieces named) at this level whatever its size on screen (null: as it suits). */
  forced: number | Record<string, number> | null = null;

  constructor(full: THREE.Object3D) {
    this.levels[0] = full;
    full.updateMatrixWorld(true);
    for (const node of full.children) {
      let driven = false;
      node.traverse((o) => {
        if (o.userData.vehicle) driven = true;
      });
      if (driven) continue;
      const box = new Box3().setFromObject(node);
      if (!box.isEmpty())
        this.pieces.push({
          name: node.name,
          box,
          nodes: [node],
          wanted: 0,
          shown: 0,
          fade: new Crossfade(),
          above: thresholdsOf(node.userData.lod_above),
        });
    }
  }

  /** A coarser level has arrived: its pieces take their places; what has no piece at level 0 is not drawn from it. */
  add(level: number, object: THREE.Object3D): void {
    this.levels[level] = object;
    for (const node of object.children) {
      const piece = this.pieces.find((p) => p.name === node.name);
      if (piece) piece.nodes[level] = node;
      node.visible = false;
    }
    for (const piece of this.pieces) this.show(piece, false);
  }

  /** Every level, level 0 first: what a working door or lift moves at once. */
  get all(): THREE.Object3D[] {
    return this.levels.filter((o): o is THREE.Object3D => Boolean(o));
  }

  /** The coarser levels: drawn, never asked. */
  get coarser(): THREE.Object3D[] {
    return this.all.slice(1);
  }

  /**
   * How far the eye is from the nearest thing of the place, metres: to the box round each mesh of the full level, as
   * it stood when it arrived (0 inside one). For whoever sets the near plane: it must not be put beyond a building
   * the camera is passing, which the distance to what is being looked at knows nothing of.
   */
  clearance(eye: Vector3): number {
    let least = Number.POSITIVE_INFINITY;
    for (const piece of this.pieces) {
      if (piece.box.distanceToPoint(eye) >= least) continue;
      for (const box of (piece.parts ??= partsOf(piece.nodes[0]!))) least = Math.min(least, box.distanceToPoint(eye));
    }
    return least;
  }

  /** Each piece's level as drawn, for the diagnostics. */
  get shown(): { name: string; level: number }[] {
    return this.pieces.map((p) => ({ name: p.name, level: p.shown }));
  }

  /**
   * Pick each piece's level for an eye at `eye`, `scale` pixels per radian, `dt` seconds after the last time (a
   * change of level is a fade of that long; `dt` infinite, a cut). True if what is drawn changed, or is changing.
   */
  choose(eye: Vector3, scale: number, dt = Number.POSITIVE_INFINITY): boolean {
    let changed = false;
    for (const piece of this.pieces) {
      if (piece.fade.step(dt)) changed = true;
      const forced = typeof this.forced === 'number' ? this.forced : this.forced?.[piece.name];
      const wanted = forced ?? chooseLevel(scale / distanceTo(piece.box, eye), piece.wanted, piece.above);
      if (wanted === piece.wanted) continue;
      piece.wanted = wanted;
      changed = this.show(piece, Number.isFinite(dt) && forced === undefined) || changed;
    }
    return changed;
  }

  /** Draw every level at once (so all are built and sent to the GPU), as they are while fading too if `fading`, or go back to the ones that suit. */
  everyLevel(on: boolean, fading = false): void {
    this.every = on;
    for (const piece of this.pieces) {
      piece.fade.finish();
      const nodes = piece.nodes.filter((n): n is THREE.Object3D => Boolean(n));
      if (on && fading && nodes.length > 1) for (let i = 1; i < nodes.length; i++) piece.fade.warm(nodes[i - 1]!, nodes[i]!);
      this.show(piece, false);
    }
  }

  /** Show the piece's wanted level, or until it has arrived the nearest finer one that has; `fade`: over a moment. */
  private show(piece: Piece, fade: boolean): boolean {
    let level = piece.wanted;
    while (level > 0 && !piece.nodes[level]) level--;
    const from = piece.nodes[piece.shown],
      to = piece.nodes[level];
    const was = piece.shown;
    piece.shown = level;
    if (fade && !this.every && from && to && from !== to) {
      piece.fade.start(from, to);
      return true;
    }
    if (!this.every || was !== level) piece.fade.finish();
    let changed = false;
    piece.nodes.forEach((node, i) => {
      const visible = this.every || i === level;
      if (node && node.visible !== visible) {
        node.visible = visible;
        changed = true;
      }
    });
    return changed;
  }
}

/** How near the eye may be to a piece of a model before it is drawn in full whatever its thresholds say, metres. */
const NEAR = 9;

/**
 * One piece of a model that is drawn piece by piece: a top-level node, or a child of one whose children stand apart
 * (the pad's ground equipment is one node spread over the whole pad: taken as one piece it is always beside the walker).
 */
interface Bit extends Piece {
  /** The top-level node it is a child of, if it is one. */
  within: string | null;
  /** Something else moves it (a truck driven by hand, moved at level 0 alone): drawn in full from then on. */
  pinned: boolean;
}

/** The names of a node's children, as one string: two levels have the same pieces if these are the same. */
const childNames = (node: THREE.Object3D): string =>
  node.children
    .map((c) => c.name)
    .sort()
    .join('\n');

/**
 * One model on the stage: its levels of detail, all taken apart together. A model is drawn at one level (two while
 * one gives way to the other), or, if it is a place in itself (`pieces`: a pad a hundred and sixty metres across),
 * piece by piece as the place round it is (`Scenery`): each top-level node at the level its own size on screen
 * calls for, so what the walker stands beside is the finest there is and the far side of the pad is not. Then every
 * level's root is shown and the pieces' nodes are shown and hidden under them; level 0 is the one picked, walked on,
 * lit and worked, as it is for the place. Whoever hides or shows a node of such a model by hand must do it to
 * something inside a piece, never to a piece's own node: that node's `visible` is the choice of level.
 */
export class Staged {
  readonly group = new Group();
  readonly sphere = new Sphere();
  /** The box round it as placed: what its distance from the eye is measured to. */
  readonly box = new Box3();
  private readonly levels: (THREE.Object3D | undefined)[] = [];
  private readonly exploders: Exploder[] = [];
  private level = 0;
  private wanted = 0;
  private t = 0;
  private readonly parts: Part[];
  private readonly fade = new Crossfade();
  private every = false;
  /** What is being worked by hand, so that a level arriving later is posed the same (hold, loosen). */
  private readonly held = new Map<string, number>();
  private readonly loose = new Set<string>();
  /** Its pieces, if it is drawn piece by piece (null: at one level). */
  private readonly pieces: Bit[] | null = null;
  /** The top-level nodes whose children are the pieces, with those children's names (`childNames`). */
  private readonly spread = new Map<string, string>();
  /** Something has moved (the slider, a door, the model itself): the pieces' boxes are taken again before they are next asked. */
  private stale = false;
  /**
   * For tests: draw this level whatever the model's size on screen (null: as it suits). For a model drawn piece by
   * piece, a level for every piece, or one for each piece named (the rest as they suit).
   */
  forced: number | Record<string, number> | null = null;

  /** Its own thresholds (`thresholdsOf`). */
  above: readonly number[];

  constructor(full: THREE.Object3D, parts: Part[], pieces = false) {
    this.parts = parts;
    this.above = thresholdsOf(full.userData.lod_above);
    if (pieces) this.pieces = this.split(full);
    this.add(0, full);
  }

  /**
   * The pieces of a model: its top-level nodes, and in place of one whose children stand apart (none of them half
   * as big as the node), those children. What has nothing to draw (an empty, a light) is no piece and is left alone.
   */
  private split(full: THREE.Object3D): Bit[] {
    const bits: Bit[] = [];
    full.updateMatrixWorld(true);
    const bit = (node: THREE.Object3D, box: Box3, within: string | null): Bit => ({
      name: node.name,
      box,
      nodes: [node],
      wanted: 0,
      shown: 0,
      fade: new Crossfade(),
      above: thresholdsOf(node.userData.lod_above),
      within,
      pinned: false,
    });
    const size = new Vector3();
    for (const node of full.children) {
      const box = new Box3().setFromObject(node);
      if (box.isEmpty()) continue;
      const across = box.getSize(size).length();
      const inside = node.children.map((child) => ({ child, box: new Box3().setFromObject(child) })).filter((c) => !c.box.isEmpty());
      const names = new Set(node.children.map((c) => c.name));
      const apart =
        !(node as THREE.Mesh).isMesh &&
        inside.length >= 4 &&
        names.size === node.children.length &&
        inside.every((c) => c.box.getSize(size).length() < 0.5 * across);
      if (!apart) bits.push(bit(node, box, null));
      else {
        this.spread.set(node.name, childNames(node));
        for (const c of inside) bits.push(bit(c.child, c.box, node.name));
      }
    }
    return bits;
  }

  /** Call once it is placed, and when it has moved: the box is what its distance from the eye is measured to. */
  measure(): void {
    this.box.setFromObject(this.levels[0]!).getBoundingSphere(this.sphere);
    this.stale = true;
  }

  add(level: number, object: THREE.Object3D): void {
    this.levels[level] = object;
    this.group.add(object);
    markDriven(object, this.parts);
    const exploder = new Exploder(object, this.parts);
    for (const [node, reading] of this.held) exploder.hold(node, reading);
    for (const node of this.loose) exploder.loosen(node, true);
    exploder.set(this.t);
    this.exploders.push(exploder);
    const pieces = this.pieces;
    if (!pieces) {
      object.visible = this.every;
      this.show(this.wanted, false);
      return;
    }
    // piece by piece: the root is always shown, and under it only the pieces drawn from this level
    if (level > 0)
      for (const node of object.children) {
        const names = this.spread.get(node.name);
        if (names === undefined) {
          const piece = pieces.find((p) => p.within === null && p.name === node.name);
          if (piece) piece.nodes[level] = node;
          node.visible = false; // (what has no piece at level 0 is not drawn from here)
          continue;
        }
        // (a level built with other children under this node has no pieces to give: they are drawn from a finer one)
        const same = childNames(node) === names;
        for (const child of node.children) {
          const piece = same ? pieces.find((p) => p.within === node.name && p.name === child.name) : undefined;
          if (piece) piece.nodes[level] = child;
          child.visible = false;
        }
      }
    for (const piece of pieces) this.showPiece(piece, false);
    this.stale = true;
  }

  explode(t: number): void {
    this.t = t;
    for (const e of this.exploders) e.set(t);
    this.stale = true;
  }

  /** Hold one node's motions at a slider reading of its own, at every level of detail (null: release it), and show it. */
  hold(node: string, reading: number | null): void {
    if (reading === null) this.held.delete(node);
    else this.held.set(node, reading);
    for (const e of this.exploders) {
      e.hold(node, reading);
      e.set(this.t);
    }
    this.stale = true;
  }

  /** Let something else move one node at every level of detail (a vehicle driven by hand), or give it back to the slider. */
  loosen(node: string, on: boolean): void {
    if (on) this.loose.add(node);
    else this.loose.delete(node);
    for (const e of this.exploders) {
      e.loosen(node, on);
      e.set(this.t);
    }
    // what is driven is moved at level 0 alone, and is left where it was driven to: its piece is drawn in full from now on
    if (on && this.pieces)
      for (const piece of this.pieces) {
        const own = piece.nodes[0]!;
        if (piece.name === node || piece.within === node || own.getObjectByName(node)) piece.pinned = true;
      }
    this.stale = true;
  }

  /** Draw every level at once (so that all of them are built and sent to the GPU), as they are while fading too if `fading`, or go back to the one that suits. */
  everyLevel(on: boolean, fading = false): void {
    this.every = on;
    if (this.pieces) {
      for (const piece of this.pieces) {
        piece.fade.finish();
        const nodes = piece.nodes.filter((n): n is THREE.Object3D => Boolean(n));
        if (on && fading) for (let i = 1; i < nodes.length; i++) piece.fade.warm(nodes[i - 1]!, nodes[i]!);
        this.showPiece(piece, false);
      }
      return;
    }
    this.fade.finish();
    const levels = this.levels.filter((o): o is THREE.Object3D => Boolean(o));
    if (on && fading) for (let i = 1; i < levels.length; i++) this.fade.warm(levels[i - 1]!, levels[i]!);
    for (const o of levels) o.visible = on || o === this.shown;
    if (!on) this.show(this.wanted, false);
  }

  /** The model as built: level 0, whether or not it is the one being drawn. */
  get full(): THREE.Object3D {
    return this.levels[0]!;
  }

  /** The level being drawn (while one gives way to another, the one coming in); of a model drawn piece by piece, the finest any piece is drawn at. */
  get shownLevel(): number {
    return this.level;
  }

  /**
   * The level being drawn: the root that is picked, walked on and asked. For a model drawn piece by piece that is
   * level 0 whatever is drawn (a ray and the walker's solids do not ask whether a node is shown).
   */
  get shown(): THREE.Object3D {
    return this.levels[this.pieces ? 0 : this.level]!;
  }

  /** A part's node in the level being drawn (for a model drawn piece by piece: at level 0; see `drawn`). */
  part(node: string): THREE.Object3D | undefined {
    return this.shown.getObjectByName(node);
  }

  /** A part's node wherever it is drawn from: the one in the level on show, or for a model drawn piece by piece the one in every level (what is not drawn of them is hidden). */
  drawn(node: string): THREE.Object3D[] {
    const roots = this.pieces ? this.levels : [this.shown];
    return roots.flatMap((root) => root?.getObjectByName(node) ?? []);
  }

  /**
   * Pick the level for an eye at `eye`, `scale` pixels per radian (or the full one), `dt` seconds after the last
   * time: a change of level is a fade of that long (`dt` infinite, or `full`, a cut: a model being cut open has
   * its inside at once). True if what is drawn changed, or is changing.
   */
  choose(eye: Vector3, scale: number, full: boolean, dt = Number.POSITIVE_INFINITY): boolean {
    const pieces = this.pieces;
    if (!pieces) {
      const fading = this.fade.step(dt);
      const forced = typeof this.forced === 'number' ? this.forced : null;
      this.wanted = forced ?? (full ? 0 : chooseLevel(scale / distanceTo(this.box, eye), this.wanted, this.above));
      return this.show(this.wanted, Number.isFinite(dt) && !full && forced === null) || fading;
    }
    let changed = false;
    if (this.stale) {
      // (each piece's box as it stands now: the slider parts them, a door swings, the model was put somewhere)
      this.stale = false;
      this.levels[0]!.updateWorldMatrix(true, true);
      for (const piece of pieces) piece.box.setFromObject(piece.nodes[0]!);
    }
    let finest = Number.POSITIVE_INFINITY;
    for (const piece of pieces) {
      if (piece.fade.step(dt)) changed = true;
      if (full && piece.fade.running) piece.fade.finish();
      const forced = typeof this.forced === 'number' ? this.forced : this.forced?.[piece.name];
      const far = distanceTo(piece.box, eye);
      const wanted = forced ?? (full || piece.pinned || far < NEAR ? 0 : chooseLevel(scale / far, piece.wanted, piece.above));
      if (wanted !== piece.wanted) {
        piece.wanted = wanted;
        changed = this.showPiece(piece, Number.isFinite(dt) && !full && forced === undefined) || changed;
      }
      finest = Math.min(finest, piece.shown);
    }
    this.level = Number.isFinite(finest) ? finest : 0;
    return changed;
  }

  /** Show the wanted level, or until it has arrived the nearest finer one that has; `fade`: over a moment. */
  private show(wanted: number, fade: boolean): boolean {
    let level = wanted;
    while (level > 0 && !this.levels[level]) level--;
    if (this.every) {
      this.level = level;
      return false;
    }
    const from = this.levels[this.level]!,
      to = this.levels[level]!;
    if (level === this.level) {
      if (this.fade.running || to.visible) return false;
      to.visible = true; // (the first there is, as it arrives)
      return true;
    }
    this.level = level;
    if (fade && from.visible) this.fade.start(from, to);
    else {
      this.fade.finish();
      this.levels.forEach((o, i) => o && (o.visible = i === level));
    }
    return true;
  }

  /** Show a piece's wanted level, or until it has arrived the nearest finer one that has; `fade`: over a moment. */
  private showPiece(piece: Bit, fade: boolean): boolean {
    let level = piece.wanted;
    while (level > 0 && !piece.nodes[level]) level--;
    const from = piece.nodes[piece.shown],
      to = piece.nodes[level];
    const was = piece.shown;
    piece.shown = level;
    if (fade && !this.every && from && to && from !== to) {
      piece.fade.start(from, to);
      return true;
    }
    if (!this.every || was !== level) piece.fade.finish();
    let changed = false;
    piece.nodes.forEach((node, i) => {
      const visible = this.every || i === level;
      if (node && node.visible !== visible) {
        node.visible = visible;
        changed = true;
      }
    });
    return changed;
  }
}
