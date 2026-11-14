import * as THREE from 'three';
import { atmosphere } from '../sim/atmosphere.ts';
import { flownOnce, G0, type Sample } from '../sim/fly.ts';
import { HeatLog, type HeatResults, type Thermal, thermalAt } from '../sim/heating.ts';
import { liftoffEngine } from '../sim/staged.ts';
import type { SitedFlight } from '../types';
import { EARTH_ROTATION_RATE } from '../world/bodies.ts';
import { ecefToSite, ecefToSiteDirection, inertialToEcef, inertialToEcefVelocity, type Site, siteFrame } from '../world/frames.ts';
import { orbitalRecord, type Run } from './ascent';
import { Collar, collarOf, Incandescence, ShockGlow, wakeOf } from './entry';
import { buffetPressure, type Felt, joltStrength, type Shake, shake, soundPressure, still } from './shake';

/**
 * What flying through the air does that is seen and felt, from the simulator's own numbers at the
 * clock's instant: the heated surfaces' glow and the shock layer's (entry.ts, from sim/heating.ts),
 * the collar of cloud at Mach 1, the ice off a cold tank at liftoff, and the camera shaken by the
 * engine's sound, the air's buffet, the load and the jolts of events (shake.ts). Only the flight's
 * data is read: `trajectory` (and its `heating`) and `flies` (and its `air`). The stage feeds it
 * from `lift` and asks it for the shake just before the draw; neither knows what is in it.
 *
 * Everything is a function of the clock's time and the run on show, so the same instant looks and
 * shakes the same, forwards or back.
 *
 * Sound takes time to arrive: what shakes an eye `d` metres from the engine is what the engine was
 * doing d / 340 s ago, where it was then. Its strength is worked from the air the engine was in.
 * The other causes belong to the vehicle and reach only an eye that rides with it (the chase
 * camera, the flight deck).
 */

/** The speed of sound the delay is worked with, m/s: sea-level air. */
const SOUND = 340.3;
/** An event that jolts whoever rides the vehicle. */
interface Jolt {
  at: number;
  strength: number;
}
/** Ice off a cold tank: how many flakes, over how many seconds of flight they come away, and how long each is seen. */
const FLAKES = 140;
const SHEDS = 7;
const FALLS = 5;

export class Effects {
  /** The page's Motion setting: 1 full, 0.4 reduced, 0 none. */
  motion = 1;
  private readonly flight: SitedFlight;
  private readonly site: Site;
  private live: Run | null = null;
  private readonly log: HeatLog | null;
  private states: readonly Thermal[] = [];
  private jolts: Jolt[] = [];
  private joltsOf: readonly Sample[] | null = null;
  private scanned = 0;
  private readonly glow: Incandescence | null;
  private shock: ShockGlow | null = null;
  private collar: Collar | null = null;
  private flakes: Flakes | null = null;
  private fitted: THREE.Object3D | null = null;
  private shield: THREE.Box3 | null = null;
  /** The clock's instant and rate last shown, and whether the vehicle was off its pad. */
  private t = 0;
  private rate = 1;
  private flying = false;

  constructor(flight: SitedFlight) {
    this.flight = flight;
    this.site = siteFrame(flight.site);
    const heating = flight.trajectory?.heating ?? flight.orbital?.heating;
    this.log = heating ? new HeatLog(heating) : null;
    this.glow = heating ? new Incandescence(heating.surfaces.map((s) => s.materials)) : null;
  }

  /** Show a flight being flown by hand (ascent.ts `Run`), or (null) the record's again. */
  use(run: Run | null): void {
    this.live = run;
    this.joltsOf = null;
  }

  private samples(): readonly Sample[] {
    if (this.live) return this.live.samples;
    const tr = this.flight.trajectory;
    if (!tr && this.flight.orbital?.ascent && this.flight.flies) return orbitalRecord(this.flight).samples;
    return tr ? flownOnce(tr, this.site, this.flight.site.seaLevel.value).samples : [];
  }

  private cutoff(): number {
    if (this.live) return this.live.cutoff;
    if (!this.flight.trajectory && this.flight.orbital?.ascent && this.flight.flies) return orbitalRecord(this.flight).cutoff;
    return this.flight.trajectory?.engine.cutoff.value ?? 0;
  }

