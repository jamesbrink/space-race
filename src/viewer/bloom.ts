import * as THREE from 'three';
import type { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { FullScreenQuad, Pass } from 'three/addons/postprocessing/Pass.js';

/**
 * The glow round what is brighter than the frame can show: the engine's fire, the Sun's glare on metal, a lamp's
 * lens at night, the heat of entry.
 *
 * It is three's UnrealBloomPass in what it draws (the same threshold, the same five blurs laid over one another
 * with the same weights, tap for tap), and differs in two things that pass could not be told:
 *
 * - **Its widths are lengths on the screen, not texels of the drawing buffer.** Three's pass works at half the
 *   buffer's size with its blurs in texels, so on a screen of two device pixels a CSS pixel the glow was half as
 *   wide as on a plain one: a glow whose width depends on the screen's density. Here every level is sized from the
 *   window in CSS pixels: the bright parts are taken at one sample a CSS pixel, the finest blur is at that size and
 *   each of the others at half the last. That is, to the texel, what a dense screen had (the owner's: that picture
 *   is the reference), so on one nothing changed (measured: no pixel by more than one level of 255, which is the
 *   rounding of the frame's half floats); on a plain screen the glow is now half as wide as it was, and agrees.
 *   The blurs' standard deviations are 2, 6.7, 18.7, 48 and 117 CSS pixels.
 * - **It is added as the frame goes to the screen** (`adopt`: in three's OutputPass, as the clouds are, under
 *   them), not blended over the frame in a pass of its own: the frame is multisampled, and a pass over it is every
 *   sample read back, written and the whole frame resolved again. That, not the blurring, was what it cost: 1.2 to
 *   2.9 ms a frame at 1440x900 on a dense screen, in every view.
 *
 * Tried and not kept: the finest level at half its size with a narrower blur to make up for it (`pnpm bench`
 * could not tell the two apart in time, and it was up to 6 levels out on a few hundred pixels at a bright tip).
 */

/** Three's own: the size of each level's blur in its own texels (UnrealBloomPass's `kernelSizeArray`; the deviation is a third of it). */
const KERNELS = [6, 10, 14, 18, 22] as const;
/** How much each level counts (UnrealBloomPass's `bloomFactors`), finest first. */
const FACTORS = [1.0, 0.8, 0.6, 0.4, 0.2] as const;

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

/** What is over the threshold, one sample a CSS pixel (read between the buffer's pixels: on a dense screen, the mean of the four under it). */
const BRIGHT = /* glsl */ `
  #include <common>
  uniform sampler2D tDiffuse;
  uniform float uThreshold;
  varying vec2 vUv;
  void main() {
    vec3 c = texture2D(tDiffuse, vUv).rgb;
    gl_FragColor = vec4(c * smoothstep(uThreshold, uThreshold + 0.01, luminance(c)), 1.0);
  }`;

/** One direction of a blur: the middle tap and pairs either side, each pair of neighbouring taps read as one between them (three's, tap for tap). */
const BLUR = /* glsl */ `
  uniform sampler2D tColour;
  uniform vec2 uStep; // a texel along the blur's direction, as a part of the texture
  uniform float uCentre;
  uniform float uOffsets[PAIRS];
  uniform float uWeights[PAIRS];
  varying vec2 vUv;
  void main() {
    vec3 sum = texture2D(tColour, vUv).rgb * uCentre;
    for (int i = 0; i < PAIRS; i++) {
      vec2 off = uStep * uOffsets[i];
      sum += (texture2D(tColour, vUv + off).rgb + texture2D(tColour, vUv - off).rgb) * uWeights[i];
    }
    gl_FragColor = vec4(sum, 1.0);
  }`;

/** The five levels laid over one another (three's composite: the 3 is its own, kept so the strength means what it did). */
const COMPOSITE = /* glsl */ `
  uniform sampler2D tLevel0, tLevel1, tLevel2, tLevel3, tLevel4;
  uniform float uStrength;
  uniform float uWeights[5];
  varying vec2 vUv;
  void main() {
    gl_FragColor = vec4(3.0 * uStrength * (
      uWeights[0] * texture2D(tLevel0, vUv).rgb +
      uWeights[1] * texture2D(tLevel1, vUv).rgb +
      uWeights[2] * texture2D(tLevel2, vUv).rgb +
      uWeights[3] * texture2D(tLevel3, vUv).rgb +
      uWeights[4] * texture2D(tLevel4, vUv).rgb), 1.0);
  }`;

/** A blur's taps from its weights at 0, 1, 2 ... texels: neighbours merged into one read between them, as three merges them. */
function taps(coefficients: number[]): { centre: number; offsets: number[]; weights: number[] } {
  const offsets: number[] = [];
  const weights: number[] = [];
  for (let i = 1; i < coefficients.length; i += 2) {
    const a = coefficients[i]!,
      b = coefficients[i + 1] ?? 0;
    offsets.push((i * a + (i + 1) * b) / (a + b));
    weights.push(a + b);
  }
  return { centre: coefficients[0]!, offsets, weights };
}

/** Three's blur of `size` texels: a Gaussian a third of that in deviation, cut off at `size` (UnrealBloomPass `_getSeparableBlurMaterial`). */
function threes(size: number): number[] {
  const sigma = size / 3;
  return Array.from({ length: size }, (_, i) => (0.39894 * Math.exp((-0.5 * i * i) / (sigma * sigma))) / sigma);
}

const target = (): THREE.WebGLRenderTarget => {
  const t = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });
  t.texture.generateMipmaps = false;
  return t;
};

