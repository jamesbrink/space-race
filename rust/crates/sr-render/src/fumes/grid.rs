//! The grid the air round the pad is worked on: how big, how fine, the volumes it keeps and the figures every
//! pass and the picture are handed each frame.

use bevy::asset::RenderAssetUsages;
use bevy::image::{ImageAddressMode, ImageFilterMode, ImageSampler, ImageSamplerDescriptor};
use bevy::prelude::*;
use bevy::render::RenderApp;
use bevy::render::extract_resource::ExtractResource;
use bevy::render::render_resource::{Extent3d, ShaderType, TextureDimension, TextureFormat, TextureUsages};

/// A cell of the coarse grid (the velocity, the pressure and the light), m. The dust and vapour are on a grid
/// [`FINER`] times as fine.
pub const CELL: f32 = 1.25;
/// Coarse cells down the wind, up, and across: the box is this many cells each way. Each a multiple of 8. Long
/// enough down the wind that what the blast raised in its first quarter minute is still in it when the box lets
/// go of the pad and drifts with it (`pace.rs`), and tall enough for the warm cloud to rise in.
pub const CELLS: UVec3 = UVec3::new(176, 40, 96);
/// Fine cells to a coarse one, each way.
pub const FINER: u32 = 2;
/// Coarse cells to a cell of the volume that says where there is anything at all.
pub const COARSER: u32 = 4;
/// The Sun's view of the box is this many cells a side.
pub const SHADE: u32 = 256;
/// The pad stands this far in from the box's upwind side, m: the blast's sheet runs some forty metres up the wind
/// before the wind turns it back, and the dust drifts the rest of the box's length.
pub const UPWIND: f32 = 60.0;
/// The most sources a step is fed.
pub const SOURCES: usize = 8;

/// The box, m.
#[must_use]
pub fn size() -> Vec3 {
    CELLS.as_vec3() * CELL
}

/// A source as a step takes it (`shaders/fumes_solve.wesl`, `Source`), in the box's frame.
#[derive(ShaderType, Debug, Clone, Copy, Default, PartialEq)]
pub struct Fed {
    /// Where, m; `w` its radius, m.
    pub at: Vec4,
    /// The velocity it gives, m/s (a blast: how fast it goes out and how thick it is, m); `w` 1 for a blast.
    pub push: Vec4,
    /// What it gives a second: dust and vapour (1/m), heat (K); `w` how hard it holds the air (1/s).
    pub gives: Vec4,
}

/// What every pass and the picture are handed (`Fume` in the shaders).
#[derive(ShaderType, Debug, Clone, Copy, Default, PartialEq)]
pub struct Frame {
    /// The box, m; `w` a coarse cell, m.
    pub size: Vec4,
    /// Coarse cells each way; `w` fine cells to a coarse one.
    pub cells: Vec4,
    /// A step, s; the clock, s; the wind at 10 m, m/s; how many sources.
    pub time: Vec4,
    /// Toward the Sun, in the box's frame; `w` how wide the Sun's view of the box is, m.
    pub sun: Vec4,
    /// The two axes of the Sun's view.
    pub sun_a: Vec4,
    /// As `sun_a`.
    pub sun_b: Vec4,
    /// The Sun's light, lux.
    pub sunlight: Vec4,
    /// The sky's, cd/m^2.
    pub skylight: Vec4,
    /// The fire's light: where, m; `w` how strong, cd.
    pub lamp: Vec4,
    /// Its colour.
    pub lamp_colour: Vec4,
    /// The dust a metre of fast air raises (1/m a metre) and the speed it must pass (m/s).
    pub ground: Vec4,
    /// The box's own motion down the wind once it has let go of the pad: its speed (m/s), how fast that is
    /// changing (m/s^2) and how far it has gone (m).
    pub drift: Vec4,
    /// From the world as the eye draws it to the box's frame (metres from its low corner), for the march.
    pub box_from_world: Mat4,
    /// The sources.
    pub sources: [Fed; SOURCES],
}

/// The volumes: each a handle the picture samples and the passes write.
#[derive(Resource, Debug, Clone, ExtractResource)]
#[extract_app(RenderApp)]
pub struct Volumes {
    /// The velocity and heat, and the copy a pass writes.
    pub velocity: [Handle<Image>; 2],
    /// The pressure, the same.
    pub pressure: [Handle<Image>; 2],
    /// The dust and vapour, on the fine grid, the same.
    pub stuff: [Handle<Image>; 2],
    /// How much of the Sun, the fire and the sky reaches each fine cell.
    pub light: Handle<Image>,
    /// Where there is anything at all.
    pub occupied: Handle<Image>,
    /// The dust and vapour as the Sun sees them.
    pub shade: Handle<Image>,
    /// The corners of the smallest box, square to the grid, that holds everything there is.
    pub bounds: Handle<Image>,
    /// Eddies too small for the grid: a block of turning, volume-keeping velocity that repeats ([`gusts`]).
    pub gusts: Handle<Image>,
}

