import * as THREE from 'three';
import type { LineupRow } from '../address.ts';
import { Crossfade, LOD_ABOVE, thresholdsOf } from '../../viewer/lod.ts';
import { outline } from '../../viewer/studio.ts';
import { tier } from '../../viewer/tier.ts';
import type { Entry } from './row.ts';

/**
 * One vehicle of the Lineup's row, where it stands: its levels of detail, of which one is drawn (two while one gives way
 * to the other: lod.ts `Crossfade`), the box round what is on show, and what the hall draws for it on the floor: a
 * plate in its programme's tint, a person 1.8 m tall, and its own shadow.
 *
 * - **It arrives coarsest first.** The coarsest level is the one the row is formed from and is held for as long as the
 *   page is; a finer one is fetched when its size on screen calls for it and the device can hold it (scene.ts), fades
 *   in over the coarser, and is let go whole (its buffers, its pictures, its materials) when it is no longer wanted.
 * - **It stands on the floor, about its own axis**, wherever its flight stands it on its pad: the box round the coarsest
 *   level, measured to the vertex, puts its lowest point at y = 0 and its middle on the row. Every level is put by that
 *   one measurement, so a change of level moves nothing.
 * - **Its spacecraft alone** is the same model with every other top-level node not drawn (and so never sent to the
 *   GPU): what is left stands on the floor in its turn.
 * - **Its shadow is its own and is drawn once.** The key light does not move, and neither does the vehicle, so its
 *   silhouette from the light is drawn into a small picture when it arrives (and again when what is on show changes)
 *   and laid on the floor where that light would throw it, softer the further it falls from what casts it. No shadow
 *   map is kept or redrawn, nothing shimmers as the view moves, and the shadow is the same from every view. What it
 *   leaves out: a vehicle casts no shadow on itself or on its neighbour (none falls there: the key is in front of the
 *   row and above it, and each shadow lies behind its own vehicle).
 */

/** The plate of the one chosen: the page's amber. */
const CHOSEN = 0xffc46b;

/** What a level not yet fetched is taken to cost, as a multiple of the coarsest's: measured over the fifteen vehicles of November 2026 (the most of each). */
const COST_GUESS = [9, 3.2, 1] as const;

/** Glass, as the row sees it: a pane has almost no colour of its own (the stage's window glass, without its glazing pass). */
function pane(own: THREE.Material): THREE.Material {
  const visor = own.name.startsWith('glass-visor');
  const lens = own.name.startsWith('glass-lens');
  return new THREE.MeshPhysicalMaterial({
    name: own.name,
    color: 0x0c1418,
    transparent: true,
    opacity: visor ? (own.transparent ? own.opacity : 0.5) : lens ? 0.34 : 0.16,
    roughness: 0.02,
    metalness: 0,
    envMapIntensity: lens ? 2.4 : 1.6,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
}

/** Every picture a material wears. */
function* picturesOf(material: THREE.Material): Generator<THREE.Texture> {
  for (const value of Object.values(material)) if ((value as THREE.Texture | null)?.isTexture) yield value as THREE.Texture;
}

/** What Blender's export cannot carry, for a level that has just arrived: glass, and sharp pictures seen edge on. */
export function dress(root: THREE.Object3D, anisotropy: number): void {
  const seen = new Set<THREE.Material>();
  const panes = new Map<THREE.Material, THREE.Material>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || Array.isArray(mesh.material)) return;
    const material = mesh.material;
    if (material.name.startsWith('glass')) {
      let made = panes.get(material);
      if (!made) panes.set(material, (made = pane(material)));
      mesh.material = made;
      mesh.renderOrder = 2; // after everything opaque, so what is behind is already drawn
      return;
    }
    if (seen.has(material)) return;
    seen.add(material);
    for (const picture of picturesOf(material)) picture.anisotropy = anisotropy;
  });
  // (the export's own glass is worn by nothing now)
  for (const own of panes.keys()) own.dispose();
}

