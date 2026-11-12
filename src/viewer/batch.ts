import * as THREE from 'three';

/**
 * Many meshes of one material drawn in one call, each exactly as it was drawn alone.
 *
 * A mesh is a draw call, and what a draw call costs is three's work round it: finding its program, checking and
 * sending its uniforms, binding its buffers. With a thousand meshes on show that work was most of a frame, and it
 * is the processor's, so a faster graphics card did nothing for it. Joining meshes at export only goes so far
 * (srlib `merge_static`): nearly every mesh that is left is one the viewer addresses, to pick it, outline it,
 * move it, stand on it.
 *
 * So the meshes stay where they are, as they are, and only stop being drawn (`PROXY_LAYER`: the camera does not
 * see that layer, a ray does). Everything that asks about a model still asks the same objects: a pick names the
 * same part, the outline draws the same meshes, a door swings the same node, the walker stands on the same
 * triangles. In their place a `Batch` draws all the meshes of one material in one of a model's files with a
 * single multi-draw call, from one buffer their geometry has been copied into.
 *
 * The picture is the same to the last bit, because the arithmetic is the same. Three gives a mesh three matrices,
 * worked out in doubles and rounded to floats as they are sent: model-view, normal and model. Here each instance
 * is given the same three, worked out the same way from its own mesh's world matrix for the camera in hand (the
 * eye's, or the light's when the shadow map is drawn), and the shader reads them from a texture instead of from
 * uniforms (the chunks below). Nothing is multiplied twice in floats, so a vertex lands where it landed, depth
 * for depth, and what is lit is lit as it was. What is in view is culled mesh by mesh as three culled it, and
 * drawn in the order three drew it (nearest first within a material): where two faces are at one depth the later
 * draw is the one seen, so the order is part of the picture.
 *
 * For that a material is batched whole or not at all: every mesh of it in the file, so that none drawn alone could
 * have come between two of the batch's. What a batch cannot stand for is left as it was: anything blended or
 * without depth (glass, scorch marks), lamps (their material is changed when they are lit), anything with a draw
 * order of its own, a mirrored mesh, a figure that is walked as; and a material with only a few meshes, which a
 * batch would cost more than it saved. A mesh that stops matching its batch while the page is open (a material
 * swapped, a shadow switched off) is drawn alone again from that frame on (`prepare`).
 */

/** The layer a mesh is on while a batch draws it: seen by rays (the stage's raycaster) and by the outline, not by the camera. */
export const PROXY_LAYER = 6;

/** Texels an instance takes in its file's texture: model-view (4), world (4), normal (3), and one to spare. */
const TEXELS = 12;
/** Texels across: a whole number of instances, so none is split between rows. */
const ROW = 240;
const FLOATS = TEXELS * 4;

// ---------------------------------------------------------------------------------------------------------------
// the shader: an instance's three matrices, read where three reads a mesh's uniforms
// ---------------------------------------------------------------------------------------------------------------

/** Replace one of three's shader chunks, having checked that it is the one this was written against. */
function rewrite(chunk: string, has: string[], text: string): void {
  const was = (chunks[chunk] ?? '').replace(/\s+/g, ' ');
  for (const part of has)
    if (!was.includes(part)) throw new Error(`three's ${chunk} is not the one viewer/batch.ts was written against: read both again`);
  chunks[chunk] = text;
}
const chunks = THREE.ShaderChunk as unknown as Record<string, string>;

