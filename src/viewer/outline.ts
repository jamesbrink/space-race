import * as THREE from 'three';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

/**
 * The line round what is hovered or selected.
 *
 * It is three's OutlinePass from the mask on (the same edge detection, blurs and overlay, in its
 * own materials and targets, so the line is the one it draws), but the mask is made without
 * drawing the scene again. Three's pass draws everything that is not selected into a depth target
 * of its own, to know where the selection is hidden, and walks the whole scene twice to hide and
 * show things: a second frame's worth of draw calls for as long as anything is outlined. The scene's
 * depth is already there (`depth`: the frame's, as it stood straight after the scene was drawn), so
 * here only the selected meshes are drawn, each fragment asking that depth whether something stands
 * in front of it.
 *
 * Three's depth target was drawn with one material for everything, so two things hid what was
 * behind them that the frame's depth knows nothing of: a pane of glass (it writes no depth) and the
 * quadrant the cutaway has taken out of a shell. The line is to stay as it was (dim behind a window,
 * dim on a part inside whatever the cut shows of it), so those are given as `screens` and drawn
 * into a depth target of their own as three drew them: a few dozen draw calls while there are any
 * in sight, not the scene.
 */

/** How far behind a depth a fragment must be to count as hidden by it, in steps of a 24-bit depth buffer. */
const BIAS = 8 / 2 ** 24;

const ACROSS = new THREE.Vector2(1, 0),
  UPRIGHT = new THREE.Vector2(0, 1);

const MASK_FRAGMENT = /* glsl */ `
  uniform sampler2D tDepth, tScreens;
  uniform vec2 uTexel;
  uniform float uScreens;
  void main() {
    vec2 uv = gl_FragCoord.xy * uTexel;
    float z = gl_FragCoord.z;
    // The frame's depth is one sample of a multisampled pixel, not its middle, and this fragment is itself in it:
    // on a face seen edge-on the two differ by up to the face's slope across the pixel, which is allowed for, so
    // that a face does not hide itself.
    float hidden = z > texture2D(tDepth, uv).r + fwidth(z) + ${BIAS.toExponential(6)} ? 1.0 : 0.0;
    if (uScreens > 0.5 && z > texture2D(tScreens, uv).r + ${BIAS.toExponential(6)}) hidden = 1.0;
    gl_FragColor = vec4(0.0, hidden, 1.0, 1.0); // (as three's mask: red where the selection is not, green where it is hidden)
  }`;

/** The meshes under `roots` that would be drawn: shown all the way up to `scene`, and all the way down. A mesh's own children go with it. */
export function shownMeshes(roots: readonly THREE.Object3D[], scene: THREE.Object3D, into: THREE.Object3D[] = []): THREE.Object3D[] {
  const down = (o: THREE.Object3D): void => {
    if (!o.visible) return;
    if ((o as THREE.Mesh).isMesh) into.push(o);
    else for (const child of o.children) down(child);
  };
  for (const root of roots) {
    let top: THREE.Object3D | null = root.parent;
    for (; top && top !== scene; top = top.parent) if (!top.visible) break;
    if (top === scene) down(root);
  }
  return into;
}

export class Outline extends OutlinePass {
  private readonly quad = new FullScreenQuad();
  /** The selected meshes on their own: a scene that is only a list (nothing is moved into it), drawn as they stand. */
  private readonly only = new THREE.Scene();
  private readonly meshes: THREE.Object3D[] = [];
  private readonly mask: THREE.ShaderMaterial;
  private readonly was = new THREE.Color();
  /** What hides the selection besides the frame's depth (see `screens`), drawn on its own the same way, and its depth. */
  private readonly before = new THREE.Scene();
  private readonly hiding: THREE.Object3D[] = [];
  private readonly found: THREE.Object3D[] = [];
  private readonly screened = new THREE.WebGLRenderTarget(1, 1, {
    format: THREE.RedFormat,
    depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
  });

  private readonly depth: () => THREE.DepthTexture | null;
  private readonly screens: () => readonly THREE.Object3D[];

