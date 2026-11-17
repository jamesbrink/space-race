/**
 * The sea inside a spacecraft afloat (sim/afloat.ts): in each space of the body that can be seen into (the cabin,
 * through its open hatch and from the seat), the water's surface where the run has it, level as the water stands while
 * the body heels round it. Drawn in the flown model's frame: the surface is where the plane at the run's level (over the
 * hull's lowest point, along its normal at the run's `slant`) meets the space's wall, all round, a fan of triangles. A
 * space with no water in it, or full to its top, has no surface and draws none. Nothing here knows a spacecraft: the
 * spaces and which can be seen are the flight's data.
 */
import * as THREE from 'three';
import { type AfloatSample, Solid } from '../sim/afloat.ts';
import type { AfloatDef, SpaceDef } from '../types.ts';

/** Points round the rim each surface is drawn with. */
const ROUND = 72;
/** Water this near nothing, or this near full, m^3, has no surface to draw. */
const NONE = 1e-4;

/** The sea seen inside: a little greener and darker than the sea outside, as water in a shaded space. Estimated, for the look. */
const COLOUR = 0x1f4f58;
/** How much of what is behind it the water's surface hides: chosen, for the look. */
const OPACITY = 0.8;

export class Flooding {
  readonly group = new THREE.Group();
  private readonly surfaces: { space: SpaceDef; index: number; whole: number; mesh: THREE.Mesh }[] = [];
  private readonly material = new THREE.MeshStandardMaterial({
    name: 'sea-inside',
    color: COLOUR,
    roughness: 0.12,
    metalness: 0,
    side: THREE.DoubleSide,
    // (a little of what is under it seen through, as through water a foot deep: the couch, the floor)
    transparent: true,
    opacity: OPACITY,
    depthWrite: false,
  });
  private readonly datum: number;

  /** `seen`: the ids of the spaces whose water is drawn. */
  constructor(body: AfloatDef, seen: readonly string[]) {
    this.group.name = 'sea-inside';
    this.datum = body.datum.value;
    body.spaces.forEach((space, index) => {
      if (!seen.includes(space.id)) return;
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array((ROUND + 1) * 3), 3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array((ROUND + 1) * 3), 3));
      const fan: number[] = [];
      for (let i = 0; i < ROUND; i++) fan.push(ROUND, i, (i + 1) % ROUND);
      geometry.setIndex(fan);
      const mesh = new THREE.Mesh(geometry, this.material);
      mesh.name = `sea-inside:${space.id}`;
      mesh.frustumCulled = false;
      mesh.visible = false;
      mesh.raycast = () => {};
      this.group.add(mesh);
      this.surfaces.push({ space, index, whole: new Solid(space.shape, space.free.value).whole, mesh });
    });
  }

  /**
   * Draw each surface as the body afloat stands in `now` (null: not afloat, none drawn). The model's frame is the
   * flown model's: its origin `datum` up the long axis (+Y) from the hull's lowest point, +X the side it heels toward.
   * True if anything drawn changed.
   */
  set(now: AfloatSample | null): boolean {
    let changed = false;
    for (const s of this.surfaces) {
      const water = now?.water[s.index] ?? 0;
      const shown = now !== null && water > NONE && water < s.whole - NONE;
      if (shown !== s.mesh.visible) changed = true;
      s.mesh.visible = shown;
      if (!shown || !now) continue;
      this.lay(s.mesh, s.space, now.levels[s.index]!, now.slant);
      changed = true;
    }
    return changed;
  }

  /**
   * The plane `level` m over the lowest point along its normal, heeled `slant` (its +X side down), where it meets the
   * space's wall: round each bearing from +X, the height up the axis at which the wall (radius r(h), straight between the
   * profile's heights) stands on the plane, h cos(slant) - r(h) cos(round) sin(slant) = level, found by halving, held to
   * the space's ends.
   */
  private lay(mesh: THREE.Mesh, space: SpaceDef, level: number, slant: number): void {
    const profile = space.shape;
    const bottom = profile[0]![0];
    const top = profile[profile.length - 1]![0];
    const radius = (h: number) => {
      let i = 1;
      while (i < profile.length - 1 && profile[i]![0] < h) i++;
      const [z0, r0] = profile[i - 1]!;
      const [z1, r1] = profile[i]!;
      return z1 > z0 ? r0 + ((r1 - r0) * (Math.min(Math.max(h, z0), z1) - z0)) / (z1 - z0) : r1;
    };
    const [c, s] = [Math.cos(slant), Math.sin(slant)];
    const position = mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const normal = mesh.geometry.getAttribute('normal') as THREE.BufferAttribute;
    let [sx, sy, sz] = [0, 0, 0];
    for (let i = 0; i < ROUND; i++) {
      const round = (2 * Math.PI * i) / ROUND;
      const cos = Math.cos(round);
      const at = (h: number) => h * c - radius(h) * cos * s - level;
      let [lo, hi] = [bottom, top];
      if (at(lo) >= 0) hi = lo;
      else if (at(hi) <= 0) lo = hi;
      else
        for (let k = 0; k < 40; k++) {
          const mid = (lo + hi) / 2;
          if (at(mid) < 0) lo = mid;
          else hi = mid;
        }
      const h = (lo + hi) / 2;
      const r = radius(h);
      // (the model's frame: +X out toward the side it heels to, +Y up its axis from its origin, +Z round)
      const [x, y, z] = [r * cos, h - this.datum, r * Math.sin(round)];
      position.setXYZ(i, x, y, z);
      [sx, sy, sz] = [sx + x, sy + y, sz + z];
    }
    position.setXYZ(ROUND, sx / ROUND, sy / ROUND, sz / ROUND);
    // (the plane's normal in the model's frame: up the apparent level's normal, which leans toward -X as its +X side goes down)
    for (let i = 0; i <= ROUND; i++) normal.setXYZ(i, -s, c, 0);
    position.needsUpdate = true;
    normal.needsUpdate = true;
    mesh.geometry.computeBoundingSphere();
  }

  dispose(): void {
    for (const s of this.surfaces) s.mesh.geometry.dispose();
    this.material.dispose();
  }
}
