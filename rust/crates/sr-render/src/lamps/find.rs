//! Finding the lamps in a model as it arrives: each lens mesh's vertices gathered into fittings, each fitting a
//! spot light hung on the mesh.

use bevy::gltf::{GltfExtras, GltfMaterialName};
use bevy::mesh::VertexAttributeValues;
use bevy::prelude::*;
use bevy::world_serialization::WorldInstanceReady;

use super::{Kind, Lamp, Lens, beam};

/// Lenses within this of each other are one fitting, m (the web build's `FITTING`).
const FITTING: f32 = 3.2;
/// The fittings that cast shadows: the pad's own poles round the vehicle, the strongest light on it. Each shadow is
/// the scene drawn again, so the floods of the other buildings and pads round the complex cast none.
const SHADOWED: &str = "Floodlights_Pole";
/// How far in front of its lens a lamp's light is hung, m: clear of its own housing, which would shade it.
const CLEAR: f32 = 0.35;

/// A fitting: where its lenses gather and the way they face, in the mesh's own frame.
struct Fitting {
    at: Vec3,
    facing: Vec3,
    lenses: f32,
}

/// The fittings of one mesh.
fn gather(mesh: &Mesh) -> Vec<Fitting> {
    let (Some(VertexAttributeValues::Float32x3(at)), Some(VertexAttributeValues::Float32x3(normal))) =
        (mesh.attribute(Mesh::ATTRIBUTE_POSITION), mesh.attribute(Mesh::ATTRIBUTE_NORMAL))
    else {
        return Vec::new();
    };
    let mut found: Vec<Fitting> = Vec::new();
    for (p, n) in at.iter().zip(normal) {
        let (p, n) = (Vec3::from_array(*p), Vec3::from_array(*n));
        let fitting = if let Some(f) = found.iter_mut().find(|f| f.at.distance(p) < FITTING) {
            f
        } else {
            found.push(Fitting { at: p, facing: Vec3::ZERO, lenses: 0.0 });
            let last = found.len() - 1;
            &mut found[last]
        };
        // (the running middle of what has gathered here)
        fitting.at = (fitting.at * fitting.lenses + p) / (fitting.lenses + 1.0);
        fitting.facing += n;
        fitting.lenses += 1.0;
    }
    found.retain(|f| f.facing.length_squared() > 1e-6);
    found
}

/// What a lens's node says of itself and its fitting: whose it is, and whether the lens was built facing out.
fn describe(name: &str, material: &str, extras: Option<&GltfExtras>) -> Option<(Kind, bool)> {
    let kind = if material.starts_with("lamp-flood-search") {
        Kind::Search
    } else if material == "lamp" && (name.contains("Flood")) {
        Kind::Flood
    } else if material == "lamp" {
        Kind::Work
    } else {
        return None;
    };
    // The site builders draw a lens as the inside face of the lamp's bowl, so its normals face into the housing;
    // one built facing out says so (`lens_out`).
    let out = extras.is_some_and(|e| e.value.contains("lens_out"));
    Some((kind, out))
}

/// When a model arrives: a light for each fitting of each lamp lens in it.
pub(super) fn fittings(
    ready: On<WorldInstanceReady>,
    children: Query<&Children>,
    lenses: Query<(&Mesh3d, &MeshMaterial3d<StandardMaterial>, &GltfMaterialName, &ChildOf)>,
    nodes: Query<(Option<&Name>, Option<&GltfExtras>)>,
    meshes: Res<Assets<Mesh>>,
    materials: Res<Assets<StandardMaterial>>,
    mut commands: Commands,
) {
    for part in children.iter_descendants(ready.entity) {
        let Ok((mesh, material, material_name, parent)) = lenses.get(part) else { continue };
        let Ok((name, extras)) = nodes.get(parent.parent()) else { continue };
        let name = name.map_or("", Name::as_str);
        let Some((kind, out)) = describe(name, material_name, extras) else { continue };
        let Some(mesh) = meshes.get(&mesh.0) else { continue };
        let glow = materials.get(&material.0).map_or(LinearRgba::BLACK, |m| m.emissive);
        commands.entity(part).insert(Lens(material.0.clone(), glow));
        for fitting in gather(mesh) {
            let facing = if out { fitting.facing } else { -fitting.facing }.normalize();
            let up = if facing.y.abs() > 0.99 { Vec3::Z } else { Vec3::Y };
            let (outer, inner) = kind.cone();
            let light = commands
                .spawn((
                    Lamp { kind },
                    SpotLight {
                        color: kind.colour(),
                        intensity: 0.0,
                        range: kind.range(),
                        radius: 0.25,
                        outer_angle: outer,
                        inner_angle: inner,
                        shadow_maps_enabled: kind == Kind::Flood && name.starts_with(SHADOWED),
                        ..default()
                    },
                    Transform::from_translation(fitting.at + facing * CLEAR).looking_to(facing, up),
                    Visibility::Hidden,
                    ChildOf(part),
                ))
                .id();
            beam::hang(&mut commands, light, kind);
        }
    }
}
