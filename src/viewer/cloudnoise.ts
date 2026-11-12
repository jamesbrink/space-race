/**
 * The clouds' two tiles of noise, as numbers: no three, no page, so that a worker can make them while the page loads
 * (cloudnoise.worker.ts) and the page itself can where there is no worker, or it is wanted this instant (clouds.ts).
 * The same code either way, so the same bytes: tests/cloudnoise.test.mjs holds their digests.
 */
import { hash2 } from './field.ts';

/** Texels a side of the billows' tile. */
export const NOISE = 64;
/** Texels a side of the detail's tile. */
export const DETAIL_SIDE = 64;

/**
 * The billows: three octaves of round lumps (cellular noise made into balls: 1 at a lump's heart,
 * falling to 0 in the creases between), 5, 11 and 23 to a tile, in red, green and blue; each has a
 * mean of 0.54 (LUMPS). It repeats every NOISE texels. Made a few slices at a time (about 170 ms in all):
 * `CloudPass.warm` has it made before anyone is looking. RGBA, a texel after another, x fastest.
 */
export function* billowsData(): Generator<void, Uint8Array<ArrayBuffer>> {
  const n = NOISE;
  const data = new Uint8Array(n * n * n * 4);
  for (const [channel, cells] of [5, 11, 23].entries()) {
    const points = new Float32Array(cells * cells * cells * 3);
    for (let i = 0; i < cells; i++)
      for (let j = 0; j < cells; j++)
        for (let k = 0; k < cells; k++) {
          const at = ((i * cells + j) * cells + k) * 3;
          for (let a = 0; a < 3; a++) points[at + a] = hash2(i * cells + j, k, 700 + channel * 3 + a);
        }
    const per = n / cells; // texels a cell
    const wrap = (c: number) => ((c % cells) + cells) % cells;
    for (let z = 0; z < n; z++) {
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const px = (x + 0.5) / per,
            py = (y + 0.5) / per,
            pz = (z + 0.5) / per;
          const cx = Math.floor(px),
            cy = Math.floor(py),
            cz = Math.floor(pz);
          let best = 9;
          for (let dz = -1; dz <= 1; dz++)
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++) {
                const at = ((wrap(cx + dx) * cells + wrap(cy + dy)) * cells + wrap(cz + dz)) * 3;
                const ex = cx + dx + points[at]! - px,
                  ey = cy + dy + points[at + 1]! - py,
                  ez = cz + dz + points[at + 2]! - pz;
                best = Math.min(best, ex * ex + ey * ey + ez * ez);
              }
          data[((z * n + y) * n + x) * 4 + channel] = Math.round(255 * Math.sqrt(Math.max(0, 1 - best * 2.2))); // a ball, not a cone
        }
      if (z % 8 === 7) yield; // (a slice at a time, so whoever is waiting can let the page breathe)
    }
  }
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  return data;
}

/**
 * The detail that wears a cloud's skin: the same round lumps, finer (4, 8 and 16 to a tile of DETAIL_TILE metres:
 * 64, 32 and 16 m), added into one value, 1 at a lump's heart and 0 in a crease; its mean is about 0.54 too. It
 * repeats every DETAIL_SIDE texels. Made a few slices at a time, as the billows are. One byte a texel.
 */
export function* detailData(): Generator<void, Uint8Array<ArrayBuffer>> {
  const n = DETAIL_SIDE;
  const sum = new Float32Array(n * n * n);
  for (const [octave, [cells, weight]] of (
    [
      [4, 0.42],
      [8, 0.33],
      [16, 0.25],
    ] as const
  ).entries()) {
    const points = new Float32Array(cells * cells * cells * 3);
    for (let i = 0; i < cells; i++)
      for (let j = 0; j < cells; j++)
        for (let k = 0; k < cells; k++) {
          const at = ((i * cells + j) * cells + k) * 3;
          for (let a = 0; a < 3; a++) points[at + a] = hash2(i * cells + j, k, 900 + octave * 3 + a);
        }
    const per = n / cells; // texels a cell
    const wrap = (c: number) => ((c % cells) + cells) % cells;
    for (let z = 0; z < n; z++) {
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          const px = (x + 0.5) / per,
            py = (y + 0.5) / per,
            pz = (z + 0.5) / per;
          const cx = Math.floor(px),
            cy = Math.floor(py),
            cz = Math.floor(pz);
          let best = 9;
          for (let dz = -1; dz <= 1; dz++)
            for (let dy = -1; dy <= 1; dy++)
              for (let dx = -1; dx <= 1; dx++) {
                const at = ((wrap(cx + dx) * cells + wrap(cy + dy)) * cells + wrap(cz + dz)) * 3;
                const ex = cx + dx + points[at]! - px,
                  ey = cy + dy + points[at + 1]! - py,
                  ez = cz + dz + points[at + 2]! - pz;
                best = Math.min(best, ex * ex + ey * ey + ez * ez);
              }
          sum[(z * n + y) * n + x]! += weight * Math.sqrt(Math.max(0, 1 - best * 2.2));
        }
      if (z % 8 === 7) yield;
    }
  }
  const data = new Uint8Array(n * n * n);
  for (let i = 0; i < data.length; i++) data[i] = Math.round(255 * sum[i]!);
  return data;
}
