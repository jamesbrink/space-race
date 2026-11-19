//! The clouds' material: `shaders/clouds.wesl` marched through the day's layers, drawn on a ball round the eye.

use bevy::mesh::MeshVertexBufferLayoutRef;
use bevy::pbr::{MaterialPipeline, MaterialPipelineKey};
use bevy::prelude::*;
use bevy::render::render_resource::{
    AsBindGroup, CompareFunction, RenderPipelineDescriptor, ShaderType, SpecializedMeshPipelineError,
};
use bevy::shader::ShaderRef;

/// What the march needs to know each frame.
#[derive(ShaderType, Debug, Clone, Copy, Default)]
pub struct CloudFrame {
    /// The vertical at the eye; `w` the eye's height above the ground, m.
    pub up: Vec4,
    /// East at the site, in the site's frame; `w` the ground's radius, m.
    pub east: Vec4,
    /// North at the site; `w` the clock, s.
    pub north: Vec4,
    /// Toward the Sun; `w` how far one can see, m.
    pub sun: Vec4,
    /// The Sun's light on the cloud, lux, red green and blue.
    pub sunlight: Vec4,
    /// The sky's light on the cloud, cd/m^2.
    pub skylight: Vec4,
    /// Where the eye is over the ground in each layer's own drifting frame, m: the cumulus' east and north, then
    /// the deck's.
    pub over: Vec4,
    /// The cumulus: cover, base (m), depth (m), a cloud's size (m).
    pub cumulus: Vec4,
    /// The deck above it, the same.
    pub deck: Vec4,
}

/// The clouds.
#[derive(Asset, AsBindGroup, TypePath, Debug, Clone)]
pub struct CloudMaterial {
    /// This frame's figures.
    #[uniform(0)]
    pub frame: CloudFrame,
    /// The noise ([`super::volume`]).
    #[texture(1, dimension = "3d")]
    #[sampler(2)]
    pub volume: Handle<Image>,
}

impl Material for CloudMaterial {
    fn fragment_shader() -> ShaderRef {
        "shaders/clouds.wesl".into()
    }

    fn alpha_mode(&self) -> AlphaMode {
        AlphaMode::Premultiplied
    }

    /// The farthest thing there is: whatever else is seen through is drawn over it.
    fn depth_bias(&self) -> f32 {
        -1.0e9
    }

    fn enable_prepass() -> bool {
        false
    }

    fn enable_shadows() -> bool {
        false
    }

    /// It is drawn on a ball an arm's length from the eye, seen from inside, and finds what is in front of the
    /// cloud itself from the depth already drawn: so no face is culled and the depth test always passes.
    fn specialize(
        _pipeline: &MaterialPipeline,
        descriptor: &mut RenderPipelineDescriptor,
        _layout: &MeshVertexBufferLayoutRef,
        _key: MaterialPipelineKey<Self>,
    ) -> Result<(), SpecializedMeshPipelineError> {
        descriptor.primitive.cull_mode = None;
        if let Some(depth) = descriptor.depth_stencil.as_mut() {
            depth.depth_compare = Some(CompareFunction::Always);
            depth.depth_write_enabled = Some(false);
        }
        Ok(())
    }
}
