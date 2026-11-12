import * as THREE from 'three';
import { prefs } from '../prefs.ts';
import type { Phase } from '../sim/fly.ts';
import { type Burn, type PathPlace, type Prediction, type Predictor, predictor, programmeAxis } from '../sim/predict.ts';
import type { Flight } from '../types';
import { EARTH_ROTATION_RATE } from '../world/bodies.ts';
import {
  ecefToSite,
  ecefToSiteDirection,
  geodeticToEcef,
  inertialToEcef,
  length,
  type Site,
  siteFrame,
  type Vec3,
} from '../world/frames.ts';
import { uOrigin } from './origin.ts';

/**
 * The predicted path, drawn: where the vehicle goes from here if nothing more is done
 * (sim/predict.ts), as a line over the Earth with its apogee and its end named.
 *
 * The line is a ribbon of constant width on the screen, whatever its distance: an amber core with
 * a soft edge, the part still under power broken into dashes, the part behind the Earth faint. It
 * is an instrument's line, not a thing in the world: it is not lit, fogged or hidden by anything
 * but the Earth's own bulk (a sphere through the site's sea, tested for each point against the ray
 * from the eye), and it keeps its colour whatever the hour's exposure.
 *
 * Frames. The prediction is in the simulator's frame, which does not turn. `surface` draws each
 * point where it will be over the ground at its own instant (the Earth turned to that instant,
 * then the site's frame, as viewer/ascent.ts places the vehicle): the path over the turning
 * Earth, which meets the sea where the vehicle will. `orbit` draws the path as it lies in the
 * frame that does not turn, seen now: every point with the Earth turned to this instant, so the
 * line is the orbit's own shape and the ground slides under it. The mesh is built once for a
 * prediction and, in `orbit`, turned about the Earth's axis as the clock goes on.
 *
 * The path is the centre of mass's, and the model is drawn with its centre of mass where the
 * simulator has it (viewer/ascent.ts), so the line leaves the vehicle from inside it.
 *
 * Drawn from the eye (origin.ts): points are kept in doubles and given to the GPU as offsets from
 * the path's first point, where the mesh stands, so the line is exact at the vehicle.
 *
 * The work is kept off the frame: a prediction is begun at most five times a second and worked
 * out in slices of `SLICE` milliseconds, one a frame, until it is done.
 */

/** The most points drawn. */
const MOST = 512;
/** Milliseconds of prediction worked in one frame, and the least time between one prediction's end and the next's beginning. */
const SLICE = 1.5;
const EVERY = 200;
/** Half the ribbon's width, CSS pixels: the line itself is the middle fifth of it. */
const HALF = 8;

const VERT = /* glsl */ `
  #include <common>
  attribute vec3 aAlong;      // the path's direction there
  attribute float aSide;      // -1 or 1: which edge of the ribbon
  attribute float aT;         // seconds from the prediction's start
  uniform vec2 uView;         // the frame's size, pixels
  uniform float uHalf;        // half the ribbon's width, pixels
  uniform vec3 uEarth;        // the Earth's centre in the scene's frame
  uniform float uRadius;      // and its radius at the site's sea
  uniform vec3 uShip;         // where the vehicle is now, in the mesh's own frame
  varying float vSide, vT, vHide, vClear;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vec3 from = world.xyz - cameraPosition;
    vec4 here = projectionMatrix * viewMatrix * world;
    vSide = aSide;
    vT = aT;
    // The line keeps off the vehicle: nothing of it within a few lengths of the ship on the screen, then it comes in
    // gently. Measured in pixels from the ship (so it holds at any zoom), or, where the path runs toward or away from
    // the eye and so stays behind the ship on the screen, by how far along it is against how far off the eye is.
    vec4 shipWorld = modelMatrix * vec4(uShip, 1.0);
    vec4 ship = projectionMatrix * viewMatrix * shipWorld;
    float px = ship.w > 0.0 && here.w > 0.0 ? length((here.xy / here.w - ship.xy / ship.w) * uView * 0.5) : 1e6;
    float off = distance(world.xyz, shipWorld.xyz) / max(distance(shipWorld.xyz, cameraPosition), 1.0);
    vClear = max(smoothstep(3.5, 9.0, px / uHalf), smoothstep(0.5, 1.2, off));
    // Which way the path runs on the screen, from a point a short way along it. Worked in clip space without dividing:
    // for a straight line this vector is the same at every point of it, in front of the eye or behind, so a stretch
    // that passes the eye (the path often leaves toward a chase camera) is clipped by the GPU and keeps its width.
    vec3 along = normalize(mat3(modelMatrix) * aAlong);
    vec4 there = projectionMatrix * viewMatrix * vec4(world.xyz + along * max(0.5, 0.02 * length(from)), 1.0);
    vec2 run = (there.xy * here.w - here.xy * there.w) * uView;
    float len = length(run);
    run = len > 1e-9 ? run / len : vec2(1.0, 0.0);
    here.xy += vec2(-run.y, run.x) * aSide * uHalf / uView * 2.0 * here.w;
    here.z = 0.0;             // depth is not asked of it, and no far plane cuts it short: it is clipped only where it passes the eye
    gl_Position = here;
    // behind the Earth: the ray from the eye to this point passes inside it (drawn from the eye, so the eye is uOrigin)
    vec3 centre = uEarth - uOrigin - cameraPosition;
    float k = clamp(dot(centre, from) / max(dot(from, from), 1e-6), 0.0, 1.0);
    vHide = 1.0 - smoothstep(uRadius - 14000.0, uRadius - 2000.0, length(centre - from * k));
  }`;