export class Bloom extends Pass {
  strength: number;
  radius: number;
  threshold: number;
  private readonly quad = new FullScreenQuad();
  private readonly bright = target();
  /** Each level's two targets: blurred across, then down. The first is the window's CSS size, then each half the last. */
  private readonly across = [target(), target(), target(), target(), target()];
  private readonly down = [target(), target(), target(), target(), target()];
  /** All five laid together, at the window's CSS size: what the output adds. */
  private readonly sum = target();
  private readonly brightMaterial: THREE.ShaderMaterial;
  private readonly blurs: THREE.ShaderMaterial[];
  private readonly composite: THREE.ShaderMaterial;
  /** Told to the output's shader: whether there is a glow to add. */
  private readonly on = { value: 0 };
  private readonly was = new THREE.Color();

  constructor(strength: number, radius: number, threshold: number) {
    super();
    this.strength = strength;
    this.radius = radius;
    this.threshold = threshold;
    this.needsSwap = false;
    const plain = { depthTest: false, depthWrite: false, toneMapped: false };
    this.brightMaterial = new THREE.ShaderMaterial({
      ...plain,
      uniforms: { tDiffuse: { value: null }, uThreshold: { value: threshold } },
      vertexShader: VERTEX,
      fragmentShader: BRIGHT,
    });
    this.blurs = KERNELS.map(threes).map((coefficients) => {
      const t = taps(coefficients);
      return new THREE.ShaderMaterial({
        ...plain,
        defines: { PAIRS: t.offsets.length },
        uniforms: {
          tColour: { value: null },
          uStep: { value: new THREE.Vector2() },
          uCentre: { value: t.centre },
          uOffsets: { value: t.offsets },
          uWeights: { value: t.weights },
        },
        vertexShader: VERTEX,
        fragmentShader: BLUR,
      });
    });
    this.composite = new THREE.ShaderMaterial({
      ...plain,
      uniforms: {
        tLevel0: { value: this.down[0]!.texture },
        tLevel1: { value: this.down[1]!.texture },
        tLevel2: { value: this.down[2]!.texture },
        tLevel3: { value: this.down[3]!.texture },
        tLevel4: { value: this.down[4]!.texture },
        uStrength: { value: strength },
        uWeights: { value: [0, 0, 0, 0, 0] },
      },
      vertexShader: VERTEX,
      fragmentShader: COMPOSITE,
    });
  }

