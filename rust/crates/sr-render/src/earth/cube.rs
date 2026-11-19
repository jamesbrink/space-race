//! A map of the whole Earth as a cube map, put together from the six faces the web build bakes
//! (`public/globe/<map>.{px,nx,py,ny,pz,nz}.*`, by Earth-fixed direction: `tools/globe.mjs`): its colour, the
//! height of its solid surface, the distance to its shores.

use bevy::asset::RenderAssetUsages;
use bevy::prelude::*;
use bevy::render::render_resource::{
    Extent3d, TextureDimension, TextureFormat, TextureViewDescriptor, TextureViewDimension,
};

/// The faces, in the order a cube map keeps them.
pub const FACES: [&str; 6] = ["px", "nx", "py", "ny", "pz", "nz"];

/// A cube map of one colour, to stand in until the faces arrive.
#[must_use]
pub fn plain(colour: [u8; 4]) -> Image {
    cube(1, colour.repeat(6), TextureFormat::Rgba8UnormSrgb)
}

/// The six faces as one cube map, once they have all been read; `None` until then, or if they do not match.
#[must_use]
pub fn assemble(faces: &[Handle<Image>; 6], images: &Assets<Image>) -> Option<Image> {
    let loaded: Vec<&Image> = faces.iter().filter_map(|face| images.get(face)).collect();
    let first = *loaded.first()?;
    let (size, format) = (first.width(), first.texture_descriptor.format);
    let alike = |image: &&Image| {
        image.width() == size && image.height() == size && image.texture_descriptor.format == format
    };
    if loaded.len() < 6 || !loaded.iter().all(alike) {
        return None;
    }
    let mut data = Vec::new();
    for face in loaded {
        data.extend_from_slice(face.data.as_ref()?);
    }
    Some(cube(size, data, format))
}

fn cube(size: u32, data: Vec<u8>, format: TextureFormat) -> Image {
    let mut image = Image::new(
        Extent3d { width: size, height: size, depth_or_array_layers: 6 },
        TextureDimension::D2,
        data,
        format,
        RenderAssetUsages::RENDER_WORLD,
    );
    image.texture_view_descriptor =
        Some(TextureViewDescriptor { dimension: Some(TextureViewDimension::Cube), ..default() });
    image
}
