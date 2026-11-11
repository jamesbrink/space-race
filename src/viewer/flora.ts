import * as THREE from 'three';
import { hash2, noise2, sequence } from './field';
import { NOISE } from './space';

/**
 * Plants as a community: what grows where the site's cover map says it does, species by species,
 * each in a few variants, at full detail near the eye and simpler further off, and gone into the
 * land's own canopy (land.ts) beyond. Nothing here knows which place it is: a site supplies a
 * `FloraSpec` (the species, how common each is along its zones, how tall) and a way to read its
 * cover and its ground's height.
 *
 * **Forms.** Every species is built from one of a few forms, by parameters:
 * - `fan`: a palmetto: fans of pleated blades on stalks, split into pointed segments at the edge.
 * - `shrub`: a woody shrub: crooked stems and clusters of leafy sprigs round a few masses.
 * - `palm`: a tree palm: a trunk, a crown of drooping fans, and a skirt of dead ones.
 * - `tuft`: a bunch of grass blades, with or without seed heads.
 * Leaves are cards whose outline is drawn in the fragment shader (a fan's segments, a sprig's
 * leaves): no texture files, crisp at any distance, and a few hundred triangles a plant.
 *
 * **Distance.** Each plant is drawn in full near the eye, as its `far` form further off, and
 * not at all beyond its reach; where one gives way to the next both are drawn and each is
 * dissolved by a screen-door dither against the other, so nothing pops. A plant standing in a
 * closed thicket hands over to the land's canopy at 50 to 60 m; one standing alone (the edge of a
 * clearing, a palm) carries on to its full reach.
 *
 * **Wind.** Near plants lean and bob a little with a breeze from the site's quarter: a vertex
 * shift by how far a point is from the plant's root, at the rate the still view is redrawn.
 */

export type Form =
  | { kind: 'fan'; fans: [number, number]; stalk: [number, number]; blade: [number, number]; segments: number; dead: number }
  | { kind: 'shrub'; masses: [number, number]; spread: number; leaf: [count: number, length: number, width: number, angle: number] }
  | { kind: 'palm'; trunk: [number, number]; fronds: number; blade: number; dead: number }
  | { kind: 'tuft'; blades: [number, number]; heads: number; lean: number };

export interface Species {
  name: string;
  form: Form;
  /** The cover it grows in: shrubs in the woody cover, grasses in the herb cover; trees are few and stand in the woody cover, placed on their own wider spacing. */
  layer: 'woody' | 'herb' | 'tree';
  /** How common along the site's zone, 0 to 1: [zone, weight] points, linear between. */
  abundance: [number, number][];
  /** Height when grown, metres: least and most. */
  height: [number, number];
  /** Colours (linear): the plant's own range, each instance picks between them. */
  colours: [THREE.Color, THREE.Color];
  /** Within this far of the eye in full; its far form to `reach` if it stands alone. Metres. */
  near: number;
  reach: number;
  /** How much it gives to the wind, 0 to 1. */
  sway: number;
  /** Surface sheen: 0 glossy to 1 matte. */
  rough: number;
}

export interface FloraSpec {
  species: Species[];
  /** Metres between the places a plant might stand, in each layer. */
  spacing: { woody: number; herb: number; tree: number };
  /** How tall plants grow along the zone, as a fraction of their full height (salt pruning near a shore). */
  stature: (zone: number) => number;
  /** The breeze: from this bearing in the land's frame (radians, the way it blows toward) and how strong, 0 to 1. */
  wind: { toward: number; strength: number };
}

/** What flora needs from the land: cover (woody, herb, bare, zone) and the ground's height, at a point in the land's frame. */
export interface Ground {
  coverAt(x: number, z: number, out: Float32Array): boolean;
  heightAt(x: number, z: number): number;
}

/** Plants are sorted into their forms again once the eye has moved this far, metres. */
const RESORT = 5;
/** A plant in a thicket closer than this (woody cover) gives way to the land's canopy. */
const THICKET = 0.55;
/** Where a plant in a thicket is gone, metres from the eye: under the land's canopy by then. */
const UNDER: [number, number] = [52, 60];
/** Within this far of the eye a plant casts a shadow, metres: the walker's shadow map is 52 m across (stage.ts). */
const SHADOWED = 18;
/** Variants built of each species. */
const VARIANTS = 3;

// ----------------------------------------------------------------------------------------------
// Building the forms. Every vertex carries: colour (a tint on the instance's), `aFlex` (how far
// it moves in the wind, 0 at the root), `aShape` (which outline its card has: 0 solid, 1 fan
// segments, 2 sprig of leaves, 3 blade) and `uv` (where on its card it is).

class Builder {
  positions: number[] = [];
  normals: number[] = [];
  colours: number[] = [];
  uvs: number[] = [];
  flex: number[] = [];
  shape: number[] = [];
  indices: number[] = [];
  vertex(p: THREE.Vector3, n: THREE.Vector3, c: THREE.Color, u: number, v: number, flex: number, shape: number): number {
    this.positions.push(p.x, p.y, p.z);
    this.normals.push(n.x, n.y, n.z);
    this.colours.push(c.r, c.g, c.b);
    this.uvs.push(u, v);
    this.flex.push(flex);
    this.shape.push(shape);
    return this.positions.length / 3 - 1;
  }
  tri(a: number, b: number, c: number): void {
    this.indices.push(a, b, c);
  }
  quad(a: number, b: number, c: number, d: number): void {
    this.indices.push(a, b, c, b, d, c);
  }
  /** A tapering stick of `sides` sides from a to b, radius r0 to r1. */
  stick(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, c: THREE.Color, flex0: number, flex1: number, sides = 4): void {
    const axis = b.clone().sub(a).normalize();
    const side = new THREE.Vector3(0, 1, 0).cross(axis);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    const other = axis.clone().cross(side);
    const first = this.positions.length / 3;
    for (let i = 0; i <= sides; i++) {
      const t = (i / sides) * Math.PI * 2;
      const n = side.clone().multiplyScalar(Math.cos(t)).addScaledVector(other, Math.sin(t));
      this.vertex(a.clone().addScaledVector(n, r0), n, c, i / sides, 0, flex0, 0);
      this.vertex(b.clone().addScaledVector(n, r1), n, c, i / sides, 1, flex1, 0);
    }
    for (let i = 0; i < sides; i++) this.quad(first + 2 * i, first + 2 * i + 2, first + 2 * i + 1, first + 2 * i + 3);
  }
  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.colours, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    g.setAttribute('aFlex', new THREE.Float32BufferAttribute(this.flex, 1));
    g.setAttribute('aShape', new THREE.Float32BufferAttribute(this.shape, 1));
    g.setIndex(this.indices);
    g.computeBoundingSphere();
    return g;
  }
}

