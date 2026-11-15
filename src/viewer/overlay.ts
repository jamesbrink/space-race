import * as THREE from 'three';
import { Pass } from 'three/addons/postprocessing/Pass.js';

/**
 * What is drawn over the flight that is no part of it (the predicted path, path.ts: an instrument's line), drawn in a
 * pass of its own after the engines' fire and smoke and before the clouds (Stage's composer).
 *
 * The fire and the smoke are marched as far as the scene's depth and laid over the frame (exhaust.ts). The line writes
 * no depth, so drawn with the scene it was under them: the smoke behind it, between it and the ground, was laid over it
 * as if in front, and the line came through the pad's dust and the trail pale and in pieces. Drawn after them it is an
 * instrument's line over the fire, the smoke and the air, as it was meant to be; the clouds, laid over last, still cover
 * it where they are in front of it and show through it where they are behind, by how much it lets through (clouds.ts
 * `veils`).
 *
 * The scene's surfaces still hide it: it is tested against the scene's depth as the scene left it (`sceneDepthGlsl`),
 * in its own fragment shader, because in the cel look the frame it is drawn into by then is one the ink drew into, which
 * has no depth of its own.
 */

/** The layer what is overlaid is on, and nothing else: the scene's own draw does not see it. */
export const OVERLAY_LAYER = 6;

/** The scene's depth as it stood straight after the scene was drawn, and the near and far planes it was drawn with: for every overlay's shader. */
export const uSceneDepth: THREE.IUniform<THREE.Texture | null> = { value: null };
export const uDepthRange: THREE.IUniform<THREE.Vector2> = { value: new THREE.Vector2(1, 2) };

/**
 * GLSL: whether a point `ahead` metres in front of the eye (along the view's axis) is behind the scene's surface at this
 * pixel of a frame `size` pixels across. The buffer's steps are allowed for as the clouds allow for them (clouds.ts
 * `sceneDistance`: eight of them, which near the eye are nothing and far off are the ground's own coarseness).
 */
export const sceneDepthGlsl = /* glsl */ `
  uniform sampler2D tSceneDepth;
  uniform vec2 uDepthRange;
  bool behindScene(float ahead, vec2 size) {
    float depth = texture2D(tSceneDepth, gl_FragCoord.xy / size).x;
    if (depth >= 1.0) return false;
    float n = uDepthRange.x, f = uDepthRange.y;
    float z = n * f / (f * (1.0 - depth) + n * depth);
    z += z * z * (f - n) / (n * f) * ${(8 / 2 ** 24).toExponential(4)};
    return ahead > z;
  }`;

/**
 * What is drawn over the finished frame (`drawLast`): a line held at a least width in pixels and faded by as much as it
 * is thinner than that (a parachute's lines, chute.ts). Drawn with the scene, such a line wrote the scene's depth at
 * full strength while it let most of what was behind it through, and the clouds and the air, laid over the frame from
 * that depth, were left out at its pixels: what showed there was the bare sea or land under the cloud, so the lines
 * came through a cloud as threads of the ground behind it, and where the multisampled depth missed the line the cloud
 * was laid over it instead. So such a line is in no buffer the frame is made from: it is drawn last, over the clouds,
 * the air and the glow, into the canvas as it goes to the screen (tone-mapped there by three, as the output pass maps
 * the frame), hidden by the scene's surfaces as the overlays are (`behindScene`), and by as much of the clouds' march
 * as lies in front of it (`cloudAhead`). It is on a layer of its own (`LAST_LAYER`), which nothing else draws.
 */
export const LAST_LAYER = 8;
const lasts = new Set<THREE.Object3D>();

/** Draw `object` over the finished frame of whichever stage's scene it is in, from now on (`undrawLast` lets it go). */
export function drawLast(object: THREE.Object3D): void {
  object.traverse((o) => o.layers.set(LAST_LAYER));
  lasts.add(object);
}

export function undrawLast(object: THREE.Object3D): void {
  lasts.delete(object);
}

/**
 * For what is drawn last: the clouds' march as the frame laid it (clouds.ts `CloudPass.laid`: its colour and opacity,
 * and where along each ray its cloud begins and is half opaque), and whether the look is the cel one.
 */
export const uLast = {
  tCloudAhead: { value: null as THREE.Texture | null },
  tCloudInfo: { value: null as THREE.Texture | null },
  uCloudsAhead: { value: 0 },
  uLastCel: { value: 0 },
};

/**
 * GLSL: how much of the clouds' march lies between the eye and a point `d` metres along the ray through this pixel (`uv`
 * of the frame): their opacity, read from the march's four pixels round it as the composite reads them, each taken as
 * far as its cloud begins in front of `d` (clouds.ts `lay`). In the cel look the cloud is cut at half, so this is too.
 * The far cover and the sheets are kilometres off and are taken to lie behind.
 */
