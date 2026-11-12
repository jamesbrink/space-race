import * as THREE from 'three';
import { hash2, noise2, sequence } from './field';
import { due, type Kind, type Lists, type Placed, pack, sort, type Tile } from './plantsort';
import { NOISE } from './space';

/**
 * Plants as a community: what grows where the site's cover map says it does, species by species,
 * each in a few variants, at full detail near the eye and simpler further off, and gone into the
 * land's own canopy (land.ts) beyond. Nothing here knows which place it is: a site supplies a
 * `FloraSpec` (the species, how common each is along its zones, how tall) and a way to read its
 * cover and its ground's height.
 *
 * **Designed forms, not photographs** (AGENTS.md, Being there). A plant is a few clean shapes with
 * a strong silhouette, built so it reads at any distance: welded low-poly balls with the sphere's
 * normals (so the light, or the cel look's ramp, makes the tones and the polygon makes the outline),
 * flat fans and fronds. No leaf cards, no blades, nothing drawn thinner than it can be seen. The
 * real look gives the same forms lit shading, shadows and a gentle mottle from where each point is;
 * the cel look gives them flat tones and the ink line. Every species is built from one of:
 * - `shrub`: a few squashed masses heaped on a dome (scrub oak, wax myrtle, sea grape; sea oats as
 *   a low pale clump).
 * - `fan`: a palmetto: a low core and a cluster of flat fans with serrated edges, leaning out.
 * - `palm`: a tree palm: a tapering trunk, a ball of old leaf bases, a star of arched flat fronds.
 *
 * **Distance.** Each plant is drawn as its near form close to the eye (balls of 80 faces), its far
 * form further off (20 faces, fewer fans), and not at all beyond its reach; the near form gives way
 * over three metres by a screen door, and at the reach the plant shrinks to its root. A plant
 * standing in a closed thicket hands over to the land's canopy at 50 to 60 m; one standing alone
 * carries on to its full reach.
 *
 * **Wind.** Near plants lean and bob a little with a breeze from the site's quarter: a vertex
 * shift by how far a point is from the plant's root, at the rate the still view is redrawn.
 */

export type Form =
  | { kind: 'shrub'; masses: [number, number]; spread: number }
  | { kind: 'fan'; fans: [number, number]; blade: [number, number] }
  | { kind: 'palm'; trunk: [number, number]; fronds: number };

