//! The heavens and the night: the stars, the Milky Way and the Moon where they were, the Moon's light, and how the
//! eye opens as the light goes (docs/agents/world.md: "nothing in the sky is placed by hand; light must never step").
//!
//! The game says where the sky's frame lies and where the Moon is ([`Heavens`], from `sr-world`); everything else
//! follows the Sun and the clock. What is drawn is in physical units, so the exposure decides what is seen: by day
//! the stars are lost in the sky's light, from above the air the bright ones come out, by night all the eye sees.

mod band;
mod dusk;
mod moon;
mod stars;

use bevy::prelude::*;

pub use dusk::{Dusk, sky_left, sky_left_moonlit, sun_left, weights as dusk_weights};

/// Where the sky's frame lies and where the Moon is, in the site's frame. The game sets it from the flight's site
/// and the clock; nothing here knows a flight.
#[derive(Resource, Debug, Clone, Copy, PartialEq)]
pub struct Heavens {
    /// The rotation from J2000 (the star catalogue's frame) to the site's frame at this instant.
    pub stars: Mat3,
    /// Years from 2000.0: what each star's proper motion is multiplied by.
    pub years: f32,
    /// The unit vector toward the Moon's centre (geometric).
    pub moon: Vec3,
    /// Half the angle the Moon fills, radians.
    pub moon_radius: f32,
    /// The angle at the Moon between the eye and the Sun, radians: 0 full.
    pub moon_phase: f32,
}

/// How far from the eye the heavens are drawn, m: beyond everything else, short of the eye's far plane (3e7 m), so
/// that the Earth, the cloud and the vehicle stand in front of them by depth.
const STARS_AT: f32 = 2.0e7;
/// The Milky Way and the night sky's own glow, a little further.
const BAND_AT: f32 = 2.4e7;
/// The Moon, in front of the stars.
const MOON_AT: f32 = 1.6e7;

/// The heavens.
pub struct NightPlugin;

impl Plugin for NightPlugin {
    fn build(&self, app: &mut App) {
        app.init_resource::<Dusk>();
        dusk::build(app);
        stars::build(app);
        band::build(app);
        moon::build(app);
    }
}
