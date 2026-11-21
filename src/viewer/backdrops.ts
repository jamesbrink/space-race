import * as THREE from 'three';
import { disposeTree } from './dispose.ts';
import type { FlightPlan } from '../sim/plan.ts';
import type { BackdropKind, SitedFlight } from '../types.ts';
import { skyFrom } from '../world/ephemeris.ts';
import { EARTH_SPHERE } from '../world/bodies.ts';
import { DEG, siteFrame } from '../world/frames.ts';
import { julianDate } from '../world/time.ts';
import { densityFor, type PlaceAir, setDeckShade, setHazeAbove, setVeilLight, uCloudsLeft } from './air.ts';
import { atmosphereUniforms, extinctionAt, hazeFor, makeAtmosphere, RAYLEIGH_SCALE, transmittanceAt } from './atmosphere.ts';
import { type Blowing, dayOf, DECK_DEPTH, VEIL_DOWN, veilShade, windsOf } from './day.ts';
import { DAY_EXPOSURE, type DayLight, dayLight, NIGHT_ADAPTATION, type RGB, starLimit } from './daysky.ts';
import { wavesOf } from '../sim/sea.ts';
import { chapman, Globe } from './globe.ts';
import { Heavens, MOON_GLSL, starsAlone } from './heavens.ts';
import { DUTY, lampsLit } from './lamps.ts';
import type { Land } from './land.ts';
import { later } from './later.ts';
import type { Levelled } from './lod.ts';
import { NOISE } from './glsl.ts';
import { groundPlace, type Place } from './scenery/ground.ts';
import { GROUNDS } from './scenery/places.ts';
import { OrbitBackdrop, orbitEnvironment } from './space.ts';
import { studio } from './studio.ts';
import { checkUnits } from './units.ts';
import { uLast } from './overlay.ts';
import { newPlace } from './programs.ts';
import { DECK_REACH } from './weather.ts';
import { FlightMoon } from './flightmoon.ts';
import { frameOf } from '../world/earthframe.ts';
import { tier } from './tier.ts';
import { WeatherMap } from './weathermap.ts';

/** Something drawn behind the model, with a camera that copies the main one's rotation. */
export interface Backdrop {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  update(dt: number): void;
}

/** Everything about a setting that is not the model: sky, light, reflections, floor. */
export interface Setting {
  backdrop: Backdrop;
  environment: THREE.Texture;
  environmentIntensity: number;
  /** Toward the one direct light: the Sun, or by night the Moon. */
  sunDir: THREE.Vector3;
  sunColor: number | THREE.Color;
  sunIntensity: number;
  /** Hemisphere fill: [sky, ground, intensity]. */
  fill: [number, number, number];
  /** A surface under the model that takes its shadow, or null in orbit. */
  floor: THREE.Mesh | null;
  /** Let go of what it holds on the GPU outside the scene (its reflections' bakes: Settings.drop). */
  release?: () => void;
  /** How far below the horizon the camera may orbit, radians from straight up. */
  maxPolar: number;
  /** How near overhead it may orbit, radians from straight up (default: overhead). */
  minPolar?: number;
  exposure: number;
  /** Haze that fades distant ground into the horizon, or null. */
  fog: THREE.FogExp2 | null;
  /** Scenery that is part of the place rather than the model. */
  scenery: THREE.Object3D[];
  /** Of that scenery, what is drawn at levels of detail and chooses them by its size on screen, as the place round the pad does (lod.ts `Levelled`). */
  levels?: Levelled[];
  /** How far from the model there is something to look at, metres: the view can be walked and pulled back this far. */
  reach?: number;
  /** How far away the furthest thing in the place is, metres: the camera sees at least this far. Left out: only the model. */
  horizon?: number;
  /** Where the eye is: a place may draw what is near it in more detail. True if that changed what is drawn. */
  attend?: (eye: THREE.Vector3, frozen?: boolean) => boolean;
  /** Something of the place that casts a shadow has arrived since this was last asked (true once): the shadow maps are owed again. */
  arrived?: () => boolean;
  /** The camera as it is about to draw, for a place that leaves out what it cannot see. */
  view?: (camera: THREE.Camera) => void;
  /** The terrain's height under the model's zero round the pad, metres (the pad's: SiteDef.grade); left out, GROUND_Y. */
  grade?: number;
  /** The ground's height at (x, z) in the world, where the setting's floor is not level: the walker stands on it. */
  groundAt?: (x: number, z: number) => number;
  /** The made surface the land is painted as at (x, z) in the world (a road, an apron: scenery/ground.ts `GroundSpec.painted`), or null. */
  paintedAt?: (x: number, z: number) => string | null;
  /** How far a point is from the nearest plant, if under `within` metres (plants are not solid: the near plane asks). */
  plantsClear?: (at: THREE.Vector3, within: number) => number;
  /** Move a point at someone's feet out of the plants it is in (sideways), and say how far in it still is, metres: plants are walked round. */
  plantsOut?: (at: THREE.Vector3, margin: number) => number;
  /**
   * Move the setting to an instant: a Julian date in UT, the simulation clock's. The Sun, the
   * Moon and the stars go where they were then, and the light, the sky and the reflections follow;
   * the fields above are changed in place. Returns null while nothing on screen has changed (the
   * instant is the same, or the sky has turned by less than can be seen); otherwise what the stage
   * must take up again, with `shadows` set if the light has moved far enough to redraw them.
   * `height`: the eye's height over the setting's ground, metres; the sky darkens as the air
   * above the eye thins (`airAbove`). `atOnce` (a frozen stage): nothing is faded in or put off by the wall's clock, so
   * a frame drawn again is the same frame: a bake owed is made now and put in at once, and a fade under way is finished.
   */
  at?: (jdUT: number, height?: number, atOnce?: boolean) => { shadows: boolean; jumped?: boolean } | null;
  /**
   * How far up the pad's floods are at the instant `at` was last given (0 out to 1 at full light: lamps.ts `lampsLit`, by
   * the site's `lamps`). Left out (the studio, orbit): as the Sun's light fails.
   */
  lamps?: number;
  /** What there is at that instant (daysky.ts): the light on level ground, lux, and the luminance the eye adapts to in the open, cd/m². */
  lux?: number;
  adapted?: number;
  /**
   * The eye has adapted to more than the sky's light (eye.ts): the exposure is the setting's times `factor`. What the
   * setting draws that is not lit and not in proportion to what is (the Moon's disc, the stars) is told, so the Moon
   * stays as bright as it is to an eye among floodlights, and the faint stars go.
   */
  eye?: (factor: number) => void;
  /**
   * The faintest star the eye sees above the air for what is lit in its view (eye.ts `StarEye`): 6.5 with nothing lit
   * in it. Under the air the sky's own light sets the stars' limit and this is not asked.
   */
  stars?: (limit: number) => void;
  /** How far out of the air the eye is at the instant `at` was last given: 0 under all of it, 1 above it (1 - `airAbove`). */
  space?: number;
  /** How much of the Sun's disc the eye sees from where it is, past the Earth's edge (0 to 1), at that instant. */
  sunlit?: number;
  /** Anything in the setting that moves (surf). */
  tick?: (dt: number) => void;
  /** The Earth beyond the place, to scale (globe.ts): drawn once the eye can see past the place's own ground. */
  globe?: Globe;
  /** The Moon where it is, as a body (flightmoon.ts): drawn once the eye is out of the air, over the sky's disc of it. */
  moon?: FlightMoon;
  /** A place's air on its day (air.ts): the haze, its clouds and their drift, which the stage's cloud pass, fires and smoke read. */
  air?: PlaceAir;
  /** And its weather's map (weathermap.ts): let go with the setting. */
  weather?: WeatherMap;
  /** The wind drawn at the instant `at` was last given (day.ts `windsOf`): the plants, the low cloud's drift and the sea's waves follow it. */
  blowing?: Blowing;
  /** Draw the place simplified, for the cel look: flat land, plants as single shapes. */
  simplify?: (on: boolean) => void;
  /** The thing shown is cut open, or closed again (Stage.setCutaway): a room lights what is inside (studio.ts). */
  inside?: (open: boolean) => void;
  /** How soft the edge of the direct light's shadow is, in texels of its map (default 1: the Sun's, which is sharp). */
  shadowRadius?: number;
}

