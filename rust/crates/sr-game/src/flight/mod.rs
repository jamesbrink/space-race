//! The flight, flown: the vehicle as rigid bodies in the physics engine, pushed by what `sr-sim` says pushes on
//! them, coming apart when the flight's plan says they did.
//!
//! Nothing here names a flight or a vehicle: the plan, the parts and the site are the flight's data. The engine's
//! own gravity is off; the field (attraction and the turning frame) is `sr-sim`'s, applied with everything else.

pub mod bodies;
mod chutes;
mod drive;
mod dust;
mod fire;
mod setup;
mod staging;

use avian3d::prelude::*;
use bevy::platform::collections::HashMap;
use bevy::prelude::*;
use sr_render::origin::Place;
use sr_sim::fly::Flown;
use sr_sim::{Body, Field, Sequence};
use sr_world::V3;

use crate::clock::Step;

/// A body the flight's plan knows: what pushes on it is `sr-sim`'s.
#[derive(Component, Debug, Clone, Copy, PartialEq, Eq)]
pub struct Flier(pub Body);

/// A piece let go, of no further part in the flight: it falls through the air.
#[derive(Component, Debug, Clone, Copy, PartialEq)]
pub struct Loose {
    /// Its mass, kg.
    pub mass: f64,
    /// Its drag area, m^2.
    pub drag_area: f64,
}

/// The body the crew is in: what the cameras and the readout follow.
#[derive(Component, Debug, Clone, Copy)]
pub struct Crewed;

/// Where the flight happens, and the path `sr-sim` makes of it without an engine.
#[derive(Resource, Debug, Clone)]
pub struct Course {
    /// The site's field.
    pub field: Field,
    /// The level direction the flight sets out on.
    pub down_range: V3,
    /// Where the vehicle's origin stands before it leaves: the flight's distances are reckoned from there.
    pub stands: V3,
    /// The flight as integrated beforehand: where a late start is taken from.
    pub flown: Flown,
}

/// What the capsule's sequencer has done.
#[derive(Resource, Debug, Clone, Copy, Default)]
pub struct Sequencer(pub Sequence);

/// The vehicle's parts, by the names of its model's nodes.
#[derive(Resource, Debug, Default)]
pub struct Parts(pub HashMap<String, Entity>);

/// What the crewed body is doing, for the readout.
#[derive(Resource, Debug, Clone, Copy, Default)]
pub struct Telemetry {
    /// Height above the sea, m.
    pub height: f64,
    /// Speed over the turning Earth, m/s.
    pub speed: f64,
    /// Distance over the sea from the pad, m.
    pub range: f64,
    /// Mach number.
    pub mach: f64,
    /// Dynamic pressure, Pa.
    pub q: f64,
    /// What an accelerometer aboard reads, in g.
    pub g: f64,
    /// Thrust, N.
    pub thrust: f64,
    /// Ambient pressure, Pa.
    pub pressure: f64,
}

/// The flight.
pub struct FlightPlugin;

impl Plugin for FlightPlugin {
    fn build(&self, app: &mut App) {
        // Positions are doubles and are drawn from the eye by `sr-render`, so the engine's own copying of them into
        // transforms (in floats, from the site's origin) is left out.
        let physics = PhysicsPlugins::default()
            .build()
            .disable::<PhysicsTransformPlugin>()
            .disable::<PhysicsInterpolationPlugin>();
        app.add_plugins(physics)
            .insert_resource(Gravity(Vec3::ZERO))
            .init_resource::<Sequencer>()
            .init_resource::<Telemetry>()
            .init_resource::<staging::Staged>()
            .add_systems(PreStartup, setup::chart)
            .add_observer(setup::ready)
            .add_systems(FixedUpdate, staging::stage.in_set(Step::Stage))
            .add_systems(FixedUpdate, (drive::fly, drive::fall, drive::settle).in_set(Step::Drive))
            .add_systems(
                Update,
                (fire::kindle.run_if(resource_added::<Parts>), fire::stoke, chutes::fly, dust::raise),
            )
            .add_systems(PostUpdate, setup::show.before(Place));
    }
}
