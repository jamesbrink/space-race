import * as THREE from 'three';
import type { BackdropKind, SitedFlight } from '../types';
import { skyFrom } from '../world/ephemeris.ts';
import { DEG, siteFrame } from '../world/frames.ts';
import { julianDate } from '../world/time.ts';
import { densityFor, installedAir, setHazeAbove } from './air';
import { atmosphereUniforms, extinctionAt, hazeFor, makeAtmosphere, RAYLEIGH_SCALE, transmittanceAt } from './atmosphere';
import { buildCape } from './cape';
import { dayLight, type RGB, starLimit } from './daysky.ts';
import { chapman, Globe } from './globe';
import { Heavens, MOON_GLSL, starsAlone } from './heavens';
import type { Land } from './land';
import { later } from './later';
import { NOISE, OrbitBackdrop, orbitEnvironment } from './space';
import { studio } from './studio';
import { checkUnits } from './units';
import { placeWeather } from './weathermap';

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
  /** How far below the horizon the camera may orbit, radians from straight up. */
  maxPolar: number;
  /** How near overhead it may orbit, radians from straight up (default: overhead). */
  minPolar?: number;
  exposure: number;
  /** Haze that fades distant ground into the horizon, or null. */
  fog: THREE.FogExp2 | null;
  /** Scenery that is part of the place rather than the model. */
  scenery: THREE.Object3D[];
  /** How far from the model there is something to look at, metres: the view can be walked and pulled back this far. */
  reach?: number;
  /** How far away the furthest thing in the place is, metres: the camera sees at least this far. Left out: only the model. */
  horizon?: number;
  /** Where the eye is: a place may draw what is near it in more detail. True if that changed what is drawn. */
  attend?: (eye: THREE.Vector3) => boolean;
  /** The camera as it is about to draw, for a place that leaves out what it cannot see. */
  view?: (camera: THREE.Camera) => void;
  /** The ground's height at (x, z) in the world, where the setting's floor is not level: the walker stands on it. */
  groundAt?: (x: number, z: number) => number;
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
   * above the eye thins (`airAbove`).
   */
  at?: (jdUT: number, height?: number) => { shadows: boolean } | null;
  /** Anything in the setting that moves (surf). */
  tick?: (dt: number) => void;
  /** The Earth beyond the place, to scale (globe.ts): drawn once the eye can see past the place's own ground. */
  globe?: Globe;
  /** Draw the place simplified, for the cel look: flat land, plants as single shapes. */
  simplify?: (on: boolean) => void;
  /** How soft the edge of the direct light's shadow is, in texels of its map (default 1: the Sun's, which is sharp). */
  shadowRadius?: number;
}

/**
 * Height of the ground setting's terrain, metres; the model's own surface is at 0. The pads and
 * roads were at grade, so the sand is only a hand's breadth under the concrete: 12 cm, which is
 * more than the 5 to 6 cm at which parallel faces seen from across the site began to flicker
 * (AGENTS.md, "No flicker"). Models that stand on the ground reach down past it (site.py:
 * FOOTING), and the site's builders take it as `GROUND`, in feet: change both together.
 */
export const GROUND_Y = -0.12;

/**
 * The ground's sky. Its shape is here (the gradient, the clouds, the glow along the horizon); its
 * colours are uniforms, set for the Sun's height by daysky.ts, so the same shader is noon, dusk
 * and night. A cloud takes its light from uCloudLight and the haze from uHorizon.
 */
const SKY = /* glsl */ `
  uniform vec3 uSun, uZenith, uHorizon, uGlow, uCloudLight, uSunLight, uUp; uniform float uWisps, uGlare; varying vec3 vDir;
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
    col = mix(low * 0.96, col, smoothstep(-0.004, 0.012, up));   // below the horizon: haze
    // the glare round the Sun is the air's (it goes as the air thins: uGlare); above the air what is left is the eye's or the lens's own, white and close round a hard disc (estimated)
    col += mix(vec3(1.0), vec3(1.0, 0.9, 0.75), uGlare) * uSunLight * (pow(s, 10.0) * 0.18 * uGlare + pow(s, 300.0) * 1.6 * uGlare + pow(s, 4000.0) * 5.0 * (1.0 - uGlare));
    return col;
  }`;

