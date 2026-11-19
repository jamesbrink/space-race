//! Which water is the open sea, and how far everything is from it: worked out once from the region's shore map.
//!
//! The shore map says only how far a point is from the nearest water's edge, out to a few hundred metres, and not
//! what water: but a beach with surf and a dune behind it faces the ocean, a marsh faces a lagoon, and the old
//! beach ridges of a cape run parallel to the ocean's shore for kilometres inland. So the water is sorted here:
//! the open sea is the largest body of water that is wide everywhere (an inlet too narrow to be wide closes it
//! off, so a lagoon behind a barrier island is not the sea), and two distances are kept for every point, to the
//! open sea's shore and to enclosed water. Derived from the map, not surveyed: an inlet wider than [`WIDE`]
//! twice over lets the sea in.

use bevy::asset::RenderAssetUsages;
use bevy::prelude::*;
use bevy::render::render_resource::{Extent3d, TextureDimension, TextureFormat};

/// How many of the shore map's texels go to one of this map's, each way.
const COARSER: usize = 4;
/// Water at least this far from any shore is wide, in the shore map's texels (of the eight it keeps).
const WIDE: f32 = 6.0;
/// How far back toward its shores the open sea is then carried, in this map's texels.
const BACK: u32 = 4;
/// No distance is kept past this, m: far enough for a cape's width.
const FARTHEST: f32 = 60_000.0;

/// The two distances, on a grid.
pub struct Coast {
    /// Texels a side.
    pub size: usize,
    /// Metres from the open sea's shore: positive on the land and on enclosed water, negative out at sea.
    pub ocean: Vec<f32>,
    /// Metres from the nearest enclosed water (a lagoon, a river, a lake); zero in it.
    pub enclosed: Vec<f32>,
}

/// Sorts a shore map's water. `field` is the map as it is kept (a byte a texel, 128 the shore, land above), `size`
/// its texels a side, `spread` the texels it keeps a distance over, `metres` the ground to one texel.
#[must_use]
pub fn sort(field: &[u8], size: usize, spread: f32, metres: f32) -> Coast {
    let n = size / COARSER;
    let inland = |x: usize, y: usize| {
        let texel = field[(y * COARSER + COARSER / 2) * size + x * COARSER + COARSER / 2];
        (f32::from(texel) - 128.0) / 127.0 * spread
    };
    let mut water = vec![false; n * n];
    let mut wide = vec![false; n * n];
    for y in 0..n {
        for x in 0..n {
            let d = inland(x, y);
            water[y * n + x] = d < 0.0;
            wide[y * n + x] = d < -WIDE;
        }
    }
    let open = carried_back(&largest(&wide, n), &water, n);
    let step = metres * COARSER as f32;
    let to_open = distances(&open, n);
    let shut: Vec<bool> = open.iter().map(|o| !o).collect();
    let to_shore = distances(&shut, n);
    let enclosed: Vec<bool> = water.iter().zip(&open).map(|(w, o)| *w && !o).collect();
    let to_enclosed = distances(&enclosed, n);
    // (a texel's middle is half a texel inside its own edge)
    let ocean = to_open
        .iter()
        .zip(&to_shore)
        .map(|(inland, out)| if *inland > 0.0 { (inland - 0.5) * step } else { -(out - 0.5) * step })
        .map(|d| d.clamp(-FARTHEST, FARTHEST))
        .collect();
    let enclosed = to_enclosed.iter().map(|d| ((d - 0.5).max(0.0) * step).min(FARTHEST)).collect();
    Coast { size: n, ocean, enclosed }
}

/// The largest connected body of `set` cells.
fn largest(set: &[bool], n: usize) -> Vec<bool> {
    let mut body = vec![0_u32; n * n];
    let (mut best, mut most, mut bodies) = (0, 0, 0);
    let mut queue = Vec::new();
    for start in 0..n * n {
        if !set[start] || body[start] != 0 {
            continue;
        }
        bodies += 1;
        body[start] = bodies;
        queue.push(start);
        let mut count = 0;
        while let Some(at) = queue.pop() {
            count += 1;
            for next in neighbours(at, n) {
                if set[next] && body[next] == 0 {
                    body[next] = bodies;
                    queue.push(next);
                }
            }
        }
        if count > most {
            (best, most) = (bodies, count);
        }
    }
    body.iter().map(|b| best != 0 && *b == best).collect()
}

/// A body of wide water carried back toward its shores through the water round it.
fn carried_back(core: &[bool], water: &[bool], n: usize) -> Vec<bool> {
    let mut open = core.to_vec();
    let mut edge: Vec<usize> = (0..n * n).filter(|at| core[*at]).collect();
    for _ in 0..BACK {
        let mut next_edge = Vec::new();
        for at in edge {
            for next in neighbours(at, n) {
                if water[next] && !open[next] {
                    open[next] = true;
                    next_edge.push(next);
                }
            }
        }
        edge = next_edge;
    }
    open
}

fn neighbours(at: usize, n: usize) -> impl Iterator<Item = usize> {
    let (x, y) = (at % n, at / n);
    [
        (x > 0).then(|| at - 1),
        (x + 1 < n).then(|| at + 1),
        (y > 0).then(|| at - n),
        (y + 1 < n).then(|| at + n),
    ]
    .into_iter()
    .flatten()
}