/**
 * A level's pictures no larger than the row can show them: one over `most` texels a side is made again at that size
 * (the browser's best resampling, off the page's thread) and the first let go. A cabin's main panel is 4096 texels
 * square, 85 MiB with its smaller copies, and is read from a couch; here it is seen through a port from across a hall.
 */
export async function fitTo(root: THREE.Object3D, most: number): Promise<void> {
  const found = new Set<THREE.Texture>();
  root.traverse((o) => {
    const worn = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    for (const m of worn ? [worn].flat() : [])
      for (const picture of picturesOf(m)) {
        const image = picture.image as { width?: number; height?: number } | null;
        if (image?.width && image.height && Math.max(image.width, image.height) > most) found.add(picture);
      }
  });
  // (several textures may be one picture: it is made again once)
  const made = new Map<unknown, Promise<ImageBitmap | null>>();
  await Promise.all(
    [...found].map(async (picture) => {
      const image = picture.image as ImageBitmap;
      const scale = most / Math.max(image.width, image.height);
      let smaller = made.get(image);
      if (!smaller) {
        smaller = createImageBitmap(image, {
          resizeWidth: Math.max(1, Math.round(image.width * scale)),
          resizeHeight: Math.max(1, Math.round(image.height * scale)),
          resizeQuality: 'high',
          premultiplyAlpha: 'none',
          colorSpaceConversion: 'none',
        }).catch(() => null); // (a browser that cannot: the picture stays as it came)
        made.set(image, smaller);
      }
      const bitmap = await smaller;
      if (!bitmap) return;
      picture.image = bitmap;
      picture.needsUpdate = true;
    }),
  );
  for (const [image, smaller] of made) if (await smaller) (image as Partial<ImageBitmap>).close?.();
}

/** Let a level go: its buffers, its pictures, its materials. (Its cel twins are the looks' to let go first: `Looks.remove`.) */
export function release(root: THREE.Object3D): void {
  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    geometries.add(mesh.geometry);
    for (const m of [mesh.material].flat()) materials.add(m);
  });
  for (const g of geometries) g.dispose();
  for (const m of materials) {
    for (const picture of picturesOf(m)) {
      picture.dispose();
      (picture.image as Partial<ImageBitmap> | null)?.close?.();
    }
    m.dispose();
  }
  root.removeFromParent();
}

/** What the meshes under `root` that are drawn take on the GPU, bytes: their buffers, and their pictures with their smaller copies. */
function bytesOf(root: THREE.Object3D): number {
  const geometries = new Set<THREE.BufferGeometry>();
  const pictures = new Set<unknown>();
  let bytes = 0;
  const walk = (o: THREE.Object3D): void => {
    if (!o.visible) return;
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) {
      if (!geometries.has(mesh.geometry)) {
        geometries.add(mesh.geometry);
        for (const a of Object.values(mesh.geometry.attributes)) bytes += (a as THREE.BufferAttribute).array?.byteLength ?? 0;
        bytes += mesh.geometry.index?.array?.byteLength ?? 0;
      }
      for (const m of [mesh.material].flat())
        for (const picture of picturesOf(m)) {
          const image = picture.image as { width?: number; height?: number } | null;
          if (!image?.width || !image.height || pictures.has(image)) continue;
          pictures.add(image);
          bytes += (image.width * image.height * 4 * 4) / 3;
        }
    }
    for (const child of o.children) walk(child);
  };
  // (whether or not the level itself is on show: what would be drawn of it)
  for (const child of root.children) walk(child);
  return bytes;
}

/** The box round what is drawn under `root`, measured to the vertex, in `root`'s own frame (it stands at its parent's origin, unturned). */
function boxOf(root: THREE.Object3D): THREE.Box3 {
  root.updateWorldMatrix(true, true);
  const box = new THREE.Box3();
  for (const child of root.children) if (child.visible) box.expandByObject(child, true);
  return box.isEmpty() ? box : box.translate(root.getWorldPosition(new THREE.Vector3()).negate());
}

