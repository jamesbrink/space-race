//! The air round the pad as a fluid: the dust the blast raises off the ground and the vapour of what is vented
//! and burned, carried by a velocity that is solved on a grid every step of the flight's clock, so that it rolls,
//! entrains, rises where it is hot and drifts down the day's wind; marched as a volume, lit by the Sun through
//! itself and by the fire from inside, and casting its shadow on whatever is under it.
//!
//! The game puts a [`Fumes`] in the world: where the pad is, which way and how hard the wind blows, and each
//! frame what is feeding the air ([`Source`]) and what fire lights it ([`Lamp`]). Nothing here knows a flight.
//! The solver is `shaders/fumes_solve.wesl` ([`solve`] runs it), the picture `shaders/fumes.wesl`, the shadow
//! `shaders/fumes_shadow.wesl`; `rust/README.md` says what is not in it.

pub mod grid;
mod material;
mod pace;
mod solve;

use bevy::math::DVec3;
use bevy::prelude::*;
use bevy::render::extract_resource::ExtractResourcePlugin;

use crate::origin::Place;

/// How a source moves the air.
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum Push {
    /// A jet that has struck the ground: thrown out along it all round, at this speed (m/s) in a sheet this
    /// thick (m), from a ring of the source's radius.
    Blast {
        /// How fast it leaves the ring, m/s.
        speed: f32,
        /// How thick the sheet is, m.
        thick: f32,
    },
    /// A puff or a vent: the air within the source's radius is brought toward this velocity (m/s, in the site's
    /// frame), this hard (1/s).
    Blow {
        /// The velocity, m/s.
        velocity: Vec3,
        /// How hard the air is held to it, 1/s.
        hold: f32,
    },
}

/// Something feeding the air, this frame.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Source {
    /// Where, in the site's frame, m.
    pub at: DVec3,
    /// Its radius, m.
    pub radius: f32,
    /// How it moves the air.
    pub push: Push,
    /// Dust and vapour it gives each second, as what a metre of them takes out of a ray (1/m a second).
    pub dust: f32,
    /// As `dust`.
    pub vapour: f32,
    /// Heat it gives each second, K.
    pub heat: f32,
}

/// A fire lighting the air from inside.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Lamp {
    /// Where, in the site's frame, m.
    pub at: DVec3,
    /// How strong, cd.
    pub candela: f32,
    /// Its colour, linear.
    pub colour: Vec3,
}

/// The air round a pad. The game sets it; each frame it says what feeds the air.
#[derive(Resource, Debug, Clone, PartialEq)]
pub struct Fumes {
    /// Where the pad is, on the ground, in the site's frame, m.
    pub pad: DVec3,
    /// The level direction the wind blows toward, in the site's frame, and its speed at 10 m, m/s.
    pub downwind: Vec3,
    /// As `downwind`.
    pub wind: f32,
    /// The dust a metre of air passing over the ground raises (1/m a metre), once it is faster than `over` m/s.
    pub raises: f32,
    /// As `raises`.
    pub over: f32,
    /// What is feeding the air this frame.
    pub sources: Vec<Source>,
    /// The fire that lights it, if one burns.
    pub lamp: Option<Lamp>,
}

/// Works and draws the [`Fumes`].
pub struct FumesPlugin;

impl Plugin for FumesPlugin {
    fn build(&self, app: &mut App) {
        app.add_plugins((
            MaterialPlugin::<material::FumesMaterial>::default(),
            ExtractResourcePlugin::<grid::Volumes>::default(),
            ExtractResourcePlugin::<pace::Step>::default(),
        ))
        .init_resource::<pace::Step>()
        .add_systems(Startup, material::make)
        .add_systems(PostUpdate, pace::keep.before(Place));
        solve::plug(app);
    }
}
