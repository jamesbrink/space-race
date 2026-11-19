//! Laying the clouds over the frame: `shaders/clouds_lay.wesl`, drawn on a ball round the eye before anything else
//! that is seen through. It reads the three half-size targets [`super::pass`] marched and puts them on at full
//! size, choosing for each pixel the rays that went about as far as what is solid there.

use bevy::camera::visibility::NoFrustumCulling;
use bevy::light::NotShadowCaster;
use bevy::mesh::MeshVertexBufferLayoutRef;
use bevy::pbr::{MaterialPipeline, MaterialPipelineKey};
use bevy::prelude::*;
use bevy::render::render_resource::{
    AsBindGroup, CompareFunction, RenderPipelineDescriptor, SpecializedMeshPipelineError,
};
use bevy::shader::ShaderRef;

use super::pass::CloudView;
use crate::origin::Eye;

/// The laying-on, as the clouds hold it.
#[derive(Resource)]
pub(super) struct Sheet(pub(super) Handle<CloudLay>);

/// The clouds and the haze, as marched, to be laid on.
#[derive(Asset, AsBindGroup, TypePath, Debug, Clone)]
pub struct CloudLay {
    /// The cloud's light, and how much of what is behind it it hides.
    #[texture(0)]
    pub cloud: Handle<Image>,
    /// The haze's light, and how much comes through it.
    #[texture(1)]
    pub haze: Handle<Image>,
    /// How far each ray went, where its cloud began and where its haze ended.
    #[texture(2)]
    pub reach: Handle<Image>,
    /// The rays of light in the haze ([`super::rays`]).
    #[texture(3)]
    pub rays: Handle<Image>,
}

impl Material for CloudLay {
    fn fragment_shader() -> ShaderRef {
        "shaders/clouds_lay.wesl".into()
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

/// The ball the clouds are laid on goes with the eye, and the eye is the view they are marched for.
pub(super) fn hang(
    mut commands: Commands,
    new: Query<Entity, Added<Eye>>,
    sheet: Res<Sheet>,
    mut meshes: ResMut<Assets<Mesh>>,
) {
    for eye in &new {
        let ball = meshes.add(Sphere::new(1.0).mesh().ico(2).unwrap_or_else(|_| Sphere::new(1.0).into()));
        commands.entity(eye).insert(CloudView);
        commands.spawn((
            Mesh3d(ball),
            MeshMaterial3d(sheet.0.clone()),
            NotShadowCaster,
            NoFrustumCulling,
            ChildOf(eye),
        ));
    }
}