/**
 * A fan: a pleated blade on the end of a stalk. `at` is the stalk's top, `facing` the way the
 * fan's face looks, `along` the way the fan opens (from stalk toward its far edge), `radius` its
 * size, `sweep` how much of a circle it spreads round (radians), `droop` how far its far edge
 * falls (radians, bent down along its length), `spokes` its pleats (even). The fan's normals face
 * `facing`. Its segments are cut by the fragment shader along u.
 */
function fan(
  b: Builder,
  at: THREE.Vector3,
  facing: THREE.Vector3,
  along: THREE.Vector3,
  radius: number,
  sweep: number,
  droop: number,
  spokes: number,
  rings: number,
  colour: THREE.Color,
  flex: number,
): void {
  const across = new THREE.Vector3().crossVectors(facing, along).normalize();
  const first = b.positions.length / 3;
  const hub = b.vertex(at, facing, colour, 0.5, 0, flex * 0.6, 1);
  for (let r = 1; r <= rings; r++) {
    const f = r / rings;
    for (let s = 0; s <= spokes; s++) {
      const a = (s / spokes - 0.5) * sweep;
      // the pleat: ridges and valleys alternate round the fan, deeper toward its edge
      const pleat = (s % 2 ? 1 : -1) * 0.07 * radius * f;
      // bent down along its length: the far edge falls by `droop`, more toward the tip
      const bend = droop * f * f;
      const dir = along.clone().multiplyScalar(Math.cos(a)).addScaledVector(across, Math.sin(a));
      const out = dir
        .clone()
        .multiplyScalar(Math.cos(bend))
        .addScaledVector(facing, -Math.sin(bend) * Math.cos(a * 0.5));
      const p = at
        .clone()
        .addScaledVector(out, radius * f)
        .addScaledVector(facing, pleat);
      const n = facing
        .clone()
        .addScaledVector(dir, 0.35 * f)
        .normalize();
      b.vertex(p, n, colour, s / spokes, f, flex * (0.6 + 0.4 * f), 1);
    }
  }
  const row = spokes + 1;
  for (let s = 0; s < spokes; s++) b.tri(hub, first + 1 + s, first + 2 + s);
  for (let r = 1; r < rings; r++)
    for (let s = 0; s < spokes; s++) {
      const a = first + 1 + (r - 1) * row + s,
        c = first + 1 + r * row + s;
      b.quad(a, a + 1, c, c + 1);
    }
}

/** Saw palmetto and its kind: fans on stalks from a few crowns at the ground, the old ones lower and brown. */
function buildFan(form: Extract<Form, { kind: 'fan' }>, seed: number, near: boolean): THREE.BufferGeometry {
  const r = sequence(seed);
  const b = new Builder();
  const green = new THREE.Color(1, 1, 1);
  const brown = new THREE.Color(3.4, 2.3, 2.6); // a tint that turns the instance's green to a dead frond's grey-brown
  const stem = new THREE.Color(0.9, 0.75, 0.5);
  const crowns = 1 + Math.floor(r() * 3);
  const fans = Math.round((form.fans[0] + r() * (form.fans[1] - form.fans[0])) * (near ? 1 : 0.6));
  for (let i = 0; i < fans; i++) {
    const crown = i % crowns;
    const ca = (crown / crowns) * Math.PI * 2 + seed;
    const base = new THREE.Vector3(Math.cos(ca) * 0.22 * (crowns > 1 ? 1 : 0), 0.02, Math.sin(ca) * 0.22 * (crowns > 1 ? 1 : 0));
    const yaw = r() * Math.PI * 2;
    const dead = r() < form.dead;
    // young fans stand up in the middle; old ones lean out and down
    const lean = dead ? 0.95 + r() * 0.5 : 0.15 + r() * 0.75;
    const length = (form.stalk[0] + r() * (form.stalk[1] - form.stalk[0])) * (dead ? 0.85 : 1);
    const out = new THREE.Vector3(Math.cos(yaw) * Math.sin(lean), Math.cos(lean), Math.sin(yaw) * Math.sin(lean));
    const top = base.clone().addScaledVector(out, length);
    top.y = Math.max(top.y, 0.08);
    const colour = dead ? brown.clone().multiplyScalar(0.8 + r() * 0.4) : green.clone().multiplyScalar(0.8 + r() * 0.45);
    if (near) b.stick(base, top, 0.012, 0.008, stem, 0, 0.5, 3);
    // the fan faces up and away from the plant's middle, tilted over more the further it leans
    const facing = new THREE.Vector3(Math.cos(yaw) * Math.sin(lean * 0.9), Math.cos(lean * 0.9), Math.sin(yaw) * Math.sin(lean * 0.9));
    facing.lerp(new THREE.Vector3(0, 1, 0), 0.25).normalize();
    const along = out.clone().addScaledVector(facing, -out.dot(facing)).normalize();
    if (along.lengthSq() < 0.5) along.set(Math.cos(yaw), 0, Math.sin(yaw));
    const radius = form.blade[0] + r() * (form.blade[1] - form.blade[0]);
    fan(b, top, facing, along, radius, 4.6 + r() * 0.8, dead ? 0.9 : 0.25 + r() * 0.3, near ? 12 : 6, near ? 3 : 1, colour, 1);
  }
  return b.geometry();
}

