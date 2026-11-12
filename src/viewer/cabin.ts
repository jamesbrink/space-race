import * as THREE from 'three';
import { flownOnce, type Sample, sampleAt } from '../sim/fly.ts';
import type { LiveSample, VehicleState } from '../sim/vehicle.ts';
import type { CabinDef, ModelDef, Signal, SitedFlight } from '../types.ts';
import { siteFrame } from '../world/frames.ts';
import { attitudeOf, drumAt, type Readings, ratesOf, type Signals, scaleAt, signalsAt } from './gauges.ts';

/**
 * A model's inside as somewhere to be (`ModelDef.cabin`): its instruments read the flight at the clock's instant,
 * its lamps tell what has happened, its controls can be worked, its lights light it, and its periscope shows what
 * is outside. All of it is the flight's data and the model's own nodes; nothing here knows a spacecraft.
 *
 * Instruments. A needle is a node of the model with its origin on its pivot. Its scale is in its extras, written by
 * the script that drew its face (gauges.ts reads it); the flight says which quantity it shows. It is turned from
 * where it was built (`rest`, the value its face was drawn pointing at) and eased, so a figure that steps does not
 * make a needle jump. The readings come from the run on show: the flight being flown (the flight deck hands every
 * sample over: `fly`), or the record's (sim/fly.ts flownOnce) at the clock's instant. Attitude is read off the model
 * itself as the scene has it, so the needles and the view out of the window cannot disagree.
 *
 * Light. The meshes under `within` are indoors: the sky's light and its reflection are taken off them (all but what
 * would come in at the windows), and the model's own lamps
 * (`ModelDef.lights`) are held at a strength that reads the same whatever the exposure outside. The Sun is not
 * faked: what comes through a window is the scene's own light and shadow.
 *
 * The periscope. Its objective's whole field (most of a hemisphere) is drawn into a cube map from where the
 * objective is, a face or two a frame and only while someone is aboard, and laid on the screen through a fisheye:
 * the angle off the axis is the distance from the middle of the screen. The clouds' volume and the ink line are not
 * in it: it is the scene's geometry and sky only.
 */

/** What the stage gives a cabin to work with. */
export interface CabinHost {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  /** Draw from the eye, wherever the camera has been put (viewer/origin.ts). */
  draw(render: () => void): void;
  /** The sky: its own scene and camera, drawn first. */
  sky(): { scene: THREE.Scene; camera: THREE.PerspectiveCamera };
  /** The plumb line at a place in the scene. */
  upAt(p: THREE.Vector3, out: THREE.Vector3): THREE.Vector3;
  /** Something on screen has changed. */
  redraw(): void;
}

/** Something in the cabin the pointer can be on: what it is called, what is said of it, and the node. */
export interface CabinThing {
  label: string;
  about: string | null;
  object: THREE.Object3D;
  /** What working it asks of the flight deck (CabinDef.controls[].does), if it is a control that does something. */
  does?: string;
  /** It is something to look out through: a window's pane or the periscope's screen. */
  lookout?: 'pane' | 'screen';
  /** For a pane: where on it, and the way it faces (toward whoever looks). */
  point?: THREE.Vector3;
  normal?: THREE.Vector3;
}

interface Needle {
  node: THREE.Object3D;
  home: THREE.Quaternion;
  at: THREE.Vector3;
  turn?: number[];
  slide?: number[];
  drum?: number;
  place: number;
  wrap: number;
  rest: number;
  reads?: string;
  per: number;
  value?: number;
  /** Where it is, in its scale's own units of position, and where it is going. */
  now: number;
  goal: number;
}

interface Lamp {
  meshes: THREE.Mesh[];
  shows?: Signal;
  colour: THREE.Color;
  lit: number;
}

const FACE = 1024; // pixels along a face of the periscope's cube
const NEEDLE_TAU = 0.12; // seconds: how quickly a needle follows its reading
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_X = new THREE.Vector3(1, 0, 0);
const q = new THREE.Quaternion();
const v = new THREE.Vector3();
const m4 = new THREE.Matrix4();

