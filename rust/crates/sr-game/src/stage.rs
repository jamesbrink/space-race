//! The stage: a flight's site set up as it stood, from the flight's data alone. The Sun where it was, the models
//! where they stood.

use bevy::math::DVec3;
use bevy::prelude::*;
use sr_missions::types::Cloud;
use sr_missions::{Flight, Role};
use sr_render::air::{Air, Layer};
use sr_render::earth::{Ground, Shore};
use sr_render::models::model;
use sr_render::sky::Sky;
use sr_world::{V3, sun};

use crate::Showing;
use crate::clock::Clock;

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

/// How a flight's site lies on the Earth.
#[must_use]
pub fn ground(flight: &Flight) -> Ground {
    let site = flight.site.site();
    let vec = |v: V3| dvec(v).as_vec3();
    Ground {
        earth_fixed: site.earth_fixed_rows().map(vec),
        east: vec(site.from_enu(V3::new(1.0, 0.0, 0.0))),
        north: vec(site.from_enu(V3::Y)),
        grade: flight.site.grade.value,
        shore: flight.site.region.map(|region| Shore {
            file: region.shore.to_owned(),
            half_width: region.half_width as f32,
            texels: region.texels as f32,
            spread: region.spread as f32,
        }),
    }
}

/// The air over a flight's site, this many seconds from its liftoff.
#[must_use]
pub fn air(flight: &Flight, seconds: f64) -> Air {
    let layer = |cloud: &Cloud| {
        // (the wind is named for where it comes from; the cloud goes the other way)
        let (sin, cos) = cloud.wind_from.value.to_radians().sin_cos();
        Layer {
            cover: cloud.cover.value as f32,
            base: cloud.base.value as f32,
            depth: cloud.depth.value as f32,
            size: cloud.size.value as f32,
            drift: (bevy::math::DVec2::new(-sin, -cos) * cloud.wind_speed.value).as_vec2(),
        }
    };
    let weather = &flight.weather;
    Air {
        cumulus: layer(&weather.low),
        deck: layer(&weather.middle),
        visibility: weather.visibility.value as f32,
        haze: weather.haze.value as f32,
        clock: seconds as f32,
    }
}

/// Stands the flight's models on its site.
pub struct StagePlugin;

impl Plugin for StagePlugin {
    fn build(&self, app: &mut App) {
        app.add_systems(Startup, set).add_systems(Update, day);
    }
}

fn set(mut commands: Commands, showing: Res<Showing>, assets: Res<AssetServer>) {
    // The crew's model is the pilot standing by, as the gallery shows him: at liftoff he is aboard.
    for m in showing.0.models.iter().filter(|m| m.role != Role::Crew) {
        commands.spawn((Cast(m.role), model(&assets, m.path, DVec3::from_array(m.position), m.turn as f32)));
    }
}

/// The sky follows the clock: the Sun moves, and the cloud drifts.
fn day(showing: Res<Showing>, clock: Res<Clock>, mut sky_now: ResMut<Sky>, mut air_now: ResMut<Air>) {
    air_now.clock = clock.t as f32;
    let sun = sky(showing.0, clock.t).sun;
    // (a twentieth of a degree: the Sun takes twelve seconds over it)
    if sun.angle_between(sky_now.sun) > 1.0e-3 {
        sky_now.sun = sun;
    }
}
