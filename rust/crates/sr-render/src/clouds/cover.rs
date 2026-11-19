//! The cumulus field seen from far off: how much of each texel of the field's sheet is cloud, for a few spreads,
//! with its coarser copies. Where a cloud is only a pixel or two, the march would find it or step over it from one
//! frame to the next and the field would sparkle like gravel; this is read instead, at the coarseness of the pixel,
//! so a far field is the mean of what it holds, soft-edged clumps and streets and, from orbit, a white veil with the
//! day's weather in it. `shaders/clouds.wesl` `far_cumulus` reads it.

use bevy::asset::RenderAssetUsages;
use bevy::prelude::*;
use bevy::render::render_resource::{Extent3d, TextureDimension, TextureFormat};

use super::field::{Near, SIDE};
use super::mips;
use super::volume::repeating;

/// The spreads (in a turret's radii, after the cut of its edge) the channels hold the cover for, red to alpha.
/// `clouds.wesl` `COVER_SPREADS` is the same. They span a sparse day's (1.1) to the most the field is laid out for,
/// gathered (12).
pub const SPREADS: [f32; 4] = [2.0, 4.0, 7.0, 11.0];
/// How soft a cloud's outline is in the cover, as a fraction of the spread either way.
const SOFT: f32 = 0.08;

fn covered(scaled: f32, spread: f32) -> u8 {
    let t = ((spread * (1.0 + SOFT) - scaled) / (2.0 * SOFT * spread)).clamp(0.0, 1.0);
    (t * t * (3.0 - 2.0 * t) * 255.0).round() as u8
}

/// The cover as a texture that tiles, with every coarser copy.
#[must_use]
pub fn texture(field: &[Near]) -> Image {
    let level0 = field.iter().flat_map(|n| SPREADS.map(|spread| covered(n.scaled, spread))).collect();
    let (data, levels) = mips::chain(level0, SIDE as usize, 4);
    let mut image = Image::new_uninit(
        Extent3d { width: SIDE, height: SIDE, depth_or_array_layers: 1 },
        TextureDimension::D2,
        TextureFormat::Rgba8Unorm,
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
    fn inside_is_cloud_and_outside_is_not() {
        assert_eq!(covered(0.0, 3.0), 255);
        assert_eq!(covered(3.0, 3.0), 128);
        assert_eq!(covered(4.0, 3.0), 0);
    }
}
