//! Where the cumulus stand over the ground: a field of clouds, each a huddle of turrets, baked once into a texture
//! that tiles. `shaders/clouds.wesl` reads it at every step of its march, and the Earth's shader reads the same
//! sheet for the clouds' shadows, through `shaders/clouds_cover.wesl`.
//!
//! Lengths here are in cells: a cell holds one cloud, or none. How many metres a cell is follows from the day's
//! cover and the size of its clouds ([`lay`]), so more cover is more clouds as well as wider ones.
//!
//! A fair-weather field is not a lattice: there are many scraps and few big clouds, and they stand in clumps and
//! in streets along the wind with clear air between. Here each cloud's size is drawn from a steep law; the clumps
//! and streets are the shader's (`clouds_cover.wesl` `gather`), which spreads the turrets more in some places and
//! less in others with noise that never repeats, and lays the sheet's first axis along the day's wind.

use std::f32::consts::TAU;

use bevy::asset::RenderAssetUsages;
use bevy::prelude::*;
use bevy::render::render_resource::{Extent3d, TextureDimension, TextureFormat};

use super::volume::repeating;

/// Cells along a side of the tile.
pub const CELLS: u32 = 16;
/// Texels along a side of the texture.
pub const SIDE: u32 = 1024;
/// Turrets to a cloud: a scrap has the first, and a cloud of size 1 the second.
const TURRETS: [f32; 2] = [5.5, 12.0];
/// How far a cloud's turrets stand from its middle at most, as a fraction of its reach: a scrap's, and a cloud of size
/// 1's. Estimated: a small cumulus is one dome, a big one a heap of them.
const HUDDLE: [f32; 2] = [0.4, 0.8];
/// A big cloud is a heap of turrets narrower for its size than a scrap's: the turrets of a cloud of size 1 are this
/// much of a scrap's, against their cloud's reach. Estimated: a cumulus' towers are a few hundred metres across
/// whatever its size.
const NARROWER: f32 = 0.55;
/// The greatest scaled distance the texture holds: beyond it a point is simply far from any cloud.
pub const FAR: f32 = 10.5;
/// The reach of a cloud's turrets from its middle, cells, for a cloud of size 1 before the day's cover spreads it.
const FOOT: f32 = 0.26;
/// The widest turret's radius and the narrowest's, as fractions of their cloud's reach.
const WIDE: f32 = 0.5;
const NARROW: f32 = 0.2;
/// How far the outlines are pushed about so that none is a ring of arcs, cells.
const PUSH: f32 = 0.03;
/// The clear way is never taken to be longer than this, cells: a cloud in a cell beyond those looked at may be as
/// near as that.
const CLEAR_MOST: f32 = 2.0;
/// Cells looked at round a point's own, each way: the biggest cloud, spread, reaches three cells from its middle.
const SEARCH: i32 = 3;
/// The sizes of clouds: `SMALLEST + (1 - SMALLEST) * u^STEEP` for `u` even between 0 and 1, so most are scraps and
/// a few are big. Estimated: fair-weather cumulus fields are photographed so, and their sizes are measured to
/// follow a power law (many small, few large).
const SMALLEST: f32 = 0.22;
const STEEP: f32 = 3.0;
/// A cloud of this size (as above) is the day's `size` across: about the biggest one in
/// five. Estimated, as the record's `size` is "a cloud as photographed".
const TYPICAL: f32 = 0.65;
/// One cell in this many has no cloud.
const EMPTY: f32 = 0.3;
/// How much of the sky the clouds cover when every turret is spread `k` times: `GROWS[0] * k + GROWS[1] * k * k`
/// (less than the square alone: the turrets of a cloud overlap more as they widen). Measured from the baked
/// field, and held there by the tests below, to [`MOST`].
pub const GROWS: [f32; 2] = [0.0077, 0.00327];
/// The most of the sky the field is laid out to cover: past it the clear lanes between the streets would have to
/// fill, which they are not baked to do (a day with more cumulus than this needs the field's emptiness to follow its
/// cover).
pub const MOST: f32 = 0.22;
/// The spread the clear way round a place is baked for: about the most a day's turrets are spread, so that the march
/// can stride as far as it says (`clouds_cover.wesl` `column`).
pub const OPEN_AT: f32 = 5.0;
/// A cloud's edge, once the noise has cut it, stands about this far inside its outline (as a fraction of a
/// turret's radius). Estimated by eye from below.
pub const EDGE: f32 = 0.12;

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