  /** The heating at `t` on the run on show, or null for a flight with none to work out. */
  thermal(t: number): Thermal | null {
    if (!this.log) return null;
    this.states = this.log.upTo(this.samples());
    return thermalAt(this.states, t);
  }

  /** What the run's heating has come to so far. */
  get heat(): HeatResults | null {
    return this.log?.results ?? null;
  }

  /**
   * What an instrument reads at `t`: the first surface's temperature (K) against its limit, and
   * the stagnation-point heat flux, W/m2. `warm` once there is anything to read; `hot` past
   * four fifths of the limit.
   */
  reading(t: number): { name: string; temperature: number; limit: number; flux: number; warm: boolean; hot: boolean } | null {
    const heating = this.flight.trajectory?.heating ?? this.flight.orbital?.heating;
    const now = this.thermal(t);
    const surface = heating?.surfaces[0];
    if (!heating || !now || !surface) return null;
    const temperature = now.surfaces[0]!.temperature;
    return {
      name: surface.name,
      temperature,
      limit: surface.limit.value,
      flux: now.flux,
      warm: now.flux >= 1000 || temperature >= heating.starts.value + 2,
      hot: temperature >= 0.8 * surface.limit.value,
    };
  }

  /** The sample at or before `t`, and the one after. */
  private either(t: number): [Sample, Sample, number] | null {
    const samples = this.samples();
    if (!samples.length) return null;
    let lo = 0;
    let hi = samples.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (samples[mid]!.t <= t) lo = mid;
      else hi = mid;
    }
    const a = samples[lo]!;
    const b = samples[hi]!;
    return [a, b, b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0];
  }

  /** Where the point flown was at `t`, in the scene's frame (straight between samples: good to a metre, which is all the sound needs). */
  private placeAt(t: number, into: THREE.Vector3): THREE.Vector3 {
    const pair = this.either(t);
    if (!pair) return into.set(0, 0, 0);
    const [a, b, k] = pair;
    const at = (s: Sample) => ecefToSite(this.site, inertialToEcef(s.r, EARTH_ROTATION_RATE * s.t));
    const [p, q] = [at(a), at(b)];
    return into.set(p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, p[2] + (q[2] - p[2]) * k);
  }

  /** The events of the run on show that jolt whoever rides it, in order of time. */
  private events(): readonly Jolt[] {
    const samples = this.samples();
    const tr = this.flight.trajectory;
    if (!tr && !this.flight.orbital?.ascent) return [];
    const fresh = samples !== this.joltsOf || samples.length < this.scanned;
    if (fresh) {
      this.joltsOf = samples;
      this.scanned = 1;
      this.jolts = [];
    }
    if (!fresh && this.scanned >= samples.length && !this.live) return this.jolts;
    const add = (at: number, strength: number): void => {
      if (!Number.isFinite(at) || strength <= 0) return;
      const same = this.jolts.find((j) => Math.abs(j.at - at) < 0.4);
      if (same) same.strength = Math.max(same.strength, strength);
      else this.jolts.push({ at, strength });
    };
    // a step in the load between two samples: more than a quarter of a g in under a sixth of a second, or at more than 3 g a second.
    // (The head of a flight being flown is replaced until it is kept: it is not read until there is one after it.)
    const upTo = this.live ? samples.length - 1 : samples.length;
    for (let i = Math.max(1, this.scanned); i < upTo; i++) {
      const [a, b] = [samples[i - 1]!, samples[i]!];
      const step = Math.abs(b.g - a.g);
      const dt = b.t - a.t;
      if (a.t > 0 && step >= 0.25 && dt > 0 && (dt <= 0.16 || step / dt > 3)) add(b.t, joltStrength(step));
    }
    this.scanned = Math.max(this.scanned, upTo);
    // what the record names. Something let go is felt whether or not the load steps: its bolts and its rockets are not flown
    const named: Jolt[] = [];
    const drops = this.flight.flies?.drops ?? [];
    const dropped = this.live ? this.live.dropped : drops.map((d) => d.at);
    drops.forEach((d, i) => void (d.under || named.push({ at: dropped[i] ?? Infinity, strength: 0.4 })));
    if (!this.live && tr) {
      for (const f of tr.retro.fires)
        named.push({ at: f.value, strength: joltStrength((tr.retro.thrust.value / tr.retropack.mass.value / G0) * 3) });
    }
    if (this.live && Number.isFinite(this.live.duration)) named.push({ at: this.live.duration, strength: 0.8 });
    const all = this.jolts.slice();
    for (const n of named) {
      if (!Number.isFinite(n.at)) continue;
      const same = all.find((j) => Math.abs(j.at - n.at) < 0.4);
      if (same) same.strength = Math.max(same.strength, n.strength);
      else all.push(n);
    }
    return all;
  }

  /**
   * What reaches an eye at `eye` (the scene's frame) at `t`. `riding`: 0 for an eye that stands on
   * the ground, 1 for one carried with the vehicle.
   */
  felt(t: number, eye: THREE.Vector3, riding: number): Felt {
    const tr = this.flight.trajectory;
    const felt: Felt & { jolts: { since: number; strength: number }[] } = { sound: 0, buffet: 0, load: 1, jolts: [] };
    // (an orbital flight's engines as one: those lit on the ground, sim/staged.ts)
    const engine = tr
      ? { thrust: tr.engine.thrust.value, exhaustSpeed: tr.engine.isp.value * G0 }
      : this.flight.orbital?.ascent
        ? liftoffEngine(this.flight.orbital)
        : null;
    if (!engine || !this.flying) return felt;
    // the engine, as it was when the sound now arriving left it
    const from = new THREE.Vector3();
    let then = t;
    for (let i = 0; i < 3; i++) then = t - this.placeAt(then, from).distanceTo(eye) / SOUND;
    const cutoff = this.cutoff();
    const on = THREE.MathUtils.smoothstep(then, 0, 0.5) * (1 - THREE.MathUtils.smoothstep(then, cutoff, cutoff + 0.5));
    if (on > 0) {
      const pair = this.either(then);
      const height = pair ? pair[0].altitude + (pair[1].altitude - pair[0].altitude) * pair[2] : 0;
      felt.sound = on * soundPressure(engine.thrust, engine.exhaustSpeed, from.distanceTo(eye), atmosphere(height).density);
    }
    if (riding > 0) {
      const pair = this.either(t);
      if (pair) {
        const [a, b, k] = pair;
        const mix = (x: number, y: number): number => x + (y - x) * k;
        felt.buffet = riding * buffetPressure(mix(a.q, b.q), mix(a.mach, b.mach));
        felt.load = 1 + riding * (mix(a.g, b.g) - 1);
      }
      for (const j of this.events()) {
        const since = t - j.at;
        if (since > 0 && since < 3) felt.jolts.push({ since, strength: riding * j.strength });
      }
    }
    return felt;
  }

  /** The camera's displacement at the instant on show, for an eye at `eye`. Also what a walker's own view can add (walk.ts `view`). */
  shakeAt(eye: THREE.Vector3, riding: number): Shake | null {
    if (this.motion <= 0 || !this.flying) return null;
    const felt = this.felt(this.t, eye, riding);
    return still(felt) ? null : shake(this.t, felt, this.motion, this.rate);
  }

  private readonly kept = { p: new THREE.Vector3(), q: new THREE.Quaternion(), sky: new THREE.Quaternion() };
  private readonly turn = new THREE.Quaternion();
  private readonly by = new THREE.Vector3();

  /**
   * Shake `camera` (and turn `sky`, the backdrop's camera, with it) for one draw; what is returned
   * puts both back, so nothing but the draw sees it. Null when there is nothing to shake it.
   */
  shaker(camera: THREE.Camera, sky: THREE.Camera | null, riding: number): (() => void) | null {
    const s = this.shakeAt(camera.position, riding);
    if (!s) return null;
    const kept = this.kept;
    kept.p.copy(camera.position);
    kept.q.copy(camera.quaternion);
    if (sky) kept.sky.copy(sky.quaternion);
    camera.position.add(this.by.set(s.x, s.y, s.z).applyQuaternion(camera.quaternion));
    camera.quaternion.multiply(this.turn.setFromEuler(EULER.set(s.pitch, s.yaw, s.roll, 'YXZ')));
    camera.updateMatrixWorld();
    sky?.quaternion.copy(camera.quaternion);
    return () => {
      camera.position.copy(kept.p);
      camera.quaternion.copy(kept.q);
      camera.updateMatrixWorld();
      sky?.quaternion.copy(kept.sky);
    };
  }

  /** Make what is drawn, and fit it to the model, the first time the vehicle is seen (and again for another model). */
  private fit(group: THREE.Object3D, full: THREE.Object3D, veils?: THREE.Object3D[]): void {
    if (this.fitted === full || !group.parent) return;
    this.dispose();
    this.fitted = full;
    const air = this.flight.flies?.air;
    const into = new THREE.Matrix4().copy(group.matrixWorld).invert();
    /** A node's bounds in the model's own frame, however the model lies now. */
    const boxOf = (pick: (mesh: THREE.Mesh) => boolean, under: THREE.Object3D | undefined): THREE.Box3 => {
      const box = new THREE.Box3();
      under?.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh || !pick(mesh)) return;
        mesh.geometry.computeBoundingBox();
        box.union(mesh.geometry.boundingBox!.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(into, mesh.matrixWorld)));
      });
      return box;
    };
    group.updateMatrixWorld(true);
    const shield = air?.shield ? boxOf(() => true, full.getObjectByName(air.shield)) : null;
    if (shield && !shield.isEmpty() && (this.flight.trajectory?.heating ?? this.flight.orbital?.heating)) {
      const radius = (shield.max.x - shield.min.x) / 2;
      this.shock = new ShockGlow();
      this.shield = shield;
      this.shock.fit(
        new THREE.Vector3((shield.min.x + shield.max.x) / 2, shield.min.y, (shield.min.z + shield.max.z) / 2),
        radius,
        shield.max.y - shield.min.y,
        2.4 * radius,
      );
      group.parent.add(this.shock.mesh);
      veils?.push(this.shock.mesh);
    }
    const shoulder = air?.collar ? boxOf(() => true, full.getObjectByName(air.collar)) : null;
    if (shoulder && !shoulder.isEmpty()) {
      this.collar = new Collar((shoulder.max.x - shoulder.min.x) / 2);
      this.collar.mesh.position.set((shoulder.min.x + shoulder.max.x) / 2, shoulder.max.y, (shoulder.min.z + shoulder.max.z) / 2);
      group.add(this.collar.mesh);
      veils?.push(this.collar.mesh);
    }
    const names = air?.frost ?? [];
    const frost = names.length
      ? boxOf(
          (mesh) => names.includes(((mesh.userData.real as THREE.Material | undefined) ?? (mesh.material as THREE.Material)).name),
          full,
        )
      : null;
    if (frost && !frost.isEmpty()) {
      this.flakes = new Flakes(frost);
      group.parent.add(this.flakes.mesh);
    }
  }

  /**
   * Show everything as it is at `t` (Stage.lift): `group` is the flown model where the run has it,
   * `full` its finest level; `rate` the clock's; `exposure` the renderer's and `sun` the direct
   * light's strength; `veils` is given what is drawn without depth (clouds.ts). True if anything drawn changed.
   */
  set(
    t: number,
    flying: boolean,
    group: THREE.Object3D,
    full: THREE.Object3D,
    rate: number,
    exposure: number,
    sun: number,
    veils?: THREE.Object3D[],
  ): boolean {
    this.t = t;
    this.rate = rate;
    this.flying = flying;
    this.fit(group, full, veils);
    let changed = false;
    const dim = 1 / Math.max(1, exposure / 0.8) ** 0.7; // (as the engine's fire: not a white blot by night)
    const light = Math.min(1, sun / 3 + 0.1);
    const now = flying ? this.thermal(t) : null;
    const heating = this.flight.trajectory?.heating ?? this.flight.orbital?.heating;
    if (this.glow && heating) {
      const cold = heating.starts.value;
      if (this.glow.set(group, now ? now.surfaces.map((s) => s.temperature) : heating.surfaces.map(() => cold), dim)) changed = true;
    }
    const pair = flying ? this.either(t) : null;
    if (this.shock) {
      let glow = 0;
      if (now && pair && group.parent) {
        const [a, b, k] = pair;
        glow = wakeOf(now.flux, now.blunt);
        if (glow > 0 && !this.shock.mesh.visible && this.shield) {
          // as it comes on: how long the body behind the face is now, with what it has shed gone (a stand-in for the model, which the march cannot see)
          let top = this.shield.max.y;
          const into = new THREE.Matrix4().copy(group.matrixWorld).invert();
          const to = new THREE.Matrix4();
          const box = new THREE.Box3();
          // (shown or not is asked of each node under the level, not of the level: it may not be the one drawn this frame)
          const shown = (o: THREE.Object3D | null): boolean => !o || o === full || (o.visible && shown(o.parent));
          full.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (!mesh.isMesh || !shown(mesh)) return;
            mesh.geometry.computeBoundingBox();
            top = Math.max(top, box.copy(mesh.geometry.boundingBox!).applyMatrix4(to.multiplyMatrices(into, mesh.matrixWorld)).max.y);
          });
          const radius = (this.shield.max.x - this.shield.min.x) / 2;
          this.shock.fit(this.shock.faceAt, radius, this.shield.max.y - this.shield.min.y, top - this.shield.min.y);
        }
        if (glow > 0) {
          // which way the air goes past: against the motion over the turning Earth
          const spin = EARTH_ROTATION_RATE * a.t;
          const v = ecefToSiteDirection(this.site, inertialToEcefVelocity(a.r, a.v, spin));
          const w = k > 0 ? ecefToSiteDirection(this.site, inertialToEcefVelocity(b.r, b.v, EARTH_ROTATION_RATE * b.t)) : v;
          const downstream = new THREE.Vector3(v[0] + (w[0] - v[0]) * k, v[1] + (w[1] - v[1]) * k, v[2] + (w[2] - v[2]) * k)
            .negate()
            .normalize();
          this.shock.place(group, downstream);
        }
      }
      if (this.shock.set(glow, now?.gas ?? 0, t, dim)) changed = true;
    }
    if (this.collar) {
      let on = 0;
      if (pair && (pair[0].phase === 'powered' || pair[0].phase === 'coast')) {
        const [a, b, k] = pair;
        on = collarOf(a.mach + (b.mach - a.mach) * k, a.altitude + (b.altitude - a.altitude) * k);
      }
      if (this.collar.set(on, light)) changed = true;
    }
    if (this.flakes?.set(flying ? t : -1, (at, p, q) => this.poseAt(at, group, p, q), light)) changed = true;
    return changed;
  }

  /** Where the model's frame was at `at`: its origin moved as the point flown did, its turn as it is now (ice comes away in the first seconds, when it stands upright). */
  private poseAt(at: number, group: THREE.Object3D, position: THREE.Vector3, quaternion: THREE.Quaternion): void {
    const now = this.placeAt(this.t, new THREE.Vector3());
    this.placeAt(at, position).sub(now).add(group.position);
    quaternion.copy(group.quaternion);
  }

  dispose(): void {
    for (const each of [this.shock, this.collar, this.flakes]) {
      each?.mesh.removeFromParent();
      each?.dispose();
    }
    this.shock = this.collar = this.flakes = null;
    this.fitted = null;
  }
}