/**
 * Height of the terrain under the model's zero, metres, where a setting gives none of its own (`Setting.grade`: the
 * pad's, SiteDef.grade, on the ground; the studio and the gallery have this). At the two pads drawn so far the pads and
 * roads were at grade, so the sand is only a hand's breadth under the concrete: 12 cm, which is more than the 5 to 6 cm
 * at which parallel faces seen from across the site began to flicker (AGENTS.md, "No flicker"). Models that stand on
 * the ground reach down past it (site.py: FOOTING), and the site's builders take it as `GROUND`: change them together.
 */
export const GROUND_Y = -0.12;

/**
 * The ground's sky. Its shape is here (the gradient, the clouds, the glow along the horizon); its
 * colours are uniforms, set for the Sun's height by daysky.ts, so the same shader is noon, dusk
 * and night. A cloud takes its light from uCloudLight and the haze from uHorizon.
 */
const SKY = (veil: boolean) => /* glsl */ `
  uniform vec3 uSun, uZenith, uHorizon, uGlow, uCloudLight, uSunLight, uUp; uniform float uWisps, uGlare; varying vec3 vDir;
  ${veil ? 'uniform vec3 uVeilSun, uVeilAir; uniform float uVeilDepth;' : ''}
  ${NOISE}
  ${MOON_GLSL}
  vec3 sky(vec3 d, bool discs) {
    // up is the plumb line where the eye is (uUp): downrange over the curved Earth it leans from the site's
    float up = dot(d, uUp);
    float h = max(up, 0.0);
    // twilight: the lit air lies along the horizon, deepest toward the Sun
    float toward = dot(normalize(d - uUp * up + 1e-6), normalize(uSun - uUp * dot(uSun, uUp) + 1e-6)) * 0.5 + 0.5;
    vec3 low = uHorizon + uGlow * (0.12 + 0.88 * toward * toward * toward);
    vec3 col = mix(mix(uHorizon, low, exp(-h * 7.0)), uZenith, pow(h, 0.5));
    // the Moon is beyond the air, so its light is added to the sky's and the clouds pass in front of it
    if (discs) col += moonLight(d);
    // high cloud, thin and sparse: one eighth of altocumulus at 3,600 m at Patrick at 10:00 (NOAA ISD). The cumulus
    // under it are a volume marched through over the scene (clouds.ts), not painted on the sky
    vec2 uv = d.xz / (h + 0.12);
    // (worked out only in the band of sky they lie in, and only while they are there to be seen)
    float cloud = uWisps * smoothstep(0.012, 0.07, h) * (1.0 - smoothstep(0.3, 0.7, h));
    if (cloud > 0.0) cloud = smoothstep(0.6, 0.74, fbm(vec3(uv * 1.3, 0.0)) * 0.7 + fbm(vec3(uv * 5.0, 3.0)) * 0.3) * cloud / uWisps;
    float s = max(dot(d, uSun), 0.0);
    col = mix(col, uCloudLight * (0.9 + 0.35 * s), cloud * 0.45 * uWisps);   // (none once the eye is up among them)
    ${
      veil
        ? /* glsl */ `// A veil of high cloud over the whole sky, as the reflections see it (the eye's is the cloud pass's sheet,
    // clouds.ts: this is that sheet from under it, without its streaks): milky, brightest round the Sun, more of it
    // the lower the eye looks, and lost in the haze along the horizon.
    float veiled = (1.0 - exp(-uVeilDepth * min(1.0 / max(up, 0.05), 6.0))) * smoothstep(0.02, 0.12, up);
    col = mix(col, uVeilSun * (0.8 + 0.9 * pow(s, 6.0)) + uVeilAir, veiled);`
        : ''
    }
    col = mix(low * 0.96, col, smoothstep(-0.004, 0.012, up));   // below the horizon: haze
    // the glare round the Sun is the air's (it goes as the air thins: uGlare); above the air what is left is the eye's or the lens's own, white and close round a hard disc (estimated)
    col += mix(vec3(1.0), vec3(1.0, 0.9, 0.75), uGlare) * uSunLight * (pow(s, 10.0) * 0.18 * uGlare + pow(s, 300.0) * 1.6 * uGlare + pow(s, 4000.0) * 5.0 * (1.0 - uGlare));
    return col;
  }`;

type SkyUniforms = Record<
  | 'uSun'
  | 'uSunSize'
  | 'uZenith'
  | 'uHorizon'
  | 'uGlow'
  | 'uCloudLight'
  | 'uSunLight'
  | 'uWisps'
  | 'uUp'
  | 'uGlare'
  | 'uVeilSun'
  | 'uVeilAir'
  | 'uVeilDepth',
  THREE.IUniform
>;

/**
 * The sky's material. `discs`: with the Sun's disc and the Moon in it, as the eye sees it; without,
 * it is the light the sky sheds, for the reflections (where the Sun is a patch of its own).
 * `gain` scales what it draws (the reflections are baked at a day's brightness: see `Reflections`). `veil`: with the
 * day's veil of high cloud in it (the reflections' sky: the eye's has it laid over by the cloud pass).
 */
