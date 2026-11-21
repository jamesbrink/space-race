import * as THREE from 'three';
import { DescentStrip, LandingGround } from '../../world/lunar-ground.ts';
import {
  LUNAR_SITES,
  type LunarSite,
  LunarTerrain,
  ROVER_SITES,
  type RoverSite,
  TERRAIN_INTERVALS,
  TERRAIN_SPACING,
} from '../../world/lunar-terrain.ts';
import { disposeTree } from '../dispose.ts';
import { lunarRockShape } from '../moonrocks.ts';

/**
 * A landing site's ground near at hand, as something to stand, walk and drive on: the nested grids LROC's stereo was baked
 * into (world/lunar-terrain.ts `LunarTerrain`: 2 m a square round the LM, then 8, 32, 128 and 512 m, 32.8 km every way),
 * drawn as meshes that take the Sun's shadows, in the site's own frame (SiteDef: origin on the ground under the LM, +X
 * east, +Y up, +Z south), with the soil's grain and the stones under a wheel's size on them. The lunar setting
 * (setting.ts) lays the whole Moon round it for the horizon past the grids; the rover's gallery scene stands on the same
 * ground (viewer/lunar-driving-ground.ts).
 *
 * The grids hold heights above the plane touching the Moon at their centre, the curvature kept (tools/lunar-terrain.py),
 * so the ground falls away to the horizon as it does; they are centred `centre` metres east of the LM (where a rover was
 * parked) and set on the LM's own ground here, as world/lunar-ground.ts `LandingGround.at` reads them.
 */

/** A landing site's ground as fetched: its grids, the descent strip along its approach, and both as one (`LandingGround`). */
export interface LunarGroundData {
  id: LunarSite;
  site: (typeof LUNAR_SITES)[LunarSite];
  terrain: LunarTerrain;
  strip: DescentStrip;
  ground: LandingGround;
}

const fetched = new Map<LunarSite, Promise<LunarGroundData>>();
const held = new Map<LunarSite, LunarGroundData>();

/** Fetch a site's ground (public/lunar/<site>.terrain.bin and .descent.bin), once a page: what a lunar setting is built on. */
export function lunarGround(id: LunarSite, signal?: AbortSignal): Promise<LunarGroundData> {
  let made = fetched.get(id);
  if (!made) {
    const base = import.meta.env.BASE_URL;
    const buffer = async (url: string): Promise<ArrayBuffer> => {
      const res = await fetch(base + url);
      if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
      return res.arrayBuffer();
    };
    made = Promise.all([buffer(`lunar/${id}.terrain.bin`), buffer(`lunar/${id}.descent.bin`)]).then(([grids, descent]) => {
      const site = LUNAR_SITES[id];
      const terrain = new LunarTerrain(grids);
      const strip = new DescentStrip(descent);
      const data = { id, site, terrain, strip, ground: new LandingGround(site, terrain, strip) };
      held.set(id, data);
      return data;
    });
    // (a fetch that failed is asked again next time)
    made.catch(() => fetched.delete(id));
    fetched.set(id, made);
  }
  if (!signal) return made;
  return Promise.race([
    made,
    new Promise<never>((_, reject) => {
      if (signal.aborted) reject(signal.reason);
      signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }),
  ]);
}

/** A site's ground once it has been fetched (`lunarGround`), or null. */
export const lunarGroundHeld = (id: LunarSite): LunarGroundData | null => held.get(id) ?? null;

/**
 * The LM as it stood at a site, where a model of it landed has been built (world/lunar-rover-sites.json: the rover's sites,
 * whose gallery scenes stand it there): its model, the nodes that had been unloaded from it by then, and the bearing of its
 * forward hatch, degrees east of north (the model's +X; the site's +X is east). Null where there is none yet.
 */
export function landerAt(id: LunarSite): { url: string; unloaded: string[]; bearing: number } | null {
  if (!(id in ROVER_SITES)) return null;
  const def = ROVER_SITES[id as RoverSite];
  return {
    url: def.lander,
    // (the rover off its pallet, the experiments carried out to their places)
    unloaded: ['LMRover', 'LMRoverPallet', 'LMRetroreflector', 'LMFarUV', 'LMScienceBay', ...('unloaded' in def ? def.unloaded : [])],
    bearing: 'landerBearing' in def ? def.landerBearing : 90,
  };
}

