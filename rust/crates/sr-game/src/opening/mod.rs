//! The opening: the last three hours of the count played as a time-lapse, from the curtain to T-12, where the
//! player takes the flight. The pad's morning plays on the flight's clock as it ran fast (the structure rolls back,
//! the cab comes to the hatch and goes away and down, the masts fall), the Sun climbs and the cloud drifts on the
//! same clock, and cameras that follow what moves are cut together over it. Any key or click goes straight to
//! T-12; `--at` and `--shot` start there and skip it.
//!
//! The record is the record: every instant the opening shows is the flight's clock, and what happens at each is
//! the flight's data. What is invented is labelled as presentation: how fast the clock runs ([`pace`]) and the shot
//! list ([`shots`]). While it plays, the flight's own clock stands stopped (nothing is flown) and is set from the
//! opening's each frame.

mod camera;
mod caption;
pub mod film;
pub mod pace;
mod play;
pub mod shots;

use bevy::prelude::*;

pub use play::{Opening, Phase};

/// The opening.
pub struct OpeningPlugin;

impl Plugin for OpeningPlugin {
    fn build(&self, app: &mut App) {
        app.init_resource::<film::Filming>()
            .add_systems(Startup, (play::start, caption::lay))
            .add_systems(PreUpdate, play::skip.after(crate::curtain::gate))
            .add_systems(Update, (play::run, caption::say, caption::readout, film::take, film::leave).chain())
            .add_systems(
                PostUpdate,
                camera::aim.after(crate::rig::aim).after(crate::pad::Posed).before(sr_render::origin::Place),
            );
    }
}
