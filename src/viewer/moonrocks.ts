import * as THREE from 'three';
import type { Measure } from '../measure.ts';
import { cellOf, craterIn, LIGHT_GLSL, octaveDiameter } from './moonground.ts';
import type { SiteGround } from './moonsite.ts';

/**
 * The blocks lying on the Moon's ground round where the front page's camera starts: real shapes, each standing on
 * the altimeter's ground and casting its shadow on it, there while the camera is near enough to see them.
 *
 * None of them is a block of the Moon's: nothing has photographed this plain at a metre. They are **estimated**, and
 * laid out by rule from a fixed seed, so they are the same on every visit. What is real is how many there are of
 * each size:
 *
 * - **Everywhere**, the soil's own scatter: Surveyor 1's count on its mare plain (`BLOCKS.plain`).
 * - **Round the freshest of the made craters** (moonground.ts: those under a sixteenth of the way to worn away),
 *   the blocks each threw out: thickest at the rim and gone by two and a half radii, sized up to what a crater of
 *   its size throws (`BLOCKS.largest`), as many at the rim as Surveyor 7 counted on Tycho's (`BLOCKS.rim`), less
 *   by the crater's age.
 *
 * Only the ground the camera looks across holds any (a wedge toward the Earth, from 90 m to the horizon at 6 km),
 * and only blocks that are a few pixels across from where it starts (`least`): the rest could not be seen.
 *
 * A block is a ball cut by ten planes and drawn faceted (its faces' own normals, taken on the pixel), a little
 * over half out of the ground, lit by the Moon's own law (moonground.ts). Its **shadow** is its own shape laid on
 * the ground along the Sun's rays (the ground under it taken as a plane, tilted as the altimeter's is there) and
 * drawn dark over what is under it: the Sun has no air to soften it and a block's shadow is three of its heights
 * long at this Sun, so its edge is under a pixel. What is simplified: a shadow does not fall on another block, nor
 * a made crater's on a block; the blocks do not sit down into the made craters, which have no depth; every block is
 * one shape, turned and stretched.
 */

type Figure = Measure;

export const BLOCKS = {
  /** Blocks wider than D on a mare plain: N = `k` D^-`b` a square metre, D in metres. Surveyor 1's count, 3e5 D^-2.11 per 100 m^2 with D in mm. */
  plain: {
    value: [1.4e-3, 2.11],
    confidence: 'estimated',
    source:
      'E. M. Shoemaker and E. C. Morris (1970), "Physical characteristics of the lunar regolith determined from Surveyor television observations", Radio Science 5: Surveyor 1, N = 3e5 D^-2.11 per 100 m^2 (D in mm), as remembered, not read again',
  },
  /** And on the rim of a fresh crater: Surveyor 7's count on Tycho's, 7.9e5 D^-1.80 per 100 m^2 with D in mm, of which a third is taken (few craters are Tycho). */
  rim: {
    value: [0.031 / 3, 1.8],
    confidence: 'estimated',
    source: 'Shoemaker and Morris (1970): Surveyor 7, N = 7.9e5 D^-1.80 per 100 m^2 (D in mm), as remembered; the third is chosen',
  },
  /** The largest block a crater throws out: `k` D^(2/3) metres, D in metres. */
  largest: {
    value: 0.29,
    confidence: 'estimated',
    source:
      'G. D. Bart and H. J. Melosh (2007), "Using lunar boulders to distinguish primary from distant secondary impact craters", GRL 34: L = 0.29 D^(2/3), as remembered',
  } satisfies Figure,
} as const;

/** How fresh a made crater must be to have blocks round it (its age, 0 to 1). */
const FRESH = 0.0625;
/** The ground that holds blocks: from and to, metres from the site; half the wedge's breadth, radians. */
const FIELD = { from: 90, to: 6000, half: (13 * Math.PI) / 180 };
/** The smallest block kept at a distance: 0.5 m, and 6 parts in 10,000 of the distance (five pixels through the lens from the start). */
const least = (r: number, lighter: boolean): number => Math.max(0.5, 6e-4 * r) * (lighter ? 1.7 : 1);
/** The levels of detail: a block this many parts of its distance across or more has this many triangles (an icosahedron's faces, each cut `detail` + 1 ways a side). */
const LEVELS = [
  { above: 6e-3, detail: 7 },
  { above: 2e-3, detail: 3 },
  { above: 8e-4, detail: 1 },
  { above: 0, detail: 0 },
] as const;
/** How dark a block's shadow leaves what is under it, as a share of what is drawn there (on the screen's own scale, not light's): about a hundredth of the light. */
const SHADE = 0.13;

