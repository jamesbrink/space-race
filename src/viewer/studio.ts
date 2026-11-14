import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Backdrop, Setting } from './backdrops';
import { CASCADED_MASK } from './shadows';

/**
 * The studio: the setting a thing is shown in when it is shown nowhere (the gallery, src/gallery.ts).
 * It is not a place on the Earth and has no hour: no Sun, no sky, no haze, no clock. What it has is
 * designed, as a museum lights a piece:
 *
 * - **A sweep, not a room.** The floor runs up into the wall with no line between them: both are
 *   one gradient drawn behind everything, by direction, so there is no horizon to cross the
 *   silhouette. The floor itself is nothing but what falls on it: the key's shadow, a soft dark
 *   under the thing where it stands, and a pool of light round it that gives the floor its
 *   perspective.
 * - **A key, a fill, and two kickers.** A key from the front right and above (the stage's one
 *   shadow-casting light) and a low fill from the front left do not move: the view goes round the
 *   thing, the light stays. Two kickers stand behind the thing wherever it is seen from, a cool one
 *   to the left and a weaker warm one to the right, so that an edge, an antenna, a strap or a
 *   lattice is drawn in light against the wall from every side. Cut open, a lamp beside the
 *   viewer's shoulder lights what is inside.
 * - **A polished floor, faintly.** The thing is seen again in the floor under it, a tenth as bright:
 *   enough to say there is a floor and that the thing stands on it.
 * - **Something to reflect.** Polished metal shows its surroundings, so there is a room for it to
 *   show: softboxes where the lights are, in a plain box, baked to an environment map. No picture
 *   of anywhere is downloaded.
 * - **Two tones**, dark (as the page is) and light (a white cove, for a dark vehicle or a bright
 *   screen); and in the cel look, paper: one flat tone, on which the ink line is the edge.
 *
 * Scale is still to be felt, so there is a measure to stand beside the thing when asked for: a
 * person 1.8 m tall and a range pole banded in metres, as tall as it is.
 */
export type Tone = 'dark' | 'light';

type RGB = [number, number, number];

/** What changes between the tones: the sweep's three colours, the light on the floor, how dark a shadow is, and the room the metal sees. */
interface Palette {
  floor: RGB;
  band: RGB;
  top: RGB;
  pool: RGB;
  shadow: number;
  contact: number;
  exposure: number;
  environment: number;
  /** The room baked for the reflections: its walls, and how bright its softboxes are. */
  wall: number;
  boxes: number;
  figure: RGB;
  ink: RGB;
  /** The light from all round that fills the shade: its colour from above and from below. */
  sky: number;
  ground: number;
}

const PALETTE: Record<Tone | 'paper', Palette> = {
  dark: {
    floor: [0.028, 0.029, 0.034],
    band: [0.06, 0.06, 0.065],
    top: [0.011, 0.011, 0.014],
    pool: [0.075, 0.072, 0.068],
    shadow: 0.5,
    contact: 0.75,
    exposure: 0.95,
    environment: 0.5,
    wall: 0.012,
    boxes: 1,
    figure: [0.55, 0.54, 0.5],
    ink: [0.9, 0.88, 0.82],
    sky: 0x3a3f48,
    ground: 0x17171a,
  },
  light: {
    floor: [0.5, 0.5, 0.49],
    band: [0.82, 0.82, 0.81],
    top: [0.66, 0.66, 0.66],
    pool: [0.16, 0.16, 0.155],
    shadow: 0.34,
    contact: 0.42,
    exposure: 0.92,
    environment: 0.62,
    wall: 0.5,
    boxes: 1,
    figure: [0.2, 0.2, 0.21],
    ink: [0.1, 0.1, 0.11],
    sky: 0x8c9098,
    ground: 0x6a6a68,
  },
  // the cel look's: a sheet of warm paper, the same whichever tone the real look has
  paper: {
    floor: [0.84, 0.82, 0.76],
    band: [0.84, 0.82, 0.76],
    top: [0.84, 0.82, 0.76],
    pool: [0, 0, 0],
    shadow: 0.2,
    contact: 0.16,
    exposure: 1,
    environment: 0.5,
    wall: 0.5,
    boxes: 1,
    figure: [0.3, 0.29, 0.27],
    ink: [0.12, 0.11, 0.1],
    // (a drawing's shade is a flat tone of the surface's own colour: the stage raises this fill, and it must not be dark)
    sky: 0xb4b2ac,
    ground: 0x8a867c,
  },
};

