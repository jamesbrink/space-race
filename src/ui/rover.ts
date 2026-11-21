import { ROVER_SITES } from '../world/lunar-terrain.ts';
import {
  ACESFilmicToneMapping,
  DepthTexture,
  type Group,
  HalfFloatType,
  type Light,
  MathUtils,
  NeutralToneMapping,
  PerspectiveCamera,
  Scene,
  UnsignedIntType,
  Vector3,
  WebGLRenderTarget,
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { prefs } from '../app/prefs.ts';
import type { ModelDef } from '../types.ts';
import { is, kbd, keyOf, modified, which } from '../util/keys.ts';
import { Scope } from '../util/scope.ts';
import { disposeTree } from '../viewer/dispose.ts';
import { InkPass, Looks } from '../viewer/look.ts';
import type { LunarDrivingGround } from '../viewer/lunar-driving-ground.ts';
import { LunarRover, type RoverParking } from '../viewer/lunar-rover.ts';
import { Origin } from '../viewer/origin.ts';
import type { Stage } from '../viewer/stage.ts';
import './rover.css';

const target = new Vector3(),
  offset = new Vector3(),
  sight = new Vector3();
const angles = ['Forward', 'Left', 'Reverse', 'Right', 'Brake'];
const padKeys = ['↑', '←', '↓', '→', '■'];

function parked(key: string, ground: LunarDrivingGround): RoverParking | undefined {
  try {
    const value = JSON.parse(sessionStorage.getItem(key) ?? 'null') as RoverParking | null;
    if (
      value &&
      [value.x, value.z, value.heading, value.distance].every(Number.isFinite) &&
      value.distance >= 0 &&
      Math.hypot(value.x, value.z) < ground.radius - 2 &&
      !ground.blocked?.(value.x, value.z)
    )
      return value;
  } catch {
    /* Parking is optional in a private browsing session. */
  }
  return undefined;
}

/** Owns the surface and its driver controls while the Gallery's own scene sleeps, keeping its exact inspection pose. */
export class RoverDrive {
  private readonly scope = new Scope();
  private readonly root = document.createElement('section');
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(54);
  private readonly looks = new Looks();
  private readonly keys = new Set<string>();
  private readonly fingers = new Map<number, number>();
  private readonly assets: Group[] = [];
  private ground?: LunarDrivingGround;
  private rider?: Group;
  private origin?: Origin;
  private firstPerson = false;
  private orbit = 0;
  private elevation = 0.4;
  private frameTarget?: WebGLRenderTarget;
  private composer?: EffectComposer;
  private ink?: InkPass;
  private glance = 0;
  private tilt = 0;
  private readonly status: HTMLElement;
  private readonly speed: HTMLElement;
  private readonly travelled: HTMLElement;
  private readonly parkingKey: string;
  private last = 0;
  private redraw = true;
  private inputWasActive = false;
  private readonly size = { width: 0, height: 0 };
  rover?: LunarRover;

  constructor(
    private readonly stage: Stage,
    model: ModelDef,
    private readonly exit: () => void,
  ) {
    this.parkingKey = 'space-race:rover:' + model.url;
    const config = model.lunarRover!;
    this.root.className = 'rover-drive';
    this.root.setAttribute('aria-label', 'Lunar rover driving controls');
    this.root.innerHTML = `<header><button data-rover-exit>‹ Gallery</button><div><strong></strong><span class="rover-location"></span></div></header>
      <p role="status" class="rover-message">Loading the landing site…</p>
      <div class="rover-instruments" hidden><div><small>Speed</small><b data-speed>0.0 km/h</b></div><div><small>Traverse</small><b data-distance>0 m</b></div>
      <button data-rover-look class="switch" aria-pressed="false">Cel</button><button data-rover-camera>Driver’s view</button></div>
      <div class="rover-hands" hidden>${angles.map((label, i) => `<button data-rover-pedal="${i}" aria-label="${label}"><b aria-hidden="true">${padKeys[i]}</b><span>${label}</span></button>`).join('')}</div>
      <p class="rover-keys" hidden>${kbd('rover.drive')} steer &amp; drive · Drag to look · ${kbd('rover.brake')} brake · ${kbd('page.cel')} look · ${kbd('rover.camera')} view · ${kbd('rover.leave')} Gallery</p>`;
    this.root.querySelector('strong')!.textContent = model.galleryCraft ?? model.name;
    this.root.querySelector('.rover-location')!.textContent = ROVER_SITES[config.site].label;
    this.status = this.root.querySelector('.rover-message')!;
    this.speed = this.root.querySelector('[data-speed]')!;
    this.travelled = this.root.querySelector('[data-distance]')!;
    document.body.append(this.root);
    document.body.classList.add('driving-rover');
    this.root.querySelector<HTMLButtonElement>('[data-rover-exit]')!.focus();
    this.root.querySelector('[data-rover-exit]')!.addEventListener('click', exit);
    this.root.querySelector('[data-rover-camera]')!.addEventListener('click', () => this.switchCamera());
    this.root.querySelector('[data-rover-look]')!.addEventListener('click', () => this.changeLook());
    for (const b of this.root.querySelectorAll<HTMLButtonElement>('[data-rover-pedal]')) {
      b.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        this.fingers.set(e.pointerId, Number(b.dataset.roverPedal));
        b.classList.add('pressed');
      });
      b.addEventListener('lostpointercapture', (e) => {
        this.fingers.delete(e.pointerId);
        b.classList.toggle('pressed', [...this.fingers.values()].includes(Number(b.dataset.roverPedal)));
      });
    }
    let drag: { id: number; x: number; y: number; angle: number; tilt: number } | undefined;
    this.root.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target !== this.root || drag) return;
      drag = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        angle: this.firstPerson ? this.glance : this.orbit,
        tilt: this.firstPerson ? this.tilt : this.elevation,
      };
      this.root.setPointerCapture(e.pointerId);
    });
    this.root.addEventListener('pointermove', (e) => {
      if (drag?.id !== e.pointerId) return;
      const yaw = ((e.clientX - drag.x) / Math.max(200, this.root.clientWidth)) * Math.PI * 2;
      if (this.firstPerson) {
        this.glance = MathUtils.clamp(drag.angle + yaw, -Math.PI * 0.65, Math.PI * 0.65);
        this.tilt = MathUtils.clamp(drag.tilt + ((e.clientY - drag.y) / this.root.clientHeight) * Math.PI, -0.8, 0.6);
      } else {
        this.orbit = drag.angle + yaw;
        this.elevation = MathUtils.clamp(drag.tilt - ((e.clientY - drag.y) / this.root.clientHeight) * Math.PI, 0.06, 1.3);
      }
      this.redraw = true;
    });
    this.root.addEventListener('lostpointercapture', (e) => {
      if (drag?.id === e.pointerId) drag = undefined;
    });
    this.scope.on(window, 'pagehide', () => this.park());
    this.scope.on(window, 'keyup', (e) => this.keys.delete(keyOf(e)), true);
    this.scope.on(window, 'blur', () => this.release());
    this.scope.on(document, 'visibilitychange', () => this.release());
    this.scope
      .observer(() => {
        this.redraw = true;
      })
      .observe(stage.renderer.domElement);
    void this.load(model).catch((error) => {
      if (!this.scope.live) return;
      this.status.textContent = error instanceof Error ? error.message : 'The lunar traverse could not be opened.';
    });
  }

  keydown(e: KeyboardEvent): void {
    if (modified(e)) return;
    const action = which(e, 'rover.drive');
    if (action >= 0 || is(e, 'rover.brake')) this.keys.add(keyOf(e));
    else if (is(e, 'rover.leave')) this.exit();
    else if (is(e, 'page.cel') && !e.repeat) this.changeLook();
    else if (is(e, 'rover.camera') && !e.repeat) this.switchCamera();
    else return;
    e.preventDefault();
  }

  private release(): void {
    this.keys.clear();
    this.fingers.clear();
    for (const b of this.root.querySelectorAll('.pressed')) b.classList.remove('pressed');
    this.last = 0;
  }

  private async asset(url: string): Promise<Group> {
    const scene = await this.stage.exhibitModel(url, this.scope.signal);
    if (!this.scope.live) {
      disposeTree(scene);
      this.scope.signal.throwIfAborted();
    }
    this.assets.push(scene);
    return scene;
  }

  private async load(model: ModelDef): Promise<void> {
    const config = model.lunarRover!;
    const { lunarDrivingGround } = await import('../viewer/lunar-driving-ground.ts');
    this.scope.signal.throwIfAborted();
    const [ground, body, crew] = await Promise.all([
      lunarDrivingGround(config.site, this.stage.renderer, this.scope.signal).then((surface) => {
        if (!this.scope.live) {
          surface.dispose();
          this.scope.signal.throwIfAborted();
        }
        this.ground = surface;
        return surface;
      }),
      this.asset(model.url),
      config.riders ? this.asset(config.riders) : undefined,
    ]);
    this.scope.signal.throwIfAborted();
    this.rover = new LunarRover(body, ground, parked(this.parkingKey, ground));
    if (crew) {
      this.rover.body.add(crew);
      this.rider = crew.getObjectByName('LRV_Driver') as Group | undefined;
    }
    this.scene.add(ground.group, this.rover.holder);
    this.looks.add(this.scene);
    // (what draws itself in both looks: the whole Moon past the grids)
    this.scene.add(...(ground.setting.selfDrawn ?? []));
    const renderer = this.stage.renderer;
    this.frameTarget = new WebGLRenderTarget(1, 1, {
      samples: Math.min(4, renderer.capabilities.maxSamples),
      type: HalfFloatType,
      depthTexture: new DepthTexture(1, 1, UnsignedIntType),
    });
    this.composer = new EffectComposer(renderer, this.frameTarget);
    this.composer.renderTarget2.dispose();
    this.composer.renderTarget2 = new WebGLRenderTarget(1, 1, { type: HalfFloatType, depthBuffer: false });
    this.composer.readBuffer = this.frameTarget;
    this.composer.writeBuffer = this.composer.renderTarget2;
    // the setting's sky first (lunar/setting.ts: the stars, the Sun, the Earth), then the ground and the rover over it
    const sky = ground.setting.backdrop;
    this.composer.addPass(new RenderPass(sky.scene, sky.camera));
    const over = new RenderPass(this.scene, this.camera);
    over.clear = false;
    this.composer.addPass(over);
    this.ink = new InkPass();
    this.composer.addPass(this.ink);
    this.composer.addPass(new OutputPass());
    this.setLook(prefs.get('cel'));
    const lights: Light[] = [];
    this.scene.traverse((o) => {
      if ((o as Light).isLight) lights.push(o as Light);
    });
    this.origin = new Origin(this.stage.renderer, this.scene, this.camera, [], lights);
    this.status.hidden = true;
    for (const el of this.root.querySelectorAll<HTMLElement>('.rover-instruments,.rover-keys,.rover-hands')) el.hidden = false;
    this.tick(performance.now());
  }

  private changeLook(): void {
    if (!this.ink) return;
    const cel = this.looks.current !== 'cel';
    prefs.set('cel', cel);
    this.setLook(cel);
  }

  private setLook(cel: boolean): void {
    this.looks.set(cel ? 'cel' : 'real');
    this.ink!.enabled = cel;
    this.root.querySelector('[data-rover-look]')!.setAttribute('aria-pressed', String(cel));
    this.redraw = true;
  }

  private switchCamera(): void {
    if (!this.rover) return;
    this.firstPerson = !this.firstPerson;
    if (this.rider) this.rider.visible = !this.firstPerson;
    this.root.querySelector('[data-rover-camera]')!.textContent = this.firstPerson ? 'Chase view' : 'Driver’s view';
    this.redraw = true;
  }

  private tick(t: number): void {
    if (!this.scope.live || !this.rover || !this.ground) return;
    this.scope.frame((now) => this.tick(now));
    // (the whole Moon's maps come in over a moment after the ground: drawn again until they are in)
    if (this.ground.attend(this.camera.position)) this.redraw = true;
    const dt = this.last ? Math.min(0.1, (t - this.last) / 1000) : 0;
    this.last = t;
    const held = new Set(this.fingers.values());
    for (const k of this.keys) held.add(is(k, 'rover.brake') ? 4 : which(k, 'rover.drive'));
    const pedal = Number(held.has(0)) - Number(held.has(2));
    const steer = Number(held.has(1)) - Number(held.has(3));
    const driving = this.rover.motion.speed !== 0 || this.rover.motion.steer !== 0 || held.size > 0;
    if (!driving && !this.redraw && !this.inputWasActive) return;
    if (!driving && this.inputWasActive) this.rover.drive(0, 0, false, 0);
    this.inputWasActive = driving;
    if (driving && dt > 0) {
      const steps = Math.ceil(dt * 60);
      for (let i = 0; i < steps; i++) this.rover.drive(pedal, steer, held.has(4), dt / steps);
    }
    const body = this.rover.body;
    const { motion, distance } = this.rover;
    const { renderer } = this.stage;
    const width = renderer.domElement.clientWidth,
      height = renderer.domElement.clientHeight;
    this.redraw = false;
    if (this.firstPerson) {
      this.rover.eye.getWorldPosition(this.camera.position);
      sight
        .set(Math.cos(this.glance), Math.tan(this.tilt - 0.09), -Math.sin(this.glance))
        .multiplyScalar(9)
        .applyQuaternion(body.quaternion)
        .add(this.camera.position);
    } else {
      offset
        .set(
          (-5.7 * Math.cos(this.elevation)) / Math.cos(0.4),
          7.45 * Math.sin(this.elevation),
          (3.8 * Math.cos(this.elevation)) / Math.cos(0.4),
        )
        .applyAxisAngle(target.set(0, 1, 0), motion.heading + this.orbit);
      this.camera.position.copy(body.position).add(offset);
      this.camera.position.y = Math.max(this.camera.position.y, this.ground.height(this.camera.position.x, this.camera.position.z) + 1.2);
      sight.copy(body.position).add(offset.set(0.55, 0.9, 0).applyQuaternion(body.quaternion));
    }
    this.camera.lookAt(sight);
    this.camera.aspect = width / Math.max(1, height);
    // Keep both riders in the chase frame and give the driver peripheral vision on a phone.
    this.camera.fov = Math.max(54, MathUtils.radToDeg(2 * Math.atan(Math.tan(MathUtils.degToRad(25)) / this.camera.aspect)));
    this.camera.far = Math.max(50000, this.ground.radius * 3);
    this.ground.follow(motion.x, motion.z);
    this.camera.near = MathUtils.clamp(this.camera.position.distanceTo(sight) * 0.004, 0.015, 0.05);
    this.camera.updateProjectionMatrix();
    if (this.size.width !== width || this.size.height !== height) {
      this.size.width = width;
      this.size.height = height;
      renderer.setSize(width, height, false);
      this.composer!.setPixelRatio(renderer.getPixelRatio());
      this.composer!.setSize(width, height);
    }
    this.ink!.range(this.camera);
    const mapping = renderer.toneMapping;
    renderer.toneMapping = this.looks.current === 'cel' ? NeutralToneMapping : ACESFilmicToneMapping;
    const exposure = renderer.toneMappingExposure;
    const setting = this.ground.setting;
    renderer.toneMappingExposure = setting.exposure;
    this.scene.environment = setting.environment;
    this.scene.environmentIntensity = setting.environmentIntensity;
    const sky = setting.backdrop.camera;
    sky.quaternion.copy(this.camera.quaternion);
    sky.fov = this.camera.fov;
    sky.aspect = this.camera.aspect;
    sky.updateProjectionMatrix();
    renderer.shadowMap.needsUpdate = true;
    renderer.setRenderTarget(null);
    renderer.info.reset();
    this.origin!.draw(() => this.composer!.render());
    if (this.composer!.readBuffer !== this.frameTarget) this.composer!.swapBuffers();
    renderer.toneMapping = mapping;
    renderer.toneMappingExposure = exposure;
    this.speed.textContent = (motion.speed * 3.6).toFixed(1) + ' km/h';
    this.travelled.textContent = distance >= 1000 ? (distance / 1000).toFixed(2) + ' km' : Math.round(distance) + ' m';
  }

  private park(): void {
    if (this.rover) {
      const { x, z, heading } = this.rover.motion;
      try {
        sessionStorage.setItem(this.parkingKey, JSON.stringify({ x, z, heading, distance: this.rover.distance }));
      } catch {
        /* Storage is optional. */
      }
    }
  }

  dispose(): void {
    this.scope.dispose();
    this.park();
    if (this.composer) {
      for (const pass of this.composer.passes) pass.dispose();
      this.composer.dispose();
    }
    this.looks.dispose();
    this.scene.clear();
    for (const asset of this.assets) disposeTree(asset);
    this.ground?.dispose();
    this.root.remove();
    document.body.classList.remove('driving-rover');
  }
}