/** A woody shrub: crooked stems from the root to a few leafy masses, each a cluster of sprig cards. */
function buildShrub(form: Extract<Form, { kind: 'shrub' }>, seed: number, near: boolean): THREE.BufferGeometry {
  const r = sequence(seed);
  const b = new Builder();
  const bark = new THREE.Color(0.55, 0.5, 0.45);
  const masses = Math.round((form.masses[0] + r() * (form.masses[1] - form.masses[0])) * (near ? 1 : 0.6));
  // masses on a dome: the plant is 1 m tall and `spread` wide before the instance scales it
  const centres: { c: THREE.Vector3; s: number; shade: number }[] = [];
  for (let i = 0; i < masses; i++) {
    const a = (i / masses) * Math.PI * 2 * 1.618 * 3 + r();
    const out = Math.sqrt((i + 0.5) / masses) * 0.5 * form.spread;
    // a dome of leaf from near the ground up: scrub is leafy to its foot, not a tree on stems
    const y = 0.2 + 0.68 * (1 - (out / (0.5 * form.spread)) ** 2) * (0.55 + 0.45 * ((i * 0.618) % 1)) + (r() - 0.5) * 0.12;
    const s = (0.24 + r() * 0.14) * Math.max(0.8, form.spread * 0.7);
    centres.push({ c: new THREE.Vector3(Math.cos(a) * out, y, Math.sin(a) * out), s, shade: 0.8 + r() * 0.4 });
  }
  const middle = new THREE.Vector3(0, 0.55, 0);
  if (near)
    for (const { c } of centres) {
      // a stem: from near the root, kinked once, into the mass
      const root = new THREE.Vector3((r() - 0.5) * 0.15, 0, (r() - 0.5) * 0.15);
      const kink = root
        .clone()
        .lerp(c, 0.5)
        .add(new THREE.Vector3((r() - 0.5) * 0.15, (r() - 0.5) * 0.1, (r() - 0.5) * 0.15));
      b.stick(root, kink, 0.014, 0.01, bark, 0, 0.3, 4);
      b.stick(kink, c, 0.01, 0.005, bark, 0.3, 0.7, 3);
    }
  const card = 0.34;
  for (const { c, s, shade } of centres) {
    const cards = near ? Math.round(18 * (s / 0.3) ** 2) : 0;
    if (!near) {
      // far, and for its shadow: the mass as a low-poly lump, crumpled, its leaves drawn on it by the shader
      const lump = new THREE.IcosahedronGeometry((s + card * 0.5) * 1.05, 0); // as far out as the near form's cards reach
      const pos = lump.getAttribute('position');
      const first = b.positions.length / 3;
      const p = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i);
        const n = p.clone().normalize();
        p.multiplyScalar(0.72 + 0.5 * hash2(Math.round(p.x * 97), Math.round(p.z * 89 + p.y * 53), seed));
        const outward = c.clone().sub(middle).normalize();
        const normal = n.clone().lerp(outward, 0.3).normalize();
        b.vertex(p.add(c), normal, new THREE.Color(shade, shade, shade), 0, 0, 0.8, 4);
      }
      const idx = lump.index ? lump.index.array : Array.from({ length: pos.count }, (_, i) => i);
      for (let i = 0; i < idx.length; i += 3) b.tri(first + idx[i]!, first + idx[i + 1]!, first + idx[i + 2]!);
      continue;
    }
    for (let k = 0; k < cards; k++) {
      // a card on the mass's surface, facing out, turned any way about its normal
      const u = r() * 2 - 1,
        t = r() * Math.PI * 2;
      const n = new THREE.Vector3(
        Math.sqrt(1 - u * u) * Math.cos(t),
        Math.abs(u) * 0.6 + u * 0.4,
        Math.sqrt(1 - u * u) * Math.sin(t),
      ).normalize();
      const at = c.clone().addScaledVector(n, s * (0.55 + r() * 0.45));
      const tangent = new THREE.Vector3(-n.z, 0, n.x);
      if (tangent.lengthSq() < 1e-4) tangent.set(1, 0, 0);
      tangent.normalize().applyAxisAngle(n, r() * Math.PI * 2);
      // the sprig points out of the mass, so its base is inside and its leaves at the surface
      const up = tangent.clone().lerp(n, 0.5).normalize();
      const side = new THREE.Vector3().crossVectors(up, n).normalize();
      const face = new THREE.Vector3().crossVectors(side, up).normalize();
      // its normal leans toward the plant's outside: the shrub is lit as one body, not as a heap of cards
      const normal = n.clone().lerp(at.clone().sub(middle).normalize(), 0.5).normalize();
      const tone = new THREE.Color(1, 1, 1).multiplyScalar(shade * (0.8 + 0.4 * r()) * (0.75 + 0.35 * Math.max(0, n.y)));
      const base = at.clone().addScaledVector(up, -card * 0.45);
      const corners = [
        [-0.5, 0],
        [0.5, 0],
        [-0.5, 1],
        [0.5, 1],
      ].map(([x, y]) =>
        b.vertex(
          base
            .clone()
            .addScaledVector(side, x! * card)
            .addScaledVector(up, y! * card)
            .addScaledVector(face, y! * y! * 0.05),
          normal,
          tone,
          x! + 0.5,
          y!,
          0.7 + 0.3 * y!,
          2,
        ),
      );
      b.quad(corners[0]!, corners[1]!, corners[2]!, corners[3]!);
    }
  }
  return b.geometry();
}

