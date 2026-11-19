//! Smoke and vapour let go in the open air: puffs that are born, drift, swell and thin away on the flight's
//! clock.
//!
//! The game lets a [`Puff`] go where something bursts or burns away from the pad (a tank that breaks up; the
//! air round the pad itself is [`crate::fumes`]); this moves and draws them, each a billow marched as a volume
//! inside its ball (`shaders/puff.wesl`), lit by the Sun through itself and by the sky. They keep their places
//! in doubles like everything else.

use bevy::camera::visibility::NoFrustumCulling;
use bevy::light::NotShadowCaster;
use bevy::mesh::{MeshTag, MeshVertexBufferLayoutRef};
use bevy::pbr::{MaterialPipeline, MaterialPipelineKey};
use bevy::prelude::*;
use bevy::render::render_resource::{
    AsBindGroup, CompareFunction, Face, RenderPipelineDescriptor, ShaderType, SpecializedMeshPipelineError,
};
use bevy::shader::ShaderRef;

use crate::air::Air;
use crate::origin::WorldPos;
use crate::sky::Sky;

/// A puff, let go at an instant of the flight's clock.
#[derive(Component, Debug, Clone, Copy, PartialEq)]
#[require(WorldPos)]
pub struct Puff {
    /// The clock when it was let go, s.
    pub born: f32,
    /// How long it lasts, s.
    pub lasts: f32,
    /// Its radius when let go and when it has gone, m.
    pub grows: [f32; 2],
    /// How it is moving when let go, m/s; it slows as it swells.
    pub velocity: Vec3,
}

/// What lights the puffs, this frame.
#[derive(ShaderType, Debug, Clone, Copy, Default)]
struct Light {
    sun: Vec4,
    sunlight: Vec4,
    skylight: Vec4,
}

#[derive(Asset, AsBindGroup, TypePath, Debug, Clone)]
struct PuffMaterial {
    #[uniform(0)]
    light: Light,
}

impl Material for PuffMaterial {
    fn fragment_shader() -> ShaderRef {
        "shaders/puff.wesl".into()
    }

    fn alpha_mode(&self) -> AlphaMode {
        AlphaMode::Premultiplied
    }

    fn enable_prepass() -> bool {
        false
    }

    fn enable_shadows() -> bool {
        false
    }

    fn specialize(
        _pipeline: &MaterialPipeline,
        descriptor: &mut RenderPipelineDescriptor,
        _layout: &MeshVertexBufferLayoutRef,
        _key: MaterialPipelineKey<Self>,
    ) -> Result<(), SpecializedMeshPipelineError> {
        // (seen by its far side, so an eye inside it still sees it; what is in front is found from the depth)
        descriptor.primitive.cull_mode = Some(Face::Front);
        if let Some(depth) = descriptor.depth_stencil.as_mut() {
            depth.depth_compare = Some(CompareFunction::Always);
            depth.depth_write_enabled = Some(false);
        }
        Ok(())
    }
}

#[derive(Resource)]
struct Stuff {
    ball: Handle<Mesh>,
    material: Handle<PuffMaterial>,
}

/// Moves and draws every [`Puff`].
pub struct SmokePlugin;

impl Plugin for SmokePlugin {
    fn build(&self, app: &mut App) {
        app.add_plugins(MaterialPlugin::<PuffMaterial>::default())
            .add_systems(Startup, make)
            .add_systems(Update, (dress, drift, light));
    }
}

fn make(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<PuffMaterial>>,
) {
    let ball = Sphere::new(1.0).mesh().ico(3).unwrap_or_else(|_| Sphere::new(1.0).into());
    commands.insert_resource(Stuff {
        ball: meshes.add(ball),
        material: materials.add(PuffMaterial { light: Light::default() }),
    });
}

fn dress(mut commands: Commands, new: Query<Entity, Added<Puff>>, stuff: Res<Stuff>) {
    for puff in &new {
        commands.entity(puff).insert((
            Mesh3d(stuff.ball.clone()),
            MeshMaterial3d(stuff.material.clone()),
            MeshTag::new(0),
            NotShadowCaster,
            NoFrustumCulling,
        ));
    }
}

/// Each puff where its age has it: slowed, swollen, and gone when its time is up.
fn drift(
    mut commands: Commands,
    air: Option<Res<Air>>,
    mut last: Local<f32>,
    mut puffs: Query<(Entity, &Puff, &mut WorldPos, &mut Transform, Option<&mut MeshTag>)>,
) {
    let Some(air) = air else { return };
    let passed = (air.clock - *last).clamp(0.0, 1.0);
    *last = air.clock;
    for (entity, puff, mut at, mut transform, tag) in &mut puffs {
        // (one let go this instant may be a step ahead of the air's clock: it is new, not gone)
        let age = ((air.clock - puff.born) / puff.lasts).max(0.0);
        if age >= 1.0 {
            commands.entity(entity).despawn();
            continue;
        }
        // It is thrown out fast and the air stops it: its speed falls away as it ages.
        at.0 += (puff.velocity * (1.0 - age).powi(3) * passed).as_dvec3();
        transform.scale = Vec3::splat(puff.grows[0] + (puff.grows[1] - puff.grows[0]) * age.sqrt());
        // (its age, and which puff it is: no two are cut to the same shape)
        if let Some(mut tag) = tag {
            tag.value = (age * 1000.0) as u32 | ((entity.index_u32() & 255) << 10);
        }
    }
}

fn light(stuff: Res<Stuff>, sky: Res<Sky>, mut materials: ResMut<Assets<PuffMaterial>>) {
    if let Some(mut material) = materials.get_mut(&stuff.material) {
        let high = sky.sun.y.max(0.03);
        material.light = Light {
            sun: sky.sun.extend(0.0),
            sunlight: (crate::clouds::sunlight(high)).extend(0.0),
            skylight: (crate::clouds::skylight(high)).extend(0.0),
        };
    }
}