function skyMaterial(
  uniforms: SkyUniforms,
  h: Heavens,
  discs: boolean,
  gain: THREE.IUniform<number> = { value: 1 },
  veil = false,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { ...uniforms, ...h.moon, uGain: gain },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uSunSize, uGain;
      ${SKY(veil)}
      void main() {
        vec3 d = normalize(vDir);
        vec3 col = sky(d, ${discs});
        ${
          discs
            ? /* glsl */ `// the Sun at its true size, half a degree across, reddened by the air it shines through:
        // the glow round it is the sky's and the bloom's
        // (the edge no broader than a pixel can be: along a seam of the dome's own triangles the derivative is wild, and
        // a row of pixels there took a share of the disc from across the sky: a dotted line up the sky)
        float off = length(cross(d, uSun)), edge = min(fwidth(off), 0.004);
        if (dot(d, uSun) > 0.0) col += vec3(40.0, 36.0, 30.0) * uSunLight * (1.0 - smoothstep(uSunSize - edge, uSunSize + edge, off));`
            : ''
        }
        gl_FragColor = vec4(col * uGain, 1.0);
      }`,
  });
}

/**
 * The reflections a ground setting's light makes, changing as smoothly as the light does.
 *
 * Baking them (a PMREM of the sky) costs too much to do every frame, and a bake that lands all at
 * once is seen: with the clock run fast the whole scene's reflected light jumped every few
 * seconds. So the two things that change are kept apart. How bright the sky is changes every
 * frame, through `environmentIntensity`: each bake is made at a day's brightness (the sky divided
 * by its own level) and scaled back down as it is shown. What the sky looks like (its colours,
 * where the Sun is in it) changes only with a bake, and each new one is faded in from what was
 * shown, over about as long as bakes are coming apart, so the light never steps.
 *
 * A step of the fade is thirty-six small draws (six faces of six levels), a tenth of a millisecond
 * in all; it is carried on only from `Setting.at`, once a frame, and every such frame is drawn.
 */
class Reflections {
  private readonly renderer: THREE.WebGLRenderer;
  private shown: THREE.WebGLCubeRenderTarget | null = null;
  private from: THREE.WebGLCubeRenderTarget | null = null;
  private to: THREE.WebGLCubeRenderTarget | null = null;
  private began = 0;
  private over = 0;
  private fading = false;
  // A PMREM is a cube map whose mip levels are the sky blurred for rougher and rougher surfaces.
  // Two of them are mixed level by level and face by face, texel onto texel, so the mix is one too.
  // Each face of each level is one triangle over the whole of it, drawn straight into that face:
  // `uFace` turns a point of the face (x and y from -1 to 1, one unit in front) to its direction.
  private readonly mix = new THREE.ShaderMaterial({
    uniforms: { uFrom: { value: null }, uTo: { value: null }, uK: { value: 0 }, uLod: { value: 0 }, uFace: { value: new THREE.Matrix3() } },
    side: THREE.DoubleSide,
    blending: THREE.NoBlending,
    depthTest: false,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vWorldDirection;
      uniform mat3 uFace;
      void main() {
        vWorldDirection = uFace * vec3(position.xy, -1.0);
        gl_Position = vec4(position.xy, 1.0, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vWorldDirection;
      uniform samplerCube uFrom, uTo; uniform float uK, uLod;
      void main() {
        vec3 d = normalize(vWorldDirection);
        gl_FragColor = mix(textureLod(uFrom, d, uLod), textureLod(uTo, d, uLod), uK);
      }`,
  });
  private readonly pane = new THREE.Scene();
  private readonly eye = new THREE.Camera();
  /** Which way each face of a cube map looks, as three's cube camera has them (the order and the turn of each are the renderer's). */
  private faces: THREE.Matrix3[] | null = null;

  constructor(renderer: THREE.WebGLRenderer) {
    this.renderer = renderer;
    const triangle = new THREE.BufferGeometry();
    triangle.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
    const mesh = new THREE.Mesh(triangle, this.mix);
    mesh.frustumCulled = false;
    mesh.matrixAutoUpdate = false;
    this.pane.add(mesh);
    this.pane.matrixAutoUpdate = false;
    this.pane.matrixWorldAutoUpdate = false;
  }

  /** Let go of every bake and the pane they are mixed on (the setting is let go: Settings.drop). */
  dispose(): void {
    for (const target of [this.shown, this.from, this.to]) target?.dispose();
    this.shown = this.from = this.to = null;
    this.fading = false;
    this.mix.dispose();
    for (const o of this.pane.children) (o as THREE.Mesh).geometry?.dispose();
  }

  /** What the scene reflects: always the same texture, so materials never notice a bake. */
  get texture(): THREE.Texture {
    return this.shown!.texture;
  }

  /** A new bake, faded in from what is shown over `ms` milliseconds (0: at once). Takes ownership of it. */
  take(bake: THREE.WebGLCubeRenderTarget, ms: number): void {
    const first = !this.shown;
    if (!this.shown) {
      this.shown = like(bake);
      this.from = like(bake);
    } else this.draw(this.from!, this.shown, this.shown, 0); // start from wherever the last fade had got to
    this.to?.dispose();
    this.to = bake;
    this.began = performance.now();
    this.over = ms;
    this.fading = true;
    // (a fade begins at what is shown, which is there already: only a first bake, or one put in at once, is drawn now)
    if (first || ms <= 0) this.step(this.began);
  }

  /** Carry the fade on to `now`. True if what is reflected changed. */
  step(now: number): boolean {
    if (!this.fading) return false;
    const k = this.over > 0 ? Math.min(1, (now - this.began) / this.over) : 1;
    this.draw(this.shown!, this.from!, this.to!, k);
    if (k >= 1) this.fading = false;
    return true;
  }

  private draw(into: THREE.WebGLCubeRenderTarget, a: THREE.WebGLCubeRenderTarget, b: THREE.WebGLCubeRenderTarget, k: number): void {
    const renderer = this.renderer;
    if (!this.faces) {
      const lens = new THREE.CubeCamera(0.1, 10, into);
      lens.coordinateSystem = renderer.coordinateSystem;
      lens.updateCoordinateSystem();
      // (a point of the picture to its direction: back through the face camera's lens, whose field of view three makes negative, then its turn)
      this.faces = (lens.children as THREE.PerspectiveCamera[]).map((face) => {
        const p = face.projectionMatrix.elements;
        return new THREE.Matrix3()
          .setFromMatrix4(face.matrixWorld)
          .multiply(new THREE.Matrix3().set(1 / p[0]!, 0, 0, 0, 1 / p[5]!, 0, 0, 0, 1));
      });
    }
    const u = this.mix.uniforms;
    u.uFrom!.value = a.texture;
    u.uTo!.value = b.texture;
    u.uK!.value = k;
    const was = renderer.getRenderTarget();
    const face = renderer.getActiveCubeFace();
    const level = renderer.getActiveMipmapLevel();
    const xr = renderer.xr.enabled;
    renderer.xr.enabled = false;
    for (let lod = 0; lod < into.texture.mipmaps.length; lod++) {
      // (the renderer takes the target's viewport as it is, not scaled to the level: as PMREMGenerator does)
      into.viewport.set(0, 0, into.width >> lod, into.width >> lod);
      u.uLod!.value = lod;
      for (let f = 0; f < 6; f++) {
        u.uFace!.value = this.faces[f]!;
        renderer.setRenderTarget(into, f, lod);
        renderer.render(this.pane, this.eye);
      }
    }
    into.viewport.set(0, 0, into.width, into.height);
    renderer.xr.enabled = xr;
    renderer.setRenderTarget(was, face, level);
  }
}

/** An empty PMREM of the same size and levels as `pmrem`, as PMREMGenerator makes them. */
function like(pmrem: THREE.WebGLCubeRenderTarget): THREE.WebGLCubeRenderTarget {
  const target = new THREE.WebGLCubeRenderTarget(pmrem.width, {
    minFilter: THREE.LinearMipmapLinearFilter,
    generateMipmaps: false,
    type: THREE.HalfFloatType,
    colorSpace: THREE.LinearSRGBColorSpace,
    depthBuffer: false,
  });
  const levels = pmrem.texture.mipmaps.length;
  // only the levels' sizes: PMREMGenerator allocates them so, with no data
  const sizes = target.texture.mipmaps as unknown as { width: number; height: number }[];
  for (let lod = 0; lod < levels; lod++) sizes.push({ width: pmrem.width >> lod, height: pmrem.width >> lod });
  target.texture.name = 'PMREM';
  (target.texture as THREE.Texture & { isPMREMTexture: boolean }).isPMREMTexture = true;
  return target;
}

class DomeBackdrop implements Backdrop {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  /** `over`: what shines through the sky (stars, planets), drawn after it. */
  constructor(material: THREE.Material, over?: THREE.Object3D) {
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), material));
    if (over) this.scene.add(over);
  }
  update(): void {}
}

/**
 * Where a setting is and the instant it is first shown at: a flight's site and launch. The Sun,
 * the Moon, the stars and the planets are put where they stood over that place (src/world/
 * ephemeris.ts), in the site's own frame, which is the models', and `Setting.at` moves them to
 * any other instant. Nothing in the sky is placed by hand. Its plan, where it has one, says how high it goes
 * (`heightOf`).
 */
export type Occasion = Pick<SitedFlight, 'site' | 'launch' | 'weather'> & Partial<Pick<SitedFlight, 'plan'>>;

/**
 * How high a flight goes, metres, as its record has it: its orbit's apogee as published, or the greatest height of a
 * flight that goes up and comes down again (its `apogee` check). Undefined for one that says neither.
 */
export function heightOf(plan: FlightPlan | undefined): number | undefined {
  return plan?.record?.orbit?.apogee.value ?? plan?.checks.find((c) => c.id === 'apogee')?.value;
}

/** The places built, by place, pad and day: a place is laid round its pad, and its season and sky are the day's. */
const places = new Map<string, Place>();
/** Which of `places` each ground setting is laid on (`Settings.drop` lets the place go with it). */
const placeOf = new WeakMap<Setting, string>();

/** The sky turns 15 arcseconds a second. Under this many seconds of it nothing has moved a pixel, and the view is left alone. */
const SKY_STEP = 4;
/** The sunlit Earth's light on what is above the air, at full phase and filling half its sky, as a share of a clear day's sky's (backdrops.ts `space`). Estimated. */
const EARTHSHINE = 1.7;
/**
 * The sunlit Moon's, on the same terms: the Earth's figure times the Moon's albedo over the Earth's (0.12 against the 0.3
 * `EARTHSHINE` is taken at: viewer/moon.ts `ALBEDO`). Derived from an estimate. At 110 km over it the Moon fills nearly
 * half the sky, and lights what is in the Sun's shadow with a grey a third of the Earth's from low orbit.
 */
