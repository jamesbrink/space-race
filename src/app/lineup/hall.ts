import * as THREE from 'three';
import type { Look } from '../../viewer/look.ts';
import { FILL, KEY, PALETTE, type Palette, room, Sweep, type Tone } from '../../viewer/studio.ts';
import { tier } from '../../viewer/tier.ts';
import { heightMarks } from './row.ts';

/**
 * The hall the Lineup's row stands in: the gallery's studio made long (viewer/studio.ts: the same sweep, the same
 * key, rim, kicker and fill, the same room of softboxes for the metal to reflect, the same two tones and paper), so a
 * vehicle looks here as it does in its own gallery. It is not a place and has no hour.
 *
 * What it adds is the measure. The row is ruled in height: a line at every five metres (every metre for spacecraft
 * alone) across the whole row, in the plane the vehicles' axes stand in, so that a vehicle's top meets its line from
 * wherever it is seen (a line behind the row would read a metre out from a raised eye); what is in front of a line
 * hides it. Along the floor in front runs a tape ticked in metres.
 *
 * The floor is, as the studio's, only what falls on it: each vehicle's own shadow (stand.ts) and a pool of light.
 * Brightnesses are the studio's design, fitted by eye.
 */

/**
 * The light hall's wall and floor, linear: a step darker than the studio's light tone (studio.ts PALETTE.light), which is
 * made for one vehicle filling the picture. Here a row of white and pale grey vehicles stands small against it, and
 * the ruled heights cross it: on the studio's near-white wall neither read. A design, fitted by eye: the wall a light
 * grey that white paint stands out from, the floor a little darker than the wall's foot, as the studio's is.
 */
const LIGHT_HALL: Pick<Palette, 'floor' | 'band' | 'top'> = {
  floor: [0.22, 0.22, 0.215],
  band: [0.28, 0.28, 0.275],
  top: [0.21, 0.21, 0.21],
};
/** How strong the ruled lines and the tape are drawn, in the dark hall and in a light one (or on paper): a dark line on a light wall needs more. */
const RULE = { dark: { major: 0.26, minor: 0.09, tape: 0.36 }, light: { major: 0.5, minor: 0.2, tape: 0.6 } } as const;

/** How much stronger the sky's fill is in a drawing, whose shade is a flat tone and not black (the stage's own figure: stage.ts CEL_FILL). */
const CEL_FILL = 4.5;
const UP = new THREE.Vector3(0, 1, 0);