fn volume(cells: UVec3) -> Image {
    let size = Extent3d { width: cells.x, height: cells.y, depth_or_array_layers: cells.z };
    let mut image = Image::new_uninit(
        size,
        TextureDimension::D3,
        TextureFormat::Rgba16Float,
        RenderAssetUsages::RENDER_WORLD,
    );
    image.texture_descriptor.usage = TextureUsages::TEXTURE_BINDING
        | TextureUsages::STORAGE_BINDING
        | TextureUsages::COPY_SRC
        | TextureUsages::COPY_DST;
    image.sampler = ImageSampler::Descriptor(ImageSamplerDescriptor {
        address_mode_u: ImageAddressMode::ClampToEdge,
        address_mode_v: ImageAddressMode::ClampToEdge,
        address_mode_w: ImageAddressMode::ClampToEdge,
        mag_filter: ImageFilterMode::Linear,
        min_filter: ImageFilterMode::Linear,
        ..default()
    });
    image
}

impl Volumes {
    /// Make them, empty.
    pub fn new(images: &mut Assets<Image>) -> Self {
        let mut pair = |cells| [images.add(volume(cells)), images.add(volume(cells))];
        let (velocity, pressure, stuff) = (pair(CELLS), pair(CELLS), pair(CELLS * FINER));
        Self {
            velocity,
            pressure,
            stuff,
            light: images.add(volume(CELLS * FINER)),
            occupied: images.add(volume(CELLS / COARSER)),
            shade: images.add(volume(UVec3::new(SHADE, SHADE, 1))),
            bounds: images.add(volume(UVec3::splat(4))),
            gusts: images.add(gusts()),
        }
    }
}

/// The block of eddies is this many cells a side, and its largest eddies this many to the block.
const GUSTS: u32 = 32;
const EDDIES: u32 = 4;

/// A potential the eddies are the curl of, at a cell of the block (wrapped): three noises, each of two sizes.
fn potential(cell: [i32; 3]) -> Vec3 {
    let at = cell.map(|c| c.rem_euclid(GUSTS as i32) as f32 * EDDIES as f32 / GUSTS as f32);
    let twice = at.map(|c| c * 2.0);
    Vec3::from_array([11, 23, 37].map(|seed| {
        crate::noise::value(at, EDDIES, seed) + 0.5 * crate::noise::value(twice, EDDIES * 2, seed + 1)
    }))
}

/// Eddies too small for the grid to hold: the curl of a smooth noise, so they turn and keep their volume, in a
/// block that repeats every way (Bridson, Hourihan and Nordenstam, Curl-Noise for Procedural Fluid Flow, 2007).
/// Each cell is a velocity, of about one in size, kept as 0 to 1 a part.
fn gusts() -> Image {
    let n = GUSTS as i32;
    let mut data = Vec::with_capacity((GUSTS * GUSTS * GUSTS * 4) as usize);
    for z in 0..n {
        for y in 0..n {
            for x in 0..n {
                let d = |axis: usize| {
                    let mut step = [0; 3];
                    step[axis] = 1;
                    let ahead = potential([x + step[0], y + step[1], z + step[2]]);
                    ahead - potential([x - step[0], y - step[1], z - step[2]])
                };
                let (dx, dy, dz) = (d(0), d(1), d(2));
                let curl = Vec3::new(dy.z - dz.y, dz.x - dx.z, dx.y - dy.x) * 2.2;
                data.extend(curl.to_array().map(|part| ((part * 0.5 + 0.5).clamp(0.0, 1.0) * 255.0) as u8));
                data.push(255);
            }
        }
    }
    let size = Extent3d { width: GUSTS, height: GUSTS, depth_or_array_layers: GUSTS };
    let mut image = Image::new(
        size,
        TextureDimension::D3,
        data,
        TextureFormat::Rgba8Unorm,
        RenderAssetUsages::RENDER_WORLD,
    );
    // (the picture reads it as it repeats, to bend the fumes' outline)
    image.sampler = ImageSampler::Descriptor(ImageSamplerDescriptor {
        address_mode_u: ImageAddressMode::Repeat,
        address_mode_v: ImageAddressMode::Repeat,
        address_mode_w: ImageAddressMode::Repeat,
        mag_filter: ImageFilterMode::Linear,
        min_filter: ImageFilterMode::Linear,
        ..default()
    });
    image
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_eddies_are_of_about_one_in_size_and_go_every_way_alike() {
        let image = gusts();
        let data = image.data.as_deref().unwrap();
        let cells = (GUSTS * GUSTS * GUSTS) as f32;
        let (mut sum, mut square) = (Vec3::ZERO, 0.0);
        for cell in data.as_chunks::<4>().0 {
            let v = Vec3::new(f32::from(cell[0]), f32::from(cell[1]), f32::from(cell[2])) / 127.5 - 1.0;
            sum += v;
            square += v.length_squared();
        }
        assert!((sum / cells).length() < 0.05, "{}", sum / cells);
        let size = (square / cells).sqrt();
        assert!((0.5..1.3).contains(&size), "{size}");
    }
}