const EULER = new THREE.Euler();

/**
 * Ice off a cold tank at liftoff: the frost that has grown on it comes away in plates as the
 * vehicle shakes and starts to move, and falls behind. A few dozen small white plates, each let go
 * at its own moment in the first seconds from its own place on the tank, falling at a plate's
 * fluttering few metres a second and drifting outward, turning as it goes. A drawing: how much ice
 * there was and how it fell is not in the record. Every plate's path is a function of the clock's
 * time, so the same instant shows the same fall.
 */
class Flakes {
  readonly mesh: THREE.InstancedMesh;
  private readonly band: THREE.Box3;
  private readonly material: THREE.ShaderMaterial;
  private readonly m = new THREE.Matrix4();
  private readonly p = new THREE.Vector3();
  private readonly q = new THREE.Quaternion();
  private readonly at = new THREE.Vector3();
  private readonly spin = new THREE.Quaternion();
  private readonly size = new THREE.Vector3();

  /** `band`: the frosted skin's bounds in the model's own frame. */
  constructor(band: THREE.Box3) {
    this.band = band;
    this.material = new THREE.ShaderMaterial({
      name: 'frost-flakes',
      uniforms: { uLight: { value: 1 } },
      vertexShader: /* glsl */ `
        varying float vFace;
        void main() {
          vec4 mv = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          vFace = abs(normalize(normalMatrix * mat3(instanceMatrix) * normal).z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uLight;
        varying float vFace;
        void main() { gl_FragColor = vec4(vec3(0.86, 0.91, 0.97) * uLight * mix(0.72, 1.0, step(0.5, vFace)), 1.0); }`,
      side: THREE.DoubleSide,
    });
    // a plate: a flat six-sided chip
    this.mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.5, 0.12, 6), this.material, FLAKES);
    this.mesh.name = 'FrostFlakes';
    this.mesh.frustumCulled = false;
    this.mesh.raycast = () => {};
    this.mesh.visible = false;
    this.mesh.count = 0;
  }

  /** Show the fall at `t` (under 0: none). `pose` gives the model's frame as it was at a moment. True if what is drawn changed. */
  set(t: number, pose: (at: number, position: THREE.Vector3, quaternion: THREE.Quaternion) => void, light: number): boolean {
    const was = this.mesh.visible;
    if (!(t > 0) || t > SHEDS + FALLS) {
      this.mesh.visible = false;
      return was;
    }
    const band = this.band;
    const radius = (band.max.x - band.min.x) / 2;
    const [cx, cz] = [(band.min.x + band.max.x) / 2, (band.min.z + band.max.z) / 2];
    let shown = 0;
    for (let i = 0; i < FLAKES; i++) {
      // most of it comes away as the engine lights and the vehicle first moves
      const born = SHEDS * hash(i, 1) ** 2;
      const age = t - born;
      if (age <= 0 || age >= FALLS) continue;
      const round = hash(i, 2) * Math.PI * 2;
      pose(born, this.p, this.q);
      const [ox, oz] = [Math.cos(round), Math.sin(round)];
      // it slides down the skin, then is clear of it: a plate falls at 3 to 6 m/s once it flutters, reached in about a second
      const terminal = 3 + 3 * hash(i, 3);
      const fallen = terminal * (age - (1 - Math.exp(-age * 1.6)) / 1.6);
      const out = 0.05 + (0.5 + 1.2 * hash(i, 4)) * age * (1 - Math.exp(-age));
      const sway = 0.25 * Math.sin(age * (2 + 2 * hash(i, 5)) + hash(i, 6) * 6.28) * Math.min(1, age);
      this.at
        .set(
          cx + ox * (radius + out) - oz * sway,
          band.min.y + (band.max.y - band.min.y) * hash(i, 7),
          cz + oz * (radius + out) + ox * sway,
        )
        .applyQuaternion(this.q)
        .add(this.p);
      this.at.y -= fallen;
      this.spin.setFromEuler(EULER.set(age * (2 + 3 * hash(i, 8)) + round, round, age * (1.5 + 3 * hash(i, 9)), 'XYZ'));
      const across = (0.08 + 0.18 * hash(i, 10) ** 2) * (1 - THREE.MathUtils.smoothstep(age, FALLS - 1, FALLS));
      this.mesh.setMatrixAt(shown++, this.m.compose(this.at, this.spin, this.size.set(across, across * 0.5, across)));
    }
    this.mesh.count = shown;
    this.mesh.visible = shown > 0;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.material.uniforms.uLight!.value = light;
    return this.mesh.visible || was;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.mesh.dispose();
  }
}

/** A fixed number from 0 to 1 for flake `i`'s `k`th property. */
function hash(i: number, k: number): number {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
}
