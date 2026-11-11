import type * as THREE from 'three';
import { NOISE } from './space';

/**
 * What a surface looks like from a metre away. A model gives a material one colour, which is
 * right from across the pad and wrong underfoot: eighty metres of concrete in a single tone
 * reads as a floor plan. Here the materials that are large and plain (by the name the model gave
 * them) are given their grain: not a texture laid on, but variation computed from where each
 * point is in the world, so it has no seams, never repeats, and needs nothing from the model.
 * Each scale of it fades out as it shrinks below a pixel, so nothing shimmers at a distance.
 *
 * To add a kind of surface: a name pattern and the GLSL that varies `tone` (a multiplier on the
 * material's colour) and `rough` (added to its roughness) from `p`, the point in metres, with
 * `seen(size)` saying how much of a feature that many metres across can be made out.
 */
interface Grain {
  match: RegExp;
  glsl: string;
}

const GRAINS: Grain[] = [
  {
    // Poured concrete: pours differ slab to slab, the surface is pitted and floated, and it weathers in drifts.
    match: /^concrete(?!-scorch|-stain|-joint)/,
    glsl: /* glsl */ `
      float pour = fbm(p * vec3(0.45, 0.9, 0.45) + 3.0);                    // metres: one day's pour against the next
      float drift = fbm(p * vec3(1.1, 2.0, 1.1) + 11.0);                    // decimetres: weathering, where water stood
      float sand = noise(p * 70.0) * 0.6 + noise(p * 190.0) * 0.4;          // the float finish
      float pits = smoothstep(0.8, 0.92, noise(p * 150.0 + 4.0 * noise(p * 37.0)));   // air holes and popped aggregate: millimetres, round
      tone *= 1.0 + 0.55 * (pour - 0.5) * seen(2.0) + 0.4 * (drift - 0.5) * seen(0.4);
      tone *= 1.0 + 0.42 * (sand - 0.5) * seen(0.012) - 0.22 * pits * seen(0.008);
      tone *= mix(vec3(1.0), vec3(1.05, 1.0, 0.9), clamp(2.0 * (drift - 0.4), 0.0, 1.0) * seen(0.4));   // a little warmth where it has weathered
      rough += 0.1 * (sand - 0.5) * seen(0.012);`,
  },
  {
    // Crushed stone under the track: each stone its own grey.
    match: /^ballast-gravel/,
    glsl: /* glsl */ `
      vec3 cell = floor(p * 24.0);
      float stone = hash(cell);
      float edge = noise(p * 48.0);
      tone *= (0.72 + 0.56 * stone) * mix(1.0, 0.75 + 0.5 * edge, seen(0.02));
      tone = mix(vec3(1.0), tone, seen(0.03));
      rough += 0.1 * (stone - 0.5) * seen(0.03);`,
  },
  {
    // Black paint and rubber are never one black: dust settles on what faces up, and edges catch the sky.
    match: /^(paint-launcher-black|steel-chassis|rubber$|steel-scorched)/,
    glsl: /* glsl */ `
      float dust = fbm(p * 3.0 + 7.0);
      tone = tone * (1.0 + 0.5 * (dust - 0.45) * seen(0.15)) + vec3(0.022, 0.021, 0.019) * (0.6 + dust);
      rough += 0.12 * (noise(p * 60.0) - 0.5) * seen(0.015);`,
  },
];

/** Materials that are marks left on a surface, not surfaces: a scorch, a stain. */
const MARK = /^concrete-(scorch|stain)/;

/**
 * A mark on the ground has no edge. The model gives a scorch as a flat patch with an outline,
 * which from across the pad is right and at three metres is cut paper. Here the patch is soot:
 * thick in places, thin in others, gone in others, so its outline is broken up and what is left
 * of it reads as where the deposit happens to stop. A model can do better still by fading the
 * patch's own rim: vertex colours with alpha 0 on the outline are honoured.
 * Returns the material to use, or null if this is no mark.
 */
const marks = new Map<THREE.Material, THREE.Material>();
export function mark(mesh: THREE.Mesh): THREE.Material | null {
  const from = mesh.material as THREE.Material;
  if (Array.isArray(from) || !MARK.test(from.name)) return null;
  const rimmed = mesh.geometry.getAttribute('color')?.itemSize === 4;
  let material = rimmed ? undefined : marks.get(from);
  if (material) return material;
  material = from.clone();
  material.name = from.name;
  material.transparent = true;
  material.depthWrite = false;
  material.vertexColors = rimmed;
  material.userData.plainWhenDrawn = true; // a drawing keeps the patch as a shape
  material.onBeforeCompile = (shader) => {
    // where it is in the scene's frame: drawn from the eye, so the eye is added back (origin.ts: uOrigin)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMarkAt;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvMarkAt = (modelMatrix * vec4(transformed, 1.0)).xyz + uOrigin;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec3 vMarkAt;\n${NOISE}`)
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        {
          float drift = fbm(vMarkAt * 0.9 + 2.0);                      // where the deposit lies, metres across
          float thin = fbm(vMarkAt * 7.0 + 9.0);                       // and how patchy it is, hand-sized
          float cover = smoothstep(0.34, 0.6, drift) * (0.5 + 0.5 * thin);
          diffuseColor.a *= cover;
          diffuseColor.rgb *= 0.8 + 0.4 * thin;
        }`,
      );
  };
  material.customProgramCacheKey = () => `mark:${rimmed}`;
  if (!rimmed) marks.set(from, material);
  return material;
}

/** Give a material its grain, if it is one of the plain ones. Safe to call on any material, once. */
export function grain(material: THREE.Material): void {
  const kind = GRAINS.find((g) => g.match.test(material.name));
  if (!kind || material.userData.grained) return;
  material.userData.grained = true;
  // the cel look is flat colour: its twin of this material does not take the grain (look.ts)
  material.userData.plainWhenDrawn = true;
  material.onBeforeCompile = (shader) => {
    // drawn from the eye: the eye is added back for a place in the scene's frame (origin.ts: uOrigin)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vGrainAt;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvGrainAt = (modelMatrix * vec4(transformed, 1.0)).xyz + uOrigin;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        varying vec3 vGrainAt;
        float grainRough;
        ${NOISE}
        float grainPixel;   // metres across one pixel, here
        // how much of a feature this many metres across can be made out: none once it is under two pixels
        float seen(float size) { return 1.0 - smoothstep(0.25, 0.5, grainPixel / size); }`,
      )
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        {
          vec3 p = vGrainAt;
          grainPixel = length(fwidth(p));
          vec3 tone = vec3(1.0);
          float rough = 0.0;
          ${kind.glsl}
          diffuseColor.rgb *= tone;
          grainRough = rough;
        }`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + grainRough, 0.04, 1.0);',
      );
  };
  material.customProgramCacheKey = () => `grain:${GRAINS.indexOf(kind)}`;
  material.needsUpdate = true;
}
