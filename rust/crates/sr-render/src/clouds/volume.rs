//! The noise the clouds are cut from: a small block that tiles, made once at startup.
//!
//! Red is the shape: smooth noise with billows (Worley) cut out of it, the "Perlin-Worley" of Schneider's
//! Nubis clouds. Green is the detail: finer billows, which fray the edges.

use bevy::asset::RenderAssetUsages;
use bevy::image::{ImageAddressMode, ImageSampler, ImageSamplerDescriptor};
use bevy::prelude::*;
use bevy::render::render_resource::{Extent3d, TextureDimension, TextureFormat};

use crate::noise::{fbm, worley};

/// Voxels along each side.
pub const SIZE: u32 = 64;

/// Billows at three scales, the coarsest strongest.
fn billows(p: [f32; 3], cells: u32, seed: u32) -> f32 {
    0.625 * worley(p, cells, seed)
        + 0.25 * worley(p, cells * 2, seed + 7)
        + 0.125 * worley(p, cells * 4, seed + 13)
}

/// One voxel: shape and detail, each spread over the whole of 0 to 1 (the sums of noise bunch round their middle,
/// and a shader that cuts cloud with them needs their whole range).
fn voxel(p: [f32; 3]) -> [f32; 2] {
    let shape = 0.45 * fbm(p, 4, 4, 31) + 0.55 * billows(p, 4, 53);
    let detail = billows(p, 9, 71);
    [(shape - 0.3) / 0.42, (detail - 0.28) / 0.5]
}

/// The block, as a texture that repeats in every direction.
#[must_use]
pub fn block() -> Image {
    let slab = (SIZE * SIZE * 2) as usize;
    let mut data = vec![0_u8; slab * SIZE as usize];
    // (a slice of the block to a thread: it is a quarter of a million voxels of 27-cell searches)
    std::thread::scope(|scope| {
        for (z, slice) in data.chunks_mut(slab).enumerate() {
            scope.spawn(move || {
                for (i, texel) in slice.chunks_mut(2).enumerate() {
                    let (x, y) = (i as u32 % SIZE, i as u32 / SIZE);
                    let p = [x, y, z as u32].map(|v| (v as f32 + 0.5) / SIZE as f32);
                    let [shape, detail] = voxel(p);
                    texel[0] = (shape.clamp(0.0, 1.0) * 255.0) as u8;
                    texel[1] = (detail.clamp(0.0, 1.0) * 255.0) as u8;
                }
            });
        }
    });
    let mut image = Image::new(
        Extent3d { width: SIZE, height: SIZE, depth_or_array_layers: SIZE },
        TextureDimension::D3,
        data,
        TextureFormat::Rg8Unorm,
        RenderAssetUsages::RENDER_WORLD,
    );
    image.sampler = ImageSampler::Descriptor(ImageSamplerDescriptor {
        address_mode_u: ImageAddressMode::Repeat,
        address_mode_v: ImageAddressMode::Repeat,
        address_mode_w: ImageAddressMode::Repeat,
        ..ImageSamplerDescriptor::linear()
    });
    image
}