const FRAG = /* glsl */ `
  uniform vec3 uColour;
  uniform float uNow, uCut, uOpacity;
  varying float vSide, vT, vHide, vClear;
  void main() {
    if (vT < uNow) discard;
    float across = abs(vSide);
    float core = 1.0 - smoothstep(0.14, 0.26, across);
    float glow = 0.34 * (1.0 - across) * (1.0 - across);
    float a = max(core, glow);
    a *= smoothstep(uNow, uNow + 0.25, vT) * vClear;                    // it comes in ahead of the vehicle, clear of it
    if (vT < uCut) {
      float dash = fract(vT / 3.0);                                     // under power: dashes, three seconds of flight each
      a *= mix(0.2, 1.0, smoothstep(0.0, 0.04, dash) * (1.0 - smoothstep(0.6, 0.64, dash)));
    }
    a *= mix(1.0, 0.14, vHide) * uOpacity;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColour * (0.8 + 0.3 * core), a);
  }`;

/** What draws it in the scene and says where a point of the scene is on the page (viewer/stage.ts). */
export interface PathHost {
  /** Put something in the scene, over the flight; given again, it has changed and the frame is to be drawn again. */
  overlay(object: THREE.Object3D): void;
  screenOf(point: THREE.Vector3): { x: number; y: number } | null;
}

/** A sample of the flight as the flight deck shows it (sim/vehicle.ts: LiveSample), and the live state it came from, or null when looking back. */
export interface PathSample {
  t: number;
  r: Vec3;
  v: Vec3;
  mass: number;
  phase: Phase;
  centre?: Vec3;
}
export interface PathSource {
  readonly active: boolean;
  /** The vehicle's programme and launch axes (sim/vehicle.ts: Vehicle), and how guidance is set. */
  readonly craft: { programme(t: number): Vec3; launch: { downrange: Vec3; left: Vec3 } } | null;
  readonly steering: { guidance: boolean; trim: { pitch: number; yaw: number } };
  listen(fn: (sample: PathSample, live: { ignited: boolean; cutoff: boolean } | null) => void): void;
}

