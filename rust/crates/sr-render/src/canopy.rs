//! A parachute: a canopy of gores in two colours on its lines, that opens as it fills.
//!
//! The game puts a [`Canopy`] where the lines meet, pointing up its own +Y, and says how full it is.

use bevy::asset::RenderAssetUsages;
use bevy::mesh::{Indices, PrimitiveTopology};
use bevy::prelude::*;

/// Gores round the canopy, rings from its rim to its crown, and lines.
const GORES: u32 = 24;
const RINGS: u32 = 8;
const LINES: u32 = 12;
/// A line's width, m: drawn wider than it is, so it is there to be seen.
const LINE_WIDTH: f32 = 0.04;
/// How narrow the canopy is when it first comes out, as a fraction of full.
const REEFED: f32 = 0.14;

/// A parachute.
#[derive(Component, Debug, Clone, Copy, PartialEq)]
#[require(Transform, Visibility)]
pub struct Canopy {
    /// The filled canopy's radius, m.
    pub radius: f32,
    /// From where the lines meet to the canopy's rim, m.
    pub lines: f32,
    /// The gores' two colours, linear.
    pub colours: [Vec3; 2],
    /// How full it is, 0 to 1.
    pub filled: f32,
}

#[derive(Component)]
struct Cloth;

/// Draws every [`Canopy`].
pub struct CanopyPlugin;

impl Plugin for CanopyPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Update, (hang, fill).chain());
    }
}

/// The canopy and its lines as one mesh, filled: its rim `lines` up from where the lines meet.
fn cloth(canopy: &Canopy) -> Mesh {
    let (mut positions, mut normals, mut colours, mut indices) =
        (Vec::new(), Vec::new(), Vec::new(), Vec::new());
    let crown = 0.62 * canopy.radius;
    for gore in 0..GORES {
        let colour = canopy.colours[(gore % 2) as usize].extend(1.0).to_array();
        for side in 0..=1 {
            let turn = std::f32::consts::TAU * (gore + side) as f32 / GORES as f32;
            for ring in 0..=RINGS {
                // A quarter of an ellipse from the rim up to the crown.
                let rise = std::f32::consts::FRAC_PI_2 * ring as f32 / RINGS as f32;
                let (out, up) = (canopy.radius * rise.cos(), crown * rise.sin());
                positions.push([out * turn.cos(), canopy.lines + up, out * turn.sin()]);
                normals
                    .push(Vec3::new(rise.cos() * turn.cos(), rise.sin(), rise.cos() * turn.sin()).to_array());
                colours.push(colour);
            }
        }
        let first = gore * 2 * (RINGS + 1);
        for ring in 0..RINGS {
            let (a, b) = (first + ring, first + RINGS + 1 + ring);
            indices.extend([a, a + 1, b, b, a + 1, b + 1]);
        }
    }
    for line in 0..LINES {
        let turn = std::f32::consts::TAU * line as f32 / LINES as f32;
        let rim = Vec3::new(canopy.radius * turn.cos(), canopy.lines, canopy.radius * turn.sin());
        let across = Vec3::new(-turn.sin(), 0.0, turn.cos()) * LINE_WIDTH;
        let first = positions.len() as u32;
        for corner in [Vec3::ZERO - across, Vec3::ZERO + across, rim - across, rim + across] {
            positions.push(corner.to_array());
            normals.push([turn.cos(), 0.0, turn.sin()]);
            colours.push([0.85, 0.83, 0.78, 1.0]);
        }
        indices.extend([first, first + 1, first + 2, first + 2, first + 1, first + 3]);
    }
    Mesh::new(PrimitiveTopology::TriangleList, RenderAssetUsages::RENDER_WORLD)
        .with_inserted_attribute(Mesh::ATTRIBUTE_POSITION, positions)
        .with_inserted_attribute(Mesh::ATTRIBUTE_NORMAL, normals)
        .with_inserted_attribute(Mesh::ATTRIBUTE_COLOR, colours)
        .with_inserted_indices(Indices::U32(indices))
}

fn hang(
    mut commands: Commands,
    new: Query<(Entity, &Canopy), Added<Canopy>>,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<StandardMaterial>>,
) {
    for (entity, canopy) in &new {
        // Nylon: matt, seen from both sides, and the light comes through it a little.
        let nylon = StandardMaterial {
            perceptual_roughness: 0.85,
            double_sided: true,
            cull_mode: None,
            diffuse_transmission: 0.35,
            ..default()
        };
        commands.spawn((
            Cloth,
            Mesh3d(meshes.add(cloth(canopy))),
            MeshMaterial3d(materials.add(nylon)),
            ChildOf(entity),
        ));
    }
}

/// It opens: narrow as it comes out, full when it has filled.
fn fill(canopies: Query<&Canopy>, mut cloths: Query<(&ChildOf, &mut Transform), With<Cloth>>) {
    for (of, mut transform) in &mut cloths {
        let Ok(canopy) = canopies.get(of.parent()) else { continue };
        let open = REEFED + (1.0 - REEFED) * canopy.filled.clamp(0.0, 1.0);
        transform.scale = Vec3::new(open, 1.0, open);
    }
}