type SkyUniforms = Record<
  'uSun' | 'uSunSize' | 'uZenith' | 'uHorizon' | 'uGlow' | 'uCloudLight' | 'uSunLight' | 'uWisps' | 'uUp' | 'uGlare',
  THREE.IUniform
>;

/**
 * The sky's material. `discs`: with the Sun's disc and the Moon in it, as the eye sees it; without,
 * it is the light the sky sheds, for the reflections (where the Sun is a patch of its own).
 * `gain` scales what it draws (the reflections are baked at a day's brightness: see `Reflections`).
 */
function skyMaterial(uniforms: SkyUniforms, h: Heavens, discs: boolean, gain: THREE.IUniform<number> = { value: 1 }): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { ...uniforms, ...h.moon, uGain: gain },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uSunSize, uGain;
      ${SKY}
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
 * any other instant. Nothing in the sky is placed by hand.
 */
export type Occasion = Pick<SitedFlight, 'site' | 'launch'>;

/** The Cape's ground is the same on any day: built once, whatever the instant. */
let cape: ReturnType<typeof buildCape> | undefined;

/** The sky turns 15 arcseconds a second. Under this many seconds of it nothing has moved a pixel, and the view is left alone. */
const SKY_STEP = 4;

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
/** How far the sky's colours (at a day's brightness) may drift before the reflections are baked again: the largest change in one, of 1. */
const LOOK_STEP = 0.04;
const apart = (a: number[], b: number[]): number =>
  a.length === b.length ? a.reduce((most, v, i) => Math.max(most, Math.abs(v - b[i]!) / Math.max(1, Math.abs(v))), 0) : Infinity;

/**
 * Cape Canaveral's Missile Row from Launch Complex 5, at any hour. For Freedom 7 (14:34:13 UTC,
 * 5 May 1961) the Sun comes out on 098.8 degrees true, 50.2 degrees up: in the pad's frame that
 * is behind the hatch side, so the capsule's hatch was in shade. The Moon was up too: a waning
 * gibbous 4.8 degrees above the west-south-west horizon, where the haze all but hides it.
 *
 * Directions, sizes and the Moon's phase are computed (heavens.ts). The light's colour and
 * strength, the sky's colours and the exposure follow the Sun's height (daysky.ts): a model
 * fitted by eye, whose mid-morning is the look this place was first tuned to.
 */
