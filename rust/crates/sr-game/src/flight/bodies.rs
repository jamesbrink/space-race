//! A body in the physics engine: what one is made of, and where the flight's bodies start.

use avian3d::prelude::*;
use bevy::math::{DQuat, DVec3};
use bevy::prelude::*;
use sr_render::origin::WorldPos;
use sr_sim::loads::Moment;
use sr_sim::{Body, Plan, Sequence, guidance};
use sr_world::V3;

use super::Course;
use crate::stage::dvec;

/// How long a body is taken to be, for its resistance to turning, m. Estimated: the bodies are steered, not
/// torqued, so this only shapes how a piece let go tumbles.
const LENGTH: f32 = 12.0;

/// One of the pure crates' vectors from the engine's.
#[must_use]
pub fn v3(v: DVec3) -> V3 {
    V3::new(v.x, v.y, v.z)
}

/// Where a body is and how it moves.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct State {
    /// Its origin in the site's frame, m.
    pub at: DVec3,
    /// How it is turned.
    pub turned: DQuat,
    /// Its velocity over the turning Earth, m/s.
    pub velocity: DVec3,
    /// How it spins, rad/s.
    pub spin: DVec3,
}

impl State {
    /// The body's long axis, toward its nose.
    #[must_use]
    pub fn axis(&self) -> DVec3 {
        self.turned * DVec3::Y
    }
}

/// A rigid body with this state and mass. It has no collider: its mass is given, and nothing touches it yet.
#[must_use]
pub fn body(state: &State, mass: f64) -> impl Bundle {
    let across = mass as f32 * LENGTH * LENGTH / 12.0;
    (
        RigidBody::Dynamic,
        Position(state.at),
        Rotation(state.turned.as_quat()),
        LinearVelocity(state.velocity.as_vec3()),
        AngularVelocity(state.spin.as_vec3()),
        Mass(mass as f32),
        AngularInertia::new(Vec3::new(across, across * 0.04, across)),
        SleepingDisabled,
        WorldPos(state.at),
        Transform::from_rotation(state.turned.as_quat()),
        Visibility::default(),
    )
}

/// How the crewed body starts.
#[derive(Debug, Clone, Copy)]
pub struct Start {
    /// The clock when it does, s.
    pub t: f64,
    /// Which body it is by then.
    pub body: Body,
    /// Its state.
    pub state: State,
    /// Its mass, kg.
    pub mass: f64,
    /// What its sequencer has done by then.
    pub sequence: Sequence,
}

/// The crewed body at `at` seconds: on the pad as it stands before liftoff, and afterwards where the flight
/// integrated beforehand has it at the whole second.
#[must_use]
pub fn start(course: &Course, plan: &Plan, stands: DVec3, turned: Quat, at: f64) -> Start {
    let on_pad = State { at: stands, turned: turned.as_dquat(), velocity: DVec3::ZERO, spin: DVec3::ZERO };
    let sample = course.flown.path.iter().rev().find(|sample| sample.t <= at).filter(|sample| sample.t > 0.0);
    let Some(sample) = sample else {
        return Start {
            t: at.min(0.0),
            body: Body::Stack,
            state: on_pad,
            mass: plan.stack_mass(0.0),
            sequence: Sequence::default(),
        };
    };
    let t = sample.t;
    let flown = course.flown.sequence;
    let done = |event: Option<f64>| event.filter(|&when| when <= t);
    let sequence = Sequence {
        apogee: done(flown.apogee),
        drogue: done(flown.drogue),
        main: done(flown.main),
        landed: done(flown.landed),
    };
    let separated = t >= plan.separation.value;
    let moment = Moment { t, position: sample.position, velocity: sample.velocity, axis: V3::Y };
    let axis = if separated {
        guidance::capsule_axis(plan, &course.field, &sequence, &moment)
    } else {
        guidance::stack_axis(plan, course.down_range, t)
    };
    // The path is the vehicle's origin's from where it stood, and it is turned from upright onto its axis.
    let state = State {
        at: stands + dvec(sample.position),
        turned: DQuat::from_rotation_arc(DVec3::Y, dvec(axis)) * on_pad.turned,
        velocity: dvec(sample.velocity),
        spin: DVec3::ZERO,
    };
    let (body, mass) =
        if separated { (Body::Capsule, plan.capsule_mass_at(t)) } else { (Body::Stack, plan.stack_mass(t)) };
    Start { t, body, state, mass, sequence }
}