const MOONSHINE = EARTHSHINE * (0.12 / 0.3);

/**
 * How much of the sea-level sky's glow is left at `height` metres: the sky's blue is sunlight
 * scattered by the air above the eye, so it goes as the pressure there, which falls by e over a
 * scale height (about 8 km low down). By 50 km the sky is black at noon, as the X-15's pilots and
 * Shepard saw it. The horizon keeps its glow longer: the eye looks along through more air there.
 * In steps of half a percent, so a climbing camera redraws the sky only when it visibly changes.
 */
export function airAbove(height: number): number {
  return Math.round(Math.exp(-Math.max(0, height) / 8000) * 200) / 200;
}
/**
 * With the clock run fast the light moves every frame. Drawing the shadow map and baking the
 * reflections are the two things that cost, so each is done only when the light has moved this
 * far (degrees) and no more often than this (milliseconds of ours); whatever is owed when the
 * clock stops is paid then. Shadows are drawn again whenever the light has moved a twentieth of a
 * degree, every frame if need be: a redraw costs a millisecond or so, and shadows redrawn a few
 * times a second were seen stepping as a fast dusk drew them out. A bake is never seen landing
 * (Reflections fades each in), so `unhurried`, for a view nobody is steering (the idle show),
 * bakes less often, which keeps the frames between even.
 */
const BRISK = { shadowStep: 0.05, bakeStep: 1, shadowEvery: 0, bakeEvery: 500 };
const UNHURRIED = { shadowStep: 0.05, bakeStep: 4, shadowEvery: 0, bakeEvery: 3000 };
let cadence = BRISK;
export function unhurried(on: boolean): void {
  cadence = on ? UNHURRIED : BRISK;
}

const colour = (target: THREE.Color, rgb: RGB): THREE.Color => target.setRGB(rgb[0], rgb[1], rgb[2]);

/** How strongly a ground setting's sky is reflected by day. */
const ENVIRONMENT = 0.55;
/** The brightest the reflections' bake may hold (the Sun's patch), in its half floats: well inside their 65,504 through the blur that makes it (`day`, below). */
const BAKE_MOST = 4000;
/** How far the sky's colours (at a day's brightness) may drift before the reflections are baked again: the largest change in one, of 1. */
const LOOK_STEP = 0.04;
const apart = (a: number[], b: number[]): number =>
  a.length === b.length ? a.reduce((most, v, i) => Math.max(most, Math.abs(v - b[i]!) / Math.max(1, Math.abs(v))), 0) : Infinity;

/**
 * A place on the ground, at any hour, under its own sky. For Freedom 7 at the Cape (14:34:13 UTC,
 * 5 May 1961) the Sun comes out on 098.8 degrees true, 50.2 degrees up: in the pad's frame that
 * is behind the hatch side, so the capsule's hatch was in shade. The Moon was up too: a waning
 * gibbous 4.8 degrees above the west-south-west horizon, where the haze all but hides it.
 *
 * Directions, sizes and the Moon's phase are computed (heavens.ts). The light's colour and
 * strength, the sky's colours and the exposure follow the Sun's height (daysky.ts): a model
 * fitted by eye, whose mid-morning is the look the Cape was first tuned to.
 *
 * The weather is the flight's own day (types.ts: DayWeather; day.ts): the place is built under it, the clouds are
 * laid out by it, and where it has high cloud over the site the light is that Sun's through it (`veil`, below).
 */