/** The landing site a SiteDef is (by its name and place), or null for one that is not on the Moon. */
export function lunarSiteOf(site: { body?: string; name: string } | undefined): LunarSite | null {
  if (site?.body !== 'moon') return null;
  const found = Object.entries(LUNAR_SITES).find(([, s]) => s.name === site.name);
  return (found?.[0] as LunarSite | undefined) ?? null;
}

/**
 * The soil: its colour (the normal albedo's grey, estimated: the ground near at hand is lit as a matte surface, which the
 * Moon is not quite: see setting.ts) and a mipmapped grain below the stereo's 2 m, fixed in the site's metres.
 */
export function soil(): THREE.MeshStandardMaterial {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  let seed = 1971;
  for (let i = 0; i < pixels.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const grey = 155 + (seed >>> 26);
    pixels.set([grey, grey, grey, 255], i);
  }
  const grain = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.magFilter = THREE.LinearFilter;
  grain.minFilter = THREE.LinearMipmapLinearFilter;
  grain.generateMipmaps = true;
  grain.colorSpace = THREE.SRGBColorSpace;
  grain.needsUpdate = true;
  const material = new THREE.MeshStandardMaterial({ color: SOIL, map: grain, roughness: 1 });
  material.name = 'lunar-soil';
  return material;
}

/**
 * The soil's colour, sRGB: with the grain's mean (0.73) a linear albedo of 0.15, a little over the Moon's normal albedo
 * of 0.12 (NASA Goddard, "Moon fact sheet", geometric) for the brighter return of its ground toward the Sun's side than a
 * matte surface's. Estimated.
 */
const SOIL = 0x8e8b88;

