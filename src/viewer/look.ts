import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/**
 * The two ways the stage can be drawn. `real` is the physically based look every model is built
 * for. `cel` is the same scene as a drawing: each surface in a few flat tones of its own colour,
 * with an ink line wherever one thing ends and another begins. Nothing is authored twice: a cel
 * material is derived from the real one the first time it is needed, and the line is found in the
 * depth buffer after the frame is drawn.
 */
export type Look = 'real' | 'cel';

/**
 * How light falls off in the cel look: shade, a half tone, and full light. The toon shader reads
 * this across the angle between the surface and the light, from facing away (left) to facing it.
 */
const TONES = [0, 0, 0, 0, 0.42, 0.78, 1, 1];

function ramp(): THREE.DataTexture {
  const texture = new THREE.DataTexture(new Uint8Array(TONES.map((t) => Math.round(t * 255))), TONES.length, 1, THREE.RedFormat);
  texture.minFilter = texture.magFilter = THREE.NearestFilter; // steps, not a gradient
  texture.needsUpdate = true;
  return texture;
}

/** What the cutaway changes on a material, which its twin has to follow. */
function follow(twin: THREE.Material, real: THREE.Material): void {
  twin.clippingPlanes = real.clippingPlanes;
  twin.clipIntersection = real.clipIntersection;
  twin.clipShadows = real.clipShadows;
  twin.side = real.side;
  twin.needsUpdate = true;
}

/**
 * Swaps every mesh under a root between its real material and that material's cel twin. Roots
 * are remembered, so the look can be changed at any time and whatever is added later takes the
 * look in force.
 */
export class Looks {
  private readonly tones = ramp();
  private readonly twins = new Map<THREE.Material, THREE.Material>();
  private readonly roots = new Set<THREE.Object3D>();
  private look: Look = 'real';

  get current(): Look {
    return this.look;
  }

  /** Take charge of everything under `root`: it is drawn in the look in force from now on. */
  add(root: THREE.Object3D): void {
    this.roots.add(root);
    this.dress(root);
  }

  set(look: Look): void {
    if (look === this.look) return;
    this.look = look;
    for (const root of this.roots) this.dress(root);
  }

  /** A real material was changed in a way its twin must copy (the cutaway's clipping planes). */
  sync(real: THREE.Material): void {
    const twin = this.twins.get(real);
    if (twin) follow(twin, real);
  }

  private dress(root: THREE.Object3D): void {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || Array.isArray(mesh.material)) return;
      // the real material is whatever the mesh had when it was first seen
      const real = ((mesh.userData.real as THREE.Material | undefined) ?? (mesh.userData.real = mesh.material)) as THREE.Material;
      mesh.material = this.look === 'cel' ? this.twin(real) : real;
    });
  }

  private twin(real: THREE.Material): THREE.Material {
    let twin = this.twins.get(real);
    if (twin) return twin;
    const from = real as THREE.MeshStandardMaterial;
    const glass = real.name.startsWith('glass');
    const toon = new THREE.MeshToonMaterial({
      name: real.name,
      gradientMap: this.tones,
      // a pane has no colour of its own to flatten: in a drawing it is a pale wash over what is behind
      color: glass ? new THREE.Color(0x9fd0e0) : (from.color?.clone() ?? new THREE.Color(0xffffff)),
      map: from.map ?? null,
      vertexColors: real.vertexColors,
      transparent: real.transparent,
      opacity: glass ? 0.22 : real.opacity,
      depthWrite: real.depthWrite,
      alphaTest: real.alphaTest,
    });
    if (from.emissive) {
      toon.emissive.copy(from.emissive);
      toon.emissiveIntensity = from.emissiveIntensity;
      toon.emissiveMap = from.emissiveMap;
    }
    // a material that paints itself in its shader (the Cape's terrain) paints its twin the same
    // way; what it says about roughness finds nothing to change in a toon shader and is dropped
    toon.onBeforeCompile = real.onBeforeCompile;
    toon.customProgramCacheKey = () => `cel:${real.uuid}`;
    follow(toon, real);
    this.twins.set(real, toon);
    return toon;
  }
}

