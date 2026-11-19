//! An engine's fire: a flame that is light, not paint, bright enough to bloom and to light the pad under it,
//! that spreads as the air thins and goes out when the engine does.
//!
//! The game puts a [`Plume`] where a nozzle's lip is, pointing down its own -Y, and sets how hard it burns and how
//! far it has spread; this draws it. The web build marches its flame as a volume (`src/viewer/plume.ts`); here
//! it is two shells whose brightness follows how squarely they are seen, which reads as a volume and costs
//! nothing. `rust/README.md` says so.

mod material;
mod mesh;

use bevy::camera::visibility::NoFrustumCulling;
use bevy::light::NotShadowCaster;
use bevy::prelude::*;

use material::{Fire, PlumeMaterial};

/// How bright the heart of a flame is, cd/m^2. Estimated: enough to burn out film exposed for daylight, as the
/// launch photographs are.
const BRIGHTNESS: f32 = 1.2e6;
/// The light a flame throws, lumens for each square metre of nozzle. Estimated, from the same photographs: the
/// pad under a Redstone is lit about as brightly by its fire as by the Sun.
const GLARE: f32 = 2.4e8;

/// An engine's fire.
#[derive(Component, Debug, Clone, Copy, PartialEq)]
#[require(Transform, Visibility)]
pub struct Plume {
    /// Radius of the nozzle's lip, m.
    pub radius: f32,
    /// Length of the flame at sea level, m.
    pub length: f32,
    /// Linear colours from the heart out: core, hot, warm, cool, and what is left in a vacuum.
    pub colours: [Vec3; 5],
    /// How hard it burns, 0 to 1.
    pub burning: f32,
    /// How far the thinning air has let it spread: 1 at sea level.
    pub spread: f32,
}

#[derive(Component)]
struct Shell {
    inner: bool,
    material: Handle<PlumeMaterial>,
}

#[derive(Component)]
struct Glare;

/// Draws every [`Plume`].
pub struct PlumePlugin;

impl Plugin for PlumePlugin {
    fn build(&self, app: &mut App) {
        app.add_plugins(MaterialPlugin::<PlumeMaterial>::default())
            .add_systems(Update, (kindle, burn).chain());
    }
}

fn kindle(
    mut commands: Commands,
    new: Query<(Entity, &Plume), Added<Plume>>,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<PlumeMaterial>>,
) {
    for (plume, fire) in &new {
        let shape = meshes.add(mesh::flame());
        for inner in [false, true] {
            let material = materials.add(PlumeMaterial { fire: Fire::default() });
            commands.spawn((
                Shell { inner, material: material.clone() },
                Mesh3d(shape.clone()),
                MeshMaterial3d(material),
                NotShadowCaster,
                NoFrustumCulling,
                ChildOf(plume),
            ));
        }
        let [core, ..] = fire.colours;
        commands.spawn((
            Glare,
            PointLight {
                color: Color::linear_rgb(core.x, core.y * 0.75, core.z * 0.45),
                range: 900.0,
                ..default()
            },
            Transform::from_xyz(0.0, -8.0 * fire.radius, 0.0),
            ChildOf(plume),
        ));
    }
}

fn burn(
    plumes: Query<&Plume>,
    mut shells: Query<(&Shell, &ChildOf, &mut Transform, &mut Visibility), Without<Glare>>,
    mut glares: Query<(&ChildOf, &mut PointLight), With<Glare>>,
    mut materials: ResMut<Assets<PlumeMaterial>>,
) {
    for (shell, of, mut transform, mut visibility) in &mut shells {
        let Ok(plume) = plumes.get(of.parent()) else { continue };
        *visibility = if plume.burning > 0.0 { Visibility::Inherited } else { Visibility::Hidden };
        // As the air thins the flame swells and lengthens; the inner flame is the same shape, smaller.
        let within = if shell.inner { 0.5 } else { 1.0 };
        let wide = plume.radius * plume.spread.sqrt() * within;
        let long = plume.length * plume.spread.powf(0.35) * if shell.inner { 0.62 } else { 1.0 };
        transform.scale = Vec3::new(wide, long, wide);
        if let Some(mut material) = materials.get_mut(&shell.material) {
            let [core, hot, warm, cool, thin] = plume.colours.map(|colour| colour.extend(1.0));
            let state = Vec4::new(plume.burning, plume.spread, BRIGHTNESS, f32::from(shell.inner));
            material.fire = Fire { core, hot, warm, cool, thin, state };
        }
    }
    for (of, mut light) in &mut glares {
        let Ok(plume) = plumes.get(of.parent()) else { continue };
        // (a flame spread thin in near vacuum lights nothing)
        let area = std::f32::consts::PI * plume.radius * plume.radius;
        light.intensity = GLARE * area * plume.burning / plume.spread;
    }
}