/** Toward each light, from the thing. The default view stands at (-0.62, y, 0.78), so +X and +Z are its right and its front. */
const KEY = new THREE.Vector3(0.4, 1.3, 0.8).normalize();
const RIM = new THREE.Vector3(-0.78, 0.5, -0.62).normalize();
const FILL = new THREE.Vector3(-0.92, 0.22, 0.4).normalize();
const UP = new THREE.Vector3(0, 1, 0);

/** Unlit, one colour, the same in both looks (a material that is all its own shader has no cel twin: look.ts). */
function flat(colour: THREE.IUniform<THREE.Color>, opacity = 1): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uColour: colour, uOpacity: { value: opacity } },
    transparent: opacity < 1,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColour; uniform float uOpacity;
      void main() { gl_FragColor = vec4(uColour, uOpacity); }`,
  });
}

/** A disc on the floor that is brightest or darkest in the middle and nothing at its edge. */
function disc(colour: THREE.IUniform<THREE.Color>, strength: THREE.IUniform<number>, additive: boolean, order: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(1, 64),
    new THREE.ShaderMaterial({
      uniforms: { uColour: colour, uStrength: strength },
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      vertexShader: /* glsl */ `
        varying vec2 vAt;
        void main() { vAt = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColour; uniform float uStrength; varying vec2 vAt;
        void main() {
          float k = 1.0 - smoothstep(0.0, 1.0, length(vAt));
          gl_FragColor = vec4(uColour, uStrength * k * k);
        }`,
    }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = order;
  return mesh;
}

/**
 * The floor: it draws nothing but the shadow that falls on it (three's own shadow shader, as a
 * material of its own so the cel look leaves it alone). Everything else the floor is, the sweep
 * behind it draws.
 */
function shadowFloor(opacity: THREE.IUniform<number>): THREE.Mesh {
  const shader = THREE.ShaderLib.shadow;
  const material = new THREE.ShaderMaterial({
    uniforms: { ...THREE.UniformsUtils.clone(shader.uniforms), opacity },
    vertexShader: shader.vertexShader,
    // (the Sun's shadow as the lit surfaces read it: the fine map, the far one over its band, the sky's; shadows.ts)
    fragmentShader: shader.fragmentShader
      .replace('getShadowMask()', 'cascadedShadowMask()')
      .replace('#include <shadowmask_pars_fragment>', `#include <shadowmask_pars_fragment>\n${CASCADED_MASK}`),
    lights: true,
    transparent: true,
    depthWrite: false,
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 64), material);
  floor.rotation.x = -Math.PI / 2;
  floor.renderOrder = -2;
  return floor;
}

/** The sweep: drawn behind everything, by direction alone. */
class Sweep implements Backdrop {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  readonly uniforms = {
    uFloor: { value: new THREE.Color() },
    uBand: { value: new THREE.Color() },
    uTop: { value: new THREE.Color() },
    uSpot: { value: 1 },
  };

  constructor() {
    this.scene.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(50, 48, 24),
        new THREE.ShaderMaterial({
          side: THREE.BackSide,
          depthWrite: false,
          uniforms: this.uniforms,
          vertexShader: /* glsl */ `
            varying vec3 vDir; varying vec2 vAt;
            void main() {
              vDir = position;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              vAt = gl_Position.xy / gl_Position.w;
            }`,
          fragmentShader: /* glsl */ `
            uniform vec3 uFloor, uBand, uTop; uniform float uSpot; varying vec3 vDir; varying vec2 vAt;
            void main() {
              float y = normalize(vDir).y;
              // the floor rises into the cove over a quarter of the sky, and the cove fades up the wall: nowhere a line
              vec3 col = mix(uFloor, uBand, smoothstep(-0.42, 0.04, y));
              col = mix(col, uTop, smoothstep(0.02, 0.9, y));
              // the wall is lit behind the thing and falls away to the corners of the frame: the thing is always in the
              // middle of the picture, so this is by where on the picture, not where in the room
              float off = length(vAt * vec2(0.85, 1.0));
              col *= mix(1.0 + 0.55 * uSpot, 1.0 - 0.5 * uSpot, smoothstep(0.0, 1.25, off));
              // (a quarter of a level of noise: a gradient this slow would otherwise show its steps)
              col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
              gl_FragColor = vec4(col, 1.0);
            }`,
        }),
      ),
    );
  }
  update(): void {}
}