/** A seeded run of numbers from 0 to 1 (mulberry32). */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Block {
  x: number;
  y: number;
  size: number;
}

/** Where the blocks lie and how big each is. `toward`: the bearing of the middle of the wedge, radians anticlockwise from the site's east. */
function scatter(toward: number, lighter: boolean): Block[] {
  const next = seeded(1961_04_12);
  const blocks: Block[] = [];
  const inField = (x: number, y: number): number => {
    const r = Math.hypot(x, y);
    let a = Math.atan2(y, x) - toward;
    a -= 2 * Math.PI * Math.round(a / (2 * Math.PI));
    return r >= FIELD.from && r <= FIELD.to && Math.abs(a) <= FIELD.half ? r : 0;
  };
  // the soil's scatter, band by band outward
  const [k, b] = BLOCKS.plain.value;
  for (let r0 = FIELD.from; r0 < FIELD.to; r0 *= 1.12) {
    const r1 = Math.min(FIELD.to, r0 * 1.12);
    const smallest = least(Math.sqrt(r0 * r1), lighter);
    const mean = FIELD.half * (r1 * r1 - r0 * r0) * k * smallest ** -b;
    for (let n = Math.floor(mean + next()); n > 0; n--) {
      const r = Math.sqrt(r0 * r0 + next() * (r1 * r1 - r0 * r0));
      // (they thin out over the last quarter of the way, so that the field has no edge to be seen)
      if (next() < (r - 0.75 * FIELD.to) / (0.25 * FIELD.to)) continue;
      const a = toward + (2 * next() - 1) * FIELD.half;
      blocks.push({ x: r * Math.cos(a), y: r * Math.sin(a), size: Math.min(4, smallest * (1 - next()) ** (-1 / b)) });
    }
  }
  // what the freshest craters threw out
  const [kr, br] = BLOCKS.rim.value;
  const reach = FIELD.to + 2500;
  for (let octave = 0; octaveDiameter(octave) >= 16; octave++) {
    const [i0, j0] = cellOf(-reach, -reach, octave);
    const [i1, j1] = cellOf(reach, reach, octave);
    for (let j = j0; j <= j1; j++)
      for (let i = i0; i <= i1; i++) {
        const c = craterIn(i, j, octave);
        if (!c || c.age >= FRESH) continue;
        const radius = c.diameter / 2;
        if (Math.hypot(c.x, c.y) - 2.5 * radius > FIELD.to || Math.hypot(c.x, c.y) + 2.5 * radius < FIELD.from) continue;
        const fresh = 1 - c.age / FRESH;
        const biggest = BLOCKS.largest.value * c.diameter ** (2 / 3) * fresh;
        const smallest = Math.max(least(Math.hypot(c.x, c.y), lighter), biggest / 14);
        if (smallest >= biggest) continue;
        // as many as its rim's count over the ground they fall on (thickest at the rim: about seven radii squared), no more than 900
        const count = Math.min(900, Math.floor(6.9 * radius * radius * kr * fresh * smallest ** -br + next()));
        for (let n = 0; n < count; n++) {
          // (how far out: thickest at the rim, a bell half a radius wide, by rejection)
          let s = 0;
          do s = 0.7 + 1.8 * next();
          while (next() > Math.exp(-((s - 1.05) ** 2) / 0.35));
          const a = 2 * Math.PI * next();
          const [x, y] = [c.x + s * radius * Math.cos(a), c.y + s * radius * Math.sin(a)];
          const size = Math.min(biggest, smallest * (1 - next()) ** (-1 / br));
          const r = inField(x, y);
          if (r && next() >= (r - 0.75 * FIELD.to) / (0.25 * FIELD.to)) blocks.push({ x, y, size });
        }
      }
  }
  // (the biggest first, so that if there are too many it is the least that go)
  blocks.sort((p, q) => q.size - p.size);
  blocks.length = Math.min(blocks.length, lighter ? 4000 : 14_000);
  return blocks;
}