function capeCanaveral(renderer: THREE.WebGLRenderer, when?: Occasion): Setting {
  if (!when) throw new Error('a place on the ground needs a site and an instant: Settings.get(kind, flight)');
  const site = siteFrame(when.site);
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
    uUp: { value: new THREE.Vector3(0, 1, 0) },
    uGlare: { value: 1 },
  };
  const envScene = new THREE.Scene();
  const envGain = { value: 1 };
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), skyMaterial(uniforms, h, false, envGain)));
  // Below the horizon there is sunlit sand and concrete, not more sky: without it bare metal
  // reflects blue from every side and reads as frosted glass.
  const ground = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
  // and the Sun itself: a small bright patch, so a polished edge has something to catch
  const patch = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 8), new THREE.MeshBasicMaterial());
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(49, 48, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), ground), patch);
  cape ??= buildCape(renderer, GROUND_Y);
  // the Earth past the Cape's ground, which hands over to it across its last kilometre and a half
  const land = cape.floor.userData.land as Land;
  cape.floor.updateMatrixWorld();
  const globe = new Globe(
    renderer,
    site,
    when.site.seaLevel.value,
    { frame: cape.floor.matrixWorld.clone().invert(), half: land.extent - 150 },
    installedAir(),
    when.site.region?.name ?? null,
  );
  // (a development build says which lit materials have left too few texture units for lights: units.ts)
  if (import.meta.env.DEV) later(() => setTimeout(() => checkUnits(renderer), 4000));
  // the weather the clouds and their shadows are laid out by (weather.ts): the record's cover at the site, the map's beyond
  const cumulus = installedAir()?.clouds;
  if (cumulus) placeWeather(site.bearingX, cumulus.cover, cumulus.wind, when.site.region?.name ?? null);
  // (by the edge of its cover maps, past which their last texels are smeared outward: Complex 34, the furthest built, is inside 9.5 km)
  const covered = land.uniforms.uFarSize!.value as number;
  land.meet(globe.beyond, covered - 1500, covered);
  // the haze at sea level, thinning upward (air.ts): visibility was at the Skid Strip's 16 km cap at 09:00 (NOAA ISD), so how far past it is not recorded; 80 km taken, clear air: estimated
  const fog = new THREE.FogExp2(0, densityFor(80_000));
  // The air seen from above it (atmosphere.ts), with this haze. The Sun's light above the air is white (the scene's
  // white is the Sun's) and as strong as makes its light on the ground, through the air, as bright as the scene's own
  // at the hour that was tuned for (daysky.ts: a Sun 50 degrees up): so sunlit ground, cloud and sky stand in the
  // scene as they do in the world. Derived, and the same at every hour.
  const haze = hazeFor(fog.density, installedAir()?.scale ?? 1400);
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
    const dip = -Math.acos(6_371_000 / (6_371_000 + Math.max(height, 0))) / DEG; // the horizon's, degrees
    const showing = THREE.MathUtils.smoothstep(elevation, dip - 0.27, dip + 0.27);
    if (showing <= 0) return [0, 0, 0];
    const k = extinctionAt(Math.min(height, 99_000), haze);
    const column = RAYLEIGH_SCALE * chapman(height, Math.max(mu, Math.sin(dip * DEG)), 6_371_000, RAYLEIGH_SCALE);
    return [0, 1, 2].map((c) => (showing * Math.exp(-k[c]! * column)) / reference[c]!) as unknown as RGB;
  };
  const gen = new THREE.PMREMGenerator(renderer);
  const reflections = new Reflections(renderer);

  // what the screen last showed, to tell when it needs showing again
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

  const setting: Setting = {
    backdrop: new DomeBackdrop(skyMaterial(uniforms, h, true), h.sky),
    environment: null as unknown as THREE.Texture, // baked below, before anyone sees it
    environmentIntensity: ENVIRONMENT,
    sunDir: new THREE.Vector3(0, 1, 0),
    sunColor: new THREE.Color(),
    sunIntensity: 0,
    // sky fill kept low and close to neutral: shadows should read as shade, not as blue paint
    fill: [0xb9c6d6, 0x7a715c, 0.28],
    floor: cape.floor,
    maxPolar: Math.PI / 2 - 0.015,
    exposure: 0.8,
    fog,
    scenery: cape.scenery,
    reach: 2000, // the beach is 1.4 to 1.8 km east of pad 5: walkable
    horizon: 11000, // Complex 34, the furthest pad placed, is 9.2 km up the coast
    tick: cape.tick,
    simplify: cape.simplify,
    globe,
    attend: (eye) => {
      // the sky's up is the plumb line at the eye
      const was = uniforms.uUp.value.clone();
      const leans = globe.up(eye, uniforms.uUp.value).angleTo(was) > 1e-5;
      const moved = globe.attend(eye) || leans;
      return cape!.attend(eye) || moved;
    },
    groundAt: cape.groundAt,
    plantsClear: cape.plantsClear,
    plantsOut: cape.plantsOut,
    view: cape.view,
  };

  /** `fade`: milliseconds to fade the bake in over; 0 puts it in at once. */
  const bake = (look: number[], fade: number): void => {
    reflections.take(gen.fromScene(envScene, 0, 0.1, 200) as THREE.WebGLCubeRenderTarget, fade);
    setting.environment = reflections.texture;
    bakedSun.copy(h.sunDir);
    bakedLook = look;
    bakedAt = performance.now();
    stale = false;
  };

  let shownAir = 1;
  let shownRung = 0;
  setting.at = (jdUT, height = 0) => {
    const air = airAbove(height);
    globe.thin = 1 - air;
    setHazeAbove(globe.thin); // the haze seen from above, on the globe and the land round the site alike (air.ts)
    const now = performance.now();
    // a jump (the clock put somewhere, not run there) is shown at once, not faded to
    const jumped = Math.abs(jdUT - askedAt) * 86_400 > SKY_STEP + 4000 * Math.max(0.1, (now - askedMs) / 1000);
    askedAt = jdUT;
    askedMs = now;
    const fading = reflections.step(now);
    const due = (stale && now - bakedAt >= cadence.bakeEvery) || (shadowsOwed && now - shadowsAt >= cadence.shadowEvery);
    // (the stars come out by the air left above the eye, which goes on thinning long after the sky has gone black:
    // followed in steps of half a kilometre up to where none is left)
    const rung = Math.round(Math.min(Math.max(height, 0), 120_000) / 500);
    const arrived = h.arrived;
    h.arrived = false;
    if (Math.abs(jdUT - shownAt) * 86_400 < SKY_STEP && !due && !jumped && air === shownAir && rung === shownRung)
      return fading || arrived ? { shadows: false } : null;
    shownAir = air;
    shownRung = rung;
    if (jdUT !== shownAt) {
      shownAt = jdUT;
      h.at(skyFrom(site, jdUT));
    }
    const light = dayLight(h.sunElevation, h.moonUp ? { elevation: h.moonElevation, lit: h.moonLit } : null);
    // The stars come out as the air above the eye thins (daysky.ts: starLimit says what of that is physical), and are
    // drawn brighter above it, though the Sun is up: the exposure there is still the sunlit ground's (for the look).
    const out = (1 - air) ** 1.5;
    h.show(
      starLimit(light.limitingMagnitude, Math.exp(-(rung * 500) / 8000)),
      (1 + 1.6 * out) / light.adaptation,
      Math.exp(-(rung * 500) / 8000),
      rung * 500,
    );
    uniforms.uSunSize.value = Math.sin(h.sunRadius);
    const along = Math.sqrt(air); // (toward the horizon the eye looks through more of what air there is)
    const thin = ([r, g, b]: readonly number[], k: number) => [r! * k, g! * k, b! * k] as const;
    colour(uniforms.uZenith.value, thin(light.zenith, air));
    colour(uniforms.uHorizon.value, thin(light.horizon, along));
    colour(uniforms.uGlow.value, thin(light.glow, along));
    colour(uniforms.uCloudLight.value, light.cloud);
    // (the high cloud is no longer painted on the sky: it is a sheet at its own height, drawn with the clouds: clouds.ts)
    uniforms.uWisps.value = cumulus ? 0 : 1 - THREE.MathUtils.smoothstep(height, 2400, 3400);
    // the Sun's disc: from the ground as the day has it; from above the air, as it is there (white, and still up
    // when it has set on the ground below)
    const above = sunFrom(height, h.sunElevation);
    colour(uniforms.uSunLight.value, [0, 1, 2].map((c) => light.sun[c]! + (above[c]! - light.sun[c]!) * (1 - air)) as unknown as RGB);
    uniforms.uGlare.value = along;
    colour(fog.color, light.haze);

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
    const day = 1 / light.ambient;
    setting.environmentIntensity = ENVIRONMENT * light.ambient;
    envGain.value = day;
    // the ground the reflections see is lit by that Sun and that sky
    const lit = (0.75 * light.light.intensity * Math.max(setting.sunDir.y, 0)) / (3.9 * Math.sin(50 * DEG)) + 0.25 * light.ambient;
    ground.color.setRGB((0.42 * lit + 0.0005) * day, (0.39 * lit + 0.0008) * day, (0.33 * lit + 0.0018) * day);
    colour(patch.material.color, [30 * light.sun[0] * day, 27 * light.sun[1] * day, 22 * light.sun[2] * day]);
    patch.position.copy(h.sunDir).multiplyScalar(46);
    // (and how much air is over the eye: it thins the sky the reflections see, above. Left out, a bake made from high up,
    // under a dark sky, was kept for good when the eye came back down to a clock that was not running: the pad lit
    // without its sky's blue)
    // (and which way is up in that sky, which is the plumb line at the eye: it leans 4.8 degrees at the landing)
    const look = [
      ...[...light.zenith, ...light.horizon, ...light.glow, ...light.sun, lit].map((v) => v * day),
      air,
      ...uniforms.uUp.value.toArray(),
    ];
    stale ||= light.light.from !== source || h.sunDir.angleTo(bakedSun) > cadence.bakeStep * DEG || apart(look, bakedLook) > LOOK_STEP;
    const first = !setting.environment;
    if (first || jumped) bake(look, 0);
    // faded in over as long as bakes are coming apart, so one fade runs into the next
    else if (stale && now - bakedAt >= cadence.bakeEvery) bake(look, Math.min(6000, Math.max(250, now - bakedAt)));
    source = light.light.from;
    return { shadows };
  };
  setting.at(julianDate(when.launch));
  return setting;
}

