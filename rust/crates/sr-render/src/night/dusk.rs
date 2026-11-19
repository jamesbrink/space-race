//! How the light goes: the light there is on the ground (the Sun's, the twilight's, the Moon's and the night sky's,
//! USNO Circular 171 and Krisciunas and Schaefer through `sr_world::daylight`), how far the eye opens for it, when
//! the pad's lamps are lit, and which print the hour is developed in. Everything is a function of where the Sun
//! and the Moon are, so a clock run fast or jumped never makes it step.

use bevy::light::{CascadeShadowConfigBuilder, SunDisk};
use bevy::prelude::*;
use sr_world::daylight;

use super::Heavens;
use crate::earth::Ground;
use crate::origin::Origin;
use crate::sky::Sky;

/// The hour as the picture needs it, reckoned each frame.
#[derive(Resource, Debug, Clone, Copy, PartialEq)]
pub struct Dusk {
    /// The Sun's apparent elevation at the eye, degrees.
    pub sun: f32,
    /// The Moon's, degrees.
    pub moon: f32,
    /// What lights level ground there, lux.
    pub lux: f32,
    /// How far the pad's lamps are lit, 0 out to 1 full.
    pub lamps: f32,
    /// How much the lit lamps near the eye add to what it is adapted to, lux (the lamps reckon it).
    pub glare: f32,
    /// How many stops the eye has opened beyond the day's exposure.
    pub opens: f32,
    /// How much of the low Sun's print the frame is developed in: 1 about sunrise and sunset.
    pub low: f32,
    /// How much of the night's print.
    pub night: f32,
    /// Whether the Sun is in the east: dawn, not dusk (1), or the other way (0).
    pub morning: f32,
    /// The Moon's light on level ground, lux.
    pub moonlit: f32,
}

impl Default for Dusk {
    fn default() -> Self {
        Self {
            sun: 50.0,
            moon: -90.0,
            lux: 1.0e5,
            lamps: 0.0,
            glare: 0.0,
            opens: 0.0,
            low: 0.0,
            night: 0.0,
            morning: 1.0,
            moonlit: 0.0,
        }
    }
}

/// How far the eye opens (stops beyond the day's exposure, `sky::DAYLIGHT`) for the light on level ground, as an
/// incident-light meter reads it (EV100 = log2 of lux over 2.5): the meter's reading, then the opening. Not a
/// constant share: the engine's sky by twilight is brighter than USNO's measured light, so through twilight the eye
/// opens by about half of what the meter falls, and by night, where the light is the meter's, by nearly all of it,
/// so a moonlit pad reads and a moonless one is darker. Set by eye against frames of this build: sunrise (the Sun
/// 1.4 degrees up) at 2.75 stops, the middle of civil twilight (-3.8) at 6.5 (`n-cal-*` frames). Estimated.
const OPENING: [(f32, f32); 9] = [
    (15.5, 0.0),
    (12.75, 1.2),
    (9.2, 2.75),
    (6.1, 4.3),
    (3.6, 6.5),
    (0.3, 9.5),
    (-4.4, 13.5),
    (-5.6, 15.0),
    (-9.2, 18.5),
];

/// The opening for a meter's reading, along [`OPENING`] (and on past its ends at the slope of the last step).
fn opening(ev: f32) -> f32 {
    let at = OPENING.iter().position(|&(e, _)| e < ev).unwrap_or(OPENING.len() - 1).max(1);
    let ((e0, o0), (e1, o1)) = (OPENING[at - 1], OPENING[at]);
    o0 + (o1 - o0) * (ev - e0) / (e1 - e0)
}

/// The most the eye opens, stops: to EV100 -4.5, the dark-adapted eye's (Ferwerda et al. 1996: the rods' threshold
/// stands still under 10^-3.94 cd/m^2). Estimated as the camera's equal.
const MOST: f32 = 19.5;
/// `SR_EYE_OPENS` set to a number of stops holds the eye to that at most: a switch for looking at what the night's
/// opening does.
const MOST_SWITCH: &str = "SR_EYE_OPENS";