function ground(renderer: THREE.WebGLRenderer, when: Occasion | undefined): Setting {
  if (!when) throw new Error('a place on the ground needs a site and an instant: Settings.get(kind, flight)');
  const { place } = when.site;
  const spec = GROUNDS[place.name];
  if (!spec) throw new Error(`no ground for the place ${place.name} (viewer/scenery/places.ts)`);
  const key = [place.name, when.site.name, when.launch.slice(0, 10)].join(' ');
  const site = siteFrame(when.site);
  const today = dayOf(when);
  // the wind through the day: the record's at liftoff, changed as its hours change (day.ts)
  const winds = windsOf(when, today);
  // High cloud over the site, by the record: it dims the Sun for everything under it and gives most of what it takes
  // back as the sky's light (day.ts: veilShade, VEIL_DOWN). Null on a day whose record has none there.
  const veil =
    today.high.cover !== null && today.high.cover > 0 && today.high.depth > 0 ? { ...today.high, cover: today.high.cover } : null;
  const overcast = today.deck.overcast;
  const h = new Heavens(site, true, renderer.getPixelRatio());
  const uniforms: SkyUniforms = {
    uSun: { value: h.sunDir },
    uSunSize: { value: 0 },
    uZenith: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uGlow: { value: new THREE.Color() },
    uCloudLight: { value: new THREE.Color() },
    uSunLight: { value: new THREE.Color() },
    uWisps: { value: 1 },
    uUp: { value: h.up }, // (the stars' plumb line too: what is under the eye's horizon is not drawn)
    uGlare: { value: 1 },
    uVeilSun: { value: new THREE.Color() },
    uVeilAir: { value: new THREE.Color() },
    uVeilDepth: { value: veil ? veil.depth * veil.cover : 0 },
  };
  const envScene = new THREE.Scene();
  const envGain = { value: 1 };
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), skyMaterial(uniforms, h, false, envGain, veil !== null)));
  // Below the horizon there is sunlit sand and concrete, not more sky: without it bare metal
  // reflects blue from every side and reads as frosted glass.
  const below = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
  // and the Sun itself: a small bright patch, so a polished edge has something to catch
  const patch = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 8), new THREE.MeshBasicMaterial());
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(49, 48, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), below), patch);
  let here = places.get(key);
  if (!here) places.set(key, (here = groundPlace(renderer, spec, when.site, today)));
  // the weather the clouds and their shadows are laid out by (weather.ts): the record's at the site, the day's map beyond
  const weather = new WeatherMap(site.bearingX, today);
  const recovery = today.recovery;
  const recoveryWindow = recovery?.weather.transition.map(julianDate);
  const b = site.bearingX * DEG;
  let nearRecovery = 0;
  let nearDeck = 1;
  const density = densityFor(today.visibility);
  const dayAir = here.air.air; // (the place's air on its day: air.ts)
  // the Earth past the place's own ground, which hands over to it across its last kilometre and a half
  const land = here.floor.userData.land as Land;
  here.floor.updateMatrixWorld();
  const globe = new Globe(
    renderer,
    site,
    when.site.seaLevel.value,
    [{ frame: here.floor.matrixWorld.clone().invert(), half: land.extent - 150, ground: here.grade }],
    dayAir,
    weather,
    when.site.place.region?.name ?? null,
    here.tone,
    here.drawn,
    // (the day's sea where a flight comes down: drawn round the point once a run is down there, Globe.swell)
    wavesOf(when.weather?.sea?.trains),
  );
  // (a development build says which lit materials have left too few texture units for lights: units.ts)
  if (import.meta.env.DEV) later(() => setTimeout(() => checkUnits(renderer), 4000));
  const cumulus = today.cumulus;
  // (by the edge of its cover maps, past which their last texels are smeared outward: Complex 34, the furthest built, is inside 9.5 km)
  const covered = land.uniforms.uFarSize!.value as number;
  land.meet(globe.beyond, covered - 1500, covered);
  // the haze at sea level, thinning upward (air.ts), as the place has it
  const fog = new THREE.FogExp2(0, density);
  // The air seen from above it (atmosphere.ts), with this haze. The Sun's light above the air is white (the scene's
  // white is the Sun's) and as strong as makes its light on the ground, through the air, as bright as the scene's own
  // at the hour that was tuned for (daysky.ts: a Sun 50 degrees up): so sunlit ground, cloud and sky stand in the
  // scene as they do in the world. Derived, and the same at every hour.
  const haze = hazeFor(fog.density, dayAir.scale);
  makeAtmosphere(renderer, haze);
  {
    const noon = dayLight(50, null).light;
    const through = transmittanceAt(0, Math.sin(50 * DEG), haze);
    const luma = (c: readonly number[]) => 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
    atmosphereUniforms.uAtmSunLight.value.setScalar((noon.intensity * luma(noon.colour)) / luma(through));
  }
  /**
   * The Sun's disc as the eye sees it from a height, against the scene's reference (as DayLight.sun is): through
   * the air above the eye along the line to it, and gone behind the Earth's edge (over its own breadth). The air's
   * column along a slanting line by Chapman's function for the gas; the haze and the ozone are taken with it.
   */
  const reference = transmittanceAt(0, Math.sin(50 * DEG), haze);
  const sunFrom = (height: number, elevation: number): RGB => {
    const mu = Math.sin(elevation * DEG);
    const dip = -Math.acos(EARTH_SPHERE / (EARTH_SPHERE + Math.max(height, 0))) / DEG; // the horizon's, degrees
    const showing = THREE.MathUtils.smoothstep(elevation, dip - 0.27, dip + 0.27);
    if (showing <= 0) return [0, 0, 0];
    const k = extinctionAt(Math.min(height, 99_000), haze);
    const column = RAYLEIGH_SCALE * chapman(height, Math.max(mu, Math.sin(dip * DEG)), EARTH_SPHERE, RAYLEIGH_SCALE);
    return [0, 1, 2].map((c) => (showing * Math.exp(-k[c]! * column)) / reference[c]!) as unknown as RGB;
  };
  const gen = new THREE.PMREMGenerator(renderer);
  const reflections = new Reflections(renderer);

  // what the screen last showed, to tell when it needs showing again
  let shownCover = 0;
  let shownAt = Number.NaN;
  let askedAt = Number.NaN;
  let askedMs = 0;
  let bakedAt = Number.NEGATIVE_INFINITY;
  let stale = false;
  let shadowsAt = Number.NEGATIVE_INFINITY;
  let shadowsOwed = false;
  let source = '';
  const shadowed = new THREE.Vector3();
  const bakedSun = new THREE.Vector3();
  /** The colours of the last bake at a day's brightness: a bake is owed when they have changed by more than can be seen. */
  let bakedLook: number[] = [];

  // the Moon as a body, where the flight's gravity has it (made empty: nothing of it is fetched until the eye is out of the air)
  const moon = new FlightMoon(site, frameOf(when), import.meta.env.BASE_URL, tier().lighter, renderer.capabilities.getMaxAnisotropy());
  /** The eye as `attend` last had it: the Moon is placed for the instant in `at`, and seen from there. */
  const eyeAt = new THREE.Vector3();
  let eyeFrozen = false;
  const setting: Setting = {
    backdrop: new DomeBackdrop(skyMaterial(uniforms, h, true), h.sky),
    moon,
    environment: null as unknown as THREE.Texture, // baked below, before anyone sees it
    environmentIntensity: ENVIRONMENT,
    sunDir: new THREE.Vector3(0, 1, 0),
    sunColor: new THREE.Color(),
    sunIntensity: 0,
    // sky fill kept low and close to neutral: shadows should read as shade, not as blue paint
    fill: [0xb9c6d6, 0x7a715c, 0.28],
    floor: here.floor,
    maxPolar: Math.PI / 2 - 0.015,
    exposure: 0.8,
    fog,
    scenery: here.scenery,
    levels: here.levels,
    reach: here.reach,
    horizon: here.horizon,
    grade: here.grade,
    tick: here.tick,
    simplify: (on) => {
      here.simplify?.(on);
      h.cel(on);
      moon.simplify(on);
    },
    globe,
    air: here.air,
    weather,
    attend: (eye, frozen) => {
      // the sky's up is the plumb line at the eye
      const was = uniforms.uUp.value.clone();
      const leans = globe.up(eye, uniforms.uUp.value).angleTo(was) > 1e-5;
      if (overcast) nearDeck = 1 - THREE.MathUtils.smoothstep(eye.length(), ...DECK_REACH);
      if (recovery) {
        const de = eye.x * Math.sin(b) + eye.z * Math.cos(b) - recovery.east;
        const dn = eye.x * Math.cos(b) - eye.z * Math.sin(b) - recovery.north;
        nearRecovery = 1 - THREE.MathUtils.smoothstep(Math.hypot(de, dn), recovery.weather.radius.value, 2 * recovery.weather.radius.value);
      }
      // (the clouds' frame goes with the eye once it is far from the site, before anything of this frame is drawn: cloudframe.ts)
      const rolled = here.air.follow(eye, uCloudsLeft.value <= 0);
      const moved = globe.attend(eye, frozen) || leans || rolled;
      eyeAt.copy(eye);
      eyeFrozen = frozen ?? false;
      return here.attend(eye) || moved;
    },
    arrived: here.arrived,
    groundAt: here.groundAt,
    paintedAt: here.paintedAt,
    plantsClear: here.plantsClear,
    plantsOut: here.plantsOut,
    view: (camera) => {
      here.view?.(camera);
      moon.view(camera as THREE.PerspectiveCamera);
    },
    // (under a veil the Sun is a disc in a glow some degrees across: a shadow's edge is that much softer. Estimated)
    ...(overcast ? { shadowRadius: 3 } : {}),
    ...(veil ? { shadowRadius: 1 + 2 * veil.cover * Math.min(1, veil.depth / 0.4) } : {}),
  };

  /** `fade`: milliseconds to fade the bake in over; 0 puts it in at once. */
  setting.release = () => {
    moon.dispose();
    weather.dispose();
    reflections.dispose();
    gen.dispose();
    disposeTree(envScene);
  };

  const bake = (look: number[], fade: number): void => {
    reflections.take(gen.fromScene(envScene, 0, 0.1, 200) as THREE.WebGLCubeRenderTarget, fade);
    setting.environment = reflections.texture;
    bakedSun.copy(h.sunDir);
    bakedLook = look;
    bakedAt = performance.now();
    stale = false;
  };

  // what the veil's light is worked out from (`at`, below): the Sun's light at the hour the scene was tuned for, and
  // the fill's two colours as the light takes them
  const noonSun = ((noon) => noon.colour.map((c) => c * noon.intensity))(dayLight(50, null).light);
  const fillSky = new THREE.Color(setting.fill[0]).toArray();
  const fillGround = new THREE.Color(setting.fill[1]).toArray();
  /**
   * The light where the eye is, as it leaves the air: the ground's (`onGround`, for the Sun's height at the site, as
   * the day there has it) handed over, by `out` (how far out of the air the eye is: 1 - `airAbove`), to the light
   * above the air, which is the same at every hour on the clock and changes only with where the eye is:
   * - the Sun's beam as it reaches the eye (`beam`: sunFrom, through what air is left along the line to it and gone
   *   behind the Earth's edge over its own breadth), white, at the strength that gives the ground its light at the
   *   hour the scene was tuned for (derived, as the globe's own sunlight is);
   * - the exposure the sunlit ground has by day (daysky.ts `DAY_EXPOSURE`) while the Sun shows, the night's
   *   (`NIGHT_ADAPTATION` times it) in the Earth's shadow, between them as the Sun's disc goes behind the edge
   *   (estimated: the eye is taken to keep up);
   * - no sky, and for the fill the sunlit Earth's light (earthshine): its share of the sky round the eye (the square
   *   of the sine of its angular radius) times how much of the face turned to the eye is lit, `EARTHSHINE` of a day's
   *   sky for an Earth filling half the sky at full phase (an albedo of 0.3 against a clear sky's fifth of the Sun's
   *   light: estimated).
   * Each a smooth function of the eye's height and of the Sun's place over its horizon, so nothing steps as the eye
   * climbs or goes into the night: a share of the air is a step of half a per cent (`airAbove`). On the ground
   * (`out` 0) the ground's light is given back as it is, to the bit.
   */
  const space = (onGround: DayLight, out: number, beam: RGB, shows: number, height: number, moonFill = 0): DayLight => {
    if (out <= 0) return onGround;
    const keep = 1 - out;
    // the Sun: the ground's beam (when it is the Sun's) and the beam above the air, mixed by the air
    const groundSun = onGround.light.from === 'sun' ? onGround.light.intensity : 0;
    const rgb = [0, 1, 2].map((c) => onGround.light.colour[c]! * groundSun * keep + noonSun[c]! * beam[c]! * out);
    const sun = Math.max(rgb[0]!, rgb[1]!, rgb[2]!);
    const moon = onGround.light.from === 'moon' ? onGround.light.intensity * keep : 0;
    const light: DayLight['light'] =
      sun >= moon
        ? sun > 0
          ? { from: 'sun', colour: rgb.map((v) => v / sun) as unknown as RGB, intensity: sun }
          : { from: 'none', colour: onGround.light.colour, intensity: 0 }
        : { from: 'moon', colour: onGround.light.colour, intensity: moon };
    // the sunlit Earth's light round the eye
    const r = EARTH_SPHERE / (EARTH_SPHERE + Math.max(height, 0));
    const earthshine = EARTHSHINE * r * r * 0.5 * (1 + THREE.MathUtils.clamp(h.sunDir.dot(h.up), -1, 1));
    const exposure = DAY_EXPOSURE * NIGHT_ADAPTATION ** (1 - shows);
    const mixLog = (a: number, b: number): number => Math.exp(Math.log(a) * keep + Math.log(b) * out);
    return {
      ...onGround,
      light,
      ambient: Math.max(onGround.ambient * keep + (earthshine + moonFill) * out, 0.002),
      exposure: mixLog(onGround.exposure, exposure),
      adaptation: mixLog(onGround.adaptation, exposure / DAY_EXPOSURE),
    };
  };
  let shownAir = 1;
  let shownRung = 0;
  // What the eye has adapted to beyond the sky's light (eye.ts), and what that changes here: the stars it no longer
  // sees (a factor of light is 2.5 log10 of it in magnitudes) and the Moon's disc, kept as bright as it is to such an eye
  // (far brighter than any lamp-lit ground), where the exposure would dim it with the rest.
  let eyeFactor = 1;
  let moonShine = 0;
  // (the ground's limit for the Sun's height, the gain, how much of the air is above the eye, the eye's true height)
  let starsShown: [number, number, number, number] = [6.5, 1, 1, 0];
  // what the eye sees above the air for what is lit in its view (eye.ts StarEye: the stage steps it)
  let eyeLimit = 6.5;
  const seen = (): void => {
    const [ground, gain, starAir, height] = starsShown;
    const limit = starLimit(ground, starAir, eyeLimit);
    h.show(eyeFactor < 1 ? limit + 2.5 * Math.log10(eyeFactor) : limit, gain, starAir, height);
    // (and let go where the Moon itself is drawn over it: flightmoon.ts)
    h.moon.uMoonLight.value = (eyeFactor < 1 ? moonShine / eyeFactor : moonShine) * (1 - moon.covers);
  };
  setting.eye = (factor) => {
    eyeFactor = factor;
    seen();
  };
  setting.stars = (limit) => {
    if (limit === eyeLimit) return;
    eyeLimit = limit;
    seen();
  };
  let shownLimb = 0;
  let shownMoon = '';
  setting.at = (jdUT, height = 0, atOnce = false) => {
    // the Moon where it is at the instant, then seen from where the eye is now; how much of the Sun it hides from the eye,
    // and how much of the sky's disc it covers (the light and the sky are taken up again as either changes)
    moon.at(jdUT, 1 - airAbove(height));
    const moonMoved = moon.attend(eyeAt, atmosphereUniforms.uAtmSunLight.value, atOnce || eyeFrozen);
    const eclipse = moon.sunShown(eyeAt);
    const moonKey = `${Math.round(moon.covers * 100)} ${Math.round(eclipse * 200)}`;
    // the wind at the clock's instant: a function of it, so it follows the clock with no step and a jump is shown at once
    if (recovery && recoveryWindow) {
      const share = THREE.MathUtils.smoothstep(jdUT, recoveryWindow[0]!, recoveryWindow[1]!);
      weather.recover(share);
      fog.density = THREE.MathUtils.lerp(density, densityFor(recovery.weather.visibility.value), share * nearRecovery);
    }
    const blowing = winds(jdUT);
    setting.blowing = blowing;
    here.blow(blowing);
    globe.seaWind(blowing.wind.speed);
    const air = airAbove(height);
    // Where the eye is: its plumb line (`attend` has set it) and the Sun's height over the Earth's edge as seen from there,
    // which from above the air is what says whether the eye and the vehicle are in sunlight (the site's Sun may have
    // set hours before). The horizon the stars are hidden under follows the eye's true height every frame.
    h.horizon(height);
    const dipAt = -Math.acos(EARTH_SPHERE / (EARTH_SPHERE + Math.max(height, 0))) / DEG;
    const eyeSun = Math.asin(THREE.MathUtils.clamp(h.sunDir.dot(h.up), -1, 1)) / DEG;
    // (asked again as the Sun crosses the Earth's edge, in steps of a hundredth of its disc: under most of the air the
    // ground's light has it, and the step is the air's)
    const overEdge = eyeSun - dipAt;
    const limb = air > 0.9 ? 0 : Math.round(Math.abs(overEdge) < 1 ? overEdge / 0.005 : overEdge / 0.5);
    const cover = overcast ? nearDeck * (1 - THREE.MathUtils.smoothstep(height, today.deck.height, today.deck.height + DECK_DEPTH)) : 0;
    globe.thin = 1 - air;
    setHazeAbove(globe.thin); // the haze seen from above, on the globe and the land round the site alike (air.ts)
    setDeckShade(THREE.MathUtils.smoothstep(height, 1000, 3000)); // the middle deck's shadow on everything, from above (air.ts)
    const now = performance.now();
    // a jump (the clock put somewhere, not run there) is shown at once, not faded to
    const jumped = Math.abs(jdUT - askedAt) * 86_400 > SKY_STEP + 4000 * Math.max(0.1, (now - askedMs) / 1000);
    askedAt = jdUT;
    askedMs = now;
    // (frozen, a fade under way is finished: one went on for six seconds of the wall's clock under frozen frames, after
    // the eye came down from orbit, and a frame beside the gantry drawn twice differed in 20,000 pixels of the vehicle)
    const fading = reflections.step(atOnce ? Number.POSITIVE_INFINITY : now);
    const due = (stale && (atOnce || now - bakedAt >= cadence.bakeEvery)) || (shadowsOwed && now - shadowsAt >= cadence.shadowEvery);
    // (the stars come out by the air left above the eye, which goes on thinning long after the sky has gone black:
    // followed in steps of half a kilometre up to where none is left)
    const rung = Math.round(Math.min(Math.max(height, 0), 120_000) / 500);
    const arrived = h.arrived;
    h.arrived = false;
    if (
      Math.abs(jdUT - shownAt) * 86_400 < SKY_STEP &&
      !due &&
      !jumped &&
      air === shownAir &&
      rung === shownRung &&
      cover === shownCover &&
      limb === shownLimb &&
      moonKey === shownMoon
    )
      return fading || arrived || moonMoved ? { shadows: false } : null;
    shownMoon = moonKey;
    shownCover = cover;
    shownLimb = limb;
    shownAir = air;
    shownRung = rung;
    if (jdUT !== shownAt) {
      shownAt = jdUT;
      const sky = skyFrom(site, jdUT);
      h.at(sky);
      moonShine = h.moon.uMoonLight.value as number;
      // the pad's floods: by the Sun's height and which way it is going (a minute on, from the ephemeris), so a function of the instant
      const rate = (skyFrom(site, jdUT + 60 / 86_400).sun.elevation - sky.sun.elevation) / DEG / 60;
      setting.lamps = lampsLit(when.site.lamps ?? DUTY, h.sunElevation, rate);
    }
    const onGround = dayLight(h.sunElevation, h.moonUp ? { elevation: h.moonElevation, lit: h.moonLit } : null);
    // (the Sun as it reaches the eye: past the Earth's edge and the air, and past the Moon's edge)
    const sunAt = sunFrom(height, eyeSun).map((c) => c * eclipse) as unknown as RGB;
    setting.space = 1 - air;
    setting.sunlit = THREE.MathUtils.smoothstep(eyeSun, dipAt - 0.27, dipAt + 0.27) * eclipse;
    // the sunlit Moon's light round the eye, as the Earth's is (its share of the sky and how much of its face is lit)
    const shine = moon.shine(eyeAt);
    const moonFill = MOONSHINE * Math.sin(shine.radius) ** 2 * shine.lit;
    const light = space(onGround, 1 - air, sunAt, setting.sunlit, height, moonFill);
    setting.lux = light.lux;
    setting.adapted = light.adapted;
    // The stars come out as the air above the eye thins (daysky.ts: starLimit says what of that is physical), to what the
    // eye sees for what is lit in its view (`setting.stars`), drawn as bright as that eye sees them (the exposure undone).
    starsShown = [light.limitingMagnitude, 1 / light.adaptation, Math.exp(-(rung * 500) / 8000), height];
    seen();
    uniforms.uSunSize.value = Math.sin(h.sunRadius);
    const along = Math.sqrt(air); // (toward the horizon the eye looks through more of what air there is)
    const thin = ([r, g, b]: readonly number[], k: number) => [r! * k, g! * k, b! * k] as const;
    colour(uniforms.uZenith.value, thin(light.zenith, air));
    colour(uniforms.uHorizon.value, thin(light.horizon, along));
    colour(uniforms.uGlow.value, thin(light.glow, along));
    colour(uniforms.uCloudLight.value, light.cloud);
    // (the high cloud is no longer painted on the sky: it is a sheet at its own height, drawn with the clouds: clouds.ts)
    // (and a clear sky is clear: a place with no clouds in its air has none painted either)
    uniforms.uWisps.value = cumulus || !dayAir.clouds ? 0 : 1 - THREE.MathUtils.smoothstep(height, 2400, 3400);
    // the Sun's disc: from the ground as the day has it; from above the air, as it is there (white, and still up
    // when it has set on the ground below)
    const above = sunAt;
    colour(uniforms.uSunLight.value, [0, 1, 2].map((c) => light.sun[c]! + (above[c]! - light.sun[c]!) * (1 - air)) as unknown as RGB);
    uniforms.uGlare.value = along;
    colour(fog.color, light.haze);
    // (the one direct light's height, known here before it is put into the setting below: the Moon's while it is the
    // light, else the Sun's own, which with neither up is under the horizon and not wherever the light last pointed)
    const lightUp = light.light.from === 'moon' ? h.moonDir.y : h.sunDir.y;
    // Under a veil of high cloud (the record's, at the site): what it leaves of the direct light for everything under
    // it, for the Sun where it stands (air.ts takes it, and the clouds under it: clouds.ts); the haze lit by a whiter
    // sky; and the veil as the reflections see it, lit as the cloud pass lights it from under (clouds.ts: sheet): by
    // the Sun as it is at the veil's own height, which is up there before it is up on the ground, and the sky's
    // own light. Every one of them a smooth rule of the Sun's height, so nothing steps as the clock runs.
    const left = veil ? veilShade(veil.depth, veil.cover, Math.max(lightUp, 0)) : 1;
    if (veil) {
      // (the air along the horizon is lit by the sky over it, and under a veil that sky is white: the haze and the
      // sky's own horizon lose their blue by as much of the veil as the eye looks through that low, most of it.
      // clouds.ts: sheet, where a sight line under the veil is taken as up to six times its depth. Estimated)
      // (only for an eye under it: the sky is followed up in steps of half a percent of the air, some 40 m at that height)
      const under = 1 - THREE.MathUtils.smoothstep(height, veil.height - 1500, veil.height);
      const pale = 0.85 * (1 - Math.exp(-veil.depth * veil.cover * 6)) * under;
      const whiter = (c: THREE.Color): void => {
        const grey = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
        c.setRGB(c.r + (grey - c.r) * pale, c.g + (grey - c.g) * pale, c.b + (grey - c.b) * pale);
      };
      whiter(fog.color);
      whiter(uniforms.uHorizon.value);
      const high = sunFrom(veil.height, h.sunElevation);
      // What the veil gives back of what it takes from the beam, as the sky's light on the clouds under it: the Sun's
      // light where the veil is (it stands higher there by the horizon's dip from that height, 3.3 degrees from 10.5
      // km, so the veil is giving light before the Sun is up on the ground), less what gets through, VEIL_DOWN of it.
      const dip = Math.acos(EARTH_SPHERE / (EARTH_SPHERE + veil.height));
      const muHigh = Math.max(Math.sin(h.sunElevation * DEG + dip), 0);
      const taken = VEIL_DOWN * (1 - veilShade(veil.depth, veil.cover, muHigh)) * muHigh;
      setVeilLight(left, dayAir.base + veil.height, [0, 1, 2].map((c) => taken * high[c]! * noonSun[c]!) as unknown as RGB);
      const sun = [0, 1, 2].map((c) => (high[c]! * noonSun[c]!) / Math.PI);
      const white = 0.2126 * sun[0]! + 0.7152 * sun[1]! + 0.0722 * sun[2]!;
      colour(uniforms.uVeilSun.value, sun.map((v) => 0.75 * (v + (white - v) * 0.33)) as unknown as RGB);
      const fill = 0.28 * light.ambient;
      colour(uniforms.uVeilAir.value, [0, 1, 2].map((c) => fill * (0.9 * fillSky[c]! + 0.2 * fillGround[c]!)) as unknown as RGB);
    }

    // A complete stratocumulus ceiling gives the sky and its reflection diffuse
    // daylight. Its scattering also neutralizes the coastal haze. The optical response is estimated.
    if (overcast) {
      for (const color of [uniforms.uZenith.value, uniforms.uHorizon.value, uniforms.uGlow.value, fog.color]) {
        const grey = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
        const neutral = cover * 0.95;
        color.setRGB(color.r + (grey - color.r) * neutral, color.g + (grey - color.g) * neutral, color.b + (grey - color.b) * neutral);
      }
      uniforms.uSunLight.value.multiplyScalar(1 - cover);
    }
    // the one direct light: with neither Sun nor Moon it keeps its last direction, at no strength
    globe.sun.copy(h.sunDir);
    atmosphereUniforms.uTrueSun.value.copy(h.sunDir);
    if (light.light.from === 'sun') setting.sunDir.copy(h.sunDir);
    else if (light.light.from === 'moon') setting.sunDir.copy(h.moonDir);
    colour(setting.sunColor as THREE.Color, light.light.colour);
    setting.sunIntensity = light.light.intensity;
    setting.fill[2] = 0.28 * light.ambient;
    setting.exposure = light.exposure;
    shadowsOwed ||= light.light.from !== source || setting.sunDir.angleTo(shadowed) > cadence.shadowStep * DEG;
    const shadows = shadowsOwed && now - shadowsAt >= cadence.shadowEvery;
    if (shadows) {
      shadowed.copy(setting.sunDir);
      shadowsAt = now;
      shadowsOwed = false;
    }

    // The reflections: everything they see is baked at a day's brightness (divided by the sky's
    // level) and brought back down by environmentIntensity, every frame (see Reflections).
    // (the Sun as the eye sees it: above the air, from where the eye is, and gone in the Earth's shadow)
    const seenSun = [0, 1, 2].map((c) => light.sun[c]! + (sunAt[c]! - light.sun[c]!) * (1 - air));
    // (but never so far up that the Sun's patch goes past what the bake's half floats hold through its blur: far from the
    // Earth the sky round the eye is nothing (`ambient` at its floor) and a day's brightness put the patch at 24,000, whose
    // blur overflowed to a reflection that was not a number, and the glow spread it over the whole frame: every frame from
    // 76,000 km out was black. The gain is the bake's own, undone by `environmentIntensity`, so nothing seen changes)
    const most = BAKE_MOST / (30 * Math.max(seenSun[0]!, seenSun[1]!, seenSun[2]!, 1e-9));
    const day = Math.min(1 / light.ambient, most);
    setting.environmentIntensity = day === most ? ENVIRONMENT / day : ENVIRONMENT * light.ambient;
    envGain.value = day;
    // the ground the reflections see is lit by that Sun and that sky
    // (under a veil: the Sun's through it, and what the veil gives back of what it took, as the sky's: VEIL_DOWN)
    const lit =
      (0.75 * light.light.intensity * Math.max(setting.sunDir.y, 0) * (left + VEIL_DOWN * (1 - left)) * air) / (3.9 * Math.sin(50 * DEG)) +
      0.25 * light.ambient;
    below.color.setRGB((0.42 * lit + 0.0005) * day, (0.39 * lit + 0.0008) * day, (0.33 * lit + 0.0018) * day);
    // (the Sun's patch through the veil, as the eye sees its disc through it: along the slant, clouds.ts)
    const through = veil ? Math.exp(-veil.depth * veil.cover * Math.min(1 / Math.max(h.sunDir.y, 0.05), 6)) : 1;
    colour(patch.material.color, [30 * seenSun[0]! * day * through, 27 * seenSun[1]! * day * through, 22 * seenSun[2]! * day * through]);
    if (overcast) patch.material.color.multiplyScalar(1 - cover);
    patch.position.copy(h.sunDir).multiplyScalar(46);
    // (and how much air is over the eye: it thins the sky the reflections see, above. Left out, a bake made from high up,
    // under a dark sky, was kept for good when the eye came back down to a clock that was not running: the pad lit
    // without its sky's blue)
    // (and which way is up in that sky, which is the plumb line at the eye: it leans 4.8 degrees at the landing)
    const look = [
      ...[...light.zenith, ...light.horizon, ...light.glow, ...light.sun, lit].map((v) => v * day),
      air,
      ...(overcast ? [cover] : []),
      ...uniforms.uUp.value.toArray(),
      ...(veil ? [...uniforms.uVeilSun.value.toArray(), ...uniforms.uVeilAir.value.toArray()].map((v) => v * day) : []),
    ];
    stale ||= light.light.from !== source || h.sunDir.angleTo(bakedSun) > cadence.bakeStep * DEG || apart(look, bakedLook) > LOOK_STEP;
    const first = !setting.environment;
    if (first || jumped || (stale && atOnce)) bake(look, 0);
    // faded in over as long as bakes are coming apart, so one fade runs into the next
    else if (stale && now - bakedAt >= cadence.bakeEvery) bake(look, Math.min(6000, Math.max(250, now - bakedAt)));
    source = light.light.from;
    return { shadows, jumped };
  };
  setting.at(julianDate(when.launch));
  placeOf.set(setting, key);
  return setting;
}