/**
 * Above the Earth. Given a flight, the sky is the one over the flight's site, seen from above the
 * air: the Sun, the Moon and the planets where they stood, the stars turned to that place and
 * hour (the 187 km between the pad and apogee moves the Moon by 0.03 degrees and nothing else by
 * anything). With none (the stage before any flight is loaded) the Sun is a key light from
 * nowhere in particular and the stars are turned to no place.
 */
function orbit(renderer: THREE.WebGLRenderer, when?: Occasion): Setting {
  const site = when && siteFrame(when.site);
  const h = site && new Heavens(site, false, renderer.getPixelRatio());
  if (h && when) h.at(skyFrom(siteFrame(when.site), julianDate(when.launch)));
  const sunDir = h ? h.sunDir : new THREE.Vector3(0.62, 0.42, 0.66).normalize();
  const backdrop = new OrbitBackdrop(sunDir, h ?? starsAlone(renderer.getPixelRatio()));
  const setting: Setting = {
    backdrop,
    environment: orbitEnvironment(renderer, sunDir),
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
        setting.environment = orbitEnvironment(renderer, sunDir);
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
  'cape-canaveral': capeCanaveral,
};

/**
 * Settings are expensive (shaders, an environment map each), so each is built once, on first use:
 * once for each kind of place at each site. The hour is not part of what a setting is: `Setting.at`
 * moves it.
 */
export class Settings {
  private readonly cache = new Map<string, Setting>();
  constructor(private readonly renderer: THREE.WebGLRenderer) {}

  /** The setting of a kind for a flight: its site, first shown at its launch. Leave the flight out for a setting with no place. */
  get(kind: BackdropKind, when?: Occasion): Setting {
    const { site } = when ?? {};
    const key =
      site && kind !== 'studio'
        ? [kind, site.latitude.value, site.longitude.value, site.height.value, site.bearingX.value].join(' ')
        : kind;
    let s = this.cache.get(key);
    if (!s) {
      s = SETTINGS[kind](this.renderer, when);
      if (s.floor) s.floor.receiveShadow = true;
      for (const o of s.scenery) o.receiveShadow = true;
      this.cache.set(key, s);
    }
    return s;
  }
}
