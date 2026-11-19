//! What the Earth's surface is made of: the engine's own physically based surface, with its colour, roughness and
//! normal worked out in `shaders/earth.wesl` from where on the Earth a point is.

use bevy::pbr::{ExtendedMaterial, MaterialExtension};
use bevy::prelude::*;
use bevy::render::render_resource::{AsBindGroup, ShaderType};
use bevy::shader::ShaderRef;

use super::marks::EarthMarks;

/// The Earth's material: a standard surface, extended.
pub type EarthMaterial = ExtendedMaterial<StandardMaterial, EarthSurface>;

/// The most banks of pale sand a region names (`tools/globe-surface.mjs`).
pub const BANKS: usize = 6;

/// A regional map's plane and what it covers on it (`earth/chart.rs`).
#[derive(ShaderType, Debug, Clone, Copy, Default)]
pub struct Plane {
    /// The plane's east as an Earth-fixed unit vector.
    pub east: Vec4,
    /// Its north.
    pub north: Vec4,
    /// Its middle.
    pub middle: Vec4,
    /// What the map covers on it, in units of the sphere's radius: west, east, south, north.
    pub bounds: Vec4,
    /// Metres to a texel, how far in from its edge it is faded in (plane units), the texels it keeps a distance
    /// over (a shore map), and whether it has arrived (1 or 0).
    pub scale: Vec4,
}

/// What the shader needs to know of the site.
#[derive(ShaderType, Debug, Clone, Copy, Default)]
pub struct EarthFrame {
    /// The site frame's +X, +Y and +Z as Earth-fixed unit vectors.
    pub x: Vec4,
    /// As `x`.
    pub y: Vec4,
    /// As `x`.
    pub z: Vec4,
    /// East and north at the site, in the site's frame.
    pub east: Vec4,
    /// As `east`.
    pub north: Vec4,
    /// The shore map: half its width over the ground (m), metres to a texel, how far it keeps a distance (texels),
    /// and whether there is one (1 or 0).
    pub shore: Vec4,
    /// The cumulus, for their shadows on the ground: cover (0 to 1), a cloud's size (m), the layer's base (m), and
    /// whether there is any (1 or 0).
    pub cloud: Vec4,
    /// How the day's cover lays the cumulus out (`clouds::field::lay`): how far it spreads every turret and the
    /// metres to a cell of the field; then the layer's depth (m).
    pub lay: Vec4,
    /// Toward the Sun in the site's frame, and seconds for the cloud's drift.
    pub sun: Vec4,
    /// The cloud's drift over the ground, m/s east and north.
    pub wind: Vec4,
    /// The day's map of the cover far from the site (`air::DayMap`): how far across it is (m), and whether there is
    /// one (1 or 0); then how far the flight's clock moved in the last frame (s); and what the A/B switch has turned
    /// off (`earth/ab.rs`): 1 the land's detail, 2 the sea's, 3 both.
    pub day: Vec4,
    /// The eye's height above the ground (m); whether the whole Earth's relief has arrived, and its shores; and
    /// whether the open sea has been told from enclosed water (`earth/coast.rs`), each 1 or 0.
    pub eye: Vec4,
    /// The region's wider shore map.
    pub wide: Plane,
    /// The region's relief and colour, on one plane.
    pub region: Plane,
    /// The region's banks of pale sand: each its middle as an Earth-fixed direction and the cosine of its radius
    /// (a cosine of 2 for none).
    pub banks: [Vec4; BANKS],
}

/// The extension's own bindings, from 100 up (the standard surface has those below). A fragment shader may have
/// sixteen samplers and the engine's own take ten, so the maps share two: the colour's for every cube map, the
/// shore's for every flat one. The noise has its own, which repeats.
#[derive(Asset, AsBindGroup, TypePath, Debug, Clone)]
pub struct EarthSurface {
    /// The site's frame.
    #[uniform(100)]
    pub frame: EarthFrame,
    /// The Earth's colour by Earth-fixed direction.
    #[texture(101, dimension = "cube")]
    #[sampler(102)]
    pub colour: Handle<Image>,
    /// The region's shore: distance to it, land positive, rows north first.
    #[texture(103)]
    #[sampler(104)]
    pub shore: Handle<Image>,
    /// The height of the Earth's solid surface by Earth-fixed direction (`src/world/relief.ts`).
    #[texture(105, dimension = "cube")]
    pub relief: Handle<Image>,
    /// The distance to the Earth's shores by Earth-fixed direction, land positive (`tools/globe.mjs`).
    #[texture(107, dimension = "cube")]
    pub land: Handle<Image>,
    /// The region's wider shore map, on its own plane.
    #[texture(109)]
    pub wide: Handle<Image>,
    /// The region's relief.
    #[texture(111)]
    pub region_relief: Handle<Image>,
    /// The region's colour.
    #[texture(113)]
    pub region_colour: Handle<Image>,
    /// The open sea told from enclosed water: metres from the one's shore and from the other (`earth/coast.rs`),
    /// laid as the shore map is.
    #[texture(115)]
    pub coast: Handle<Image>,
    /// The made ground round the site.
    #[uniform(117)]
    pub marks: EarthMarks,
    /// The noise the ground and the sea are cut from (`earth/grain.rs`).
    #[texture(118)]
    #[sampler(119)]
    pub noise: Handle<Image>,
    /// Where the cumulus stand (the clouds' own `clouds::CumulusSheet`), for their shadows: read through the noise's
    /// sampler.
    #[texture(120)]
    pub cumulus: Handle<Image>,
    /// The day's map of the cover far from the site, read through the shore's sampler.
    #[texture(121)]
    pub day: Handle<Image>,
}

impl MaterialExtension for EarthSurface {
    fn fragment_shader() -> ShaderRef {
        "shaders/earth.wesl".into()
    }
}