export const cloudAheadGlsl = /* glsl */ `
  uniform sampler2D tCloudAhead, tCloudInfo;
  uniform float uCloudsAhead, uLastCel;
  float cloudAhead(vec2 uv, float d) {
    if (uCloudsAhead < 0.5) return 0.0;
    ivec2 size = textureSize(tCloudAhead, 0);
    vec2 p = uv * vec2(size) - 0.5;
    vec2 i0 = floor(p), f = p - i0;
    float a = 0.0;
    for (int k = 0; k < 4; k++) {
      ivec2 at = clamp(ivec2(i0) + ivec2(k & 1, k >> 1), ivec2(0), size - 1);
      float w = ((k & 1) == 1 ? f.x : 1.0 - f.x) * ((k >> 1) == 1 ? f.y : 1.0 - f.y);
      vec4 info = texelFetch(tCloudInfo, at, 0);
      a += w * texelFetch(tCloudAhead, at, 0).a * smoothstep(info.x, info.y, d);
    }
    return uLastCel > 0.5 ? smoothstep(0.45, 0.55, a) : a;
  }`;

/**
 * Have `output` (the composer's last pass, which draws the finished frame to the canvas) draw what is drawn last over
 * it (`drawLast`) when it has: whatever of that is in `scene` and shown, with the scene's depth from `depth` and the
 * clouds' march from `clouds`. The objects stay where they are in the scene, drawn through a scene of their own, as
 * the overlays are.
 */
export function drawsLast(
  output: Pass,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  depth: () => THREE.Texture | null,
  clouds: () => { cloud: THREE.Texture | null; info: THREE.Texture | null; on: boolean; cel: boolean },
): void {
  const alone = Object.assign(new THREE.Scene(), { matrixAutoUpdate: false, matrixWorldAutoUpdate: false });
  const shown: THREE.Object3D[] = [];
  const render = output.render.bind(output);
  output.render = (renderer, write, read, delta, mask) => {
    render(renderer, write, read, delta, mask);
    shown.length = 0;
    for (const o of lasts) {
      let p: THREE.Object3D = o;
      for (; p.parent; p = p.parent) if (!p.visible) break;
      if (p === scene && o.visible) shown.push(o);
    }
    const scenery = depth();
    if (!shown.length || !scenery) return;
    uSceneDepth.value = scenery;
    uDepthRange.value.set(camera.near, camera.far);
    const c = clouds();
    uLast.tCloudAhead.value = c.cloud;
    uLast.tCloudInfo.value = c.info;
    uLast.uCloudsAhead.value = Number(c.on && c.cloud !== null && c.info !== null);
    uLast.uLastCel.value = Number(c.cel);
    alone.children = shown;
    alone.fog = scene.fog;
    const layers = camera.layers.mask;
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    camera.layers.set(LAST_LAYER);
    try {
      renderer.setRenderTarget(output.renderToScreen ? null : write);
      renderer.render(alone, camera);
    } finally {
      camera.layers.mask = layers;
      renderer.autoClear = autoClear;
      alone.children = [];
    }
  };
}

/**
 * The pass: draws whatever is on `OVERLAY_LAYER` among `objects` into the frame where it stands, with the scene's depth
 * from `depth` (DepthMark's, clouds.ts). The objects stay where they are in the scene (their world matrices are the
 * frame's, made in the scene's draw just before), drawn through a scene of their own that holds them, as the clouds draw
 * their veils.
 */
export class OverlayPass extends Pass {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly objects: () => THREE.Object3D[];
  private readonly depth: () => THREE.Texture | null;
  private readonly alone = Object.assign(new THREE.Scene(), { matrixAutoUpdate: false, matrixWorldAutoUpdate: false });

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, objects: () => THREE.Object3D[], depth: () => THREE.Texture | null) {
    super();
    this.scene = scene;
    this.camera = camera;
    this.objects = objects;
    this.depth = depth;
    this.needsSwap = false;
  }

  render(renderer: THREE.WebGLRenderer, _write: THREE.WebGLRenderTarget, frame: THREE.WebGLRenderTarget): void {
    const shown = this.objects().filter((o) => o.parent === this.scene && o.visible);
    const depth = this.depth();
    if (!shown.length || !depth) return;
    uSceneDepth.value = depth;
    uDepthRange.value.set(this.camera.near, this.camera.far);
    const alone = this.alone;
    alone.children = shown;
    alone.fog = this.scene.fog;
    const mask = this.camera.layers.mask;
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    this.camera.layers.set(OVERLAY_LAYER);
    try {
      renderer.setRenderTarget(this.renderToScreen ? null : frame);
      renderer.render(alone, this.camera);
    } finally {
      this.camera.layers.mask = mask;
      renderer.autoClear = autoClear;
      alone.children = [];
    }
  }
}
