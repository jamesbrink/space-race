//! The stage: a flight's site set up as it stood, from the flight's data alone. The Sun where it was, the models
//! where they stood.

use bevy::math::DVec3;
use bevy::prelude::*;
use sr_missions::ground::{self, At, Outline};
use sr_missions::types::Cloud;
use sr_missions::{Flight, Role};
use sr_render::air::{Air, Layer};
use sr_render::earth::marks::{self, Marks};
use sr_render::earth::{Ground, Shore};
use sr_render::materials::Frost;
use sr_render::models::model;
use sr_render::sky::Sky;
use sr_world::{V3, sun};

use crate::Showing;
use crate::clock::Clock;
use crate::flight::Hand;

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

/// The made ground round a flight's site, for the picture: each way and patch in the site's frame.
#[must_use]
pub fn marks(flight: &Flight) -> Marks {
    let Some(made) = flight.site.made else { return Marks::default() };
    let site = flight.site.site();
    let flat = |p: [f64; 2]| Vec2::new(p[0] as f32, p[1] as f32);
    let at = |point: At| match point {
        At::Site(x, z) => flat([x, z]),
        At::Compass(east, north) => {
            let v = site.from_enu(V3::new(east, north, 0.0));
            flat([v.x, v.z])
        }
    };
    let surface = |surface| match surface {
        ground::Surface::Ballast => marks::Surface::Ballast,
        ground::Surface::Shell => marks::Surface::Shell,
        ground::Surface::Firebreak => marks::Surface::Firebreak,
    };
    let kept = |kept| match kept {
        ground::Kept::Cleared => marks::Kept::Cleared,
        ground::Kept::Graded => marks::Kept::Graded,
        ground::Kept::Built => marks::Kept::Built,
        ground::Kept::Paved => marks::Kept::Paved,
    };
    let patch = |patch: &ground::Patch| {
        let (centre, half, turn) = match patch.outline {
            Outline::Box(centre, half) => (flat(centre), flat(half), 0.0),
            Outline::Disc(centre) => (flat(centre), Vec2::ZERO, 0.0),
            // (a strip is a box as long as it, of no width, turned along it)
            Outline::Strip(a, b) => {
                let (a, b) = (flat(a), flat(b));
                ((a + b) / 2.0, Vec2::new((b - a).length() / 2.0, 0.0), (b - a).to_angle())
            }
        };
        marks::Patch { centre, half, corner: patch.corner as f32, turn, ground: kept(patch.ground) }
    };
    Marks {
        ways: made
            .ways
            .iter()
            .map(|way| marks::Way {
                ends: way.ends.map(at),
                half_width: way.half_width as f32,
                surface: surface(way.surface),
            })
            .collect(),
        patches: made.patches.iter().map(patch).collect(),
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
        app.add_systems(Startup, set).add_systems(Update, (day, rime));
    }
}

fn set(mut commands: Commands, showing: Res<Showing>, assets: Res<AssetServer>) {
    // The crew's model is the pilot standing by, as the gallery shows him: at liftoff he is aboard.
    for m in showing.0.models.iter().filter(|m| m.role != Role::Crew) {
        commands.spawn((Cast(m.role), model(&assets, m.path, DVec3::from_array(m.position), m.turn as f32)));
    }
    // The day's map of the weather, for the cloud far from the site.
    commands.insert_resource(sr_render::clouds::day_map(&assets, showing.0.weather.map));
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

/// How long the rime on the liquid-oxygen tank takes to go once the engine is lit, s. Estimated from the launch
/// films: it comes off in sheets in the first seconds and is gone by the time the vehicle is through the cloud.
const SHEDS: f64 = 45.0;

/// The rime follows the engine: whole on the pad, shaken and blown off after it is lit.
fn rime(clock: Res<Clock>, hand: Res<Hand>, mut frost: ResMut<Frost>) {
    let lit = if hand.guided { Some(0.0) } else { hand.lit };
    let left = lit.map_or(1.0, |lit| 1.0 - ((clock.t - lit) / SHEDS).clamp(0.0, 1.0)) as f32;
    // (it sheds fastest at first: the square of what is left of the time)
    let amount = left * left;
    if (frost.amount - amount).abs() > 0.004 {
        frost.amount = amount;
    }
}
