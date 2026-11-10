import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { Flight, ModelDef } from '../types';
import { GROUND_Y, type Setting, Settings } from './backdrops';
import { LOD_ABOVE, lodUrl, Staged } from './lod';
import { wearTexture } from './space';

/** Materials (by the name Blender gave them) that get the wear map. */
const WORN = /^(shingle|heatsink|aluminium|titanium|tower|steel|strap|paint-booster|paint-structure|concrete|suit|galvanised)/;
/** Materials that also take it as a bump map: cloth and poured concrete are never flat. */
const ROUGH_SURFACE = /^(suit|concrete)/;

/**
 * Window glass. Mostly you look through it; what you see of the pane itself is the sky in it,
 * strongest at a glancing angle. Models name a material `glass` and put the real thing behind it:
 * a room, or a dark `window-void` standing in for an unlit interior.
 */
const GLASS = new THREE.MeshPhysicalMaterial({
  name: 'glass',
  // nearly black, nearly clear: a pane has almost no colour of its own, only what it reflects
  color: 0x0c1418,
  transparent: true,
  opacity: 0.16,
  roughness: 0.02,
  metalness: 0,
  ior: 1.52,
  specularIntensity: 1,
  clearcoat: 1,
  clearcoatRoughness: 0.02,
  envMapIntensity: 1.6,
  side: THREE.DoubleSide,
  depthWrite: false,
});

/** A helmet visor: the same pane, but the face behind it is in the helmet's shade and the sky is on the glass. */
const VISOR = GLASS.clone();
VISOR.name = 'glass-visor';
VISOR.opacity = 0.5;

const UP = new THREE.Vector3(0, 1, 0);

/** A second copy of a loaded model, to stand beside another: put back together, and free to be taken apart by itself. */
function copy(source: THREE.Object3D): THREE.Object3D {
  rest(source);
  const object = source.clone(true);
  object.traverse((o) => delete o.userData.home); // clone() turned the vectors into plain objects
  return object;
}

/** Put every part of a model back where it was built. */
function rest(object: THREE.Object3D): void {
  object.traverse((o) => o.userData.home && o.position.copy(o.userData.home as THREE.Vector3));
}

/** The 3D half of the app: one model at a time, in its setting, orbitable and explodable. */
export class Stage {
  onHover: (node: string | null) => void = () => {};
  onSelect: (node: string | null) => void = () => {};
  onInteract: () => void = () => {};

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(35, 1, 0.05, 9000);
  private readonly controls: OrbitControls;
  private readonly composer: EffectComposer;
  private readonly backdropPass: RenderPass;
  private readonly outline: OutlinePass;
  private readonly settings: Settings;
  private readonly sun = new THREE.DirectionalLight(0xffffff, 4);
  private readonly fill = new THREE.HemisphereLight(0, 0, 0.5);
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly timer = new THREE.Timer();
  private readonly loader = new GLTFLoader();
  private readonly loaded = new Map<string, Promise<THREE.Object3D>>();
  private readonly wear = wearTexture();