export class Cabin {
  private readonly def: CabinDef;
  private readonly host: CabinHost;
  private readonly flight: SitedFlight;
  /** The model as it stands in the scene, and its full level of detail (the only one with an inside). */
  private readonly group: THREE.Object3D;
  private readonly needles: Needle[] = [];
  private readonly lamps: Lamp[] = [];
  private readonly things: { thing: CabinThing; reach: number; at: THREE.Vector3 }[] = [];
  private readonly lights: { light: THREE.PointLight; base: number }[];
  private stick: { node: THREE.Object3D; home: THREE.Quaternion; now: THREE.Vector3 } | null = null;
  private readonly worked: { node: THREE.Object3D; home: THREE.Vector3; by: THREE.Vector3; t: number }[] = [];

  private readings: Readings = {};
  private signals: Signals = { ready: true };
  private hand = { pitch: 0, yaw: 0, roll: 0 };
  /** When each thing happened on the flight being flown, as its states said so. */
  private times: Partial<Record<Signal, number>> = {};
  private live = false;
  private sample: Sample | LiveSample | null = null;
  private readonly last = { q: new THREE.Quaternion(), t: Number.NaN };
  private readonly rates = new THREE.Vector3();
  private aboard = false;

  private scope: {
    screen: THREE.Mesh;
    material: THREE.ShaderMaterial;
    target: THREE.WebGLCubeRenderTarget;
    cube: THREE.CubeCamera;
    at: THREE.Vector3;
    axis: THREE.Vector3;
    up: THREE.Vector3;
    next: number;
    owed: number;
    power: number;
  } | null = null;

