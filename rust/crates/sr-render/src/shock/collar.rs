//! The collar of vapour a body near the speed of sound wears where its flow turns back past a shoulder: the air
//! expands and cools there, and if it was humid enough its water condenses in a bell trailing aft from the
//! shoulder until the shock behind squeezes it dry again.
//!
//! It is drawn as a thin open bell of mist, streaked along the flow and lit as the fumes and the puffs are, as
//! dense as the game says. Its shape is an estimate from films of other launches: no film of a Mercury-Redstone
//! going through the speed of sound was found.

use std::f32::consts::TAU;

use bevy::asset::RenderAssetUsages;
use bevy::camera::visibility::NoFrustumCulling;
use bevy::light::NotShadowCaster;
use bevy::mesh::{Indices, MeshVertexBufferLayoutRef, PrimitiveTopology};
use bevy::pbr::{MaterialPipeline, MaterialPipelineKey};
use bevy::prelude::*;
use bevy::render::render_resource::{
    AsBindGroup, RenderPipelineDescriptor, ShaderType, SpecializedMeshPipelineError,
};
use bevy::shader::ShaderRef;

use super::Collar;
use crate::air::Air;
use crate::sky::Sky;

/// The bell: how long it trails aft and how wide it is at its foot, in shoulder radii. Estimated from the
/// collars on films of other launches near Mach 1 (Saturn I and V, the Shuttle): about as long as the body is
/// wide, flaring by a third.
const LONG: f32 = 1.4;
const FLARES: f32 = 1.35;
/// Segments round it and along it.
const ROUND: u32 = 48;
const ALONG: u32 = 6;

/// What the bell is handed each frame.
#[derive(ShaderType, Debug, Clone, Copy, Default)]
pub struct Mist {
    /// How dense it is (0 to 1), the clock (s), and its radius at the shoulder (m).
    pub state: Vec4,
    /// Toward the Sun, in the world.
    pub sun: Vec4,
    /// The Sun's light, lux, and the sky's, cd/m^2.
    pub sunlight: Vec4,
    /// As `sunlight`.
    pub skylight: Vec4,
}

/// The collar's material.
#[derive(Asset, AsBindGroup, TypePath, Debug, Clone)]
pub struct CollarMaterial {
    /// This frame's figures.
    #[uniform(0)]
    pub mist: Mist,
}

impl Material for CollarMaterial {
    fn fragment_shader() -> ShaderRef {
        "shaders/collar.wesl".into()
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

    /// Both its faces are seen: it is a sheet of mist, not a solid.
    fn specialize(
        _pipeline: &MaterialPipeline,
        descriptor: &mut RenderPipelineDescriptor,
        _layout: &MeshVertexBufferLayoutRef,
        _key: MaterialPipelineKey<Self>,
    ) -> Result<(), SpecializedMeshPipelineError> {
        descriptor.primitive.cull_mode = None;
        if let Some(depth) = descriptor.depth_stencil.as_mut() {
            depth.depth_write_enabled = Some(false);
        }
        Ok(())
    }
}

/// The open bell, one unit in radius at its shoulder (y = 0), trailing aft down -Y; u round it, v along it.
fn bell() -> Mesh {
    let mut positions = Vec::new();
    let mut normals = Vec::new();
    let mut uvs = Vec::new();
    for j in 0..=ALONG {
        let v = j as f32 / ALONG as f32;
        // (it bellies out fast at the shoulder and then runs nearly straight aft)
        let radius = 1.0 + (FLARES - 1.0) * (1.0 - (1.0 - v).powi(2));
        let slope = 2.0 * (FLARES - 1.0) * (1.0 - v) / LONG;
        for i in 0..=ROUND {
            let u = i as f32 / ROUND as f32;
            let (sin, cos) = (TAU * u).sin_cos();
            positions.push([radius * cos, -LONG * v, radius * sin]);
            normals.push(Vec3::new(cos, slope, sin).normalize().to_array());
            uvs.push([u, v]);
        }
    }
    let mut indices = Vec::new();
    for j in 0..ALONG {
        for i in 0..ROUND {
            let a = j * (ROUND + 1) + i;
            let b = a + ROUND + 1;
            indices.extend([a, b, a + 1, a + 1, b, b + 1]);
        }
    }
    Mesh::new(PrimitiveTopology::TriangleList, RenderAssetUsages::default())
        .with_inserted_attribute(Mesh::ATTRIBUTE_POSITION, positions)
        .with_inserted_attribute(Mesh::ATTRIBUTE_NORMAL, normals)
        .with_inserted_attribute(Mesh::ATTRIBUTE_UV_0, uvs)
        .with_inserted_indices(Indices::U32(indices))
}

/// The collar's bell.
#[derive(Component)]
pub struct Sheet(Handle<CollarMaterial>);

/// Give each new collar its bell.
pub fn kindle(
    mut commands: Commands,
    new: Query<Entity, Added<Collar>>,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<CollarMaterial>>,
    mut shape: Local<Option<Handle<Mesh>>>,
) {
    for collar in &new {
        let shape = shape.get_or_insert_with(|| meshes.add(bell())).clone();
        let material = materials.add(CollarMaterial { mist: Mist::default() });
        commands.spawn((
            Sheet(material.clone()),
            Mesh3d(shape),
            MeshMaterial3d(material),
            NotShadowCaster,
            NoFrustumCulling,
            Visibility::Hidden,
            ChildOf(collar),
        ));
    }
}

/// Each frame: every collar as dense as the game has it, sized to its shoulder and lit.
pub fn show(
    air: Option<Res<Air>>,
    sky: Res<Sky>,
    collars: Query<&Collar>,
    mut sheets: Query<(&Sheet, &ChildOf, &mut Transform, &mut Visibility)>,
    mut materials: ResMut<Assets<CollarMaterial>>,
) {
    let clock = air.map_or(0.0, |air| air.clock);
    let high = sky.sun.y.max(0.03);
    for (sheet, of, mut transform, mut visibility) in &mut sheets {
        let Ok(collar) = collars.get(of.parent()) else { continue };
        let shown = if collar.density > 1.0e-3 { Visibility::Inherited } else { Visibility::Hidden };
        if *visibility != shown {
            *visibility = shown;
        }
        if collar.density <= 1.0e-3 {
            continue;
        }
        transform.scale = Vec3::splat(collar.radius);
        if let Some(mut material) = materials.get_mut(&sheet.0) {
            material.mist = Mist {
                state: Vec4::new(collar.density.min(1.0), clock, collar.radius, 0.0),
                sun: sky.sun.extend(0.0),
                sunlight: crate::clouds::sunlight(high).extend(0.0),
                skylight: crate::clouds::skylight(high).extend(0.0),
            };
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_bell_starts_at_the_shoulder_and_flares_aft() {
        let mesh = bell();
        let Some(positions) = mesh.attribute(Mesh::ATTRIBUTE_POSITION).and_then(|a| a.as_float3()) else {
            panic!("the bell has no positions");
        };
        let first = Vec3::from_array(positions[0]);
        let last = Vec3::from_array(positions[positions.len() - 1]);
        assert!((first.length() - 1.0).abs() < 1e-5 && first.y == 0.0);
        assert!((last.y + LONG).abs() < 1e-5 && (last.xz().length() - FLARES).abs() < 1e-4);
    }
}
