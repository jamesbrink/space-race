import config from './lunar-rover-sites.json' with { type: 'json' };

export type RoverSite = keyof typeof config.sites;
export const ROVER_SITES = config.sites;
export const TERRAIN_SPACING = config.spacing;
export const TERRAIN_INTERVALS = config.intervals;
const side = TERRAIN_INTERVALS + 1;
const middle = TERRAIN_INTERVALS / 2;

/** Nested square grids on the landing site's tangent plane. The baker stores centimetres above the starting point. */
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
