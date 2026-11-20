import rovers from './lunar-rover-sites.json' with { type: 'json' };
import lunar from './lunar-sites.json' with { type: 'json' };

/** A landing site on the Moon by its id: written from missions/usa/places/moon/ (tools/lunar-sites.mjs), its terrain under public/lunar/. */
export type LunarSite = keyof typeof lunar.sites;
export const LUNAR_SITES = lunar.sites;
export type RoverSite = keyof typeof rovers.sites;
/** A rover's site: where it is (`landing`, `label`: the site's own figures) and what its gallery scene shows there. */
export const ROVER_SITES = Object.fromEntries(
  Object.entries(rovers.sites).map(([id, rover]) => {
    const site = lunar.sites[id as LunarSite];
    return [id, { ...rover, landing: site.landing, label: site.name }];
  }),
) as { [K in RoverSite]: (typeof rovers.sites)[K] & { landing: number[]; label: string } };
export const TERRAIN_SPACING = lunar.spacing;
export const TERRAIN_INTERVALS = lunar.intervals;
const side = TERRAIN_INTERVALS + 1;
const middle = TERRAIN_INTERVALS / 2;

/**
 * Nested square grids on the landing site's tangent plane, centred `centre` metres east of the LM (lunar-sites.json). The baker
 * (tools/lunar-terrain.py) stores centimetres above the grids' centre, the curvature of the horizon kept.
 */
export class LunarTerrain {
  readonly levels: Float32Array[];

  constructor(file: ArrayBuffer) {
    const samples = new Int32Array(file);
    if (samples.length !== side * side * TERRAIN_SPACING.length) throw new Error('Incomplete lunar terrain');
    this.levels = TERRAIN_SPACING.map((_, i) =>
      Float32Array.from(samples.subarray(i * side * side, (i + 1) * side * side), (n) => n / 100),
    );
    // Match the straight edges of the coarser triangles exactly where the finer mesh ends.
    for (let l = this.levels.length - 2; l >= 0; l--) {
      const heights = this.levels[l]!;
      const step = TERRAIN_SPACING[l]!;
      const edge = middle * step;
      for (let i = 0; i < side; i++) {
        const p = (i - middle) * step;
        heights[i] = this.onGrid(l + 1, p, -edge);
        heights[(side - 1) * side + i] = this.onGrid(l + 1, p, edge);
        heights[i * side] = this.onGrid(l + 1, -edge, p);
        heights[i * side + side - 1] = this.onGrid(l + 1, edge, p);
      }
    }
  }

  private onGrid(level: number, x: number, z: number): number {
    const step = TERRAIN_SPACING[level]!;
    const u = Math.min(side - 1, Math.max(0, x / step + middle));
    const v = Math.min(side - 1, Math.max(0, z / step + middle));
    const i = Math.min(side - 2, Math.floor(u));
    const j = Math.min(side - 2, Math.floor(v));
    const dx = u - i;
    const dz = v - j;
    const p = j * side + i;
    const h = this.levels[level]!;
    // Same two triangles as the rendered quad, including its diagonal.
    if (dx + dz <= 1) return h[p]! * (1 - dx - dz) + h[p + 1]! * dx + h[p + side]! * dz;
    return h[p + side + 1]! * (dx + dz - 1) + h[p + 1]! * (1 - dz) + h[p + side]! * (1 - dx);
  }

  height(x: number, z: number): number {
    const reach = Math.max(Math.abs(x), Math.abs(z));
    const level = TERRAIN_SPACING.findIndex((step) => reach <= middle * step);
    return this.onGrid(level < 0 ? this.levels.length - 1 : level, x, z);
  }
}
