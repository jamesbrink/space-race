//! The fumes' material: the dust and vapour marched as a volume inside the box the solver works
//! (`shaders/fumes.wesl`), and the shadow they cast (`shaders/fumes_shadow.wesl`).

use bevy::camera::visibility::NoFrustumCulling;
use bevy::mesh::MeshVertexBufferLayoutRef;
use bevy::pbr::{MaterialPipeline, MaterialPipelineKey};
use bevy::prelude::*;
use bevy::render::render_resource::{
    AsBindGroup, CompareFunction, Face, RenderPipelineDescriptor, SpecializedMeshPipelineError,
};
use bevy::shader::ShaderRef;

use super::grid::{Frame, Volumes};
use crate::origin::WorldPos;

/// The box the fumes are marched in.
#[derive(Component)]
pub struct Cloud(pub Handle<FumesMaterial>);

/// The fumes.
#[derive(Asset, AsBindGroup, TypePath, Debug, Clone)]
pub struct FumesMaterial {
    /// This frame's figures.
    #[uniform(0)]
    pub frame: Frame,
    /// The dust and vapour.
    #[texture(1, dimension = "3d")]
    #[sampler(2)]
    pub stuff: Handle<Image>,
    /// The light that reaches each cell.
    #[texture(3, dimension = "3d")]
    pub light: Handle<Image>,
    /// Where there is anything at all.
    #[texture(4, dimension = "3d")]
    pub occupied: Handle<Image>,
    /// The fumes as the Sun sees them.
    #[texture(5, dimension = "3d")]
    pub shade: Handle<Image>,
    /// The box that holds everything there is.
    #[texture(6, dimension = "3d")]
    pub bounds: Handle<Image>,
    /// The eddies too small for the grid, read as they repeat.
    #[texture(7, dimension = "3d")]
    #[sampler(8)]
    pub gusts: Handle<Image>,
}

impl Material for FumesMaterial {
    /// The mesh is the solver's whole box; the vertex shader draws only as much of it as holds anything.
    fn vertex_shader() -> ShaderRef {
        "shaders/fumes.wesl".into()
    }

    fn fragment_shader() -> ShaderRef {
        "shaders/fumes.wesl".into()
    }

    fn prepass_fragment_shader() -> ShaderRef {
        "shaders/fumes_shadow.wesl".into()
    }

    fn alpha_mode(&self) -> AlphaMode {
        AlphaMode::Premultiplied
    }

    /// For the picture the box is seen by its far faces, so that an eye inside it still sees the fumes, and
    /// what stands in front of them is found from the depth already drawn. For the Sun's shadow maps it is
    /// drawn as any solid is, and the shader says how deep in the box the shadow starts.
    fn specialize(
        _pipeline: &MaterialPipeline,
        descriptor: &mut RenderPipelineDescriptor,
        _layout: &MeshVertexBufferLayoutRef,
        _key: MaterialPipelineKey<Self>,
    ) -> Result<(), SpecializedMeshPipelineError> {
        // (a pass that writes depth is a shadow map's: the picture's own pass, being see-through, writes none)
        let Some(depth) = descriptor.depth_stencil.as_mut() else { return Ok(()) };
        if depth.depth_write_enabled != Some(true) {
            descriptor.primitive.cull_mode = Some(Face::Front);
            depth.depth_compare = Some(CompareFunction::Always);
        }
        Ok(())
    }
}

/// The volumes, the material and the box, hidden until there is something in it.
pub fn make(
    mut commands: Commands,
    mut images: ResMut<Assets<Image>>,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<FumesMaterial>>,
) {
    let volumes = Volumes::new(&mut images);
    let material = materials.add(FumesMaterial {
        frame: Frame::default(),
        stuff: volumes.stuff[0].clone(),
        light: volumes.light.clone(),
        occupied: volumes.occupied.clone(),
        shade: volumes.shade.clone(),
        bounds: volumes.bounds.clone(),
        gusts: volumes.gusts.clone(),
    });
    commands.insert_resource(volumes);
    commands.spawn((
        Cloud(material.clone()),
        Mesh3d(meshes.add(Cuboid::new(2.0, 2.0, 2.0))),
        MeshMaterial3d(material),
        WorldPos::default(),
        NoFrustumCulling,
        Visibility::Hidden,
    ));
}
