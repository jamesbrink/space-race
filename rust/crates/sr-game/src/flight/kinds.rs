//! The kinds of thing the flight is made of: the bodies, the crew's own, and what the flight keeps as it goes.

use bevy::platform::collections::HashMap;
use bevy::prelude::*;
use sr_sim::fly::Flown;
use sr_sim::{Body, Field, Sequence};
use sr_world::{Site, V3};

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
