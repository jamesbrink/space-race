import * as THREE from 'three';

/**
 * On foot: the Sun's fine shadow map without everything in it drawn again for every step.
 *
 * The fine map is 8192 texels a side over the ground round the walker, and the walker's own shadow is in it: so
 * every frame he moved, three cleared it and drew every caster in reach again (it knows no other way), two to three
 * milliseconds for one figure's shadow. Here the casters that have not moved are kept: a second depth map of the
 * same size, `still`, holds everything but the figure. A frame in which only the figure has moved puts the still map's
 * texels back where the figure's shadow was (a copy of a few hundred texels square) and draws the figure on top.
 *
 * The map the scene reads is the same to the last bit. Depth alone is drawn, and the nearest depth at a texel is the
 * nearest whatever order things are drawn in: "everything but the figure, then the figure" leaves what "everything"
 * leaves, as long as each thing is drawn by the same call from the same light, which it is: both are three's own
 * shadow pass, steered (which casters by a layer and `castShadow`, which map by `shadow.map`, and its clear held back
 * for the figure's turn). The copy is depth to depth, texel for texel. Nothing about how the map is read is touched.
 *
 * When anything else has changed, the still map is drawn again in full. Nothing is taken on trust for that: three drew
 * everything every step, so whatever changed without asking for its shadow (a level of detail giving way to another as
 * the eye came nearer) was in the map a step later all the same, and must be still. So every frame the casters
 * themselves are read (`castersOf`): which are on show, where each stands, what shape it has. A change in any of it,
 * in the light or in the fit (`fitOf`), and the still map is drawn again. A caster whose shadow moves with the time
 * and not with anything that can be read (plants in the wind, a level of detail fading: each has a depth material of
 * its own) means there is nothing to keep, and the map is drawn whole as before. So is it whenever something has asked
 * for all the shadows (`others`, shadows.ts). In doubt it is drawn again, which is what was done every frame before.
 *
 * It costs a second map's memory (256 MiB at 8192), so it exists only while someone is on foot: made at the first
 * frame that wants it, and freed by the stage, with the fine map itself, half a minute after a walk ends (`release`).
 */

/** The layer the walked figure's meshes are on besides their own: the light sees only that layer when it is the figure's turn. */
export const FIGURE_LAYER = 9;

type Sun = THREE.DirectionalLight;
type Render = THREE.WebGLShadowMap['render'];

const corner = new THREE.Vector3();
const bits = new Float64Array(1);
const words = new Uint32Array(bits.buffer);
/** A caster on show that has a depth material of its own: its shadow may move with the time, so nothing is kept. */
const RESTLESS = -1;
const toMap = new THREE.Matrix4();

export class ShadowCache {
  /** For comparing the two: off, the map is drawn whole every time, as three draws it. They must be the same picture. */
  enabled = true;
  /** How often the map was drawn whole, and how often only the figure: for the diagnostics and the tests. */
  readonly tally = { whole: 0, figure: 0 };
  private readonly renderer: THREE.WebGLRenderer;
  private readonly sun: Sun;
  private readonly others: () => boolean;
  private readonly ask: () => void;
  private readonly original: Render;
  private walked: THREE.Object3D | null = null;
  private still: THREE.WebGLRenderTarget | null = null;
  /** What the still map was drawn for: the light's place and aim, its frustum, the map's size. Empty: it is not good. */
  private fit = '';
  /** Where the figure was drawn in the live map, in texels: min x, min y, max x, max y. */
  private readonly drawn = new THREE.Box2();
  private readonly region = new THREE.Box2();
  private readonly at = new THREE.Vector2();
  private readonly reaches = new WeakMap<THREE.SkinnedMesh, Float32Array>();

