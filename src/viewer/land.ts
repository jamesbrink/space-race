import * as THREE from 'three';
import { FIELD } from './field';
import { onlyAsItself } from './flora';
import { NOISE } from './space';

/**
 * The ground of a place, from its parameters: one mesh from under the walker's feet to the
 * horizon, painted from maps of what grows where. Nothing here knows which place it is; a site
 * (cape.ts) supplies a `LandSpec`.
 *
 * **What covers the ground** is the site's GLSL, `coverA` and `coverB`, evaluated once on the GPU
 * into two maps: a detailed one round the site and a coarse one to the horizon. The terrain's
 * shader reads the maps, and the plants (flora.ts) read the detailed one back: what is painted
 * green has plants on it and nothing else does, from one definition.
 *
 * **How high the ground is** is the site's `relief`, written twice (JavaScript and GLSL, with the
 * integer noise of field.ts so the two agree): the mesh is lifted by it on the GPU, and the
 * walker and the plants stand on it.
 *
 * **The mesh** follows the eye: a quadtree of square patches, each a 16 by 16 grid, half a metre
 * a cell within 40 m of the eye and twice as coarse every time the distance doubles, out to 64 m
 * cells. Where a finer patch meets a coarser one the finer one's in-between vertices have slid
 * onto the coarser grid by the time they get there (continuous distance-dependent level of
 * detail, Strugar 2009), so there are no cracks and no pops. Depth never has to interpolate
 * across a triangle more than 64 m long (AGENTS.md, No flicker).
 *
 * **Thickets** are the ground lifted: where the cover map says woody plants close their canopy,
 * the mesh rises into a lumpy roof of crowns as it gets further from the eye, so the scrub on the
 * horizon stands up as a band and not a painted line, at no cost per plant. Near the eye it is
 * flat ground and the plants stand on it.
 */

/** Linear colours of the ground's materials. */
export interface Palette {
  /** Bare sand, its pale and its dark. */
  sand: THREE.Color;
  sandDark: THREE.Color;
  /** Low herbs and grasses: cured and still green. */
  herbDry: THREE.Color;
  herbGreen: THREE.Color;
  /** Fallen leaves and humus under woody plants. */
  litter: THREE.Color;
  /** A canopy of leaves in shade and lit, and the second kind of leaf mixed into it. */
  leaf: THREE.Color;
  leafLit: THREE.Color;
  leafOther: THREE.Color;
}

export interface LandSpec {
  /** Half the side of the detailed map, metres, and its texels along a side. */
  near: number;
  texels: number;
  /** Half the side of all the land, metres. */
  far: number;
  /**
   * GLSL defining `vec4 coverA(vec2 p)` (woody cover, herb cover, bare ground, zone) and
   * `vec4 coverB(vec2 p)` (worked ground, wet, loose sand, spare), each 0 to 1, at `p` metres in the
   * land's frame. `zone` is the site's own ordering of its plant communities. May use NOISE, FIELD
   * and anything in `shared`. Run once, into the maps.
   */
  cover: string;
  /** GLSL put in both the cover's bake and the terrain's shader: functions both need. */
  shared: string;
  /** Height of the ground above the land's base level at (x, z) in its frame, metres; and the same in GLSL as `float relief(vec2 p)`. */
  relief: (x: number, z: number) => number;
  reliefGlsl: string;
  /** The level of open water (the sea), metres above the land's base level, or null: where the ground is lower the mesh is the water's surface. */
  sea?: number | null;
  /** GLSL `float lift(vec2 p, float ground, float far)`: the water's swell above its level at p, `far` metres from the eye. Uniform uTime is the time. */
  lift?: string;
  /** GLSL `float canopyHeight(vec4 A, vec4 B)`: metres a closed stand of woody plants reaches here. */
  canopy: string;
  /** Size of one crown in a closed canopy, metres. */
  crown: number;
  /**
   * GLSL `void paint(vec2 p, vec4 A, vec4 B, inout Ground g)`: the site's own marks laid over the
   * ground once it is painted (roads, water). Its uniforms are `uniforms`.
   */
  paint: string;
  uniforms?: Record<string, THREE.IUniform>;
  palette: Palette;
}

/**
 * What lies past the land's edge (globe.ts), for the land to hand over to across its last stretch:
 * it bends down onto that surface and takes its colours, so that where the two overlap they are
 * one surface. `vertex` is GLSL defining `float beyondHeight(vec3 p)`, the height in the scene's
 * frame of that surface under a point p of the scene; `fragment` defines `vec3 beyondAlbedo(vec3 p,
 * out float rough)`, its colour and roughness there.
 */
export interface Beyond {
  vertex: string;
  fragment: string;
  uniforms: Record<string, THREE.IUniform>;
}

