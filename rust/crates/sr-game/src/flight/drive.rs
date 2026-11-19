//! Each step of the physics: what pushes on every body is found (`sr-sim`) and what turns it (the record's
//! programme, or the hand's controls and the air), and both are handed to the engine, which moves the bodies and
//! has them stand on or strike whatever is under them.

use avian3d::prelude::*;
use bevy::math::DVec3;
use bevy::prelude::*;
use sr_sim::loads::{Moment, loads};
use sr_sim::{Body, Loads, Plan, Sequence, Strain, air, guidance, stress};
use sr_world::V3;

use super::attitude::Turning;
use super::bodies::v3;
use super::hand::{Hand, Loss, Why};
use super::heat::Heat;
use super::{Course, Crewed, Flier, Loose, Pitches, Sequencer, Telemetry};
use crate::Showing;
use crate::clock::Clock;
use crate::stage::dvec;

/// How fast the record's programme turns a body toward where it has it point, a second, and the fastest it
/// may, rad/s.
const STEER: f64 = 1.6;
const SLEW: f64 = 0.35;
/// The hardest blow the capsule is taken to stand: the speed lost in one step of the physics, m/s. Estimated: it
/// came down on its landing bag at 9 m/s under the main parachute, and was not built for much more.
pub const BLOW: f64 = 12.0;
/// Slower than this under its parachute, it has landed, m/s.
const REST: f64 = 0.3;

/// A body's state as `sr-sim` wants it, in the site's frame: its origin is where it is, so its height is its
/// origin's (the capsule's is its heat shield's rim).
fn moment(t: f64, at: DVec3, velocity: DVec3, axis: DVec3) -> Moment {
    Moment { t, position: v3(at), velocity: v3(velocity), axis: v3(axis) }
}

/// How a body is turned this step.
enum Turn {
    /// To this rate, rad/s: the record's programme has it, and it goes where it is pointed.
    To(DVec3),
    /// By this angular acceleration, rad/s^2: whatever acts on it, acts.
    By(DVec3),
}

/// Where the record has a body point: the booster's programme and the capsule's attitudes.
fn programme(plan: &Plan, course: &Course, sequence: &Sequence, body: Body, m: &Moment) -> Option<V3> {
    match body {
        Body::Stack => Some(guidance::stack_axis(plan, course.down_range, m.t)),
        Body::Capsule => Some(guidance::capsule_axis(plan, &course.field, sequence, m)),
        Body::Booster | Body::Tower => None,
    }
}

/// What turns a body: flown as the record has it, its programme; otherwise the stick, the air and the parachute.
fn turn(
    plan: &Plan,
    hand: &Hand,
    sequence: &Sequence,
    programmed: Option<V3>,
    (body, pitch, spin): (Body, DVec3, DVec3),
    (m, l): (&Moment, &Loads),
) -> Turn {
    let axis = dvec(m.axis);
    if let (true, Some(toward)) = (hand.guided, programmed) {
        return Turn::To((axis.cross(dvec(toward)) * STEER).clamp_length_max(SLEW));
    }
    let wind = dvec(m.velocity);
    let burning = body == Body::Stack && l.thrust != V3::ZERO;
    let turning = Turning { body, axis, pitch, spin, wind, q: l.q, burning };
    // A parachute pulls the small end back along the way the capsule is going.
    let chute = if body == Body::Capsule { sequence.chute_area(plan, m.t) * l.q / l.mass } else { 0.0 };
    let pull = wind.try_normalize().map_or(DVec3::ZERO, |going| going * -chute);
    Turn::By(turning.control(hand.stick.as_dvec3(), hand.hold) + turning.air() + turning.hung(pull))
}