rewrite(
  'batching_pars_vertex',
  ['uniform highp sampler2D batchingTexture;', 'uniform highp usampler2D batchingIdTexture;', '#define gl_DrawID _gl_DrawID'],
  /* glsl */ `${chunks.batching_pars_vertex}
#ifdef USE_BATCHING
	// (viewer/batch.ts) four texels of the file's texture as a matrix
	mat4 batchingRow( const in int at ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int x = at % size;
		int y = at / size;
		return mat4(
			texelFetch( batchingTexture, ivec2( x, y ), 0 ),
			texelFetch( batchingTexture, ivec2( x + 1, y ), 0 ),
			texelFetch( batchingTexture, ivec2( x + 2, y ), 0 ),
			texelFetch( batchingTexture, ivec2( x + 3, y ), 0 ) );
	}
#endif
`,
);
rewrite(
  'batching_vertex',
  ['mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );'],
  /* glsl */ `
#ifdef USE_BATCHING
	// (viewer/batch.ts) the batch's first place in the texture, and this draw's after it: its model-view, world and normal matrices
	int batchingAt = ( int( texelFetch( batchingIdTexture, ivec2( 0, 0 ), 0 ).r ) + gl_DrawID ) * ${TEXELS};
	mat4 batchingMatrix = batchingRow( batchingAt );
	mat4 batchingWorld = batchingRow( batchingAt + 4 );
	mat3 batchingNormal = mat3( batchingRow( batchingAt + 8 ) );
#endif
`,
);
rewrite(
  'project_vertex',
  [
    'vec4 mvPosition = vec4( transformed, 1.0 );',
    '#ifdef USE_BATCHING mvPosition = batchingMatrix * mvPosition; #endif',
    '#ifdef USE_INSTANCING mvPosition = instanceMatrix * mvPosition; #endif',
    'mvPosition = modelViewMatrix * mvPosition; gl_Position = projectionMatrix * mvPosition;',
  ],
  /* glsl */ `
vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#else
	#ifdef USE_INSTANCING
		mvPosition = instanceMatrix * mvPosition;
	#endif
	mvPosition = modelViewMatrix * mvPosition;
#endif
gl_Position = projectionMatrix * mvPosition;
`,
);
rewrite(
  'defaultnormal_vertex',
  [
    'mat3 bm = mat3( batchingMatrix );',
    'transformedNormal = bm * transformedNormal;',
    'mat3 im = mat3( instanceMatrix );',
    'transformedNormal = normalMatrix * transformedNormal; #ifdef FLIP_SIDED transformedNormal = - transformedNormal; #endif #ifdef USE_TANGENT transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz; #endif',
  ],
  /* glsl */ `
vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	transformedNormal = batchingNormal * transformedNormal;
#else
	#ifdef USE_INSTANCING
		// this is in lieu of a per-instance normal-matrix
		// non-uniform scaling in the instance matrix is supported
		// shear transforms are not supported
		mat3 im = mat3( instanceMatrix );
		transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
		transformedNormal = im * transformedNormal;
		#ifdef USE_TANGENT
			transformedTangent = im * transformedTangent;
		#endif
	#endif
	transformedNormal = normalMatrix * transformedNormal;
#endif
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	#ifdef USE_BATCHING
		transformedTangent = ( batchingMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#else
		transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#endif
#endif
`,
);
rewrite(
  'worldpos_vertex',
  [
    'vec4 worldPosition = vec4( transformed, 1.0 );',
    '#ifdef USE_BATCHING worldPosition = batchingMatrix * worldPosition; #endif',
    '#ifdef USE_INSTANCING worldPosition = instanceMatrix * worldPosition; #endif',
    'worldPosition = modelMatrix * worldPosition; #endif',
  ],
  /* glsl */ `
#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingWorld * worldPosition;
	#else
		#ifdef USE_INSTANCING
			worldPosition = instanceMatrix * worldPosition;
		#endif
		worldPosition = modelMatrix * worldPosition;
	#endif
#endif
`,
);

/**
 * For a shader patch that wants a vertex's place in the world (`modelMatrix * vec4(transformed, 1.0)`): the same in a
 * batch, where the mesh's own world matrix is the instance's. Use it in place of `modelMatrix` after `project_vertex`.
 */
export const WORLD_MATRIX = /* glsl */ `
#ifndef srWorldMatrix
	#ifdef USE_BATCHING
		#define srWorldMatrix batchingWorld
	#else
		#define srWorldMatrix modelMatrix
	#endif
#endif
`;

// ---------------------------------------------------------------------------------------------------------------
// which meshes, and their geometry in one buffer
// ---------------------------------------------------------------------------------------------------------------

const untouched = THREE.Object3D.prototype;

