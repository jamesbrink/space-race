//! What a deck of altocumulus is laid out from: a tiling texture of cloudlets in rippled rows (red) and of the
//! banks they gather into (green), baked once.
//!
//! Each channel is ranked: a texel holds the fraction of the texture that is lower than it. So the shader's
//! threshold is a cover exactly, with nothing measured: "above 0.8" is a fifth of the sky.

use std::f32::consts::TAU;

use bevy::asset::RenderAssetUsages;
use bevy::prelude::*;
use bevy::render::render_resource::{Extent3d, TextureDimension, TextureFormat};

use super::mips;
use super::volume::repeating;
use crate::noise::{fbm, worley};

/// Cloudlets along a side of the tile.
pub const CLOUDLETS: u32 = 32;
/// Texels along a side.
const SIDE: u32 = 512;
/// The edge of a bank is this wide, as a fraction of the sky: the cloudlets thin out across it.
pub const FRINGE: f32 = 0.1;
/// How much of the sky the cloudlets cover in the thick of a bank, the rest being the lanes between them.
pub const THICK: f32 = 0.7;
/// The mean cover across the fringe, over [`THICK`]: the integral of the shader's `u^0.7` ramp.
const ACROSS_FRINGE: f32 = 1.0 / 1.7;

/// One texel before ranking: the cloudlets, and the banks.
fn texel(p: [f32; 2]) -> [f32; 2] {
    // (pushed about, so the rows wander)
    let push = [fbm([p[0], p[1], 0.37], 4, 3, 101) - 0.5, fbm([p[0], p[1], 0.61], 4, 3, 103) - 0.5];
    let q = [p[0] + 0.035 * push[0], p[1] + 0.035 * push[1]];
    // (a slice through the billows: the cells it cuts are of every size, as cloudlets are)
    let slice = |cells: u32, seed: u32| worley([q[0], q[1], 0.5 / cells as f32], cells, seed);
    let rows = 0.5 + 0.5 * (TAU * (q[0] * 24.0 + 3.0 * push[1])).cos();
    // (cloudlets of the size given and of half of it together: a deck is never all of a size)
    let cloudlets = (0.5 * slice(CLOUDLETS, 107) + 0.5 * slice(CLOUDLETS * 2, 109)) * (0.65 + 0.35 * rows);
    [cloudlets, fbm([p[0], p[1], 0.83], 4, 4, 113)]
}

/// Each value's place among all of them, 0 the lowest to 255 the highest.
fn ranked(values: &[f32]) -> Vec<u8> {
    let mut order: Vec<u32> = (0..values.len() as u32).collect();
    order.sort_by(|&a, &b| values[a as usize].total_cmp(&values[b as usize]));
    let mut out = vec![0_u8; values.len()];
    for (rank, &i) in order.iter().enumerate() {
        out[i as usize] = (rank * 256 / values.len()) as u8;
    }
    out
}

/// Where a bank begins, as a rank of the green channel, for a deck covering `cover` of the sky: the thick of the
/// banks and half-covered fringe together come to the cover.
#[must_use]
pub fn bank_starts(cover: f32) -> f32 {
    let thick = ((cover - THICK * ACROSS_FRINGE * FRINGE) / THICK).max(0.0);
    (1.0 - FRINGE - thick).clamp(0.0, 1.0)
}

/// The texture.
#[must_use]
pub fn sheet() -> Image {
    let side = SIDE as usize;
    let mut raw = vec![[0.0_f32; 2]; side * side];
    std::thread::scope(|scope| {
        for (y, row) in raw.chunks_mut(side).enumerate() {
            scope.spawn(move || {
                for (x, value) in row.iter_mut().enumerate() {
                    *value = texel([(x as f32 + 0.5) / side as f32, (y as f32 + 0.5) / side as f32]);
                }
            });
        }
    });
    let cloudlets = ranked(&raw.iter().map(|v| v[0]).collect::<Vec<_>>());
    let banks = ranked(&raw.iter().map(|v| v[1]).collect::<Vec<_>>());
    let level0 = cloudlets.into_iter().zip(banks).flat_map(|(r, g)| [r, g]).collect();
    // (with its coarser copies: far off, a pixel holds many cloudlets and is their mean)
    let (data, levels) = mips::chain(level0, side, 2);
    let mut image = Image::new_uninit(
        Extent3d { width: SIDE, height: SIDE, depth_or_array_layers: 1 },
        TextureDimension::D2,
        TextureFormat::Rg8Unorm,
        RenderAssetUsages::RENDER_WORLD,
    );
    image.texture_descriptor.mip_level_count = levels;
    image.data = Some(data);
    image.sampler = repeating();
    image
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_rank_is_a_fraction_of_the_whole() {
        assert_eq!(ranked(&[0.3, 0.1, 0.9, 0.5]), vec![64, 0, 192, 128]);
    }

    #[test]
    fn the_banks_come_to_the_cover() {
        // (the shader's ramp: nothing below the start, u^0.7 across the fringe, the thick of the bank above)
        for cover in [0.125, 0.3, 0.6] {
            let start = bank_starts(cover);
            let n = 10_000;
            let mean: f32 = (0..n)
                .map(|i| {
                    let u = (((i as f32 + 0.5) / n as f32 - start) / FRINGE).clamp(0.0, 1.0);
                    THICK * u.powf(0.7)
                })
                .sum::<f32>()
                / n as f32;
            assert!((mean - cover).abs() < 0.01, "{cover} asked for, {mean} covered");
        }
    }
}
