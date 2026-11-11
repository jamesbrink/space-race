import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { BackdropKind, Flight } from '../types';
import { skyFrom } from '../world/ephemeris.ts';
import { DEG, siteFrame } from '../world/frames.ts';
import { julianDate } from '../world/time.ts';
import { buildCape } from './cape';
import { dayLight, type RGB } from './daysky.ts';
import { Heavens, MOON_GLSL, starsAlone } from './heavens';
import { NOISE, OrbitBackdrop, orbitEnvironment } from './space';

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
  /**
   * Move the setting to an instant: a Julian date in UT, the simulation clock's. The Sun, the
   * Moon and the stars go where they were then, and the light, the sky and the reflections follow;
   * the fields above are changed in place. Returns null while nothing on screen has changed (the
   * instant is the same, or the sky has turned by less than can be seen); otherwise what the stage
   * must take up again, with `shadows` set if the light has moved far enough to redraw them.
   */
  at?: (jdUT: number) => { shadows: boolean } | null;
  /** Anything in the setting that moves (surf). */
  tick?: (dt: number) => void;
  /** Draw the place simplified, for the cel look: flat land, plants as single shapes. */
  simplify?: (on: boolean) => void;
}

/**
 * Height of the ground setting's terrain, metres; the model's own surface is at 0. Nothing may
 * lie close above the terrain (it flickers at a distance), so models that stand on the ground
 * reach down past this (lc_5.py: FOOTING).
 */
export const GROUND_Y = -0.45;

/**
 * The ground's sky. Its shape is here (the gradient, the clouds, the glow along the horizon); its
 * colours are uniforms, set for the Sun's height by daysky.ts, so the same shader is noon, dusk
 * and night. A cloud takes its light from uCloudLight and the haze from uHorizon.
 */
const SKY = /* glsl */ `
  uniform vec3 uSun, uZenith, uHorizon, uGlow, uCloudLight, uSunLight; varying vec3 vDir;
  ${NOISE}
  ${MOON_GLSL}
  vec3 sky(vec3 d, bool discs) {
    float h = max(d.y, 0.0);
    // twilight: the lit air lies along the horizon, deepest toward the Sun
    float toward = dot(normalize(d.xz + 1e-6), normalize(uSun.xz + 1e-6)) * 0.5 + 0.5;
    vec3 low = uHorizon + uGlow * (0.12 + 0.88 * toward * toward * toward);
    vec3 col = mix(mix(uHorizon, low, exp(-h * 7.0)), uZenith, pow(h, 0.5));
    // the Moon is beyond the air, so its light is added to the sky's and the clouds pass in front of it
    if (discs) col += moonLight(d);
    // fair-weather cumulus, low over the Atlantic: flat bases, thinning upward
    vec2 uv = d.xz / (h + 0.12);
    float c = fbm(vec3(uv * 1.3, 0.0)) * 0.7 + fbm(vec3(uv * 5.0, 3.0)) * 0.3;
    float cloud = smoothstep(0.47, 0.62, c) * smoothstep(0.012, 0.07, h) * (1.0 - smoothstep(0.3, 0.7, h));
    float s = max(dot(d, uSun), 0.0);
    col = mix(col, uCloudLight * (0.9 + 0.35 * s), cloud * 0.9);
    col = mix(low * 0.96, col, smoothstep(-0.004, 0.012, d.y));   // below the horizon: haze
    col += vec3(1.0, 0.9, 0.75) * uSunLight * (pow(s, 10.0) * 0.18 + pow(s, 300.0) * 1.6);
    return col;
  }`;

type SkyUniforms = Record<'uSun' | 'uSunSize' | 'uZenith' | 'uHorizon' | 'uGlow' | 'uCloudLight' | 'uSunLight', THREE.IUniform>;

/**
 * The sky's material. `discs`: with the Sun's disc and the Moon in it, as the eye sees it; without,
 * it is the light the sky sheds, for the reflections (where the Sun is a patch of its own).
 */