/** The pool of light under the row: brightest along its middle, nothing at its edge. */
function pool(colour: THREE.IUniform<THREE.Color>): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({
      uniforms: { uColour: colour },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vAt;
        void main() { vAt = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColour; varying vec2 vAt;
        void main() {
          // (a long field with round ends: the row is many times as long as it is deep)
          vec2 d = vec2(max(0.0, abs(vAt.x) - 0.6) / 0.4, vAt.y);
          float k = 1.0 - smoothstep(0.0, 1.0, length(d));
          gl_FragColor = vec4(uColour * k * k, 1.0);
        }`,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.0005;
  mesh.renderOrder = -5;
  return mesh;
}

/** Line segments in one colour and strength, drawn a pixel wide whatever the distance. */
function lines(colour: THREE.Color, opacity: number): THREE.LineSegments {
  const material = new THREE.LineBasicMaterial({ color: colour, transparent: true, opacity, depthWrite: false });
  const segments = new THREE.LineSegments(new THREE.BufferGeometry(), material);
  segments.frustumCulled = false; // (they are remade whenever the row is: no bounds are kept for them)
  segments.renderOrder = -1;
  return segments;
}

/** What the row is to the hall: where it starts and ends along X, how far it reaches to the front and back, and how tall its tallest is. */
export interface Extent {
  from: number;
  to: number;
  front: number;
  back: number;
  tallest: number;
}

export class Hall {
  readonly backdrop = new Sweep();
  /** Everything of the hall that is in the scene: its lights and what is drawn on the floor and across the row. */
  readonly group = new THREE.Group();
  /** The colours what is drawn over the scene is drawn in (the people, the plates): the tone's own, changed with it. */
  readonly colours = {
    figure: { value: new THREE.Color() },
    ink: { value: new THREE.Color() },
    pool: { value: new THREE.Color() },
  };
  /** How dark a shadow on the floor is, and whether it is drawn as a drawing's (stand.ts). */
  readonly shadow = { strength: { value: 0.5 }, cel: { value: 0 } };
  environment: THREE.Texture | null = null;
  environmentIntensity = 0.5;
  exposure = 0.95;
  tone: Tone = 'dark';
  /** The heights ruled, metres, and which carry a figure. */
  marks: { y: number; major: boolean }[] = [];
  /** How far the ruled lines reach along the row, metres. */
  readonly ruled = { from: 0, to: 0 };

  private readonly key = new THREE.DirectionalLight(0xfff4e6, 2.6);
  private readonly rim = new THREE.DirectionalLight(0xd6e6ff, 2.2);
  private readonly kicker = new THREE.DirectionalLight(0xffe9cf, 1.1);
  private readonly fill = new THREE.DirectionalLight(0xdfe8ff, 0.45);
  private readonly sky = new THREE.HemisphereLight(0x3a3f48, 0x17171a, 0.42);
  private readonly pool = pool(this.colours.pool);
  private readonly major = lines(this.colours.ink.value, 0.26);
  private readonly minor = lines(this.colours.ink.value, 0.09);
  private readonly tape = lines(this.colours.ink.value, 0.36);
  private readonly environments = new Map<string, THREE.Texture>();
  private readonly renderer: THREE.WebGLRenderer;
  private look: Look = 'real';

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    this.key.position.copy(KEY).multiplyScalar(100);
    this.fill.position.copy(FILL).multiplyScalar(100);
    this.group.add(
      this.key,
      this.key.target,
      this.rim,
      this.rim.target,
      this.kicker,
      this.kicker.target,
      this.fill,
      this.fill.target,
      this.sky,
      this.pool,
      this.major,
      this.minor,
      this.tape,
    );
    this.apply();
  }

  /** Toward the key light: the one that casts the shadows on the floor. */
  get toKey(): THREE.Vector3 {
    return KEY;
  }

  setTone(tone: Tone): void {
    this.tone = tone;
    this.apply();
  }

  setLook(look: Look): void {
    this.look = look;
    this.apply();
  }

  /** Show the measure (the ruled heights and the tape), or put it away. */
  measure(on: boolean): void {
    this.major.visible = this.minor.visible = this.tape.visible = on;
  }

  private get palette(): Palette {
    return PALETTE[this.look === 'cel' ? 'paper' : this.tone];
  }

  /** The room the metal reflects, baked for the tone in force. A device short of memory holds only the one on show (6 MiB each). */
  private bake(p: Palette): THREE.Texture {
    const key = `${p.wall}/${p.boxes}`;
    let made = this.environments.get(key);
    if (made) return made;
    if (tier().lighter) {
      for (const old of this.environments.values()) old.dispose();
      this.environments.clear();
    }
    const gen = new THREE.PMREMGenerator(this.renderer);
    const baked = room(p.wall, p.boxes);
    made = gen.fromScene(baked, 0.02, 0.1, 200).texture;
    gen.dispose();
    baked.traverse((o) => {
      const mesh = o as THREE.Mesh;
      mesh.geometry?.dispose();
      for (const m of [mesh.material ?? []].flat()) m.dispose();
    });
    this.environments.set(key, made);
    return made;
  }

  private apply(): void {
    const p = this.palette;
    const cel = this.look === 'cel';
    const sweep = this.backdrop.uniforms;
    const light = !cel && this.tone === 'light';
    sweep.uFloor.value.setRGB(...(light ? LIGHT_HALL.floor : p.floor));
    sweep.uBand.value.setRGB(...(light ? LIGHT_HALL.band : p.band));
    sweep.uTop.value.setRGB(...(light ? LIGHT_HALL.top : p.top));
    // (the wall's light is behind whatever is in the middle of the picture: softer here, where the picture is a row)
    sweep.uSpot.value = cel ? 0 : this.tone === 'light' ? 0.25 : 0.7;
    this.colours.figure.value.setRGB(...p.figure);
    this.colours.ink.value.setRGB(...p.ink);
    this.colours.pool.value.setRGB(...p.pool);
    // (a line's material keeps a colour of its own)
    const rule = RULE[this.tone === 'light' || cel ? 'light' : 'dark'];
    for (const [drawn, opacity] of [
      [this.major, rule.major],
      [this.minor, rule.minor],
      [this.tape, rule.tape],
    ] as const) {
      const material = drawn.material as THREE.LineBasicMaterial;
      material.color.copy(this.colours.ink.value);
      material.opacity = opacity;
    }
    this.shadow.strength.value = cel ? 0.2 : this.tone === 'light' ? 0.36 : 0.62;
    this.shadow.cel.value = cel ? 1 : 0;
    this.exposure = p.exposure;
    this.environment = this.bake(p);
    this.environmentIntensity = p.environment;
    this.sky.color.set(p.sky);
    this.sky.groundColor.set(p.ground);
    this.sky.intensity = 0.42 * (cel ? CEL_FILL : 1);
    // a drawing is lit flat from the front: the rim and the fill would each add a band of tone of their own
    this.rim.intensity = cel ? 0 : this.tone === 'light' ? 1.3 : 2.2;
    this.kicker.intensity = cel ? 0 : this.tone === 'light' ? 0.6 : 1.1;
    this.fill.intensity = cel ? 0 : 0.45;
    this.pool.visible = !cel;
  }

  /** The row has been formed, or formed again: the measure is drawn for it. */
  fit(row: Extent): void {
    const { major, minor, top } = heightMarks(row.tallest);
    const reach = Math.max(2, 0.22 * row.tallest);
    const [from, to] = [row.from - reach, row.to + reach];
    this.ruled.from = from;
    this.ruled.to = to;
    this.marks = [];
    const strong: number[] = [];
    const faint: number[] = [];
    for (let y = minor; y <= top + 1e-6; y += minor) {
      const isMajor = Math.abs(y / major - Math.round(y / major)) < 1e-6;
      this.marks.push({ y, major: isMajor });
      (isMajor ? strong : faint).push(from, y, 0, to, y, 0);
    }
    // the tape: along the floor in front of everything, a tick a metre, longer at five and ten (a tick every half metre
    // for a row of spacecraft, which is short enough for them to be told apart)
    const z = row.front + Math.max(0.6, 0.12 * row.tallest);
    const step = major <= 2 ? 0.5 : 1;
    const tape: number[] = [from, 0.004, z, to, 0.004, z];
    const start = Math.ceil(from / step) * step;
    for (let x = start; x <= to; x += step) {
      const n = Math.round(x / step);
      const whole = n * step;
      const long = Math.abs(whole % 10) < 1e-6 ? 1 : Math.abs(whole % 5) < 1e-6 ? 0.62 : Math.abs(whole % 1) < 1e-6 ? 0.3 : 0.16;
      tape.push(whole, 0.004, z, whole, 0.004, z + long * Math.max(0.5, 0.05 * row.tallest));
    }
    for (const [segments, points] of [
      [this.major, strong],
      [this.minor, faint],
      [this.tape, tape],
    ] as const) {
      segments.geometry.dispose();
      segments.geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    }
    const length = to - from;
    this.pool.scale.set(length / 2 + 2.5 * row.tallest, Math.max(12, 1.6 * row.tallest), 1);
    this.pool.position.set((from + to) / 2, this.pool.position.y, 0);
  }

  /**
   * The frame is about to be drawn from `camera`, looking at `subject`: the two kickers stand behind the subject as it
   * is seen (the studio's rule: an edge, a strut, a lattice is drawn in light against the wall from every side).
   */
  view(camera: THREE.Camera, subject: THREE.Vector3): void {
    const sight = new THREE.Vector3().subVectors(subject, camera.position).setY(0);
    if (sight.lengthSq() < 1e-6) sight.set(0, 0, -1);
    sight.normalize();
    const round = (light: THREE.DirectionalLight, turn: number, rise: number): void => {
      const toward = sight.clone().applyAxisAngle(UP, turn).multiplyScalar(-1).setY(rise).normalize();
      light.target.position.copy(subject);
      light.position.copy(subject).addScaledVector(toward, 100);
    };
    round(this.rim, THREE.MathUtils.degToRad(125), 0.45);
    round(this.kicker, THREE.MathUtils.degToRad(-130), 0.3);
    this.key.target.position.copy(subject);
    this.key.position.copy(subject).addScaledVector(KEY, 100);
    this.fill.target.position.copy(subject);
    this.fill.position.copy(subject).addScaledVector(FILL, 100);
  }

  dispose(): void {
    for (const made of this.environments.values()) made.dispose();
    this.environments.clear();
  }
}
