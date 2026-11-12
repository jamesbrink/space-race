import * as THREE from 'three';

/**
 * Panes of glass, drawn as three draws them, without what it costs three to do it.
 *
 * A pane is clear and seen from both sides, and three draws any such mesh twice: its back faces, then its front
 * faces, so that the far side of a canopy is behind the near side whatever order its triangles come in. It does
 * that by changing the one material's `side` and marking it changed before each of the two draws, and a material
 * marked changed has its whole description worked out again to find its shader: some twenty microseconds, twice a
 * pane, in every pass that draws panes. With a hundred and twenty panes on show that was a quarter of the time a
 * frame of the pad took, to end each time with the two shaders it had the frame before.
 *
 * So each pane is two meshes of one geometry, one over the other: the pane itself with a copy of its material
 * that shows front faces only, and under it a twin with a copy that shows back faces only. Neither material ever
 * changes, so neither is looked up again. The twin is drawn straight before its pane (`paneOrder`), which is the
 * order three's two draws came in; the shaders, the uniforms and the state are the ones three used; the pixels
 * are the same. The twin is not a thing in the model: it has no name, answers no ray, and is marked `ghost` for
 * whatever lists a model's meshes. A ray still meets the pane from either side, as it did when its one material
 * showed both.
 */

/** The two halves of each clear two-sided material: back faces only, front faces only. */
const halves = new WeakMap<THREE.Material, { back: THREE.Material; front: THREE.Material }>();

/** A twin, to the pane it lies under. */
const paneOf = new WeakMap<THREE.Object3D, THREE.Object3D>();

/** Whether three would draw this material in two passes, back faces then front. */
export function twoPass(material: THREE.Material): boolean {
  return material.transparent === true && material.side === THREE.DoubleSide && material.forceSinglePass === false;
}

/** The back and front halves of a material three would draw in two passes. They are made once and never changed. */
export function halvesOf(whole: THREE.Material): { back: THREE.Material; front: THREE.Material } {
  let pair = halves.get(whole);
  if (!pair) {
    const back = whole.clone();
    back.side = THREE.BackSide;
    const front = whole.clone();
    front.side = THREE.FrontSide;
    halves.set(whole, (pair = { back, front }));
  }
  return pair;
}

/** A render item as three sorts it. */
interface Item {
  groupOrder: number;
  renderOrder: number;
  z: number;
  id: number;
  object: THREE.Object3D;
}

/**
 * Three's own order for what is drawn blended (furthest first, then by age), with a pane's twin kept straight
 * before its pane: the two are at the same depth, and two panes at one depth must not come between each other.
 */
export function paneOrder(a: Item, b: Item): number {
  if (a.groupOrder !== b.groupOrder) return a.groupOrder - b.groupOrder;
  if (a.renderOrder !== b.renderOrder) return a.renderOrder - b.renderOrder;
  if (a.z !== b.z) return b.z - a.z;
  const ofA = paneOf.get(a.object);
  const ofB = paneOf.get(b.object);
  const idA = ofA ? ofA.id : a.id;
  const idB = ofB ? ofB.id : b.id;
  if (idA !== idB) return idA - idB;
  return (ofA ? 0 : 1) - (ofB ? 0 : 1);
}

const noRay = (): void => {};
const plain = THREE.Mesh.prototype.raycast;

/** A pane's own answer to a ray: three asks the material which faces can be met, and the pane's now shows only its front. */
function rayOf(whole: THREE.Material): THREE.Mesh['raycast'] {
  return function (this: THREE.Mesh, raycaster, hits) {
    const drawn = this.material;
    this.material = whole;
    try {
      plain.call(this, raycaster, hits);
    } finally {
      this.material = drawn;
    }
  };
}

export class Panes {
  private readonly split: { pane: THREE.Mesh; twin: THREE.Mesh; whole: THREE.Material }[] = [];
  private on = true;

  /**
   * `give` puts a real material on a mesh in whichever look is in force (look.ts `Looks.give`). The renderer is
   * told the order the twins need.
   */
  constructor(renderer: Pick<THREE.WebGLRenderer, 'setTransparentSort'>, give: (mesh: THREE.Mesh, real: THREE.Material) => void) {
    this.give = give;
    renderer.setTransparentSort(paneOrder);
  }
  private readonly give: (mesh: THREE.Mesh, real: THREE.Material) => void;

  /**
   * Take a pane that three would draw in two passes and make it two meshes. Its material must be its real one,
   * and must stay as it is: one that will be changed (a shell's, which the cutaway opens) is left to three.
   * Not to be called from inside a traverse of the pane's model: it adds a child.
   */
  add(pane: THREE.Mesh): void {
    const whole = pane.material as THREE.Material;
    if (Array.isArray(whole) || !twoPass(whole)) return;
    const { back, front } = halvesOf(whole);
    const twin = new THREE.Mesh(pane.geometry, back);
    twin.castShadow = pane.castShadow;
    twin.receiveShadow = pane.receiveShadow;
    twin.renderOrder = pane.renderOrder;
    twin.frustumCulled = pane.frustumCulled;
    twin.layers.mask = pane.layers.mask;
    twin.raycast = noRay;
    twin.userData.ghost = true;
    // three sorts and culls a mesh by a bounding sphere of its own if it has been given one (a figure's pieces are): the twin's is its pane's
    for (const bounds of ['boundingSphere', 'boundingBox'] as const)
      Object.defineProperty(twin, bounds, { get: () => (pane as unknown as Record<string, unknown>)[bounds], configurable: true });
    pane.raycast = rayOf(whole);
    paneOf.set(twin, pane);
    pane.add(twin);
    this.split.push({ pane, twin, whole });
    if (this.on) pane.material = front;
    else twin.visible = false;
  }

  get enabled(): boolean {
    return this.on;
  }

  /** For comparing the two: off, every pane is one mesh again and three draws it its own way. They must look the same. */
  set enabled(on: boolean) {
    if (on === this.on) return;
    this.on = on;
    for (const { pane, twin, whole } of this.split) {
      twin.visible = on;
      this.give(pane, on ? halvesOf(whole).front : whole);
    }
  }
}