const UP = new THREE.Vector3(0, 1, 0);

export class Stand {
  readonly entry: Entry;
  /** Where it stands in the row: its axis on the floor. */
  readonly group = new THREE.Group();
  /** Its levels, as they have arrived: 0 the model as built, the last the coarsest. */
  readonly levels: (THREE.Object3D | undefined)[] = [undefined, undefined, undefined];
  /** What each level takes on the GPU as it is shown now, bytes: measured once it has arrived, guessed from the coarsest until then. */
  readonly cost: number[] = [0, 0, 0];
  private readonly counted = [false, false, false];
  /** The level being drawn (while one gives way to another, the one coming in); -1 before any has arrived. */
  shown = -1;
  /** The level its size on screen calls for, and the one the device's allowance grants it (scene.ts). */
  wanted = 2;
  granted = 2;
  /** The finest level there is to ask for: 0, unless a finer one could not be had. */
  finest = 0;
  /** When a finer level that is no longer granted is let go, by the page's clock, ms. */
  readonly lingers = [0, 0, 0];
  /** Levels on their way. */
  readonly fetching = [false, false, false];
  /** The box round what stands there, in the scene; its size; and how tall it stands, metres. */
  readonly box = new THREE.Box3();
  readonly size = new THREE.Vector3();
  /** Its own thresholds between the levels (`thresholdsOf`: the model's, measured). */
  above: readonly number[] = LOD_ABOVE;
  /** It is in the row (not left out of a comparison). */
  standing = true;

  private readonly holder = new THREE.Group();
  private readonly fade = new Crossfade();
  private readonly plate: THREE.Mesh;
  private readonly plateColour = { value: new THREE.Color() };
  private readonly plateStrength = { value: 0.1 };
  private readonly person: THREE.Group;
  private shadow: { mesh: THREE.Mesh; target: THREE.WebGLRenderTarget } | null = null;
  private row: LineupRow = 'vehicles';
  private chosen = false;

  private readonly shade: { strength: THREE.IUniform<number>; cel: THREE.IUniform<number> };

  constructor(entry: Entry, figure: THREE.IUniform<THREE.Color>, shade: { strength: THREE.IUniform<number>; cel: THREE.IUniform<number> }) {
    this.entry = entry;
    this.shade = shade;
    this.group.name = entry.flight.id;
    this.plate = new THREE.Mesh(
      new THREE.CircleGeometry(1, 64),
      new THREE.ShaderMaterial({
        uniforms: { uColour: this.plateColour, uStrength: this.plateStrength },
        transparent: true,
        depthWrite: false,
        vertexShader: /* glsl */ `
          varying vec2 vAt;
          void main() { vAt = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uColour; uniform float uStrength; varying vec2 vAt;
          void main() {
            float r = length(vAt);
            // a wash of the tint, and a ring at its edge that says where the plate ends
            float ring = smoothstep(0.9, 0.94, r) * (1.0 - smoothstep(0.975, 1.0, r));
            gl_FragColor = vec4(uColour, uStrength * (1.0 - smoothstep(0.985, 1.0, r)) + 3.2 * uStrength * ring);
          }`,
      }),
    );
    this.plate.rotation.x = -Math.PI / 2;
    this.plate.position.y = 0.0008;
    this.plate.renderOrder = -4;
    this.person = outline(figure);
    this.group.add(this.holder, this.plate, this.person);
    this.tint();
  }

  /** Its plate's tint: its programme's (row.ts `tintOf`), or the page's amber while it is the one chosen. */
  private tint(): void {
    const [h, s, l] = this.entry.tint;
    if (this.chosen) this.plateColour.value.set(CHOSEN);
    else this.plateColour.value.setHSL(h / 360, s, l);
    this.plateStrength.value = this.chosen ? 0.2 : 0.085;
  }

  /** Mark it as the one chosen, or not. True if that changed. */
  choose(on: boolean): boolean {
    if (on === this.chosen) return false;
    this.chosen = on;
    this.tint();
    return true;
  }

