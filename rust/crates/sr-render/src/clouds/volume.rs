//! The noise the clouds are cut from: a block that tiles, made once at startup, with its coarser copies.
//!
//! Red is the shape: smooth noise with billows (Worley) cut out of it, the "Perlin-Worley" of Schneider's Nubis
//! clouds (docs/look.md), whose high places are a cumulus' knobs. Green is the detail: finer billows, which fray
//! an edge. Blue and alpha are two smooth noises that know nothing of each other: the shader pushes the detail
//! about with them, so that an edge is torn and not stamped. Each is spread over the whole of 0 to 1.

use bevy::asset::RenderAssetUsages;
use bevy::image::{ImageAddressMode, ImageFilterMode, ImageSampler, ImageSamplerDescriptor};
use bevy::prelude::*;
use bevy::render::render_resource::{Extent3d, TextureDimension, TextureFormat};

use crate::noise::{fbm, worley};

/// Voxels along each side.
pub const SIZE: u32 = 128;
/// Coarser copies, each half the one before: a far cloud is read from one of these, so it does not sparkle.
const LEVELS: u32 = 6;
const CHANNELS: usize = 4;

/// One voxel, before its channels are spread: shape, detail, and the two that push.
fn voxel(p: [f32; 3]) -> [f32; CHANNELS] {
    let (w6, w12, w24) = (worley(p, 6, 53), worley(p, 12, 59), worley(p, 24, 61));
    let coarse = 0.625 * w6 + 0.25 * w12 + 0.125 * w24;
    let fine = 0.625 * w12 + 0.375 * w24;
    // (smooth noise, lifted to the billows where it is low; then the finer billows cut out of that)
    let heaped = coarse + fbm(p, 4, 5, 31) * (1.0 - coarse);
    let shape = (heaped - (fine - 1.0)) / (2.0 - fine);
    let detail = 0.5 * worley(p, 8, 71) + 0.3 * worley(p, 16, 73) + 0.2 * worley(p, 32, 79);
    [shape, detail, fbm(p, 5, 3, 83), fbm(p, 5, 3, 89)]
}

/// Spreads every channel from its 1st to its 99th hundredth over 0 to 255: sums of noise bunch round their
/// middle, and a shader that cuts cloud with them needs their whole range.
fn spread(raw: &[[f32; CHANNELS]]) -> Vec<u8> {
    let mut out = vec![0_u8; raw.len() * CHANNELS];
    for channel in 0..CHANNELS {
        let mut sorted: Vec<f32> = raw.iter().step_by(7).map(|v| v[channel]).collect();
        sorted.sort_by(f32::total_cmp);
        let low = sorted[sorted.len() / 100];
        let high = sorted[sorted.len() - 1 - sorted.len() / 100];
        for (texel, v) in out.chunks_mut(CHANNELS).zip(raw) {
            texel[channel] = ((v[channel] - low) / (high - low).max(1.0e-6) * 255.0).clamp(0.0, 255.0) as u8;
        }
    }
    out
}

/// A copy of a block of `side` voxels at half the size: each voxel the mean of the eight it stands for.
fn halve(fine: &[u8], side: usize) -> Vec<u8> {
    let half = side / 2;
    let mut out = vec![0_u8; half * half * half * CHANNELS];
    for (i, texel) in out.chunks_mut(CHANNELS).enumerate() {
        let (x, y, z) = (i % half * 2, i / half % half * 2, i / (half * half) * 2);
        for (channel, value) in texel.iter_mut().enumerate() {
            let mut sum = 0_u32;
            for corner in 0..8 {
                let at = (x + (corner & 1)) + side * ((y + (corner >> 1 & 1)) + side * (z + (corner >> 2)));
                sum += u32::from(fine[at * CHANNELS + channel]);
            }
            *value = (sum / 8) as u8;
        }
    }
    out
}

/// The block, as a texture that repeats in every direction.
#[must_use]
pub fn block() -> Image {
    let side = SIZE as usize;
    let mut raw = vec![[0.0_f32; CHANNELS]; side * side * side];
    // (a slice of the block to a thread: it is two million voxels of 27-cell searches)
    std::thread::scope(|scope| {
        for (z, slice) in raw.chunks_mut(side * side).enumerate() {
            scope.spawn(move || {
                for (i, texel) in slice.iter_mut().enumerate() {
                    let at = [i % side, i / side, z];
                    *texel = voxel(at.map(|v| (v as f32 + 0.5) / side as f32));
                }
            });
        }
    });
    let mut data = spread(&raw);
    let (mut from, mut level_side) = (0, side);
    for _ in 1..LEVELS {
        let coarser = halve(&data[from..], level_side);
        from = data.len();
        level_side /= 2;
        data.extend(coarser);
    }
    let mut image = Image::new_uninit(
        Extent3d { width: SIZE, height: SIZE, depth_or_array_layers: SIZE },
        TextureDimension::D3,
        TextureFormat::Rgba8Unorm,
        RenderAssetUsages::RENDER_WORLD,
    );
    image.texture_descriptor.mip_level_count = LEVELS;
    image.data = Some(data);
    image.sampler = repeating();
    image
}

/// A sampler for a texture that tiles: smooth between texels and between its coarser copies.
#[must_use]
pub fn repeating() -> ImageSampler {
    ImageSampler::Descriptor(ImageSamplerDescriptor {
        address_mode_u: ImageAddressMode::Repeat,
        address_mode_v: ImageAddressMode::Repeat,
        address_mode_w: ImageAddressMode::Repeat,
        mipmap_filter: ImageFilterMode::Linear,
        ..ImageSamplerDescriptor::linear()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_coarser_copy_is_the_mean() {
        let fine: Vec<u8> = (0..2 * 2 * 2 * CHANNELS).map(|i| (i / CHANNELS * 10) as u8).collect();
        assert_eq!(halve(&fine, 2), vec![35; CHANNELS]);
    }

    #[test]
    fn a_channel_is_spread_over_its_whole_range() {
        let raw: Vec<[f32; CHANNELS]> = (0..2000).map(|i| [0.4 + i as f32 * 1.0e-4; CHANNELS]).collect();
        let out = spread(&raw);
        assert!(out[0] == 0 && out[out.len() - 1] == 255);
    }
}