/** The room the metal reflects: a plain box with a softbox where each light is, a strip overhead, and a floor. Brightnesses are a design, not a measurement. */
function room(wall: number, boxes: number): THREE.Scene {
  const scene = new THREE.Scene();
  const lit = (v: number, tint: RGB = [1, 1, 1]) =>
    new THREE.MeshBasicMaterial({ color: new THREE.Color(v * tint[0], v * tint[1], v * tint[2]), side: THREE.DoubleSide });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(60, 40, 60), lit(wall));
  shell.position.y = 14;
  scene.add(shell);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), lit(wall * 0.6 + 0.004));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -5.9;
  scene.add(ground);
  const panel = (toward: THREE.Vector3, distance: number, w: number, h: number, v: number, tint?: RGB) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lit(v * boxes, tint));
    mesh.position.copy(toward).multiplyScalar(distance);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
  };
  panel(KEY, 20, 16, 12, 9, [1, 0.97, 0.92]); // the key's softbox: large, so its reflection is a soft field and not a point
  panel(RIM, 22, 5, 22, 7, [0.9, 0.95, 1]); // the rim: a tall strip, which is a line of light down a cylinder's edge
  panel(FILL, 22, 14, 8, 1.6, [1, 0.96, 0.9]);
  panel(new THREE.Vector3(0, 1, 0), 24, 18, 18, 1.2); // overhead: the top of a sphere is not a black hole
  // strips: on polished metal each is a bright line that runs with the form, which is what says "polished"
  panel(new THREE.Vector3(0.95, 0.25, -0.2).normalize(), 22, 2.2, 26, 6, [1, 0.96, 0.9]);
  panel(new THREE.Vector3(-0.35, 0.3, 0.9).normalize(), 22, 1.6, 20, 4.5, [0.92, 0.96, 1]);
  panel(new THREE.Vector3(0.1, 0.06, -1).normalize(), 24, 30, 2.5, 3, [0.9, 0.95, 1]); // low behind: a line along the underside
  return scene;
}

/** A standing person 1.8 m tall as a flat outline: half of it, feet to the top of the shoulders, mirrored; the head is a circle on top. */
const HALF_BODY: [number, number][] = [
  [0.025, 0],
  [0.13, 0],
  [0.125, 0.07],
  [0.105, 0.5],
  [0.165, 0.9],
  [0.205, 0.87],
  [0.235, 0.77],
  [0.285, 0.79],
  [0.262, 1.14],
  [0.238, 1.43],
  [0.19, 1.5],
  [0.06, 1.525],
  [0.05, 1.58],
];
const STATURE = 1.8;

function outline(colour: THREE.IUniform<THREE.Color>): THREE.Group {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.86); // (the crotch: the legs part below it)
  for (const [x, y] of HALF_BODY) shape.lineTo(x, y);
  for (const [x, y] of [...HALF_BODY].reverse()) shape.lineTo(-x, y);
  shape.closePath();
  const head = new THREE.Shape().absellipse(0, 1.685, 0.098, 0.115, 0, Math.PI * 2);
  const group = new THREE.Group();
  group.add(new THREE.Mesh(new THREE.ShapeGeometry([shape, head], 24), flat(colour, 0.9)));
  group.name = 'ScaleFigure';
  return group;
}

/** A range pole `height` metres tall, banded metre by metre in two colours, with a cap at its top: two meshes. */
function pole(height: number, a: THREE.Material, b: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ScalePole';
  const radius = Math.max(0.011, height / 900);
  const bands: [THREE.BufferGeometry[], THREE.BufferGeometry[]] = [[], []];
  for (let m = 0; m < height; m++) {
    const to = Math.min(m + 1, height);
    bands[m % 2]!.push(new THREE.CylinderGeometry(radius, radius, to - m, 10, 1).translate(0, (m + to) / 2, 0));
    // every fifth metre is marked with a collar, so a tall one can be counted
    if (m > 0 && m % 5 === 0) bands[0].push(new THREE.CylinderGeometry(radius * 2.6, radius * 2.6, radius * 1.6, 12, 1).translate(0, m, 0));
  }
  bands[0].push(new THREE.CylinderGeometry(radius * 4.5, radius * 4.5, radius * 0.9, 16, 1).translate(0, height - radius * 0.45, 0));
  bands.forEach((list, i) => {
    if (!list.length) return;
    const mesh = new THREE.Mesh(mergeGeometries(list), i ? b : a);
    for (const g of list) g.dispose();
    group.add(mesh);
  });
  return group;
}

