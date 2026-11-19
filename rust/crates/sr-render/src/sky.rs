//! The Sun and the air: a physically based atmosphere round the sphere the site stands on, lit by the Sun where it
//! was. Nothing here is a colour chosen by eye: the sky's blue, the horizon's haze, the light on the pad and what
//! the vehicle reflects all come from the scattering.

use bevy::camera::Exposure;
use bevy::light::atmosphere::ScatteringMedium;
use bevy::light::light_consts::lux;
use bevy::light::{Atmosphere, CascadeShadowConfigBuilder, SunDisk, VolumetricLight};
use bevy::math::DVec3;
use bevy::prelude::*;

use crate::origin::WorldPos;

/// Where the air is taken to end above the ground, m.
const AIR_TOP: f32 = 100_000.0;

/// What the sky is drawn from. The game sets it; nothing here knows a flight.
#[derive(Resource, Debug, Clone, Copy)]
pub struct Sky {
    /// The unit vector toward the Sun, in the site's frame.
    pub sun: Vec3,
    /// The Earth's centre in the site's frame, m.
    pub centre: DVec3,
    /// The radius of the ground under the site, m.
    pub radius: f64,
}

/// The exposure a sunlit day is seen at.
pub const DAYLIGHT: Exposure = Exposure { ev100: 15.0 };

#[derive(Component)]
struct Sun;

/// The Sun and the atmosphere.
pub struct SkyPlugin;

impl Plugin for SkyPlugin {
    fn build(&self, app: &mut App) {
        app.insert_resource(GlobalAmbientLight::NONE)
            .add_systems(Startup, raise)
            .add_systems(Update, turn_sun);
    }
}

fn raise(mut commands: Commands, sky: Res<Sky>, mut media: ResMut<Assets<ScatteringMedium>>) {
    let radius = sky.radius as f32;
    commands.spawn((
        Atmosphere {
            inner_radius: radius,
            outer_radius: radius + AIR_TOP,
            ..Atmosphere::earth(media.add(ScatteringMedium::earth(256, 256)))
        },
        WorldPos(sky.centre),
    ));
    commands.spawn((
        Sun,
        DirectionalLight { illuminance: lux::RAW_SUNLIGHT, shadow_maps_enabled: true, ..default() },
        SunDisk::EARTH,
        VolumetricLight,
        // Four maps: the first holds a person's shadow sharp at arm's length, the last reaches across the complex.
        CascadeShadowConfigBuilder {
            num_cascades: 4,
            minimum_distance: 0.2,
            first_cascade_far_bound: 18.0,
            maximum_distance: 1_400.0,
            overlap_proportion: 0.25,
        }
        .build(),
        Transform::default().looking_to(-sky.sun, Vec3::Y),
    ));
}

fn turn_sun(sky: Res<Sky>, mut sun: Query<&mut Transform, With<Sun>>) {
    if sky.is_changed() {
        for mut transform in &mut sun {
            transform.look_to(-sky.sun, Vec3::Y);
        }
    }
}
