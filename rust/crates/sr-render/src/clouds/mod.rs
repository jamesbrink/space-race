//! The day's clouds, as volumes: marched through from the eye, lit by the Sun through themselves and by the sky,
//! standing in the air where the record puts them and drifting on its wind (`crate::air::Air`).
//!
//! The web build marches a cut-down field at half resolution in WebGL; here the whole of it is marched at full
//! resolution every frame, with a second march toward the Sun at every step.

mod material;
mod volume;

use bevy::camera::visibility::NoFrustumCulling;
use bevy::light::NotShadowCaster;
use bevy::light::light_consts::lux;
use bevy::prelude::*;

use crate::air::{Air, Layer};
use crate::earth::Ground;
use crate::origin::{Eye, Origin, Place};
use crate::sky::Sky;
use material::{CloudFrame, CloudMaterial};

/// How much of the Sun's light each colour loses to an air mass (optical depths; `src/viewer/daysky.ts`:
/// estimated, tuned by eye there for a 50 degree Sun).
const AIR_MASS: Vec3 = Vec3::new(0.06, 0.10, 0.19);
/// The clear sky's light on a cloud with the Sun overhead, cd/m^2 (estimated: a noon zenith is 4,000 to 8,000).
const SKYLIGHT: Vec3 = Vec3::new(2_300.0, 3_900.0, 6_800.0);

#[derive(Resource)]
struct Sheet(Handle<CloudMaterial>);

/// The clouds. Nothing is drawn until the game puts an [`Air`] in the world.
pub struct CloudsPlugin;

impl Plugin for CloudsPlugin {
    fn build(&self, app: &mut App) {
        app.add_plugins(MaterialPlugin::<CloudMaterial>::default())
            .add_systems(Startup, make)
            .add_systems(Update, hang)
            .add_systems(PostUpdate, look.after(Place));
    }
}

fn make(
    mut commands: Commands,
    mut images: ResMut<Assets<Image>>,
    mut materials: ResMut<Assets<CloudMaterial>>,
) {
    let material = CloudMaterial { frame: CloudFrame::default(), volume: images.add(volume::block()) };
    commands.insert_resource(Sheet(materials.add(material)));
}

/// The ball the clouds are drawn on goes with the eye.
fn hang(
    mut commands: Commands,
    new: Query<Entity, Added<Eye>>,
    sheet: Res<Sheet>,
    mut meshes: ResMut<Assets<Mesh>>,
) {
    for eye in &new {
        let ball = meshes.add(Sphere::new(1.0).mesh().ico(2).unwrap_or_else(|_| Sphere::new(1.0).into()));
        commands.spawn((
            Mesh3d(ball),
            MeshMaterial3d(sheet.0.clone()),
            NotShadowCaster,
            NoFrustumCulling,
            ChildOf(eye),
        ));
    }
}

/// The Sun's light as it reaches a cloud through the air in its way, lux in red, green and blue, with the Sun
/// this high (the sine of its elevation).
#[must_use]
pub fn sunlight(high: f32) -> Vec3 {
    lux::RAW_SUNLIGHT * (-AIR_MASS / high.max(0.03)).exp()
}

/// The clear sky's light on a cloud, cd/m^2: less as the Sun goes down.
#[must_use]
pub fn skylight(high: f32) -> Vec3 {
    SKYLIGHT * high.max(0.03).sqrt()
}

fn layer(l: Layer) -> Vec4 {
    Vec4::new(l.cover, l.base, l.depth, l.size)
}

/// This frame's figures: where the eye is in the air, where the Sun is, what the day's cloud is.
fn look(
    sheet: Res<Sheet>,
    origin: Res<Origin>,
    sky: Res<Sky>,
    ground: Res<Ground>,
    air: Option<Res<Air>>,
    mut materials: ResMut<Assets<CloudMaterial>>,
) {
    let (Some(air), Some(mut material)) = (air, materials.get_mut(&sheet.0)) else { return };
    let from_centre = origin.0 - sky.centre;
    let height = (from_centre.length() - sky.radius) as f32;
    let up = from_centre.normalize().as_vec3();
    let over = Vec2::new(origin.0.as_vec3().dot(ground.east), origin.0.as_vec3().dot(ground.north));
    let (cumulus, deck) = (over - air.cumulus.drift * air.clock, over - air.deck.drift * air.clock);
    // The Sun's light as it reaches the cloud, through the air in its way; and less sky as the Sun goes down.
    let high = sky.sun.dot(up);
    material.frame = CloudFrame {
        up: up.extend(height),
        east: ground.east.extend(sky.radius as f32),
        north: ground.north.extend(air.clock),
        sun: sky.sun.extend(air.visibility),
        sunlight: sunlight(high).extend(0.0),
        skylight: skylight(high).extend(0.0),
        over: Vec4::new(cumulus.x, cumulus.y, deck.x, deck.y),
        cumulus: layer(air.cumulus),
        deck: layer(air.deck),
    };
}
