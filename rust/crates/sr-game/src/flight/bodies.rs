//! A body in the physics engine: what one is made of, and where the flight's bodies start.

use avian3d::prelude::*;
use bevy::math::{DQuat, DVec3};
use bevy::prelude::*;
use sr_missions::types::{Solid, Solids};
use sr_render::origin::WorldPos;
use sr_sim::loads::Moment;
use sr_sim::{Body, Plan, Sequence, guidance};
use sr_world::V3;

use super::Course;
use crate::stage::dvec;

/// What may touch what. The vehicle's pieces touch the ground and what stands on it, never each other: they
/// leave from inside one another's outlines (`rust/README.md`, "What is simplified").
#[derive(PhysicsLayer, Debug, Clone, Copy, Default)]
pub enum Touches {
    /// Nothing is here.
    #[default]
    Nothing,
    /// The land and what stands on it.
    Ground,
    /// A piece of the vehicle.
    Vehicle,
}

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

    /// The state of a point of the same body this far up its axis, m, given a velocity and a spin of its own
    /// besides (both in the body's frame): a piece leaving is such a point.
    #[must_use]
    pub fn leaving(&self, up: f64, parts_at: DVec3, spins: DVec3) -> Self {
        let arm = self.axis() * up;
        Self {
            at: self.at + arm,
            turned: self.turned,
            velocity: self.velocity + self.spin.cross(arm) + self.turned * parts_at,
            spin: self.spin + self.turned * spins,
        }
    }
}

/// Hand a piece its nodes of the model: they hang from it now, set down by where its own origin is on the axis.
pub fn hand_over(commands: &mut Commands, piece: Entity, nodes: impl Iterator<Item = Entity>, origin: f64) {
    for node in nodes {
        commands.entity(node).insert(ChildOf(piece)).entry::<Transform>().and_modify(move |mut placed| {
            placed.translation.y -= origin as f32;
        });
    }
}

/// What a body is to whatever it strikes: the solids it is made of, and where its mass is centred along its axis.
#[derive(Debug, Clone, PartialEq)]
pub struct Outline {
    /// The solids.
    pub parts: Vec<Solid>,
    /// The centre of mass, m along the axis in the model's frame.
    pub balance: f64,
    /// Where the body's own origin is, m along the axis in the model's frame: the model's for the crewed body,
    /// whose parts are where the model has them; a piece's own centre of mass once it has left.
    pub origin: f64,
}

impl Outline {
    /// One solid by itself.
    #[must_use]
    pub fn of(solid: &Solid) -> Self {
        Self { parts: vec![*solid], balance: solid.balance.value, origin: solid.balance.value }
    }

    /// One of the bodies the plan knows, with the escape tower still on it or not.
    #[must_use]
    pub fn body(solids: &Solids, body: Body, tower: bool) -> Self {
        let (mut parts, balance) = match body {
            Body::Stack => (vec![solids.booster, solids.capsule], solids.balance.value),
            Body::Capsule => (vec![solids.capsule], solids.capsule.balance.value),
            Body::Booster => return Self::of(&solids.booster),
            Body::Tower => return Self::of(&solids.tower),
        };
        if tower {
            parts.push(solids.tower);
        }
        Self { parts, balance, origin: 0.0 }
    }

    /// What the engine needs of it at a mass (kg): its shape, where it balances, and how it resists turning (as
    /// one solid cylinder of its length and girth, which is an estimate: nobody has weighed the pieces apart).
    #[must_use]
    pub fn solid(&self, mass: f64) -> impl Bundle + use<> {
        let shapes = self.parts.iter().map(|part| {
            let (radius, tall) = (part.radius as f32, (part.span[1] - part.span[0]) as f32);
            let shape =
                if part.pointed { Collider::cone(radius, tall) } else { Collider::cylinder(radius, tall) };
            let middle = f64::midpoint(part.span[0], part.span[1]) - self.origin;
            (Position(DVec3::Y * middle), Rotation::default(), shape)
        });
        let foot = self.parts.iter().map(|part| part.span[0]).fold(f64::MAX, f64::min);
        let head = self.parts.iter().map(|part| part.span[1]).fold(f64::MIN, f64::max);
        let girth = self.parts.iter().map(|part| part.radius).fold(0.0, f64::max);
        let across = (mass * (3.0 * girth * girth + (head - foot).powi(2)) / 12.0) as f32;
        let along = (mass * girth * girth / 2.0) as f32;
        (
            Collider::compound(shapes.collect()),
            CollisionLayers::new(Touches::Vehicle, Touches::Ground),
            Mass(mass as f32),
            CenterOfMass(Vec3::Y * (self.balance - self.origin) as f32),
            AngularInertia::new(Vec3::new(across, along, across)),
            (NoAutoMass, NoAutoCenterOfMass, NoAutoAngularInertia),
        )
    }
}

/// A rigid body with this state, mass and outline.
#[must_use]
pub fn body(state: &State, mass: f64, outline: &Outline) -> impl Bundle + use<> {
    (
        RigidBody::Dynamic,
        Position(state.at),
        Rotation(state.turned.as_quat()),
        LinearVelocity(state.velocity.as_vec3()),
        AngularVelocity(state.spin.as_vec3()),
        outline.solid(mass),
        SleepingDisabled,
        WorldPos(state.at),
        Transform::from_rotation(state.turned.as_quat()),
        Visibility::default(),
    )
}

/// Something that does not move, for the vehicle to stand on or strike. (The engine takes a collider's scale
/// from its transform, so it has one, though nothing is drawn of it and its place is the `Position`.)
#[must_use]
pub fn fixed(at: DVec3, shape: Collider) -> impl Bundle {
    let touches = CollisionLayers::new(Touches::Ground, Touches::Vehicle);
    (RigidBody::Static, Position(at), shape, touches, Transform::default())
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
