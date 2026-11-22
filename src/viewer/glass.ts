import * as THREE from 'three';

/**
 * Window glass. Mostly you look through it; what you see of the pane itself is the sky in it,
 * strongest at a glancing angle. Models name a material `glass` and put the real thing behind it:
 * a room, or a dark `window-void` standing in for an unlit interior.
 */
export const GLASS = new THREE.MeshPhysicalMaterial({
  name: 'glass',
  // nearly black, nearly clear: a pane has almost no colour of its own, only what it reflects
  color: 0x0c1418,
  transparent: true,
  opacity: 0.16,
  roughness: 0.02,
  metalness: 0,
  ior: 1.52,
  specularIntensity: 1,
  clearcoat: 1,
  clearcoatRoughness: 0.02,
  envMapIntensity: 1.6,
  side: THREE.DoubleSide,
  depthWrite: false,
});

/**
 * A helmet visor the model draws as dark glass (an opaque `glass-visor`: the Mark IV's, the SK-1's, the Berkut's): the
 * same pane, but the face behind it is in the helmet's shade and the sky is on the glass.
 */
const VISOR = GLASS.clone();
VISOR.name = 'glass-visor';
VISOR.opacity = 0.5;
/**
 * A visor the model draws clear (a `glass-visor` it blends, at its own opacity: the G3C's, 0.14): a pane like a window's,
 * as much of it seen as the model says, so the face, the earphone pads and the microphones are seen through it. Before,
 * every visor was `VISOR`, and a clear one read as dark smoked glass, near black over the face.
 */
const clearVisors = new Map<number, THREE.MeshPhysicalMaterial>();
export function visorOf(own: THREE.Material): THREE.MeshPhysicalMaterial {
  if (!own.transparent) return VISOR;
  const opacity = Math.round(own.opacity * 100) / 100;
  let pane = clearVisors.get(opacity);
  if (!pane) {
    pane = GLASS.clone();
    pane.name = 'glass-visor';
    pane.opacity = opacity;
    clearVisors.set(opacity, pane);
  }
  return pane;
}
/** A lens (`glass-lens`): thick glass over a dark barrel. Less of it is seen through and more of the sky is on it, and it is not a window to go and look in at. */
export const LENS = GLASS.clone();
LENS.name = 'glass-lens';
LENS.opacity = 0.34;
LENS.envMapIntensity = 2.4;