function skyMaterial(uniforms: SkyUniforms, h: Heavens, discs: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { ...uniforms, ...h.moon },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform float uSunSize;
      ${SKY}
      void main() {
        vec3 d = normalize(vDir);
        vec3 col = sky(d, ${discs});
        ${
          discs
            ? /* glsl */ `// the Sun at its true size, half a degree across, reddened by the air it shines through:
        // the glow round it is the sky's and the bloom's
        float off = length(cross(d, uSun)), edge = fwidth(off);
        if (dot(d, uSun) > 0.0) col += vec3(40.0, 36.0, 30.0) * uSunLight * (1.0 - smoothstep(uSunSize - edge, uSunSize + edge, off));`
            : ''
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
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

function pmrem(renderer: THREE.WebGLRenderer, scene: THREE.Scene): THREE.Texture {
  const gen = new THREE.PMREMGenerator(renderer);
  const texture = gen.fromScene(scene, 0, 0.1, 200).texture;
  gen.dispose();
  return texture;
}

/**
 * Where a setting is and the instant it is first shown at: a flight's site and launch. The Sun,
 * the Moon, the stars and the planets are put where they stood over that place (src/world/
 * ephemeris.ts), in the site's own frame, which is the models', and `Setting.at` moves them to
 * any other instant. Nothing in the sky is placed by hand.
 */
export type Occasion = Pick<Flight, 'site' | 'launch'>;

/** The Cape's ground is the same on any day: built once, whatever the instant. */
let cape: ReturnType<typeof buildCape> | undefined;

/** The sky turns 15 arcseconds a second. Under this many seconds of it nothing has moved a pixel, and the view is left alone. */
const SKY_STEP = 4;
/** How far the light must move before shadows are drawn again, and before the reflections are baked again: degrees. */
const SHADOW_STEP = 0.05;
const BAKE_STEP = 1;
/**
 * With the clock run fast the light moves every frame. Drawing the shadow map and baking the
 * reflections are the two things that cost, so each is done no more often than this, in
 * milliseconds of ours; whatever is owed when the clock stops is paid then.
 */
const SHADOW_EVERY = 50;
const BAKE_EVERY = 500;

const colour = (target: THREE.Color, rgb: RGB): THREE.Color => target.setRGB(rgb[0], rgb[1], rgb[2]);

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
  };
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), skyMaterial(uniforms, h, false)));
  // Below the horizon there is sunlit sand and concrete, not more sky: without it bare metal
  // reflects blue from every side and reads as frosted glass.
  const ground = new THREE.MeshBasicMaterial({ side: THREE.BackSide });
  // and the Sun itself: a small bright patch, so a polished edge has something to catch
  const patch = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 8), new THREE.MeshBasicMaterial());
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(49, 48, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), ground), patch);
  cape ??= buildCape(GROUND_Y);
  const fog = new THREE.FogExp2(0, 0.00042);
  const gen = new THREE.PMREMGenerator(renderer);
  let baked: THREE.WebGLRenderTarget | null = null;

  // what the screen last showed, to tell when it needs showing again
  let shownAt = Number.NaN;
  let bakedAt = Number.NEGATIVE_INFINITY;
  let stale = false;
  let shadowsAt = Number.NEGATIVE_INFINITY;
  let shadowsOwed = false;
  let source = '';
  const shadowed = new THREE.Vector3();
  const bakedSun = new THREE.Vector3();
  let bakedAmbient = 0;

  const setting: Setting = {
    backdrop: new DomeBackdrop(skyMaterial(uniforms, h, true), h.stars),
    environment: null as unknown as THREE.Texture, // baked below, before anyone sees it
    environmentIntensity: 0.55,
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
    reach: 1400,
    horizon: 11000, // Complex 34, the furthest pad placed, is 9.2 km up the coast
    tick: cape.tick,
    simplify: cape.simplify,
    attend: cape.attend,
  };

  const bake = (ambient: number): void => {
    const next = gen.fromScene(envScene, 0, 0.1, 200);
    baked?.dispose();
    baked = next;
    setting.environment = next.texture;
    bakedSun.copy(h.sunDir);
    bakedAmbient = ambient;
    bakedAt = performance.now();
    stale = false;
  };

  setting.at = (jdUT) => {
    const now = performance.now();
    const due = (stale && now - bakedAt >= BAKE_EVERY) || (shadowsOwed && now - shadowsAt >= SHADOW_EVERY);
    if (Math.abs(jdUT - shownAt) * 86_400 < SKY_STEP && !due) return null;
    if (jdUT !== shownAt) {
      shownAt = jdUT;
      h.at(skyFrom(site, jdUT));
    }
    const light = dayLight(h.sunElevation, h.moonUp ? { elevation: h.moonElevation, lit: h.moonLit } : null);
    h.show(light.limitingMagnitude, 1 / light.adaptation);
    uniforms.uSunSize.value = Math.sin(h.sunRadius);
    colour(uniforms.uZenith.value, light.zenith);
    colour(uniforms.uHorizon.value, light.horizon);
    colour(uniforms.uGlow.value, light.glow);
    colour(uniforms.uCloudLight.value, light.cloud);
    colour(uniforms.uSunLight.value, light.sun);
    colour(fog.color, light.haze);

    // the one direct light: with neither Sun nor Moon it keeps its last direction, at no strength
    if (light.light.from === 'sun') setting.sunDir.copy(h.sunDir);
    else if (light.light.from === 'moon') setting.sunDir.copy(h.moonDir);
    colour(setting.sunColor as THREE.Color, light.light.colour);
    setting.sunIntensity = light.light.intensity;
    setting.fill[2] = 0.28 * light.ambient;
    setting.exposure = light.exposure;
    shadowsOwed ||= light.light.from !== source || setting.sunDir.angleTo(shadowed) > SHADOW_STEP * DEG;
    const shadows = shadowsOwed && now - shadowsAt >= SHADOW_EVERY;
    if (shadows) {
      shadowed.copy(setting.sunDir);
      shadowsAt = now;
      shadowsOwed = false;
    }

    // the ground the reflections see is lit by that Sun and that sky
    const lit = (0.75 * light.light.intensity * Math.max(setting.sunDir.y, 0)) / (3.9 * Math.sin(50 * DEG)) + 0.25 * light.ambient;
    ground.color.setRGB(0.42 * lit + 0.0005, 0.39 * lit + 0.0008, 0.33 * lit + 0.0018);
    colour(patch.material.color, [30 * light.sun[0], 27 * light.sun[1], 22 * light.sun[2]]);
    patch.position.copy(h.sunDir).multiplyScalar(46);
    stale ||=
      light.light.from !== source ||
      h.sunDir.angleTo(bakedSun) > BAKE_STEP * DEG ||
      Math.abs(light.ambient - bakedAmbient) > 0.08 * Math.max(light.ambient, bakedAmbient);
    if (!baked || (stale && now - bakedAt >= BAKE_EVERY)) bake(light.ambient);
    source = light.light.from;
    return { shadows };
  };
  setting.at(julianDate(when.launch));
  return setting;
}

