//! What the plants are made of (`earth/grove.rs`): the engine's own surface, with the cumulus' shadows laid on it as
//! they are on the ground under it (`shaders/earth_plants.wesl`), so that a shrub in a cloud's shadow is not lit
//! as if it stood in the Sun.

use bevy::pbr::{ExtendedMaterial, MaterialExtension};
use bevy::prelude::*;
use bevy::render::render_resource::AsBindGroup;
use bevy::shader::ShaderRef;

use super::maps::Maps;
use super::material::{EarthFrame, EarthMaterial};

/// The plants' material: a standard surface, extended.
pub type PlantMaterial = ExtendedMaterial<StandardMaterial, Shaded>;

/// What the plants' shader reads beside the standard surface: the ground's frame (`earth/material.rs`), and the
/// cumulus' field and the day's map, the same images the ground reads.
#[derive(Asset, AsBindGroup, TypePath, Debug, Clone)]
pub struct Shaded {
    /// The ground's frame, copied each frame.
    #[uniform(100)]
    pub frame: EarthFrame,
    /// Where the cumulus stand (`clouds::field::sheet`).
    #[texture(101)]
    #[sampler(102)]
    pub cumulus: Handle<Image>,
    /// The day's map of the cover far from the site.
    #[texture(103)]
    #[sampler(104)]
    pub day: Handle<Image>,
}

impl MaterialExtension for Shaded {
    fn fragment_shader() -> ShaderRef {
        "shaders/earth_plants.wesl".into()
    }
}

/// The plants' materials, kept in step with the ground's.
#[derive(Resource, Default)]
pub struct Leaves(pub Vec<Handle<PlantMaterial>>);

/// A plant material on `base`, reading what the ground's material `earth` reads.
#[must_use]
pub fn material(base: StandardMaterial, earth: &EarthMaterial) -> PlantMaterial {
    PlantMaterial {
        base,
        extension: Shaded {
            frame: earth.extension.frame,
            cumulus: earth.extension.cumulus.clone(),
            day: earth.extension.day.clone(),
        },
    }
}

/// Each frame, the ground's frame and the day's map handed on to the plants.
pub fn follow(
    leaves: Option<Res<Leaves>>,
    maps: Res<Maps>,
    earths: Res<Assets<EarthMaterial>>,
    mut plants: ResMut<Assets<PlantMaterial>>,
) {
    let (Some(leaves), Some(earth)) = (leaves, earths.get(&maps.material)) else { return };
    for handle in &leaves.0 {
        if let Some(mut plant) = plants.get_mut(handle) {
            plant.extension.frame = earth.extension.frame;
            if plant.extension.day != earth.extension.day {
                plant.extension.day = earth.extension.day.clone();
            }
        }
    }
}