/** Why a mesh cannot be drawn by a batch, or null if it can. Its world matrix must be up to date. */
export function unbatchable(mesh: THREE.Mesh): string | null {
  if (mesh.type !== 'Mesh') return 'not a plain mesh';
  const material = (mesh.userData.real ?? mesh.material) as THREE.Material | THREE.Material[];
  if (Array.isArray(material)) return 'several materials';
  if (!(material as THREE.MeshStandardMaterial).isMeshStandardMaterial) return 'not a standard material';
  if (material.transparent || !material.depthWrite || !material.depthTest || material.blending !== THREE.NormalBlending) return 'blended';
  if (/^(glass|lamp)/.test(material.name)) return 'a material the viewer changes'; // (lamps.ts makes a lit lamp's front clear)
  if (mesh.renderOrder !== 0) return 'its own draw order';
  if (!mesh.castShadow || !mesh.receiveShadow) return 'its own shadows';
  if (mesh.userData.ghost) return 'a twin';
  if (mesh.onBeforeRender !== untouched.onBeforeRender || mesh.onAfterRender !== untouched.onAfterRender) return 'its own hooks';
  const geometry = mesh.geometry;
  const position = geometry.getAttribute('position');
  if (!position || geometry.groups.length || geometry.drawRange.start !== 0 || geometry.drawRange.count !== Infinity) return 'its geometry';
  if (Object.keys(geometry.morphAttributes).length) return 'morphs';
  for (const name in geometry.attributes)
    if (!(geometry.attributes[name] as THREE.BufferAttribute).isBufferAttribute) return 'interleaved attributes';
  if (mesh.matrixWorld.determinant() < 0) return 'mirrored';
  return null;
}

/** What two geometries must share to lie in one buffer: the same attributes, of the same kinds. */
export function layoutOf(geometry: THREE.BufferGeometry): string {
  return Object.keys(geometry.attributes)
    .sort()
    .map((name) => {
      const a = geometry.attributes[name] as THREE.BufferAttribute;
      return `${name}:${a.array.constructor.name}:${a.itemSize}:${a.normalized ? 'n' : ''}`;
    })
    .join('|');
}

/**
 * Geometries of one layout copied end to end into one, each with where its triangles start and how many indices
 * they are. Vertices and their order are untouched; indices are moved on by the vertices before them.
 */
export function pack(geometries: readonly THREE.BufferGeometry[]): {
  geometry: THREE.BufferGeometry;
  ranges: { start: number; count: number }[];
} {
  let vertices = 0;
  let indices = 0;
  for (const g of geometries) {
    const n = g.getAttribute('position').count;
    vertices += n;
    indices += g.index ? g.index.count : n;
  }
  const first = geometries[0]!;
  const packed = new THREE.BufferGeometry();
  for (const name in first.attributes) {
    const from = first.attributes[name] as THREE.BufferAttribute;
    const Kind = from.array.constructor as new (n: number) => THREE.TypedArray;
    const array = new Kind(vertices * from.itemSize);
    let at = 0;
    for (const g of geometries) {
      const a = g.attributes[name] as THREE.BufferAttribute;
      array.set(a.array, at);
      at += a.array.length;
    }
    packed.setAttribute(name, new THREE.BufferAttribute(array, from.itemSize, from.normalized));
  }
  const index = vertices > 65535 ? new Uint32Array(indices) : new Uint16Array(indices);
  const ranges: { start: number; count: number }[] = [];
  let at = 0;
  let before = 0;
  for (const g of geometries) {
    const n = g.getAttribute('position').count;
    const count = g.index ? g.index.count : n;
    if (g.index) {
      const from = g.index.array;
      for (let i = 0; i < count; i++) index[at + i] = from[i]! + before;
    } else for (let i = 0; i < count; i++) index[at + i] = i + before;
    ranges.push({ start: at, count });
    at += count;
    before += n;
  }
  packed.setIndex(new THREE.BufferAttribute(index, 1));
  return { geometry: packed, ranges };
}

// ---------------------------------------------------------------------------------------------------------------
// the batches
// ---------------------------------------------------------------------------------------------------------------

/** One mesh a batch draws. */
interface Instance {
  mesh: THREE.Mesh;
  /** Its triangles in the batch's buffer: the first index and how many. */
  start: number;
  count: number;
  /** Its geometry's bounding sphere, in its own frame: what three culls a mesh by. */
  centre: THREE.Vector3;
  radius: number;
  /** Drawn alone: it has stopped matching its batch, or batches are off. */
  out: boolean;
  /** To be drawn this frame: not out, and shown all the way up to the scene. */
  live: boolean;
  /** Whether it was to be culled when last looked at (`mesh.frustumCulled`). */
  culled: boolean;
  /** A bounding sphere the mesh has been given of its own, if it has (looked up as its bounds are asked for). */
  own: THREE.Sphere | null;
}