/// The most the eye opens: [`MOST`], unless the switch says less.
fn most() -> f32 {
    std::env::var(MOST_SWITCH).ok().and_then(|n| n.parse().ok()).map_or(MOST, |n: f32| n.clamp(0.0, MOST))
}
/// The Sun's elevation the lamps are switched on at in the evening, and off at in the morning, degrees; each over
/// [`SWITCHING`] either side. Estimated, as the web build's `DUTY`: on at sunset, left on into the morning until the
/// Sun is well up, when they add little to the day; when is not recorded.
const LAMPS_EVENING: f32 = 0.0;
const LAMPS_MORNING: f32 = 7.0;
const SWITCHING: f32 = 2.5;

/// Where the Moon's light comes from, and what it is.
#[derive(Component)]
struct Moonlight;

pub(super) fn build(app: &mut App) {
    app.add_systems(Startup, raise).add_systems(Update, (reckon, moonlight).chain());
}

fn raise(mut commands: Commands) {
    commands.spawn((
        Moonlight,
        DirectionalLight { illuminance: 0.0, shadow_maps_enabled: false, color: colour(), ..default() },
        // (the Moon's shadows are wanted only by night, on and round the pad)
        CascadeShadowConfigBuilder {
            num_cascades: 3,
            minimum_distance: 0.2,
            first_cascade_far_bound: 25.0,
            maximum_distance: 700.0,
            overlap_proportion: 0.25,
        }
        .build(),
        Transform::default(),
    ));
}

/// Moonlight's colour: sunlight given back by the regolith, which is redder than the Sun (the Moon's B-V is 0.92
/// against the Sun's 0.65: Allen's Astrophysical Quantities, 4th ed., 12.3).
fn colour() -> Color {
    let [r, g, b] = sr_world::stars::colour(0.92);
    let peak = r.max(g).max(b);
    Color::linear_rgb((r / peak) as f32, (g / peak) as f32, (b / peak) as f32)
}

