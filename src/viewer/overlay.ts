import * as THREE from 'three';
import type { Pass } from 'three/addons/postprocessing/Pass.js';

/**
 * What is drawn over the flight that is no part of it: a parachute's lines (chute.ts) and the predicted path (path.ts,
 * an instrument's line). Each is drawn over the finished frame (`drawLast`), into the canvas as it goes to the screen,
 * after the fire and smoke, the clouds, the air, the outline and the glow; hidden by the scene's surfaces, tested against
 * the scene's depth as the scene left it (`sceneDepthGlsl`), and by as much of the clouds' march as lies in front of it
 * (`cloudAheadGlsl`).
 *
 * Why last. The fire and the smoke are marched as far as the scene's depth and laid over the frame (exhaust.ts): a line
 * that writes no depth, drawn with the scene, lay under the smoke behind it and came through the pad's dust and the trail
 * pale and in pieces. Drawn after them and before the clouds (as the path was), the clouds' composite cut the cloud
 * behind it by as much as it let through (clouds.ts `veils`): a faint line, or the faint glow and edge of one, over cloud
 * let the ground under the cloud through in dashes (GitHub issue #7). Over the finished frame nothing behind it is cut.
 */

/** The scene's depth as it stood straight after the scene was drawn, and the near and far planes it was drawn with: for the shader of everything drawn last. */
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
 * is thinner than that (a parachute's lines, chute.ts), and an instrument's line drawn over the scene (the predicted
 * path, path.ts). Drawn with the scene, such a line wrote the scene's depth at
 * full strength while it let most of what was behind it through, and the clouds and the air, laid over the frame from
 * that depth, were left out at its pixels: what showed there was the bare sea or land under the cloud, so the lines
 * came through a cloud as threads of the ground behind it, and where the multisampled depth missed the line the cloud
 * was laid over it instead. So such a line is in no buffer the frame is made from: it is drawn last, over the clouds,
 * the air and the glow, into the canvas as it goes to the screen (tone-mapped there by three, as the output pass maps
 * the frame), hidden by the scene's surfaces (`behindScene`), and by as much of the clouds' march
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
 * Build the shaders of what is drawn last in `scene` for the canvas, as it will be drawn (Stage.warm: everything else
 * is built for the buffer the scene is drawn into, and a shader for the canvas, tone-mapped in the screen's colours, is
 * another shader, which would otherwise be built in front of whoever first sees the line).
 */
export function compileLast(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): Promise<THREE.Object3D> {
  const alone = Object.assign(new THREE.Scene(), { matrixAutoUpdate: false, matrixWorldAutoUpdate: false });
  alone.children = [...lasts].filter((o) => {
    let p: THREE.Object3D = o;
    while (p.parent) p = p.parent;
    return p === scene;
  });
  alone.fog = scene.fog;
  const target = renderer.getRenderTarget();
  renderer.setRenderTarget(null);
  const built = renderer.compileAsync(alone, camera);
  renderer.setRenderTarget(target);
  return built.finally(() => {
    alone.children = [];
  });
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
    if (uCloudsAhead <= 0.0) return 0.0;
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
    return (uLastCel > 0.5 ? smoothstep(0.45, 0.55, a) : a) * uCloudsAhead;
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
  clouds: () => { cloud: THREE.Texture | null; info: THREE.Texture | null; on: boolean; left: number; cel: boolean },
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
    // (as much of the cloud as is drawn: from far out it is let go, clouds.ts `CLOUDS_FROM`)
    uLast.uCloudsAhead.value = c.on && c.cloud !== null && c.info !== null ? c.left : 0;
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
