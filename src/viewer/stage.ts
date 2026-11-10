import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { Flight as FlightData, ModelDef } from '../types';
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

/** A camera flight under way: where the orbit point and the camera's offset from it start and end. */
interface Journey {
  target0: THREE.Vector3;
  target1: THREE.Vector3;
  offset0: THREE.Vector3;
  offset1: THREE.Vector3;
  t: number;
  seconds: number;
}

/** What a pointer is on: a part of the model on show, or another model standing beside it. */
interface Picked {
  node: string | null;
  model: string | null;
  /** A window of the section's model: where on the pane, and which way the pane faces. */
  pane?: { point: THREE.Vector3; normal: THREE.Vector3 };
}
const NOTHING: Picked = { node: null, model: null };

/** Put every part of a model back where it was built. */
function rest(object: THREE.Object3D): void {
  object.traverse((o) => o.userData.home && o.position.copy(o.userData.home as THREE.Vector3));
}

/**
 * The 3D half of the app: one scene holding all of a flight's models, in its setting. One of
 * them is the section being studied: its parts can be picked, cut open and taken apart. Moving
 * between sections is a flight of the camera, never a change of scene.
 */
export class Stage {
  onHover: (node: string | null) => void = () => {};
  onSelect: (node: string | null) => void = () => {};
  onInteract: () => void = () => {};
  /** A model standing beside the one on show was clicked: the caller opens it. */
  onModel: (id: string) => void = () => {};
  onHoverModel: (id: string | null) => void = () => {};
  /** The pointer is over a window of the section's model (a click looks in), or has left it. */
  onHoverWindow: (over: boolean) => void = () => {};
  /** The Home key: back to where the section starts. */
  onHome: () => void = () => {};

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
  /** Every model of the flight, in the flight's order, each with its levels of detail. */
  private staged: Staged[] = [];
  private defs: ModelDef[] = [];
  /** Which of them is the section being studied. */
  private current = 0;
  /** How far apart each model is taken (0 to 1), and how far it is being moved to. */
  private apart: number[] = [];
  private apartGoal: number[] = [];
  /** Where each model's own slider was left: what it returns to when it is the section again. */
  private apartOwn: number[] = [];
  private hoveredModel: string | null = null;
  private overPane = false;
  private parts = new Map<string, THREE.Object3D>();
  private hovered: string | null = null;
  private selected: string | null = null;
  private pointerDirty = false;
  /** A press in progress: where it began and what was under it then. */
  private down: ({ x: number; y: number } & Picked) | null = null;
  private flyTo: Journey | null = null;
  /** What the camera was last sent to look at; cleared when the user moves it. */
  private following: { view?: string; part?: string } | null = null;
  /** Called when the framing stops being a named view (the user orbited, or a part was chosen). */
  onView: (id: string | null) => void = () => {};
  private centreY = 0;
  /** The cutaway: a quarter of every shell removed, the quarter facing the default camera. */
  private readonly cutPlanes = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)];
  /** Per model file: each shell material's own clipped copy. Only the section's own model is ever cut. */
  private readonly shellMaterials = new Map<string, Map<THREE.Material, THREE.Material>>();
  private cut = false;
  private readonly bounds = new THREE.Sphere();
  private shadowFit = -1;
  /** Keys being held down, lower case. */
  private readonly held = new Set<string>();
  /** Something on show has changed and the next frame must be drawn. */
  private dirty = true;
  private sinceDrawn = 0;
  private frames = 0;
  private drawn = 0;
  private work = 0;
  private statsAt = performance.now();
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
    this.renderer.info.autoReset = false; // counted per frame drawn, across every pass (stats())

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
    canvas.addEventListener('pointerleave', () => this.setHover(NOTHING));
    // The pick is made when the press starts: by the time it ends the page may have been laid
    // out again (a phone's sheet closes on the press) and the same point is a different part.
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return; // right and middle buttons pan and zoom; they select nothing
      aim(e);
      this.down = { x: e.clientX, y: e.clientY, ...this.pick() };
    });
    canvas.addEventListener('pointerup', (e) => {
      const down = this.down;
      this.down = null;
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) >= 5) return;
      if (down.pane) this.lookIn(down.pane.point, down.pane.normal);
      else if (down.model && !down.node) this.onModel(down.model);
      else this.onSelect(down.node);
    });
    canvas.addEventListener('pointercancel', () => (this.down = null));
    // Keys fly the view: WASD moves it over the site, E and Q lift and lower it, the arrows swing
    // it round and tilt it, R and F (or + and -) zoom, Home goes back to where the section starts. Held keys
    // are applied each frame. The legend in the corner of the page (ui.ts) lists these.
    const KEYS = new Set(['w', 'a', 's', 'd', 'q', 'e', 'r', 'f', '+', '=', '-', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      const el = e.target as HTMLElement;
      const typing = el.matches?.('input, textarea, select, [contenteditable]');
      const widget = key.startsWith('arrow') && el.closest?.('[role=tablist], input');
      if (e.metaKey || e.ctrlKey || e.altKey || typing || widget) return;
      if (key === 'home') return this.onHome();
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

  private get def(): ModelDef | null {
    return this.defs[this.current] ?? null;
  }

  /** The section's own model. */
  private get main(): THREE.Object3D | null {
    return this.staged[this.current]?.group ?? null;
  }

  /** Put all of a flight's models on the stage, each where it stands. Rejects if any cannot be fetched. */
  async load(flight: FlightData, onProgress?: (fraction: number) => void): Promise<void> {
    const fractions = new Array<number>(flight.models.length).fill(0);
    const scenes = await Promise.all(
      flight.models.map((m, i) =>
        this.fetch(m.url, (f) => {
          fractions[i] = f;
          onProgress?.(fractions.reduce((a, b) => a + b, 0) / fractions.length); // the bar is the average of them all
        }),
      ),
    );
    if (this.root) this.scene.remove(this.root);
    if (this.setting.floor) this.scene.remove(this.setting.floor);
    for (const o of this.setting.scenery) this.scene.remove(o);
    this.defs = flight.models;
    this.staged = flight.models.map((def, i) => {
      rest(scenes[i]!);
      const staged = new Staged(scenes[i]!, def.parts);
      staged.group.position.set(...(def.position ?? [0, 0, 0]));
      staged.group.rotation.y = def.rotationY ?? 0;
      return staged;
    });
    this.apart = this.staged.map(() => 0);
    this.apartGoal = this.staged.map(() => 0);
    this.apartOwn = this.staged.map(() => 0);
    this.root = new THREE.Group();
    this.root.add(...this.staged.map((s) => s.group));
    this.scene.add(this.root);
    this.root.updateMatrixWorld(true);
    for (const s of this.staged) s.measure();
    // the coarser levels arrive behind the scenes; a model that has none simply stays as it is
    const staged = this.staged;
    flight.models.forEach((def, i) => {
      for (let level = 1; level <= LOD_ABOVE.length; level++)
        this.fetch(lodUrl(def.url, level))
          .then((object) => {
            if (staged !== this.staged) return;
            rest(object);
            staged[i]!.add(level, object);
            this.dirty = true;
          })
          .catch(() => {});
    });
    this.setting = this.settings.get(flight.models[0]!.backdrop);
    this.applySetting();
    this.section(flight.models[0]!.id, true);
  }

  /**
   * Make one model the section being studied and fly to where it starts. The others take the
   * state the section asks for (the pad cleared for launch while the rocket is studied), moving
   * there as they would: the structure rolls back, the truck drives off.
   */
  section(id: string, snap = false): void {
    const at = this.defs.findIndex((m) => m.id === id);
    if (at < 0) return;
    this.setCutaway(false);
    this.current = at;
    const def = this.defs[at]!;
    const own = this.staged[at]!;
    this.parts = new Map(
      def.parts.flatMap((p) => {
        const o = own.full.getObjectByName(p.node);
        return o ? [[p.node, o] as const] : [];
      }),
    );
    this.defs.forEach((other, i) => {
      // its own state is wherever its slider was left; the others take what this section asks of them
      this.apartGoal[i] = i === at ? this.apartOwn[i]! : (def.with?.find((w) => w.model === other.id)?.exploded ?? 0);
      if (snap) this.setApart(i, this.apartGoal[i]!);
    });
    this.highlight(null, null);
    this.shadowFit = -1;
    this.fitShadows(0);
    this.view(def.home ?? 'all', snap);
  }

  /** How far apart a model has been taken, 0 to 1: what its slider should read. */
  exploded(id: string): number {
    return this.apartOwn[this.defs.findIndex((m) => m.id === id)] ?? 0;
  }

  private setApart(i: number, t: number): void {
    this.apart[i] = t;
    this.staged[i]?.explode(t);
    this.dirty = true;
    this.renderer.shadowMap.needsUpdate = true;
  }

  private fetch(url: string, onProgress?: (fraction: number) => void): Promise<THREE.Object3D> {
    let promise = this.loaded.get(url);
    if (!promise) {
      promise = this.loader
        .loadAsync(import.meta.env.BASE_URL + url, (e) => {
          if (e.total) onProgress?.(e.loaded / e.total);
        })
        .then((gltf) => {
          this.dress(gltf.scene, url);
          return gltf.scene;
        });
      this.loaded.set(url, promise);
      promise.catch(() => this.loaded.delete(url)); // a failure is not remembered: the next try fetches again
    }
    void promise.then(() => onProgress?.(1));
    return promise;
  }

  /** What Blender's export cannot carry: shadows, anisotropy, and the wear on every surface. */
  private dress(object: THREE.Object3D, url: string): void {
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
        mesh.material = shell ? this.shellOf(pane, url) : pane;
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
      if (shell) mesh.material = this.shellOf(mat, url);
    });
  }

  /**
   * A shell's own copy of a material: the one the cutaway clips. Internals keep the original,
   * so a tank dome and the pipe inside it can share "aluminium" and only the dome is cut.
   */
  private shellOf(material: THREE.Material, url: string): THREE.Material {
    let shells = this.shellMaterials.get(url);
    if (!shells) this.shellMaterials.set(url, (shells = new Map()));
    let copy = shells.get(material);
    if (!copy) {
      copy = material.clone();
      copy.userData.side = material.side;
      copy.clipIntersection = true; // cut away only where both planes agree: one quadrant
      copy.clipShadows = true; // and let the light in through the opening
      shells.set(material, copy);
    }
    return copy;
  }

  /** Open or close the cutaway. With it open, shells show their inner faces too. */
  setCutaway(on: boolean): void {
    this.cut = on;
    this.dirty = true;
    const at = this.main?.position ?? new THREE.Vector3();
    for (const plane of this.cutPlanes) plane.constant = -plane.normal.dot(at);
    // only the section's own model opens (and only its full level has an inside to show)
    for (const [url, shells] of this.shellMaterials) {
      const open = on && url === this.def?.url;
      for (const m of shells.values()) {
        if (Boolean(m.clippingPlanes) === open) continue;
        m.clippingPlanes = open ? this.cutPlanes : null;
        m.side = open ? THREE.DoubleSide : (m.userData.side as THREE.Side);
        m.needsUpdate = true;
      }
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

  /** Take the section's model apart this far (its slider). */
  setExplode(t: number): void {
    this.apartGoal[this.current] = this.apartOwn[this.current] = t;
    this.setApart(this.current, t);
    this.fitShadows(t);
    this.refollow(); // keep looking at what was asked for, until the user takes the camera themselves
  }

  /** Move every model toward the state it has been asked for: a rollback or a drive-off takes a few seconds. */
  private settle(dt: number): void {
    let moved = false;
    this.apartGoal.forEach((goal, i) => {
      const now = this.apart[i]!;
      if (now === goal) return;
      const step = this.frozen ? 1 : dt / 4; // (a test wants the scene still at once)
      this.setApart(i, Math.abs(goal - now) <= step ? goal : now + Math.sign(goal - now) * step);
      moved = true;
    });
    if (!moved) return;
    this.shadowFit = -1;
    this.fitShadows(0);
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
      const o = n ? this.staged[this.current]?.part(n) : undefined;
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
    this.following = { part: node };
    this.onView(null);
    const position = target.clone().addScaledVector(dir, distance);
    if (snap) {
      this.controls.target.copy(target);
      this.camera.position.copy(position);
      this.controls.update();
    } else this.fly(target, position);
  }

  /**
   * Go up to a window and look through it: the camera swings round to face the pane square on,
   * close enough that the opening fills the view, looking at what is just inside.
   */
  lookIn(point: THREE.Vector3, normal: THREE.Vector3): void {
    const target = point.clone().addScaledVector(normal, -0.45);
    const position = point.clone().addScaledVector(normal, 0.55);
    this.following = null;
    this.onView(null);
    this.onInteract(); // drifting round would carry the view off the window again
    this.controls.minDistance = 0.2;
    this.fly(target, position);
  }

  /** Frame 'all' (everything on show) or one of the model's named views. */
  view(id: string, snap = false): void {
    if (!this.root || !this.def) return;
    const named = this.def.views.find((v) => v.id === id);
    // 'all' is everything on show; a named view with no numbers is the model alone, as it stands;
    // one that names parts is those parts wherever they are now, so it follows them as they come apart
    const box = new THREE.Box3();
    const subjects = (named?.nodes ?? []).flatMap((n) => this.parts.get(n) ?? []);
    if (subjects.length) for (const o of subjects) box.expandByObject(o);
    else box.setFromObject(named && this.main ? this.main : this.root);
    const size = box.getSize(new THREE.Vector3());
    const centreY = named?.centreY ?? (box.min.y + box.max.y) / 2;
    // a wide, low subject (a launch pad) must fit by width as well as by height
    const span = named?.span ?? Math.max(size.y, Math.hypot(size.x, size.z) / this.camera.aspect) * (subjects.length ? 1.12 : 1);
    // the subject fills most of the frame above the controls, which sit over the bottom of it
    const fill = (1 - this.inset) * 0.9;
    const distance = span / 2 / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) / fill;
    // a named view looks at the model's own axis; 'all' looks at the middle of everything
    const mid = box.getCenter(new THREE.Vector3());
    const target =
      named && !subjects.length
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
    } else this.fly(target, position);
  }

  /**
   * Send the camera somewhere. It swings round what it is looking at while that slides to the
   * new subject, and pulls back or closes in as it goes: an arc, not a straight line through
   * the rocket. Longer journeys take longer, up to a limit.
   */
  private fly(target: THREE.Vector3, position: THREE.Vector3): void {
    const from = this.camera.position.clone().sub(this.controls.target);
    const to = position.clone().sub(target);
    const journey =
      this.controls.target.distanceTo(target) +
      Math.abs(to.length() - from.length()) +
      from.angleTo(to) * Math.min(from.length(), to.length());
    this.flyTo = {
      target0: this.controls.target.clone(),
      target1: target.clone(),
      offset0: from,
      offset1: to,
      t: 0,
      seconds: THREE.MathUtils.clamp(0.7 + 0.55 * Math.log2(1 + journey / 4), 0.9, 2.8),
    };
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
      .addScaledVector(forward, Number(has('w')) - Number(has('s')))
      .addScaledVector(right, Number(has('d')) - Number(has('a')))
      .addScaledVector(UP, (Number(has('e')) - Number(has('q'))) * 0.7)
      .multiplyScalar(distance * 0.9 * dt); // a screen's width in about a second, at any zoom
    this.controls.target.add(step);
    this.camera.position.add(step);
    const turn = (Number(has('arrowleft')) - Number(has('arrowright'))) * 1.2 * dt;
    // tilt: up the sky or down toward the horizon, within what the setting allows
    const tilt = (Number(has('arrowup')) - Number(has('arrowdown'))) * 0.9 * dt;
    if (tilt) {
      const polar = THREE.MathUtils.clamp(offset.angleTo(UP) - tilt, 0.05, this.controls.maxPolarAngle);
      const flat = new THREE.Vector3(offset.x, 0, offset.z).normalize();
      offset.copy(flat.multiplyScalar(Math.sin(polar)).addScaledVector(UP, Math.cos(polar))).multiplyScalar(distance);
    }
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
      changed = s.choose(scale / distance, i === this.current && this.cut) || changed;
    });
    if (!changed) return;
    this.dirty = true;
    this.renderer.shadowMap.needsUpdate = true;
    this.highlight(this.hovered);
  }

  /**
   * What is under the pointer: one of this model's parts, or one of the models standing beside
   * it (the pad under the rocket, the pilot at its foot), which a click opens.
   */
  private pick(): Picked {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    // a ray does not know about the cutaway: skip what has been cut away to reach what is inside
    const gone = (h: THREE.Intersection) =>
      this.cut && h.object.userData.shell && this.cutPlanes.every((p) => p.distanceToPoint(h.point) < 0);
    const hit = this.raycaster
      .intersectObjects(
        this.staged.map((s) => s.shown),
        true,
      )
      .find((h) => !gone(h));
    for (let o: THREE.Object3D | null = hit?.object ?? null; o; o = o.parent) {
      const at = this.staged.findIndex((s) => s.shown === o);
      if (at >= 0 && at !== this.current) return { node: null, model: this.defs[at]!.id };
      if (at === this.current) break;
    }
    // a window pane of this model: a click goes up to it and looks in
    const mesh = hit?.object as THREE.Mesh | undefined;
    if (hit?.face && mesh && (mesh.material as THREE.Material).name.startsWith('glass')) {
      const normal = hit.face.normal.clone().transformDirection(mesh.matrixWorld);
      if (normal.dot(this.raycaster.ray.direction) > 0) normal.negate(); // toward the viewer, whichever side was hit
      // aim at the middle of this pane, not at where the click happened to land: the mean of the
      // mesh's vertices within arm's reach of the hit (one mesh may hold several windows)
      const at = mesh.geometry.getAttribute('position');
      const centre = new THREE.Vector3();
      const v = new THREE.Vector3();
      let n = 0;
      for (let i = 0; i < at.count; i++) {
        mesh.localToWorld(v.fromBufferAttribute(at, i));
        if (v.distanceTo(hit.point) > 0.6) continue;
        centre.add(v);
        n++;
      }
      return { node: null, model: null, pane: { point: n ? centre.divideScalar(n) : hit.point.clone(), normal } };
    }
    for (let o: THREE.Object3D | null = hit?.object ?? null; o; o = o.parent)
      if (this.parts.has(o.name)) return { node: o.name, model: null };
    return { node: null, model: null };
  }

  private setHover({ node, model, pane }: Picked): void {
    if (model !== this.hoveredModel) {
      this.hoveredModel = model;
      this.onHoverModel(model);
    }
    if (Boolean(pane) !== this.overPane) this.onHoverWindow((this.overPane = Boolean(pane)));
    this.canvas.style.cursor = node || model || pane ? 'pointer' : 'grab';
    if (node === this.hovered) return;
    this.highlight(node);
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

  /**
   * For the diagnostics readout: how fast the loop is turning over and what a drawn frame costs.
   * `fps` is the loop (what motion would get); `drawn` is how many of those frames were actually
   * drawn, since a still view is not redrawn.
   */
  stats(): { fps: number; drawn: number; ms: number; triangles: number; calls: number; levels: number[] } {
    const now = performance.now();
    const seconds = Math.max(1e-3, (now - this.statsAt) / 1000);
    const out = {
      fps: this.frames / seconds,
      drawn: this.drawn / seconds,
      ms: this.frames ? this.work / this.frames : 0,
      triangles: this.renderer.info.render.triangles,
      calls: this.renderer.info.render.calls,
      levels: this.staged.map((s) => s.shownLevel),
    };
    this.statsAt = now;
    this.frames = this.drawn = this.work = 0;
    return out;
  }

  private frame(): void {
    const began = performance.now();
    this.step();
    this.frames++;
    this.work += performance.now() - began;
  }

  private step(): void {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.1);
    if (this.flyTo) {
      const f = this.flyTo;
      f.t = Math.min(1, f.t + dt / f.seconds);
      const k = f.t * f.t * f.t * (f.t * (f.t * 6 - 15) + 10); // eased at both ends
      this.controls.target.lerpVectors(f.target0, f.target1, k);
      // the offset turns and changes length separately: lengths blend by ratio, so a long pull-back starts gently
      const turn = new THREE.Quaternion().setFromUnitVectors(f.offset0.clone().normalize(), f.offset1.clone().normalize());
      const offset = f.offset0.clone().applyQuaternion(new THREE.Quaternion().slerp(turn, k));
      offset.setLength(f.offset0.length() * (f.offset1.length() / f.offset0.length()) ** k);
      this.camera.position.copy(this.controls.target).add(offset);
      if (f.t >= 1) this.flyTo = null;
    }
    this.settle(dt);
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
    this.renderer.info.reset();
    this.drawn++;
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
