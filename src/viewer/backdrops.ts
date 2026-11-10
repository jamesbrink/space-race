import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { BackdropKind } from '../types';
import { buildCape, COMPASS } from './cape';
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
  /** Anything in the setting that moves (surf). */
  tick?: (dt: number) => void;
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

/** Cape Canaveral's Missile Row from Launch Complex 5, on a clear morning. */
function capeCanaveral(renderer: THREE.WebGLRenderer): Setting {
  // 09:34 EST on 5 May at the Cape: the Sun is about 50 degrees up, a little south of east
  // (azimuth 097). In the pad's frame that is behind the hatch: the capsule's hatch side was in shade.
  const sun = THREE.MathUtils.degToRad(97);
  const el = THREE.MathUtils.degToRad(50);
  const sunDir = new THREE.Vector3(Math.sin(sun) * Math.cos(el), Math.sin(el), -Math.cos(sun) * Math.cos(el)).applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    COMPASS,
  );
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
  const cape = buildCape(GROUND_Y);
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
    tick: cape.tick,
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
  };
}

function orbit(renderer: THREE.WebGLRenderer): Setting {
  const sunDir = new THREE.Vector3(0.62, 0.42, 0.66).normalize();
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

/** Settings are expensive (shaders, an environment map each), so each is built once, on first use. */
/** One builder per place a model can be shown. */
const SETTINGS: Record<BackdropKind, (renderer: THREE.WebGLRenderer) => Setting> = { orbit, studio, 'cape-canaveral': capeCanaveral };

export class Settings {
  private readonly cache = new Map<BackdropKind, Setting>();
  constructor(private readonly renderer: THREE.WebGLRenderer) {}

  get(kind: BackdropKind): Setting {
    let s = this.cache.get(kind);
    if (!s) {
      s = SETTINGS[kind](this.renderer);
      if (s.floor) s.floor.receiveShadow = true;
      for (const o of s.scenery) o.receiveShadow = true;
      this.cache.set(kind, s);
    }
    return s;
  }
}