  constructor(
    host: CabinHost,
    flight: SitedFlight,
    model: ModelDef,
    group: THREE.Object3D,
    full: THREE.Object3D,
    lights: THREE.PointLight[],
  ) {
    this.host = host;
    this.flight = flight;
    this.def = model.cabin!;
    this.group = group;
    // (a floodlight's reflector spreads its light: it falls off with distance, not its square, or what is near it burns)
    for (const light of lights) light.decay = 1;
    this.lights = lights.map((light) => ({ light, base: light.intensity }));
    full.updateWorldMatrix(true, true);
    const toModel = new THREE.Matrix4().copy(group.matrixWorld).invert();
    const find = (name: string): THREE.Object3D | null => full.getObjectByName(name) ?? null;
    /** Where a node is, in the model's frame: its own origin if it has one, else the middle of what it is. */
    const where = (node: THREE.Object3D): THREE.Vector3 => {
      const own = node.position.lengthSq() > 1e-10;
      const p = own ? node.getWorldPosition(new THREE.Vector3()) : new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
      return p.applyMatrix4(toModel);
    };
    const name = (node: THREE.Object3D, label: string, about: string, more: Partial<CabinThing> = {}): void => {
      const reach = typeof node.userData.reach === 'number' ? node.userData.reach : 0.03;
      this.things.push({ thing: { label, about, object: node, ...more }, reach: Math.max(0.012, reach), at: where(node) });
    };

    for (const i of this.def.instruments) {
      const node = find(i.node);
      if (!node) continue;
      const u = node.userData as { turn?: number[]; slide?: number[]; drum?: number; place?: number; wrap?: number; rest?: number };
      const needle: Needle = {
        node,
        home: node.quaternion.clone(),
        at: node.position.clone(),
        place: u.place ?? 0,
        wrap: u.wrap ?? 0,
        rest: u.rest ?? 0,
        per: i.per ?? 1,
        now: Number.NaN,
        goal: 0,
        ...(u.turn ? { turn: [...u.turn] } : {}),
        ...(u.slide ? { slide: [...u.slide] } : {}),
        ...(u.drum ? { drum: u.drum } : {}),
        ...(i.reads ? { reads: i.reads } : {}),
        ...(i.value !== undefined ? { value: i.value } : {}),
      };
      this.needles.push(needle);
      name(node, i.name, i.about);
    }
    for (const l of this.def.lamps ?? []) {
      const node = find(l.node);
      if (!node) continue;
      const meshes: THREE.Mesh[] = [];
      node.traverse((o) => (o as THREE.Mesh).isMesh && meshes.push(o as THREE.Mesh));
      this.lamps.push({ meshes, colour: new THREE.Color(l.colour ?? 0x7dff9a), lit: -1, ...(l.shows ? { shows: l.shows } : {}) });
      name(node, l.name, l.about);
    }
    for (const c of this.def.controls ?? []) {
      const node = find(c.node);
      if (node) name(node, c.name, c.about, c.does ? { does: c.does } : {});
    }
    const stick = this.def.stick && find(this.def.stick.node);
    if (stick) this.stick = { node: stick, home: stick.quaternion.clone(), now: new THREE.Vector3() };

    // indoors: the open sky is not mirrored in what is inside
    const inside = new Set<THREE.MeshStandardMaterial>();
    for (const n of this.def.within)
      find(n)?.traverse((o) => {
        const mesh = o as THREE.Mesh;
        const material = (mesh.userData.real ?? mesh.material) as THREE.MeshStandardMaterial | undefined;
        if (mesh.isMesh && material?.isMeshStandardMaterial && !material.name.startsWith('glass')) inside.add(material);
      });
    // (an occlusion map of one shade: it takes the sky's light and its reflection off, and leaves every lamp and the Sun alone)
    const shade = new THREE.DataTexture(new Uint8Array([255 * INDOORS, 255 * INDOORS, 255 * INDOORS, 255]), 1, 1);
    shade.needsUpdate = true;
    for (const m of inside) {
      m.aoMap = shade;
      m.aoMapIntensity = shaded(m, false);
      m.needsUpdate = true;
    }
    this.inside = [...inside];

    const p = this.def.periscope;
    const screen = p && (find(p.screen) as THREE.Mesh | null);
    if (p && screen?.isMesh) {
      const target = new THREE.WebGLCubeRenderTarget(FACE, { type: THREE.HalfFloatType, generateMipmaps: false });
      const cube = new THREE.CubeCamera(0.3, 1000, target);
      const axis = new THREE.Vector3(...p.axis).normalize();
      const up = new THREE.Vector3(...p.up).addScaledVector(axis, -axis.dot(new THREE.Vector3(...p.up))).normalize();
      // the screen's own frame, from the mesh: its middle, and which way on it is the top of the picture
      screen.geometry.computeBoundingBox();
      const middle = screen.geometry.boundingBox!.getCenter(new THREE.Vector3());
      const normal = new THREE.Vector3().fromBufferAttribute(screen.geometry.getAttribute('normal'), 0);
      const top = new THREE.Vector3(...(p.top ?? p.up))
        .addScaledVector(normal, -normal.dot(new THREE.Vector3(...(p.top ?? p.up))))
        .normalize();
      const radius = typeof screen.userData.screen_radius === 'number' ? screen.userData.screen_radius : 0.1;
      const material = new THREE.ShaderMaterial({
        name: 'periscope-screen',
        uniforms: {
          uCube: { value: target.texture },
          uMiddle: { value: middle },
          uTop: { value: top },
          uAcross: { value: new THREE.Vector3().crossVectors(top, normal).normalize() },
          uRadius: { value: radius },
          uHalf: { value: THREE.MathUtils.degToRad((p.fields[0] ?? 170) / 2) },
          uOn: { value: 0 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vAt;
          void main() { vAt = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform samplerCube uCube;
          uniform vec3 uMiddle, uTop, uAcross;
          uniform float uRadius, uHalf, uOn;
          varying vec3 vAt;
          // a line of the reticle: 1 on it, falling off over a pixel
          float line(float d, float w) { return 1.0 - smoothstep(w, w + fwidth(d) * 1.5, abs(d)); }
          void main() {
            vec2 p = vec2(dot(vAt - uMiddle, uAcross), dot(vAt - uMiddle, uTop)) / uRadius;
            float r = length(p);
            // the fisheye: the angle off the axis grows with the distance from the middle
            float angle = r * uHalf;
            vec2 round = r > 1e-5 ? p / r : vec2(0.0, 1.0);
            // (the cube is laid along the periscope: its right and its top across, the axis into its far face)
            vec3 colour = textureCube(uCube, vec3(round * sin(angle), -cos(angle))).rgb * uOn;
            colour *= 1.0 - 0.35 * smoothstep(0.75, 1.0, r); // the field darkens toward its edge
            // the reticle: a cross at the middle, the drift lines, and the square the Earth's disc is fitted in for height
            float mark = max(line(p.x, 0.004), line(p.y, 0.004)) * step(r, 0.09);
            for (int i = -2; i <= 2; i++) mark = max(mark, line(p.x - float(i) * 0.16, 0.0025) * step(abs(p.y), 0.72) * step(0.12, abs(p.y) + abs(float(i))));
            vec2 sq = abs(p) - 0.56;
            mark = max(mark, line(max(sq.x, sq.y), 0.003) * step(0.42, min(abs(p.x), abs(p.y))) * step(max(abs(p.x), abs(p.y)), 0.6));
            colour = mix(colour, vec3(1.0, 0.82, 0.5) * (0.35 + 0.65 * uOn), mark * 0.55);
            gl_FragColor = vec4(colour + vec3(0.004, 0.005, 0.006), 1.0);
          }`,
      });
      screen.material = material;
      screen.userData.real = material;
      this.scope = { screen, material, target, cube, at: new THREE.Vector3(...p.at), axis, up, next: 0, owed: 1, power: 0 };
      name(screen, p.name, p.about, { lookout: 'screen' });
    }
  }

  /** The periscope's screen, for whoever wants to look into it: its middle and the way it faces, in the scene. */
  get screen(): { point: THREE.Vector3; normal: THREE.Vector3; radius: number } | null {
    const s = this.scope;
    if (!s) return null;
    const u = s.material.uniforms;
    s.screen.updateWorldMatrix(true, false); // (in flight the vehicle has moved since it was last drawn)
    const point = (u.uMiddle!.value as THREE.Vector3).clone().applyMatrix4(s.screen.matrixWorld);
    const normal = new THREE.Vector3()
      .crossVectors(u.uAcross!.value as THREE.Vector3, u.uTop!.value as THREE.Vector3)
      .transformDirection(s.screen.matrixWorld);
    return { point, normal, radius: u.uRadius!.value as number };
  }

  /** The periscope's power: 0 the wide field, 1 the next. Asked for one past the last, it goes back to the first. */
  power(to?: number): number {
    const s = this.scope;
    const fields = this.def.periscope?.fields ?? [];
    if (!s || !fields.length) return 0;
    s.power = (to ?? s.power + 1) % fields.length;
    s.owed = 1; // (the faces round the far one have not been drawn while the high power was on)
    s.material.uniforms.uHalf!.value = THREE.MathUtils.degToRad(fields[s.power]! / 2);
    this.host.redraw();
    return s.power;
  }

  /** The model has been cut open, or closed again: daylight comes in at the cut, so the inside is shaded less. */
  opened(on: boolean): void {
    for (const m of this.inside) m.aoMapIntensity = shaded(m, on);
    this.host.redraw();
  }
  private inside: THREE.MeshStandardMaterial[] = [];

  /** The periscope's screen is being looked into, filling the view (it is then drawn in full every frame), or only glanced at. */
  watched = false;

  /** Someone is in the seat (the camera is on board), or has left it: the periscope is drawn only then. */
  board(on: boolean): void {
    if (on === this.aboard) return;
    this.aboard = on;
    if (this.scope) {
      this.scope.owed = 1;
      this.scope.material.uniforms.uOn!.value = on ? 1 : 0;
    }
    this.host.redraw();
  }

  /** The flight deck has taken the flight (every sample will come through `fly`), or given it back to the record. */
  piloted(on: boolean): void {
    this.live = on;
    this.times = {};
    this.sample = null;
    this.hand = { pitch: 0, yaw: 0, roll: 0 };
  }

  /** A sample of the flight being flown, with its state when it is the flight's own instant (not a look back). */
  fly(sample: LiveSample, state: VehicleState | null): void {
    this.sample = sample;
    if (!state) return;
    const mark = (key: Signal, at: number | null | false): void => {
      if (at === null || at === false) delete this.times[key];
      else if (this.times[key] === undefined || at < this.times[key]) this.times[key] = at;
    };
    mark('tower', state.shed.tower && state.t);
    mark('separated', state.shed.booster && state.t);
    mark('retro', state.retroAt);
    mark('retropack', state.shed.retropack && state.t);
    mark('entry', state.enteredAt);
    mark('drogue', state.drogueAt);
    mark('main', state.mainAt);
    mark('abort', state.abortAt);
    this.hand = { pitch: state.controls.pitch, yaw: state.controls.yaw, roll: state.controls.roll };
  }

  /** The record's run: when each thing happened, once. */
  private recorded: { samples: readonly Sample[]; times: Partial<Record<Signal, number>> } | null = null;
  private record(): { samples: readonly Sample[]; times: Partial<Record<Signal, number>> } | null {
    const tr = this.flight.trajectory;
    if (!tr) return null;
    if (!this.recorded) {
      const { samples, results } = flownOnce(tr, siteFrame(this.flight.site), this.flight.site.seaLevel.value);
      this.recorded = {
        samples,
        times: {
          tower: tr.body?.tower?.at.value ?? tr.engine.cutoff.value,
          separated: tr.separation.at.value,
          retro: tr.retro.fires[0]?.value ?? Infinity,
          retropack: tr.retropack.at.value,
          entry: results.entryAt,
          drogue: results.drogueAt,
          main: results.mainAt,
        },
      };
    }
    return this.recorded;
  }

  /**
   * Once a frame: read the flight at the clock's instant (`t` seconds from liftoff, `jdUT` the day), move what moves
   * toward it over `dt` seconds of the page's time, and hold the lights against `exposure`.
   */
  step(dt: number, t: number, jdUT: number, exposure: number): void {
    const record = this.live ? null : this.record();
    const sample = this.live ? this.sample : record ? sampleAt(record.samples, t) : null;
    const lifted = sample ? sample.t > 0 && (this.live || t > 0) : false;
    const r: Readings = {};
    if (sample) {
      r.altitude = sample.altitude;
      r.descent = Math.max(0, -sample.groundSpeed * Math.sin(THREE.MathUtils.degToRad(sample.groundClimb)));
      r.g = sample.g;
    }
    r.elapsed = Math.max(0, sample && this.live ? sample.t : t);
    r.timeOfDay = ((((jdUT + 0.5 + this.flight.site.zone.utcOffset / 24) % 1) + 1) % 1) * 86400;
    this.attitude(r, sample?.t ?? t);
    const left = (sample as LiveSample | null)?.rcs?.left;
    const supplies = this.flight.trajectory?.body?.capsule.rcs?.supplies ?? [];
    supplies.forEach((s, i) => {
      r[`supply${i}`] = left?.[i] !== undefined ? left[i]! / s.propellant.value : 1;
    });
    this.readings = r;
    this.signals = signalsAt(this.live ? this.times : (record?.times ?? {}), sample?.t ?? t, lifted);

    let moved = false;
    const k = dt > 0 ? 1 - Math.exp(-dt / NEEDLE_TAU) : 1;
    for (const n of this.needles) {
      const reading = n.reads ? r[n.reads as keyof Readings] : n.value;
      const value = reading === undefined ? n.rest : n.reads ? reading / n.per : reading;
      n.goal = n.drum ? drumAt(value, n.place, n.drum) : scaleAt(n.turn ?? n.slide ?? [], value, n.wrap);
      if (Number.isNaN(n.now)) n.now = n.goal;
      // (what goes round goes the short way: a heading through north, a wheel from nine to nought)
      const round = n.drum ?? (n.turn && n.wrap ? 2 * Math.PI : 0);
      let by = n.goal - n.now;
      if (round) by -= Math.round(by / round) * round;
      if (Math.abs(by) < 1e-5) continue;
      n.now += n.drum ? by : by * k;
      moved = true;
      if (n.drum) n.node.quaternion.copy(n.home).multiply(q.setFromAxisAngle(AXIS_X, (n.now / n.drum) * 2 * Math.PI));
      else if (n.turn) n.node.quaternion.copy(n.home).multiply(q.setFromAxisAngle(AXIS_Y, n.now - scaleAt(n.turn, n.rest, n.wrap)));
      else if (n.slide) n.node.position.copy(n.at).add(v.set(n.now - scaleAt(n.slide, n.rest), 0, 0).applyQuaternion(n.home));
    }
    for (const lamp of this.lamps) {
      const lit = lamp.shows && this.signals[lamp.shows] ? 1 : 0; // (a lamp that shows nothing simulated stays dark)
      if (lit === lamp.lit) continue;
      lamp.lit = lit;
      moved = true;
      for (const mesh of lamp.meshes)
        for (const material of new Set([mesh.userData.real, mesh.material] as (THREE.MeshStandardMaterial | undefined)[])) {
          if (!material?.emissive) continue;
          material.emissive.copy(lamp.colour);
          material.emissiveMap = material.map;
          material.emissiveIntensity = lit ? LAMP_LIT : 0;
          material.needsUpdate = true;
        }
    }
    const s = this.stick;
    const sd = this.def.stick;
    if (s && sd) {
      v.set(this.hand.pitch, this.hand.roll, this.hand.yaw);
      if (v.distanceToSquared(s.now) > 1e-8) {
        s.now.lerp(v, dt > 0 ? 1 - Math.exp(-dt / 0.06) : 1);
        s.node.quaternion.copy(s.home);
        for (const [axis, amount] of [
          [sd.pitch, s.now.x],
          [sd.roll, s.now.y],
          [sd.yaw, s.now.z],
        ] as const)
          s.node.quaternion.multiply(q.setFromAxisAngle(v.set(...axis).normalize(), amount * sd.throw));
        moved = true;
      }
    }
    for (let i = this.worked.length - 1; i >= 0; i--) {
      const w = this.worked[i]!;
      w.t += dt / WORK_SECONDS;
      // out and back: a ring pulled and let go, a button pressed and released
      w.node.position.copy(w.home).addScaledVector(w.by, Math.sin(Math.PI * Math.min(1, w.t)));
      if (w.t >= 1) this.worked.splice(i, 1);
      moved = true;
    }
    for (const { light, base } of this.lights) light.intensity = base / Math.max(1, exposure / DAY_EXPOSURE);
    if (moved) this.host.redraw();
  }

  /** The three angles and their rates, read off the model as the scene has it. */
  private attitude(r: Readings, t: number): void {
    const g = this.group;
    const nose = v.set(0, 1, 0).applyQuaternion(g.quaternion).toArray();
    const head = v
      .set(...(this.def.overhead ?? [0, 0, 1]))
      .applyQuaternion(g.quaternion)
      .toArray();
    const up = this.host.upAt(g.position, new THREE.Vector3());
    // level along the bearing flown: the site's +X is its stated bearing, +Z a quarter turn clockwise of it
    const bearing = THREE.MathUtils.degToRad((this.flight.trajectory?.azimuth.value ?? 0) - this.flight.site.bearingX.value);
    const a = attitudeOf(nose, head, up.toArray(), [Math.cos(bearing), 0, Math.sin(bearing)]);
    Object.assign(r, a);
    const dt = t - this.last.t;
    if (dt > 1e-4 && dt < 1) {
      const [x, y, z] = ratesOf(
        this.last.q.toArray() as [number, number, number, number],
        g.quaternion.toArray() as [number, number, number, number],
        dt,
      );
      this.rates.set(x, y, z);
    } else if (dt !== 0) this.rates.set(0, 0, 0);
    if (dt !== 0) {
      this.last.q.copy(g.quaternion);
      this.last.t = t;
    }
    // in the model's axes: the nose is +Y, the pilot's right +X, the top of his head +Z
    r.rollRate = this.rates.y;
    r.pitchRate = this.rates.x;
    r.yawRate = this.rates.z;
  }

  /** What the instruments read now: for a test, or a page that wants to say it. */
  get reading(): { readings: Readings; signals: Signals } {
    return { readings: this.readings, signals: this.signals };
  }

  /** What in the cabin a point of the scene is on (a pick's hit), if anything named. */
  thingAt(point: THREE.Vector3): CabinThing | null {
    const p = this.group.worldToLocal(v.copy(point));
    let best: CabinThing | null = null;
    let least = Infinity;
    for (const { thing, reach, at } of this.things) {
      const d = at.distanceTo(p) / reach;
      if (d < 1 && d < least) {
        least = d;
        best = thing;
      }
    }
    return best;
  }

  /** A control has been worked: it moves as its extras say (`pull` or `press`, metres along its own axis), out and back. */
  work(node: THREE.Object3D): void {
    const u = node.userData as { pull?: number; press?: number };
    const by = u.pull ?? (u.press !== undefined ? -u.press : 0);
    if (!by || this.worked.some((w) => w.node === node)) return;
    this.worked.push({ node, home: node.position.clone(), by: new THREE.Vector3(0, by, 0).applyQuaternion(node.quaternion), t: 0 });
  }

  /**
   * Draw what the periscope sees, as much of it as this frame is given: called when the scene is about to be drawn.
   * The camera is put where the objective is for it, so everything that is drawn round the eye (the ground's mesh,
   * the globe's) is drawn round the periscope's, two metres away.
   */
  see(): void {
    const s = this.scope;
    if (!s || !this.aboard) return;
    const { renderer, camera, scene } = this.host;
    const sky = this.host.sky();
    this.group.updateWorldMatrix(true, false);
    const eye = s.at.clone().applyMatrix4(this.group.matrixWorld);
    // the cube is laid along the periscope, whichever way the vehicle has turned: its far face looks down the axis,
    // which is all the high power needs, and the four round it are the rest of the field
    const axis = s.axis.clone().transformDirection(this.group.matrixWorld);
    const up = s.up.clone().transformDirection(this.group.matrixWorld);
    s.cube.quaternion.setFromRotationMatrix(m4.makeBasis(v.crossVectors(axis, up), up, axis.clone().negate()));
    const faces = s.cube.children as THREE.PerspectiveCamera[];
    if (s.cube.coordinateSystem !== renderer.coordinateSystem) {
      s.cube.coordinateSystem = renderer.coordinateSystem;
      s.cube.updateCoordinateSystem();
    }
    s.cube.position.set(0, 0, 0);
    s.cube.updateMatrixWorld(true);
    // which faces: all five when it is first looked through; then the far one every frame, and at the wide power one
    // of the four round it as well, in turn. The one behind the objective is never wanted.
    // Glanced at from the couch, where the screen is a hand's breadth on the page, it is one face a frame.
    s.next++;
    const round = AROUND[(s.next >> (this.watched ? 0 : 1)) % AROUND.length]!;
    const todo: number[] = s.owed ? [...AROUND, AHEAD] : this.watched ? (s.power ? [AHEAD] : [AHEAD, round]) : [s.next % 2 ? AHEAD : round];
    s.owed = 0;
    const kept = {
      position: camera.position.clone(),
      target: renderer.getRenderTarget(),
      auto: renderer.autoClear,
      sky: { q: sky.camera.quaternion.clone(), fov: sky.camera.fov, aspect: sky.camera.aspect },
    };
    camera.position.copy(eye);
    renderer.autoClear = false;
    sky.camera.fov = 90;
    sky.camera.aspect = 1;
    sky.camera.updateProjectionMatrix();
    for (const f of faces) {
      // seen as far as the main view sees, and from an arm's length out (the capsule's own skin is nearer than that only at the door)
      f.near = Math.max(0.2, camera.near);
      f.far = Math.max(camera.far, 100);
      f.updateProjectionMatrix();
    }
    s.screen.visible = false; // (it shows the cube it would be drawn into)
    this.host.draw(() => {
      for (const i of todo) {
        const face = faces[i]!;
        renderer.setRenderTarget(s.target, i);
        renderer.clear();
        sky.camera.quaternion.copy(face.getWorldQuaternion(q));
        sky.camera.updateMatrixWorld();
        renderer.render(sky.scene, sky.camera);
        renderer.clearDepth();
        renderer.render(scene, face);
      }
    });
    s.screen.visible = true;
    camera.position.copy(kept.position);
    camera.updateMatrixWorld();
    sky.camera.quaternion.copy(kept.sky.q);
    sky.camera.fov = kept.sky.fov;
    sky.camera.aspect = kept.sky.aspect;
    sky.camera.updateProjectionMatrix();
    renderer.autoClear = kept.auto;
    renderer.setRenderTarget(kept.target);
  }

  dispose(): void {
    this.scope?.target.dispose();
    this.scope?.material.dispose();
  }
}

/** A cube camera's faces, as three orders them: the one that looks along its -Z, and the four round that. */
const AHEAD = 5;
const AROUND = [0, 1, 2, 3];

/** How much of the sky's light and reflection is left on what is indoors: a little comes in at the windows. */
const INDOORS = 0.1;
/** How much of that shading is kept while the model is cut open to the day. */
const OPENED = 0.45;
/**
 * How far a material indoors is shaded. Metal is shaded less: it is seen by what it mirrors, and with nothing left to
 * mirror an aluminised suit is black. (What it mirrors is the sky, dimmed, standing in for a cabin it cannot see.)
 */
function shaded(m: THREE.MeshStandardMaterial, opened: boolean): number {
  return (opened ? OPENED : 1) * (m.metalness > 0.3 ? 0.55 : 1);
}
/** A lit lamp's own brightness (emissive, against the scene's exposure). */
const LAMP_LIT = 1.6;
/** The exposure the cabin's lights are set for: a day's. Past it (dusk, night) they are turned down by as much, so the cabin reads the same. */
const DAY_EXPOSURE = 1;
/** How long a worked control takes to go out and come back, seconds. */
const WORK_SECONDS = 0.45;