/**
 * Above the Earth. Given a flight, the sky is the one over the flight's site, seen from above the
 * air: the Sun, the Moon and the planets where they stood, the stars turned to that place and
 * hour (the 187 km between the pad and Freedom 7's apogee moves the Moon by 0.03 degrees and nothing
 * else by anything), and the Earth below in the reflections at the flight's height (`heightOf`). With
 * none (the stage before any flight is loaded) the Sun is a key light from nowhere in particular, the
 * stars are turned to no place and there is no Earth.
 */
function orbit(renderer: THREE.WebGLRenderer, when?: Occasion): Setting {
  const site = when && siteFrame(when.site);
  const height = heightOf(when?.plan);
  const h = site && new Heavens(site, false, renderer.getPixelRatio());
  if (h && when) h.at(skyFrom(siteFrame(when.site), julianDate(when.launch)));
  const sunDir = h ? h.sunDir : new THREE.Vector3(0.62, 0.42, 0.66).normalize();
  const backdrop = new OrbitBackdrop(sunDir, h ?? starsAlone(renderer.getPixelRatio()));
  const setting: Setting = {
    backdrop,
    environment: orbitEnvironment(renderer, sunDir, height),
    environmentIntensity: 1.0,
    sunDir,
    sunColor: 0xfff4e6,
    sunIntensity: 4.0,
    // the faint fill keeps shadowed paint from going to ink; the blue is earthshine
    fill: [0x0a0c12, 0x3a5c9c, 0.5],
    floor: null,
    maxPolar: Math.PI,
    exposure: 1.05,
    fog: null,
    scenery: [],
  };
  if (h && site) {
    let shownAt = when ? julianDate(when.launch) : Number.NaN;
    const shadowed = sunDir.clone();
    const bakedSun = sunDir.clone();
    setting.at = (jdUT) => {
      if (Math.abs(jdUT - shownAt) * 86_400 < SKY_STEP) return null;
      shownAt = jdUT;
      h.at(skyFrom(site, jdUT));
      backdrop.place(h);
      if (sunDir.angleTo(bakedSun) > cadence.bakeStep * DEG) {
        setting.environment.dispose();
        setting.environment = orbitEnvironment(renderer, sunDir, height);
        bakedSun.copy(sunDir);
      }
      const shadows = sunDir.angleTo(shadowed) > cadence.shadowStep * DEG;
      if (shadows) shadowed.copy(sunDir);
      return { shadows };
    };
  }
  return setting;
}