export interface Studio extends Setting {
  readonly studio: true;
  floor: THREE.Mesh;
  /** The tone the real look is drawn in. Changed here, the stage takes the setting up again (`Stage.reset`). */
  tone: Tone;
  setTone(tone: Tone): void;
  /**
   * What stands in it has changed: its box as it stands on the floor, put together. The floor's
   * light and shadow are sized to it, and the measure is stood beside it and made as tall.
   */
  fit(box: THREE.Box3): void;
  /** The thing is cut open, or closed again: open, a lamp at the viewer's shoulder lights what is inside. */
  inside(open: boolean): void;
  /** Stand the measure beside the thing (a person and a pole), or take it away. */
  measure(on: boolean): void;
  readonly measured: boolean;
  /**
   * A figure to stand for the person instead of the outline: a model of someone (the flight's own
   * crew), feet at its origin, facing `forward` in its own frame. Null: the outline again.
   */
  person(model: THREE.Object3D | null, forward?: [number, number]): void;
  /** Where the measure's two figures are to be written: the top of the pole and the top of the person's head, and how tall each is. Null while it is away. */
  marks(): { pole: THREE.Vector3; height: number; head: THREE.Vector3; stature: number } | null;
}

/** The studio, if that is what a setting is. */
export const asStudio = (setting: Setting): Studio | null => ((setting as Partial<Studio>).studio ? (setting as Studio) : null);

