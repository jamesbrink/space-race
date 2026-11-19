//! Laying the fumes over the frame: `shaders/fumes_lay.wesl`, drawn on a ball round the eye after the clouds and
//! before the fires. It reads the two half-size targets [`super::pass`] marched and puts them on at full size,
//! choosing for each pixel the rays that went about as far as what is solid there.

use bevy::camera::visibility::NoFrustumCulling;
use bevy::light::NotShadowCaster;
use bevy::mesh::MeshVertexBufferLayoutRef;
use bevy::pbr::{MaterialPipeline, MaterialPipelineKey};
use bevy::prelude::*;
use bevy::render::render_resource::{
    AsBindGroup, CompareFunction, Extent3d, RenderPipelineDescriptor, SpecializedMeshPipelineError,
};
use bevy::shader::ShaderRef;

use super::pace::Step;
use super::pass::{FumesView, TARGET, Targets};
use crate::origin::Eye;

/// The fumes, as marched, to be laid on.
#[derive(Asset, AsBindGroup, TypePath, Debug, Clone)]
pub struct FumesLay {
    /// The fumes' light, and how much of what is behind them they hide.
    #[texture(0)]
    pub light: Handle<Image>,
    /// How far each ray went, and where its fumes began.
    #[texture(1)]
    pub reach: Handle<Image>,
}

impl Material for FumesLay {
    fn fragment_shader() -> ShaderRef {
        "shaders/fumes_lay.wesl".into()
    }

    fn alpha_mode(&self) -> AlphaMode {
        AlphaMode::Premultiplied
    }

    /// Behind every other thing seen through but the clouds (whose own bias is -1e9): the fires are drawn over it.
    fn depth_bias(&self) -> f32 {
        -1.0e8
    }

    fn enable_prepass() -> bool {
        false
    }

    fn enable_shadows() -> bool {
        false
    }

    /// Drawn on a ball an arm's length from the eye, seen from inside: no face is culled and the depth test always
    /// passes; what stands in front is found from the depth already drawn.
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

/// The laying-on, as the fumes hold it.
#[derive(Resource)]
pub struct Sheet(Handle<FumesLay>);

/// The ball the fumes are laid on.
#[derive(Component)]
pub struct Ball;

/// The targets, and the material that reads them.
pub fn make(
    mut commands: Commands,
    mut images: ResMut<Assets<Image>>,
    mut materials: ResMut<Assets<FumesLay>>,
) {
    let mut target = || images.add(Image::new_target_texture(8, 8, TARGET, None));
    let [light, reach] = [target(), target()];
    commands.insert_resource(Sheet(materials.add(FumesLay { light: light.clone(), reach: reach.clone() })));
    commands.insert_resource(Targets([light, reach]));
}

/// The ball goes with the eye, and the eye is the view the fumes are marched for.
pub fn hang(
    mut commands: Commands,
    new: Query<Entity, Added<Eye>>,
    sheet: Res<Sheet>,
    mut meshes: ResMut<Assets<Mesh>>,
) {
    for eye in &new {
        let ball = meshes.add(Sphere::new(1.0).mesh().ico(2).unwrap_or_else(|_| Sphere::new(1.0).into()));
        commands.entity(eye).insert(FumesView);
        commands.spawn((
            Ball,
            Mesh3d(ball),
            MeshMaterial3d(sheet.0.clone()),
            NotShadowCaster,
            NoFrustumCulling,
            Visibility::Hidden,
            ChildOf(eye),
        ));
    }
}

/// Keeps the targets at half the size of what the eye draws into, and the ball shown while there are fumes.
pub fn fit(
    eyes: Query<&Camera, With<Eye>>,
    step: Res<Step>,
    targets: Res<Targets>,
    sheet: Res<Sheet>,
    mut balls: Query<&mut Visibility, With<Ball>>,
    mut images: ResMut<Assets<Image>>,
    mut materials: ResMut<Assets<FumesLay>>,
) {
    let shown = if step.drawn { Visibility::Inherited } else { Visibility::Hidden };
    for mut visibility in &mut balls {
        if *visibility != shown {
            *visibility = shown;
        }
    }
    let Some(size) = eyes.iter().find_map(Camera::physical_target_size) else { return };
    let half = (size + 1) / 2;
    let want = Extent3d { width: half.x.max(1), height: half.y.max(1), depth_or_array_layers: 1 };
    if images.get(&targets.0[0]).is_some_and(|image| image.texture_descriptor.size == want) {
        return;
    }
    for target in &targets.0 {
        if let Some(mut image) = images.get_mut(target) {
            image.resize(want);
        }
    }
    // (the laying-on holds the old textures until it is looked at again)
    let _ = materials.get_mut(&sheet.0);
}