/**
 * How many textures each file's matrices go round. One written every frame while the last frame's draws are still
 * being worked through by the GPU has to wait for them (the driver will not change what is in use), and that wait
 * was three milliseconds a frame: so a frame's matrices go to the texture used longest ago.
 */
const RING = 4;

/** A file's matrices for one view of it: the eye's, or the light's. */
interface Sheet {
  data: Float32Array;
  /** Every instance's world matrix as it was when `data` was worked out, in doubles: 16 an instance. */
  worlds: Float64Array;
  ring: THREE.DataTexture[];
  /** The one in use. */
  at: number;
}

/** All the batches of one of a model's files: they share their matrices' textures. */
interface File {
  batches: Batch[];
  /** For the eye (0) and for the light (1). */
  sheets: [Sheet, Sheet];
  instances: number;
  /** Some batch of it has something to draw this frame. */
  live: boolean;
}

function dropArray(this: THREE.BufferAttribute): void {
  (this as unknown as { array: null }).array = null; // (it is on the GPU now, and the meshes it was copied from keep theirs)
}

/** What of a batch is drawn in one view: byte offsets into the index buffer, index counts, and how many of them. */
interface Draws {
  starts: Int32Array;
  counts: Int32Array;
  count: number;
}

/** The meshes of one material in one file, as three is to draw them: it takes this for a `BatchedMesh` and reads the fields it reads of one. */
class Batch extends THREE.Mesh {
  readonly isBatchedMesh = true;
  _multiDrawStarts: Int32Array;
  _multiDrawCounts: Int32Array;
  _multiDrawCount = 0;
  _multiDrawInstances = null;
  /** The file's matrices, and (one texel) this batch's first place among them. */
  _matricesTexture: THREE.DataTexture;
  _indirectTexture: THREE.DataTexture;
  _colorsTexture = null;
  /** A batch is not a thing in the world: whatever measures what is in the scene finds nothing here. */
  boundingBox = new THREE.Box3();
  boundingSphere = new THREE.Sphere();
  readonly instances: Instance[];
  /** Its first place in the file's textures, in instances. */
  readonly base: number;
  /** Bytes an index takes in its buffer. */
  readonly bytes: number;
  /** For the eye (0) and for the light (1). */
  readonly draws: [Draws, Draws];
  /** Its instances by depth, as last sorted (they are nearly in order the next time), and each one's depth: three's key for the order it draws in. */
  readonly order: Int32Array;
  readonly depths: Float64Array;
  /** Something of it is to be drawn this frame (`prepare`), and something of it is in a light's view in this draw. */
  live = false;
  casts = false;

  constructor(geometry: THREE.BufferGeometry, material: THREE.Material, instances: Instance[], base: number, texture: THREE.DataTexture) {
    super(geometry, material);
    this.instances = instances;
    this.base = base;
    this.bytes = geometry.index!.array.BYTES_PER_ELEMENT;
    const draws = (): Draws => ({ starts: new Int32Array(instances.length), counts: new Int32Array(instances.length), count: 0 });
    this.draws = [draws(), draws()];
    this.order = Int32Array.from(instances, (_, i) => i);
    this.depths = new Float64Array(instances.length);
    this._multiDrawStarts = this.draws[0].starts;
    this._multiDrawCounts = this.draws[0].counts;
    this._matricesTexture = texture;
    this._indirectTexture = new THREE.DataTexture(new Uint32Array([base]), 1, 1, THREE.RedIntegerFormat, THREE.UnsignedIntType);
    this._indirectTexture.needsUpdate = true;
    this.frustumCulled = false; // (its meshes are culled one by one, as they were)
    this.castShadow = this.receiveShadow = true;
    this.matrixAutoUpdate = false;
    this.visible = false;
    for (const name in geometry.attributes) (geometry.attributes[name] as THREE.BufferAttribute).onUpload(dropArray);
    geometry.index!.onUpload(dropArray);
  }

  override raycast(): void {}
}