export interface Species {
  name: string;
  form: Form;
  /** The cover it grows in: shrubs in the woody cover, low clumps in the herb cover; trees are few and stand in the woody cover, placed on their own wider spacing. */
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

/**
 * A layer's plants are sorted into their forms again once the eye has gone this share of the
 * layer's shortest near band from where they were last sorted (and never less than RESORT_LEAST
 * metres): 12 m for shrubs and grass whose near forms end at 30 m, 36 m for trees whose near form
 * ends at 90 m. The lists carry every plant within that margin of a band (plantsort.ts), so what
 * is drawn does not depend on it; only how often the sorting is done.
 */
const RESORT_SHARE = 0.4;
const RESORT_LEAST = 5;
/** A plant in a thicket closer than this (woody cover) gives way to the land's canopy. */
const THICKET = 0.55;
/** Variants built of each species. */
const VARIANTS = 3;

// ----------------------------------------------------------------------------------------------
// Building the forms. Every vertex carries a colour (a tint on the instance's) and `aFlex` (how far
// it moves in the wind, 0 at the root).

class Builder {
  positions: number[] = [];
  normals: number[] = [];
  colours: number[] = [];
  flex: number[] = [];
  indices: number[] = [];
  vertex(p: THREE.Vector3, n: THREE.Vector3, c: THREE.Color, flex: number): number {
    this.positions.push(p.x, p.y, p.z);
    this.normals.push(n.x, n.y, n.z);
    this.colours.push(c.r, c.g, c.b);
    this.flex.push(flex);
    return this.positions.length / 3 - 1;
  }
  tri(a: number, b: number, c: number): void {
    this.indices.push(a, b, c);
  }
  /** A tapering shaft of `sides` sides from a to b, radius r0 to r1. */
  shaft(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, c: THREE.Color, flex0: number, flex1: number, sides: number): void {
    const axis = b.clone().sub(a).normalize();
    const side = new THREE.Vector3(0, 0, 1).cross(axis);
    if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
    side.normalize();
    const other = axis.clone().cross(side);
    const first = this.positions.length / 3;
    for (let i = 0; i < sides; i++) {
      const t = (i / sides) * Math.PI * 2;
      const n = side.clone().multiplyScalar(Math.cos(t)).addScaledVector(other, Math.sin(t));
      this.vertex(a.clone().addScaledVector(n, r0), n, c, flex0);
      this.vertex(b.clone().addScaledVector(n, r1), n, c, flex1);
    }
    for (let i = 0; i < sides; i++) {
      const j = (i + 1) % sides;
      const a0 = first + 2 * i,
        a1 = first + 2 * j;
      this.indices.push(a0, a1, a0 + 1, a0 + 1, a1, a1 + 1);
    }
  }
  /**
   * A welded low-poly ball (icosahedron of `detail` 1 or 0, octahedron at -1) at `at`, radii `r`,
   * its normals the sphere's, bent toward `out` (the whole plant's outside) by `bend` so the plant is
   * lit as one body; `jitter` dents it so no two are the same.
   */
  ball(
    at: THREE.Vector3,
    r: THREE.Vector3,
    detail: number,
    c: THREE.Color,
    flex: number,
    seed: number,
    out = new THREE.Vector3(),
    bend = 0,
  ): void {
    const poly = detail < 0 ? new THREE.OctahedronGeometry(1, 0) : new THREE.IcosahedronGeometry(1, detail);
    const p = poly.getAttribute('position');
    const keys = new Map<string, number>();
    const v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).normalize();
      const key = `${Math.round(v.x * 1e4)},${Math.round(v.y * 1e4)},${Math.round(v.z * 1e4)}`;
      let k = keys.get(key);
      if (k === undefined) {
        const dent = 0.88 + 0.24 * hash2(Math.round(v.x * 50), Math.round(v.y * 50 + v.z * 30), seed);
        const n = v.clone().lerp(out, bend).normalize();
        const at2 = new THREE.Vector3(v.x * r.x, v.y * r.y, v.z * r.z).multiplyScalar(dent).add(at);
        k = this.vertex(at2, n, c, flex);
        keys.set(key, k);
      }
      this.indices.push(k);
    }
    poly.dispose();
  }
  /**
   * A flat fan: from `at`, opening along `along` over `sweep` radians, facing `facing`; `points`
   * serrations round its edge (each a point and a notch), cupped a little. Seen from either side.
   */
  fan(
    at: THREE.Vector3,
    facing: THREE.Vector3,
    along: THREE.Vector3,
    radius: number,
    sweep: number,
    points: number,
    cup: number,
    c: THREE.Color,
    flex: number,
  ): void {
    const across = new THREE.Vector3().crossVectors(facing, along).normalize();
    const hub = this.vertex(at, facing, c, flex * 0.6);
    const edge: number[] = [];
    const steps = points * 2;
    for (let s = 0; s <= steps; s++) {
      const a = (s / steps - 0.5) * sweep;
      const reach = radius * (s % 2 ? 0.78 : 1);
      const dir = along.clone().multiplyScalar(Math.cos(a)).addScaledVector(across, Math.sin(a));
      const p = at
        .clone()
        .addScaledVector(dir, reach)
        .addScaledVector(facing, cup * radius * (2 * Math.abs(s / steps - 0.5)) - 0.12 * radius);
      edge.push(this.vertex(p, facing.clone().addScaledVector(dir, 0.25).normalize(), c, flex));
    }
    for (let s = 0; s < steps; s++) this.tri(hub, edge[s]!, edge[s + 1]!);
  }
  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.colours, 3));
    g.setAttribute('aFlex', new THREE.Float32BufferAttribute(this.flex, 1));
    g.setIndex(this.indices);
    g.computeBoundingSphere();
    return g;
  }
}

