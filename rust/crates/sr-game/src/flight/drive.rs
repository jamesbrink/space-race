//! Each step of the physics: what pushes on every body is found (`sr-sim`) and handed to the engine, and the
//! bodies the plan steers are turned to where it has them point.

use avian3d::prelude::*;
use bevy::math::DVec3;
use bevy::prelude::*;
use sr_sim::loads::{Moment, loads};
use sr_sim::{Body, air, guidance};
use sr_world::V3;
use sr_world::earth::G0;

use super::bodies::v3;
use super::{Course, Crewed, Flier, Loose, Sequencer, Telemetry};
use crate::Showing;
use crate::clock::Clock;
use crate::stage::dvec;

/// How fast a steered body turns toward where it should point, a second, and the fastest it may, rad/s.
const STEER: f64 = 1.6;
const SLEW: f64 = 0.35;

/// A body's state as `sr-sim` wants it: its place is reckoned from where the vehicle stood, as the flight
/// integrated beforehand reckons it.
fn moment(t: f64, course: &Course, at: DVec3, velocity: DVec3, axis: DVec3) -> Moment {
    Moment { t, position: v3(at) - course.stands, velocity: v3(velocity), axis: v3(axis) }
}

/// The bodies the plan knows.
pub fn fly(
    clock: Res<Clock>,
    showing: Res<Showing>,
    course: Res<Course>,
    mut sequencer: ResMut<Sequencer>,
    mut telemetry: ResMut<Telemetry>,
    mut fliers: Query<(&Flier, Has<Crewed>, &mut Mass, Forces)>,
) {
    if !clock.ready || clock.t < 0.0 {
        return;
    }
    let plan = &showing.0.plan;
    for (&Flier(body), crewed, mut mass, mut forces) in &mut fliers {
        let at = forces.position();
        let velocity = forces.linear_velocity().as_dvec3();
        let axis = (forces.rotation() * Vec3::Y).as_dvec3();
        let m = moment(clock.t, &course, at, velocity, axis);
        let height = course.field.height(m.position);
        if crewed {
            sequencer.0.step(plan, clock.t, height, m.velocity.dot(course.field.up(m.position)));
        }
        let l = loads(plan, body, &course.field, &sequencer.0, &m);
        let field = course.field.acceleration(m.position, m.velocity);
        let mut acceleration = l.felt() + field;
        // Until the engine lifts it the launcher holds it, and once it is in the sea the sea does.
        let held = body == Body::Stack && m.position.y <= 0.0 && acceleration.y < 0.0;
        if held || sequencer.0.landed.is_some() && crewed {
            acceleration = V3::ZERO;
        }
        mass.0 = l.mass as f32;
        forces.apply_linear_acceleration(dvec(acceleration).as_vec3());
        let steered = match body {
            Body::Stack => Some(guidance::stack_axis(plan, course.down_range, clock.t)),
            Body::Capsule => Some(guidance::capsule_axis(plan, &course.field, &sequencer.0, &m)),
            Body::Booster | Body::Tower => None,
        };
        if let Some(toward) = steered {
            let turn = (axis.cross(dvec(toward)) * STEER).clamp_length_max(SLEW);
            *forces.angular_velocity_mut() = turn.as_vec3();
        }
        if crewed {
            *telemetry = Telemetry {
                height,
                speed: m.velocity.length(),
                range: course.field.range(m.position),
                mach: l.mach,
                q: l.q,
                g: l.felt().length() / G0,
                thrust: l.thrust.length(),
                pressure: l.pressure,
            };
        }
    }
}

/// The pieces let go: they fall through the air.
pub fn fall(clock: Res<Clock>, course: Res<Course>, mut pieces: Query<(&Loose, Forces)>) {
    if !clock.ready {
        return;
    }
    for (piece, mut forces) in &mut pieces {
        let position = v3(forces.position()) - course.stands;
        let velocity = v3(forces.linear_velocity().as_dvec3());
        let speed = velocity.length();
        let density = air::at(course.field.height(position)).density;
        let drag = velocity * (-0.5 * density * speed * piece.drag_area / piece.mass);
        let acceleration = drag + course.field.acceleration(position, velocity);
        forces.apply_linear_acceleration(dvec(acceleration).as_vec3());
    }
}

/// What reaches the sea stops there: the crewed body stays, afloat; the rest is gone.
pub fn settle(
    mut commands: Commands,
    course: Res<Course>,
    sequencer: Res<Sequencer>,
    mut bodies: Query<(
        Entity,
        &Position,
        &mut LinearVelocity,
        &mut AngularVelocity,
        Has<Crewed>,
        Has<Flier>,
    )>,
) {
    for (entity, at, mut velocity, mut spin, crewed, flier) in &mut bodies {
        let height = course.field.height(v3(at.0) - course.stands);
        if crewed && sequencer.0.landed.is_some() {
            velocity.0 = Vec3::ZERO;
            spin.0 = Vec3::ZERO;
        } else if !crewed && height < -5.0 && (flier || velocity.0.y < 0.0) {
            commands.entity(entity).despawn();
        }
    }
}
