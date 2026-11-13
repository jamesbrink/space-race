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
  twin.shadowSide = real.shadowSide;
  // (and which layer of the ground it is: laid.ts)
  twin.polygonOffset = real.polygonOffset;
  twin.polygonOffsetFactor = real.polygonOffsetFactor;
  twin.polygonOffsetUnits = real.polygonOffsetUnits;
  if (real.defines?.SKY_OVERHEAD !== undefined) twin.defines = { ...twin.defines, SKY_OVERHEAD: '' };
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

  /**
   * Something taken charge of is gone for good (a parachute, made again for every flight): it is let go, its meshes
   * given their real materials back for whoever disposes of them, and the twins made of those materials disposed of.
   * For what is made of materials of its own: a twin shared with something still on show would go with it.
   */
  remove(root: THREE.Object3D): void {
    this.roots.delete(root);
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const real = mesh.userData.real as THREE.Material | undefined;
      if (!mesh.isMesh || !real) return;
      mesh.material = real;
      this.twins.get(real)?.dispose();
      this.twins.delete(real);
    });
  }

  set(look: Look): void {
    if (look === this.look) return;
    this.look = look;
    for (const root of this.roots) this.dress(root);
  }

  /** Give a mesh already taken charge of another real material: it is drawn with it, or with its twin, as the look in force has it. */
  give(mesh: THREE.Mesh, real: THREE.Material): void {
    mesh.userData.real = real;
    mesh.material = this.look === 'cel' ? this.twin(real) : real;
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
      // a material that is all its own shader (the engine's fire, the trail) draws itself in both looks: it has no twin
      if ((mesh.material as THREE.ShaderMaterial).isShaderMaterial) return;
      // the real material is whatever the mesh had when it was first seen
      const real = ((mesh.userData.real as THREE.Material | undefined) ?? (mesh.userData.real = mesh.material)) as THREE.Material;
      mesh.material = this.look === 'cel' ? this.twin(real) : real;
    });
  }

  private twin(real: THREE.Material): THREE.Material {
    const made = this.twins.get(real);
    if (made) return made;
    const from = real as THREE.MeshStandardMaterial;
    const glass = real.name.startsWith('glass');
    const lens = real.name.startsWith('glass-lens');
    const toon = new THREE.MeshToonMaterial({
      name: real.name,
      gradientMap: this.tones,
      // a pane has no colour of its own to flatten: in a drawing it is a pale wash over what is behind
      // (a lens is the other way about: dark glass, with the barrel behind it darker still)
      color: lens ? new THREE.Color(0x16262e) : glass ? new THREE.Color(0x9fd0e0) : (from.color?.clone() ?? new THREE.Color(0xffffff)),
      map: from.map ?? null,
      vertexColors: real.vertexColors,
      transparent: real.transparent,
      opacity: lens ? 0.6 : glass ? 0.22 : real.opacity,
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
    // (Twins patched the same way share a shader, as their materials do: the material's own key says which patch it
    // is. A key of its own for every twin was a shader of its own for every material: two hundred of them, built one
    // after another the first time the look was switched, with the page stopped for seconds.)
    if (!real.userData.plainWhenDrawn && real.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) {
      toon.onBeforeCompile = real.onBeforeCompile;
      toon.customProgramCacheKey = () => `cel:${real.customProgramCacheKey()}`;
    }
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
        // A pixel standing out from both its neighbours along one axis, nearer than both or further than both: one
        // pixel's width of something in front of what is behind it, or a pixel of what is behind between two of it.
        float spike(float a, float c, float b) {
          float t = 0.01 * c;
          return step(t, a - c) * step(t, b - c) + step(t, c - a) * step(t, c - b);
        }
        // How many of this pixel and the two beside it along one axis are spikes: 1 beside a lone member, 2 or 3 where
        // members and gaps alternate a pixel at a time (a lattice whose members are a pixel wide or less).
        float spikes(float d, vec2 step) {
          float m2 = depthAt(vUv - 2.0 * step), m1 = depthAt(vUv - step), p1 = depthAt(vUv + step), p2 = depthAt(vUv + 2.0 * step);
          return spike(m2, m1, d) + spike(m1, d, p1) + spike(d, p1, p2);
        }
        void main() {
          vec4 colour = texture2D(tDiffuse, vUv);
          float d = depthAt(vUv);
          float edge = max(bend(d, vec2(uTexel.x, 0.0)), bend(d, vec2(0.0, uTexel.y)));
          edge = max(edge, 0.7 * max(bend(d, uTexel), bend(d, vec2(uTexel.x, -uTexel.y))));
          // lines thin out with distance, or far scrub and trusses turn solid black
          float ink = smoothstep(0.004, 0.012, edge) * (1.0 - smoothstep(350.0, 1400.0, d));
          // A line is drawn on both sides of an edge: on the thing in front and on what is behind it. Past a few dozen
          // metres only the near side keeps it, so a member a pixel or two wide is drawn as itself and not as a bar
          // three or four pixels wide, which is what made a lattice tower a black column.
          float nearest = min(min(depthAt(vUv - vec2(uTexel.x, 0.0)), depthAt(vUv + vec2(uTexel.x, 0.0))),
                              min(depthAt(vUv - vec2(0.0, uTexel.y)), depthAt(vUv + vec2(0.0, uTexel.y))));
          ink *= 1.0 - step(0.01 * d, d - nearest) * smoothstep(60.0, 200.0, d);
          // Where members and gaps alternate pixel by pixel (a lattice whose members have fallen to a pixel or under) the
          // frame's depth is one sample of each pixel and says nothing a line could follow: no line is drawn there, and
          // the colour (every sample of the pixel, resolved) is the lattice as a lighter screen over what is behind it.
          // (A crease found there is the same noise, so this is applied to both.)
          float screen = 1.0 - smoothstep(1.5, 3.5, spikes(d, vec2(uTexel.x, 0.0)) + spikes(d, vec2(0.0, uTexel.y)));
          // a crease: the surface turns sharply without its depth jumping (a fin's edge, a box's
          // corner). Found by comparing the way the surface faces here with just up and left.
          vec3 n = facing(vUv, uTexel);
          float turn = min(dot(n, facing(vUv - vec2(uTexel.x, 0.0), uTexel)), dot(n, facing(vUv - vec2(0.0, uTexel.y), uTexel)));
          // only close to: far off, depth is too coarse to say which way anything faces
          ink = max(ink, (1.0 - smoothstep(0.55, 0.8, turn)) * (1.0 - smoothstep(40.0, 160.0, d)) * step(d, 0.5 * uFar));
          ink *= screen;
          // The frame's outermost ring of pixels takes no ink. A neighbour past the edge is the edge's own depth given
          // back, so any slope there reads as a bend: the bottom row was inked from end to end over sloping ground.
          // (Done here, on the answer, and not in the lookups: a shader whose sums are written another way rounds another
          // way, and lines a threshold apart moved all over the picture.)
          vec2 inward = min(vUv, 1.0 - vUv);
          ink *= step(uTexel.x, inward.x) * step(uTexel.y, inward.y);
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
