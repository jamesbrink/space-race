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
