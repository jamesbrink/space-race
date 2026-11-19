//! A lamp's beam in the air: the haze lit inside its cone, marched along the eye's ray (`shaders/beam.wesl`).
//!
//! The light it throws back is single scattering by the day's haze (Koschmieder: the scattering is 3.9 over the
//! visibility, the haze being near enough all scatter and no absorption), leaning forward as haze does (a
//! Henyey-Greenstein lean, [`LEAN`]), times [`DAMP`].

use std::f32::consts::TAU;

use bevy::asset::RenderAssetUsages;
use bevy::camera::visibility::NoFrustumCulling;
use bevy::light::{NotShadowCaster, NotShadowReceiver};
use bevy::mesh::{Indices, MeshVertexBufferLayoutRef, PrimitiveTopology};
use bevy::pbr::{MaterialPipeline, MaterialPipelineKey};
use bevy::platform::collections::HashMap;
use bevy::prelude::*;
use bevy::render::render_resource::{
    AsBindGroup, CompareFunction, Face, RenderPipelineDescriptor, ShaderType, SpecializedMeshPipelineError,
};
use bevy::shader::ShaderRef;

use super::Kind;
use crate::air::Air;
use crate::night::Dusk;

/// How much more the air by the sea at night scatters than the day's visibility says: the haze swells as the air
/// cools toward its dew point after dark. Estimated (the night's visibility is not recorded); chosen so a flood's
/// beam reads as it does in photographs of pads lit at night.
const DAMP: f32 = 12.0;
/// The haze's forward lean (Henyey-Greenstein g). Estimated: a maritime haze's is 0.6 to 0.75; held lower so that
/// looking into a lamp does not drown its head in its own glow.
const LEAN: f32 = 0.35;
/// How far a beam is drawn from its lamp, m: past the vehicle it is aimed at.
const REACH: [f32; 3] = [70.0, 220.0, 15.0];

#[derive(ShaderType, Debug, Clone, Copy, Default)]
struct BeamFigures {
    light: Vec4,
    shape: Vec4,
}

#[derive(Asset, AsBindGroup, TypePath, Debug, Clone)]
struct BeamMaterial {
    #[uniform(0)]
    beam: BeamFigures,
}

impl Material for BeamMaterial {
    fn fragment_shader() -> ShaderRef {
        "shaders/beam.wesl".into()
    }

    fn alpha_mode(&self) -> AlphaMode {
        AlphaMode::Add
    }

    fn enable_prepass() -> bool {
        false
    }

    fn enable_shadows() -> bool {
        false
    }

    /// Seen by its far faces, so an eye inside the beam still sees it; what stands in front is found from the depth.
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

/// Each kind's beam: its cone and its material.
#[derive(Resource, Default)]
struct Beams(HashMap<u8, (Handle<Mesh>, Handle<BeamMaterial>)>);

fn slot(kind: Kind) -> usize {
    match kind {
        Kind::Flood => 0,
        Kind::Search => 1,
        Kind::Work => 2,
    }
}

pub(super) fn build(app: &mut App) {
    app.add_plugins(MaterialPlugin::<BeamMaterial>::default())
        .init_resource::<Beams>()
        .add_systems(PreUpdate, make)
        .add_systems(Update, pour);
}

/// A cone with its apex at the origin, opening along -Z: `length` long, `half` radians half-wide, and its cap.
fn cone(length: f32, half: f32) -> Mesh {
    const SIDES: u32 = 24;
    let radius = length * half.tan() * 1.05;
    let mut at = vec![[0.0, 0.0, 0.0], [0.0, 0.0, -length]];
    for i in 0..SIDES {
        let (s, c) = (TAU * i as f32 / SIDES as f32).sin_cos();
        at.push([radius * c, radius * s, -length]);
    }
    let mut index = Vec::new();
    for i in 0..SIDES {
        let (a, b) = (2 + i, 2 + (i + 1) % SIDES);
        index.extend_from_slice(&[0, a, b, 1, b, a]);
    }
    let normals = vec![[0.0, 0.0, -1.0]; at.len()];
    Mesh::new(PrimitiveTopology::TriangleList, RenderAssetUsages::RENDER_WORLD)
        .with_inserted_attribute(Mesh::ATTRIBUTE_POSITION, at)
        .with_inserted_attribute(Mesh::ATTRIBUTE_NORMAL, normals)
        .with_inserted_indices(Indices::U32(index))
}

fn make(
    mut beams: ResMut<Beams>,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<BeamMaterial>>,
) {
    if !beams.0.is_empty() {
        return;
    }
    for kind in [Kind::Flood, Kind::Search, Kind::Work] {
        let (outer, _) = kind.cone();
        let mesh = meshes.add(cone(REACH[slot(kind)], outer));
        let material = materials.add(BeamMaterial { beam: BeamFigures::default() });
        beams.0.insert(slot(kind) as u8, (mesh, material));
    }
}

/// A lamp's beam, hung on its light.
#[derive(Component)]
pub(super) struct BeamOf;

/// Hang a beam on a lamp's light (it is shown and hidden with it).
pub(super) fn hang(commands: &mut Commands, light: Entity, kind: Kind) {
    commands.entity(light).insert(Hung(kind));
}

/// A light whose beam is still to be hung (the cones are made in the first frame).
#[derive(Component)]
pub(super) struct Hung(Kind);

/// The beams follow the lamps' level and the day's haze.
fn pour(
    mut commands: Commands,
    beams: Res<Beams>,
    hung: Query<(Entity, &Hung)>,
    dusk: Res<Dusk>,
    air: Option<Res<Air>>,
    mut materials: ResMut<Assets<BeamMaterial>>,
) {
    for (light, Hung(kind)) in &hung {
        let Some((mesh, material)) = beams.0.get(&(slot(*kind) as u8)) else { continue };
        commands.entity(light).remove::<Hung>().with_child((
            BeamOf,
            Mesh3d(mesh.clone()),
            MeshMaterial3d(material.clone()),
            Transform::default(),
            NoFrustumCulling,
            NotShadowCaster,
            NotShadowReceiver,
        ));
    }
    let scatter = 3.912 / air.map_or(20_000.0, |a| a.visibility.max(500.0)) * DAMP;
    for kind in [Kind::Flood, Kind::Search, Kind::Work] {
        let Some((_, handle)) = beams.0.get(&(slot(kind) as u8)) else { continue };
        let (outer, inner) = kind.cone();
        let colour = kind.colour().to_linear().to_vec3() * kind.candela() * dusk.lamps;
        let figures = BeamFigures {
            light: colour.extend(outer.cos()),
            shape: Vec4::new(inner.cos(), scatter, LEAN, REACH[slot(kind)]),
        };
        if materials
            .get(handle)
            .is_some_and(|m| m.beam.light != figures.light || m.beam.shape != figures.shape)
            && let Some(mut material) = materials.get_mut(handle)
        {
            material.beam = figures;
        }
    }
}