  /** The coarsest level: the last, the one the row is formed from. */
  get coarsest(): number {
    return this.levels.length - 1;
  }

  /** Whether it has arrived at all. */
  get here(): boolean {
    return Boolean(this.levels[this.coarsest]);
  }

  /** How tall what stands there is, metres. */
  get height(): number {
    return this.size.y;
  }

  /** Whether one level is giving way to another. */
  get fading(): boolean {
    return this.fade.running;
  }

  /** Show the scale's person, or not. */
  people(on: boolean): void {
    this.person.visible = on;
  }

  /** What of a level is drawn: all of it, or the spacecraft's nodes alone. */
  private part(root: THREE.Object3D): void {
    const craft = this.row === 'spacecraft' ? this.entry.craft : null;
    for (const child of root.children) child.visible = !craft || craft.includes(child.name);
  }

  /**
   * A level has arrived, dressed. `fade`: the row is on show, so if this is the level granted it comes in over the one
   * drawn, as any change of level does.
   */
  add(level: number, root: THREE.Object3D, fade: boolean): void {
    this.levels[level] = root;
    this.fetching[level] = false;
    this.part(root);
    root.visible = false;
    this.holder.add(root);
    this.cost[level] = bytesOf(root);
    this.counted[level] = true;
    if (level === this.coarsest) {
      this.above = thresholdsOf(root.userData.lod_above);
      for (let finer = 0; finer < level; finer++) if (!this.counted[finer]) this.cost[finer] = this.cost[level]! * COST_GUESS[finer]!;
      this.measure();
      this.show(level, false);
    } else if (level === this.granted) this.show(level, fade);
  }

  /** Draw `level` (one that has arrived), in a moment or at once. True if what is drawn changed. */
  show(level: number, fade: boolean): boolean {
    const to = this.levels[level];
    if (!to || level === this.shown) return false;
    const from = this.shown >= 0 ? this.levels[this.shown] : undefined;
    this.fade.finish();
    if (fade && from) this.fade.start(from, to);
    else this.levels.forEach((root, i) => root && (root.visible = i === level));
    this.shown = level;
    return true;
  }

  /** `dt` seconds on. True while a fade is being drawn. */
  step(dt: number): boolean {
    return this.fade.step(dt);
  }

  /** The look has changed: a change of level under way goes on, in the look's materials. */
  relook(): void {
    this.fade.redress();
  }

  /**
   * A finer level that is no longer wanted is taken out, for whoever lets it go (`release`, after the looks have): not
   * the coarsest, and not one being drawn. Null if there is nothing of that level to take.
   */
  take(level: number): THREE.Object3D | null {
    const root = this.levels[level];
    if (!root || level === this.coarsest || level === this.shown || this.fade.running) return null;
    this.levels[level] = undefined;
    return root;
  }

  /** What stands in the row has changed (all of it, or the spacecraft alone): every level is parted again and stood on the floor. */
  form(row: LineupRow): void {
    this.row = row;
    this.fade.finish();
    this.uncast(); // (another shape's shadow: drawn again when next asked for)
    for (const [level, root] of this.levels.entries()) {
      if (!root) continue;
      this.part(root);
      this.cost[level] = bytesOf(root);
    }
    if (this.here) {
      for (let finer = 0; finer < this.coarsest; finer++)
        if (!this.levels[finer]) this.cost[finer] = this.cost[this.coarsest]! * COST_GUESS[finer]!;
      this.measure();
    }
  }

  /** Whether the row shows something of it that is not the whole vehicle: its spacecraft alone, parted from the rest. */
  get parted(): boolean {
    return this.row === 'spacecraft' && Boolean(this.entry.craft);
  }