/// The distance from every cell to the nearest `set` cell, in cells: exact (Felzenszwalb and Huttenlocher 2012,
/// "Distance Transforms of Sampled Functions"), a pass along the columns and a pass along the rows.
fn distances(set: &[bool], n: usize) -> Vec<f32> {
    let far = (2 * n * n) as f32;
    let mut squared: Vec<f32> = set.iter().map(|s| if *s { 0.0 } else { far }).collect();
    let mut line = vec![0.0; n];
    let mut out = vec![0.0; n];
    for x in 0..n {
        for y in 0..n {
            line[y] = squared[y * n + x];
        }
        along(&line, &mut out);
        for y in 0..n {
            squared[y * n + x] = out[y];
        }
    }
    for row in squared.chunks_mut(n) {
        along(row, &mut out);
        row.copy_from_slice(&out);
    }
    squared.iter().map(|d| d.sqrt()).collect()
}

/// One line of the transform: the lower envelope of the parabolas standing on `f`.
fn along(f: &[f32], out: &mut [f32]) {
    let n = f.len();
    let mut vertex = vec![0_usize; n];
    let mut from = vec![0.0_f32; n + 1];
    let mut k = 0;
    from[0] = f32::NEG_INFINITY;
    from[1] = f32::INFINITY;
    let meet = |p: usize, q: usize| {
        ((f[q] + (q * q) as f32) - (f[p] + (p * p) as f32)) / (2.0 * (q as f32 - p as f32))
    };
    for q in 1..n {
        let mut s = meet(vertex[k], q);
        while s <= from[k] && k > 0 {
            k -= 1;
            s = meet(vertex[k], q);
        }
        k += 1;
        vertex[k] = q;
        from[k] = s;
        from[k + 1] = f32::INFINITY;
    }
    k = 0;
    for (q, value) in out.iter_mut().enumerate() {
        while from[k + 1] < q as f32 {
            k += 1;
        }
        let d = q as f32 - vertex[k] as f32;
        *value = d * d + f[vertex[k]];
    }
}

/// A number as sixteen bits of floating point (IEEE 754 binary16), cut short, for a texture that can be filtered.
fn half(value: f32) -> u16 {
    let bits = value.to_bits();
    let sign = ((bits >> 16) & 0x8000) as u16;
    let exponent = ((bits >> 23) & 0xff) as i32 - 127 + 15;
    if exponent <= 0 {
        return sign;
    }
    if exponent >= 31 {
        return sign | 0x7c00;
    }
    sign | ((exponent as u16) << 10) | ((bits & 0x007f_ffff) >> 13) as u16
}

impl Coast {
    /// The two distances at a place on the map, each from 0 to 1 across it and down it: the open sea's, then the
    /// enclosed water's, between the texels as a texture is read.
    #[must_use]
    pub fn at(&self, uv: Vec2) -> (f32, f32) {
        let n = self.size;
        let at = (uv * n as f32 - 0.5).clamp(Vec2::ZERO, Vec2::splat(n as f32 - 1.001));
        let (x, y) = (at.x as usize, at.y as usize);
        let f = at - at.floor();
        let read = |field: &[f32]| {
            let row = |y: usize| field[y * n + x] + (field[y * n + x + 1] - field[y * n + x]) * f.x;
            row(y) + (row(y + 1) - row(y)) * f.y
        };
        (read(&self.ocean), read(&self.enclosed))
    }

    /// The two distances as a texture: red the open sea's, green the enclosed water's, rows as the shore map's.
    #[must_use]
    pub fn image(&self) -> Image {
        let mut data = Vec::with_capacity(self.size * self.size * 4);
        for (ocean, enclosed) in self.ocean.iter().zip(&self.enclosed) {
            data.extend_from_slice(&half(*ocean).to_le_bytes());
            data.extend_from_slice(&half(*enclosed).to_le_bytes());
        }
        Image::new(
            Extent3d { width: self.size as u32, height: self.size as u32, depth_or_array_layers: 1 },
            TextureDimension::D2,
            data,
            TextureFormat::Rg16Float,
            RenderAssetUsages::RENDER_WORLD,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// A map 256 texels a side: land to the west of column 128, sea to the east, a lake 24 texels square in the
    /// land, each texel holding its distance to the nearest shore as the tool would.
    fn map() -> Vec<u8> {
        let size = 256_i32;
        let mut field = Vec::new();
        for y in 0..size {
            for x in 0..size {
                let to_sea = (128 - x) as f32;
                let (dx, dy) = ((x - 52).abs() - 12, (y - 128).abs() - 12);
                let to_lake = if dx.max(dy) < 0 {
                    dx.max(dy) as f32
                } else {
                    (dx.max(0) as f32).hypot(dy.max(0) as f32)
                };
                let inland = to_sea.min(to_lake).clamp(-8.0, 8.0);
                field.push((128.0 + inland / 8.0 * 127.0).round() as u8);
            }
        }
        field
    }

    #[test]
    fn a_lake_is_not_the_sea() {
        let coast = sort(&map(), 256, 8.0, 10.0);
        assert_eq!(coast.size, 64);
        let at = |x: usize, y: usize| (coast.ocean[y * 64 + x], coast.enclosed[y * 64 + x]);
        // In the lake's middle: enclosed water, 19 texels (760 m) inland of the sea's shore.
        let (ocean, enclosed) = at(13, 32);
        assert!(enclosed == 0.0 && (ocean - 740.0).abs() < 40.0, "{ocean} {enclosed}");
        // Out at sea: 16 texels (640 m) off, and far from the lake.
        let (ocean, enclosed) = at(48, 10);
        assert!((ocean + 640.0).abs() < 40.0 && enclosed > 1000.0, "{ocean} {enclosed}");
        // On the land by the sea's shore.
        let (ocean, _) = at(30, 5);
        assert!((ocean - 60.0).abs() < 40.0, "{ocean}");
    }

    #[test]
    fn halves_are_ieee() {
        assert_eq!(half(1.0), 0x3c00);
        assert_eq!(half(-2.0), 0xc000);
        assert_eq!(half(0.0), 0);
        assert_eq!(half(1.0e9), 0x7c00);
    }
}
