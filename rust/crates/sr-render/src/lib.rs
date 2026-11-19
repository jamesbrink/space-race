//! The picture: sky, clouds, the Earth, materials, the plume and the grade, as Bevy plugins.
//!
//! This crate draws what it is handed and knows no flight (`sr-hygiene` holds it to that): the game says where
//! the Sun is, what the cloud is, where a model stands, and the look is made here. One module to a thing drawn.

pub mod air;
pub mod clouds;
pub mod earth;
pub mod eye;
pub mod look;
pub mod materials;
pub mod models;
pub mod noise;
pub mod origin;
pub mod sky;

use bevy::prelude::*;

/// Everything this crate draws, added in one go. The game must have put a [`sky::Sky`] and an
/// [`earth::Ground`] in the world first, and an [`air::Air`] if the day had any cloud.
pub struct RenderPlugins;

impl Plugin for RenderPlugins {
    fn build(&self, app: &mut App) {
        app.add_plugins((
            origin::OriginPlugin,
            materials::MaterialsPlugin,
            sky::SkyPlugin,
            earth::EarthPlugin,
            clouds::CloudsPlugin,
            look::LookPlugin,
        ));
    }
}
