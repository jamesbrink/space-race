import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { BackdropKind } from '../types';
import { OrbitBackdrop, orbitEnvironment } from './space';

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
}

const SKY = /* glsl */ `
  uniform vec3 uSun; varying vec3 vDir;
  vec3 sky(vec3 d) {
    float h = max(d.y, 0.0);
    vec3 zenith = vec3(0.09, 0.26, 0.62), horizon = vec3(0.58, 0.72, 0.88);
    vec3 col = mix(horizon, zenith, pow(h, 0.45)) * 1.5;
    // below the horizon: the scrub and sand of the Cape, hazed toward the horizon colour
    vec3 ground = mix(vec3(0.30, 0.29, 0.22), horizon * 1.2, exp(d.y * 9.0));
    col = mix(ground, col, smoothstep(-0.01, 0.01, d.y));
    float s = max(dot(d, uSun), 0.0);
    col += vec3(1.0, 0.9, 0.75) * (pow(s, 12.0) * 0.25 + pow(s, 400.0) * 3.0);
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
        ${withDisc ? 'col += vec3(60.0, 54.0, 44.0) * smoothstep(0.99996, 0.99999, dot(d, uSun));' : ''}
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

function ground(renderer: THREE.WebGLRenderer): Setting {
  // 09:34 EST on 5 May at the Cape: the Sun is about 50 degrees up in the east-south-east
  const sunDir = new THREE.Vector3(0.52, 0.72, 0.46).normalize();
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 48, 24), skyMaterial(sunDir, false)));
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(3000, 96),
    new THREE.MeshStandardMaterial({ color: 0x55523f, roughness: 1, metalness: 0 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.06;
  return {
    backdrop: new DomeBackdrop(skyMaterial(sunDir, true)),
    environment: pmrem(renderer, envScene),
    environmentIntensity: 0.9,
    sunDir,
    sunColor: 0xfff1dc,
    sunIntensity: 3.4,
    fill: [0x8fb4e8, 0x6a6450, 0.55],
    floor,
    maxPolar: Math.PI / 2 - 0.015,
    exposure: 0.95,
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
    new THREE.MeshStandardMaterial({ color: 0x1b1c20, roughness: 0.55, metalness: 0.1 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.002;
  return {
    backdrop,
    environment: pmrem(renderer, new RoomEnvironment()),
    environmentIntensity: 0.75,
    sunDir,
    sunColor: 0xfff6ea,
    sunIntensity: 2.4,
    fill: [0x30343c, 0x101012, 0.5],
    floor,
    maxPolar: Math.PI / 2 - 0.01,
    exposure: 1.0,
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
  };
}

/** Settings are expensive (shaders, an environment map each), so each is built once, on first use. */
export class Settings {
  private readonly cache = new Map<BackdropKind, Setting>();
  constructor(private readonly renderer: THREE.WebGLRenderer) {}

  get(kind: BackdropKind): Setting {
    let s = this.cache.get(kind);
    if (!s) {
      s = { orbit, ground, studio }[kind](this.renderer);
      if (s.floor) s.floor.receiveShadow = true;
      this.cache.set(kind, s);
    }
    return s;
  }
}