const clock = (seconds: number): string => {
  const s = Math.max(0, Math.round(seconds));
  return s >= 3600
    ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
    : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
const km = (m: number): string => (m / 1000).toFixed(Math.abs(m) < 99_950 ? 1 : 0);

export class FlightPath {
  readonly mesh: THREE.Mesh;
  private readonly geometry = new THREE.BufferGeometry();
  private readonly material: THREE.ShaderMaterial;
  private readonly position = new Float32Array(MOST * 2 * 3);
  private readonly along = new Float32Array(MOST * 2 * 3);
  private readonly at = new Float32Array(MOST * 2);
  private readonly flight: Flight;
  private readonly site: Site;
  private readonly source: PathSource;
  private readonly host: PathHost;
  private readonly labels: HTMLElement;
  private readonly readout: HTMLElement;
  private readonly button: HTMLElement | null;
  /** The Earth's centre and axis in the site's frame. */
  private readonly centre: THREE.Vector3;
  private readonly axis: THREE.Vector3;

  private on = !prefs.get('pathOff');
  private guided = prefs.get('pathGuided');
  private frame: 'surface' | 'orbit' = 'surface';
  /** The sample on show, the live state's part in it, and what the prediction on show was made from. */
  private sample: PathSample | null = null;
  private live: { ignited: boolean; cutoff: boolean } | null = null;
  private job: { run: Predictor; key: string } | null = null;
  private shown: { key: string; result: Prediction; frame: 'surface' | 'orbit' } | null = null;
  private doneAt = 0;
  private raf = 0;
  /** The first point of the path on show, in the scene's frame (surface: where the Earth has it then; orbit: at the prediction's start). */
  private readonly anchor = new THREE.Vector3();
  private readonly pins: { el: HTMLElement; point: THREE.Vector3 | null }[] = [];
  /** What the last prediction cost, for whoever asks (`sr.path.cost`): milliseconds in all, the longest slice, and how many frames it was spread over. */
  cost = { ms: 0, slice: 0, frames: 0, steps: 0 };
  private spent = { slice: 0, frames: 0 };

  /**
   * `parent` takes the labels; `readout` is where the figures go (beside the navball); `button` is the flight deck's
   * switch for the path, if it has one.
   */
  constructor(parent: HTMLElement, readout: HTMLElement, source: PathSource, flight: Flight, host: PathHost, button?: HTMLElement | null) {
    this.flight = flight;
    this.source = source;
    this.host = host;
    this.site = siteFrame(flight.site);
    this.button = button ?? null;
    this.centre = new THREE.Vector3(...ecefToSite(this.site, [0, 0, 0]));
    this.axis = new THREE.Vector3(...ecefToSiteDirection(this.site, [0, 0, 1]));

    const g = this.geometry;
    g.setAttribute('position', new THREE.BufferAttribute(this.position, 3));
    g.setAttribute('aAlong', new THREE.BufferAttribute(this.along, 3));
    g.setAttribute('aT', new THREE.BufferAttribute(this.at, 1));
    const side = new Float32Array(MOST * 2);
    const index: number[] = [];
    for (let i = 0; i < MOST; i++) {
      side[2 * i] = -1;
      side[2 * i + 1] = 1;
      if (i < MOST - 1) index.push(2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2);
    }
    g.setAttribute('aSide', new THREE.BufferAttribute(side, 1));
    g.setIndex(index);
    g.setDrawRange(0, 0);
    const sea = geodeticToEcef({ latitude: this.site.latitude, longitude: this.site.longitude, height: flight.site.seaLevel.value });
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uOrigin,
        uView: { value: new THREE.Vector2(1, 1) },
        uHalf: { value: HALF },
        uEarth: { value: this.centre },
        uRadius: { value: length(sea) },
        uColour: { value: new THREE.Color() },
        uNow: { value: 0 },
        uShip: { value: new THREE.Vector3() },
        uCut: { value: -1 },
        uOpacity: { value: 0.95 },
      },
      transparent: true,
      depthWrite: false,
      depthFunc: THREE.AlwaysDepth, // nothing in the scene hides it: only the Earth's bulk, worked out for each point
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, this.material);
    this.mesh.name = 'Predicted path';
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 4; // after the fire and the trail
    this.mesh.raycast = () => {}; // not a thing to pick
    this.mesh.visible = false;
    const size = new THREE.Vector2();
    // the page's amber (#ffc46b), in the frame's linear light
    const amber = new THREE.Color(0xffc46b);
    this.mesh.onBeforeRender = (renderer) => {
      renderer.getDrawingBufferSize(size);
      (this.material.uniforms.uView!.value as THREE.Vector2).copy(size);
      this.material.uniforms.uHalf!.value = HALF * renderer.getPixelRatio();
      // the frame is exposed for the hour (daysky.ts) after this is drawn: the line is given what comes out as amber whatever that is
      (this.material.uniforms.uColour!.value as THREE.Color).copy(amber).multiplyScalar(0.9 / Math.max(0.05, renderer.toneMappingExposure));
    };

    this.labels = document.createElement('div');
    this.labels.className = 'path-labels';
    this.labels.hidden = true;
    this.labels.innerHTML = '<p class="path-label" data-pin="apogee"></p><p class="path-label" data-pin="end"></p>';
    parent.append(this.labels);
    for (const el of this.labels.querySelectorAll<HTMLElement>('[data-pin]')) this.pins.push({ el, point: null });

    this.readout = document.createElement('div');
    this.readout.className = 'path-read';
    this.readout.innerHTML = `
      <button data-path="kind" title="Which future the path shows while the engine burns: if it stopped now, or if guidance flies the rest of the programme to the record's cutoff"><kbd>K</kbd> <b data-path-cell="kind"></b></button>
      <p title="The greatest height ahead, above the sea, and how long until it"><span>Ap</span><b data-path-cell="apogee">–</b></p>
      <p data-path-row="end"><span data-path-cell="endName">Impact</span><b data-path-cell="end">–</b></p>
      <p class="path-frame" data-path-cell="frame"></p>`;
    readout.append(this.readout);
    this.readout.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('[data-path=kind]')) this.setGuided(!this.guided);
    });
    this.button?.addEventListener('click', () => this.show(!this.on));
    window.addEventListener('keydown', (e) => {
      const typing = (e.target as HTMLElement).matches?.('input:not([type=range]), textarea');
      if (!source.active || e.repeat || e.metaKey || e.ctrlKey || e.altKey || typing) return;
      const key = e.key.toLowerCase();
      if (key === 'm') this.show(!this.on);
      if (key === 'k') this.setGuided(!this.guided);
    });
    source.listen((sample, live) => {
      this.sample = sample;
      this.live = live;
      this.wake();
    });
    this.show(this.on, false);
    this.setGuided(this.guided, false);
  }

  /** Whether the path is drawn. */
  get showing(): boolean {
    return this.on;
  }

  /** The prediction on show, if there is one. */
  get prediction(): Prediction | null {
    return this.shown?.result ?? null;
  }

  /** Draw the path, or put it away. Remembered. */
  show(on: boolean, remember = true): void {
    this.on = on;
    if (remember) prefs.set('pathOff', !on);
    this.button?.setAttribute('aria-pressed', String(on));
    this.readout.classList.toggle('off', !on);
    this.wake();
  }

  /** While the engine burns: the path if guidance flies the rest of the programme (true), or if the engine stopped now. Remembered. */
  setGuided(on: boolean, remember = true): void {
    this.guided = on;
    if (remember) prefs.set('pathGuided', on);
    this.wake();
  }

  /** Surface: the path over the turning Earth. Orbit: the path in the frame that does not turn. */
  setFrame(frame: 'surface' | 'orbit'): void {
    if (frame === this.frame) return;
    this.frame = frame;
    if (this.shown) this.build(this.shown.result);
    this.wake();
  }

  private wake(): void {
    if (!this.raf) this.raf = requestAnimationFrame(() => this.tick());
  }

  /** Which future is to be shown from the sample on show: null for none (off, not flying, down). */
  private want(): { key: string; burn: Burn | null } | null {
    const s = this.sample;
    const tr = this.flight.trajectory;
    if (!s || !tr || !this.on || !this.source.active || s.phase === 'landed') return null;
    const craft = this.source.craft;
    const { trim } = this.source.steering;
    const until = tr.engine.cutoff.value;
    const waiting = this.live !== null && !this.live.ignited;
    const burning = this.live?.ignited === true && !this.live.cutoff;
    // on the pad there is only the plan to show; in the air, whichever was asked for while there is an engine to burn
    const plan = craft !== null && s.t < until && (waiting || (burning && this.guided));
    if (waiting && !plan) return null;
    return {
      key: `${s.t}|${plan ? `g${trim.pitch}|${trim.yaw}` : 'c'}`,
      burn: plan ? { axis: (t) => programmeAxis(craft, t, trim), until } : null,
    };
  }

  /** A frame: a slice of the prediction being worked out, a new one begun if it is time, and the line and its labels put where they are. */
  private tick(): void {
    this.raf = 0;
    const want = this.want();
    const s = this.sample;
    if (!want || !s) {
      this.job = null;
      if (this.shown || this.mesh.visible) {
        this.shown = null;
        this.mesh.visible = false;
        this.labels.hidden = true;
        this.host.overlay(this.mesh);
      }
      this.say(null);
      return; // (asleep until the next sample, or a switch)
    }
    this.raf = requestAnimationFrame(() => this.tick());
    const tr = this.flight.trajectory!;
    if (!this.job && this.shown?.key !== want.key && performance.now() - this.doneAt >= EVERY) {
      const start = { t: s.t, r: s.centre ?? s.r, v: s.v, mass: s.mass, phase: s.phase };
      const options = { points: MOST - 32, ...(want.burn ? { burn: want.burn } : {}) };
      this.job = { run: predictor(tr, this.site, this.flight.site.seaLevel.value, start, options), key: want.key };
      this.spent = { slice: 0, frames: 0 };
    }
    if (this.job) {
      const began = performance.now();
      const done = this.job.run.run(SLICE);
      this.spent.slice = Math.max(this.spent.slice, performance.now() - began);
      this.spent.frames++;
      if (done) {
        const result = this.job.run.result;
        this.cost = { ms: result.cost, slice: this.spent.slice, frames: this.spent.frames, steps: result.steps };
        this.shown = { key: this.job.key, result, frame: this.frame };
        this.job = null;
        this.doneAt = performance.now();
        this.build(result);
      }
    }
    this.place(s.t);
  }

  /** A point of the prediction in the scene's frame: over the ground at its own instant, or (orbit) with the Earth as it was at the prediction's start. */
  private point(r: Vec3, t: number, from: number, into: THREE.Vector3): THREE.Vector3 {
    const turned = EARTH_ROTATION_RATE * (this.frame === 'orbit' ? from : t);
    return into.set(...ecefToSite(this.site, inertialToEcef(r, turned)));
  }

  /** Lay the mesh along a prediction. */
  private build(result: Prediction): void {
    const points = result.points;
    const n = result.outcome === 'none' ? 0 : Math.min(MOST, points.length);
    if (this.shown) this.shown.frame = this.frame;
    const at: THREE.Vector3[] = [];
    for (let i = 0; i < n; i++) at.push(this.point(points[i]!.r, points[i]!.t, result.from, new THREE.Vector3()));
    if (n > 0) this.anchor.copy(at[0]!);
    const run = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      run.subVectors(at[Math.min(n - 1, i + 1)]!, at[Math.max(0, i - 1)]!).normalize();
      const off = at[i]!.clone().sub(this.anchor);
      for (const k of [2 * i, 2 * i + 1]) {
        off.toArray(this.position, k * 3);
        run.toArray(this.along, k * 3);
        this.at[k] = points[i]!.t - result.from;
      }
    }
    for (const name of ['position', 'aAlong', 'aT']) this.geometry.getAttribute(name).needsUpdate = true;
    this.geometry.setDrawRange(0, Math.max(0, n - 1) * 6);
    this.material.uniforms.uCut!.value = result.cutoff === null ? -1 : result.cutoff - result.from;
    const pin = (i: number, place: PathPlace | null): void => {
      this.pins[i]!.point = place ? this.point(place.r, place.t, result.from, new THREE.Vector3()) : null;
    };
    pin(0, result.apogee);
    pin(1, result.outcome === 'orbit' ? result.perigee : result.impact);
    this.host.overlay(this.mesh);
  }

  /** Each frame: the line cut off at the vehicle, turned with the Earth if it is the orbit's, and the labels on their points. */
  private place(now: number): void {
    const shown = this.shown;
    const seen = shown !== null && shown.result.outcome !== 'none' && shown.result.points.length > 1;
    if (this.mesh.visible !== seen) {
      this.mesh.visible = seen;
      this.host.overlay(this.mesh);
    }
    this.labels.hidden = !seen;
    if (!seen || !shown) {
      this.say(shown?.result ?? null);
      return;
    }
    const result = shown.result;
    const u = this.material.uniforms;
    if (u.uNow!.value !== now - result.from) {
      u.uNow!.value = now - result.from;
      // where on the line the vehicle is now: between the two points either side of this instant
      const ship = u.uShip!.value as THREE.Vector3;
      const count = this.geometry.drawRange.count / 6 + 1;
      let i = 0;
      while (i < count - 2 && this.at[2 * (i + 1)]! <= now - result.from) i++;
      const [t0, t1] = [this.at[2 * i]!, this.at[2 * (i + 1)] ?? this.at[2 * i]!];
      const k = t1 > t0 ? Math.min(1, Math.max(0, (now - result.from - t0) / (t1 - t0))) : 0;
      ship.fromArray(this.position, 6 * i).lerp(new THREE.Vector3().fromArray(this.position, 6 * Math.min(count - 1, i + 1)), k);
      this.host.overlay(this.mesh);
    }
    // the orbit's path lies still among the stars: the scene's frame turns with the Earth, so here the path turns back
    const turn = this.frame === 'orbit' ? -EARTH_ROTATION_RATE * (now - result.from) : 0;
    this.mesh.quaternion.setFromAxisAngle(this.axis, turn);
    const carried = (p: THREE.Vector3): THREE.Vector3 => p.clone().sub(this.centre).applyQuaternion(this.mesh.quaternion).add(this.centre);
    this.mesh.position.copy(carried(this.anchor));

    this.say(result, now);
    const texts = [
      result.apogee && result.apogee.t > now ? `<b>Ap</b> ${km(result.apogee.altitude)} km <i>in ${clock(result.apogee.t - now)}</i>` : '',
      result.outcome === 'orbit'
        ? result.perigee
          ? `<b>Pe</b> ${km(result.perigee.altitude)} km <i>in ${clock(result.perigee.t - now)}</i>`
          : ''
        : result.impact
          ? `<b>Impact</b> ${km(result.impact.range)} km downrange <i>in ${clock(result.impact.t - now)}</i>`
          : '',
    ];
    this.pins.forEach((pin, i) => {
      const where = pin.point && texts[i] ? this.host.screenOf(carried(pin.point)) : null;
      const inside = where !== null && where.x > 0 && where.x < window.innerWidth && where.y > 0 && where.y < window.innerHeight;
      pin.el.hidden = !inside;
      if (!inside || !where) return;
      if (pin.el.innerHTML !== texts[i]) pin.el.innerHTML = texts[i]!;
      pin.el.style.transform = `translate(${Math.round(where.x)}px, ${Math.round(where.y)}px)`;
      // near the right edge the words go to the left of the mark
      pin.el.classList.toggle('left', where.x > window.innerWidth - 230);
    });
  }

  /** The figures beside the navball: which future, the apogee, how it ends, and which frame the line is drawn in. */
  private say(result: Prediction | null, now = 0): void {
    const set = (id: string, text: string) => {
      const el = this.readout.querySelector<HTMLElement>(`[data-path-cell=${id}]`)!;
      if (el.textContent !== text) el.textContent = text;
    };
    const burning = this.live?.ignited === true && !this.live.cutoff;
    const waiting = this.live !== null && !this.live.ignited;
    const kind = this.readout.querySelector<HTMLButtonElement>('[data-path=kind]')!;
    kind.disabled = !burning;
    set(
      'kind',
      !this.on
        ? 'Path off'
        : waiting
          ? 'As guidance will fly it'
          : burning
            ? this.guided
              ? 'If guidance flies on'
              : 'If the engine stopped now'
            : this.live
              ? 'As it coasts'
              : 'As it coasted from here',
    );
    set('frame', this.frame === 'orbit' ? 'Drawn in the frame that does not turn' : 'Drawn over the turning Earth');
    if (!result || result.outcome === 'none') {
      set('apogee', '–');
      set('endName', 'Impact');
      set('end', '–');
      return;
    }
    set('apogee', result.apogee && result.apogee.t > now ? `${km(result.apogee.altitude)} km · ${clock(result.apogee.t - now)}` : 'passed');
    if (result.outcome === 'orbit' && result.orbit) {
      set('endName', 'Orbit');
      set('end', `${(result.orbit.period / 60).toFixed(1)} min${result.perigee ? ` · Pe ${km(result.perigee.altitude)} km` : ''}`);
    } else if (result.impact) {
      set('endName', 'Impact');
      set('end', `${km(result.impact.range)} km · ${clock(result.impact.t - now)}`);
    } else {
      set('endName', 'End');
      set('end', 'not within six hours');
    }
  }
}