/**
 * The ink line. Depth changes smoothly across a surface and jumps at its edge, so a line is
 * drawn where the depth of a pixel differs from the average of its neighbours by more than a
 * flat surface could explain (the second difference: zero on any plane, however steeply seen).
 * It runs straight after the scene is drawn, on the frame's own depth texture.
 */
export class InkPass extends ShaderPass {
  constructor() {
    super({
      uniforms: {
        tDiffuse: { value: null },
        tDepth: { value: null },
        uTexel: { value: new THREE.Vector2(1, 1) },
        uNear: { value: 0.1 },
        uFar: { value: 1000 },
        uTan: { value: new THREE.Vector2(1, 1) },
        uInk: { value: new THREE.Color(0.018, 0.02, 0.03) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse, tDepth;
        uniform vec2 uTexel;
        uniform float uNear, uFar;
        uniform vec2 uTan;
        uniform vec3 uInk;
        varying vec2 vUv;
        // metres from the camera
        float depthAt(vec2 uv) {
          float z = texture2D(tDepth, uv).x * 2.0 - 1.0;
          return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear));
        }
        // where a pixel is, in the camera's frame
        vec3 place(vec2 uv) {
          return depthAt(uv) * vec3((uv * 2.0 - 1.0) * uTan, -1.0);
        }
        // which way the surface there faces
        vec3 facing(vec2 uv, vec2 step) {
          vec3 p = place(uv);
          return normalize(cross(place(uv + vec2(step.x, 0.0)) - p, place(uv + vec2(0.0, step.y)) - p));
        }
        // how sharply depth bends along one axis, as a fraction of the distance
        float bend(float d, vec2 step) {
          float a = depthAt(vUv - step), b = depthAt(vUv + step);
          // one neighbour may lie on something else entirely: measure against the nearer side only
          return abs(a + b - 2.0 * d) / min(d, min(a, b));
        }
        void main() {
          vec4 colour = texture2D(tDiffuse, vUv);
          float d = depthAt(vUv);
          float edge = max(bend(d, vec2(uTexel.x, 0.0)), bend(d, vec2(0.0, uTexel.y)));
          edge = max(edge, 0.7 * max(bend(d, uTexel), bend(d, vec2(uTexel.x, -uTexel.y))));
          // lines thin out with distance, or far scrub and trusses turn solid black
          float ink = smoothstep(0.004, 0.012, edge) * (1.0 - smoothstep(350.0, 1400.0, d));
          // a crease: the surface turns sharply without its depth jumping (a fin's edge, a box's
          // corner). Found by comparing the way the surface faces here with just up and left.
          vec3 n = facing(vUv, uTexel);
          float turn = min(dot(n, facing(vUv - vec2(uTexel.x, 0.0), uTexel)), dot(n, facing(vUv - vec2(0.0, uTexel.y), uTexel)));
          // only close to: far off, depth is too coarse to say which way anything faces
          ink = max(ink, (1.0 - smoothstep(0.55, 0.8, turn)) * (1.0 - smoothstep(40.0, 160.0, d)) * step(d, 0.5 * uFar));
          gl_FragColor = vec4(mix(colour.rgb, uInk, ink * 0.92), colour.a);
        }`,
    });
  }

  /** The line is one pixel of the drawing buffer wide, times `width`. */
  setSize(width: number, height: number): void {
    (this.uniforms.uTexel!.value as THREE.Vector2).set(1 / Math.max(1, width), 1 / Math.max(1, height));
  }

  render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    deltaTime: number,
    maskActive: boolean,
  ): void {
    this.uniforms.tDepth!.value = readBuffer.depthTexture; // the composer swaps buffers: ask each time
    super.render(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
  }

  /** The depth buffer is read back as places in front of the camera, which needs its range and field of view. */
  range(camera: THREE.PerspectiveCamera): void {
    this.uniforms.uNear!.value = camera.near;
    this.uniforms.uFar!.value = camera.far;
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    (this.uniforms.uTan!.value as THREE.Vector2).set(tan * camera.aspect, tan);
  }
}
