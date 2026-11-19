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
mod controls;
mod drive;
mod dust;
mod fire;
pub mod hand;
pub mod heat;
mod kinds;
pub mod log;
mod setup;
mod staging;
mod telemetry;
#[cfg(test)]
mod trial;

use avian3d::prelude::*;
use bevy::prelude::*;
use sr_render::origin::Place;

pub use hand::Hand;
pub use kinds::{Course, Crewed, Flier, Loose, Parts, Pitches, Sequencer};
pub use telemetry::Telemetry;

use crate::clock::Step;

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
        let drive = (controls::burn, heat::warm, drive::fly, drive::fall, telemetry::feel);
        let after = (drive::strain, drive::settle, log::keep);
        app.add_plugins(physics)
            .insert_resource(Gravity(Vec3::ZERO))
            .init_resource::<Sequencer>()
            .init_resource::<Telemetry>()
            .init_resource::<log::Log>()
            .init_resource::<staging::Staged>()
            .add_systems(PreStartup, (setup::chart, controls::take, heat::cool))
            .add_systems(Startup, setup::found)
            .add_observer(setup::ready)
            .add_systems(FixedUpdate, (controls::hold_count, staging::stage).chain().in_set(Step::Stage))
            .add_systems(FixedUpdate, (drive, after).chain().in_set(Step::Drive))
            .add_systems(
                Update,
                (
                    controls::keys,
                    fire::kindle.run_if(resource_added::<Parts>),
                    fire::stoke,
                    chutes::fly,
                    dust::raise,
                ),
            )
            .add_systems(PostUpdate, setup::show.before(Place));
    }
}