  /** Stand what is on show on the floor about the group's origin, and furnish it: the plate under it, the person beside it. */
  private measure(): void {
    const local = boxOf(this.levels[this.coarsest]!);
    if (local.isEmpty()) return;
    const centre = local.getCenter(new THREE.Vector3());
    this.holder.position.set(-centre.x, -local.min.y, -centre.z);
    local.getSize(this.size);
    const reach = Math.hypot(this.size.x, this.size.z) / 2;
    this.plate.scale.setScalar(reach + Math.max(0.5, 0.12 * reach) + 0.6);
    // the person stands in front of it and to one side, clear of it, on its plate
    this.person.position.set(Math.min(reach, this.size.x / 2 + 0.2) * 0.72, 0, this.size.z / 2 + 0.55);
    this.place(this.group.position.x);
  }

  /** Put it at `x` along the row. */
  place(x: number): void {
    this.group.position.set(x, 0, 0);
    this.group.updateMatrixWorld(true);
    this.box.min.set(x - this.size.x / 2, 0, -this.size.z / 2);
    this.box.max.set(x + this.size.x / 2, this.size.y, this.size.z / 2);
  }

  /** The person is a card: it turns about its feet to face whoever is looking. */
  face(camera: THREE.Camera): void {
    if (!this.person.visible) return;
    const at = this.person.getWorldPosition(new THREE.Vector3());
    this.person.rotation.y = Math.atan2(camera.position.x - at.x, camera.position.z - at.z);
  }