/// The bodies the plan knows.
pub fn fly(
    clock: Res<Clock>,
    showing: Res<Showing>,
    course: Res<Course>,
    hand: Res<Hand>,
    heat: Res<Heat>,
    mut sequencer: ResMut<Sequencer>,
    mut telemetry: ResMut<Telemetry>,
    mut fliers: Query<(&Flier, Option<&Pitches>, &mut Mass, Forces)>,
) {
    if !clock.ready || clock.t < 0.0 {
        return;
    }
    let plan = &showing.0.plan;
    for (&Flier(body), crewed, mut mass, mut forces) in &mut fliers {
        let turned = forces.rotation();
        let velocity = forces.linear_velocity().as_dvec3();
        let m = moment(clock.t, forces.position(), velocity, (turned * Vec3::Y).as_dvec3());
        let climb = m.velocity.dot(course.field.up(m.position));
        if crewed.is_some() {
            let free = hand.clear(plan, clock.t);
            sequencer.0.step(plan, clock.t, course.field.height(m.position), climb, free);
        }
        let l = loads(plan, body, &course.field, &sequencer.0, &m, &hand.drive(plan, body, clock.t));
        let programmed = programme(plan, &course, &sequencer.0, body, &m);
        mass.0 = l.mass as f32;
        // Once it is in the sea the sea has it.
        if crewed.is_none() || sequencer.0.landed.is_none() {
            let acceleration = l.felt() + course.field.acceleration(m.position, m.velocity);
            forces.apply_linear_acceleration(dvec(acceleration).as_vec3());
            let pitch = crewed.map_or(DVec3::X, |pitches| (turned * pitches.0).as_dvec3());
            let spin = forces.angular_velocity().as_dvec3();
            match turn(plan, &hand, &sequencer.0, programmed, (body, pitch, spin), (&m, &l)) {
                Turn::To(rate) => *forces.angular_velocity_mut() = rate.as_vec3(),
                Turn::By(acceleration) => forces.apply_angular_acceleration(acceleration.as_vec3()),
            }
        }
        if crewed.is_some() {
            *telemetry = Telemetry {
                propellant: hand.remaining(plan, clock.t),
                stress: stress::stress(&plan.limits, body, &m, &l),
                heat: heat.warmth(showing.0, body),
                cue: programmed.map(|toward| course.points(m.position, toward)),
                ..telemetry.read(&course, &m, &l, climb)
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
        let position = v3(forces.position());
        let velocity = v3(forces.linear_velocity().as_dvec3());
        let speed = velocity.length();
        let density = air::at(course.field.height(position)).density;
        let drag = velocity * (-0.5 * density * speed * piece.drag_area / piece.mass);
        let acceleration = drag + course.field.acceleration(position, velocity);
        forces.apply_linear_acceleration(dvec(acceleration).as_vec3());
    }
}

/// What it could not stand breaks it: a booster bent or loaded past its limit comes to pieces and throws the
/// capsule clear, and a capsule loaded past its own, or anything that strikes too hard, is lost.
pub fn strain(
    clock: Res<Clock>,
    showing: Res<Showing>,
    telemetry: Res<Telemetry>,
    mut hand: ResMut<Hand>,
    crewed: Query<&Flier, With<Crewed>>,
) {
    let Ok(&Flier(body)) = crewed.single() else { return };
    if !clock.ready || clock.t < 0.0 || hand.lost.is_some() {
        return;
    }
    let plan = &showing.0.plan;
    if telemetry.jolt > BLOW {
        hand.fail(plan, body, Loss { why: Why::Blow, by: telemetry.jolt, t: clock.t });
    } else if telemetry.stress.part >= 1.0 && (body == Body::Capsule || hand.broke.is_none()) {
        let why = if telemetry.stress.strain == Strain::Bending { Why::Bending } else { Why::Load };
        hand.fail(plan, body, Loss { why, by: telemetry.stress.part, t: clock.t });
    } else if let (true, Some(on)) = (telemetry.heat.part >= 1.0, telemetry.heat.on) {
        // The booster's skin takes the booster; anything of the capsule's takes the capsule.
        hand.fail(plan, on, Loss { why: Why::Heat, by: telemetry.heat.temperature, t: clock.t });
    }
}

/// What the sea does: what reaches it stops there. The crewed body stays, afloat (or where it came to rest on the
/// land); the rest is gone.
pub fn settle(
    mut commands: Commands,
    clock: Res<Clock>,
    showing: Res<Showing>,
    course: Res<Course>,
    mut sequencer: ResMut<Sequencer>,
    mut hand: ResMut<Hand>,
    mut bodies: Query<(
        Entity,
        &Position,
        &mut LinearVelocity,
        &mut AngularVelocity,
        Option<&Flier>,
        Has<Crewed>,
    )>,
) {
    if !clock.ready || clock.t < 0.0 {
        return;
    }
    for (entity, at, mut velocity, mut spin, flier, crewed) in &mut bodies {
        let height = course.field.height(v3(at.0));
        let speed = f64::from(velocity.0.length());
        // Down: in the sea, or come to rest on the land under its parachute.
        let down =
            height <= 0.0 || sequencer.0.landed.is_some() || (sequencer.0.main.is_some() && speed < REST);
        if let (true, Some(&Flier(body)), true) = (crewed, flier, down) {
            if speed > BLOW {
                hand.fail(&showing.0.plan, body, Loss { why: Why::Blow, by: speed, t: clock.t });
            }
            sequencer.0.landed.get_or_insert(clock.t);
            velocity.0 = Vec3::ZERO;
            spin.0 = Vec3::ZERO;
        } else if !crewed && height < -5.0 && (flier.is_some() || velocity.0.y < 0.0) {
            commands.entity(entity).despawn();
        }
    }
}