const frustum = new THREE.Frustum();
const sphere = new THREE.Sphere();
const viewProjection = new THREE.Matrix4();
const modelView = new THREE.Matrix4();
const normal = new THREE.Matrix3();
const middle = new THREE.Vector4();

/** A light whose shadow map three draws. */
type Caster = THREE.Light & { shadow: THREE.LightShadow };
/** What is read of the renderer: whether the shadow maps are to be drawn in this draw. */
type Renderer = { shadowMap: Pick<THREE.WebGLShadowMap, 'enabled' | 'autoUpdate' | 'needsUpdate'> };

/** What the matrices of one view were last worked out for. */
interface Filled {
  /** The frame (`prepare`), and the state of what is shown (`shows`) then. */
  stamp: number;
  shows: number;
  camera: THREE.Camera | null;
  view: THREE.Matrix4;
  projection: THREE.Matrix4;
}

export class Batches {
  /** Every batch: in the scene, apart from the models (nothing that walks a model's nodes meets one). */
  readonly group = new THREE.Group();
  private readonly files: File[] = [];
  private readonly scene: THREE.Object3D;
  private readonly dress: (batch: THREE.Mesh) => void;
  private on = true;
  /** Frames gone (`prepare`), and whether each node was shown all the way up at the frame it was last asked about, by its id. */
  private stamp = 0;
  private asked = new Uint32Array(1024);
  private shownAt = new Uint8Array(1024);
  /** Counts each change in which meshes are to be drawn. */
  private shows = 0;
  /** Some batch has something to draw this frame. */
  private live = false;
  /** For the eye (0) and for the light (1). */
  private readonly filled: [Filled, Filled] = [0, 1].map(() => ({
    stamp: -1,
    shows: -1,
    camera: null,
    view: new THREE.Matrix4(),
    projection: new THREE.Matrix4(),
  })) as [Filled, Filled];
  /** Which view the batches are set to draw. */
  private drawing = -1;
  /** For the diagnostics and the tests: how often the matrices were worked out, and how often found to be as they were. */
  readonly tally = { worked: 0, kept: 0 };

  /**
   * The fewest meshes of one material worth a batch. A batch is a draw call itself, with a texture to bind, in
   * every pass it is in; it saves three's work round each of its meshes' calls. Under this it costs more than it
   * saves. (Four in five of the meshes that can be batched are in batches of eight or more.)
   */
  least = 8;
  /** The lights whose shadow maps the batches' meshes are drawn into: the stage's, handed over as they are made. */
  readonly lights: Caster[] = [];

  /** `dress` takes charge of a new batch's look (look.ts `Looks.add`): its material is its meshes' real one. */
  constructor(scene: THREE.Object3D, dress: (batch: THREE.Mesh) => void) {
    this.scene = scene;
    this.dress = dress;
    this.group.name = 'Batches';
    scene.add(this.group);
    // three calls this as a draw of the scene begins, with every matrix up to date and nothing yet chosen to be drawn
    const was = scene.onBeforeRender;
    scene.onBeforeRender = (renderer, drawn, camera, ...rest) => {
      was.call(scene, renderer, drawn, camera, ...rest);
      this.view(renderer as unknown as Renderer, camera);
    };
  }

  /** How many meshes are drawn by batches, and in how many batches: for the diagnostics. */
  get count(): { meshes: number; batches: number } {
    let meshes = 0;
    let batches = 0;
    for (const file of this.files) {
      batches += file.batches.length;
      meshes += file.instances;
    }
    return { meshes, batches };
  }

  get enabled(): boolean {
    return this.on;
  }

  /** For comparing the two: off, every mesh is drawn alone again, as three draws it. They must look the same. */
  set enabled(on: boolean) {
    this.on = on;
    this.prepare();
  }