/** A cabbage palm: a trunk with old leaf bases on its lower part, a round crown of drooping fans, a skirt of dead ones. */
function buildPalm(form: Extract<Form, { kind: 'palm' }>, seed: number, near: boolean): THREE.BufferGeometry {
  const r = sequence(seed);
  const b = new Builder();
  // the instance scales the whole palm by its height: build it 1 tall
  const lean = new THREE.Vector3((r() - 0.5) * 0.12, 1, (r() - 0.5) * 0.12).normalize();
  const crownAt = lean.clone().multiplyScalar(0.86);
  const width = form.trunk[0] + r() * (form.trunk[1] - form.trunk[0]);
  const trunk = new THREE.Color(0.85, 0.82, 0.76);
  const boots = new THREE.Color(1.15, 0.95, 0.7);
  const rings = near ? 6 : 1;
  for (let i = 0; i < rings; i++) {
    const a = crownAt.clone().multiplyScalar(i / rings),
      c = crownAt.clone().multiplyScalar((i + 1) / rings);
    // a slight swelling at the foot; the leaf bases (boots) make the upper trunk rougher and browner
    const ra = width * (i === 0 ? 1.25 : 1),
      rc = width;
    b.stick(a, c, ra, rc, i >= rings - 2 ? boots : trunk, (i / rings) ** 2 * 0.3, ((i + 1) / rings) ** 2 * 0.3, near ? 7 : 4);
  }
  const fronds = near ? form.fronds : Math.round(form.fronds * 0.45);
  const green = new THREE.Color(1, 1, 1);
  const brown = new THREE.Color(3.2, 2.3, 2.4);
  for (let i = 0; i < fronds; i++) {
    const dead = i >= fronds - Math.round(form.dead * (near ? 1 : 0.6));
    // spread round the crown on a golden angle; live ones rise and arch over, dead ones hang
    const yaw = i * 2.39996 + r() * 0.3;
    const rise = dead ? -1.2 + r() * 0.3 : -0.1 + ((i * 7) % fronds) / fronds + (r() - 0.5) * 0.2;
    const out = new THREE.Vector3(Math.cos(yaw) * Math.cos(rise), Math.sin(rise), Math.sin(yaw) * Math.cos(rise));
    const stalk = (dead ? 0.08 : 0.1 + r() * 0.05) * 1;
    const top = crownAt.clone().addScaledVector(out, stalk);
    if (near) b.stick(crownAt, top, 0.008, 0.006, dead ? brown : trunk, 0.5, 0.8, 3);
    const facing = new THREE.Vector3(0, 1, 0)
      .addScaledVector(out, -out.y)
      .normalize()
      .lerp(new THREE.Vector3(0, 1, 0), 0.6)
      .normalize();
    const along = out.clone().addScaledVector(facing, -out.dot(facing)).normalize();
    fan(
      b,
      top,
      facing,
      along,
      form.blade * (0.8 + r() * 0.35),
      2.6 + r() * 0.7,
      dead ? 0.4 : 0.6 + r() * 0.5,
      near ? 10 : 4,
      near ? 3 : 1,
      dead ? brown.clone().multiplyScalar(0.8 + r() * 0.3) : green.clone().multiplyScalar(0.85 + r() * 0.3),
      1,
    );
  }
  return b.geometry();
}

/** A bunch of grass: blades from a tight base, arching out; a few with seed heads on bare stems. */
function buildTuft(form: Extract<Form, { kind: 'tuft' }>, seed: number): THREE.BufferGeometry {
  const r = sequence(seed);
  const b = new Builder();
  const blades = Math.round(form.blades[0] + r() * (form.blades[1] - form.blades[0]));
  for (let i = 0; i < blades; i++) {
    const yaw = r() * Math.PI * 2;
    const lean = (0.15 + r() * 0.6) * form.lean;
    const h = 0.55 + r() * 0.45;
    const root = new THREE.Vector3(Math.cos(yaw) * 0.03 * r(), 0, Math.sin(yaw) * 0.03 * r());
    const dir = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const width = 0.02 + r() * 0.012; // the instance scales a tuft by its height: a blade a few millimetres wide on a hand-high tuft
    // three points along a blade that leans out more as it rises
    const pts = [0, 0.5, 1].map((t) =>
      root
        .clone()
        .addScaledVector(dir, Math.sin(lean * t * 1.6) * h * t * 0.9)
        .setY(h * t * Math.cos(lean * t)),
    );
    const normal = new THREE.Vector3(0, 1, 0).lerp(dir, 0.5).normalize();
    // base greener and darker, tip cured to straw: the instance's colour does the rest
    const base = new THREE.Color(0.55, 0.7, 0.45),
      tip = new THREE.Color(1.2, 1.1, 0.95);
    const v0 = b.vertex(pts[0]!.clone().addScaledVector(side, -width), normal, base, 0, 0, 0, 3);
    const v1 = b.vertex(pts[0]!.clone().addScaledVector(side, width), normal, base, 1, 0, 0, 3);
    const v2 = b.vertex(pts[1]!.clone().addScaledVector(side, -width * 0.8), normal, base.clone().lerp(tip, 0.6), 0, 0.5, 0.3, 3);
    const v3 = b.vertex(pts[1]!.clone().addScaledVector(side, width * 0.8), normal, base.clone().lerp(tip, 0.6), 1, 0.5, 0.3, 3);
    const v4 = b.vertex(pts[2]!, normal, tip, 0.5, 1, 1, 3);
    b.quad(v0, v1, v2, v3);
    b.tri(v2, v3, v4);
  }
  for (let i = 0; i < form.heads; i++) {
    // a seed stalk: taller than the leaves, nearly straight; at its top a loose spray of fine branches, nodding
    const yaw = r() * Math.PI * 2;
    const tip = new THREE.Vector3(Math.cos(yaw) * 0.12, 1.2 + r() * 0.4, Math.sin(yaw) * 0.12);
    const straw = new THREE.Color(1.35, 1.2, 0.95);
    b.stick(new THREE.Vector3(), tip, 0.006, 0.004, straw, 0, 1, 3);
    for (let k = 0; k < 5; k++) {
      const a = yaw + (r() - 0.5) * 1.6;
      const from = tip.clone().add(new THREE.Vector3(0, -0.04 * k, 0));
      const to = from
        .clone()
        .add(new THREE.Vector3(Math.cos(a) * (0.05 + r() * 0.06), -0.1 - r() * 0.12, Math.sin(a) * (0.05 + r() * 0.06)));
      b.stick(from, to, 0.005, 0.002, straw.clone().multiplyScalar(0.85 + r() * 0.3), 1, 1, 3);
    }
  }
  return b.geometry();
}

function build(species: Species, seed: number, form: 'near' | 'far' | 'cast'): THREE.BufferGeometry {
  const f = species.form;
  const near = form === 'near';
  if (f.kind === 'fan') return buildFan(f, seed, near);
  if (f.kind === 'shrub') return buildShrub(f, seed, near);
  if (f.kind === 'palm') return buildPalm(f, seed, near);
  return buildTuft(f, seed);
}

// ----------------------------------------------------------------------------------------------
// The material: lit as one body, outlines from the shape, fading by dither, moving in the wind.

/** Per material: the leaf shape and the breeze. Shared: time, eye and wind. */
interface Shared {
  time: { value: number };
  eye: { value: THREE.Vector3 };
  wind: { value: THREE.Vector3 };
}

const PLANT_VERTEX = /* glsl */ `
  attribute float aFlex;
  attribute float aShape;
  attribute vec4 aBand;          // in from, in to, out from, out to: metres from the eye
  uniform vec3 uEye;             // the eye in the plants' frame
  uniform vec3 uWind;            // which way, and how hard (its length)
  uniform float uTime;
  uniform float uSway;
  varying vec2 vCard;
  varying float vShape;
  varying float vFade;
  varying vec3 vPlant;           // the point in the plants' frame, for grain
`;

