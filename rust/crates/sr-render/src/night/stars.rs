//! The stars: the whole Yale Bright Star Catalogue (`sr_world::stars`), each at its true place for the date and
//! the site, its light from its magnitude in lux and its colour from its B-V index (`shaders/stars.wesl`).

use bevy::asset::RenderAssetUsages;
use bevy::camera::visibility::NoFrustumCulling;
use bevy::light::{NotShadowCaster, NotShadowReceiver};
use bevy::mesh::{Indices, MeshVertexBufferLayoutRef, PrimitiveTopology};
use bevy::pbr::{MaterialPipeline, MaterialPipelineKey};
use bevy::prelude::*;
use bevy::render::render_resource::{
    AsBindGroup, BlendComponent, BlendFactor, BlendOperation, BlendState, RenderPipelineDescriptor,
    ShaderType, SpecializedMeshPipelineError,
};
use bevy::shader::ShaderRef;
use sr_world::stars;

use super::{Dusk, Heavens, STARS_AT};
use crate::origin::Origin;
use crate::sky::Sky;

/// The height over which the air thins by e, m: how much of it is above the eye is taken as e to the minus the
/// height over this (the US Standard Atmosphere's scale height near the ground, 8.4 km).
const SCALE_HEIGHT: f64 = 8_400.0;

/// How much brighter a star is drawn than its light on a screen's pixels would be: the eye picks a point of light
/// out of a dark field far more readily than a display shows one (a third-magnitude star is plain to the eye under a
/// three-quarter Moon; drawn as its light it is a dark grey dot). Estimated, for the look; by day it is still lost in
/// the sky's light, which is a hundred thousand times more.
const POINT: f32 = 25.0;
/// How many stops more the stars are drawn above the air by day, the eye opened for the black sky rather than the
/// sunlit Earth and vehicle: the bright ones come out (the web build's `DAY_ADAPTED`, magnitude 5.2 above the air).
/// Estimated.
const SPACE: f32 = 11.0;

/// What the stars' shader is told each frame.
#[derive(ShaderType, Debug, Clone, Copy, Default)]
pub(super) struct StarSky {
    pub turn_x: Vec4,
    pub turn_y: Vec4,
    pub turn_z: Vec4,
    pub up: Vec4,
    pub far: Vec4,
}

impl StarSky {
    /// From the heavens, the sky and where the eye is.
    pub fn of(heavens: &Heavens, sky: &Sky, origin: &Origin, dusk: &Dusk, far: f32) -> Self {
        let from_centre = origin.0 - sky.centre;
        let height = from_centre.length() - sky.radius;
        let air = (-height.max(0.0) / SCALE_HEIGHT).exp() as f32;
        // above the air by day the eye looking at the black sky opens for it, as far as the air is gone
        let day = 1.0 - dusk.night;
        let gain = POINT * (SPACE * (1.0 - air) * day).exp2();
        Self {
            turn_x: heavens.stars.x_axis.extend(0.0),
            turn_y: heavens.stars.y_axis.extend(0.0),
            turn_z: heavens.stars.z_axis.extend(0.0),
            up: from_centre.normalize().as_vec3().extend(air),
            far: Vec4::new(far, gain, 0.0, 0.0),
        }
    }
}

#[derive(Asset, AsBindGroup, TypePath, Debug, Clone)]
struct StarsMaterial {
    #[uniform(0)]
    sky: StarSky,
}

/// Each star's light as a vertex's colour, in micro-lux (the shader takes it back to lux).
const MICRO: f64 = 1e6;

impl Material for StarsMaterial {
    fn vertex_shader() -> ShaderRef {
        "shaders/stars.wesl".into()
    }

    fn fragment_shader() -> ShaderRef {
        "shaders/stars.wesl".into()
    }

    fn enable_prepass() -> bool {
        false
    }

    fn enable_shadows() -> bool {
        false
    }