  /**
   * Take one of a model's files (a loaded scene, dressed: materials, shadows and marks as they will be drawn) and
   * draw what can be of it in batches. Its meshes stay as they are but for their layer.
   */
  add(root: THREE.Object3D): void {
    root.updateMatrixWorld(true);
    // every mesh of each material: a material is batched only if all of them can be, in one buffer
    const byMaterial = new Map<THREE.Material, THREE.Mesh[]>();
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      for (const material of [mesh.userData.real ?? mesh.material].flat() as THREE.Material[]) {
        const list = byMaterial.get(material);
        if (list) list.push(mesh);
        else byMaterial.set(material, [mesh]);
      }
    });
    const worth = [...byMaterial.values()].filter((meshes) => {
      if (meshes.length < this.least) return false;
      const layout = layoutOf(meshes[0]!.geometry);
      return meshes.every((mesh) => unbatchable(mesh) === null && layoutOf(mesh.geometry) === layout);
    });
    const capacity = worth.reduce((n, meshes) => n + meshes.length, 0);
    if (!capacity) return;
    const height = Math.ceil((capacity * TEXELS) / ROW);
    const sheet = (): Sheet => {
      const data = new Float32Array(ROW * height * 4);
      const ring = Array.from({ length: RING }, () => new THREE.DataTexture(data, ROW, height, THREE.RGBAFormat, THREE.FloatType));
      return { data, worlds: new Float64Array(capacity * 16).fill(Number.NaN), ring, at: 0 };
    };
    const file: File = { batches: [], sheets: [sheet(), sheet()], instances: capacity, live: false };
    let base = 0;
    for (const meshes of worth) {
      const unique = [...new Set(meshes.map((m) => m.geometry))];
      const { geometry, ranges } = pack(unique);
      const instances = meshes.map((mesh): Instance => {
        const range = ranges[unique.indexOf(mesh.geometry)]!;
        if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
        const bounds = mesh.geometry.boundingSphere!;
        return {
          mesh,
          start: range.start,
          count: range.count,
          centre: bounds.center,
          radius: bounds.radius,
          out: true,
          live: false,
          culled: true,
          own: null,
        };
      });
      const real = (meshes[0]!.userData.real ?? meshes[0]!.material) as THREE.Material;
      const batch = new Batch(geometry, real, instances, base, file.sheets[0].ring[0]!);
      batch.onBeforeRender = (_renderer, _scene, camera) => this.fill(camera, 0);
      batch.onBeforeShadow = (_renderer, _object, _camera, light) => this.fill(light, 1);
      base += meshes.length;
      file.batches.push(batch);
      this.group.add(batch);
      this.dress(batch);
    }
    this.files.push(file);
    this.shows++;
  }

  /** Whether a node is in the scene and shown all the way up to it. Each node is worked out once a frame. */
  private shown(node: THREE.Object3D): boolean {
    if (node === this.scene) return true;
    const id = node.id;
    if (id >= this.asked.length) {
      const asked = new Uint32Array(Math.max(id + 1, this.asked.length * 2));
      asked.set(this.asked);
      this.asked = asked;
      const shownAt = new Uint8Array(asked.length);
      shownAt.set(this.shownAt);
      this.shownAt = shownAt;
    }
    if (this.asked[id] === this.stamp) return this.shownAt[id] === 1;
    const shown = node.visible && node.parent !== null && this.shown(node.parent);
    this.asked[id] = this.stamp;
    this.shownAt[id] = shown ? 1 : 0;
    return shown;
  }

  /**
   * Once a frame, before anything is drawn: which meshes each batch is to draw. A mesh that is hidden, or under
   * something hidden, or not in the scene, is not drawn. One that no longer matches its batch (its material has
   * been changed, it casts no shadow now, it has been given a draw order) goes back to being drawn alone, and
   * comes back to the batch if it matches again.
   */
  prepare(): void {
    this.stamp++;
    let changed = false;
    this.live = false;
    for (const file of this.files) {
      file.live = false;
      for (const batch of file.batches) {
        const material = batch.material as THREE.Material;
        const fit = this.on && !material.transparent && material.depthWrite;
        let any = false;
        // (meshes come in the order they are in the model: the next one's parent is very often the last one's)
        let parent: THREE.Object3D | null = null;
        let parentShown = false;
        for (const inst of batch.instances) {
          const mesh = inst.mesh;
          const out = !(fit && mesh.material === material && mesh.castShadow && mesh.receiveShadow && mesh.renderOrder === 0);
          if (out !== inst.out) {
            inst.out = out;
            mesh.layers.set(out ? 0 : PROXY_LAYER);
          }
          let live = !out && mesh.visible;
          if (live) {
            if (mesh.parent !== parent) {
              parent = mesh.parent;
              parentShown = parent !== null && this.shown(parent);
            }
            live = parentShown;
          }
          if (live !== inst.live || mesh.frustumCulled !== inst.culled) {
            inst.live = live;
            inst.culled = mesh.frustumCulled;
            changed = true;
          }
          if (live) any = true;
        }
        // (until a draw says what of it is in view, it is drawn if any of it is shown)
        batch.live = batch.visible = any;
        if (any) file.live = this.live = true;
      }
    }
    if (changed) this.shows++;
  }

  /**
   * A draw of the scene is beginning: have the batches ready for its camera, and let three pass over the ones with
   * nothing to draw in it. A batch with nothing in the eye's view is still wanted if the shadow maps are to be drawn
   * and something of it is in a light's.
   */
  private view(renderer: Renderer, camera: THREE.Camera): void {
    if (!this.live || !camera.layers.test(this.group.layers)) return;
    this.fill(camera, 0);
    const maps = renderer.shadowMap;
    let lit = false;
    if (maps.enabled && (maps.autoUpdate || maps.needsUpdate))
      for (const light of this.lights) {
        const shadow = light.shadow;
        if (!light.castShadow || !(shadow.autoUpdate || shadow.needsUpdate) || !this.shown(light)) continue;
        shadow.updateMatrices(light); // (as three is about to: where its map looks from)
        const seen = shadow.getFrustum();
        for (const file of this.files) {
          if (!file.live) continue;
          for (const batch of file.batches) {
            if (!batch.live || (lit && batch.casts)) continue;
            batch.casts = false;
            for (const inst of batch.instances) {
              if (!inst.live) continue;
              if (inst.culled && !seen.intersectsSphere(boundsOf(inst))) continue;
              batch.casts = true;
              break;
            }
          }
        }
        lit = true;
      }
    for (const file of this.files) {
      if (!file.live) continue;
      for (const batch of file.batches) if (batch.live) batch.visible = batch.draws[0].count > 0 || (lit && batch.casts);
    }
  }

  /**
   * Have every batch ready to be drawn through a camera: `which` is 0 for the eye's view of the scene, 1 for a
   * light's (the shadow map: only the model-view matrix is wanted). Called as the first batch of a draw is about to
   * be drawn, when the scene's matrices are up to date; the rest of that draw's batches find it done.
   *
   * If nothing has changed since this view's matrices were last worked out (the same camera where it was, the same
   * meshes shown, none of them moved), they are left as they are and nothing is sent.
   */
  private fill(camera: THREE.Camera, which: 0 | 1): void {
    const f = this.filled[which];
    const sameCamera = f.camera === camera && f.view.equals(camera.matrixWorldInverse) && f.projection.equals(camera.projectionMatrix);
    if (this.drawing === which && f.stamp === this.stamp && sameCamera) return;
    const fresh = !(sameCamera && f.shows === this.shows && this.still(which));
    f.stamp = this.stamp;
    f.shows = this.shows;
    f.camera = camera;
    this.drawing = which;
    if (fresh) {
      f.view.copy(camera.matrixWorldInverse);
      f.projection.copy(camera.projectionMatrix);
      this.work(camera, which);
      this.tally.worked++;
    } else this.tally.kept++;
    // each batch draws this view's list from this view's texture
    for (const file of this.files) {
      if (!file.live) continue;
      const sheet = file.sheets[which];
      const texture = sheet.ring[sheet.at]!;
      for (const batch of file.batches) {
        const draws = batch.draws[which];
        batch._multiDrawStarts = draws.starts;
        batch._multiDrawCounts = draws.counts;
        batch._multiDrawCount = draws.count;
        batch._matricesTexture = texture;
      }
    }
  }

  /** Whether every mesh to be drawn is where it was when this view's matrices were last worked out. */
  private still(which: 0 | 1): boolean {
    for (const file of this.files) {
      if (!file.live) continue;
      const worlds = file.sheets[which].worlds;
      for (const batch of file.batches) {
        if (!batch.visible) continue;
        let at = batch.base * 16;
        for (const inst of batch.instances) {
          if (inst.live) {
            const e = inst.mesh.matrixWorld.elements;
            for (let i = 0; i < 16; i++) if (worlds[at + i] !== e[i]) return false;
          }
          at += 16;
        }
      }
    }
    return true;
  }

  /** Work out every instance's matrices for a camera, and what of each batch is in its view, in the order three would draw it. */
  private work(camera: THREE.Camera, which: 0 | 1): void {
    const view = camera.matrixWorldInverse;
    viewProjection.multiplyMatrices(camera.projectionMatrix, view);
    frustum.setFromProjectionMatrix(viewProjection, camera.coordinateSystem, camera.reversedDepth);
    const e = normal.elements;
    for (const file of this.files) {
      if (!file.live) continue;
      const sheet = file.sheets[which];
      const { data, worlds } = sheet;
      let drawn = 0;
      for (const batch of file.batches) {
        const draws = batch.draws[which];
        draws.count = 0;
        if (!batch.live) continue;
        const { instances, order, depths } = batch;
        // which are in view, and how deep each is: three's own key (WebGLRenderer.projectObject), the middle of its bounds through the camera
        let k = batch.base * 16;
        for (let i = 0; i < instances.length; i++, k += 16) {
          const inst = instances[i]!;
          depths[i] = Number.POSITIVE_INFINITY;
          if (!inst.live) continue;
          const world = inst.mesh.matrixWorld;
          worlds.set(world.elements, k);
          const bounds = boundsOf(inst);
          if (inst.culled && !frustum.intersectsSphere(bounds)) continue;
          if (which === 1) depths[i] = 0;
          else {
            const at = inst.own ? inst.own.center : inst.centre;
            depths[i] = middle.set(at.x, at.y, at.z, 1).applyMatrix4(world).applyMatrix4(viewProjection).z;
          }
        }
        // nearest first, the older mesh first where two are as deep: the order is nearly right from the last frame
        if (which === 0)
          for (let i = 1; i < order.length; i++) {
            const moving = order[i]!;
            const depth = depths[moving]!;
            const id = instances[moving]!.mesh.id;
            let j = i - 1;
            for (; j >= 0; j--) {
              const other = order[j]!;
              const d = depths[other]!;
              if (!(d > depth || (d === depth && instances[other]!.mesh.id > id))) break;
              order[j + 1] = other;
            }
            order[j + 1] = moving;
          }
        const { starts, counts } = draws;
        let n = 0;
        let at = batch.base * FLOATS;
        for (let o = 0; o < order.length; o++) {
          const i = which === 0 ? order[o]! : o;
          if (depths[i] === Number.POSITIVE_INFINITY) {
            if (which === 0) break; // (the rest are out of view too)
            continue;
          }
          const inst = instances[i]!;
          const world = inst.mesh.matrixWorld;
          // the three matrices three would have given this mesh, worked out as three works them out
          modelView.multiplyMatrices(view, world);
          data.set(modelView.elements, at);
          if (which === 0) {
            data.set(world.elements, at + 16);
            normal.getNormalMatrix(modelView);
            data[at + 32] = e[0]!;
            data[at + 33] = e[1]!;
            data[at + 34] = e[2]!;
            data[at + 36] = e[3]!;
            data[at + 37] = e[4]!;
            data[at + 38] = e[5]!;
            data[at + 40] = e[6]!;
            data[at + 41] = e[7]!;
            data[at + 42] = e[8]!;
          }
          starts[n] = inst.start * batch.bytes;
          counts[n] = inst.count;
          n++;
          at += FLOATS;
        }
        draws.count = n;
        drawn += n;
      }
      if (!drawn) continue; // (nothing of this file is in view: nothing will read its texture)
      // to the texture used longest ago: the one last drawn from may still be in the GPU's hands
      sheet.at = (sheet.at + 1) % RING;
      sheet.ring[sheet.at]!.needsUpdate = true;
    }
  }
}

/** An instance's bounds where it stands: what three culls a mesh by (a sphere of its own if it has been given one, its geometry's if not). */
function boundsOf(inst: Instance): THREE.Sphere {
  const own = (inst.mesh as { boundingSphere?: THREE.Sphere | null }).boundingSphere;
  inst.own = own ?? null;
  if (own) sphere.copy(own);
  else {
    sphere.center.copy(inst.centre);
    sphere.radius = inst.radius;
  }
  return sphere.applyMatrix4(inst.mesh.matrixWorld);
}
