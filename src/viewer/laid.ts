import type * as THREE from 'three';

/**
 * What lies on the ground, kept apart in the depth buffer at any distance.
 *
 * A pad's slab lies 12 cm over the terrain under it; a stain 6 mm over the slab, a scorch 6 mm over that, the
 * joints and the painted lines a little higher. Close to, the depth buffer tells them apart by a long way
 * (`Stage.fitDepth`). Where the near plane is held close it cannot: following a vehicle the plane is 16 m from the
 * eye, the site kilometres below, and one step of depth down there is 14 cm from 6 km and a metre and a half from
 * 20. The layers fought (with the plane at 16 m, straight down from 20 km: 74 pixels a frame changing and changing
 * back with the eye moved 2 cm).
 *
 * They are layers, and which is on top is known. So each is drawn a fixed number of steps of the depth buffer
 * nearer than it is, by which layer its material is, and the terrain as many further (the GPU's polygon offset, in
 * units of the buffer's own resolution). No vertex is moved, so nothing shifts on the screen and no edge opens at a
 * glancing angle; the allowance grows with distance exactly as the buffer's step does. Where a step is a fraction of
 * a millimetre, on foot and round the pad, the allowance is a fraction of a millimetre. Where it is metres, a layer
 * also shows through the foot of whatever stands on it by that much of depth, which is under a pixel there (the
 * allowance over a pixel's breadth on the ground is the distance over 180 km, a step, with the plane at 16 m).
 * No slope-scaled part: at a glancing angle that would uncover a pixel's height of whatever is buried along the
 * foot of every wall. Shadow maps are not touched: a shadow's own bias is centimetres (shadows.ts), the marks cast
 * none, and steps of the camera's buffer mean nothing in the light's.
 *
 * The layer is the material's, by its name, which is how a model tells the viewer what a surface is (rendering.md,
 * "Laid on the ground"): a mark on a surface (`concrete-scorch…`, `concrete-stain…`: surface.ts's marks), and what
 * is laid or painted over surface and marks alike (`…-joint`, `paint-line-…`). A new site that lays something flat
 * on a slab names its material by the same rule and needs nothing here.
 */
const LAYERS: readonly [RegExp, number][] = [
  [/^concrete-stain/, 1],
  [/^concrete-scorch/, 2],
  [/(-joint$|^paint-line-)/, 3],
];

/** Steps of the depth buffer between one layer and the next (two: one is within what interpolating depth across a triangle loses). */
const STEPS = 2;
/** The terrain, under everything laid on it: measured, 2 steps left a third of the flips and 4 left none that more would cure. */
const GROUND = 4;

const laid = new Map<THREE.Material, number>();
let on = true;

function set(material: THREE.Material, units: number): void {
  laid.set(material, units);
  material.polygonOffset = on;
  material.polygonOffsetFactor = 0;
  material.polygonOffsetUnits = units;
}

/** Draw a material's surfaces as the layer its name says it is (nothing is done to a material that is no layer). */
export function lay(material: THREE.Material): void {
  const layer = LAYERS.find(([name]) => name.test(material.name))?.[1];
  if (layer) set(material, -STEPS * layer);
}

/** The terrain's material: under everything that is laid on it. */
export function ground(material: THREE.Material): void {
  set(material, GROUND);
}

/** For measuring: draw every layer where it is (false), or apart (true). Gives the materials changed, for whoever keeps copies of them (the looks' twins). */
export function layering(apart: boolean): THREE.Material[] {
  on = apart;
  for (const material of laid.keys()) material.polygonOffset = apart;
  return [...laid.keys()];
}