/** Cells along a patch's side. */
const GRID = 16;
/** The finest cell, metres. */
const CELL = 0.5;
/** Levels of detail: cells of 0.5 m to 64 m. */
const LEVELS = 8;
/** Within this far of the eye (metres) the finest level is used; each level's reach doubles. */
const RANGE0 = 40;
const RANGES = Array.from({ length: LEVELS }, (_, k) => RANGE0 * 2 ** k);
/** Where in its band a level starts to slide onto the next one's grid. */
const MORPH = 0.72;
/** The canopy rises from nothing to its full height between these distances from the eye, metres. */
const SHELL: [number, number] = [18, 55];
/**
 * Heights of the eye over the ground, metres, between which the whole of the land takes the colours
 * of what lies beyond it (`Beyond`), all but its made ground: from high up its own paint would
 * show as a square of another tone set in the globe, and the detail it carries is under a pixel.
 */
const LIFT: [number, number] = [3000, 20000];
/** The lowest and highest the land's mesh ever is, metres from its base level, with room to spare: the box a patch is culled by. */
const DEEPEST = -120;
const TALLEST = 30;

const vec3 = (c: THREE.Color) => `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;

/** GLSL to read the two maps at a point, the detailed one blended into the coarse one at its edge. */
const MAPS = /* glsl */ `
  uniform sampler2D uNearA, uNearB, uFarA, uFarB;
  uniform float uNearSize, uFarSize;
  float nearWeight(vec2 p) {
    vec2 q = abs(p / uNearSize);
    return 1.0 - smoothstep(0.9, 0.985, max(q.x, q.y));
  }
  vec4 landA(vec2 p) {
    return mix(textureLod(uFarA, p / (2.0 * uFarSize) + 0.5, 0.0), textureLod(uNearA, p / (2.0 * uNearSize) + 0.5, 0.0), nearWeight(p));
  }
  vec4 landB(vec2 p) {
    return mix(textureLod(uFarB, p / (2.0 * uFarSize) + 0.5, 0.0), textureLod(uNearB, p / (2.0 * uNearSize) + 0.5, 0.0), nearWeight(p));
  }
  // in the fragment shader, filtered for the pixel's footprint
  vec4 landAf(vec2 p) {
    return mix(texture(uFarA, p / (2.0 * uFarSize) + 0.5), texture(uNearA, p / (2.0 * uNearSize) + 0.5), nearWeight(p));
  }
  vec4 landBf(vec2 p) {
    return mix(texture(uFarB, p / (2.0 * uFarSize) + 0.5), texture(uNearB, p / (2.0 * uNearSize) + 0.5), nearWeight(p));
  }`;

/** GLSL: the domes of a closed canopy, one crown to a cell of `size` metres, each a little off its middle: 0 between them, 1 on top. */
const crowns = (size: number) => /* glsl */ `
  float crowns(vec2 p) {
    vec2 c = p / ${size.toFixed(2)};
    vec2 i = floor(c);
    float top = 0.0;
    for (int y = -1; y <= 1; y++)
      for (int x = -1; x <= 1; x++) {
        ivec2 n = ivec2(i) + ivec2(x, y);
        vec2 o = vec2(n) + vec2(hash2(n, 71), hash2(n, 72)) * 0.8 + 0.1;
        float r = 0.55 + 0.4 * hash2(n, 73);
        float d = length(c - o) / r;
        top = max(top, sqrt(max(0.0, 1.0 - d * d)) * (0.75 + 0.25 * hash2(n, 74)));
      }
    return top;
  }`;

/** Render the site's cover into a square map `half` metres each way of the origin. */
function bake(renderer: THREE.WebGLRenderer, spec: LandSpec, which: 'A' | 'B', half: number, texels: number): THREE.WebGLRenderTarget {
  const target = new THREE.WebGLRenderTarget(texels, texels, {
    depthBuffer: false,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
    magFilter: THREE.LinearFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
  });
  target.texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const material = new THREE.ShaderMaterial({
    uniforms: { uHalf: { value: half }, uTexels: { value: texels }, ...spec.uniforms },
    vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: /* glsl */ `
      uniform float uHalf, uTexels;
      ${NOISE}
      ${FIELD}
      ${spec.shared}
      ${spec.reliefGlsl}
      ${spec.cover}
      void main() {
        vec2 p = (gl_FragCoord.xy / uTexels * 2.0 - 1.0) * uHalf;
        gl_FragColor = clamp(cover${which}(p), 0.0, 1.0);
      }`,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  });
  const scene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.BufferGeometry(), material);
  quad.geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  quad.frustumCulled = false;
  scene.add(quad);
  const before = renderer.getRenderTarget();
  renderer.setRenderTarget(target);
  renderer.render(scene, new THREE.OrthographicCamera());
  renderer.setRenderTarget(before);
  material.dispose();
  quad.geometry.dispose();
  return target;
}

/** One patch's grid: (GRID + 1)² vertices in grid units, shared by every patch. */
function patchGeometry(): THREE.InstancedBufferGeometry {
  const geometry = new THREE.InstancedBufferGeometry();
  const positions: number[] = [];
  for (let j = 0; j <= GRID; j++) for (let i = 0; i <= GRID; i++) positions.push(i, 0, j);
  const index: number[] = [];
  for (let j = 0; j < GRID; j++)
    for (let i = 0; i < GRID; i++) {
      const a = j * (GRID + 1) + i,
        b = a + 1,
        c = a + GRID + 1,
        d = c + 1;
      // the diagonal alternates, so a morphing grid folds evenly
      if ((i + j) % 2) index.push(a, c, b, b, c, d);
      else index.push(a, c, d, a, d, b);
    }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  return geometry;
}

export class Land {
  readonly mesh: THREE.Mesh;
  /** The cover maps, for anything else that wants to read them on the GPU. */
  readonly uniforms: Record<string, THREE.IUniform>;
  private readonly spec: LandSpec;
  /** The detailed map's first channels, read back: woody, herb, bare, zone as bytes. */
  readonly coverBytes: Uint8Array;
  private readonly patches: THREE.InstancedBufferAttribute;
  private readonly geometry: THREE.InstancedBufferGeometry;
  private readonly eye = new THREE.Vector4();
  /** The patches chosen round the eye (x, z, cell, level each), and how many: `view` draws those of them in sight. */
  private readonly chosen = new Float32Array(4 * 4096);
  private chosenCount = 0;
  private readonly seen = new THREE.Matrix4();
  private readonly viewed = new THREE.Matrix4();
  private readonly frustum = new THREE.Frustum();
  private readonly box = new THREE.Box3();
  private readonly time = { value: 0 };
  private readonly cel = { value: 0 };
  /** The eye as `attend` last had it. */
  private readonly attended = new THREE.Vector3(Number.NaN, 0, 0);
  private roots: [number, number][] = [];
  private rootLevel = LEVELS - 1;
  /** Half the side of the square the land covers, metres: its patches tile out to here, a little past `LandSpec.far`. */
  readonly extent: number;
  private beyond: (Beyond & { from: { value: THREE.Vector2 } }) | null = null;

  /** `baseY`: the height the land's relief is measured from, in the mesh's parent; `turn`: radians about the vertical from the land's frame to its parent's. */
  constructor(renderer: THREE.WebGLRenderer, spec: LandSpec, baseY: number, turn: number) {
    this.spec = spec;
    const nearA = bake(renderer, spec, 'A', spec.near, spec.texels);
    const nearB = bake(renderer, spec, 'B', spec.near, spec.texels);
    const farTexels = 512;
    const farA = bake(renderer, spec, 'A', spec.far, farTexels);
    const farB = bake(renderer, spec, 'B', spec.far, farTexels);
    this.coverBytes = new Uint8Array(spec.texels * spec.texels * 4);
    renderer.readRenderTargetPixels(nearA, 0, 0, spec.texels, spec.texels, this.coverBytes);

    this.uniforms = {
      uNearA: { value: nearA.texture },
      uNearB: { value: nearB.texture },
      uFarA: { value: farA.texture },
      uFarB: { value: farB.texture },
      uNearSize: { value: spec.near },
      uFarSize: { value: spec.far },
    };

    const top = CELL * GRID * 2 ** this.rootLevel * 2; // a root's side
    const n = Math.ceil(spec.far / top);
    this.extent = n * top;
    for (let i = -n; i < n; i++) for (let j = -n; j < n; j++) this.roots.push([i * top, j * top]);

    this.geometry = patchGeometry();
    this.patches = new THREE.InstancedBufferAttribute(new Float32Array(4 * 4096), 4);
    this.patches.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('aPatch', this.patches);
    this.geometry.instanceCount = 0;

    const material = new THREE.MeshStandardMaterial({ name: 'land', roughness: 1, metalness: 0 });
    this.shade(material);
    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.frustumCulled = false; // the patches are placed in the shader; there is always some ground in view
    this.mesh.renderOrder = 1; // after the models and the plants: the ground they hide is never shaded
    this.mesh.position.y = baseY;
    this.mesh.rotation.y = turn;
    this.mesh.raycast = (raycaster, hits) => this.raycast(raycaster, hits);
    onlyAsItself(this.mesh);
    this.mesh.userData.land = this; // for the debug handle: sr.stage.setting.floor.userData.land
    this.select(0, 30, 0);
  }

  /**
   * Hand over to what lies beyond (`Beyond`) between `from` and `to` metres from the middle (along
   * the land's own axes: its edge is a square): from `to` out the land is that surface. Before the
   * land is first drawn.
   */
  meet(beyond: Beyond, from: number, to: number): void {
    this.beyond = { ...beyond, from: { value: new THREE.Vector2(from, to) } };
    (this.mesh.material as THREE.Material).needsUpdate = true;
  }

  /** Height of the ground above the land's base level at a point in its frame, metres. */
  heightAt(x: number, z: number): number {
    return this.spec.relief(x, z);
  }

  /** What covers the ground at a point in the land's frame (the detailed map, as the GPU filters it): woody, herb, bare, zone, each 0 to 1. Outside the map: nothing. */
  coverAt(x: number, z: number, out: Float32Array | number[]): boolean {
    const t = this.spec.texels;
    const fx = ((x / this.spec.near) * 0.5 + 0.5) * t - 0.5;
    const fz = ((z / this.spec.near) * 0.5 + 0.5) * t - 0.5;
    if (fx < 0 || fz < 0 || fx >= t - 1 || fz >= t - 1) return false;
    const i = Math.floor(fx),
      j = Math.floor(fz);
    const u = fx - i,
      v = fz - j;
    const b = this.coverBytes;
    const at = (j * t + i) * 4,
      up = at + t * 4;
    for (let c = 0; c < 4; c++) {
      const a = b[at + c]! * (1 - u) + b[at + 4 + c]! * u;
      const d = b[up + c]! * (1 - u) + b[up + 4 + c]! * u;
      out[c] = (a * (1 - v) + d * v) / 255;
    }
    return true;
  }

  /** The eye, in the land's frame: the patches are chosen round it. */
  attend(eye: THREE.Vector3): void {
    const was = this.attended;
    if (eye.x === was.x && eye.y === was.y && eye.z === was.z) return; // a still eye: the ground under it is not asked for again
    was.set(eye.x, eye.y, eye.z);
    this.select(eye.x, eye.y - this.spec.relief(eye.x, eye.z), eye.z);
  }

  tick(dt: number): void {
    this.time.value += dt;
  }

  /** The cel look's flat land, or the real one. */
  simplify(on: boolean): void {
    this.cel.value = Number(on);
  }

  /**
   * Choose the patches for an eye at (x, z), `height` above the ground. A patch at level k is
   * used where it lies within RANGES[k] of the eye and not within RANGES[k - 1]; where only some
   * of a patch is that near, its quarters are used at the finer level and the rest at its own.
   * Distances are measured with the eye's height in them, as the shader measures its morph.
   */
  private select(x: number, height: number, z: number): void {
    const h = Math.max(0, height);
    if (this.chosenCount > 0 && x === this.eye.x && h === this.eye.y && z === this.eye.z) return; // a still eye has what it had
    this.eye.set(x, h, z, 0);
    const h2 = this.eye.y * this.eye.y;
    const data = this.chosen;
    let count = 0;
    const add = (px: number, pz: number, level: number) => {
      if (count >= 4096) return;
      const at = count++ * 4;
      data[at] = px;
      data[at + 1] = pz;
      data[at + 2] = CELL * 2 ** level;
      data[at + 3] = level;
    };
    // squared distance from the eye to a square's nearest point, with the eye's height
    const near = (px: number, pz: number, side: number) => {
      const dx = Math.max(px - x, 0, x - px - side),
        dz = Math.max(pz - z, 0, z - pz - side);
      return dx * dx + dz * dz + h2;
    };
    // a node of `level` whose side is two patches of that level; it covers its four quarters
    const visit = (px: number, pz: number, level: number) => {
      const quarter = CELL * GRID * 2 ** level;
      if (level === 0 || near(px, pz, 2 * quarter) > RANGES[level - 1]! ** 2) {
        add(px, pz, level);
        add(px + quarter, pz, level);
        add(px, pz + quarter, level);
        add(px + quarter, pz + quarter, level);
        return;
      }
      part(px, pz, quarter, level);
      part(px + quarter, pz, quarter, level);
      part(px, pz + quarter, quarter, level);
      part(px + quarter, pz + quarter, quarter, level);
    };
    // a quarter near enough for the next level down is that level's node; the rest stays at this one
    const part = (qx: number, qz: number, quarter: number, level: number) => {
      if (near(qx, qz, quarter) <= RANGES[level - 1]! ** 2) visit(qx, qz, level - 1);
      else add(qx, qz, level);
    };
    for (const [rx, rz] of this.roots) visit(rx, rz, this.rootLevel);
    this.chosenCount = count;
    this.viewed.set(Number.NaN, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0); // what is drawn of them is owed again
  }

  /**
   * Of the patches chosen round the eye, draw the ones `camera` can see: two thirds of them are behind it or off to
   * the side, and each costs its vertices the relief and the roof. Called with the camera as it will draw, just before
   * it does, so a turn never shows a patch late. Each patch is tested as a box as tall as anything the ground does
   * (the sea bed and the curve it bends onto below, the tallest canopy above) and a cell wider all round.
   */
  view(camera: THREE.Camera): void {
    this.mesh.updateMatrixWorld();
    const m = this.seen.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse).multiply(this.mesh.matrixWorld);
    if (m.equals(this.viewed)) return;
    this.viewed.copy(m);
    this.frustum.setFromProjectionMatrix(m);
    const from = this.chosen;
    const to = this.patches.array as Float32Array;
    const box = this.box;
    let count = 0;
    for (let i = 0; i < this.chosenCount; i++) {
      const at = i * 4;
      const cell = from[at + 2]!;
      const side = cell * GRID;
      box.min.set(from[at]! - cell, DEEPEST, from[at + 1]! - cell);
      box.max.set(from[at]! + side + cell, TALLEST, from[at + 1]! + side + cell);
      if (!this.frustum.intersectsBox(box)) continue;
      to[count * 4] = from[at]!;
      to[count * 4 + 1] = from[at + 1]!;
      to[count * 4 + 2] = cell;
      to[count * 4 + 3] = from[at + 3]!;
      count++;
    }
    this.geometry.instanceCount = count;
    this.patches.clearUpdateRanges();
    this.patches.addUpdateRange(0, count * 4);
    this.patches.needsUpdate = true;
  }

  /** The ground under a ray, by stepping along it: the mesh is placed by the shader, so its triangles cannot be asked. */
  private raycast(raycaster: THREE.Raycaster, hits: THREE.Intersection[]): void {
    const inverse = new THREE.Matrix4().copy(this.mesh.matrixWorld).invert();
    const ray = raycaster.ray.clone().applyMatrix4(inverse);
    if (ray.direction.y >= -1e-4) return;
    // the plane of the base level, then the relief there, a few times over: the land is gentle
    let t = -ray.origin.y / ray.direction.y;
    const p = new THREE.Vector3();
    for (let i = 0; i < 4; i++) {
      ray.at(t, p);
      t = (this.spec.relief(p.x, p.z) - ray.origin.y) / ray.direction.y;
    }
    if (t < 0) return;
    ray.at(t, p);
    const e = 0.5;
    const normal = new THREE.Vector3(
      this.spec.relief(p.x - e, p.z) - this.spec.relief(p.x + e, p.z),
      2 * e,
      this.spec.relief(p.x, p.z - e) - this.spec.relief(p.x, p.z + e),
    ).normalize();
    const point = p.clone().applyMatrix4(this.mesh.matrixWorld);
    const distance = raycaster.ray.origin.distanceTo(point);
    if (distance < raycaster.near || distance > raycaster.far) return;
    hits.push({ distance, point, object: this.mesh, face: { a: 0, b: 0, c: 0, normal, materialIndex: 0 } });
  }

  private shade(material: THREE.MeshStandardMaterial): void {
    const spec = this.spec;
    const p = spec.palette;
    const uniforms = {
      ...this.uniforms,
      ...spec.uniforms,
      uEye: { value: this.eye },
      uRanges: { value: RANGES },
      uTime: this.time,
      uCel: this.cel,
    };
    material.onBeforeCompile = (shader) => {
      const beyond = this.beyond;
      Object.assign(shader.uniforms, uniforms, beyond ? { ...beyond.uniforms, uBeyond: beyond.from } : {});
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          /* glsl */ `#include <common>
          attribute vec4 aPatch;          // (x, z) of its corner in the land's frame, its cell in metres, its level
          uniform vec4 uEye;              // the eye in the land's frame: x, height over the ground, z
          uniform float uRanges[${LEVELS}];
          uniform float uTime;
          varying vec3 vLand;             // this point in the land's frame
          varying float vCanopy;          // how far the thicket's roof stands above the ground here, metres
          varying float vCrown;           // 0 between crowns, 1 on their tops
          ${beyond ? `#define LAND_BEYOND\n uniform vec2 uBeyond; varying float vHanded; varying vec3 vBeyond;\n${beyond.vertex}` : ''}
          ${MAPS}
          ${NOISE}
          ${FIELD}
          ${spec.shared}
          ${spec.reliefGlsl}
          ${spec.canopy}
          ${crowns(spec.crown)}
          // the thicket's roof above the ground at p, which is far metres from the eye on a grid of cell metres
          float roof(vec2 p, float far, float cell, out float crown) {
            vec4 A = landA(p);
            float stand = canopyHeight(A, landB(p)) * smoothstep(0.5, 0.75, A.r);   // inside what the pixels paint as thicket, so a coarse cell's slope is never painted as ground
            crown = mix(crowns(p), 0.6, smoothstep(0.4, 1.2, cell / ${spec.crown.toFixed(2)}));   // crowns finer than the grid would only alias
            return stand * (0.5 + 0.5 * crown) * smoothstep(${SHELL[0].toFixed(1)}, ${SHELL[1].toFixed(1)}, far);
          }
          ${spec.lift ?? 'float lift(vec2 p, float ground, float far) { return 0.0; }'}
          // the top of the ground or of the water over it, and the water's swell
          float surface(vec2 p, float ground, float far) {
            ${spec.sea === undefined || spec.sea === null ? 'return ground;' : `return max(ground, ${spec.sea.toFixed(3)}) + lift(p, ground, far);`}
          }`,
        )
        .replace(
          '#include <beginnormal_vertex>',
          /* glsl */ `
          vec2 grid = position.xz;
          float cell = aPatch.z;
          int level = int(aPatch.w + 0.5);
          vec2 at = aPatch.xy + grid * cell;
          // slide this patch's in-between vertices onto the next level's grid as it nears the end of its band
          float reach = uRanges[level], from = level > 0 ? uRanges[level - 1] : 0.0;
          float far = length(vec3(at.x - uEye.x, uEye.y, at.y - uEye.z));
          float morph = clamp((far - mix(from, reach, ${MORPH})) / (reach - mix(from, reach, ${MORPH})), 0.0, 1.0);
          grid -= (grid - 2.0 * floor(grid * 0.5)) * morph;
          at = aPatch.xy + grid * cell;
          far = length(vec3(at.x - uEye.x, uEye.y, at.y - uEye.z));
          float span = cell * (1.0 + morph);
          float crown, c1, c2;
          float lift = roof(at, far, span, crown);
          float ground = relief(at);
          float top = surface(at, ground, far) + lift;
          vec2 ax = at + vec2(span, 0.0), az = at + vec2(0.0, span);
          float hx = surface(ax, relief(ax), far) + roof(ax, far, span, c1);
          float hz = surface(az, relief(az), far) + roof(az, far, span, c2);
          vec3 objectNormal = normalize(vec3(top - hx, span, top - hz));
          vLand = vec3(at.x, ground, at.y);
          vCanopy = lift;
          vCrown = crown;
          vec3 landPoint = vec3(at.x, top, at.y);
          #ifdef LAND_BEYOND
          {
            // the last stretch: down onto what lies beyond, and level with it
            vec4 base = modelMatrix * vec4(at.x, 0.0, at.y, 1.0);
            vBeyond = base.xyz + uOrigin;   // in the scene's frame, at the land's base level
            vHanded = smoothstep(uBeyond.x, uBeyond.y, max(abs(at.x), abs(at.y)));
            landPoint.y = mix(landPoint.y, beyondHeight(vBeyond) - vBeyond.y, vHanded);
            // from high up the ground is lit as what lies beyond is: flat (its colours follow, in the fragment)
            float lifted = smoothstep(${LIFT[0].toFixed(1)}, ${LIFT[1].toFixed(1)}, uEye.y);
            objectNormal = normalize(mix(objectNormal, vec3(0.0, 1.0, 0.0), max(vHanded, lifted)));
          }
          #endif
          #ifdef USE_TANGENT
            vec3 objectTangent = vec3(1.0, 0.0, 0.0);
          #endif`,
        )
        .replace('#include <begin_vertex>', 'vec3 transformed = landPoint;');
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          /* glsl */ `#include <common>
          varying vec3 vLand;
          varying float vCanopy;
          varying float vCrown;
          ${beyond ? `#define LAND_BEYOND\n varying float vHanded; varying vec3 vBeyond;\n${beyond.fragment}` : ''}
          uniform float uTime;
          uniform float uCel;
          uniform vec4 uEye;
          ${MAPS}
          ${NOISE}
          ${FIELD}
          ${spec.shared}
          ${crowns(spec.crown)}
          struct Ground { vec3 albedo; float rough; float bump; float water; };   // bump: a height in metres, which tilts the normal as a bump map would
          float landPixel;   // metres across one pixel, here
          // how much of a feature this many metres across can be made out: none once it is under two pixels
          float seen(float size) { return 1.0 - smoothstep(0.25, 0.5, landPixel / size); }
          float landBump;
          float landWater;
          float landRough;
          ${spec.paint}
          // Bare sand, grass and what falls under shrubs, from the maps, with the grain each has close to.
          Ground ground(vec2 p, vec4 A, vec4 B) {
            float woody = A.r, herb = A.g, worked = B.r, wet = B.g, loose = B.b;
            Ground g;
            g.water = 0.0;
            // sand: paler and darker over tens of metres; scuffed, drifted and trodden over decimetres; grains
            float drift = noise(vec3(p * 0.035, 1.0)) * 0.7 + noise(vec3(p * 0.21, 2.0)) * 0.3;
            vec3 sand = mix(${vec3(p.sandDark)}, ${vec3(p.sand)}, drift);
            // (each grain is worked out only where it can be made out: past that its share is nought, so nothing changes but the cost)
            float tread = 0.5, grain = 0.5;
            if (seen(0.12) > 0.0) tread = noise(vec3(p * 2.4, 5.0)) * 0.6 + noise(vec3(p * 7.0, 6.0)) * 0.4;
            if (seen(0.004) > 0.0) grain = noise(vec3(p * 160.0, 2.0)) * 0.6 + noise(vec3(p * 430.0, 4.0)) * 0.4;
            sand *= 1.0 + 0.24 * (tread - 0.5) * seen(0.12) + 0.24 * (grain - 0.5) * seen(0.004);
            // loose dry sand lies in wind ripples, crests across the wind
            // ripples: crests a hand apart, wandering and forking, stronger in patches where the wind has worked longest
            float rip = 0.0, ripples = loose * (1.0 - smoothstep(0.05, 0.3, herb)) * seen(0.06);
            if (ripples > 0.0) {
              float ripWarp = noise(vec3(p * 0.6, 8.0)) * 0.35 + noise(vec3(p * 2.3, 8.5)) * 0.04;
              rip = sin((p.x + ripWarp + 0.08 * p.y) * 62.8);
              ripples *= smoothstep(0.3, 0.7, noise(vec3(p * 0.18, 8.9)));
            }
            sand *= 1.0 + 0.03 * rip * ripples;
            g.bump = 0.003 * rip * ripples + 0.03 * (tread - 0.5) * seen(0.12);
            // patches a stride across: damper and darker, or a dry pale crust
            float patches = noise(vec3(p * 0.45, 24.0)) * 0.65 + noise(vec3(p * 1.3, 25.0)) * 0.35;
            sand *= 1.0 + 0.22 * (patches - 0.5) * seen(0.5);
            // worked ground: graded, and driven over; each vehicle's track two lines of pressed sand 1.5 m apart, wandering
            float tyres = 0.0;
            if (worked * seen(0.3) > 0.0) for (int k = 0; k < 2; k++) {
              float a = 0.7 + 1.9 * float(k);
              vec2 dir = vec2(cos(a), sin(a));
              float across = dot(p, vec2(-dir.y, dir.x)) + 9.0 * noise(vec3(p * 0.025, 26.0 + float(k)));
              float lane = floor(across / 23.0);
              float f = across - (lane + 0.5) * 23.0;
              float wheel = 1.0 - smoothstep(0.06, 0.15, abs(abs(f) - 0.75));
              // a track runs for a while and gives out, pressed harder in places
              float runs = smoothstep(0.45, 0.6, noise(vec3(dot(p, dir) * 0.03, lane, 27.0 + float(k))));
              tyres = max(tyres, wheel * runs * (0.5 + 0.5 * noise(vec3(p * 0.7, 29.0 + float(k)))));
            }
            tyres *= worked * seen(0.3);
            sand = mix(sand, sand * 0.9, tyres);
            sand = mix(sand, sand * 1.05, worked);
            g.bump += 0.02 * (patches - 0.5) * seen(0.5) - 0.012 * tyres;
            g.albedo = sand;
            g.rough = 1.0;
            // grass: clumps of a hand's breadth to a stride, with sand between where it is thin
            float clump = noise(vec3(p * 1.7, 9.0)) * 0.6 + noise(vec3(p * 5.5, 10.0)) * 0.4;
            float grass = smoothstep(clump - 0.3, clump + 0.2, herb * 1.25 + 0.25 * (noise(vec3(p * 9.0, 41.0)) - 0.5) * seen(0.1));
            grass = mix(herb, grass, seen(0.35));
            vec3 straw = mix(${vec3(p.herbDry)}, ${vec3(p.herbGreen)}, smoothstep(0.25, 0.75, noise(vec3(p * 0.09, 11.0)) * 0.7 + clump * 0.3));
            // the grass's colour by its clumps: no blades, just tone, faded by pixel size like everything else
            straw *= 0.85 + 0.3 * (clump - 0.5) * seen(0.2) + 0.12 * (noise(vec3(p * 3.1, 12.0)) - 0.5) * seen(0.08);
            g.albedo = mix(g.albedo, straw, grass);
            g.bump += 0.01 * grass * (clump - 0.5) * seen(0.2);
            // under shrubs: fallen leaves and shade
            float under = smoothstep(0.12, 0.55, woody + 0.3 * (noise(vec3(p * 0.8, 14.0)) - 0.5));
            vec3 litter = ${vec3(p.litter)} * (0.75 + 0.5 * noise(vec3(p * 3.0, 15.0)) * mix(1.0, 0.6 + 0.8 * noise(vec3(p * 11.0, 16.0)), seen(0.05)));
            g.albedo = mix(g.albedo, litter, under);
            g.bump = mix(g.bump, 0.01 * (noise(vec3(p * 3.0, 15.0)) - 0.5), under);
            // damp ground is darker and has a sheen
            g.albedo *= 1.0 - 0.38 * wet;
            g.rough = mix(g.rough, 0.55, wet);
            return g;
          }`,
        )
        .replace(
          '#include <map_fragment>',
          /* glsl */ `
          vec2 landAt = vLand.xz;
          landPixel = max(length(fwidth(landAt)), 1e-5);
          vec4 coverA = landAf(landAt), coverB = landBf(landAt);
          Ground g = ground(landAt, coverA, coverB);
          // the thicket's roof: leaf masses on each crown, deep shade between them
          // where the map says the thicket closes, as far from the eye as its roof has risen: per pixel, so its edge is the map's and not the grid's
          float eyeFar = length(vec3(landAt - uEye.xz, uEye.y));
          float roofed = smoothstep(0.3, 0.62, coverA.r) * smoothstep(${SHELL[0].toFixed(1)}, ${SHELL[1].toFixed(1)}, eyeFar);
          if (roofed > 0.0) {
            float crown = mix(0.6, crowns(landAt), seen(${spec.crown.toFixed(2)}));
            float masses = mix(0.5, noise(vec3(landAt * 1.9, 16.0)), seen(1.0));   // (a tone that is under a pixel is its mean, not a speckle)
            float leaves = noise(vec3(landAt * 9.0, 17.0)) * 0.6 + noise(vec3(landAt * 23.0, 18.0)) * 0.4;
            vec3 leaf = mix(${vec3(p.leaf)}, ${vec3(p.leafOther)}, smoothstep(0.42, 0.58, noise(vec3(landAt * 0.022, 19.0))));
            leaf = mix(leaf, ${vec3(p.leafLit)}, smoothstep(0.2, 0.95, crown * 0.65 + masses * 0.35));
            leaf *= mix(0.3, 1.0, smoothstep(0.1, 0.7, crown)) * (0.7 + 0.6 * mix(0.5, leaves, seen(0.1))) * (0.8 + 0.4 * masses);
            g.albedo = mix(g.albedo, leaf, roofed);
            g.rough = mix(g.rough, 0.8, roofed);
            g.bump = mix(g.bump, 0.25 * crown + 0.05 * (masses - 0.5) + 0.03 * (leaves - 0.5) * seen(0.1), roofed);
          }
          // Drawn: the land in a few flat tones with shapes of its own, not the real ground posterised. Each cover
          // is one colour, chosen by its map with an edge that wanders like a brush's; a second, darker tone lies in
          // patches tens of metres across; the canopy's crowns are lit or in shade. The grain is gone.
          if (uCel > 0.5) {
            float wander = noise(vec3(landAt * 0.08, 50.0)) - 0.5;
            float grassed = step(0.42, coverA.g + 0.35 * wander);
            float under = step(0.45, coverA.r + 0.3 * wander);
            vec3 flat_ = mix(${vec3(p.sand)} * 1.12, mix(${vec3(p.herbDry)}, ${vec3(p.herbGreen)}, 0.4) * 1.45, grassed);
            flat_ = mix(flat_, ${vec3(p.litter)} * 1.3, under);
            flat_ *= 1.0 - 0.1 * step(0.62, noise(vec3(landAt * 0.03, 51.0)));
            // near the eye, the marks a pen makes for ground: short strokes in tufts where it is grassed, a stipple on sand
            vec2 tc = landAt * 3.0, ti = floor(tc), tf = tc - ti;
            float th = hash(vec3(ti, 52.0));
            vec2 to = vec2(hash(vec3(ti, 53.0)), hash(vec3(ti, 54.0))) * 0.6 + 0.2;
            float ta = 1.2 + 0.7 * (th - 0.5);
            vec2 td = vec2(cos(ta), sin(ta));
            vec2 tq = tf - to;
            float clumped = noise(vec3(landAt * 0.7, 55.0));
            float stroke = (1.0 - smoothstep(0.02, 0.05, abs(tq.x * td.y - tq.y * td.x))) * step(abs(dot(tq, td)), 0.12) * step(1.0 - clumped * 0.9, th);
            float dot_ = (1.0 - smoothstep(0.025, 0.05, length(tq))) * step(0.8, th);
            float mark = mix(dot_, stroke, grassed) * (1.0 - under) * seen(0.06);
            flat_ = mix(flat_, flat_ * 0.7, mark);
            if (roofed > 0.0) {
              float crownCel = mix(0.6, crowns(landAt), seen(${spec.crown.toFixed(2)}));
              vec3 roof = mix(${vec3(p.leaf)} * 1.25, ${vec3(p.leafLit)} * 1.1, step(0.5, crownCel));
              flat_ = mix(flat_, roof, step(0.5, roofed));
            }
            g.albedo = flat_;
            g.bump = 0.0;
          }
          paint(landAt, coverA, coverB, g);
          #ifdef LAND_BEYOND
          // across the last stretch, and everywhere from high up but where the ground is made (worked: roads, aprons, clearings)
          float handed = max(vHanded, smoothstep(${LIFT[0].toFixed(1)}, ${LIFT[1].toFixed(1)}, uEye.y) * (1.0 - smoothstep(0.1, 0.35, coverB.r)));
          if (handed > 0.0) {
            float rough;
            vec3 albedo = beyondAlbedo(vBeyond, rough);
            g.albedo = mix(g.albedo, albedo, handed);
            g.rough = mix(g.rough, rough, handed);
            g.bump *= 1.0 - handed;
            g.water *= 1.0 - handed;
          }
          #endif
          landBump = g.bump;
          landWater = g.water;
          landRough = g.rough;
          diffuseColor.rgb = g.albedo;`,
        )
        .replace(
          '#include <roughnessmap_fragment>',
          /* glsl */ `#include <roughnessmap_fragment>
          roughnessFactor = landRough;`,
        )
        .replace(
          '#include <normal_fragment_maps>',
          /* glsl */ `#include <normal_fragment_maps>
          {
            // the grain's relief, as a bump map would tilt the normal: from how the bump changes across the pixel
            vec3 dx = dFdx(-vViewPosition), dy = dFdy(-vViewPosition);
            float bx = dFdx(landBump), by = dFdy(landBump);
            vec3 r1 = cross(dy, normal), r2 = cross(normal, dx);
            float det = dot(dx, r1);
            vec3 grad = sign(det) * (bx * r1 + by * r2);
            normal = normalize(abs(det) * normal - (1.0 - uCel) * grad);
          }`,
        );
    };
    material.customProgramCacheKey = () => (this.beyond ? 'land+beyond' : 'land');
  }
}