    /// Drawn with the solid things, before the sky is laid over them, adding light and writing no depth: what is
    /// in front hides them by the depth already there.
    fn specialize(
        _pipeline: &MaterialPipeline,
        descriptor: &mut RenderPipelineDescriptor,
        layout: &MeshVertexBufferLayoutRef,
        _key: MaterialPipelineKey<Self>,
    ) -> Result<(), SpecializedMeshPipelineError> {
        descriptor.vertex.buffers = vec![layout.0.get_layout(&[
            Mesh::ATTRIBUTE_POSITION.at_shader_location(0),
            Mesh::ATTRIBUTE_UV_0.at_shader_location(1),
            Mesh::ATTRIBUTE_COLOR.at_shader_location(2),
        ])?];
        add_light(descriptor);
        Ok(())
    }
}

/// A pipeline that adds what it draws to what is there and writes no depth.
pub(super) fn add_light(descriptor: &mut RenderPipelineDescriptor) {
    descriptor.primitive.cull_mode = None;
    if let Some(depth) = descriptor.depth_stencil.as_mut() {
        depth.depth_write_enabled = Some(false);
    }
    let add = BlendComponent {
        src_factor: BlendFactor::One,
        dst_factor: BlendFactor::One,
        operation: BlendOperation::Add,
    };
    if let Some(fragment) = descriptor.fragment.as_mut() {
        for target in fragment.targets.iter_mut().flatten() {
            target.blend = Some(BlendState { color: add, alpha: add });
        }
    }
}

#[derive(Component)]
struct Stars(Handle<StarsMaterial>);

pub(super) fn build(app: &mut App) {
    app.add_plugins(MaterialPlugin::<StarsMaterial>::default()).add_systems(Update, (make, turn).chain());
}

/// The catalogue as a mesh: four corners a star, each carrying the star's J2000 direction at the date, its light
/// and its colour.
fn catalogue(years: f64) -> Mesh {
    let all = stars::read(stars::CATALOGUE);
    let mut toward = Vec::with_capacity(all.len() * 4);
    let mut corner = Vec::with_capacity(all.len() * 4);
    let mut light = Vec::with_capacity(all.len() * 4);
    let mut index = Vec::with_capacity(all.len() * 6);
    for (n, star) in all.iter().enumerate() {
        let d = star.direction(years);
        let lux = stars::lux(star.magnitude) * MICRO;
        let [r, g, b] = stars::colour(star.colour).map(|c| (c * lux) as f32);
        for c in [[-1.0, -1.0], [1.0, -1.0], [1.0, 1.0], [-1.0, 1.0]] {
            toward.push([d.x as f32, d.y as f32, d.z as f32]);
            corner.push(c);
            light.push([r, g, b, star.magnitude as f32]);
        }
        let at = (n * 4) as u32;
        index.extend_from_slice(&[at, at + 1, at + 2, at, at + 2, at + 3]);
    }
    Mesh::new(PrimitiveTopology::TriangleList, RenderAssetUsages::RENDER_WORLD)
        .with_inserted_attribute(Mesh::ATTRIBUTE_POSITION, toward)
        .with_inserted_attribute(Mesh::ATTRIBUTE_UV_0, corner)
        .with_inserted_attribute(Mesh::ATTRIBUTE_COLOR, light)
        .with_inserted_indices(Indices::U32(index))
}

fn make(
    mut commands: Commands,
    heavens: Option<Res<Heavens>>,
    made: Query<(), With<Stars>>,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StarsMaterial>>,
) {
    let Some(heavens) = heavens else { return };
    if !made.is_empty() {
        return;
    }
    let material = materials.add(StarsMaterial { sky: StarSky::default() });
    commands.spawn((
        Stars(material.clone()),
        Mesh3d(meshes.add(catalogue(f64::from(heavens.years)))),
        MeshMaterial3d(material),
        Transform::default(),
        NoFrustumCulling,
        NotShadowCaster,
        NotShadowReceiver,
    ));
}

/// The sky turns with the clock and the eye moves: the stars' shader is told each frame.
fn turn(
    heavens: Option<Res<Heavens>>,
    sky: Res<Sky>,
    origin: Res<Origin>,
    dusk: Res<Dusk>,
    stars: Query<&Stars>,
    mut materials: ResMut<Assets<StarsMaterial>>,
) {
    let Some(heavens) = heavens else { return };
    for Stars(handle) in &stars {
        if let Some(mut material) = materials.get_mut(handle) {
            material.sky = StarSky::of(&heavens, &sky, &origin, &dusk, STARS_AT);
        }
    }
}