/** A block's shape: a ball cut by planes, `detail` as an icosahedron's. */
function shape(detail: number): THREE.BufferGeometry {
  const geometry = new THREE.IcosahedronGeometry(1, detail);
  const next = seeded(7);
  const planes: [number, number, number, number][] = [];
  for (let n = 0; n < 10; n++) {
    const z = 2 * next() - 1,
      a = 2 * Math.PI * next(),
      s = Math.sqrt(1 - z * z);
    planes.push([s * Math.cos(a), s * Math.sin(a), z, 0.42 + 0.4 * next()]);
  }
  const at = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let v = 0; v < at.count; v++) {
    const [x, y, z] = [at.getX(v), at.getY(v), at.getZ(v)];
    const l = Math.hypot(x, y, z);
    let r = 1;
    for (const [a, b, c, d] of planes) {
      const along = (a * x + b * y + c * z) / l;
      if (along > 1e-3) r = Math.min(r, d / along);
    }
    at.setXYZ(v, (x / l) * r, (y / l) * r, (z / l) * r);
  }
  geometry.deleteAttribute('normal');
  geometry.deleteAttribute('uv');
  return geometry;
}

const ROCK_VERTEX = /* glsl */ `
  attribute float tone;
  uniform vec3 uEyeSite;   // the eye, from the site's ground, in the Moon's frame
  varying vec3 vP;
  varying float vTone;
  void main() {
    vec3 p = (instanceMatrix * vec4(position, 1.0)).xyz - uEyeSite;
    vP = p;
    vTone = tone;
    gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * p, 1.0);
  }`;