  /**
   * `others`: something besides the figure has asked for the shadows since the far map was last drawn (shadows.ts
   * `FarShadow.waiting`), or another light's map is to be drawn in this frame. `ask`: ask for the Sun's map to be
   * drawn again without that counting as something else having moved (`FarShadow.nearOnly`).
   */
  constructor(renderer: THREE.WebGLRenderer, sun: Sun, others: () => boolean, ask: () => void) {
    this.renderer = renderer;
    this.sun = sun;
    this.others = others;
    this.ask = ask;
    const map = renderer.shadowMap;
    this.original = map.render.bind(map);
    map.render = (lights, scene, camera) => this.render(lights, scene, camera);
  }

  /** The figure being walked as (its meshes are given the figure's layer), or null: nobody is on foot. */
  set figure(group: THREE.Object3D | null) {
    if (group === this.walked) return;
    this.walked?.traverse((o) => o.layers.disable(FIGURE_LAYER));
    this.walked = group;
    this.fit = '';
  }

  get figure(): THREE.Object3D | null {
    return this.walked;
  }

  /** Free the still map. */
  release(): void {
    this.still?.depthTexture?.dispose();
    this.still?.dispose();
    this.still = null;
    this.fit = '';
  }

  /** What a still map is good for: this light, here, aimed so, over this much ground, into a map this big. */
  private fitOf(): string {
    const { sun } = this;
    const c = sun.shadow.camera;
    const p = sun.position;
    const t = sun.target.position;
    return [
      p.x,
      p.y,
      p.z,
      t.x,
      t.y,
      t.z,
      c.left,
      c.right,
      c.top,
      c.bottom,
      c.near,
      c.far,
      sun.shadow.mapSize.x,
      sun.shadow.bias,
      sun.shadow.normalBias,
    ].join();
  }

  /**
   * The casters on show besides the figure, as one number: which they are, where each stands (its whole matrix), its
   * shape (which geometry, how often its vertices have been written, how many instances and how often those were).
   * `RESTLESS` when one of them has a depth material of its own. Read the way three's shadow pass walks the scene:
   * what is not visible is not gone into, and what the light cannot see from where the map is fitted is left out.
   */
  private castersOf(scene: THREE.Scene, figure: THREE.Object3D, camera: THREE.Camera): number {
    let h = 0x811c9dc5;
    let restless = false;
    // (what the light's own frustum leaves out three does not draw into the map: by the same test, on the same camera)
    this.sun.shadow.updateMatrices(this.sun);
    const reach = this.sun.shadow.getFrustum();
    const moved = scene.matrixWorld.elements;
    const mix = (n: number): void => {
      h = Math.imul(h ^ n, 0x01000193);
    };
    const walk = (o: THREE.Object3D): void => {
      if (restless || !o.visible || o === figure) return;
      const mesh = o as THREE.Mesh;
      if (
        o.castShadow &&
        (mesh.isMesh || (o as THREE.Line).isLine || (o as THREE.Points).isPoints) &&
        o.layers.test(camera.layers) &&
        (!o.frustumCulled || reach.intersectsObject(o))
      ) {
        const many = o as THREE.InstancedMesh;
        if (o.customDepthMaterial && (!many.isInstancedMesh || many.count > 0)) {
          restless = true;
          return;
        }
        mix(o.id);
        const e = o.matrixWorld.elements;
        for (let i = 0; i < 16; i++) {
          // (in the scene's own frame: for the draw the scene is moved by minus the eye, origin.ts, and putting that back
          // leaves the last bits of a double to chance, so a place is read to the micrometre)
          bits[0] = i >= 12 && i < 15 ? Math.round((e[i]! - moved[i]!) * 1e6) : e[i]!;
          mix(words[0]!);
          mix(words[1]!);
        }
        mix(mesh.geometry.id);
        const position = mesh.geometry.getAttribute('position') as THREE.BufferAttribute | THREE.InterleavedBufferAttribute | undefined;
        mix(position ? ('data' in position ? position.data.version : position.version) : 0);
        mix(mesh.geometry.drawRange.count === Infinity ? -1 : mesh.geometry.drawRange.count);
        if (many.isInstancedMesh) {
          mix(many.count);
          mix(many.instanceMatrix.version);
        }
      }
      const children = o.children;
      for (let i = 0; i < children.length; i++) walk(children[i]!);
    };
    walk(scene);
    return restless ? RESTLESS : h >>> 0;
  }