/// A smooth step from 0 at `a` to 1 at `b` (either way round).
pub(crate) fn smooth(a: f32, b: f32, x: f32) -> f32 {
    let t = ((x - a) / (b - a)).clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

/// How much of the Sun's direct light is left with the Sun this high (the sine of its elevation): all of it until its
/// disc touches the horizon, none once it is under (the air's lift is in the half degree it goes over). For lights
/// worked by hand from the Sun's height (the cloud, the fumes, the smoke), which the atmosphere does not reach.
#[must_use]
pub fn sun_left(high: f32) -> f32 {
    smooth(-0.8, 0.4, high.clamp(-1.0, 1.0).asin().to_degrees())
}

/// The Sun's height (sine) under which a light worked by hand from it holds its sky's light (`clouds::skylight` holds
/// it at 0.03, 1.7 degrees), and the sky's light on level ground there, lux (USNO Circular 171's sky term).
const HELD: f32 = 0.03;

/// How much of the sky's light a hand-worked light keeps with the Sun this high (sine): all of it above [`HELD`];
/// under it, the twilight's sky (USNO Circular 171) and the night sky's own light (0.8 millilux) against the sky's
/// light at [`HELD`], so a cloud by night is lit as the ground is. The Moon is not in it (its light is the Sun's
/// way round for these), so a moonlit cloud is drawn as a moonless one.
#[must_use]
pub fn sky_left(high: f32) -> f32 {
    if high >= HELD {
        return 1.0;
    }
    let sky = |sine: f32| f64::from(sine.clamp(-1.0, 1.0)).asin().to_degrees();
    let at = |e: f64| daylight::circular(e).1.max(0.0) * 133_775.0;
    ((at(sky(high)) + daylight::NIGHT_LUX) / at(sky(HELD))).min(1.0) as f32
}

/// As [`sky_left`], with the Moon's light added: what a moonlit cloud or haze keeps of the sky's light, for a light
/// worked by hand that has the hour to hand. The Moon's light is taken as coming from all round, as the sky's does
/// (its own direction is not the Sun's, which these lights are drawn from).
#[must_use]
pub fn sky_left_moonlit(high: f32, dusk: &Dusk) -> f32 {
    let held = daylight::circular(f64::from(HELD).asin().to_degrees()).1.max(0.0) * 133_775.0;
    (sky_left(high) + (f64::from(dusk.moonlit) / held) as f32).min(1.0)
}

/// How much of the low Sun's print and of the night's the hour is developed in, with the Sun at this apparent
/// elevation (degrees): the low Sun's from a little under the horizon to some 14 degrees up, most about sunrise and
/// sunset; the night's from the middle of civil twilight down to nautical. Estimated.
#[must_use]
pub fn weights(sun: f32) -> (f32, f32) {
    let low = smooth(-8.0, -1.0, sun) * (1.0 - smooth(4.0, 14.0, sun));
    let night = 1.0 - smooth(-12.0, -3.0, sun);
    (low, night)
}

/// The apparent elevation of a direction at the eye, degrees.
fn elevation(toward: Vec3, up: Vec3) -> f32 {
    let geometric = f64::from(toward.dot(up).clamp(-1.0, 1.0).asin().to_degrees());
    (geometric + daylight::refraction(geometric)) as f32
}

fn reckon(
    sky: Res<Sky>,
    origin: Res<Origin>,
    ground: Option<Res<Ground>>,
    heavens: Option<Res<Heavens>>,
    mut dusk: ResMut<Dusk>,
    mut most: Local<f32>,
) {
    if *most == 0.0 {
        *most = self::most().max(1e-3);
    }
    let up = (origin.0 - sky.centre).normalize().as_vec3();
    let sun = elevation(sky.sun, up);
    let (moon, moon_lux) = heavens.map_or((-90.0, 0.0), |h| {
        let at = elevation(h.moon, up);
        (at, daylight::moon_lux(f64::from(at), f64::from(h.moon_phase)) as f32)
    });
    let lux = daylight::sun_lux(f64::from(sun)) as f32 + moon_lux + daylight::NIGHT_LUX as f32;
    let morning = ground.map_or(1.0, |g| smooth(-0.05, 0.05, sky.sun.dot(g.east)));
    let switch = LAMPS_EVENING + (LAMPS_MORNING - LAMPS_EVENING) * morning;
    let lamps = 1.0 - smooth(switch - SWITCHING, switch + SWITCHING, sun);
    let adapted = lux + dusk.glare;
    let opens = opening((adapted / 2.5).log2()).clamp(0.0, *most);
    let (low, night) = weights(sun);
    let next =
        Dusk { sun, moon, lux, lamps, glare: dusk.glare, opens, low, night, morning, moonlit: moon_lux };
    if *dusk != next {
        *dusk = next;
    }
}

/// The Moon's light: as strong as its phase and distance give above the air (the atmosphere takes its share on the
/// way down, as it does the Sun's), from where it is; casting shadows only once the Sun has gone. The Sun's own
/// shadow maps are let go while it is down.
fn moonlight(
    dusk: Res<Dusk>,
    heavens: Option<Res<Heavens>>,
    mut moon: Query<(&mut DirectionalLight, &mut Transform), (With<Moonlight>, Without<SunDisk>)>,
    mut sun: Query<&mut DirectionalLight, (With<SunDisk>, Without<Moonlight>)>,
) {
    let Some(heavens) = heavens else { return };
    let dark = dusk.sun < -3.0;
    for (mut light, mut transform) in &mut moon {
        let illuminance = (daylight::FULL_MOON * daylight::moon_phase(f64::from(heavens.moon_phase))) as f32;
        if (light.illuminance - illuminance).abs() > 1e-5
            || light.shadow_maps_enabled != (dark && dusk.moon > 2.0)
        {
            light.illuminance = illuminance;
            light.shadow_maps_enabled = dark && dusk.moon > 2.0;
        }
        let toward = transform.forward().as_vec3();
        if toward.angle_between(-heavens.moon) > 1e-3 {
            transform.look_to(-heavens.moon, Vec3::Y);
        }
    }
    for mut light in &mut sun {
        if light.shadow_maps_enabled == (dusk.sun < -2.0) {
            light.shadow_maps_enabled = dusk.sun >= -2.0;
        }
    }
}