const ROCK_FRAGMENT = /* glsl */ `
  uniform vec3 uSun, uUp, uAlbedo;
  varying vec3 vP;
  varying float vTone;
  ${LIGHT_GLSL}
  void main() {
    // a face's own normal: the blocks are broken rock, and are drawn so
    vec3 n = normalize(cross(dFdx(vP), dFdy(vP)));
    vec3 v = normalize(-vP);
    if (dot(n, v) < 0.0) n = -n;
    gl_FragColor = vec4(moonlight(uAlbedo * vTone, n, uUp, v, uSun, 1.0, 0.6), 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

const SHADOW_VERTEX = /* glsl */ `
  attribute vec3 seat, seatUp;   // the ground under the block, from the site's, and its own up
  uniform vec3 uEyeSite, uSun;
  void main() {
    vec3 p = (instanceMatrix * vec4(position, 1.0)).xyz;
    // along the Sun's rays to the ground's plane
    p -= uSun * (dot(p - seat, seatUp) / max(dot(uSun, seatUp), 0.05));
    gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * (p - uEyeSite), 1.0);
  }`;

const SHADOW_FRAGMENT = /* glsl */ `
  void main() { gl_FragColor = vec4(vec3(${SHADE.toFixed(2)}), 1.0); }`;

export class MoonRocks {
  readonly group = new THREE.Group();
  /** How many blocks there are. */
  readonly count: number;
  private readonly shadows: THREE.InstancedMesh[] = [];
  private readonly rocks: THREE.InstancedMesh[] = [];

  /**
   * `site`: the ground they stand on. `toward`: the bearing they are laid out about, radians anticlockwise from the
   * site's east. `uniforms`: the eye from the site, the Sun, the Sun's light and the Earth's, shared with the ground's.
   */
  constructor(
    site: SiteGround,
    toward: number,
    lighter: boolean,
    uniforms: Record<'uEyeSite' | 'uSun' | 'uSunLight' | 'uEarth', THREE.IUniform>,
  ) {
    const blocks = scatter(toward, lighter);
    this.count = blocks.length;
    const up = new THREE.Vector3(...site.meta.up);
    const rock = new THREE.ShaderMaterial({
      name: 'moon-rock',
      uniforms: { ...uniforms, uUp: { value: up }, uAlbedo: { value: new THREE.Color(0.22, 0.21, 0.195) } },
      vertexShader: ROCK_VERTEX,
      fragmentShader: ROCK_FRAGMENT,
    });
    const shadow = new THREE.ShaderMaterial({
      name: 'moon-rock-shadow',
      uniforms: { uEyeSite: uniforms.uEyeSite, uSun: uniforms.uSun },
      vertexShader: SHADOW_VERTEX,
      fragmentShader: SHADOW_FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.ZeroFactor,
      blendDst: THREE.SrcColorFactor,
      // (on the ground, not in it: pulled toward the eye by a little more than the ground's own depth can differ)
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -8,
    });
    const next = seeded(42);
    const levels = LEVELS.map(() => [] as Block[]);
    for (const b of blocks) levels[LEVELS.findIndex((l) => b.size / Math.hypot(b.x, b.y) >= l.above)]!.push(b);
    const m = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      tilt = new THREE.Quaternion(),
      s = new THREE.Vector3(),
      p = new THREE.Vector3(),
      n = new THREE.Vector3(),
      axis = new THREE.Vector3(),
      upright = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), up);
    for (const [level, list] of levels.entries()) {
      if (!list.length) continue;
      const geometry = shape(LEVELS[level]!.detail);
      const rocks = new THREE.InstancedMesh(geometry, rock, list.length);
      const seat = new Float32Array(list.length * 3),
        seatUp = new Float32Array(list.length * 3),
        tone = new Float32Array(list.length);
      for (const [i, b] of list.entries()) {
        // wider than tall, turned any way round, tipped a little, a little over half of it out of the ground
        const half = b.size / 2;
        s.set(half * (0.8 + 0.4 * next()), half * (0.8 + 0.4 * next()), half * (0.6 + 0.5 * next()));
        axis.set(next() - 0.5, next() - 0.5, 0).normalize();
        tilt.setFromAxisAngle(axis, 0.45 * next());
        q.setFromAxisAngle(axis.set(0, 0, 1), 2 * Math.PI * next())
          .premultiply(tilt)
          .premultiply(upright);
        n.set(...site.normal(b.x, b.y));
        p.set(...site.point(b.x, b.y));
        seat.set([p.x, p.y, p.z], i * 3);
        seatUp.set([n.x, n.y, n.z], i * 3);
        tone[i] = 0.8 + 0.45 * next();
        p.addScaledVector(n, s.z * (0.1 + 0.3 * next()));
        rocks.setMatrixAt(i, m.compose(p, q, s));
      }
      geometry.setAttribute('seat', new THREE.InstancedBufferAttribute(seat, 3));
      geometry.setAttribute('seatUp', new THREE.InstancedBufferAttribute(seatUp, 3));
      geometry.setAttribute('tone', new THREE.InstancedBufferAttribute(tone, 1));
      rocks.instanceMatrix.needsUpdate = true;
      const shadows = new THREE.InstancedMesh(geometry, shadow, list.length);
      shadows.instanceMatrix = rocks.instanceMatrix;
      for (const mesh of [rocks, shadows]) {
        mesh.frustumCulled = false;
        mesh.matrixAutoUpdate = false;
      }
      rocks.name = `moon-rocks-${level}`;
      shadows.name = `moon-rock-shadows-${level}`;
      rocks.renderOrder = 5;
      shadows.renderOrder = 4;
      this.rocks.push(rocks);
      this.shadows.push(shadows);
      this.group.add(shadows, rocks);
    }
  }

  /** Whether they are to be drawn: `seen`, while the camera is low enough to have any in its picture; `sunUp`, the Sun's height at the site (its sine). */
  show(seen: boolean, sunUp: number): boolean {
    const changed = this.group.visible !== seen;
    this.group.visible = seen;
    for (const s of this.shadows) s.visible = sunUp > 0.05;
    return changed;
  }

  dispose(): void {
    for (const r of this.rocks) {
      r.geometry.dispose();
      r.dispose();
    }
    for (const s of this.shadows) s.dispose();
    (this.rocks[0]?.material as THREE.Material | undefined)?.dispose();
    (this.shadows[0]?.material as THREE.Material | undefined)?.dispose();
  }
}
