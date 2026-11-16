import * as THREE from 'three';
import { EARTH_SPHERE } from '../world/bodies.ts';
import { Heavens, MOON_GLSL } from './heavens.ts';

/**
 * What is behind the spacecraft above the air: the Sun, the Moon and the stars. It lives in its own scene, drawn first
 * with a camera that copies the main camera's rotation but never its position.
 *
 * The sky is real (heavens.ts): given a flight's `Heavens` the Moon, the planets and the 518 brightest stars are where
 * they stood over the flight's site at launch, +Y being straight up there. The Earth below is not drawn here: what was
 * (continents of noise, turned to no hour) was a stand-in, and the Earth seen from above the air is the globe's
 * (globe.ts), which a flight's place on the ground draws all the way up. The reflections still have the Earth below at
 * the flight's height (`orbitEnvironment`).
 */
export class OrbitBackdrop {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(35, 1, 0.001, 200);
  private readonly sun: THREE.Mesh;
  private moon: THREE.Mesh | null = null;

  /** `sky`: a flight's heavens, or just the stars for a setting with no flight. */
  constructor(sunDir: THREE.Vector3, sky: Heavens | THREE.Object3D) {
    // the stars and planets are points at infinity
    this.scene.add(sky instanceof Heavens ? sky.sky : sky);
    if (sky instanceof Heavens) this.scene.add((this.moon = moonCard(sky)));

    this.sun = new THREE.Mesh(new THREE.SphereGeometry(0.42, 24, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(60, 56, 48) }));
    this.sun.position.copy(sunDir).multiplyScalar(90).add(this.camera.position);
    this.scene.add(this.sun);
    if (sky instanceof Heavens) this.place(sky);
  }

  /** The sky has moved to another instant: put the Sun and the Moon where it has them. */
  place(sky: Heavens): void {
    const eye = this.camera.position;
    this.sun.position.copy(sky.sunDir).multiplyScalar(90).add(eye);
    this.sun.scale.setScalar((90 * Math.sin(sky.sunRadius)) / 0.42); // its true size: half a degree across
    if (!this.moon) return;
    this.moon.scale.setScalar(90 * (sky.moon.uMoonSize.value as number) * 3);
    this.moon.position.copy(sky.moonDir).multiplyScalar(90).add(eye);
    this.moon.lookAt(eye);
    (this.moon.material as THREE.ShaderMaterial).uniforms.uEye!.value = eye;
  }

  update(): void {}
}

/**
 * The Moon from above the air: a card facing the eye, a little larger than the disc, on which the
 * shader draws the lit part of a sphere (heavens.ts: MOON_GLSL) and adds it to the black behind.
 * It stands among the stars, 90 units off.
 */
function moonCard(sky: Heavens): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.ShaderMaterial({
      uniforms: { ...sky.moon, uEye: { value: new THREE.Vector3() } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        void main() {
          vec4 w = modelMatrix * vec4(position, 1.0);
          vWorld = w.xyz;
          gl_Position = projectionMatrix * viewMatrix * w;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uEye; varying vec3 vWorld;
        ${MOON_GLSL}
        void main() { gl_FragColor = vec4(moonLight(normalize(vWorld - uEye)), 1.0); }`,
    }),
  );
}

/**
 * The light the spacecraft reflects: black sky, a soft Sun, and the Earth filling the lower hemisphere with blue below
 * the horizon's dip from `height` metres up (the flight's: `heightOf` in backdrops.ts). Metal has no colour of its own;
 * this is what it will look like. With no height (a setting with no flight) there is no Earth in it.
 */
export function orbitEnvironment(renderer: THREE.WebGLRenderer, sunDir: THREE.Vector3, height?: number): THREE.Texture {
  // the sine of the horizon's dip: 0.237 at Freedom 7's apogee, 187.4 km
  const dip = height === undefined ? 0 : Math.sqrt(height * (2 * EARTH_SPHERE + height)) / (EARTH_SPHERE + height);
  const scene = new THREE.Scene();
  scene.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(10, 64, 32),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: { uSun: { value: sunDir }, uDip: { value: dip }, uEarth: { value: height === undefined ? 0 : 1 } },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uSun; uniform float uDip, uEarth; varying vec3 vDir;
          void main() {
            vec3 d = normalize(vDir);
            float below = uEarth * smoothstep(0.015 - uDip, -0.025 - uDip, d.y);
            vec3 earth = mix(vec3(0.16, 0.34, 0.72), vec3(0.55, 0.62, 0.70), smoothstep(-0.3, -1.0, d.y)) * 0.9;
            float limb = uEarth * exp(-abs(d.y + uDip) * 26.0);
            float sun = smoothstep(0.985, 0.998, dot(d, uSun));
            vec3 col = vec3(0.004, 0.005, 0.008) + earth * below + vec3(0.3, 0.6, 1.0) * limb * 1.6 + vec3(1.0, 0.95, 0.86) * sun * 14.0;
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    ),
  );
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(scene, 0, 0.1, 100).texture;
  pmrem.dispose();
  return texture;
}

/** A tiling grey map of scuffs and streaks: uneven roughness is most of what makes metal read as metal. */
export function wearTexture(): THREE.Texture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  const rand = mulberry(41);
  g.fillStyle = 'rgb(190,190,190)';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    const shade = 120 + Math.floor(rand() * 135);
    g.fillStyle = `rgba(${shade},${shade},${shade},${0.04 + rand() * 0.1})`;
    const x = rand() * size,
      y = rand() * size,
      w = 2 + rand() * 60,
      h = 1 + rand() * (rand() < 0.3 ? 90 : 6);
    for (const dx of [0, -size]) for (const dy of [0, -size]) g.fillRect(x + dx, y + dy, w, h);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.7, 1.7);
  texture.anisotropy = 8;
  return texture;
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