const PLANT_SWAY = /* glsl */ `
  vec3 plantRoot = vec3(instanceMatrix[3]);
  float plantFar = distance(uEye, plantRoot);
  // a band's end given negative is a reach: there the plant shrinks away to its root rather than dissolving, so it
  // never hangs in the distance as a ghost, and a thicket's plants sink into the land's canopy as it rises
  float plantIn = smoothstep(aBand.x, aBand.y, plantFar);
  float plantOut = 1.0 - smoothstep(abs(aBand.z), abs(aBand.w), plantFar);
  vFade = aBand.w < 0.0 ? plantIn : plantIn * plantOut;
  float plantSize = aBand.w < 0.0 ? plantOut : 1.0;
  vCard = uv;
  vShape = aShape;
  // the breeze: a slow lean and a quicker flutter, out of step plant to plant; none at the root
  float phase = dot(plantRoot.xz, vec2(0.37, 0.23));
  float gust = 0.6 + 0.4 * sin(uTime * 0.7 + phase * 0.3);
  float flutter = sin(uTime * 2.9 + phase + position.y * 3.0) * 0.35 + sin(uTime * 4.7 + phase * 1.7) * 0.15;
  vec3 sway = (uWind * (gust + flutter) + vec3(0.0, -0.25 * length(uWind) * flutter, 0.0)) * uSway * aFlex * aFlex * (1.0 - smoothstep(25.0, 60.0, plantFar));
`;

const PLANT_FRAGMENT = /* glsl */ `
  uniform vec4 uLeaf;            // a sprig: leaves, their length and width on the card, their angle off the twig
  uniform float uSegments;       // a fan's segments across its sweep
  varying vec2 vCard;
  varying float vShape;
  varying float vFade;
  varying vec3 vPlant;
  ${NOISE}
  // the outline on a card: 1 inside, 0 out, softened over a pixel
  float plantOutline(out float tint) {
    tint = 1.0;
    if (vShape < 0.5) return 1.0;
    if (vShape > 3.5) {
      // a mass of leaves seen from further off: solid in the middle, broken into leaf clusters toward its outline
      #if defined(PLANT_RIM) && defined(PLANT_CEL)
        // drawn: a mass with a scalloped edge of big leaf clusters, one flat tone
        float n = noise(vPlant * 4.0);
        float rim = 1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition)));
        return step(rim * rim * 1.1, n);
      #elif defined(PLANT_RIM)
        float n = noise(vPlant * 9.0) * 0.6 + noise(vPlant * 23.0) * 0.4;
        tint = 0.55 + 0.75 * n;
        float rim = 1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition)));
        return step(rim * rim * 0.95, n);
      #else
        return 1.0;   // its shadow is the mass, whole: a shadow map at a few millimetres a texel cannot afford a fragment's noise
      #endif
    }
    if (vShape < 1.5) {
      // a fan: whole to halfway out, then split into segments that taper to points
      float s = fract(vCard.x * uSegments);
      float half_ = mix(0.5, 0.05, smoothstep(0.42, 1.0, vCard.y));
      float d = half_ - abs(s - 0.5);
      tint = 0.85 + 0.3 * fract(floor(vCard.x * uSegments) * 0.618);
      // once a segment is under a couple of pixels its outline only aliases: the fan is then as much of a veil as it is leaf
      float sharp = 1.0 - smoothstep(0.25, 0.6, fwidth(vCard.x * uSegments));
      return mix(2.0 * half_, clamp(d / max(fwidth(s), 1e-4) + 0.5, 0.0, 1.0), sharp);
    }
    if (vShape < 2.5) {
      // a sprig: a twig up the card with leaves either side, alternately, pointing up. A leaf is never drawn thinner
      // than a pixel and a half (it swells as it shrinks on screen), so far off it covers what it covers and does not
      // break up into a speckle or a translucent veil
      vec2 c = vCard;
      float px = length(fwidth(c));
      float twig = 0.5 + 0.06 * sin(c.y * 4.0);
      float cover = (1.0 - smoothstep(0.008 + px, 0.016 + px, abs(c.x - twig))) * step(c.y, 0.92);
      float n = uLeaf.x;
      float swell = max(0.0, 1.5 * px - uLeaf.z * 0.5);
      for (int k = 0; k < 9; k++) {
        if (float(k) >= n) break;
        float t = 0.1 + 0.85 * (float(k) + 0.5) / n;
        float side = mod(float(k), 2.0) * 2.0 - 1.0;
        float a = uLeaf.w * side;
        vec2 axis = vec2(sin(a), cos(a));
        vec2 centre = vec2(0.5 + 0.06 * sin(t * 4.0), t) + axis * uLeaf.y * 0.5;
        vec2 q = c - centre;
        float along = dot(q, axis) / (uLeaf.y * 0.5 + swell);
        float across = (q.x * axis.y - q.y * axis.x) / (uLeaf.z * 0.5 + swell);
        // a leaf: widest a little below its middle, pointed
        float w = sqrt(max(0.0, 1.0 - along * along)) * (1.0 - 0.25 * along);
        float leaf = clamp((w - abs(across)) * (uLeaf.z * 0.5 + swell) / max(px, 1e-4) + 0.5, 0.0, 1.0) * step(abs(along), 1.0);
        if (leaf > 0.5) tint = 0.8 + 0.4 * fract(float(k) * 0.618 + vPlant.x * 3.1);
        cover = max(cover, leaf);
      }
      return cover;
    }
    // a blade: narrowing to its tip
    float d = (0.5 - abs(vCard.x - 0.5)) - 0.5 * vCard.y * vCard.y;
    return clamp(d / max(fwidth(vCard.x), 1e-4) + 0.5, 0.0, 1.0);
  }
  // a threshold for each pixel, with no pattern to it: where a plant is half faded, half its pixels are drawn
  float plantDither() {
    vec2 q = fract(gl_FragCoord.xy * vec2(0.1031, 0.1030));
    q += dot(q, q.yx + 33.33);
    return fract((q.x + q.y) * q.x);
  }
`;

/**
 * A species' material: `drawn` for the view; `depth` for a shadow, outline and fade as drawn; `cast` for the far form
 * casting near the eye, which is never faded and, being a mass of leaf, needs no outline: a shader without `discard`,
 * which the GPU can rasterise as fast as it likes.
 */
