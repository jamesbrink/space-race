import type * as THREE from 'three';

/**
 * Let go of what is on the GPU for everything under `root`: each geometry, each material (its programs are released
 * when nothing else draws with them) and the pictures the materials wear as their own maps. What a material reads
 * through its uniforms is left alone: those are often shared by every material of a kind (the weather's, the
 * atmosphere's: weathermap.ts, atmosphere.ts) and belong to whoever made them; and so is any picture a render target
 * draws into, which is its target's. Anything let go is made again by the renderer if it is drawn again: this frees,
 * it does not break. For a flight the stage no longer shows, or a place it has left (Stage.load).
 */
export function disposeTree(root: THREE.Object3D): void {
  const materials = new Set<THREE.Material>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose?.();
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
    m.dispose();
  }
}