/** A shrub: a few squashed masses heaped on a dome, the biggest in the middle, lit as one body. 1 tall before scaling. */
function buildShrub(form: Extract<Form, { kind: 'shrub' }>, seed: number, near: boolean): THREE.BufferGeometry {
  const r = sequence(seed);
  const b = new Builder();
  const masses = Math.round(form.masses[0] + r() * (form.masses[1] - form.masses[0]));
  const middle = new THREE.Vector3(0, 0.35, 0);
  for (let i = 0; i < masses; i++) {
    const a = i * 2.39996 + r() * 0.5;
    const out = i === 0 ? 0 : (0.25 + 0.75 * Math.sqrt(i / masses)) * 0.5 * form.spread;
    const size = (i === 0 ? 0.42 : 0.3 + 0.12 * r()) * Math.max(0.8, form.spread * 0.75);
    const at = new THREE.Vector3(Math.cos(a) * out, 0, Math.sin(a) * out);
    at.y = Math.max(size * 0.7, 1 - size - 0.55 * (out / (0.5 * form.spread)) ** 2 + (r() - 0.5) * 0.1);
    const shade = new THREE.Color(1, 1, 1).multiplyScalar(0.88 + 0.24 * r());
    const outward = at.clone().sub(middle).normalize();
    b.ball(at, new THREE.Vector3(size, size * 0.82, size), near ? 1 : 0, shade, 0.4 + 0.6 * at.y, seed + i, outward, 0.35);
  }
  return b.geometry();
}

/** Saw palmetto: a low dark core and a cluster of flat serrated fans on short stalks, leaning out. 1 tall before scaling. */
function buildFan(form: Extract<Form, { kind: 'fan' }>, seed: number, near: boolean): THREE.BufferGeometry {
  const r = sequence(seed);
  const b = new Builder();
  b.ball(new THREE.Vector3(0, 0.18, 0), new THREE.Vector3(0.32, 0.24, 0.32), near ? 1 : 0, new THREE.Color(0.7, 0.72, 0.65), 0.2, seed);
  const fans = Math.round((form.fans[0] + r() * (form.fans[1] - form.fans[0])) * (near ? 1 : 0.5));
  for (let i = 0; i < fans; i++) {
    const yaw = i * 2.39996 + r() * 0.4;
    const lean = 0.25 + 0.85 * ((i * 0.618) % 1);
    const out = new THREE.Vector3(Math.cos(yaw) * Math.sin(lean), Math.cos(lean), Math.sin(yaw) * Math.sin(lean));
    const radius = form.blade[0] + r() * (form.blade[1] - form.blade[0]);
    const at = new THREE.Vector3(0, 0.15, 0).addScaledVector(out, 0.75 - radius);
    // the fan faces up and away from the middle; it opens along its stalk
    const facing = out
      .clone()
      .lerp(new THREE.Vector3(0, 1, 0), 0.45)
      .normalize();
    const along = out.clone().addScaledVector(facing, -out.dot(facing)).normalize();
    if (along.lengthSq() < 0.5) along.set(Math.cos(yaw), 0, Math.sin(yaw));
    const tone = new THREE.Color(1, 1, 1).multiplyScalar(0.85 + 0.3 * r());
    if (near) b.shaft(new THREE.Vector3(0, 0.12, 0), at, 0.012, 0.01, new THREE.Color(0.75, 0.7, 0.55), 0, 0.6, 3);
    b.fan(at, facing, along, radius, 2.4 + 0.6 * r(), near ? 6 : 3, 0.25, tone, 1);
  }
  return b.geometry();
}