  private render(lights: THREE.Light[], scene: THREE.Scene, camera: THREE.Camera): void {
    const map = this.renderer.shadowMap;
    const shadow = this.sun.shadow;
    const figure = this.walked;
    const live = shadow.map;
    const due = map.enabled && map.needsUpdate && lights.includes(this.sun) && (shadow.autoUpdate || shadow.needsUpdate);
    if (!due) {
      this.original(lights, scene, camera); // (nothing of the Sun's to draw: three's business)
      return;
    }
    if (!this.enabled || !figure || !live || this.others()) {
      // drawn whole, three's way: whatever the still map held is no longer known to be what is there
      this.fit = '';
      this.original(lights, scene, camera);
      return;
    }
    const casters = this.castersOf(scene, figure, camera);
    if (casters === RESTLESS) {
      this.fit = '';
      this.original(lights, scene, camera);
      return;
    }
    const fit = `${this.fitOf()},${casters}`;
    if (!this.still || this.still.width !== live.width) {
      this.release();
      this.still = new THREE.WebGLRenderTarget(live.width, live.height, {
        format: THREE.RedFormat,
        type: THREE.UnsignedByteType,
        generateMipmaps: false,
      });
      this.still.texture.name = 'sun.stillShadowMapUnread';
      const depth = new THREE.DepthTexture(live.width, live.height, THREE.UnsignedIntType);
      depth.name = 'sun.stillShadowMap';
      depth.format = THREE.DepthFormat;
      depth.minFilter = depth.magFilter = THREE.NearestFilter;
      this.still.depthTexture = depth;
    }
    const still = this.still;
    const state = this.renderer.state;
    if (fit !== this.fit) {
      // everything but the figure, into the still map; then all of it across, and the figure on top
      const casting: THREE.Object3D[] = [];
      figure.traverse((o) => {
        if (o.castShadow) {
          o.castShadow = false;
          casting.push(o);
        }
      });
      shadow.map = still;
      try {
        this.original(lights, scene, camera);
      } finally {
        shadow.map = live;
        for (const o of casting) o.castShadow = true;
      }
      state.setScissorTest(false);
      this.renderer.copyTextureToTexture(still.depthTexture!, live.depthTexture!);
      this.fit = fit;
      this.tally.whole++;
      this.ask();
    } else {
      // where the figure's shadow was, the still map's texels again
      const was = this.drawn;
      if (!was.isEmpty()) {
        state.setScissorTest(false);
        this.renderer.copyTextureToTexture(still.depthTexture!, live.depthTexture!, was, this.at.copy(was.min));
      }
      this.tally.figure++;
    }
    // the figure's turn: the light sees its layer alone, and what is in the map is left there
    figure.traverse((o) => o.layers.enable(FIGURE_LAYER));
    const layers = shadow.camera.layers.mask;
    const clear = this.renderer.clear;
    shadow.camera.layers.set(FIGURE_LAYER);
    this.renderer.clear = () => {};
    try {
      this.original(lights, scene, camera);
    } finally {
      this.renderer.clear = clear;
      shadow.camera.layers.mask = layers;
    }
    this.cover(figure, shadow);
  }

  /**
   * How far a skinned mesh reaches from each of its bones: the farthest of the vertices a bone has any hold on, from
   * that bone, as bound. Wherever the bones go, a vertex is drawn at a weighted mean of where each of its bones would
   * carry it alone, and each of those is within this reach of its bone: so the spheres of these radii round the bones
   * hold the mesh in every pose. Measured once for a mesh.
   */
  private reachOf(mesh: THREE.SkinnedMesh): Float32Array {
    let reach = this.reaches.get(mesh);
    if (reach) return reach;
    const { skeleton, geometry, bindMatrix } = mesh;
    reach = new Float32Array(skeleton.bones.length);
    const position = geometry.getAttribute('position');
    const index = geometry.getAttribute('skinIndex');
    const weight = geometry.getAttribute('skinWeight');
    const bound = new THREE.Vector3();
    for (let i = 0; position && index && weight && i < position.count; i++) {
      bound.fromBufferAttribute(position, i).applyMatrix4(bindMatrix);
      for (let k = 0; k < 4; k++) {
        if (!(weight.getComponent(i, k) > 0)) continue;
        const b = index.getComponent(i, k);
        const far = corner.copy(bound).applyMatrix4(skeleton.boneInverses[b]!).length();
        if (far > reach[b]!) reach[b] = far;
      }
    }
    this.reaches.set(mesh, reach);
    return reach;
  }

