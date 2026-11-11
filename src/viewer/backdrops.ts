import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { BackdropKind, Flight } from '../types';
import { refraction, type Seen, type Sky, skyFrom } from '../world/ephemeris.ts';
import { enuToSite, fromHorizontal, siteFrame, type Vec3 } from '../world/frames.ts';
import { julianDate } from '../world/time.ts';
import { buildCape } from './cape';
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
  sunDir: THREE.Vector3;
  sunColor: number;
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

/** Linear colour of the sky at the horizon; the fog uses the same so ground and sky meet without a seam. */
const HORIZON = new THREE.Color(0.4, 0.58, 0.86);

const SKY = /* glsl */ `
  uniform vec3 uSun; varying vec3 vDir;
  ${NOISE}
  vec3 sky(vec3 d) {
    float h = max(d.y, 0.0);
    vec3 zenith = vec3(0.025, 0.11, 0.42), horizon = vec3(${HORIZON.r}, ${HORIZON.g}, ${HORIZON.b});
    vec3 col = mix(horizon, zenith, pow(h, 0.5));
    // fair-weather cumulus, low over the Atlantic: flat bases, thinning upward
    vec2 uv = d.xz / (h + 0.12);
    float c = fbm(vec3(uv * 1.3, 0.0)) * 0.7 + fbm(vec3(uv * 5.0, 3.0)) * 0.3;
    float cloud = smoothstep(0.47, 0.62, c) * smoothstep(0.012, 0.07, h) * (1.0 - smoothstep(0.3, 0.7, h));
    float s = max(dot(d, uSun), 0.0);
    col = mix(col, vec3(1.0, 1.0, 1.02) * (0.9 + 0.35 * s), cloud * 0.9);
    col = mix(horizon * 0.96, col, smoothstep(-0.004, 0.012, d.y));   // below the horizon: haze
    col += vec3(1.0, 0.9, 0.75) * (pow(s, 10.0) * 0.18 + pow(s, 300.0) * 1.6);
    return col;
  }`;

function skyMaterial(sunDir: THREE.Vector3, withDisc: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { uSun: { value: sunDir } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      ${SKY}
      void main() {
        vec3 d = normalize(vDir);
        vec3 col = sky(d);
        ${withDisc ? 'col += vec3(40.0, 36.0, 30.0) * smoothstep(0.99996, 0.99999, dot(d, uSun));' : ''}
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
}

class DomeBackdrop implements Backdrop {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  constructor(material: THREE.Material) {
    this.scene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), material));
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
 * When and where a setting is: a flight's site and launch instant. The Sun is put where it stood
 * over that place at that moment (src/world/ephemeris.ts), in the site's own frame, which is the
 * models'. Nothing about the sky is placed by hand.
 */
export type Occasion = Pick<Flight, 'site' | 'launch'>;

const skyOf = (when: Occasion): Sky => skyFrom(siteFrame(when.site), julianDate(when.launch));
const vector = (v: Vec3): THREE.Vector3 => new THREE.Vector3(v[0], v[1], v[2]);
/** Where an eye on the ground sees something: its direction in the site's frame, lifted by the air's refraction. */
const throughAir = (seen: Seen, when: Occasion): THREE.Vector3 =>
  vector(enuToSite(when.site.bearingX.value, fromHorizontal(seen.azimuth, seen.elevation + refraction(seen.elevation))));

/** The Cape's ground is the same on any day: built once, whatever the instant. */
let cape: ReturnType<typeof buildCape> | undefined;

/**
 * Cape Canaveral's Missile Row from Launch Complex 5. For Freedom 7 (14:34:13 UTC, 5 May 1961)
 * the Sun comes out on 098.8 degrees true, 50.2 degrees up: in the pad's frame that is behind the
 * hatch side, so the capsule's hatch was in shade. The light's colour and strength and the sky's
 * own colours are still those of a clear mid-morning, chosen by eye; only the directions are computed.
 */
function capeCanaveral(renderer: THREE.WebGLRenderer, when?: Occasion): Setting {
  if (!when) throw new Error('a place on the ground needs a site and an instant: Settings.get(kind, flight)');
  const sunDir = throughAir(skyOf(when).sun, when);
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), skyMaterial(sunDir, false)));
  // Below the horizon there is sunlit sand and concrete, not more sky: without it bare metal
  // reflects blue from every side and reads as frosted glass.
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(49, 48, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.42, 0.39, 0.33), side: THREE.BackSide }),
  );
  // and the Sun itself: a small bright patch, so a polished edge has something to catch
  const disc = new THREE.Mesh(new THREE.SphereGeometry(3.2, 16, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(30, 27, 22) }));
  disc.position.copy(sunDir).multiplyScalar(46);
  envScene.add(earth, disc);
  cape ??= buildCape(GROUND_Y);
  return {
    backdrop: new DomeBackdrop(skyMaterial(sunDir, true)),
    environment: pmrem(renderer, envScene),
    environmentIntensity: 0.55,
    sunDir,
    sunColor: 0xffedd0,
    sunIntensity: 3.9,
    // sky fill kept low and close to neutral: shadows should read as shade, not as blue paint
    fill: [0xb9c6d6, 0x7a715c, 0.28],
    floor: cape.floor,
    maxPolar: Math.PI / 2 - 0.015,
    exposure: 0.8,
    fog: new THREE.FogExp2(HORIZON.clone().multiplyScalar(0.96), 0.00042),
    scenery: cape.scenery,
    reach: 1400,
    horizon: 11000, // Complex 34, the furthest pad placed, is 9.2 km up the coast
    tick: cape.tick,
    simplify: cape.simplify,
    attend: cape.attend,
  };
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
 * Above the Earth. Given a flight, the Sun is where it stood over the flight's site at launch,
 * seen from above the air; with none (the stage before any flight is loaded) it is a key light
 * from nowhere in particular.
 */
function orbit(renderer: THREE.WebGLRenderer, when?: Occasion): Setting {
  const sunDir = when ? vector(skyOf(when).sun.direction) : new THREE.Vector3(0.62, 0.42, 0.66).normalize();
  return {
    backdrop: new OrbitBackdrop(sunDir),
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
}

/** One builder per kind of place a model can be shown in. The studio is nowhere and has no hour; the others take theirs from the flight. */
const SETTINGS: Record<BackdropKind, (renderer: THREE.WebGLRenderer, when?: Occasion) => Setting> = {
  orbit,
  studio: (renderer) => studio(renderer),
  'cape-canaveral': capeCanaveral,
};

/**
 * Settings are expensive (shaders, an environment map each), so each is built once, on first use:
 * once for each kind of place at each site and instant it is asked for.
 */
export class Settings {
  private readonly cache = new Map<string, Setting>();
  constructor(private readonly renderer: THREE.WebGLRenderer) {}

  /** The setting of a kind for a flight: its site at its launch instant. Leave the flight out for a setting with no place or hour. */
  get(kind: BackdropKind, when?: Occasion): Setting {
    const { site } = when ?? {};
    const key =
      when && site && kind !== 'studio'
        ? [kind, site.latitude.value, site.longitude.value, site.height.value, site.bearingX.value, when.launch].join(' ')
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