function studio(renderer: THREE.WebGLRenderer): Setting {
  const sunDir = new THREE.Vector3(0.5, 0.75, 0.6).normalize();
  const backdrop = new DomeBackdrop(
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          // a dark cove: floor colour rising to nothing, with a faint warm lift at eye level
          vec3 col = mix(vec3(0.030, 0.032, 0.038), vec3(0.004, 0.004, 0.006), smoothstep(-0.25, 0.75, d.y));
          col += vec3(0.05, 0.04, 0.03) * exp(-pow(d.y * 5.0, 2.0));
          gl_FragColor = vec4(col, 1.0);
        }`,
    }),
  );
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(14, 96),
    new THREE.MeshStandardMaterial({ color: 0x0d0e11, roughness: 0.5, metalness: 0.1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.002;
  return {
    backdrop,
    environment: pmrem(renderer, new RoomEnvironment()),
    // aluminised cloth mirrors whatever lights it: a dim room and one soft key, or it burns out
    environmentIntensity: 0.32,
    sunDir,
    sunColor: 0xfff3e2,
    sunIntensity: 1.5,
    fill: [0x30343c, 0x101012, 0.35],
    floor,
    maxPolar: Math.PI / 2 - 0.01,
    exposure: 0.9,
    fog: null,
    scenery: [],
    horizon: 30, // the floor's edge
  };
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
      if (sunDir.angleTo(bakedSun) > BAKE_STEP * DEG) {
        setting.environment.dispose();
        setting.environment = orbitEnvironment(renderer, sunDir);
        bakedSun.copy(sunDir);
      }
      const shadows = sunDir.angleTo(shadowed) > SHADOW_STEP * DEG;
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