  /**
   * Have the output add the glow as it draws the frame to the screen (three's OutputPass; after `CloudPass.adopt`,
   * whose clouds are laid over the frame and its glow alike, as they were when the glow was blended into the frame).
   */
  adopt(output: OutputPass): void {
    const material = output.material;
    const read = /((?:gl_FragColor|oOutput) = texture(?:2D)?\( tDiffuse, vUv \);)/;
    if (!read.test(material.fragmentShader)) throw new Error('bloom: the output pass has changed its shader');
    const [, , target] = /((gl_FragColor|oOutput) = )/.exec(material.fragmentShader.match(read)![0])!;
    const lookup = material.fragmentShader.includes('texture2D(') ? 'texture2D' : 'texture';
    material.fragmentShader = material.fragmentShader
      .replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse;\nuniform sampler2D tBloom;\nuniform float uBloom;')
      .replace(read, `$1\nif (uBloom > 0.5) ${target}.rgb += ${lookup}(tBloom, vUv).rgb;`);
    material.uniforms.tBloom = { value: this.sum.texture };
    material.uniforms.uBloom = this.on;
    material.needsUpdate = true;
  }

  /** The composer's: the drawing buffer's size, which is not what the glow is sized by (`fit`). */
  override setSize(): void {}

  /** The window's size in CSS pixels: every level is sized from it, so the glow is as wide on any screen. */
  fit(width: number, height: number): void {
    let w = Math.max(1, width),
      h = Math.max(1, height);
    this.sum.setSize(w, h);
    this.bright.setSize(w, h);
    for (let i = 0; i < this.down.length; i++) {
      this.across[i]!.setSize(w, h);
      this.down[i]!.setSize(w, h);
      w = Math.max(1, Math.round(w / 2));
      h = Math.max(1, Math.round(h / 2));
    }
  }

  override render(renderer: THREE.WebGLRenderer, _write: THREE.WebGLRenderTarget, read: THREE.WebGLRenderTarget): void {
    this.on.value = 1;
    const quad = this.quad;
    renderer.getClearColor(this.was);
    const alpha = renderer.getClearAlpha(),
      auto = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 0);
    const draw = (material: THREE.ShaderMaterial, to: THREE.WebGLRenderTarget): void => {
      quad.material = material;
      renderer.setRenderTarget(to);
      renderer.clear();
      quad.render(renderer);
    };
    this.brightMaterial.uniforms.tDiffuse!.value = read.texture;
    this.brightMaterial.uniforms.uThreshold!.value = this.threshold;
    draw(this.brightMaterial, this.bright);
    let from = this.bright;
    this.blurs.forEach((blur, i) => {
      const across = this.across[i]!,
        down = this.down[i]!;
      const u = blur.uniforms;
      u.tColour!.value = from.texture;
      (u.uStep!.value as THREE.Vector2).set(1 / across.width, 0);
      draw(blur, across);
      u.tColour!.value = across.texture;
      (u.uStep!.value as THREE.Vector2).set(0, 1 / across.height);
      draw(blur, down);
      from = down;
    });
    const c = this.composite.uniforms;
    c.uStrength!.value = this.strength;
    // (three's `lerpBloomFactor`: the radius turns the weights from finest-most to coarsest-most)
    (c.uWeights!.value as number[]).splice(0, 5, ...FACTORS.map((f) => f + (1.2 - f - f) * this.radius));
    draw(this.composite, this.sum);
    renderer.setClearColor(this.was, alpha);
    renderer.autoClear = auto;
  }

  /** Nothing was drawn this frame (the pass is off): the output adds nothing. Call before the composer renders. */
  before(): void {
    this.on.value = 0;
  }

  override dispose(): void {
    for (const t of [this.bright, this.sum, ...this.across, ...this.down]) t.dispose();
    for (const m of [this.brightMaterial, this.composite, ...this.blurs]) m.dispose();
    this.quad.dispose();
  }
}