/** One builder per kind of place a model can be shown in. The studio is nowhere and has no hour; the others take theirs from the flight. */
const SETTINGS: Record<BackdropKind, (renderer: THREE.WebGLRenderer, when?: Occasion) => Setting> = {
  orbit,
  studio: (renderer) => studio(renderer),
  ground,
};

/**
 * Settings are expensive (shaders, an environment map each), so each is built once, on first use:
 * once for each kind of place at each site. The hour is not part of what a setting is: `Setting.at`
 * moves it.
 */
export class Settings {
  private readonly cache = new Map<string, Setting>();
  constructor(private readonly renderer: THREE.WebGLRenderer) {}

  /** Which setting `get` gives for a kind and a flight: one for each pad and day. */
  keyOf(kind: BackdropKind, when?: Occasion): string {
    const { site } = when ?? {};
    return when && site && kind !== 'studio'
      ? [kind, site.place.name, site.name, site.latitude.value, site.longitude.value, site.bearingX.value, when.launch].join(' ')
      : kind;
  }

  /**
   * The setting of a kind for a flight: its site, first shown at its launch. Leave the flight out for a setting with no
   * place. One for each pad and day: the place is laid round the pad, and its sky and season are the day's.
   */
  get(kind: BackdropKind, when?: Occasion): Setting {
    const key = this.keyOf(kind, when);
    let s = this.cache.get(key);
    if (!s) {
      s = SETTINGS[kind](this.renderer, when);
      if (s.floor) s.floor.receiveShadow = true;
      for (const o of s.scenery) o.receiveShadow = true;
      this.cache.set(key, s);
    }
    return s;
  }

