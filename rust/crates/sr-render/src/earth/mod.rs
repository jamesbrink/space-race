//! The Earth under the site: one sphere, coloured from the web build's own maps (`public/globe/`), with the
//! region's shore drawn sharp up close, the land near the site a ground a person can stand on, and the sea a sea:
//! it moves, breaks on the beach, and the Sun glints in it.
//!
//! What is simplified is in `rust/README.md` and `rust/docs/terrain.md`: a sphere, not the ellipsoid; the land near
//! the site is a designed ground in the repo's palette, its relief shaded and not raised.

mod chart;
mod coast;
mod cube;
mod flora;
mod grain;
mod grove;
mod json;
mod lay;
mod maps;
pub mod marks;
mod material;
mod mesh;
mod plants;

use bevy::prelude::*;

use material::EarthMaterial;

/// The region's shore map (`public/globe/<region>.near.png`: `tools/globe-region.mjs`). The region's other maps
/// are found beside it by its name (`<region>.json`, `<region>.surface.json` and what they name).
#[derive(Debug, Clone, PartialEq)]
pub struct Shore {
    /// Its path under `public/globe/`.
    pub file: String,
    /// Half its width, as a fraction of the sphere's radius (its `box`).
    pub half_width: f32,
    /// Texels across.
    pub texels: f32,
    /// How many texels from a shore it keeps a distance (its `spread`).
    pub spread: f32,
}

/// How the site lies on the Earth. The game sets it; nothing here knows a flight.
#[derive(Resource, Debug, Clone, PartialEq)]
pub struct Ground {
    /// The site frame's +X, +Y and +Z as Earth-fixed unit vectors.
    pub earth_fixed: [Vec3; 3],
    /// East and north at the site, in the site's frame.
    pub east: Vec3,
    /// As `east`.
    pub north: Vec3,
    /// Where the land lies against the site's origin, m.
    pub grade: f64,
    /// The region's shore, if it has been mapped.
    pub shore: Option<Shore>,
}

/// The Earth. The game may also put a [`marks::Marks`] in the world before it starts: the ways and the kept
/// ground round the site.
pub struct EarthPlugin;

impl Plugin for EarthPlugin {
    fn build(&self, app: &mut App) {
        app.add_plugins(MaterialPlugin::<EarthMaterial>::default())
            .init_asset::<json::JsonFile>()
            .init_asset_loader::<json::JsonLoader>()
            .add_systems(Startup, lay::lay)
            .add_systems(Update, (lay::light, (maps::describe, maps::arrive, grove::plant).chain()));
    }
}