/** Stones under a wheel's size, estimated: each 16 m cell has a fixed seed, so the same stones are there on the way back. */
function gravel(height: (x: number, z: number) => number): { mesh: THREE.InstancedMesh; follow(x: number, z: number): void } {
  const span = 16,
    cells = 5,
    perCell = 42;
  const geometry = lunarRockShape(1);
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ color: 0x77736f, roughness: 1 });
  material.name = 'lunar-stones';
  const mesh = new THREE.InstancedMesh(geometry, material, cells * cells * perCell);
  mesh.name = 'lunar-stones';
  mesh.castShadow = mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const pose = new THREE.Object3D();
  let lastX = Number.POSITIVE_INFINITY,
    lastZ = Number.POSITIVE_INFINITY;
  function follow(x: number, z: number): void {
    const cx = Math.floor(x / span),
      cz = Math.floor(z / span);
    if (cx === lastX && cz === lastZ) return;
    lastX = cx;
    lastZ = cz;
    let index = 0;
    for (let j = cz - 2; j <= cz + 2; j++) {
      for (let i = cx - 2; i <= cx + 2; i++) {
        let seed = (Math.imul(i, 73856093) ^ Math.imul(j, 19349663) ^ 1971) >>> 0;
        const next = (): number => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
        for (let k = 0; k < perCell; k++) {
          const px = (i + next()) * span,
            pz = (j + next()) * span;
          const size = 0.018 + 0.06 * next() ** 3;
          pose.position.set(px, height(px, pz), pz);
          pose.rotation.set(next(), next() * 2 * Math.PI, next());
          pose.scale.set(size * 1.3, size * 0.7, size);
          pose.updateMatrix();
          mesh.setMatrixAt(index++, pose.matrix);
        }
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { mesh, follow };
}

/**
 * One grid of the nest as a mesh in the site's frame, with the square the finer grid covers left open. `dx` and `dy`: where
 * the grids' centre is in the site's frame (east of the LM, and the lift that sets them on the LM's ground). The outermost
 * grid has a skirt hung from its edge (`SKIRT`), so no sky shows between it and the whole Moon's ground beyond.
 */
function surface(terrain: LunarTerrain, level: number, material: THREE.Material, dx: number, dy: number): THREE.Mesh {
  const step = TERRAIN_SPACING[level]!;
  const n = TERRAIN_INTERVALS;
  const half = n / 2;
  const hole = level ? (half * TERRAIN_SPACING[level - 1]!) / step : 0;
  const side = n + 1;
  const geo = new THREE.BufferGeometry();
  const pos: number[] = [],
    normal: number[] = [],
    uv: number[] = [],
    indices: number[] = [];
  for (let j = 0; j <= n; j++) {
    for (let i = 0; i <= n; i++) {
      const x = (i - half) * step;
      const z = (j - half) * step;
      pos.push(x + dx, terrain.levels[level]![j * side + i]! + dy, z);
      const ex = terrain.height(x - step, z) - terrain.height(x + step, z);
      const ez = terrain.height(x, z - step) - terrain.height(x, z + step);
      const length = Math.hypot(ex, 2 * step, ez);
      normal.push(ex / length, (2 * step) / length, ez / length);
      uv.push((x + dx) / 3, z / 3);
      if (i === n || j === n || (i >= half - hole && j >= half - hole && i < half + hole && j < half + hole)) continue;
      const a = j * side + i;
      indices.push(a, a + side, a + 1, a + 1, a + side, a + side + 1);
    }
  }
  if (level === TERRAIN_SPACING.length - 1) {
    // the skirt: each edge vertex again, SKIRT lower, joined to it (seen from inside the grids it faces the eye)
    const edge: number[] = [];
    for (let i = 0; i < n; i++) edge.push(i);
    for (let j = 0; j < n; j++) edge.push(j * side + n);
    for (let i = n; i > 0; i--) edge.push(n * side + i);
    for (let j = n; j > 0; j--) edge.push(j * side);
    const first = pos.length / 3;
    for (const v of edge) {
      pos.push(pos[v * 3]!, pos[v * 3 + 1]! - SKIRT, pos[v * 3 + 2]!);
      normal.push(normal[v * 3]!, normal[v * 3 + 1]!, normal[v * 3 + 2]!);
      uv.push(uv[v * 2]!, uv[v * 2 + 1]!);
    }
    for (let k = 0; k < edge.length; k++) {
      const [a, b] = [edge[k]!, edge[(k + 1) % edge.length]!];
      const [c, d] = [first + k, first + ((k + 1) % edge.length)];
      indices.push(a, c, b, b, c, d);
    }
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  geo.computeBoundingSphere();
  const mesh = new THREE.Mesh(geo, material);
  mesh.name = `lunar-ground-${step}m`;
  mesh.receiveShadow = true;
  // (its skirt and far squares hide no one: only the finest grids cast onto what stands on them)
  mesh.castShadow = level <= 1;
  if (level === TERRAIN_SPACING.length - 1) material.side = THREE.DoubleSide;
  return mesh;
}

/** How far the outermost grid's skirt hangs below its edge, metres: more than the grids and the whole Moon's ground differ there (estimated). */
const SKIRT = 400;

/** The near ground of a site, in its own frame: what a lunar setting stands on. */
export class LunarNear {
  /** Every grid's mesh, finest first, and the stones. */
  readonly meshes: THREE.Mesh[];
  readonly stones: THREE.InstancedMesh;
  /** How far the grids reach from the LM on every side, metres. */
  readonly reach: number;
  /** The grids' square in the site's frame: east from `west` to `east`, south from -`half` to `half`, metres. */
  readonly square: { west: number; east: number; half: number };
  private readonly follower: (x: number, z: number) => void;
  private readonly dx: number;
  private readonly dy: number;
  private readonly terrain: LunarTerrain;

  constructor(data: LunarGroundData) {
    const { terrain, site } = data;
    this.terrain = terrain;
    this.dx = site.centre;
    this.dy = -terrain.height(-site.centre, 0);
    const half = (TERRAIN_INTERVALS / 2) * TERRAIN_SPACING.at(-1)!;
    this.square = { west: this.dx - half, east: this.dx + half, half };
    this.reach = data.ground.reach;
    const material = soil();
    this.meshes = TERRAIN_SPACING.map((_, level) =>
      surface(terrain, level, level === TERRAIN_SPACING.length - 1 ? material.clone() : material, this.dx, this.dy),
    );
    const stones = gravel((x, z) => this.height(x, z));
    this.stones = stones.mesh;
    this.follower = stones.follow;
    this.follow(0, 0);
  }

  /** The ground's height at a place in the site's frame, metres over the LM's ground (the grids', as their triangles are drawn). */
  height(x: number, z: number): number {
    return this.terrain.height(x - this.dx, z) + this.dy;
  }

  /** The stones are laid round a place (the eye, the rover). */
  follow(x: number, z: number): void {
    this.follower(x, z);
  }

  dispose(): void {
    for (const o of [...this.meshes, this.stones]) disposeTree(o);
  }
}
