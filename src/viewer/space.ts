import * as THREE from 'three';

/** Altitude the backdrop is drawn from, in Earth radii: Freedom 7's apogee, 187.5 km. */
const ALTITUDE = 187.5 / 6371;

const NOISE = /* glsl */ `
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float a = 0.5, s = 0.0;
    for (int i = 0; i < 6; i++) { s += a * noise(p); p = p * 2.03 + vec3(1.7, 9.2, 4.1); a *= 0.5; }
    return s;
  }
`;

/**
 * What is behind the spacecraft: the Earth from apogee, its atmosphere, the Sun and stars.
 * It lives in its own scene, drawn first with a camera that copies the main camera's
 * rotation but never its position: the Earth is 6,371 km of backdrop, not a prop.
 */
export class Backdrop {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(35, 1, 0.001, 200);
  private readonly earth: THREE.Mesh;

  constructor(sunDir: THREE.Vector3) {
    this.camera.position.set(0, 1 + ALTITUDE, 0);

    this.earth = new THREE.Mesh(
      new THREE.SphereGeometry(1, 256, 128),
      new THREE.ShaderMaterial({
        uniforms: { uSun: { value: sunDir }, uCam: { value: this.camera.position } },
        vertexShader: /* glsl */ `
          varying vec3 vObj; varying vec3 vWorld;
          void main() {
            vObj = position;
            vec4 w = modelMatrix * vec4(position, 1.0);
            vWorld = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uSun; uniform vec3 uCam;
          varying vec3 vObj; varying vec3 vWorld;
          ${NOISE}
          void main() {
            vec3 n = normalize(vWorld), p = normalize(vObj), v = normalize(uCam - vWorld);
            float land = smoothstep(0.50, 0.56, fbm(p * 2.6 + 3.0));
            float relief = fbm(p * 30.0);
            vec3 ocean = mix(vec3(0.004, 0.022, 0.075), vec3(0.012, 0.07, 0.15), fbm(p * 12.0));
            vec3 ground = mix(vec3(0.035, 0.075, 0.025), vec3(0.22, 0.17, 0.10), smoothstep(0.35, 0.7, relief));
            vec3 albedo = mix(ocean, ground, land);
            vec3 q = p * 22.0 + 0.9 * vec3(fbm(p * 9.0), fbm(p * 9.0 + 5.0), fbm(p * 9.0 + 11.0));
            float cloud = smoothstep(0.52, 0.78, fbm(q) * 0.75 + fbm(p * 150.0) * 0.25);
            albedo = mix(albedo, vec3(0.92), cloud);
            float day = max(dot(n, uSun), 0.0);
            vec3 col = albedo * day * 1.25;
            float glint = pow(max(dot(reflect(-uSun, n), v), 0.0), 90.0);
            col += vec3(1.0, 0.92, 0.8) * glint * 1.6 * (1.0 - land) * (1.0 - cloud);
            // air between here and the ground: thin straight down, a blue wall toward the limb
            float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
            col = mix(col, vec3(0.10, 0.30, 0.85) * (0.05 + day * 1.1), 0.12 + rim * 0.8);
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    );
    this.earth.rotation.set(0.6, 0, 0.3);
    this.scene.add(this.earth);

    const air = new THREE.Mesh(
      new THREE.SphereGeometry(1.011, 256, 128),
      new THREE.ShaderMaterial({
        uniforms: { uSun: { value: sunDir }, uCam: { value: this.camera.position } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: /* glsl */ `
          varying vec3 vWorld;
          void main() { vWorld = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uSun; uniform vec3 uCam; varying vec3 vWorld;
          void main() {
            vec3 n = normalize(vWorld), v = normalize(uCam - vWorld);
            float limb = pow(1.0 - abs(dot(n, v)), 5.0);
            float day = smoothstep(-0.15, 0.4, dot(n, uSun));
            gl_FragColor = vec4(vec3(0.25, 0.55, 1.0) * limb * day * 1.3, 1.0);
          }`,
      }),
    );
    this.scene.add(air);

    // stars: brightness follows a steep power law, so a few are bright and most are dust
    const count = 6000;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const rand = mulberry(7);
    const v = new THREE.Vector3();
    const c = new THREE.Color();
    for (let i = 0; i < count; i++) {
      v.set(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1);
      if (v.lengthSq() > 1 || v.lengthSq() < 1e-4) { i--; continue; }
      v.normalize().multiplyScalar(90);
      pos.set([v.x, v.y, v.z], i * 3);
      const b = 0.15 + 2.2 * Math.pow(rand(), 9);
      c.setHSL(rand() < 0.5 ? 0.6 : 0.09, 0.35 * rand(), 0.75).multiplyScalar(b);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true })));

    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(0.42, 24, 12),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(60, 56, 48) }),
    );
    sun.position.copy(sunDir).multiplyScalar(90).add(this.camera.position);
    this.scene.add(sun);
  }

  /** The ground track sliding by underneath. */
  update(dt: number): void {
    this.earth.rotateX(dt * 0.004);
  }

  follow(camera: THREE.PerspectiveCamera): void {
    this.camera.quaternion.copy(camera.quaternion);
    if (this.camera.fov !== camera.fov || this.camera.aspect !== camera.aspect) {
      this.camera.fov = camera.fov;
      this.camera.aspect = camera.aspect;
      this.camera.updateProjectionMatrix();
    }
  }
}

/**
 * The light the spacecraft reflects: black sky, a soft Sun, and the Earth filling the lower
 * hemisphere with blue. Metal has no colour of its own; this is what it will look like.
 */
export function buildEnvironment(renderer: THREE.WebGLRenderer, sunDir: THREE.Vector3): THREE.Texture {
  const scene = new THREE.Scene();
  scene.add(
    new THREE.Mesh(
      new THREE.SphereGeometry(10, 64, 32),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: { uSun: { value: sunDir } },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uSun; varying vec3 vDir;
          void main() {
            vec3 d = normalize(vDir);
            float below = smoothstep(-0.22, -0.26, d.y);              // the horizon dips 13.7 degrees at apogee
            vec3 earth = mix(vec3(0.16, 0.34, 0.72), vec3(0.55, 0.62, 0.70), smoothstep(-0.3, -1.0, d.y)) * 0.9;
            float limb = exp(-abs(d.y + 0.235) * 26.0);
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
    const x = rand() * size, y = rand() * size, w = 2 + rand() * 60, h = 1 + rand() * (rand() < 0.3 ? 90 : 6);
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
