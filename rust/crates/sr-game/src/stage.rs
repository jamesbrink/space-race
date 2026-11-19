//! The stage: a flight's site set up as it stood, from the flight's data alone. The Sun where it was, the models
//! where they stood.

use bevy::math::DVec3;
use bevy::prelude::*;
use sr_missions::{Flight, Role};
use sr_render::models::model;
use sr_render::sky::Sky;
use sr_world::{V3, sun};

use crate::Showing;

/// A model on the stage, and what it is of.
#[derive(Component, Debug, Clone, Copy, PartialEq, Eq)]
pub struct Cast(pub Role);

/// The engine's vector for one of the pure crates'.
#[must_use]
pub fn dvec(v: V3) -> DVec3 {
    DVec3::from_array(v.to_array())
}

/// The sky over a flight's site, this many seconds from its liftoff.
#[must_use]
pub fn sky(flight: &Flight, seconds: f64) -> Sky {
    let site = flight.site.site();
    let radius = site.radius();
    Sky {
        sun: dvec(sun::direction(&site, flight.liftoff().plus(seconds))).as_vec3(),
        centre: DVec3::new(0.0, -radius, 0.0),
        radius,
    }
}

/// Stands the flight's models on its site.
pub struct StagePlugin;

impl Plugin for StagePlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Startup, set);
    }
}

fn set(mut commands: Commands, showing: Res<Showing>, assets: Res<AssetServer>) {
    // The crew's model is the pilot standing by, as the gallery shows him: at liftoff he is aboard.
    for m in showing.0.models.iter().filter(|m| m.role != Role::Crew) {
        commands.spawn((Cast(m.role), model(&assets, m.path, DVec3::from_array(m.position), m.turn as f32)));
    }
}