  private setting: Setting;
  private root: THREE.Group | null = null;
  private main: THREE.Object3D | null = null;
  private def: ModelDef | null = null;
  /** Everything on show, each with its levels of detail; the first is the model itself. */
  private staged: Staged[] = [];
  private parts = new Map<string, THREE.Object3D>();
  private hovered: string | null = null;
  private selected: string | null = null;
  private pointerDirty = false;
  /** A press in progress: where it began and what was under it then. */
  private down: { x: number; y: number; node: string | null } | null = null;
  private flyTo: { target: THREE.Vector3; position: THREE.Vector3; t: number } | null = null;
  /** What the camera was last sent to look at; cleared when the user moves it. */
  private following: { view?: string; part?: string } | null = null;
  /** Called when the framing stops being a named view (the user orbited, or a part was chosen). */
  onView: (id: string | null) => void = () => {};
  private centreY = 0;
  /** The cutaway: a quarter of every shell removed, the quarter facing the default camera. */
  private readonly cutPlanes = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)];
  private readonly shellMaterials = new Map<THREE.Material, THREE.Material>();
  private cut = false;
  private readonly bounds = new THREE.Sphere();
  private shadowFit = -1;
  private loadToken = 0;
  /** Keys being held down, lower case. */
  private readonly held = new Set<string>();
  /** Something on show has changed and the next frame must be drawn. */
  private dirty = true;
  private sinceDrawn = 0;
  private readonly lastView = new THREE.Matrix4();
  private readonly lastProjection = new THREE.Matrix4();
  /** How much of the bottom of the canvas the controls cover, 0 to 1: views are framed above it. */
  private inset = 0.26;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // nothing that casts a shadow moves by itself: the map is redrawn when something is changed
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.localClippingEnabled = true;

    // models are Draco-compressed; the decoder is served from public/draco
    this.loader.setDRACOLoader(new DRACOLoader().setDecoderPath(`${import.meta.env.BASE_URL}draco/`));
    this.settings = new Settings(this.renderer);
    this.setting = this.settings.get('orbit');

    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.bias = -0.0002;
    this.sun.shadow.normalBias = 0.012;
    this.scene.add(this.sun, this.sun.target, this.fill);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.zoomToCursor = true; // the wheel zooms toward what the pointer is on
    this.controls.screenSpacePanning = false; // panning slides over the ground, not up into the sky
    this.controls.addEventListener('start', () => {
      this.following = null;
      this.onView(null);
      this.flyTo = null;
      this.onInteract();
    });

    // Multisampled HDR target: trusses are all thin bright lines against a plain background.
    // The depth texture is explicit: left to its default the target gets 16 bits of depth, which
    // cannot tell concrete from the ground 6 cm under it across the pad. 24 bits can.
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: 4,
      depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
    });
    this.composer = new EffectComposer(this.renderer, target);
    this.backdropPass = new RenderPass(this.setting.backdrop.scene, this.setting.backdrop.camera);
    this.composer.addPass(this.backdropPass);
    const main = new RenderPass(this.scene, this.camera);
    main.clear = false;
    main.clearDepth = true;
    this.composer.addPass(main);
    this.outline = new OutlinePass(new THREE.Vector2(1, 1), this.scene, this.camera);
    this.outline.edgeStrength = 3;
    this.outline.edgeThickness = 1;
    this.outline.edgeGlow = 0.4;
    this.outline.visibleEdgeColor.set(0xffc46b);
    this.outline.hiddenEdgeColor.set(0x9a7434); // dimmer than the visible edge, but still an outline
    this.composer.addPass(this.outline);
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.14, 0.6, 2.4));
    this.composer.addPass(new OutputPass());
    this.applySetting();

    // A tap sends no pointermove first, so every handler that picks reads the pointer itself.
    const aim = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    };
    canvas.addEventListener('pointermove', (e) => {
      aim(e);
      this.pointerDirty = e.pointerType === 'mouse'; // a finger has no hover
    });
    canvas.addEventListener('pointerleave', () => this.setHover(null));
    // The pick is made when the press starts: by the time it ends the page may have been laid
    // out again (a phone's sheet closes on the press) and the same point is a different part.
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return; // right and middle buttons pan and zoom; they select nothing
      aim(e);
      this.down = { x: e.clientX, y: e.clientY, node: this.pick() };
    });
    canvas.addEventListener('pointerup', (e) => {
      const down = this.down;
      this.down = null;
      if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 5) this.onSelect(down.node);
    });
    canvas.addEventListener('pointercancel', () => (this.down = null));
    // Keys walk the view over the site: WASD or the arrows move, Q and E turn, R and F (or + and -)
    // zoom, Home goes back to where the section starts. Held keys are applied each frame.
    const KEYS = new Set(['w', 'a', 's', 'd', 'q', 'e', 'r', 'f', '+', '=', '-', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      const el = e.target as HTMLElement;
      const typing = el.matches?.('input, textarea, select, [contenteditable]');
      const widget = key.startsWith('arrow') && el.closest?.('[role=tablist], input');
      if (e.metaKey || e.ctrlKey || e.altKey || typing || widget) return;
      if (key === 'home') return this.view(this.def?.home ?? 'all');
      if (!KEYS.has(key)) return;
      e.preventDefault();
      if (!this.held.size) {
        this.following = null;
        this.flyTo = null;
        this.onView(null);
        this.onInteract();
      }
      this.held.add(key);
    });
    window.addEventListener('keyup', (e) => this.held.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => this.held.clear());
    // the pixel ratio changes when the window moves to another display or the page is zoomed
    const watchRatio = () => {
      matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`).addEventListener('change', watchRatio, { once: true });
      this.resize();
    };
    watchRatio();

    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  /**
   * Show one of a flight's models, with whatever it asks to be shown alongside.
   * Resolves to false if a later load() overtook this one: the caller's model is not the one on show.
   */
  async load(flight: Flight, modelId: string, onProgress?: (fraction: number) => void): Promise<boolean> {
    const def = flight.models.find((m) => m.id === modelId);
    if (!def) throw new Error(`${flight.id} has no model named ${modelId}`);
    const token = ++this.loadToken;
    const others = (def.with ?? []).map((w) => {
      const other = flight.models.find((m) => m.id === w.model);
      if (!other) throw new Error(`${def.id} wants ${w.model}, which ${flight.id} does not have`);
      return { w, other };
    });
    // every file is asked for at once, and the bar is the average of them all
    const fractions = new Array<number>(others.length + 1).fill(0);
    const progress = (i: number) => (f: number) => {
      fractions[i] = f;
      onProgress?.(fractions.reduce((a, b) => a + b, 0) / fractions.length);
    };
    const [mainResult, ...extraResults] = await Promise.allSettled([
      this.fetch(def.url, progress(0)),
      ...others.map(({ other }, i) => this.fetch(other.url, progress(i + 1))),
    ]);
    if (token !== this.loadToken) return false;
    if (mainResult.status === 'rejected') throw mainResult.reason;
    const main = mainResult.value;
    // company that failed to arrive is left out: the model asked for is still worth showing
    const company = others.flatMap(({ w, other }, i) => {
      const result = extraResults[i]!;
      if (result.status === 'rejected') {
        console.warn(`${def.id}: shown without ${other.id}:`, result.reason);
        return [];
      }
      const staged = new Staged(copy(result.value), other.parts);
      staged.explode(w.exploded ?? 0);
      staged.group.position.set(...w.position);
      staged.group.rotation.y = w.rotationY ?? 0;
      return [{ staged, url: other.url }];
    });

    if (this.root) this.scene.remove(this.root);
    if (this.setting.floor) this.scene.remove(this.setting.floor);
    for (const o of this.setting.scenery) this.scene.remove(o);
    rest(main);
    const own = new Staged(main, def.parts);
    own.group.position.set(...(def.position ?? [0, 0, 0]));
    own.group.rotation.y = def.rotationY ?? 0;
    this.staged = [own, ...company.map((c) => c.staged)];
    this.root = new THREE.Group();
    this.root.add(...this.staged.map((s) => s.group));
    this.scene.add(this.root);
    this.root.updateMatrixWorld(true);
    for (const s of this.staged) s.measure();
    this.main = own.group;
    this.def = def;
    this.parts = new Map(
      def.parts.flatMap((p) => {
        const o = main.getObjectByName(p.node);
        return o ? [[p.node, o] as const] : [];
      }),
    );
    // the coarser levels arrive behind the scenes; a model that has none simply stays as it is
    [{ staged: own, url: def.url }, ...company].forEach(({ staged, url }, n) => {
      for (let level = 1; level <= LOD_ABOVE.length; level++)
        this.fetch(lodUrl(url, level))
          .then((object) => {
            if (token !== this.loadToken) return;
            if (!n) rest(object);
            staged.add(level, n ? copy(object) : object);
            this.dirty = true;
          })
          .catch(() => {});
    });
    this.setCutaway(false);
    this.setting = this.settings.get(def.backdrop);
    this.applySetting();
    this.highlight(null, null);
    this.shadowFit = -1;
    this.fitShadows(0);
    this.view(def.home ?? 'all', true);
    return true;
  }

  private fetch(url: string, onProgress?: (fraction: number) => void): Promise<THREE.Object3D> {
    let promise = this.loaded.get(url);
    if (!promise) {
      promise = this.loader
        .loadAsync(import.meta.env.BASE_URL + url, (e) => {
          if (e.total) onProgress?.(e.loaded / e.total);
        })
        .then((gltf) => {
          this.dress(gltf.scene);
          return gltf.scene;
        });
      this.loaded.set(url, promise);
      promise.catch(() => this.loaded.delete(url)); // a failure is not remembered: the next try fetches again
    }
    void promise.then(() => onProgress?.(1));
    return promise;
  }

  /** What Blender's export cannot carry: shadows, anisotropy, and the wear on every surface. */
  private dress(object: THREE.Object3D): void {
    const anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const seen = new Set<THREE.Material>();
    object.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = mesh.receiveShadow = true;
      const shell = Boolean(mesh.userData.shell);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat.name.startsWith('glass')) {
        const pane = mat.name.startsWith('glass-visor') ? VISOR : GLASS;
        mesh.material = shell ? this.shellOf(pane) : pane;
        mesh.castShadow = false;
        mesh.renderOrder = 2; // after everything opaque, so what is behind is already drawn
        return;
      }
      if (!seen.has(mat)) {
        seen.add(mat);
        if (mat.map) mat.map.anisotropy = anisotropy;
        if (WORN.test(mat.name)) {
          mat.roughnessMap = this.wear;
          mat.roughness = Math.min(1, mat.roughness * 1.3);
        }
        if (ROUGH_SURFACE.test(mat.name)) {
          mat.bumpMap = this.wear;
          mat.bumpScale = 0.6;
        }
      }
      if (shell) mesh.material = this.shellOf(mat);
    });
  }

  /**
   * A shell's own copy of a material: the one the cutaway clips. Internals keep the original,
   * so a tank dome and the pipe inside it can share "aluminium" and only the dome is cut.
   */
  private shellOf(material: THREE.Material): THREE.Material {
    let copy = this.shellMaterials.get(material);
    if (!copy) {
      copy = material.clone();
      copy.userData.side = material.side;
      copy.clipIntersection = true; // cut away only where both planes agree: one quadrant
      copy.clipShadows = true; // and let the light in through the opening
      this.shellMaterials.set(material, copy);
    }
    return copy;
  }

  /** Open or close the cutaway. With it open, shells show their inner faces too. */
  setCutaway(on: boolean): void {
    this.cut = on;
    this.dirty = true;
    const at = this.main?.position ?? new THREE.Vector3();
    for (const plane of this.cutPlanes) plane.constant = -plane.normal.dot(at);
    for (const m of this.shellMaterials.values()) {
      m.clippingPlanes = on ? this.cutPlanes : null;
      m.side = on ? THREE.DoubleSide : (m.userData.side as THREE.Side);
      m.needsUpdate = true;
    }
    this.renderer.shadowMap.needsUpdate = true; // the light comes in through the opening
  }

  private applySetting(): void {
    const s = this.setting;
    this.backdropPass.scene = s.backdrop.scene;
    this.backdropPass.camera = s.backdrop.camera;
    this.scene.environment = s.environment;
    this.scene.environmentIntensity = s.environmentIntensity;
    this.sun.color.set(s.sunColor);
    this.sun.intensity = s.sunIntensity;
    this.fill.color.set(s.fill[0]);
    this.fill.groundColor.set(s.fill[1]);
    this.fill.intensity = s.fill[2];
    this.controls.maxPolarAngle = s.maxPolar;
    this.renderer.toneMappingExposure = s.exposure;
    if (s.floor) this.scene.add(s.floor);
    for (const o of s.scenery) this.scene.add(o);
    this.scene.fog = s.fog;
    this.renderer.shadowMap.needsUpdate = true;
    this.dirty = true;
  }

  /** Tell the stage how many pixels at the bottom of the canvas the controls cover. */
  setInset(pixels: number): void {
    const inset = THREE.MathUtils.clamp(pixels / Math.max(1, this.canvas.clientHeight), 0, 0.5);
    if (Math.abs(inset - this.inset) < 0.01) return;
    this.inset = inset;
    this.refollow();
  }

  /** Frame again whatever the camera was last sent to: the canvas or the model has changed shape. */
  private refollow(): void {
    const snap = !this.flyTo; // a flight under way is sent to the new framing instead of cut short
    if (this.following?.part) this.focus(this.following.part, snap);
    else if (this.following?.view) this.view(this.following.view, snap);
  }

  setExplode(t: number): void {
    this.dirty = true;
    this.staged[0]?.explode(t);
    this.fitShadows(t);
    this.renderer.shadowMap.needsUpdate = true;
    this.refollow(); // keep looking at what was asked for, until the user takes the camera themselves
  }

  setAutoRotate(on: boolean): void {
    this.controls.autoRotate = on;
  }

  /** Highlight a part from outside (the parts list). */
  highlight(hovered: string | null, selected: string | null = this.selected): void {
    this.hovered = hovered;
    this.selected = selected;
    this.dirty = true;
    // outlined in the level of detail that is on show
    this.outline.selectedObjects = [...new Set([hovered, selected])].flatMap((n) => {
      const o = n ? this.staged[0]?.part(n) : undefined;
      return o ? [o] : [];
    });
  }

  /** Fly to one part and frame it, keeping the direction the camera is already looking from. */
  focus(node: string, snap = false): void {
    const object = this.parts.get(node);
    if (!object) return;
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const target = box.getCenter(new THREE.Vector3());
    // never closer than a 1.6 m subject would be: a small part is seen with its surroundings
    const span = Math.max(size.y, Math.hypot(size.x, size.z) / this.camera.aspect, 1.6);
    const distance = span / 2 / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) / 0.5;
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    if (this.setting.floor) dir.setY(Math.max(dir.y, 0.12)).normalize();
    // no closer than just outside the part: nearer than that the camera is inside its skin
    this.controls.minDistance = Math.max(0.35, Math.min(size.x, size.z) * 0.62);
    this.controls.autoRotate = false;
    this.following = { part: node };
    this.onView(null);
    const position = target.clone().addScaledVector(dir, distance);
    if (snap) {
      this.controls.target.copy(target);
      this.camera.position.copy(position);
      this.controls.update();
    } else this.flyTo = { target, position, t: 0 };
  }

  /** Frame 'all' (everything on show) or one of the model's named views. */
  view(id: string, snap = false): void {
    if (!this.root || !this.def) return;
    const named = this.def.views.find((v) => v.id === id);
    // 'all' is everything on show; a named view with no numbers is the model alone, as it stands
    const box = new THREE.Box3().setFromObject(named && this.main ? this.main : this.root);
    const size = box.getSize(new THREE.Vector3());
    const centreY = named?.centreY ?? (box.min.y + box.max.y) / 2;
    // a wide, low subject (a launch pad) must fit by width as well as by height
    const span = named?.span ?? Math.max(size.y, Math.hypot(size.x, size.z) / this.camera.aspect);
    // the subject fills most of the frame above the controls, which sit over the bottom of it
    const fill = (1 - this.inset) * 0.9;
    const distance = span / 2 / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) / fill;
    // a named view looks at the model's own axis; 'all' looks at the middle of everything
    const mid = box.getCenter(new THREE.Vector3());
    const target = named
      ? new THREE.Vector3(this.main!.position.x, centreY, this.main!.position.z)
      : new THREE.Vector3(mid.x, centreY, mid.z);
    const lift = this.setting.floor ? 0.16 : span < 4 ? 0.22 : 0.1;
    // aim under the subject, so it sits in the middle of the frame that the controls leave clear
    target.y -= ((span / fill) * this.inset) / 2;
    const from = named?.from ? new THREE.Vector3(...named.from) : new THREE.Vector3(0.82, lift, 0.56);
    const position = target.clone().addScaledVector(from.normalize(), distance);
    this.following = { view: id };
    this.onView(id);
    this.controls.minDistance = Math.max(0.35, Math.min(1.4, span * 0.2));
    // no further out than half as far again as it takes to see everything on show: beyond that
    // the subject is a speck in a field of scrub
    const all = new THREE.Box3().setFromObject(this.root).getSize(new THREE.Vector3());
    const widest = Math.max(all.y, Math.hypot(all.x, all.z) / this.camera.aspect);
    const wide = (1.5 * widest) / 2 / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) / fill;
    // ...unless there is a site round it worth seeing from the air
    this.controls.maxDistance = Math.max(30, wide, this.setting.reach ?? 0);
    if (snap) {
      this.controls.target.copy(target);
      this.camera.position.copy(position);
      this.controls.update();
    } else {
      this.flyTo = { target, position, t: 0 };
    }
  }

  /** Fit the shadow map and the scene's bounds. Called on load and as the slider moves. */
  private fitShadows(t: number): void {
    if (!this.root || (this.shadowFit >= 0 && Math.abs(t - this.shadowFit) < 0.02)) return;
    this.shadowFit = t;
    // everything on show, for the camera's depth range and its default aim
    const all = new THREE.Box3().setFromObject(this.root);
    this.bounds.set(all.getCenter(new THREE.Vector3()), all.getSize(new THREE.Vector3()).length() / 2 + 0.5);
    this.centreY = this.bounds.center.y;
    // but the shadow map is spent on the model being looked at, plus its surroundings out to
    // twice its size: one map stretched over a whole launch pad gives the rocket sawtooth shadows
    const box = new THREE.Box3().setFromObject(this.main ?? this.root);
    const centre = box.getCenter(new THREE.Vector3());
    const radius = Math.min(this.bounds.radius, box.getSize(new THREE.Vector3()).length() + 2);
    this.sun.target.position.copy(centre);
    this.sun.position.copy(centre).addScaledVector(this.setting.sunDir, radius + 10);
    Object.assign(this.sun.shadow.camera, { left: -radius, right: radius, top: radius, bottom: -radius, near: 1, far: 2 * radius + 20 });
    this.sun.shadow.camera.updateProjectionMatrix();
    this.sun.shadow.normalBias = Math.max(0.012, radius / 900);
    // a texel of the map covers more ground the wider it is spread; a wall the Sun grazes needs the depth bias to match
    this.sun.shadow.bias = -Math.max(0.0002, radius / 40000);
    this.renderer.shadowMap.needsUpdate = true;
  }

  /** Panning cannot carry the orbit point off what is on show: there is nothing out there to look at. */
  private keepInBounds(): void {
    const t = this.controls.target;
    const off = t.clone().sub(this.bounds.center);
    // on the ground there is a site to walk over; anywhere else, only the model
    const reach = Math.max(this.bounds.radius, this.setting.reach ?? 0);
    if (off.length() <= reach) return;
    const back = off.clone().setLength(reach).add(this.bounds.center).sub(t);
    t.add(back);
    this.camera.position.add(back);
  }

  /** Move the view by whatever keys are held: over the ground, round the subject, in and out. */
  private drive(dt: number): void {
    if (!this.held.size) return;
    const has = (...keys: string[]) => keys.some((k) => this.held.has(k));
    const offset = this.camera.position.clone().sub(this.controls.target);
    const distance = offset.length();
    const forward = new THREE.Vector3(-offset.x, 0, -offset.z).normalize();
    const right = new THREE.Vector3().crossVectors(forward, UP);
    const step = new THREE.Vector3()
      .addScaledVector(forward, Number(has('w', 'arrowup')) - Number(has('s', 'arrowdown')))
      .addScaledVector(right, Number(has('d', 'arrowright')) - Number(has('a', 'arrowleft')))
      .multiplyScalar(distance * 0.9 * dt); // a screen's width in about a second, at any zoom
    this.controls.target.add(step);
    this.camera.position.add(step);
    const turn = (Number(has('q')) - Number(has('e'))) * 1.2 * dt;
    const zoom = Math.exp((Number(has('f', '-')) - Number(has('r', '+', '='))) * 1.4 * dt);
    const to = THREE.MathUtils.clamp(distance * zoom, this.controls.minDistance, this.controls.maxDistance);
    offset.applyAxisAngle(UP, turn).setLength(to);
    this.camera.position.copy(this.controls.target).add(offset);
  }

  /**
   * Where there is ground, the camera stays above it, and so does the point it orbits: a
   * camera under the pad sees the inside of the concrete and the underside of the terrain.
   */
  private keepAboveGround(): void {
    if (!this.setting.floor) return;
    const EYE = 0.35; // metres above the surface the model stands on
    if (this.controls.target.y < 0.1) this.controls.target.y = 0.1;
    if (this.camera.position.y < EYE) {
      this.camera.position.y = EYE;
      this.camera.lookAt(this.controls.target);
    }
  }

  /**
   * Keep the near plane as far out as the view allows, every frame. Depth precision at
   * distance d is about d² / (near × 2²⁴): with a fixed 5 cm near plane, faces 3 mm apart
   * fight from across the pad. Pushed out like this the resolution stays under a third of a
   * millimetre, which is what lets the models' 1 mm clearance rule (srlib.check_clearance) hold.
   */
  private fitDepth(): void {
    const toCentre = this.camera.position.distanceTo(this.bounds.center);
    const toTarget = this.camera.position.distanceTo(this.controls.target);
    let near = Math.max(0.03, 0.5 * (toCentre - this.bounds.radius), 0.01 * toTarget);
    if (this.setting.floor) {
      // ...but never past the ground at the camera's feet. The nearest ground in view is at the
      // corner of the frame, no nearer along the view than the camera's height times the cosine
      // of the frame's half-diagonal; a near plane beyond that slices the foreground away.
      const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * Math.hypot(1, this.camera.aspect);
      const height = this.camera.position.y - GROUND_Y;
      // nor past scenery between the camera and what it is looking at
      near = Math.min(near, Math.max(0.03, (0.9 * height) / Math.hypot(1, tan)), Math.max(0.03, 0.25 * toTarget));
    }
    const far = toCentre + this.bounds.radius + (this.setting.floor ? 9000 : 10);
    if (Math.abs(near - this.camera.near) > near * 0.02 || Math.abs(far - this.camera.far) > far * 0.02) {
      this.camera.near = near;
      this.camera.far = far;
      this.camera.updateProjectionMatrix();
    }
  }

  /**
   * Draw each model at the level of detail its size on screen calls for. The model being
   * studied is always complete while it is cut open: only the full level has an inside.
   */
  private fitDetail(): void {
    const scale = this.renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    let changed = false;
    this.staged.forEach((s, i) => {
      const distance = Math.max(this.camera.position.distanceTo(s.sphere.center) - s.sphere.radius * 0.6, s.sphere.radius * 0.1);
      changed = s.choose(scale / distance, i === 0 && this.cut) || changed;
    });
    if (!changed) return;
    this.dirty = true;
    this.renderer.shadowMap.needsUpdate = true;
    this.highlight(this.hovered);
  }

  private pick(): string | null {
    const shown = this.staged[0]?.shown;
    if (!shown) return null;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    // a ray does not know about the cutaway: skip what has been cut away to reach what is inside
    const gone = (h: THREE.Intersection) =>
      this.cut && h.object.userData.shell && this.cutPlanes.every((p) => p.distanceToPoint(h.point) < 0);
    const hit = this.raycaster.intersectObject(shown, true).find((h) => !gone(h));
    for (let o: THREE.Object3D | null = hit?.object ?? null; o; o = o.parent) if (this.parts.has(o.name)) return o.name;
    return null;
  }

  private setHover(node: string | null): void {
    if (node === this.hovered) return;
    this.highlight(node);
    this.canvas.style.cursor = node ? 'pointer' : 'grab';
    this.onHover(node);
  }

  private resize(): void {
    const w = this.canvas.clientWidth,
      h = this.canvas.clientHeight;
    if (!w || !h) return;
    // a phone's GPU has four times the pixels to fill per inch and a fraction of the power
    const coarse = matchMedia('(pointer: coarse)').matches;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2));
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.dirty = true;
    this.refollow(); // a framing made for the old shape no longer fits
  }

  private frame(): void {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.1);
    if (this.flyTo) {
      const f = this.flyTo;
      f.t = Math.min(1, f.t + dt / 1.1);
      const k = 1 - (1 - f.t) ** 3;
      this.controls.target.lerp(f.target, k);
      this.camera.position.lerp(f.position, k);
      if (f.t >= 1) this.flyTo = null;
    }
    this.drive(dt);
    this.fitDetail();
    this.controls.update(dt);
    this.keepInBounds();
    this.keepAboveGround();
    if (this.pointerDirty && !this.down) {
      this.pointerDirty = false;
      this.setHover(this.pick());
    }
    this.fitDepth();
    const { backdrop } = this.setting;
    if (!this.frozen) {
      backdrop.update(dt);
      this.setting.tick?.(dt);
    }
    backdrop.scene.visible = !this.frozen;
    backdrop.camera.quaternion.copy(this.camera.quaternion);
    if (backdrop.camera.aspect !== this.camera.aspect) {
      backdrop.camera.aspect = this.camera.aspect;
      backdrop.camera.updateProjectionMatrix();
    }
    // Draw only what has changed. A still view of a place where something moves by itself
    // (surf, cloud) is redrawn a dozen times a second, which is enough for scenery; a still
    // view of anything else is not redrawn at all.
    this.camera.updateMatrixWorld();
    const moved = !this.lastView.equals(this.camera.matrixWorld) || !this.lastProjection.equals(this.camera.projectionMatrix);
    this.sinceDrawn += dt;
    const ambient = this.frozen ? 0.5 : 1 / 12;
    if (!(this.dirty || moved || this.renderer.shadowMap.needsUpdate || this.sinceDrawn >= ambient)) return;
    this.lastView.copy(this.camera.matrixWorld);
    this.lastProjection.copy(this.camera.projectionMatrix);
    this.dirty = false;
    this.composer.render(this.sinceDrawn);
    this.sinceDrawn = 0;
  }

  /** For tests: nothing moves unless the camera is moved, and the sky (stars are single pixels) is hidden. */
  frozen = false;

  /** For tests: a named view, turned `azimuthDeg` about the vertical and nudged `nudgeDeg` more. */
  shot(viewId: string, azimuthDeg: number, nudgeDeg = 0): void {
    this.controls.autoRotate = false;
    this.flyTo = null;
    this.view(viewId, true);
    this.following = null; // an exact pose: a resize must not frame it again
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(azimuthDeg + nudgeDeg));
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }

  /** For tests and screenshots: stop the drift and put the camera somewhere exact. */
  pose(azimuthDeg: number, elevationDeg: number, distance: number, targetY = this.centreY, targetX = 0, targetZ = 0): void {
    this.controls.autoRotate = false;
    this.flyTo = null;
    this.following = null;
    const az = THREE.MathUtils.degToRad(azimuthDeg),
      el = THREE.MathUtils.degToRad(elevationDeg);
    this.controls.target.set(targetX, targetY, targetZ);
    this.camera.position.set(
      targetX + distance * Math.cos(el) * Math.cos(az),
      targetY + distance * Math.sin(el),
      targetZ + distance * Math.cos(el) * Math.sin(az),
    );
    this.controls.update();
  }
}