/** A cabbage palm: a tapering trunk, a ball of old leaf bases under the crown, a star of arched flat fronds. 1 tall before scaling. */
function buildPalm(form: Extract<Form, { kind: 'palm' }>, seed: number, near: boolean): THREE.BufferGeometry {
  const r = sequence(seed);
  const b = new Builder();
  const lean = new THREE.Vector3((r() - 0.5) * 0.1, 1, (r() - 0.5) * 0.1).normalize();
  const crown = lean.clone().multiplyScalar(0.84);
  const width = form.trunk[0] + r() * (form.trunk[1] - form.trunk[0]);
  const bark = new THREE.Color(1.6, 1.45, 1.2);
  b.shaft(new THREE.Vector3(0, -0.02, 0), crown, width * 1.25, width, bark, 0, 0.25, near ? 8 : 5);
  b.ball(
    crown.clone().addScaledVector(lean, -0.02),
    new THREE.Vector3(width * 2.4, 0.06, width * 2.4),
    near ? 1 : 0,
    new THREE.Color(1.5, 1.25, 0.85),
    0.3,
    seed,
  );
  const fronds = near ? form.fronds : Math.round(form.fronds * 0.6);
  for (let i = 0; i < fronds; i++) {
    const yaw = i * 2.39996 + r() * 0.25;
    const rise = 0.75 - 1.3 * ((i * 0.618) % 1); // the young ones up, the old ones down
    const length = 0.24 + 0.06 * r();
    const dir = new THREE.Vector3(Math.cos(yaw) * Math.cos(rise), Math.sin(rise), Math.sin(yaw) * Math.cos(rise));
    const side = new THREE.Vector3(-Math.sin(yaw), 0, Math.cos(yaw));
    const tone = new THREE.Color(1, 1, 1).multiplyScalar(0.85 + 0.3 * r());
    // a frond: a narrow leaf, widest a third of the way out, arching down to its tip
    const segs = near ? 4 : 2;
    let last: [number, number] | null = null;
    let at = crown.clone().addScaledVector(dir, 0.02);
    let heading = dir.clone();
    for (let k = 0; k <= segs; k++) {
      const t = k / segs;
      const halfWidth = length * 0.16 * Math.sin(Math.PI * Math.min(1, t * 1.3 + 0.05)) * (1 - 0.6 * t);
      const up = new THREE.Vector3().crossVectors(side, heading).normalize();
      const flex = 0.5 + 0.5 * t;
      const a = b.vertex(at.clone().addScaledVector(side, halfWidth), up, tone, flex);
      const c = b.vertex(
        at
          .clone()
          .addScaledVector(side, -halfWidth)
          .addScaledVector(up, halfWidth * 0.35),
        up,
        tone,
        flex,
      );
      if (last) {
        b.tri(last[0], a, last[1]);
        b.tri(last[1], a, c);
      }
      last = [a, c];
      at = at.clone().addScaledVector(heading, length / segs);
      heading = heading
        .clone()
        .add(new THREE.Vector3(0, -0.45 / segs, 0))
        .normalize();
    }
  }
  return b.geometry();
}

function build(species: Species, seed: number, form: 'near' | 'far'): THREE.BufferGeometry {
  const f = species.form;
  const near = form === 'near';
  if (f.kind === 'fan') return buildFan(f, seed, near);
  if (f.kind === 'shrub') return buildShrub(f, seed, near);
  return buildPalm(f, seed, near);
}

// ----------------------------------------------------------------------------------------------
// The material: lit as solid forms, a gentle mottle in the real look, fading by dither, moving in the wind.

/** Shared by every plant: time, eye and wind. */
interface Shared {
  time: { value: number };
  eye: { value: THREE.Vector3 };
  wind: { value: THREE.Vector3 };
}

const PLANT_VERTEX = /* glsl */ `
  attribute float aFlex;
  attribute vec4 aBand;          // in from, in to, out from, out to: metres from the eye
  uniform vec3 uEye;             // the eye in the plants' frame
  uniform vec3 uWind;            // which way, and how hard (its length)
  uniform float uTime;
  uniform float uSway;
  varying float vFade;
  varying vec3 vPlant;           // the point in the plants' frame, for the mottle
`;