/// Smooth noise on the whole-number lattice, repeating every `period` along each axis.
fn lattice(p: Vec2, period: UVec2, seed: u32) -> f32 {
    let cell = p.floor();
    let f = p - cell;
    let u = f * f * (Vec2::splat(3.0) - 2.0 * f);
    let corner = |dx: i32, dy: i32| {
        let (x, y) = (wrapped(cell.x as i32 + dx, period.x), wrapped(cell.y as i32 + dy, period.y));
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
    /// How far the point is from the edge of every turret spread [`OPEN_AT`] times, cells (0 inside one).
    pub clear: f32,
}

/// One cloud of a cell, if it has one: its middle, its size and its age.
fn cloud(ix: i32, iy: i32) -> Option<(Vec2, f32, f32)> {
    let (x, y) = (wrapped(ix, CELLS), wrapped(iy, CELLS));
    let (place, vigour) = (scramble(x, y, 1), scramble(x, y, 2));
    if high(vigour) < EMPTY {
        return None;
    }
    let middle = Vec2::new(ix as f32, iy as f32) + 0.5 + 0.8 * (Vec2::new(low(place), high(place)) - 0.5);
    let size = SMALLEST + (1.0 - SMALLEST) * low(vigour).powf(STEEP);
    Some((middle, size, low(scramble(x, y, 23))))
}

/// The nearest turret to a point, in cells.
#[must_use]
pub fn near(p: Vec2) -> Near {
    let per = UVec2::splat(CELLS * 2);
    let q = p + PUSH * 2.0 * Vec2::new(lattice(p * 2.0, per, 11) - 0.5, lattice(p * 2.0, per, 13) - 0.5);
    let cell = q.floor();
    let mut best = Near { scaled: FAR, radius: FOOT * WIDE, age: 0.0, clear: FAR };
    for dy in -SEARCH..=SEARCH {
        for dx in -SEARCH..=SEARCH {
            let (ix, iy) = (cell.x as i32 + dx, cell.y as i32 + dy);
            let Some((middle, size, age)) = cloud(ix, iy) else { continue };
            let foot = FOOT * size;
            let big = (size - SMALLEST) / (1.0 - SMALLEST);
            let narrower = 1.0 + (NARROWER - 1.0) * big;
            // (a scrap's turrets stand close, a dome or two; a big cloud's spread out, a heap)
            let huddle = HUDDLE[0] + (HUDDLE[1] - HUDDLE[0]) * big;
            // (a cloud too far off to matter: all its turrets are further than the texture holds; though it still
            // bounds the clear way, by its whole breadth at OPEN_AT)
            let off = q.distance(middle);
            if off - (HUDDLE[1] + 0.46) * foot > FAR * NARROW * narrower * foot {
                best.clear = best.clear.min((off - (huddle + OPEN_AT * WIDE * narrower) * foot).max(0.0));
                continue;
            }
            let (x, y) = (wrapped(ix, CELLS), wrapped(iy, CELLS));
            let turrets = (TURRETS[0] + (TURRETS[1] - TURRETS[0]) * big).round() as u32;
            for turret in 0..turrets {
                let (a, b) = (scramble(x, y, 3 + turret), scramble(x, y, 13 + turret));
                // (the first stands in the middle and is the widest; the rest huddle round it)
                let (out, radius) = if turret == 0 {
                    (0.0, WIDE)
                } else {
                    (huddle * high(a).sqrt(), NARROW + (0.46 - NARROW) * low(b))
                };
                let radius = radius * narrower;
                let angle = TAU * low(a);
                let at = middle + foot * out * Vec2::new(angle.cos(), angle.sin());
                let distance = q.distance(at);
                best.clear = best.clear.min((distance - OPEN_AT * foot * radius).max(0.0));
                let scaled = distance / (foot * radius);
                if scaled < best.scaled {
                    best = Near { scaled, radius: foot * radius, age, clear: best.clear };
                }
            }
        }
    }
    // (no cloud beyond the cells looked at is nearer than this; and the push stretches the way by up to a fifth)
    best.clear = best.clear.min(CLEAR_MOST) / 1.25;
    best
}

/// How the day's cover lays the field out: how far it spreads every turret, and how many metres a cell is, for
/// clouds `size` metres across covering `cover` of the sky. A cloud of [`TYPICAL`] size, spread, is `size`
/// across.
#[must_use]
pub fn lay(cover: f32, size: f32) -> Vec2 {
    let spread = spread_for(cover);
    // (a cloud reaches its FOOT from its middle, and its turrets nine tenths of that)
    Vec2::new(spread, size / (2.0 * 0.9 * FOOT * TYPICAL * spread.max(0.05)))
}

/// How far every turret is spread for the clouds to cover `cover` of the sky. `clouds_cover.wesl` `spread_for`
/// is the same.
#[must_use]
pub fn spread_for(cover: f32) -> f32 {
    let [a, b] = GROWS;
    ((a * a + 4.0 * b * cover.clamp(0.0, MOST)).sqrt() - a) / (2.0 * b) / (1.0 - EDGE)
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

/// The field at every texel of the sheet, in rows.
#[must_use]
pub fn baked() -> Vec<Near> {
    let side = SIDE as usize;
    let mut out = vec![Near { scaled: FAR, radius: 0.0, age: 0.0, clear: FAR }; side * side];
    std::thread::scope(|scope| {
        for (y, row) in out.chunks_mut(side).enumerate() {
            scope.spawn(move || {
                for (x, texel) in row.iter_mut().enumerate() {
                    *texel = near(Vec2::new(x as f32 + 0.5, y as f32 + 0.5) * (CELLS as f32 / SIDE as f32));
                }
            });
        }
    });
    out
}

/// The field as a texture that tiles: red the scaled distance (to [`FAR`]), green the turret's radius in cells,
/// blue its cloud's age, alpha how far the place is from every turret's edge spread [`OPEN_AT`] times, cells.
#[must_use]
pub fn texture(field: &[Near]) -> Image {
    let data =
        field.iter().flat_map(|n| [n.scaled, n.radius, n.age, n.clear].into_iter().flat_map(half)).collect();
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

/// The field as a texture, baked.
#[must_use]
pub fn sheet() -> Image {
    texture(&baked())
}

#[cfg(test)]
#[path = "field_tests.rs"]
mod tests;