function plantMaterial(species: Species, shared: Shared, use: 'drawn' | 'depth' | 'cast'): THREE.Material {
  const depth = use !== 'drawn';
  const form = species.form;
  const leaf = form.kind === 'shrub' ? new THREE.Vector4(...form.leaf) : new THREE.Vector4(6, 0.2, 0.08, 0.7);
  const segments = form.kind === 'fan' ? form.segments : form.kind === 'palm' ? 22 : 1;
  const uniforms = {
    uEye: shared.eye,
    uWind: shared.wind,
    uTime: shared.time,
    uSway: { value: species.sway },
    uLeaf: { value: leaf },
    uSegments: { value: segments },
  };
  const material = depth
    ? new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking })
    : new THREE.MeshStandardMaterial({
        name: `plant-${species.name}`,
        vertexColors: true,
        roughness: species.rough,
        metalness: 0,
        envMapIntensity: 0.4,
        side: THREE.DoubleSide,
        alphaToCoverage: true,
      });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    // the cel look's twin (look.ts) runs this same patch on a toon shader: a drawn plant is flat colour with a shaped edge
    const cel = (shader as unknown as { shaderType: string }).shaderType === 'MeshToonMaterial';
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${PLANT_VERTEX}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${PLANT_SWAY}\ntransformed *= plantSize;`)
      .replace(
        '#include <project_vertex>',
        /* glsl */ `#include <project_vertex>
        mvPosition.xyz += mat3(viewMatrix) * mat3(modelMatrix) * sway;
        gl_Position = projectionMatrix * mvPosition;
        vPlant = plantRoot + transformed;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <clipping_planes_pars_fragment>',
        `#include <clipping_planes_pars_fragment>\n${depth ? '' : '#define PLANT_RIM'}\n${cel ? '#define PLANT_CEL' : ''}\n${PLANT_FRAGMENT}`,
      )
      .replace(
        depth ? '#include <clipping_planes_fragment>' : '#include <alphatest_fragment>',
        /* glsl */ `${depth ? '#include <clipping_planes_fragment>' : '#include <alphatest_fragment>'}
        float plantTint;
        float plantCover = plantOutline(plantTint);
        ${
          use === 'cast'
            ? form.kind === 'shrub'
              ? ''
              : 'if (plantCover < 0.5) discard;'
            : depth
              ? 'if (plantCover < 0.5 || plantDither() >= vFade) discard;'
              : // drawn: the outline's soft edge is coverage (smooth leaf edges); the fade is a screen door of unordered holes
                'if (plantCover < 0.02 || plantDither() >= vFade) discard;\n diffuseColor.a = plantCover;\n diffuseColor.rgb *= plantTint;'
        }`,
      );
    if (!depth)
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_begin>',
        // lit as the plant's outside, from either face: a leaf seen from behind is still the shrub's surface
        /* glsl */ `#include <normal_fragment_begin>
        normal = normalize(vNormal);
        // a leaf whose borrowed normal faces away from the eye would be lit at a grazing angle and mirror the sky:
        // turn it just far enough toward the eye that it is lit as foliage, not as glass
        {
          vec3 toEye = normalize(vViewPosition);
          float facing = dot(normal, toEye);
          if (facing < 0.2) normal = normalize(normal + toEye * (0.2 - facing));
        }
        #ifndef PLANT_CEL
        if (vShape > 3.5) normal = normalize(normal + 0.9 * vec3(noise(vPlant * 7.0 + 1.0) - 0.5, noise(vPlant * 7.0 + 2.0) - 0.5, noise(vPlant * 7.0 + 3.0) - 0.5));
        #endif`,
      );
  };
  material.customProgramCacheKey = () => `plant:${use}:${use === 'cast' && form.kind === 'shrub'}`;
  return material;
}

// ----------------------------------------------------------------------------------------------
// Placement: a tile at a time, by the cover map, the same every time.

type Layer = Species['layer'];
/** Each layer's tiles: so many of its places along a side. Trees are few and seen from far, grass many and only near. */
const TILE_PLACES: Record<Layer, number> = { herb: 20, woody: 14, tree: 8 };

interface Plant {
  /** Species index, variant. */
  species: number;
  variant: number;
  x: number;
  y: number;
  z: number;
  matrix: Float32Array;
  colour: [number, number, number];
  /** Standing in a thicket: it gives way to the land's canopy. */
  thicket: boolean;
}

/** Each species' meshes, near and far, per variant. */
interface Drawn {
  species: Species;
  near: THREE.InstancedMesh[];
  far: THREE.InstancedMesh[];
  /** The plants near enough to cast a shadow the map can hold, in their far form: drawn into the shadow map only. */
  shadow: THREE.InstancedMesh[];
}

const CAPACITY = { near: 6000, far: 12000 };

export class Flora {
  readonly group = new THREE.Group();
  private readonly spec: FloraSpec;
  private readonly ground: Ground;
  private readonly shared: Shared;
  private readonly drawn: Drawn[] = [];
  private readonly tiles = new Map<string, Plant[]>();
  private readonly sorted = new THREE.Vector3(1e9, 0, 1e9);
  private drawnLook = false;
  /** How far each layer's plants are drawn, metres. */
  private readonly reach: Record<Layer, number> = { herb: 0, woody: 0, tree: 0 };