  /**
   * Draw its shadow: its silhouette as the key light sees it, into a picture of its own, laid on the floor where that
   * light throws it. Asked when it has arrived and whenever what is on show of it changes; the frame after is drawn
   * with it. `toKey`: the direction toward the light.
   */
  cast(renderer: THREE.WebGLRenderer, toKey: THREE.Vector3): void {
    const root = this.shown >= 0 ? this.levels[this.shown] : undefined;
    if (!root || this.box.isEmpty()) return;
    // the light's own axes: across (level) and up, both square to it
    const across = new THREE.Vector3().crossVectors(UP, toKey).normalize();
    const up = new THREE.Vector3().crossVectors(toKey, across).normalize();
    const u = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    const v = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    const corner = new THREE.Vector3();
    for (let i = 0; i < 8; i++) {
      corner.set(i & 1 ? this.box.max.x : this.box.min.x, i & 2 ? this.box.max.y : this.box.min.y, i & 4 ? this.box.max.z : this.box.min.z);
      u[0] = Math.min(u[0]!, corner.dot(across));
      u[1] = Math.max(u[1]!, corner.dot(across));
      v[0] = Math.min(v[0]!, corner.dot(up));
      v[1] = Math.max(v[1]!, corner.dot(up));
    }
    // (room round it for the shadow's soft edge)
    const pad = 0.14 * Math.max(u[1]! - u[0]!, v[1]! - v[0]!);
    const [u0, u1, v0, v1] = [u[0]! - pad, u[1]! + pad, v[0]! - pad, v[1]! + pad];
    const longest = tier().lighter ? 256 : 512;
    const scale = longest / Math.max(u1 - u0, v1 - v0);
    const [w, h] = [Math.max(32, Math.round((u1 - u0) * scale)), Math.max(32, Math.round((v1 - v0) * scale))];
    if (this.shadow && (this.shadow.target.width !== w || this.shadow.target.height !== h)) this.uncast();
    const target =
      this.shadow?.target ??
      new THREE.WebGLRenderTarget(w, h, {
        format: THREE.RedFormat,
        depthBuffer: false,
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
        magFilter: THREE.LinearFilter,
      });
    // the silhouette: what is drawn of it, white on black, looking down the light
    const middle = this.box.getCenter(new THREE.Vector3());
    const camera = new THREE.OrthographicCamera(
      u0 - middle.dot(across),
      u1 - middle.dot(across),
      v1 - middle.dot(up),
      v0 - middle.dot(up),
      1,
      2000,
    );
    camera.position.copy(middle).addScaledVector(toKey, 1000);
    camera.up.copy(up);
    camera.lookAt(middle);
    camera.updateMatrixWorld(true);
    const stage = new THREE.Scene();
    const silhouette = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, depthTest: false, toneMapped: false });
    stage.overrideMaterial = silhouette;
    const [parent, hidden] = [this.group.parent, [this.plate, this.person, this.shadow?.mesh].filter((o) => o?.visible)];
    for (const o of hidden) o!.visible = false;
    stage.add(this.group);
    const was = { target: renderer.getRenderTarget(), colour: renderer.getClearColor(new THREE.Color()), alpha: renderer.getClearAlpha() };
    renderer.setRenderTarget(target);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.render(stage, camera);
    renderer.setRenderTarget(was.target);
    renderer.setClearColor(was.colour, was.alpha);
    parent?.add(this.group);
    for (const o of hidden) o!.visible = true;
    silhouette.dispose();
    if (this.shadow) return;

    // Laid on the floor: the point of the floor that the light sees at (u, v). The light looks along a level axis
    // (`across`) and a raised one (`up`), so the floor's x and z are had from u and v by a 2 x 2.
    const det = across.x * up.z - across.z * up.x;
    const floor = (uu: number, vv: number): [number, number, number] => [
      (uu * up.z - across.z * vv) / det - this.group.position.x,
      0,
      (across.x * vv - uu * up.x) / det,
    ];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([...floor(u0, v0), ...floor(u1, v0), ...floor(u1, v1), ...floor(u0, v1)], 3),
    );
    // (the picture's top row is the light's highest: three's targets are read bottom row first)
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    // which way a shadow lengthens over the floor, and how many texels a metre of floor along it is (the light's raised
    // axis rises by the light's own height in a metre of floor that way)
    const away = new THREE.Vector2(-toKey.x, -toKey.z).normalize();
    const rise = toKey.y / Math.hypot(toKey.x, toKey.z);
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        uniforms: {
          tShadow: { value: target.texture },
          uSize: { value: new THREE.Vector2(w, h) },
          uAway: { value: away },
          uTexels: { value: scale * toKey.y },
          uRise: { value: rise },
          uStrength: this.shade.strength,
          uCel: this.shade.cel,
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        vertexShader: /* glsl */ `
          uniform vec2 uAway; varying vec2 vUv; varying float vAlong;
          void main() {
            vUv = uv;
            // how far behind the vehicle's axis this point of the floor is, along the way its shadow falls
            vAlong = dot(position.xz, uAway);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D tShadow; uniform vec2 uSize; uniform float uTexels, uRise, uStrength, uCel;
          varying vec2 vUv; varying float vAlong;
          void main() {
            // What casts on a point this far behind is about this high (the light's own slope), and a shadow's edge is
            // as soft as its caster is high: the key is a softbox, some twentieth as wide as it is far (estimated, by eye).
            float blur = max(0.0, vAlong) * uRise * 0.06 * uTexels;
            float lod = log2(max(1.0, blur));
            vec2 step = exp2(lod) / uSize;
            float s = 0.36 * textureLod(tShadow, vUv, lod).r
              + 0.16 * (textureLod(tShadow, vUv + vec2(step.x, 0.0), lod).r + textureLod(tShadow, vUv - vec2(step.x, 0.0), lod).r
                + textureLod(tShadow, vUv + vec2(0.0, step.y), lod).r + textureLod(tShadow, vUv - vec2(0.0, step.y), lod).r);
            // (a drawing's shadow is one flat tone with an edge)
            float shade = mix(s, smoothstep(0.42, 0.58, s), uCel);
            gl_FragColor = vec4(0.0, 0.0, 0.0, uStrength * shade);
          }`,
      }),
    );
    mesh.position.y = 0.0012;
    mesh.renderOrder = -3;
    this.group.add(mesh);
    this.shadow = { mesh, target };
  }

  /** Let the shadow go (it is drawn again when next asked for). */
  uncast(): void {
    if (!this.shadow) return;
    this.shadow.mesh.removeFromParent();
    this.shadow.mesh.geometry.dispose();
    (this.shadow.mesh.material as THREE.Material).dispose();
    this.shadow.target.dispose();
    this.shadow = null;
  }
}