  /**
   * Let a setting go (the stage has gone to another flight's place: Stage.load): what it put on the GPU, and the place
   * it was laid on, so that going back to it builds it again under its own day, with its own air installed (air.ts).
   * The caller has taken it out of the scene. A setting laid on no place (orbit, the studio) has no day of its own to
   * install and is kept, as it was when a page showed one flight.
   */
  drop(setting: Setting): void {
    const place = placeOf.get(setting);
    if (place === undefined) return;
    for (const [key, s] of this.cache) if (s === setting) this.cache.delete(key);
    places.delete(place);
    // (what every place reads alike stays: its makers keep it, and the next place has it made for its own day)
    const keep = new Set<THREE.Texture>();
    if (setting.weather) {
      keep.add(setting.weather.uniforms.tWeather.value);
      keep.add(setting.weather.uniforms.tWeatherFar.value);
      keep.add(setting.weather.uniforms.tRecovery.value);
    }
    for (const shared of [atmosphereUniforms, uLast])
      for (const u of Object.values(shared)) if ((u.value as THREE.Texture | null)?.isTexture) keep.add(u.value as THREE.Texture);
    for (const o of [setting.backdrop.scene, setting.floor, ...setting.scenery, setting.globe?.group])
      if (o) disposeTree(o, { keep, renderer: this.renderer });
    setting.environment?.dispose();
    setting.release?.();
    newPlace(); // (what is built from now on is another place's: programs.ts)
  }
}