const PLANT_SWAY = /* glsl */ `
  vec3 plantRoot = vec3(instanceMatrix[3]);
  float plantFar = distance(uEye, plantRoot);
  // a band's end given negative is a reach: there the plant shrinks away to its root rather than dissolving, so it
  // never hangs in the distance as a ghost, and a thicket's plants sink into the land's canopy as it rises
  float plantIn = smoothstep(aBand.x, aBand.y, plantFar);
  float plantOut = 1.0 - smoothstep(abs(aBand.z), abs(aBand.w), plantFar);
  vFade = aBand.w < 0.0 ? plantIn : plantIn * plantOut;
  // (a plant outside its band has no pixel drawn, vFade being 0: it is shrunk to its root too, so none is rasterised either)
  float plantSize = vFade <= 0.0 ? 0.0 : aBand.w < 0.0 ? plantOut : 1.0;
  // the breeze: a slow lean and a quicker flutter, out of step plant to plant; none at the root
  float phase = dot(plantRoot.xz, vec2(0.37, 0.23));
  float gust = 0.6 + 0.4 * sin(uTime * 0.7 + phase * 0.3);
  float flutter = sin(uTime * 2.9 + phase + position.y * 3.0) * 0.35 + sin(uTime * 4.7 + phase * 1.7) * 0.15;
  vec3 sway = (uWind * (gust + flutter) + vec3(0.0, -0.25 * length(uWind) * flutter, 0.0)) * uSway * aFlex * aFlex * (1.0 - smoothstep(25.0, 60.0, plantFar));
`;

const PLANT_FRAGMENT = /* glsl */ `
  varying float vFade;
  varying vec3 vPlant;
  ${NOISE}
  // a threshold for each pixel, with no pattern to it: where a plant is half faded, half its pixels are drawn
  float plantDither() {
    vec2 q = fract(gl_FragCoord.xy * vec2(0.1031, 0.1030));
    q += dot(q, q.yx + 33.33);
    return fract((q.x + q.y) * q.x);
  }
`;

/** A species' material: `drawn` for the view, `depth` for its shadow (faded as drawn). */
function plantMaterial(species: Species, shared: Shared, use: 'drawn' | 'depth'): THREE.Material {
  const depth = use === 'depth';
  const uniforms = { uEye: shared.eye, uWind: shared.wind, uTime: shared.time, uSway: { value: species.sway } };
  const material = depth
    ? new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide })
    : new THREE.MeshStandardMaterial({
        name: `plant-${species.name}`,
        vertexColors: true,
        roughness: species.rough,
        metalness: 0,
        envMapIntensity: 0.5,
        side: THREE.DoubleSide,
      });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    // the cel look's twin (look.ts) runs this same patch on a toon shader: there the forms are flat tones
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
      .replace('#include <clipping_planes_pars_fragment>', `#include <clipping_planes_pars_fragment>\n${PLANT_FRAGMENT}`)
      .replace(
        depth ? '#include <clipping_planes_fragment>' : '#include <alphatest_fragment>',
        /* glsl */ `${depth ? '#include <clipping_planes_fragment>' : '#include <alphatest_fragment>'}
        if (plantDither() >= vFade) discard;
        ${
          depth || cel
            ? ''
            : // the real look: leaf masses a hand across, lighter and darker, faded out before they are under a pixel
              `{
          float px = length(fwidth(vPlant));
          float mottle = noise(vPlant * 4.0) * 0.6 + noise(vPlant * 11.0) * 0.4;
          diffuseColor.rgb *= 1.0 + 0.24 * (mottle - 0.5) * (1.0 - smoothstep(0.03, 0.12, px));
        }`
        }`,
      );
  };
  material.customProgramCacheKey = () => `plant:${use}`;
  return material;
}

// ----------------------------------------------------------------------------------------------
// Placement: a tile at a time, by the cover map, the same every time.

type Layer = Species['layer'];
/** Each layer's tiles: so many of its places along a side. Trees are few and seen from far, grass many and only near. */
const TILE_PLACES: Record<Layer, number> = { herb: 20, woody: 14, tree: 8 };

