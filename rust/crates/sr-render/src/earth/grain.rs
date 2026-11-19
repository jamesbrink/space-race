//! The noise the ground and the sea are cut from (`shaders/earth_noise.wesl`): one small tile of smooth lumps with
//! their slopes, made once, so a point of the ground costs a lookup and not a sum. The tile repeats every
//! [`LUMPS`] lumps; the shader turns and shifts it differently for each use, so the repeats do not line up, and
//! its coarser copies (it is kept at every size down to one texel) are what a lump fades to where it is under a
//! pixel.

use bevy::asset::RenderAssetUsages;
use bevy::image::{ImageAddressMode, ImageFilterMode, ImageSampler, ImageSamplerDescriptor};
use bevy::prelude::*;
use bevy::render::render_resource::{Extent3d, TextureDimension, TextureFormat};

use crate::noise::hash;

/// Texels along the tile.
const SIZE: usize = 256;
/// Lumps along it: eight texels to a lump.
const LUMPS: usize = 32;
/// The steepest slope kept, per lump: steeper is cut off (the shader has the same figure).
const STEEPEST: f32 = 2.0;

/// A lattice point's slope, each part in [-1, 1).
fn lean(x: usize, y: usize, seed: u32) -> Vec2 {
    let (x, y) = ((x % LUMPS) as u32, (y % LUMPS) as u32);
    Vec2::new(hash(x, y, 0, seed), hash(x, y, 1, seed)) * 2.0 - 1.0
}

/// Gradient noise (Perlin 2002) that repeats every [`LUMPS`]: its value about 0.5, and how fast that changes
/// along x and y, per lump.
fn lump(p: Vec2, seed: u32) -> Vec3 {
    let cell = p.floor();
    let f = p - cell;
    let (x, y) = (cell.x as usize, cell.y as usize);
    let u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    let du = 30.0 * f * f * (f * (f - 2.0) + 1.0);
    let [ga, gb, gc, gd] =
        [lean(x, y, seed), lean(x + 1, y, seed), lean(x, y + 1, seed), lean(x + 1, y + 1, seed)];
    let (a, b) = (ga.dot(f), gb.dot(f - Vec2::X));
    let (c, d) = (gc.dot(f - Vec2::Y), gd.dot(f - Vec2::ONE));
    let k = a - b - c + d;
    let value = a + (b - a) * u.x + (c - a) * u.y + k * u.x * u.y;
    let slope = ga
        + (gb - ga) * u.x
        + (gc - ga) * u.y
        + (ga - gb - gc + gd) * u.x * u.y
        + du * (Vec2::new(u.y, u.x) * k + Vec2::new(b, c) - a);
    (0.5 + 0.7 * value, 0.7 * slope.x, 0.7 * slope.y).into()
}

/// The noise's value at a point, one lump to a unit: what the tile's red holds, before it is rounded to a byte.
#[must_use]
pub fn value(p: Vec2) -> f32 {
    lump(p.rem_euclid(Vec2::splat(LUMPS as f32)), 71).x
}

fn byte(v: f32) -> u8 {
    (v.clamp(0.0, 1.0) * 255.0).round() as u8
}

/// The tile at full size: red the value, green and blue its slopes (0.5 level, [`STEEPEST`] at either end),
/// alpha a second value that has nothing to do with the first.
fn tile() -> Vec<[f32; 4]> {
    let mut texels = Vec::with_capacity(SIZE * SIZE);
    for y in 0..SIZE {
        for x in 0..SIZE {
            let p = (Vec2::new(x as f32, y as f32) + 0.5) * (LUMPS as f32 / SIZE as f32);
            let n = lump(p, 71);
            let other = lump(p, 113).x;
            texels.push([n.x, 0.5 + n.y / (2.0 * STEEPEST), 0.5 + n.z / (2.0 * STEEPEST), other]);
        }
    }
    texels
}

/// Half the size: each texel the mean of four.
fn halved(texels: &[[f32; 4]], size: usize) -> Vec<[f32; 4]> {
    let half = size / 2;
    let mut out = Vec::with_capacity(half * half);
    for y in 0..half {
        for x in 0..half {
            let at = |dx: usize, dy: usize| texels[(2 * y + dy) * size + 2 * x + dx];
            let four = [at(0, 0), at(1, 0), at(0, 1), at(1, 1)];
            out.push(std::array::from_fn(|c| four.iter().map(|t| t[c]).sum::<f32>() / 4.0));
        }
    }
    out
}

/// The tile as a texture, with every smaller size, read so that it repeats and holds its detail seen edge-on.
#[must_use]
pub fn image() -> Image {
    let mut level = tile();
    let mut size = SIZE;
    let mut data = Vec::new();
    let mut levels = 0;
    loop {
        data.extend(level.iter().flatten().map(|v| byte(*v)));
        levels += 1;
        if size == 1 {
            break;
        }
        level = halved(&level, size);
        size /= 2;
    }
    let mut image = Image::new_uninit(
        Extent3d { width: SIZE as u32, height: SIZE as u32, depth_or_array_layers: 1 },
        TextureDimension::D2,
        TextureFormat::Rgba8Unorm,
        RenderAssetUsages::RENDER_WORLD,
    );
    image.data = Some(data);
    image.texture_descriptor.mip_level_count = levels;
    image.sampler = ImageSampler::Descriptor(ImageSamplerDescriptor {
        address_mode_u: ImageAddressMode::Repeat,
        address_mode_v: ImageAddressMode::Repeat,
        mag_filter: ImageFilterMode::Linear,
        min_filter: ImageFilterMode::Linear,
        mipmap_filter: ImageFilterMode::Linear,
        // (four taps along a pixel's long side: enough to hold the ground's grain to the middle distance, and a
        // quarter of what sixteen cost at every one of the sixty lookups a point of the ground makes)
        anisotropy_clamp: 4,
        ..default()
    });
    image
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_tile_repeats_and_its_slopes_are_its_own() {
        let p = Vec2::new(3.3, 7.8);
        let wrapped = lump(p + Vec2::splat(LUMPS as f32), 71);
        assert!((lump(p, 71) - wrapped).length() < 1e-4);
        let e = 1e-3;
        let dx = (lump(p + Vec2::X * e, 71).x - lump(p - Vec2::X * e, 71).x) / (2.0 * e);
        let dy = (lump(p + Vec2::Y * e, 71).x - lump(p - Vec2::Y * e, 71).x) / (2.0 * e);
        let n = lump(p, 71);
        assert!((n.y - dx).abs() < 1e-2 && (n.z - dy).abs() < 1e-2, "{n} against {dx}, {dy}");
    }

    #[test]
    fn every_size_is_kept_down_to_one_texel() {
        let image = image();
        assert_eq!(image.texture_descriptor.mip_level_count, 9);
        let texels: usize = (0..9).map(|l| (SIZE >> l) * (SIZE >> l)).sum();
        assert_eq!(image.data.as_ref().map(Vec::len), Some(texels * 4));
    }
}
