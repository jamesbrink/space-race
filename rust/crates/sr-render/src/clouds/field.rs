//! Where the cumulus stand over the ground: a field of clouds, each a huddle of turrets, baked once into a texture
//! that tiles. `shaders/clouds.wesl` reads it at every step of its march; its `field_at` is [`near`] written
//! again for a shader that has no texture (the Earth's, for the shadows), and the two must be kept in step.
//!
//! Lengths here are in cells: a cell holds one cloud, or none. How many metres a cell is follows from the day's
//! cover and the size of its clouds ([`lay`]), so more cover is more clouds as well as wider ones.

use std::f32::consts::TAU;

use bevy::asset::RenderAssetUsages;
use bevy::prelude::*;
use bevy::render::render_resource::{Extent3d, TextureDimension, TextureFormat};

use super::volume::repeating;

/// Cells along a side of the tile.
pub const CELLS: u32 = 16;
/// Texels along a side of the texture.
const SIDE: u32 = 1024;
/// Turrets to a cloud.
const TURRETS: u32 = 8;
/// The greatest scaled distance the texture holds: beyond it a point is simply far from any cloud.
pub const FAR: f32 = 10.5;
/// The reach of the largest cloud's turrets from its middle, cells, before the day's cover spreads it.
const FOOT: f32 = 0.2;
/// The widest turret's radius and the narrowest's, as fractions of their cloud's reach.
const WIDE: f32 = 0.5;
const NARROW: f32 = 0.2;
/// How far the outlines are pushed about so that none is a ring of arcs, cells.
const PUSH: f32 = 0.03;
/// One cell in this many has no cloud.
const EMPTY: f32 = 0.3;
/// How much of the sky the clouds cover when every turret is spread `k` times: `GROWS[0] * k + GROWS[1] * k * k`
/// (less than the square alone: the turrets of a cloud overlap more as they widen). Measured from the baked
/// field, and held there by the tests below, to 0.4 of the sky.
const GROWS: [f32; 2] = [0.0205, 0.0077];
/// A cloud's edge, once the noise has cut it, stands about this far inside its outline (as a fraction of a
/// turret's radius). Estimated by eye from below.
const EDGE: f32 = 0.12;
/// The scramble the shader shares: whole numbers in, 32 well-mixed bits out.
#[must_use]
pub fn scramble(x: u32, y: u32, seed: u32) -> u32 {
    let mut h = x.wrapping_mul(0x9E37_79B1) ^ y.wrapping_mul(0x85EB_CA77) ^ seed.wrapping_mul(0x27D4_EB2F);
    h ^= h >> 15;
    h = h.wrapping_mul(0x2C1B_3C6D);
    h ^= h >> 12;
    h = h.wrapping_mul(0x297A_2D39);
    h ^= h >> 15;
    h
}

fn low(h: u32) -> f32 {
    (h & 0xFFFF) as f32 / 65_536.0
}

fn high(h: u32) -> f32 {
    (h >> 16) as f32 / 65_536.0
}

fn wrapped(v: i32, period: u32) -> u32 {
    v.rem_euclid(period as i32) as u32
}

/// Smooth noise on the whole-number lattice, repeating with the tile.
fn lattice(p: Vec2, seed: u32) -> f32 {
    let cell = p.floor();
    let f = p - cell;
    let u = f * f * (Vec2::splat(3.0) - 2.0 * f);
    let corner = |dx: i32, dy: i32| {
        let (x, y) = (wrapped(cell.x as i32 + dx, CELLS * 2), wrapped(cell.y as i32 + dy, CELLS * 2));
        low(scramble(x, y, seed))
    };
    let a = corner(0, 0) + (corner(1, 0) - corner(0, 0)) * u.x;
    let b = corner(0, 1) + (corner(1, 1) - corner(0, 1)) * u.x;
    a + (b - a) * u.y
}

/// What the field says of a point.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Near {
    /// How far the nearest turret's middle is, in that turret's radii: under 1 is inside it, before the day's
    /// cover spreads it.
    pub scaled: f32,
    /// That turret's radius, cells.
    pub radius: f32,
    /// How far gone its cloud is, 0 new to 1 old: an old cloud is ragged.
    pub age: f32,
    /// Where the turret is in its own rise and fall, 0 to 1.
    pub phase: f32,
}

