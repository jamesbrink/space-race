//! A flame's material: light and nothing else, added to what is behind it (`shaders/plume.wesl`).

use bevy::mesh::MeshVertexBufferLayoutRef;
use bevy::pbr::{MaterialPipeline, MaterialPipelineKey};
use bevy::prelude::*;
use bevy::render::render_resource::{
    AsBindGroup, RenderPipelineDescriptor, ShaderType, SpecializedMeshPipelineError,
};
use bevy::shader::ShaderRef;

/// What the flame is, this frame.
#[derive(ShaderType, Debug, Clone, Copy, Default)]
pub struct Fire {
    /// Linear colours from the heart out: core, hot, warm, cool.
    pub core: Vec4,
    /// As `core`.
    pub hot: Vec4,
    /// As `core`.
    pub warm: Vec4,
    /// As `core`.
    pub cool: Vec4,
    /// What is left of it in a vacuum.
    pub thin: Vec4,
    /// How hard it burns (0 to 1), how far the air has let it spread (1 at sea level), how bright its heart is
    /// (cd/m^2), and whether this is the inner flame (1) or the outer (0).
    pub state: Vec4,
}

/// The flame.
#[derive(Asset, AsBindGroup, TypePath, Debug, Clone)]
pub struct PlumeMaterial {
    /// This frame's figures.
    #[uniform(0)]
    pub fire: Fire,
}

impl Material for PlumeMaterial {
    fn fragment_shader() -> ShaderRef {
        "shaders/plume.wesl".into()
    }

    /// Premultiplied with no alpha: what the shader gives is added to what is behind.
    fn alpha_mode(&self) -> AlphaMode {
        AlphaMode::Premultiplied
    }

    fn enable_prepass() -> bool {
        false
    }

    fn enable_shadows() -> bool {
        false
    }

    /// Seen from every side, and from inside.
    fn specialize(
        _pipeline: &MaterialPipeline,
        descriptor: &mut RenderPipelineDescriptor,
        _layout: &MeshVertexBufferLayoutRef,
        _key: MaterialPipelineKey<Self>,
    ) -> Result<(), SpecializedMeshPipelineError> {
        descriptor.primitive.cull_mode = None;
        Ok(())
    }
}