  constructor(spec: FloraSpec, ground: Ground) {
    this.spec = spec;
    this.ground = ground;
    const w = spec.wind;
    this.shared = {
      time: { value: 0 },
      eye: { value: new THREE.Vector3() },
      wind: { value: new THREE.Vector3(Math.sin(w.toward), 0, -Math.cos(w.toward)).multiplyScalar(0.05 * w.strength) },
    };
    this.group.userData.flora = this; // for the debug handle
    for (const s of spec.species) this.reach[s.layer] = Math.max(this.reach[s.layer], s.reach);
    // what a shadow caster is drawn with in the view: nothing (every vertex put outside the frame), in either look
    const hidden = new THREE.MeshBasicMaterial({ name: 'plant-shadow', colorWrite: false, depthWrite: false });
    hidden.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace(
        '#include <fog_vertex>',
        '#include <fog_vertex>\ngl_Position = vec4(2.0, 2.0, 2.0, 1.0);',
      );
    };
    hidden.customProgramCacheKey = () => 'plant-shadow';
    spec.species.forEach((species, index) => {
      const material = plantMaterial(species, this.shared, 'drawn');
      const depth = plantMaterial(species, this.shared, 'depth');
      const cast = plantMaterial(species, this.shared, 'cast');
      // Shadows are cast by each plant's far form, and only within SHADOWED of the eye: the shadow map covers the
      // ground round the walker or the model (stage.ts) at a few millimetres a texel, and a thicket's leaf cards
      // drawn into it fragment by fragment cost more than the whole frame. A grass tuft casts its own.
      const mesh = (geometry: THREE.BufferGeometry, capacity: number, use: 'drawn' | 'cast' | 'both') => {
        geometry.setAttribute('aBand', new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4));
        const m = new THREE.InstancedMesh(geometry, use === 'cast' ? hidden : material, capacity);
        m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
        m.count = 0;
        m.visible = false;
        m.frustumCulled = false;
        m.castShadow = use !== 'drawn';
        m.receiveShadow = use !== 'cast';
        m.customDepthMaterial = use === 'cast' ? cast : depth;
        m.raycast = () => {}; // plants are not solid and not picked
        onlyAsItself(m);
        this.group.add(m);
        return m;
      };
      const near: THREE.InstancedMesh[] = [],
        far: THREE.InstancedMesh[] = [],
        shadow: THREE.InstancedMesh[] = [];
      const tuft = species.form.kind === 'tuft';
      for (let v = 0; v < VARIANTS; v++) {
        const seed = 1000 * (index + 1) + 17 * v;
        near.push(mesh(build(species, seed, 'near'), CAPACITY.near, tuft ? 'both' : 'drawn'));
        if (tuft) continue;
        far.push(mesh(build(species, seed, 'far'), CAPACITY.far, 'drawn'));
        shadow.push(mesh(build(species, seed, 'cast'), CAPACITY.near, 'cast'));
      }
      this.drawn.push({ species, near, far, shadow });
    });
  }

  tick(dt: number): void {
    this.shared.time.value += dt;
  }

  /** The cel look: the same plants, drawn (the toon twin of each material flattens their light: see plantMaterial); fewer grass tufts. */
  simplify(on: boolean): void {
    this.drawnLook = on;
    this.arrange(this.sorted.x, this.sorted.y, this.sorted.z);
  }

  /** The eye, in the plants' frame. True if what is drawn changed. */
  attend(eye: THREE.Vector3): boolean {
    this.shared.eye.value.copy(eye);
    if (Math.hypot(eye.x - this.sorted.x, eye.z - this.sorted.z) < RESORT && Math.abs(eye.y - this.sorted.y) < RESORT) return false;
    this.arrange(eye.x, eye.y, eye.z);
    return true;
  }

  /** The plants of one layer on one tile, made the first time they are wanted. */
  private tile(layer: Layer, i: number, j: number): Plant[] {
    const key = `${layer} ${i} ${j}`;
    let plants = this.tiles.get(key);
    if (plants) return plants;
    plants = [];
    const cover = new Float32Array(4);
    const spec = this.spec;
    const m = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      s = new THREE.Vector3(),
      p = new THREE.Vector3(),
      up = new THREE.Vector3(0, 1, 0);
    const step = spec.spacing[layer];
    const n = TILE_PLACES[layer];
    const kinds = spec.species.map((sp, k) => [sp, k] as const).filter(([sp]) => sp.layer === layer);
    const seed = layer === 'woody' ? 11 : layer === 'herb' ? 23 : 37;
    for (let a = 0; a < n; a++)
      for (let b = 0; b < n; b++) {
        const gx = i * n + a,
          gz = j * n + b;
        const x = (gx + 0.1 + 0.8 * hash2(gx, gz, seed)) * step;
        const z = (gz + 0.1 + 0.8 * hash2(gx, gz, seed + 1)) * step;
        if (!this.ground.coverAt(x, z, cover)) continue;
        const woody = cover[0]!,
          herb = cover[1]!,
          zone = cover[3]!;
        const amount = layer === 'herb' ? herb : woody;
        // which species, by how common each is in this zone; the sum says how likely anything is here at all
        let total = 0;
        const weights = kinds.map(([sp]) => {
          const w = along(sp.abundance, zone);
          total += w;
          return w;
        });
        // grass grows in clumps a stride or two across, not evenly: where the clumps are, the cover is denser
        const clumps = layer === 'herb' ? 0.25 + 1.5 * noise2(x * 0.55, z * 0.55, 61) ** 2 : 1;
        if (layer === 'tree' ? hash2(gx, gz, seed + 2) >= total * amount : hash2(gx, gz, seed + 2) >= amount ** 1.3 * clumps || total <= 0)
          continue;
        let pick = hash2(gx, gz, seed + 3) * total;
        let at = 0;
        while (at < weights.length - 1 && pick >= weights[at]!) pick -= weights[at++]!;
        const [species, index] = kinds[at]!;
        const r = hash2(gx, gz, seed + 4);
        const height = (species.height[0] + (species.height[1] - species.height[0]) * r) * (layer === 'tree' ? 1 : spec.stature(zone));
        // thinner cover, smaller plants: the edge of a thicket is its young growth
        const scale =
          height * (layer === 'woody' ? 0.6 + 0.4 * Math.min(1, woody / THICKET) : layer === 'herb' ? 0.55 + 0.6 * Math.min(1, clumps) : 1);
        const y = this.ground.heightAt(x, z);
        q.setFromAxisAngle(up, hash2(gx, gz, seed + 5) * Math.PI * 2);
        const wide = species.form.kind === 'shrub' ? 1.1 + 0.4 * hash2(gx, gz, seed + 6) : 1;
        s.set(scale * wide, scale, scale * wide * (0.85 + 0.3 * hash2(gx, gz, seed + 7)));
        m.compose(p.set(x, y - 0.02 * scale, z), q, s);
        const c = species.colours[0].clone().lerp(species.colours[1], hash2(gx, gz, seed + 8));
        plants.push({
          species: index,
          variant: Math.floor(hash2(gx, gz, seed + 9) * VARIANTS),
          x,
          y,
          z,
          matrix: new Float32Array(m.elements),
          colour: [c.r, c.g, c.b],
          thicket: layer === 'woody' && woody >= THICKET,
        });
      }
    this.tiles.set(key, plants);
    return plants;
  }

  /**
   * Sort the plants round an eye into near and far forms. Each goes into every list whose band
   * it could enter before the next sort (the eye moves RESORT metres first), and the shader
   * fades it in and out within those bands by its distance as it is drawn.
   */
  private arrange(ex: number, ey: number, ez: number): void {
    this.sorted.set(ex, ey, ez);
    const lists = this.drawn.map((d) => ({ near: d.near.map(() => 0), far: d.far.map(() => 0), shadow: d.shadow.map(() => 0) }));
    const put = (mesh: THREE.InstancedMesh, at: number, plant: Plant, band: [number, number, number, number]) => {
      (mesh.instanceMatrix.array as Float32Array).set(plant.matrix, at * 16);
      (mesh.instanceColor!.array as Float32Array).set(plant.colour, at * 3);
      ((mesh.geometry.getAttribute('aBand') as THREE.InstancedBufferAttribute).array as Float32Array).set(band, at * 4);
    };
    for (const layer of ['woody', 'herb', 'tree'] as const) {
      const reach = this.reach[layer] + RESORT;
      if (reach <= RESORT) continue;
      const side = TILE_PLACES[layer] * this.spec.spacing[layer];
      const i0 = Math.floor((ex - reach) / side),
        i1 = Math.floor((ex + reach) / side),
        j0 = Math.floor((ez - reach) / side),
        j1 = Math.floor((ez + reach) / side);
      for (let i = i0; i <= i1; i++)
        for (let j = j0; j <= j1; j++) {
          // a tile wholly out of reach is not even made
          const dx = Math.max(i * side - ex, 0, ex - (i + 1) * side),
            dz = Math.max(j * side - ez, 0, ez - (j + 1) * side);
          if (Math.hypot(dx, dz) > reach) continue;
          for (const plant of this.tile(layer, i, j)) {
            const d = Math.hypot(plant.x - ex, plant.y - ey, plant.z - ez);
            const drawn = this.drawn[plant.species]!;
            const sp = drawn.species;
            const list = lists[plant.species]!;
            const v = plant.variant;
            if (sp.form.kind === 'tuft') {
              if (this.drawnLook && d > sp.near * 0.6) continue; // in a drawing only the nearest grass is drawn blade by blade
              if (d < sp.near + RESORT && list.near[v]! < CAPACITY.near)
                put(drawn.near[v]!, list.near[v]!++, plant, [-1, 0, -sp.near * 0.7, -sp.near]);
              continue;
            }
            const hand = sp.near - 3; // where the near form starts to give way to the far: a short crossing, so few plants are half drawn at once
            const end: [number, number] = plant.thicket ? UNDER : [sp.reach * 0.9, sp.reach];
            if (d < sp.near + RESORT && list.near[v]! < CAPACITY.near) put(drawn.near[v]!, list.near[v]!++, plant, [-1, 0, hand, sp.near]);
            if (d < SHADOWED + RESORT && list.shadow[v]! < CAPACITY.near)
              put(drawn.shadow[v]!, list.shadow[v]!++, plant, [-1, 0, 1e5, 1e5]);
            if (d > hand - RESORT && d < end[1] + RESORT && list.far[v]! < CAPACITY.far)
              put(drawn.far[v]!, list.far[v]!++, plant, [hand, sp.near, -end[0], -end[1]]);
          }
        }
    }
    this.drawn.forEach((d, k) => {
      for (const [meshes, counts] of [
        [d.near, lists[k]!.near],
        [d.far, lists[k]!.far],
        [d.shadow, lists[k]!.shadow],
      ] as const)
        meshes.forEach((mesh, v) => {
          const n = counts[v]!;
          if (n === 0 && mesh.count === 0) return;
          mesh.count = n;
          mesh.visible = n > 0;
          // send only what is used: a whole buffer is a megabyte, and there are dozens
          for (const [attribute, size] of [
            [mesh.instanceMatrix, 16],
            [mesh.instanceColor!, 3],
            [mesh.geometry.getAttribute('aBand') as THREE.InstancedBufferAttribute, 4],
          ] as const) {
            attribute.clearUpdateRanges();
            attribute.addUpdateRange(0, Math.max(1, n) * size);
            attribute.needsUpdate = true;
          }
        });
    });
    // forget tiles far behind, so a long walk does not keep the whole site in memory
    if (this.tiles.size > 6000)
      for (const key of this.tiles.keys()) {
        const [layer, i, j] = key.split(' ') as [Layer, string, string];
        const side = TILE_PLACES[layer] * this.spec.spacing[layer];
        if (Math.hypot((Number(i) + 0.5) * side - ex, (Number(j) + 0.5) * side - ez) > 2 * (this.reach[layer] + side))
          this.tiles.delete(key);
      }
  }
}

