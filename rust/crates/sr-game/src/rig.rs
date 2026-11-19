//! The camera's rig: where the eye stands and what it looks at (docs/agents/camera.md: one camera, a set of
//! rigs). For now one rig: turning about a point, by the mouse.

use bevy::input::mouse::{AccumulatedMouseMotion, AccumulatedMouseScroll, MouseScrollUnit};
use bevy::math::DVec3;
use bevy::prelude::*;
use sr_missions::Role;
use sr_render::eye::eye;
use sr_render::origin::{Eye, Place, WorldPos};

use crate::{Options, Showing};

/// Degrees turned for a point of mouse travel.
const TURN: f32 = 0.25;
/// The eye keeps off the ground by this much, m.
const CLEAR: f64 = 0.3;

/// The eye turning about a point.
#[derive(Resource, Debug, Clone, Copy, PartialEq)]
pub struct Rig {
    /// What it looks at, in the site's frame, m.
    pub focus: DVec3,
    /// Which way the eye stands from it, degrees about the vertical from +Z toward +X.
    pub bearing: f32,
    /// How high the eye stands above it, degrees.
    pub elevation: f32,
    /// How far, m.
    pub distance: f32,
}

impl Rig {
    /// Where the eye stands.
    #[must_use]
    pub fn eye(&self) -> DVec3 {
        let (sb, cb) = self.bearing.to_radians().sin_cos();
        let (se, ce) = self.elevation.to_radians().sin_cos();
        let mut at = self.focus + (Vec3::new(ce * sb, se, ce * cb) * self.distance).as_dvec3();
        at.y = at.y.max(CLEAR);
        at
    }
}

/// The camera and its rig.
pub struct RigPlugin;

impl Plugin for RigPlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Startup, mount).add_systems(Update, turn).add_systems(PostUpdate, aim.before(Place));
    }
}

fn mount(mut commands: Commands, showing: Res<Showing>, options: Res<Options>) {
    // Open on the whole vehicle from across the pad, a little above a person's eye.
    let stands = showing.0.model(Role::Vehicle).map_or(DVec3::ZERO, |m| DVec3::from_array(m.position));
    let [bearing, elevation, distance, height] = options.pose.unwrap_or([215.0, 4.0, 62.0, 13.0]);
    commands.insert_resource(Rig {
        focus: DVec3::new(stands.x, f64::from(height), stands.z),
        bearing,
        elevation,
        distance,
    });
    commands.spawn(eye());
}

fn turn(
    mut rig: ResMut<Rig>,
    buttons: Res<ButtonInput<MouseButton>>,
    motion: Res<AccumulatedMouseMotion>,
    scroll: Res<AccumulatedMouseScroll>,
) {
    if buttons.pressed(MouseButton::Left) && motion.delta != Vec2::ZERO {
        rig.bearing -= motion.delta.x * TURN;
        rig.elevation = (rig.elevation + motion.delta.y * TURN).clamp(-85.0, 89.0);
    }
    if scroll.delta.y != 0.0 {
        let notches =
            if scroll.unit == MouseScrollUnit::Line { scroll.delta.y } else { scroll.delta.y / 40.0 };
        rig.distance = (rig.distance * (-0.12 * notches).exp()).clamp(1.5, 2.0e7);
    }
}

fn aim(rig: Res<Rig>, mut eye: Query<(&mut WorldPos, &mut Transform), With<Eye>>) {
    let Ok((mut at, mut transform)) = eye.single_mut() else { return };
    at.0 = rig.eye();
    let toward = (rig.focus - at.0).as_vec3();
    if toward.length_squared() > 0.0 {
        transform.look_to(toward, Vec3::Y);
    }
}