/// The nearest turret to a point, in cells.
#[must_use]
pub fn near(p: Vec2) -> Near {
    let q = p + PUSH * 2.0 * Vec2::new(lattice(p * 2.0, 11) - 0.5, lattice(p * 2.0, 13) - 0.5);
    let cell = q.floor();
    let mut best = Near { scaled: FAR, radius: FOOT * WIDE, age: 0.0, phase: 0.0 };
    for dy in -1..=1 {
        for dx in -1..=1 {
            let (ix, iy) = (cell.x as i32 + dx, cell.y as i32 + dy);
            let (x, y) = (wrapped(ix, CELLS), wrapped(iy, CELLS));
            let (place, vigour) = (scramble(x, y, 1), scramble(x, y, 2));
            if high(vigour) < EMPTY {
                continue;
            }
            let middle =
                Vec2::new(ix as f32, iy as f32) + 0.5 + 0.6 * (Vec2::new(low(place), high(place)) - 0.5);
            // (most clouds are small and a few are large)
            let foot = FOOT * (0.4 + 0.9 * low(vigour).powi(2));
            let age = low(scramble(x, y, 23));
            for turret in 0..TURRETS {
                let (a, b) = (scramble(x, y, 3 + turret), scramble(x, y, 13 + turret));
                // (the first stands in the middle and is the widest; the rest huddle round it)
                let (out, radius) = if turret == 0 {
                    (0.0, WIDE)
                } else {
                    (0.8 * high(a).sqrt(), NARROW + (0.46 - NARROW) * low(b))
                };
                let angle = TAU * low(a);
                let at = middle + foot * out * Vec2::new(angle.cos(), angle.sin());
                let scaled = q.distance(at) / (foot * radius);
                if scaled < best.scaled {
                    best = Near { scaled, radius: foot * radius, age, phase: high(b) };
                }
            }
        }
    }
    best
}

/// How the day's cover lays the field out: how far it spreads every turret, and how many metres a cell is, for
/// clouds `size` metres across covering `cover` of the sky. A cloud of middling vigour, spread, is `size` across.
#[must_use]
pub fn lay(cover: f32, size: f32) -> Vec2 {
    let [a, b] = GROWS;
    let spread = ((a * a + 4.0 * b * cover.clamp(0.0, 0.4)).sqrt() - a) / (2.0 * b) / (1.0 - EDGE);
    // (a cloud of middling vigour reaches 0.625 of FOOT from its middle, and its turrets nine tenths of that)
    Vec2::new(spread, size / (1.11 * FOOT * spread.max(0.05)))
}

/// A number as the two bytes of a half-precision float: what the texture holds, since a byte's 256 steps of
/// distance show from below as rings round every cloud. Good for what is stored here, which is never negative,
/// huge, or too small to matter.
fn half(v: f32) -> [u8; 2] {
    let bits = v.max(0.0).to_bits();
    let exponent = (bits >> 23) as i32 - 127 + 15;
    if exponent <= 0 {
        return [0, 0];
    }
    ((exponent.min(30) as u16) << 10 | ((bits >> 13) & 0x3FF) as u16).to_le_bytes()
}

/// The field as a texture that tiles: red the scaled distance (to [`FAR`]), green the turret's radius in cells,
/// blue its cloud's age, alpha its phase.
#[must_use]
pub fn sheet() -> Image {
    let side = SIDE as usize;
    let mut data = vec![0_u8; side * side * 8];
    std::thread::scope(|scope| {
        for (y, row) in data.chunks_mut(side * 8).enumerate() {
            scope.spawn(move || {
                for (x, texel) in row.chunks_mut(8).enumerate() {
                    let p = Vec2::new(x as f32 + 0.5, y as f32 + 0.5) * (CELLS as f32 / SIDE as f32);
                    let n = near(p);
                    for (bytes, v) in texel.chunks_mut(2).zip([n.scaled, n.radius, n.age, n.phase]) {
                        bytes.copy_from_slice(&half(v));
                    }
                }
            });
        }
    });
    let mut image = Image::new(
        Extent3d { width: SIDE, height: SIDE, depth_or_array_layers: 1 },
        TextureDimension::D2,
        data,
        TextureFormat::Rgba16Float,
        RenderAssetUsages::RENDER_WORLD,
    );
    image.sampler = repeating();
    image
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The fraction of a tile within `spread` radii of a turret.
    fn covered(spread: f32) -> f32 {
        let n = 400;
        let mut inside = 0;
        for i in 0..n * n {
            let p = Vec2::new((i % n) as f32 + 0.5, (i / n) as f32 + 0.5) * (CELLS as f32 / n as f32);
            inside += u32::from(near(p).scaled < spread);
        }
        inside as f32 / (n * n) as f32
    }

    #[test]
    fn a_half_holds_what_it_is_given() {
        assert_eq!(half(1.0), 0x3C00_u16.to_le_bytes());
        assert_eq!(half(0.5), 0x3800_u16.to_le_bytes());
        assert_eq!(half(6.0), 0x4600_u16.to_le_bytes());
        assert_eq!(half(0.0), [0, 0]);
    }

    #[test]
    fn it_tiles() {
        for &(x, y) in &[(0.3, 5.2), (15.9, 0.1), (7.7, 15.95)] {
            let p = Vec2::new(x, y);
            assert!((near(p).scaled - near(p + Vec2::new(CELLS as f32, 0.0)).scaled).abs() < 1.0e-3);
            assert!((near(p).scaled - near(p - Vec2::new(0.0, CELLS as f32)).scaled).abs() < 1.0e-3);
        }
    }

    #[test]
    fn the_day_s_cover_is_what_the_field_covers() {
        for cover in [0.05, 0.1, 0.25, 0.4] {
            // (the outline the noise cuts back from; the gathering, whose mean is 1, left out)
            let got = covered(lay(cover, 1500.0).x * (1.0 - EDGE));
            assert!((got - cover).abs() < 0.1 * cover, "{cover} of the sky asked for, {got} covered");
        }
    }
}
