//! The noise the land's cover is cut from (`earth/flora.rs` `fields`), baked once at startup into a texture, so
//! that the ground's shader reads it in four fetches and not some forty lumps of noise a pixel. Two levels round
//! the site: a near one fine enough for every field, and a wide one in which the fields finer than two of its texels
//! are their mean (as they are by then under a pixel). Near the eye the shader works the fields out itself, as
//! before (`earth.wesl` `fields_at`).
//!
//! The bake runs on the worker threads in the second or so after startup; until it lands, the ground is worked out
//! as it always was.

use bevy::asset::RenderAssetUsages;
use bevy::image::{ImageAddressMode, ImageFilterMode, ImageSampler, ImageSamplerDescriptor};
use bevy::prelude::*;
use bevy::render::render_resource::{Extent3d, TextureDimension, TextureFormat};
use bevy::tasks::{AsyncComputeTaskPool, Task, block_on, poll_once};

use super::flora;
use super::maps::Maps;
use super::material::EarthMaterial;

/// Texels along a level of the bake.
pub const TEXELS: usize = 1024;
/// Half the width each level covers round the site, m: the near level's texels are 6 m, the wide one's 48 m.
pub const NEAR: f32 = 3072.0;
pub const WIDE: f32 = 24576.0;
/// The fields, in texels' four channels.
const FIELDS: usize = 16;
const SETS: usize = FIELDS / 4;
/// The size of each field's lumps, m (`flora::fields`): where it is under two texels of a level, that level has
/// its mean.
const LUMP: [f32; FIELDS] =
    [330.0, 85.0, 22.0, 1300.0, 1700.0, 25.0, 600.0, 400.0, 91.0, 1430.0, 20.0, 10.0, 33.0, 33.0, 17.0, 40.0];

/// The bake under way.
#[derive(Resource)]
pub struct Baking(Task<Vec<u8>>);

/// Put in the world when the land's bake has landed (or come out unusable, when the ground is worked out as
/// before): from then on the ground is drawn as it will stay, so a curtain over the start may lift.
#[derive(Resource, Debug, Clone, Copy, Default)]
pub struct LandBaked;

/// Where a level's texel `(i, j)` lies, m east and north of the site (rows north first).
fn at(i: usize, j: usize, half: f32) -> Vec2 {
    let n = TEXELS as f32;
    Vec2::new(((i as f32 + 0.5) / n - 0.5) * 2.0 * half, (0.5 - (j as f32 + 0.5) / n) * 2.0 * half)
}

/// One row of a level: its texels, every set side by side.
fn row(j: usize, half: f32) -> Vec<u8> {
    let texel = 2.0 * half / TEXELS as f32;
    let mut out = vec![0_u8; TEXELS * SETS * 4];
    for i in 0..TEXELS {
        let f = flora::fields(at(i, j, half));
        for (k, value) in f.iter().enumerate() {
            let v = if LUMP[k] < 2.0 * texel { 0.5 } else { *value };
            out[((k / 4) * TEXELS + i) * 4 + k % 4] = (v.clamp(0.0, 1.0) * 255.0).round() as u8;
        }
    }
    out
}

/// The whole bake: the near level's rows, then the wide one's, worked on every core.
fn bake() -> Vec<u8> {
    let threads = std::thread::available_parallelism().map_or(4, std::num::NonZero::get);
    let rows: Vec<(usize, f32)> =
        (0..TEXELS).map(|j| (j, NEAR)).chain((0..TEXELS).map(|j| (j, WIDE))).collect();
    let chunk = rows.len().div_ceil(threads);
    std::thread::scope(|scope| {
        let workers: Vec<_> = rows
            .chunks(chunk)
            .map(|part| {
                scope.spawn(move || part.iter().flat_map(|(j, half)| row(*j, *half)).collect::<Vec<u8>>())
            })
            .collect();
        workers.into_iter().flat_map(|worker| worker.join().unwrap_or_default()).collect()
    })
}

/// The bake as a texture: its sets side by side, its levels one under the other.
fn image(data: Vec<u8>) -> Image {
    let mut image = Image::new(
        Extent3d { width: (TEXELS * SETS) as u32, height: (2 * TEXELS) as u32, depth_or_array_layers: 1 },
        TextureDimension::D2,
        data,
        TextureFormat::Rgba8Unorm,
        RenderAssetUsages::RENDER_WORLD,
    );
    image.sampler = ImageSampler::Descriptor(ImageSamplerDescriptor {
        address_mode_u: ImageAddressMode::ClampToEdge,
        address_mode_v: ImageAddressMode::ClampToEdge,
        mag_filter: ImageFilterMode::Linear,
        min_filter: ImageFilterMode::Linear,
        ..default()
    });
    image
}

/// Starts the bake.
pub fn start(mut commands: Commands) {
    commands.insert_resource(Baking(AsyncComputeTaskPool::get().spawn(async { bake() })));
}

/// Hands the bake to the ground once it is done.
pub fn land(
    mut commands: Commands,
    baking: Option<ResMut<Baking>>,
    maps: Option<Res<Maps>>,
    mut images: ResMut<Assets<Image>>,
    mut earths: ResMut<Assets<EarthMaterial>>,
) {
    let (Some(mut baking), Some(maps)) = (baking, maps) else { return };
    let Some(data) = block_on(poll_once(&mut baking.0)) else { return };
    commands.remove_resource::<Baking>();
    commands.insert_resource(LandBaked);
    if data.len() != TEXELS * SETS * 4 * 2 * TEXELS {
        warn!("the land's bake came out the wrong size; the ground is worked out as before");
        return;
    }
    info!("earth: the land's cover is baked");
    let handle = images.add(image(data));
    if let Some(mut earth) = earths.get_mut(&maps.material) {
        earth.extension.baked = handle;
        earth.extension.frame.baked = Vec4::new(NEAR, WIDE, 1.0, 0.0);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_row_holds_every_set_and_the_wide_level_drops_what_is_fine() {
        let near = row(TEXELS / 2, NEAR);
        assert_eq!(near.len(), TEXELS * SETS * 4);
        let wide = row(TEXELS / 2, WIDE);
        // (the small openings are field 2: the wide level's texels are 48 m, so it holds their mean)
        assert!([0, 7, TEXELS - 1].iter().all(|i| wide[i * 4 + 2] == 128));
        let i = TEXELS / 3;
        let f = flora::fields(at(i, TEXELS / 2, NEAR));
        assert!((f32::from(near[i * 4]) / 255.0 - f[0]).abs() < 0.01);
    }
}
