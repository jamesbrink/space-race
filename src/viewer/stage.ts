import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import type { Flight } from '../types';
import { Exploder } from './explode';
import { Backdrop, buildEnvironment, wearTexture } from './space';

export type View = 'stack' | 'spacecraft' | 'capsule';

/** Centre height and vertical span of the fixed views, metres. Station 0 is the heat-shield plane. */
const FRAMES = { spacecraft: [3.26, 8.6], capsule: [0.95, 3.4] } as const;

/** Materials (by the name Blender gave them) that get the wear map. */
const WORN = /^(shingle|heatsink|aluminium|titanium|tower|steel|strap)/;

/** The 3D half of the app: one spacecraft, lit as it was in flight, orbitable and explodable. */
export class Stage {
  onHover: (node: string | null) => void = () => {};
  onSelect: (node: string | null) => void = () => {};
  onInteract: () => void = () => {};

  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(35, 1, 0.05, 600);
  private readonly controls: OrbitControls;
  private readonly composer: EffectComposer;
  private readonly outline: OutlinePass;
  private readonly bloom: UnrealBloomPass;
  private readonly backdrop: Backdrop;
  private readonly sunDir = new THREE.Vector3(0.62, 0.42, 0.66).normalize();
  private readonly sun = new THREE.DirectionalLight(0xfff4e6, 4.0);
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly timer = new THREE.Timer();

  private model: THREE.Object3D | null = null;
  private exploder: Exploder | null = null;
  private parts = new Map<string, THREE.Object3D>();
  private hovered: string | null = null;
  private selected: string | null = null;
  private pointerDirty = false;
  private down: { x: number; y: number } | null = null;
  private flyTo: { target: THREE.Vector3; position: THREE.Vector3; t: number } | null = null;
  private centreY = 0;
  private shadowFit = -1;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.backdrop = new Backdrop(this.sunDir);
    this.scene.environment = buildEnvironment(this.renderer, this.sunDir);
    this.scene.environmentIntensity = 1.0;

    // The Sun is the only hard light in orbit. Everything else is the Earth, which the
    // environment map supplies; the faint hemisphere keeps shadowed paint from going to ink.
    const sun = this.sun;
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.bias = -0.0002;
    sun.shadow.normalBias = 0.012;
    this.scene.add(sun, sun.target, new THREE.HemisphereLight(0x0a0c12, 0x3a5c9c, 0.5));

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 1.2;
    this.controls.maxDistance = 140;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.5;
    this.controls.addEventListener('start', () => {
      this.flyTo = null;
      this.onInteract();
    });

    // Multisampled HDR target: the truss is all thin bright lines against black.
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.backdrop.scene, this.backdrop.camera));
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
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.6, 2.2);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

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

  async load(flight: Flight, onProgress?: (fraction: number) => void): Promise<void> {
    const gltf = await new GLTFLoader().loadAsync(import.meta.env.BASE_URL + flight.model.url, (e) => {
      if (e.total) onProgress?.(e.loaded / e.total);
    });
    if (this.model) this.scene.remove(this.model);
    const wear = wearTexture();
    const anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const seen = new Set<THREE.Material>();
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = mesh.receiveShadow = true;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (seen.has(mat)) return;
      seen.add(mat);
      if (mat.map) mat.map.anisotropy = anisotropy;
      if (WORN.test(mat.name)) {
        mat.roughnessMap = wear;
        mat.roughness = Math.min(1, mat.roughness * 1.3);
      }
    });
    this.model = gltf.scene;
    this.scene.add(gltf.scene);
    this.parts = new Map(
      flight.parts.flatMap((p) => {
        const o = gltf.scene.getObjectByName(p.node);
        return o ? [[p.node, o] as const] : [];
      }),
    );
    this.exploder = new Exploder(gltf.scene, flight.parts);
    this.fitShadows(0);
    this.view('stack', true);
  }

  setExplode(t: number): void {
    this.exploder?.set(t);
    this.fitShadows(t);
  }

  /**
   * Shadow-map texels are spent on a box around the vehicle. Assembled, that box is the
   * vehicle; exploded it is about twice as tall, and shadows soften to match.
   */
  private fitShadows(t: number): void {
    if (!this.model || (this.shadowFit >= 0 && Math.abs(t - this.shadowFit) < 0.02)) return;
    this.shadowFit = t;
    const box = new THREE.Box3().setFromObject(this.model);
    const centre = box.getCenter(new THREE.Vector3());
    const radius = box.getSize(new THREE.Vector3()).length() / 2 + 0.5;
    this.centreY = centre.y;
    this.sun.target.position.copy(centre);
    this.sun.position.copy(centre).addScaledVector(this.sunDir, radius + 10);
    Object.assign(this.sun.shadow.camera, { left: -radius, right: radius, top: radius, bottom: -radius, near: 1, far: 2 * radius + 20 });
    this.sun.shadow.camera.updateProjectionMatrix();
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

  view(view: View, snap = false): void {
    const box = new THREE.Box3().setFromObject(this.model ?? this.scene);
    const [centreY, span] = view === 'stack' ? [(box.min.y + box.max.y) / 2, box.max.y - box.min.y] : FRAMES[view];
    // far enough back that `span` fills 80% of the frame's height
    const distance = span / 2 / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) / 0.8;
    const target = new THREE.Vector3(0, centreY, 0);
    const dir = new THREE.Vector3(0.82, view === 'capsule' ? 0.22 : 0.1, 0.56).normalize();
    const position = target.clone().addScaledVector(dir, distance);
    if (snap) {
      this.controls.target.copy(target);
      this.camera.position.copy(position);
      this.controls.update();
    } else {
      this.flyTo = { target, position, t: 0 };
    }
  }

  private pick(): string | null {
    if (!this.model) return null;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObject(this.model, true)[0];
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
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
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
      const k = 1 - Math.pow(1 - f.t, 3);
      this.controls.target.lerp(f.target, k);
      this.camera.position.lerp(f.position, k);
      if (f.t >= 1) this.flyTo = null;
    }
    this.controls.update(dt);
    if (this.pointerDirty && !this.down) {
      this.pointerDirty = false;
      this.setHover(this.pick());
    }
    this.backdrop.update(dt);
    this.backdrop.follow(this.camera);
    this.composer.render(dt);
  }

  /** For tests and screenshots: stop the drift and put the camera somewhere exact. */
  pose(azimuthDeg: number, elevationDeg: number, distance: number, targetY = this.centreY): void {
    this.controls.autoRotate = false;
    this.flyTo = null;
    const az = THREE.MathUtils.degToRad(azimuthDeg), el = THREE.MathUtils.degToRad(elevationDeg);
    this.controls.target.set(0, targetY, 0);
    this.camera.position.set(
      distance * Math.cos(el) * Math.cos(az),
      targetY + distance * Math.sin(el),
      distance * Math.cos(el) * Math.sin(az),
    );
    this.controls.update();
  }
}