export function studio(renderer: THREE.WebGLRenderer): Studio {
  const sweep = new Sweep();
  const colours = {
    pool: { value: new THREE.Color() },
    black: { value: new THREE.Color(0, 0, 0) },
    figure: { value: new THREE.Color() },
    ink: { value: new THREE.Color() },
    amber: { value: new THREE.Color(1, 0.55, 0.13) },
  };
  const strengths = { shadow: { value: 0.5 }, contact: { value: 0.5 }, pool: { value: 1 } };
  const floor = shadowFloor(strengths.shadow);
  const pool = disc(colours.pool, strengths.pool, true, -3);
  const contact = disc(colours.black, strengths.contact, false, -1);
  // (none of the three writes depth, so they cannot fight; they are a hair apart only to be drawn in order)
  pool.position.y = 0.0005;
  floor.position.y = 0;
  contact.position.y = 0.001;

  const rim = new THREE.DirectionalLight(0xd6e6ff, 2.2);
  const kicker = new THREE.DirectionalLight(0xffe9cf, 1.1);
  const lamp = new THREE.DirectionalLight(0xfff6ea, 0);
  const fill = new THREE.DirectionalLight(0xdfe8ff, 0.45);
  rim.position.copy(RIM).multiplyScalar(60);
  fill.position.copy(FILL).multiplyScalar(60);
  /** The middle of what stands there: what the lights that follow the view are aimed at. */
  const subject = new THREE.Vector3(0, 1, 0);
  let open = false;

  // The floor as a mirror, faint: three's own, with a shader that adds what it sees and fades it out from under the
  // thing. Not on a phone (it is the scene drawn a second time), and not in a drawing.
  const fine = !matchMedia('(pointer: coarse)').matches;
  const reach = { value: 10 };
  const sheen = { value: 0.1 };
  const mirror = new Reflector(new THREE.CircleGeometry(1, 48), {
    textureWidth: 1024,
    textureHeight: 1024,
    clipBias: 0.002,
    multisample: 0,
    shader: {
      name: 'StudioFloor',
      uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uSheen: sheen },
      vertexShader: /* glsl */ `
        uniform mat4 textureMatrix; varying vec4 vUv; varying vec2 vAt;
        void main() {
          vUv = textureMatrix * vec4(position, 1.0);
          vAt = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse; uniform float uSheen; varying vec4 vUv; varying vec2 vAt;
        void main() {
          vec3 seen = texture2DProj(tDiffuse, vUv).rgb;
          float k = 1.0 - smoothstep(0.35, 1.0, length(vAt));
          gl_FragColor = vec4(min(seen, vec3(4.0)) * uSheen * k, 1.0);
        }`,
    },
  });
  mirror.rotation.x = -Math.PI / 2;
  mirror.position.y = 0.0002;
  mirror.renderOrder = -4;
  const material = mirror.material as THREE.ShaderMaterial;
  material.transparent = true;
  material.depthWrite = false;
  material.blending = THREE.AdditiveBlending;
  // Drawn once for each frame the stage draws (`view`), not once for each pass that draws the scene; and what it sees
  // is the thing, not the floor's own light and shadow.
  let due = false;
  const reflect = mirror.onBeforeRender;
  mirror.onBeforeRender = (...args) => {
    if (!due) return;
    due = false;
    const hidden = [pool, contact, floor, figure].filter((o) => o.visible);
    for (const o of hidden) o.visible = false;
    reflect.apply(mirror, args);
    for (const o of hidden) o.visible = true;
  };

  const figure = new THREE.Group();
  figure.name = 'ScaleMeasure';
  figure.visible = false;
  const card = outline(colours.figure);
  const person = new THREE.Group();
  person.add(card);
  // (the pole's two colours, made once: a pole is made again each time something else stands there, and only its
  // geometry is new and disposed of)
  const bands = [flat(colours.amber), flat(colours.ink)] as const;
  let staff = pole(1, ...bands);
  figure.add(person, staff);
  let stature = STATURE;
  let own: THREE.Object3D | null = null;
  let height = 1;

  const environments = new Map<string, THREE.Texture>();
  const bake = (p: Palette): THREE.Texture => {
    const key = `${p.wall}/${p.boxes}`;
    let made = environments.get(key);
    if (!made) {
      const gen = new THREE.PMREMGenerator(renderer);
      const baked = room(p.wall, p.boxes);
      made = gen.fromScene(baked, 0.02, 0.1, 200).texture;
      gen.dispose();
      // (the room was drawn the once: what it put on the graphics card goes with it)
      baked.traverse((o) => {
        const mesh = o as THREE.Mesh;
        mesh.geometry?.dispose();
        for (const m of [mesh.material ?? []].flat()) m.dispose();
      });
      environments.set(key, made);
    }
    return made;
  };

  let cel = false;
  const apply = (): void => {
    const p = PALETTE[cel ? 'paper' : setting.tone];
    sweep.uniforms.uFloor.value.setRGB(...p.floor);
    sweep.uniforms.uBand.value.setRGB(...p.band);
    sweep.uniforms.uTop.value.setRGB(...p.top);
    colours.pool.value.setRGB(...p.pool);
    colours.figure.value.setRGB(...p.figure);
    colours.ink.value.setRGB(...p.ink);
    strengths.shadow.value = p.shadow;
    strengths.contact.value = p.contact;
    setting.exposure = p.exposure;
    setting.environment = bake(p);
    setting.environmentIntensity = p.environment;
    setting.fill = [p.sky, p.ground, 0.42];
    // a drawing is lit flat from the front: the rim and the fill would each add a band of tone of their own
    rim.intensity = cel ? 0 : setting.tone === 'light' ? 1.3 : 2.2;
    kicker.intensity = cel ? 0 : setting.tone === 'light' ? 0.6 : 1.1;
    fill.intensity = cel ? 0 : 0.45;
    lamp.intensity = open && !cel ? 1.5 : 0;
    sweep.uniforms.uSpot.value = cel ? 0 : setting.tone === 'light' ? 0.35 : 1;
    mirror.visible = fine && !cel;
    sheen.value = setting.tone === 'light' ? 0.05 : 0.11;
  };

  const setting: Studio = {
    studio: true,
    backdrop: sweep,
    environment: null as unknown as THREE.Texture, // (baked by `apply`, below, before anything reads it)
    environmentIntensity: 0.5,
    sunDir: KEY.clone(),
    sunColor: 0xfff4e6,
    sunIntensity: 2.6,
    fill: [0x3a3f48, 0x17171a, 0.42],
    floor,
    maxPolar: Math.PI / 2 - 0.012,
    // no higher than 58 degrees above the level: a piece standing on a floor is looked at, not looked down on from the ceiling
    minPolar: THREE.MathUtils.degToRad(32),
    exposure: 0.95,
    fog: null,
    scenery: [mirror, pool, contact, rim, rim.target, kicker, kicker.target, lamp, lamp.target, fill, fill.target, figure],
    horizon: 60,
    shadowRadius: 5,
    tone: 'dark',
    setTone(tone) {
      setting.tone = tone;
      apply();
    },
    simplify(on) {
      cel = on;
      apply();
    },
    fit(box) {
      const size = box.getSize(new THREE.Vector3());
      const centre = box.getCenter(new THREE.Vector3());
      const footprint = Math.max(0.4, Math.hypot(size.x, size.z) / 2);
      height = Math.max(0.5, box.max.y);
      const span = Math.max(height, 2 * footprint);
      // the floor has to take the key's whole shadow, taken apart as well as together
      floor.scale.setScalar(Math.max(60, 8 * span));
      pool.scale.setScalar(Math.max(4, 2.2 * span));
      subject.set(centre.x, box.max.y / 2, centre.z);
      reach.value = Math.max(3, 1.6 * span);
      mirror.scale.setScalar(reach.value);
      mirror.position.set(centre.x, mirror.position.y, centre.z);
      fill.target.position.copy(subject);
      fill.position.copy(subject).addScaledVector(FILL, 60);
      pool.position.set(centre.x, pool.position.y, centre.z);
      contact.scale.setScalar(1.5 * footprint + 0.25);
      contact.position.set(centre.x, contact.position.y, centre.z);
      setting.horizon = Math.max(40, 6 * span);
      // the measure stands to the left of the default view and a little toward it: beside the thing, never in front
      const clear = footprint + 0.75;
      person.position.set(centre.x - 0.86 * clear, 0, centre.z - 0.1 * clear);
      figure.remove(staff);
      staff.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      staff = pole(height, ...bands);
      staff.position.set(centre.x - 0.86 * (clear + 0.55), 0, centre.z - 0.5 * (clear + 0.55));
      figure.add(staff);
    },
    inside(on) {
      open = on;
      apply();
    },
    measure(on) {
      figure.visible = on;
    },
    get measured() {
      return figure.visible;
    },
    person(model, forward = [0, 1]) {
      if (own) person.remove(own);
      own = model;
      card.visible = !model;
      stature = STATURE;
      if (!model) return;
      // facing the default view, as the outline does
      model.position.set(0, 0, 0);
      model.rotation.set(0, Math.atan2(-0.62, 0.78) - Math.atan2(forward[0], forward[1]), 0);
      person.add(model);
      model.updateMatrixWorld(true);
      stature = new THREE.Box3().setFromObject(model).max.y - person.position.y;
    },
    marks() {
      if (!figure.visible) return null;
      return {
        pole: staff.position.clone().setY(height),
        height,
        head: person.position.clone().setY(stature),
        stature,
      };
    },
    view(camera) {
      due = true;
      // The kickers stand behind the thing as it is seen: round from the line of sight by 125 degrees either way, and
      // above it. The lamp is at the viewer's shoulder, up and to the left, looking where the viewer looks.
      const sight = new THREE.Vector3().subVectors(subject, camera.position).setY(0);
      if (sight.lengthSq() < 1e-6) sight.set(0, 0, -1);
      sight.normalize();
      const round = (light: THREE.DirectionalLight, turn: number, rise: number): void => {
        const toward = sight.clone().applyAxisAngle(UP, turn).multiplyScalar(-1).setY(rise).normalize();
        light.target.position.copy(subject);
        light.position.copy(subject).addScaledVector(toward, 60);
      };
      round(rim, THREE.MathUtils.degToRad(125), 0.45);
      round(kicker, THREE.MathUtils.degToRad(-130), 0.3);
      round(lamp, THREE.MathUtils.degToRad(-14), 0.35);
      // the outline is a card: it turns about its feet to face whoever is looking
      if (!figure.visible || own) return;
      const at = person.getWorldPosition(new THREE.Vector3());
      card.rotation.y = Math.atan2(camera.position.x - at.x, camera.position.z - at.z);
    },
  };
  apply();
  return setting;
}