/**
 * A mesh placed by its own shader is drawn only with its own material (or its look's twin of it):
 * a pass that draws the whole scene with one material of its own (the outline's depth, overrideMaterial)
 * would put every instance where its raw matrix says, full size, and never faded.
 */
export function onlyAsItself(mesh: THREE.InstancedMesh | THREE.Mesh): void {
  let skipped: number | null = null;
  mesh.onBeforeRender = (_renderer, _scene, _camera, geometry, material) => {
    if (material === mesh.material) return;
    const instanced = mesh as THREE.InstancedMesh;
    if (instanced.isInstancedMesh) {
      skipped = instanced.count;
      instanced.count = 0;
    } else {
      skipped = (geometry as THREE.InstancedBufferGeometry).instanceCount;
      (geometry as THREE.InstancedBufferGeometry).instanceCount = 0;
    }
  };
  mesh.onAfterRender = (_renderer, _scene, _camera, geometry) => {
    if (skipped === null) return;
    const instanced = mesh as THREE.InstancedMesh;
    if (instanced.isInstancedMesh) instanced.count = skipped;
    else (geometry as THREE.InstancedBufferGeometry).instanceCount = skipped;
    skipped = null;
  };
}

/** A piecewise-linear curve through [x, y] points, read at x. */
function along(points: [number, number][], x: number): number {
  if (x <= points[0]![0]) return points[0]![1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i]!;
    if (x <= x1) {
      const [x0, y0] = points[i - 1]!;
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return points[points.length - 1]![1];
}
