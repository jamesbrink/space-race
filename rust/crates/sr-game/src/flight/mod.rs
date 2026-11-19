//! The flight, flown: the vehicle as rigid bodies in the physics engine, pushed by what `sr-sim` says pushes on
//! them, turned by the hand on the controls and the air, standing on and striking what is under them, coming
//! apart when the pilot (or the record) says and breaking up when asked more than they stand.
//!
//! Nothing here names a flight or a vehicle: the plan, the parts and the site are the flight's data. The engine's
//! own gravity is off; the field (attraction and the turning frame) is `sr-sim`'s, applied with everything else.

mod attitude;
pub mod bodies;
mod breakup;
mod chutes;
mod drive;
mod dust;
mod fire;
pub mod hand;
mod setup;
mod staging;
mod telemetry;
#[cfg(test)]
mod trial;

use avian3d::prelude::*;
use bevy::platform::collections::HashMap;
use bevy::prelude::*;
use sr_render::origin::Place;
use sr_sim::fly::Flown;
use sr_sim::{Body, Field, Sequence};
use sr_world::{Site, V3};

pub use hand::Hand;
pub use telemetry::Telemetry;

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

/// The axis the crewed body's pitch control turns it about, in its own frame: at liftoff, the one that tips its
/// nose down range.
#[derive(Component, Debug, Clone, Copy)]
pub struct Pitches(pub Vec3);

/// Where the flight happens, and the path `sr-sim` makes of it without an engine.
#[derive(Resource, Debug, Clone)]
pub struct Course {
    /// The site, and its field.
    pub site: Site,
    /// As `site`.
    pub field: Field,
    /// The level direction the flight sets out on.
    pub down_range: V3,
    /// Where the vehicle's origin stands before it leaves: its launcher is under it there.
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
        let drive = (hand::burn, drive::fly, drive::fall, telemetry::feel, drive::strain, drive::settle);
        app.add_plugins(physics)
            .insert_resource(Gravity(Vec3::ZERO))
            .init_resource::<Sequencer>()
            .init_resource::<Telemetry>()
            .init_resource::<staging::Staged>()
            .add_systems(PreStartup, (setup::chart, hand::take))
            .add_systems(Startup, setup::found)
            .add_observer(setup::ready)
            .add_systems(FixedUpdate, (hand::hold_count, staging::stage).chain().in_set(Step::Stage))
            .add_systems(FixedUpdate, drive.chain().in_set(Step::Drive))
            .add_systems(
                Update,
                (
                    hand::keys,
                    fire::kindle.run_if(resource_added::<Parts>),
                    fire::stoke,
                    chutes::fly,
                    dust::raise,
                ),
            )
            .add_systems(PostUpdate, setup::show.before(Place));
    }
}