  /**
   * `depth` gives the scene's depth for the frame being drawn, at the frame's size (null: nothing is outlined).
   * `screens` gives what hides a part although the frame's depth does not have it: glass, and shells the cutaway
   * has opened (asked only while something is outlined; what is not on show, or is itself selected, is left out).
   */
  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    depth: () => THREE.DepthTexture | null,
    screens: () => readonly THREE.Object3D[] = () => [],
  ) {
    super(new THREE.Vector2(1, 1), scene, camera);
    this.depth = depth;
    this.screens = screens;
    for (const list of [this.only, this.before]) {
      list.matrixAutoUpdate = false;
      list.matrixWorldAutoUpdate = false; // (their world matrices are the frame's: the scene has just been drawn)
    }
    this.only.children = this.meshes;
    this.before.children = this.hiding;
    // three's own mask material, for its vertex stage (skinning, instancing, morphs), asking the frame's depth instead
    this.mask = this.prepareMaskMaterial;
    this.mask.fragmentShader = MASK_FRAGMENT;
    this.mask.uniforms = {
      tDepth: { value: null },
      tScreens: { value: this.screened.depthTexture },
      uScreens: { value: 0 },
      uTexel: { value: new THREE.Vector2(1, 1) },
    };
    this.only.overrideMaterial = this.mask;
    // three's material for what is not selected: either side of every face, whatever its own material says
    this.before.overrideMaterial = this.depthMaterial;
    this.depthMaterial.colorWrite = false;
    this.renderTargetDepthBuffer.dispose(); // (what three's pass drew the rest of the scene into: never used here)
  }

  override setSize(width: number, height: number): void {
    super.setSize(width, height);
    this.screened.setSize(width, height);
  }

  override render(
    renderer: THREE.WebGLRenderer,
    _writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
    _deltaTime: number,
    maskActive: boolean,
  ): void {
    const depth = this.depth();
    this.meshes.length = 0;
    if (depth && this.selectedObjects.length) shownMeshes(this.selectedObjects, this.renderScene, this.meshes);
    if (!this.meshes.length || !depth) return;

    renderer.getClearColor(this.was);
    const alpha = renderer.getClearAlpha(),
      autoClear = renderer.autoClear;
    renderer.autoClear = false;
    if (maskActive) renderer.state.buffers.stencil.setTest(false);
    renderer.setClearColor(0xffffff, 1);

    // 0. what else hides it: the screens on show that are not themselves selected
    this.found.length = this.hiding.length = 0;
    shownMeshes(this.screens(), this.renderScene, this.found);
    for (const o of this.found) if (!this.meshes.includes(o)) this.hiding.push(o);
    this.mask.uniforms.uScreens!.value = Number(this.hiding.length > 0);
    if (this.hiding.length) {
      renderer.setRenderTarget(this.screened);
      renderer.clear();
      renderer.render(this.before, this.renderCamera);
      this.found.length = this.hiding.length = 0;
    }

    // 1. the selection, and where it is hidden
    const mask = this.renderTargetMaskBuffer;
    this.mask.uniforms.tDepth!.value = depth;
    (this.mask.uniforms.uTexel!.value as THREE.Vector2).set(1 / mask.width, 1 / mask.height);
    renderer.setRenderTarget(mask);
    renderer.clear();
    renderer.render(this.only, this.renderCamera);
    this.meshes.length = 0;

    // From here on it is three's pass, step for step.
    const quad = this.quad;
    const draw = (material: THREE.ShaderMaterial, to: THREE.WebGLRenderTarget): void => {
      quad.material = material;
      renderer.setRenderTarget(to);
      renderer.clear();
      quad.render(renderer);
    };
    // 2. at half size
    (this.copyUniforms as Record<string, THREE.IUniform>).tDiffuse!.value = mask.texture;
    draw(this.materialCopy, this.renderTargetMaskDownSampleBuffer);

    // 3. its edges
    const edge = this.edgeDetectionMaterial.uniforms;
    edge.maskTexture!.value = this.renderTargetMaskDownSampleBuffer.texture;
    edge.texSize!.value.set(this.renderTargetMaskDownSampleBuffer.width, this.renderTargetMaskDownSampleBuffer.height);
    edge.visibleEdgeColor!.value = this.tempPulseColor1.copy(this.visibleEdgeColor);
    edge.hiddenEdgeColor!.value = this.tempPulseColor2.copy(this.hiddenEdgeColor);
    draw(this.edgeDetectionMaterial, this.renderTargetEdgeBuffer1);

    // 4. blurred at half size, then at a quarter
    const blur1 = this.separableBlurMaterial1.uniforms;
    blur1.colorTexture!.value = this.renderTargetEdgeBuffer1.texture;
    blur1.direction!.value = ACROSS;
    blur1.kernelRadius!.value = this.edgeThickness;
    draw(this.separableBlurMaterial1, this.renderTargetBlurBuffer1);
    blur1.colorTexture!.value = this.renderTargetBlurBuffer1.texture;
    blur1.direction!.value = UPRIGHT;
    draw(this.separableBlurMaterial1, this.renderTargetEdgeBuffer1);
    const blur2 = this.separableBlurMaterial2.uniforms;
    blur2.colorTexture!.value = this.renderTargetEdgeBuffer1.texture;
    blur2.direction!.value = ACROSS;
    draw(this.separableBlurMaterial2, this.renderTargetBlurBuffer2);
    blur2.colorTexture!.value = this.renderTargetBlurBuffer2.texture;
    blur2.direction!.value = UPRIGHT;
    draw(this.separableBlurMaterial2, this.renderTargetEdgeBuffer2);

    // 5. added over the frame
    const over = this.overlayMaterial.uniforms;
    over.maskTexture!.value = mask.texture;
    over.edgeTexture1!.value = this.renderTargetEdgeBuffer1.texture;
    over.edgeTexture2!.value = this.renderTargetEdgeBuffer2.texture;
    over.patternTexture!.value = this.patternTexture;
    over.edgeStrength!.value = this.edgeStrength;
    over.edgeGlow!.value = this.edgeGlow;
    over.usePatternTexture!.value = this.usePatternTexture;
    if (maskActive) renderer.state.buffers.stencil.setTest(true);
    quad.material = this.overlayMaterial;
    renderer.setRenderTarget(readBuffer);
    quad.render(renderer);

    renderer.setClearColor(this.was, alpha);
    renderer.autoClear = autoClear;
  }

  override dispose(): void {
    super.dispose();
    this.quad.dispose();
    this.screened.dispose();
  }
}
