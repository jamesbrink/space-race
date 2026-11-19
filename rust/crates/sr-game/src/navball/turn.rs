//! The attitude ball each frame: turned to the vehicle's attitude against the place's own level, its marks put
//! where the vehicle is going and where the record had the nose.

use avian3d::prelude::{LinearVelocity, Position, Rotation};
use bevy::math::DVec3;
use bevy::prelude::*;
use sr_world::V3;

use super::{Ball, Mark};
use crate::flight::{Course, Crewed, Pitches, Telemetry};
use crate::stage::dvec;

/// A mark rides this far off the ball, in ball radii.
const PROUD: f32 = 1.02;

/// Each frame: the ball turned to the vehicle's attitude, and the marks put where they are.
pub fn turn(
    course: Res<Course>,
    telemetry: Res<Telemetry>,
    crewed: Query<(&Position, &Rotation, &LinearVelocity, &Pitches), With<Crewed>>,
    mut ball: Single<&mut Transform, With<Ball>>,
    mut marks: Query<(&Mark, &mut Transform, &mut Visibility), Without<Ball>>,
) {
    let Ok((at, turned, velocity, pitches)) = crewed.single() else { return };
    // The place's own level: up, north along the ground, and east.
    let position = V3::new(at.0.x, at.0.y, at.0.z);
    let up = dvec(course.field.up(position));
    let north = dvec(course.site.from_enu(V3::Y));
    let north = (north - up * north.dot(up)).normalize();
    let east = north.cross(up);
    // The pilot's own: the nose ahead, the pitch axis to the left, and overhead the side the nose tips away from.
    let nose = (turned.0 * Vec3::Y).as_dvec3();
    let pitch = (turned.0 * pitches.0).as_dvec3();
    let overhead = nose.cross(pitch);
    // A direction as the ball's camera has it, before the mirror: across, up the window, toward the eye.
    let seen = |way: DVec3| DVec3::new(way.dot(pitch), way.dot(overhead), way.dot(nose)).as_vec3();
    ball.rotation = Quat::from_mat3(&Mat3::from_cols(seen(east), seen(up), seen(-north)));
    let going = velocity.0.as_dvec3().try_normalize().filter(|_| velocity.0.length() > 1.0);
    let flown = telemetry.cue.map(|[elevation, bearing]| {
        let (elevation, bearing) = (elevation.to_radians(), bearing.to_radians());
        up * elevation.sin() + (north * bearing.cos() + east * bearing.sin()) * elevation.cos()
    });
    for (mark, mut placed, mut shown) in &mut marks {
        let way = match mark {
            Mark::Ahead => going,
            Mark::Behind => going.map(|going| -going),
            Mark::Flown => flown,
        };
        // (mirrored, as the ball is; a mark round the back of the ball is not seen)
        let on = way.map(|way| seen(way) * Vec3::new(-1.0, 1.0, 1.0)).filter(|on| on.z > 0.12);
        *shown = if on.is_some() { Visibility::Inherited } else { Visibility::Hidden };
        if let Some(on) = on {
            *placed =
                Transform::from_translation(on * PROUD).with_rotation(Quat::from_rotation_arc(Vec3::Z, on));
        }
    }
}
