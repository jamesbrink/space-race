//! Noise that tiles, made on the processor once at startup: what the surfaces' wear and the clouds are cut from.

/// A hash of a lattice point to [0, 1).
#[must_use]
pub fn hash(x: u32, y: u32, z: u32, seed: u32) -> f32 {
    let mut h = x.wrapping_mul(0x9E37_79B1)
        ^ y.wrapping_mul(0x85EB_CA77)
        ^ z.wrapping_mul(0xC2B2_AE3D)
        ^ seed.wrapping_mul(0x27D4_EB2F);
    h ^= h >> 15;
    h = h.wrapping_mul(0x2C1B_3C6D);
    h ^= h >> 12;
    h = h.wrapping_mul(0x297A_2D39);
    h ^= h >> 15;
    (h >> 8) as f32 / 16_777_216.0
}

fn fade(t: f32) -> f32 {
    t * t * t * (t * (t * 6.0 - 15.0) + 10.0)
}

fn lerp(a: f32, b: f32, t: f32) -> f32 {
    a + (b - a) * t
}

/// Smooth value noise in [0, 1] that repeats every `period` cells along each axis.
#[must_use]
pub fn value(p: [f32; 3], period: u32, seed: u32) -> f32 {
    let cell = p.map(f32::floor);
    let f = [fade(p[0] - cell[0]), fade(p[1] - cell[1]), fade(p[2] - cell[2])];
    let wrap = |v: f32, d: u32| (v as i64 + i64::from(d)).rem_euclid(i64::from(period)) as u32;
    let corner =
        |dx: u32, dy: u32, dz: u32| hash(wrap(cell[0], dx), wrap(cell[1], dy), wrap(cell[2], dz), seed);
    let x00 = lerp(corner(0, 0, 0), corner(1, 0, 0), f[0]);
    let x10 = lerp(corner(0, 1, 0), corner(1, 1, 0), f[0]);
    let x01 = lerp(corner(0, 0, 1), corner(1, 0, 1), f[0]);
    let x11 = lerp(corner(0, 1, 1), corner(1, 1, 1), f[0]);
    lerp(lerp(x00, x10, f[1]), lerp(x01, x11, f[1]), f[2])
}

/// Several octaves of [`value`], each twice as fine and half as strong, in [0, 1]; `p` in [0, 1) is one tile.
#[must_use]
pub fn fbm(p: [f32; 3], cells: u32, octaves: u32, seed: u32) -> f32 {
    let (mut sum, mut weight, mut total) = (0.0, 0.5, 0.0);
    for octave in 0..octaves {
        let n = cells << octave;
        sum += weight * value(p.map(|v| v * n as f32), n, seed + octave);
        total += weight;
        weight *= 0.5;
    }
    sum / total
}

/// Worley noise: 1 at a cell's feature point falling to 0 at the cell's edge; `p` in [0, 1) is one tile of
/// `cells` cells a side. Billows, when octaves of it are summed.
#[must_use]
pub fn worley(p: [f32; 3], cells: u32, seed: u32) -> f32 {
    let q = p.map(|v| v * cells as f32);
    let cell = q.map(f32::floor);
    let mut nearest = f32::MAX;
    for dz in -1..=1_i32 {
        for dy in -1..=1_i32 {
            for dx in -1..=1_i32 {
                let c = [cell[0] as i32 + dx, cell[1] as i32 + dy, cell[2] as i32 + dz];
                let w = c.map(|v| v.rem_euclid(cells as i32) as u32);
                let point = [
                    c[0] as f32 + hash(w[0], w[1], w[2], seed),
                    c[1] as f32 + hash(w[0], w[1], w[2], seed + 1),
                    c[2] as f32 + hash(w[0], w[1], w[2], seed + 2),
                ];
                let d = (0..3).map(|i| (point[i] - q[i]).powi(2)).sum::<f32>();
                nearest = nearest.min(d);
            }
        }
    }
    1.0 - nearest.sqrt().min(1.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn it_tiles() {
        for &(x, y) in &[(0.13, 0.4), (0.77, 0.02)] {
            assert!((fbm([0.0, x, y], 4, 3, 7) - fbm([1.0, x, y], 4, 3, 7)).abs() < 1e-4);
            assert!((worley([x, 0.0, y], 4, 7) - worley([x, 1.0, y], 4, 7)).abs() < 1e-4);
        }
    }

    #[test]
    fn it_stays_in_range() {
        for i in 0..200 {
            let p = [hash(i, 0, 0, 1), hash(i, 1, 0, 1), hash(i, 2, 0, 1)];
            assert!((0.0..=1.0).contains(&fbm(p, 4, 4, 3)));
            assert!((0.0..=1.0).contains(&worley(p, 6, 3)));
        }
    }
}
