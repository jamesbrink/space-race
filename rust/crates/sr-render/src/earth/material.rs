//! What the Earth's surface is made of: the engine's own physically based surface, with its colour, roughness and
//! normal worked out in `shaders/earth.wesl` from where on the Earth a point is.

use bevy::pbr::{ExtendedMaterial, MaterialExtension};
use bevy::prelude::*;
use bevy::render::render_resource::{AsBindGroup, ShaderType};
use bevy::shader::ShaderRef;

/// The Earth's material: a standard surface, extended.
pub type EarthMaterial = ExtendedMaterial<StandardMaterial, EarthSurface>;

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
    /// The cloud's shadow on the ground: cover (0 to 1), a cloud's size (m), the bases' height (m), and whether
    /// there is any (1 or 0).
    pub cloud: Vec4,
    /// Toward the Sun in the site's frame, and seconds for the cloud's drift.
    pub sun: Vec4,
    /// The cloud's drift over the ground, m/s east and north.
    pub wind: Vec4,
}

/// The extension's own bindings, from 100 up (the standard surface has those below).
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
}

impl MaterialExtension for EarthSurface {
    fn fragment_shader() -> ShaderRef {
        "shaders/earth.wesl".into()
    }
}