  /**
   * Note the texels the figure has just been drawn over: the box round it as the light sees it, and two texels more.
   * A box that is too big costs a few texels copied; one too small leaves a shadow behind, so each piece is taken by
   * what cannot be wrong: a rigid mesh by the corners of its bounds, one reshaped every frame by its vertices, a skinned
   * one by the spheres round its bones (`reachOf`).
   */
  private cover(figure: THREE.Object3D, shadow: THREE.LightShadow): void {
    const size = shadow.mapSize.x;
    const box = this.region.makeEmpty();
    const lens = shadow.camera as THREE.OrthographicCamera;
    // (the light's camera is where three has just put it; a mesh's world matrix is the frame's)
    toMap.multiplyMatrices(lens.projectionMatrix, lens.matrixWorldInverse);
    const take = (x: number, y: number, z: number, world: THREE.Matrix4 | null, round = 0): void => {
      corner.set(x, y, z);
      if (world) corner.applyMatrix4(world);
      corner.applyMatrix4(toMap);
      const u = (corner.x * 0.5 + 0.5) * size;
      const v = (corner.y * 0.5 + 0.5) * size;
      box.expandByPoint(this.at.set(u - round, v - round));
      box.expandByPoint(this.at.set(u + round, v + round));
    };
    // (texels to a metre, the finer way: the Sun's lens is a box, so a sphere is a disc of its own radius in the map)
    const texels = (size * lens.zoom) / Math.min(lens.right - lens.left, lens.top - lens.bottom);
    const walk = (o: THREE.Object3D): void => {
      if (!o.visible) return; // (three's shadow pass does not go into what is not on show)
      for (const child of o.children) walk(child);
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || !mesh.castShadow) return;
      const geometry = mesh.geometry;
      const position = geometry.getAttribute('position');
      if (!position) return;
      const skinned = o as THREE.SkinnedMesh;
      if (skinned.isSkinnedMesh) {
        const reach = this.reachOf(skinned);
        const bones = skinned.skeleton.bones;
        for (let b = 0; b < bones.length; b++) {
          if (!reach[b]) continue;
          const world = bones[b]!.matrixWorld;
          const e = world.elements;
          take(e[12]!, e[13]!, e[14]!, null, reach[b]! * world.getMaxScaleOnAxis() * texels);
        }
        return;
      }
      if (!mesh.frustumCulled) {
        // reshaped every frame (a hose): its bounds are not kept, so its vertices are asked
        for (let i = 0; i < position.count; i++) take(position.getX(i), position.getY(i), position.getZ(i), mesh.matrixWorld);
        return;
      }
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      const { min, max } = geometry.boundingBox!;
      for (let k = 0; k < 8; k++) take(k & 1 ? max.x : min.x, k & 2 ? max.y : min.y, k & 4 ? max.z : min.z, mesh.matrixWorld);
    };
    walk(figure);
    if (box.isEmpty()) return void this.drawn.makeEmpty();
    this.drawn.min.set(Math.max(0, Math.floor(box.min.x) - 2), Math.max(0, Math.floor(box.min.y) - 2));
    this.drawn.max.set(Math.min(size, Math.ceil(box.max.x) + 2), Math.min(size, Math.ceil(box.max.y) + 2));
    if (this.drawn.max.x <= this.drawn.min.x || this.drawn.max.y <= this.drawn.min.y) this.drawn.makeEmpty();
  }
}
