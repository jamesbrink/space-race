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
import { type Setting, Settings } from './backdrops';
import { Exploder } from './explode';
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
  private exploder: Exploder | null = null;
  private parts = new Map<string, THREE.Object3D>();
  private hovered: string | null = null;
  private selected: string | null = null;
  private pointerDirty = false;
  private down: { x: number; y: number } | null = null;
  private flyTo: { target: THREE.Vector3; position: THREE.Vector3; t: number } | null = null;
  private centreY = 0;
  /** The cutaway: a quarter of every shell removed, the quarter facing the default camera. */
  private readonly cutPlanes = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0), new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)];
  private readonly shellMaterials = new Map<THREE.Material, THREE.Material>();
  private cut = false;
  private readonly bounds = new THREE.Sphere();
  private shadowFit = -1;
  private loadToken = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
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
    this.controls.addEventListener('start', () => {
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
    this.outline.hiddenEdgeColor.set(0x3a2a10);
    this.composer.addPass(this.outline);
    this.composer.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.6, 2.2));
    this.composer.addPass(new OutputPass());
    this.applySetting();

    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.pointerDirty = true;
    });
    canvas.addEventListener('pointerleave', () => this.setHover(null));
    canvas.addEventListener('pointerdown', (e) => (this.down = { x: e.clientX, y: e.clientY }));
    canvas.addEventListener('pointerup', (e) => {
      const moved = this.down ? Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) : 99;
      this.down = null;
      if (moved < 5) this.onSelect(this.pick());
    });

    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  /** Show one of a flight's models, with whatever it asks to be shown alongside. */
  async load(flight: Flight, modelId: string, onProgress?: (fraction: number) => void): Promise<void> {
    const def = flight.models.find((m) => m.id === modelId);
    if (!def) throw new Error(`${flight.id} has no model named ${modelId}`);
    const token = ++this.loadToken;
    const main = await this.fetch(def.url, onProgress);
    const extras = await Promise.all(
      (def.with ?? []).map(async (w) => {
        const other = flight.models.find((m) => m.id === w.model);
        if (!other) throw new Error(`${def.id} wants ${w.model}, which ${flight.id} does not have`);
        const source = await this.fetch(other.url);
        rest(source);
        const object = source.clone(true);
        object.traverse((o) => delete o.userData.home); // clone() turned the vectors into plain objects
        if (w.exploded) new Exploder(object, other.parts).set(w.exploded);
        object.position.set(...w.position);
        object.rotation.y = w.rotationY ?? 0;
        return object;
      }),
    );
    if (token !== this.loadToken) return; // a later load() overtook this one

    if (this.root) this.scene.remove(this.root);
    if (this.setting.floor) this.scene.remove(this.setting.floor);
    for (const o of this.setting.scenery) this.scene.remove(o);
    rest(main);
    main.position.set(...(def.position ?? [0, 0, 0]));
    main.rotation.y = def.rotationY ?? 0;
    this.root = new THREE.Group();
    this.root.add(main, ...extras);
    this.scene.add(this.root);
    this.main = main;
    this.def = def;
    this.parts = new Map(
      def.parts.flatMap((p) => {
        const o = main.getObjectByName(p.node);
        return o ? [[p.node, o] as const] : [];
      }),
    );
    this.exploder = new Exploder(main, def.parts);
    this.setCutaway(false);
    this.setting = this.settings.get(def.backdrop);
    this.applySetting();
    this.highlight(null, null);
    this.shadowFit = -1;
    this.fitShadows(0);
    this.view(def.home ?? 'all', true);
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
    }
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
        mesh.material = shell ? this.shellOf(GLASS) : GLASS;
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
    const at = this.main?.position ?? new THREE.Vector3();
    for (const plane of this.cutPlanes) plane.constant = -plane.normal.dot(at);
    for (const m of this.shellMaterials.values()) {
      m.clippingPlanes = on ? this.cutPlanes : null;
      m.side = on ? THREE.DoubleSide : (m.userData.side as THREE.Side);
      m.needsUpdate = true;
    }
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
  }

  setExplode(t: number): void {
    this.exploder?.set(t);
    this.fitShadows(t);
  }

  setAutoRotate(on: boolean): void {
    this.controls.autoRotate = on;
  }

  /** Highlight a part from outside (the parts list). */
  highlight(hovered: string | null, selected: string | null = this.selected): void {
    this.hovered = hovered;
    this.selected = selected;
    this.outline.selectedObjects = [...new Set([hovered, selected])].flatMap((n) => {
      const o = n ? this.parts.get(n) : undefined;
      return o ? [o] : [];
    });
  }

  /** Fly to one part and frame it, keeping the direction the camera is already looking from. */
  focus(node: string): void {
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
    this.controls.minDistance = Math.min(this.controls.minDistance, distance * 0.2);
    this.controls.autoRotate = false;
    this.flyTo = { target, position: target.clone().addScaledVector(dir, distance), t: 0 };
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
    // the subject fills 70% of the frame's height: the controls sit over the bottom of it
    const distance = span / 2 / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) / 0.7;
    // a named view looks at the model's own axis; 'all' looks at the middle of everything
    const mid = box.getCenter(new THREE.Vector3());
    const target = named
      ? new THREE.Vector3(this.main!.position.x, centreY, this.main!.position.z)
      : new THREE.Vector3(mid.x, centreY, mid.z);
    const lift = this.setting.floor ? 0.16 : span < 4 ? 0.22 : 0.1;
    const position = target.clone().addScaledVector(new THREE.Vector3(0.82, lift, 0.56).normalize(), distance);
    this.controls.minDistance = Math.min(1.2, span * 0.15);
    this.controls.maxDistance = Math.max(140, size.length() * 4);
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
    const near = Math.max(0.03, 0.5 * (toCentre - this.bounds.radius), 0.01 * toTarget);
    const far = toCentre + this.bounds.radius + (this.setting.floor ? 9000 : 10);
    if (Math.abs(near - this.camera.near) > near * 0.02 || Math.abs(far - this.camera.far) > far * 0.02) {
      this.camera.near = near;
      this.camera.far = far;
      this.camera.updateProjectionMatrix();
    }
  }

  private pick(): string | null {
    if (!this.main) return null;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    // a ray does not know about the cutaway: skip what has been cut away to reach what is inside
    const gone = (h: THREE.Intersection) =>
      this.cut && h.object.userData.shell && this.cutPlanes.every((p) => p.distanceToPoint(h.point) < 0);
    const hit = this.raycaster.intersectObject(this.main, true).find((h) => !gone(h));
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
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
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
    this.controls.update(dt);
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
    this.composer.render(dt);
  }

  /** For tests: nothing moves unless the camera is moved, and the sky (stars are single pixels) is hidden. */
  frozen = false;

  /** For tests: a named view, turned `azimuthDeg` about the vertical and nudged `nudgeDeg` more. */
  shot(viewId: string, azimuthDeg: number, nudgeDeg = 0): void {
    this.controls.autoRotate = false;
    this.flyTo = null;
    this.view(viewId, true);
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), THREE.MathUtils.degToRad(azimuthDeg + nudgeDeg));
    this.camera.position.copy(this.controls.target).add(offset);
    this.controls.update();
  }

  /** For tests and screenshots: stop the drift and put the camera somewhere exact. */
  pose(azimuthDeg: number, elevationDeg: number, distance: number, targetY = this.centreY, targetX = 0, targetZ = 0): void {
    this.controls.autoRotate = false;
    this.flyTo = null;
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