/** Each species' meshes, near and far, per variant. */
interface Drawn {
  species: Species;
  near: THREE.InstancedMesh[];
  far: THREE.InstancedMesh[];
}

const CAPACITY = { near: 6000, far: 12000 };

export class Flora {
  readonly group = new THREE.Group();
  private readonly spec: FloraSpec;
  private readonly ground: Ground;
  private readonly shared: Shared;
  private readonly drawn: Drawn[] = [];
  /** Each layer's tiles, packed (plantsort.ts), by `tileKey`. */
  private readonly tiles: Record<Layer, Map<number, Tile>> = { herb: new Map(), woody: new Map(), tree: new Map() };
  /** Where the eye was when each layer was last sorted. */
  private readonly sorted: Record<Layer, THREE.Vector3> = {
    herb: new THREE.Vector3(1e9, 0, 1e9),
    woody: new THREE.Vector3(1e9, 0, 1e9),
    tree: new THREE.Vector3(1e9, 0, 1e9),
  };
  /** How far each layer's plants are drawn, metres. */
  private readonly reach: Record<Layer, number> = { herb: 0, woody: 0, tree: 0 };
  /** How far the eye goes before each layer is sorted again, metres: the margin its lists are made with. */
  private readonly margin: Record<Layer, number> = { herb: RESORT_LEAST, woody: RESORT_LEAST, tree: RESORT_LEAST };
  /** What the sorting needs of each species, and the arrays its meshes draw from. */
  private readonly kinds: Kind[];
  private readonly lists: Lists[] = [];

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
    for (const layer of LAYERS) {
      const nearest = Math.min(...spec.species.filter((s) => s.layer === layer).map((s) => s.near));
      if (Number.isFinite(nearest)) this.margin[layer] = Math.max(RESORT_LEAST, RESORT_SHARE * nearest);
    }
    this.kinds = spec.species.map((s) => ({ near: s.near, reach: s.reach }));
    spec.species.forEach((species, index) => {
      const material = plantMaterial(species, this.shared, 'drawn');
      const depth = plantMaterial(species, this.shared, 'depth');
      // the near forms cast shadows (the shadow map covers the ground round the walker or the model: stage.ts); the
      // far forms do not: thousands of them drawn into it would be shadows nobody sees at that size
      const mesh = (geometry: THREE.BufferGeometry, capacity: number, cast: boolean) => {
        geometry.setAttribute('aBand', new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4));
        const m = new THREE.InstancedMesh(geometry, material, capacity);
        m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
        m.count = 0;
        m.visible = false;
        m.frustumCulled = false;
        m.castShadow = cast;
        m.receiveShadow = true;
        m.customDepthMaterial = depth;
        m.raycast = () => {}; // plants are not solid and not picked
        onlyAsItself(m);
        this.group.add(m);
        return m;
      };
      const near: THREE.InstancedMesh[] = [],
        far: THREE.InstancedMesh[] = [];
      for (let v = 0; v < VARIANTS; v++) {
        const seed = 1000 * (index + 1) + 17 * v;
        near.push(mesh(build(species, seed, 'near'), CAPACITY.near, true));
        far.push(mesh(build(species, seed, 'far'), CAPACITY.far, false));
      }
      this.drawn.push({ species, near, far });
      const list = (m: THREE.InstancedMesh, capacity: number) => ({
        matrices: m.instanceMatrix.array as Float32Array,
        colours: m.instanceColor!.array as Float32Array,
        bands: (m.geometry.getAttribute('aBand') as THREE.InstancedBufferAttribute).array as Float32Array,
        count: 0,
        capacity,
      });
      this.lists.push({ near: near.map((m) => list(m, CAPACITY.near)), far: far.map((m) => list(m, CAPACITY.far)) });
    });
  }

  tick(dt: number): void {
    this.shared.time.value += dt;
  }

  /** The cel look: the same forms, drawn (the toon twin of each material makes them flat tones: see plantMaterial). */
  simplify(_on: boolean): void {}

  /** The eye, in the plants' frame. True if what is drawn changed. */
  attend(eye: THREE.Vector3): boolean {
    this.shared.eye.value.copy(eye);
    let changed = false;
    for (const layer of LAYERS) {
      const at = this.sorted[layer];
      if (this.reach[layer] <= 0 || !due(eye.x, eye.y, eye.z, at.x, at.y, at.z, this.margin[layer])) continue;
      this.arrange(layer, eye.x, eye.y, eye.z);
      changed = true;
    }
    return changed;
  }

  /** The plants of one layer on one tile, made the first time they are wanted. */
  private tile(layer: Layer, i: number, j: number): Tile {
    const key = tileKey(i, j);
    const made = this.tiles[layer].get(key);
    if (made) return made;
    const plants: Placed[] = [];
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
          matrix: m.elements.slice(),
          colour: [c.r, c.g, c.b],
          thicket: layer === 'woody' && woody >= THICKET,
        });
      }
    const tile = pack(plants);
    this.tiles[layer].set(key, tile);
    return tile;
  }

  /**
   * Sort one layer's plants round an eye into near and far forms. Each goes into every list whose
   * band it could enter before the layer is next sorted (the eye goes the layer's margin first),
   * and the shader fades it in and out within those bands by its distance as it is drawn.
   */
  private arrange(layer: Layer, ex: number, ey: number, ez: number): void {
    this.sorted[layer].set(ex, ey, ez);
    const margin = this.margin[layer];
    const mine = this.drawn.map((d, k) => (d.species.layer === layer ? k : -1)).filter((k) => k >= 0);
    for (const k of mine) for (const list of [...this.lists[k]!.near, ...this.lists[k]!.far]) list.count = 0;
    const reach = this.reach[layer] + margin;
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
        if (dx * dx + dz * dz > reach * reach) continue;
        sort(this.tile(layer, i, j), ex, ey, ez, margin, this.kinds, this.lists);
      }
    for (const k of mine) {
      const d = this.drawn[k]!;
      for (const form of ['near', 'far'] as const)
        d[form].forEach((mesh, v) => {
          const n = this.lists[k]![form][v]!.count;
          if (n === 0 && mesh.count === 0) return;
          mesh.count = n;
          mesh.visible = n > 0;
          // send only what is used: a whole buffer is a megabyte, and there are dozens
          this.send(mesh.instanceMatrix, n * 16);
          this.send(mesh.instanceColor!, n * 3);
          this.send(mesh.geometry.getAttribute('aBand') as THREE.InstancedBufferAttribute, n * 4);
        });
    }
    // forget tiles far behind, so a long walk does not keep the whole site in memory
    if (this.tiles.herb.size + this.tiles.woody.size + this.tiles.tree.size > 6000)
      for (const each of LAYERS) {
        const width = TILE_PLACES[each] * this.spec.spacing[each];
        const keep = 2 * (this.reach[each] + this.margin[each] + width);
        for (const key of this.tiles[each].keys()) {
          const i = Math.floor(key / TILE_SPAN) - TILE_SPAN / 2,
            j = (key % TILE_SPAN) - TILE_SPAN / 2;
          if (Math.hypot((i + 0.5) * width - ex, (j + 0.5) * width - ez) > keep) this.tiles[each].delete(key);
        }
      }
  }

  /** Have the first `length` numbers of an instance attribute sent to the GPU. */
  private send(attribute: THREE.InstancedBufferAttribute, length: number): void {
    attribute.clearUpdateRanges();
    attribute.addUpdateRange(0, Math.max(1, length));
    attribute.needsUpdate = true;
  }
}

/** The layers, in the order they are sorted. */
const LAYERS = ['woody', 'herb', 'tree'] as const;
/** A tile's key from its two indices, each within half of this of zero. */
const TILE_SPAN = 1 << 20;
const tileKey = (i: number, j: number): number => (i + TILE_SPAN / 2) * TILE_SPAN + (j + TILE_SPAN / 2);

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
