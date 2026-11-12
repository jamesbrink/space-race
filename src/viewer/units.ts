import type * as THREE from 'three';

/**
 * The texture units a lit material must leave free: each shadow-casting light it is under takes one more, and a
 * fragment shader has sixteen (WebGL 2's promise; `MAX_TEXTURE_IMAGE_UNITS`). Three, with the Sun's three maps
 * (near, far and the sky's: shadows.ts) already counted. See docs/agents/rendering.md,
 * "Texture units".
 */
export const UNITS_FREE = 3;

/** Every program the renderer has made and how many texture units its samplers take, most first. */
export function samplerCounts(renderer: THREE.WebGLRenderer): { name: string; units: number; samplers: string[] }[] {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const kinds = new Set<number>([
    gl.SAMPLER_2D,
    gl.SAMPLER_CUBE,
    gl.SAMPLER_3D,
    gl.SAMPLER_2D_ARRAY,
    gl.SAMPLER_2D_SHADOW,
    gl.SAMPLER_CUBE_SHADOW,
    gl.SAMPLER_2D_ARRAY_SHADOW,
  ]);
  const out: { name: string; units: number; samplers: string[] }[] = [];
  for (const made of renderer.info.programs ?? []) {
    const program = (made as unknown as { program: WebGLProgram }).program;
    const samplers: string[] = [];
    let units = 0;
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const u = gl.getActiveUniform(program, i);
      if (!u || !kinds.has(u.type)) continue;
      units += u.size;
      samplers.push(u.size > 1 ? `${u.name} x${u.size}` : u.name);
    }
    out.push({ name: made.name, units, samplers });
  }
  return out.sort((a, b) => b.units - a.units);
}

/**
 * Say (once for each material's name) which programs leave fewer than UNITS_FREE texture units: for a development
 * build, some seconds after the scene is up. `lit`: the names of the materials held to it (the ones lights fall on).
 */
export function checkUnits(renderer: THREE.WebGLRenderer, lit: (name: string) => boolean = () => true): void {
  const most = renderer.getContext().getParameter(renderer.getContext().MAX_TEXTURE_IMAGE_UNITS) as number;
  const said = new Set<string>();
  for (const p of samplerCounts(renderer)) {
    // (what the lights themselves have taken, beyond the Sun's two maps, is what the budget is for: not counted against it)
    const lights = p.samplers
      .filter((n) => /^(point|spot)(ShadowMap|LightMap)/.test(n))
      .reduce((sum, n) => sum + Number(/ x(\d+)$/.exec(n)?.[1] ?? 1), 0);
    if (most - (p.units - lights) >= UNITS_FREE || said.has(p.name) || !lit(p.name)) continue;
    said.add(p.name);
    console.warn(
      `texture units: "${p.name}" reads ${p.units - lights} of ${most} before its lights' own, leaving ${most - p.units + lights} for lights (the budget is ${UNITS_FREE} free): ${p.samplers.join(', ')}`,
    );
  }
}
