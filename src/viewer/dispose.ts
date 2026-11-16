import type * as THREE from 'three';

/**
 * Let go of what is on the GPU for everything under `root`: each geometry, each material (its programs are released
 * when nothing else draws with them) and the pictures the materials wear as their own maps. What a material reads
 * through its uniforms is left alone: those are often shared by every material of a kind (the weather's, the
 * atmosphere's: weathermap.ts, atmosphere.ts) and belong to whoever made them; and so is any picture a render target
 * draws into, which is its target's. Anything let go is made again by the renderer if it is drawn again: this frees,
 * it does not break. For a flight the stage no longer shows, or a place it has left (Stage.load).
 *
 * `place`: the tree is a place's (Settings.drop), whose materials' uniforms are its own too (its ground's bakes, its
 * globe's maps), all but those in `keep`, which every place reads alike (the atmosphere's tables, the weather's map,
 * the clouds' march: whoever made them keeps them). A picture drawn into a target goes with its target.
 */
export function disposeTree(root: THREE.Object3D, place?: { keep: Set<THREE.Texture>; renderer: THREE.WebGLRenderer }): void {
  const materials = new Set<THREE.Material>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose?.();
    // (an instanced or batched mesh has buffers of its own besides its geometry's: where each copy stands, its colour)
    const many = o as THREE.Object3D & { isInstancedMesh?: boolean; isBatchedMesh?: boolean; dispose?: () => void };
    if (many.isInstancedMesh || many.isBatchedMesh) many.dispose?.();
    const own = mesh.material as THREE.Material | THREE.Material[] | undefined;
    for (const m of own ? (Array.isArray(own) ? own : [own]) : []) materials.add(m);
    const real = mesh.userData?.real as THREE.Material | undefined;
    if (real) materials.add(real);
  });
  for (const m of materials) {
    for (const value of Object.values(m)) {
      const texture = value as THREE.Texture | null;
      if (texture?.isTexture && !(texture as THREE.Texture & { isRenderTargetTexture?: boolean }).isRenderTargetTexture) texture.dispose();
    }
    // (a place's own: what its materials read through uniforms of its own, the maps it baked into targets among them:
    // a material's own uniforms, and those a material given its shader as it is compiled was given then, which the
    // renderer keeps. Only the scene's own names, uSomething and tSomething: three's, its lights' shadow maps among
    // them, are the renderer's)
    if (place) {
      const own = (m as THREE.ShaderMaterial).uniforms ?? {};
      const compiled = (place.renderer.properties.get(m) as { uniforms?: Record<string, THREE.IUniform> }).uniforms ?? {};
      for (const [name, u] of [...Object.entries(own), ...Object.entries(compiled)]) {
        const texture = u?.value as (THREE.Texture & { renderTarget?: THREE.RenderTarget | null }) | null;
        if (!/^[ut][A-Z]/.test(name) || !texture?.isTexture || place.keep.has(texture)) continue;
        // (a cube's or an array's target does not name itself on its picture: the renderer has it)
        const target =
          texture.renderTarget ?? (place.renderer.properties.get(texture) as { __renderTarget?: THREE.RenderTarget }).__renderTarget;
        if (target) target.dispose();
        else texture.dispose();
      }
    }
    m.dispose();
  }
}
