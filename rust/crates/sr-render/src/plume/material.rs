//! A flame's material: a volume of glowing gas marched through from the eye inside the box that holds it
//! (`shaders/plume.wesl`), added to what is behind it less what its own soot hides.

use bevy::mesh::MeshVertexBufferLayoutRef;
use bevy::pbr::{MaterialPipeline, MaterialPipelineKey};
use bevy::prelude::*;
use bevy::render::render_resource::{
    AsBindGroup, CompareFunction, Face, RenderPipelineDescriptor, ShaderType, SpecializedMeshPipelineError,
};
use bevy::shader::ShaderRef;

/// What the jet is, this frame.
#[derive(ShaderType, Debug, Clone, Copy, Default)]
pub struct Jet {
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
    /// The exit's radius, the jet's radius once it has come to the air's pressure, the length of a shock cell
    /// and of the supersonic core, m.
    pub shape: Vec4,
    /// How hard it burns (0 to 1), how much air there is (0 to 1), the light a metre of its heart gives
    /// (cd/m^2 a metre) and what a metre of it hides (1/m).
    pub state: Vec4,
    /// How fast its streaks are seen to run (1/s), the clock (s), how far down the jet the ground is and where
    /// the visible fire ends (m).
    pub flow: Vec4,
    /// How strong its shock cells are (over 0 swelling, under 0 squeezed), the tangent of the turn at the lip,
    /// and the radius and length of the box it is marched in (m).
    pub bounds: Vec4,
}

/// The flame.
#[derive(Asset, AsBindGroup, TypePath, Debug, Clone)]
pub struct PlumeMaterial {
    /// This frame's figures.
    #[uniform(0)]
    pub jet: Jet,
}

impl Material for PlumeMaterial {
    fn fragment_shader() -> ShaderRef {
        "shaders/plume.wesl".into()
    }

    fn alpha_mode(&self) -> AlphaMode {
        AlphaMode::Premultiplied
    }

    /// Drawn after the smoke it stands in: a fire is light, and what smoke is in front of it the smoke's own
    /// march has already taken from what is behind.
    fn depth_bias(&self) -> f32 {
        1.0e6
    }

    fn enable_prepass() -> bool {
        false
    }

    fn enable_shadows() -> bool {
        false
    }

    /// The box is seen by its far faces, so that an eye inside it still sees the fire, and what stands in front
    /// of the fire is found from the depth already drawn: so the depth test always passes.
    fn specialize(
        _pipeline: &MaterialPipeline,
        descriptor: &mut RenderPipelineDescriptor,
        _layout: &MeshVertexBufferLayoutRef,
        _key: MaterialPipelineKey<Self>,
    ) -> Result<(), SpecializedMeshPipelineError> {
        descriptor.primitive.cull_mode = Some(Face::Front);
        if let Some(depth) = descriptor.depth_stencil.as_mut() {
            depth.depth_compare = Some(CompareFunction::Always);
            depth.depth_write_enabled = Some(false);
        }
        Ok(())
    }
}
