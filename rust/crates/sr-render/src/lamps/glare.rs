//! The glare of a lit lamp's head from the eye: a hot core, a halo and a star (`shaders/glare.wesl`).
//!
//! Every lamp's glare is one mesh, made again each frame from where the heads are and how much of each lamp's light
//! reaches the eye: four corners a head, carrying its place, its light on the screen's scale and its size.

use bevy::asset::RenderAssetUsages;
use bevy::camera::Exposure;
use bevy::camera::visibility::NoFrustumCulling;
use bevy::light::{NotShadowCaster, NotShadowReceiver};
use bevy::mesh::{Indices, MeshVertexBufferLayoutRef, PrimitiveTopology};
use bevy::pbr::{MaterialPipeline, MaterialPipelineKey};
use bevy::prelude::*;
use bevy::render::render_resource::{
    AsBindGroup, CompareFunction, RenderPipelineDescriptor, SpecializedMeshPipelineError,
};
use bevy::shader::ShaderRef;

use super::{Kind, Lamp};
use crate::night::Dusk;
use crate::origin::Eye;

/// How much of its beam's light a lamp's lens shows the eye from the side: its glass and bowl lit. Estimated.
const SPILL: f32 = 0.25;
/// Pixels of glare for each unit (square-rooted) of the lamp's light at the eye on the screen's scale. Estimated:
/// chosen so a pole's floods 40 m off read as stars a few tens of pixels across.
const SPREAD: f32 = 110.0;
/// The most a glare's core is drawn at, on the screen's scale. Estimated: hot, a few times white.
const HOTTEST: f32 = 3.0;
/// How much brighter the glare's core is drawn than the lamp's light at the eye on the screen's scale: the head is a
/// point far brighter than anything round it, which the eye sees as a burning star. Estimated.
const GAIN: f32 = 4.0;
/// The widest a glare is drawn, pixels.
const WIDEST: f32 = 420.0;

#[derive(Asset, AsBindGroup, TypePath, Debug, Clone)]
struct GlareMaterial {}

impl Material for GlareMaterial {
    fn vertex_shader() -> ShaderRef {
        "shaders/glare.wesl".into()
    }

    fn fragment_shader() -> ShaderRef {
        "shaders/glare.wesl".into()
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

    /// Laid over the frame wherever it reaches: whether it shows at all is the head's own depth, tested in the shader.
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
        descriptor.primitive.cull_mode = None;
        if let Some(depth) = descriptor.depth_stencil.as_mut() {
            depth.depth_compare = Some(CompareFunction::Always);
            depth.depth_write_enabled = Some(false);
        }
        Ok(())
    }
}

/// The glares' mesh.
#[derive(Component)]
struct Glares(Handle<Mesh>);

pub(super) fn build(app: &mut App) {
    app.add_plugins(MaterialPlugin::<GlareMaterial>::default())
        .add_systems(Startup, make)
        .add_systems(PostUpdate, shine.after(TransformSystems::Propagate));
}

/// One head's corners with no light in them: what the mesh holds until a lamp is lit (an empty mesh is refused).
fn empty() -> Mesh {
    Mesh::new(PrimitiveTopology::TriangleList, RenderAssetUsages::default())
        .with_inserted_attribute(Mesh::ATTRIBUTE_POSITION, vec![[0.0f32; 3]; 4])
        .with_inserted_attribute(Mesh::ATTRIBUTE_UV_0, vec![[0.0f32; 2]; 4])
        .with_inserted_attribute(Mesh::ATTRIBUTE_COLOR, vec![[0.0f32; 4]; 4])
        .with_inserted_indices(Indices::U32(vec![0, 1, 2, 0, 2, 3]))
}

fn make(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<GlareMaterial>>,
) {
    let mesh = meshes.add(empty());
    commands.spawn((
        Glares(mesh.clone()),
        Mesh3d(mesh),
        MeshMaterial3d(materials.add(GlareMaterial {})),
        Transform::default(),
        Visibility::Hidden,
        NoFrustumCulling,
        NotShadowCaster,
        NotShadowReceiver,
    ));
}

/// How much of a lamp's light reaches the eye, on the screen's scale, and so how large its glare is.
fn seen(kind: Kind, at: &GlobalTransform, eye: Vec3, lit: f32, exposure: f32) -> (Vec3, f32) {
    let to_eye = eye - at.translation();
    let far = to_eye.length().max(1.0);
    let (outer, inner) = kind.cone();
    let facing = at.forward().dot(to_eye / far);
    let edge = ((facing - outer.cos()) / (inner.cos() - outer.cos())).clamp(0.0, 1.0);
    let toward = SPILL + (1.0 - SPILL) * edge * edge * (3.0 - 2.0 * edge);
    let lux = kind.candela() * lit * toward / (far * far) * exposure;
    let shown = kind.colour().to_linear().to_vec3() * (lux * GAIN).min(HOTTEST);
    (shown, (SPREAD * lux.sqrt()).min(WIDEST))
}

/// Each frame, every lit head where it is and as it looks from the eye.
fn shine(
    dusk: Res<Dusk>,
    eyes: Query<(&GlobalTransform, &Exposure), With<Eye>>,
    lamps: Query<(&Lamp, &GlobalTransform, &InheritedVisibility)>,
    mut glares: Query<(&Glares, &mut Visibility)>,
    mut meshes: ResMut<Assets<Mesh>>,
) {
    let Ok((eye, exposure)) = eyes.single() else { return };
    let Ok((Glares(handle), mut visibility)) = glares.single_mut() else { return };
    let shown = if dusk.lamps > 0.0 { Visibility::Inherited } else { Visibility::Hidden };
    if *visibility != shown {
        *visibility = shown;
    }
    if dusk.lamps <= 0.0 {
        return;
    }
    let (mut at, mut corner, mut light, mut index) = (Vec::new(), Vec::new(), Vec::new(), Vec::new());
    for (lamp, place, inherited) in &lamps {
        let (glow, radius) = seen(lamp.kind, place, eye.translation(), dusk.lamps, exposure.exposure());
        if !inherited.get() || radius < 1.0 {
            continue;
        }
        let first = at.len() as u32;
        for c in [[-1.0, -1.0], [1.0, -1.0], [1.0, 1.0], [-1.0, 1.0]] {
            at.push(place.translation().to_array());
            corner.push(c);
            light.push(glow.extend(radius).to_array());
        }
        index.extend_from_slice(&[first, first + 1, first + 2, first, first + 2, first + 3]);
    }
    if let Some(mut mesh) = meshes.get_mut(handle) {
        mesh.insert_attribute(Mesh::ATTRIBUTE_POSITION, at);
        mesh.insert_attribute(Mesh::ATTRIBUTE_UV_0, corner);
        mesh.insert_attribute(Mesh::ATTRIBUTE_COLOR, light);
        mesh.insert_indices(Indices::U32(index));
    }
}
