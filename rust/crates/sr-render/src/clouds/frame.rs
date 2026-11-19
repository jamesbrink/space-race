//! What the clouds' march is told each frame: where the eye is in the air, where the Sun is and how bright, what
//! the day's cloud is and how its cover lays it out; and the size of what it marches into.

use bevy::light::light_consts::lux;
use bevy::math::DVec3;
use bevy::prelude::*;
use bevy::render::render_resource::{Extent3d, ShaderType};

use super::material::{CloudLay, Sheet};
use super::pass::CloudSky;
use super::{Blank, field, ripple};
use crate::air::{Air, DayMap, Layer};
use crate::earth::Ground;
use crate::origin::{Eye, Origin};
use crate::sky::Sky;

/// How much of the Sun's light each colour loses to an air mass (optical depths; `src/viewer/daysky.ts`:
/// estimated, tuned by eye there for a 50 degree Sun).
const AIR_MASS: Vec3 = Vec3::new(0.06, 0.10, 0.19);
/// The clear sky's light on a cloud with the Sun overhead, cd/m^2 (estimated: a noon zenith is 4,000 to 8,000).
const SKYLIGHT: Vec3 = Vec3::new(2_300.0, 3_900.0, 6_800.0);
/// Where the day map's high cloud is drawn, m above the ground. Estimated: no flight's record gives it yet, and
/// cirrus over Florida stands at 9 to 12 km.
const CIRRUS: f32 = 10_000.0;

/// The march takes one ray for this many of the frame's pixels each way: a ninth of the rays, each pixel of the
/// frame its own ray once in nine frames, which the temporal filter gathers. 2 is sharper in motion and costs twice
/// as much. Chosen for the frame's budget.
pub const MARCH_EVERY: u32 = 3;

/// What the march needs to know each frame.
#[derive(ShaderType, Debug, Clone, Copy, Default)]
pub struct CloudFrame {
    /// The vertical at the eye; `w` the eye's height above the ground, m.
    pub up: Vec4,
    /// East at the site, in the site's frame; `w` the ground's radius, m.
    pub east: Vec4,
    /// North at the site; `w` the clock, s.
    pub north: Vec4,
    /// Toward the Sun; `w` how far one can see, m.
    pub sun: Vec4,
    /// The Sun's light on the cloud, lux, red green and blue; `w` the height over which the haze thins by e, m.
    pub sunlight: Vec4,
    /// The sky's light on the cloud, cd/m^2.
    pub skylight: Vec4,
    /// Where the eye is over the ground in each layer's own drifting frame, m: the cumulus' east and north, then
    /// the deck's.
    pub over: Vec4,
    /// The cumulus: cover, base (m), depth (m), a cloud's size (m).
    pub cumulus: Vec4,
    /// The deck above it, the same.
    pub deck: Vec4,
    /// How each layer drifts over the ground, m/s east and north: the cumulus, then the deck.
    pub wind: Vec4,
    /// How the day's cover lays the layers out: the cumulus' spread and the metres to a cell of its field
    /// ([`field::lay`]); where the deck's banks begin ([`ripple::bank_starts`]) and the metres to a tile of
    /// its cloudlets.
    pub lay: Vec4,
    /// The day's map: how many metres it is across (0: there is none), and the height its high cloud is drawn
    /// at, m; then [`MARCH_EVERY`].
    pub day: Vec4,
    /// Where what is in the cumulus now was in the last frame's picture, less where it is in this one, m: the eye's
    /// move less the cloud's drift.
    pub moved: Vec4,
}

/// Where the eye was and what the clock said, the frame before.
#[derive(Default)]
pub(super) struct Before {
    origin: Option<DVec3>,
    clock: f32,
}

/// The Sun's light as it reaches a cloud through the air in its way, lux in red, green and blue, with the Sun
/// this high (the sine of its elevation); none once its disc is under the horizon (`crate::night::sun_left`).
#[must_use]
pub fn sunlight(high: f32) -> Vec3 {
    lux::RAW_SUNLIGHT * (-AIR_MASS / high.max(0.03)).exp() * crate::night::sun_left(high)
}

/// The clear sky's light on a cloud, cd/m^2: less as the Sun goes down, and through twilight to the night sky's
/// (`crate::night::sky_left`).
#[must_use]
pub fn skylight(high: f32) -> Vec3 {
    SKYLIGHT * high.max(0.03).sqrt() * crate::night::sky_left(high)
}

fn layer(l: Layer) -> Vec4 {
    Vec4::new(l.cover, l.base, l.depth, l.size)
}

/// This frame's figures.
pub(super) fn look(
    origin: Res<Origin>,
    sky: Res<Sky>,
    ground: Res<Ground>,
    blank: Res<Blank>,
    air: Option<Res<Air>>,
    day: Option<Res<DayMap>>,
    mut marched: ResMut<CloudSky>,
    mut before: Local<Before>,
) {
    let Some(air) = air else { return };
    let drift = air.cumulus.drift * (air.clock - before.clock);
    let eye_moved = before.origin.map_or(Vec3::ZERO, |at| (origin.0 - at).as_vec3());
    let moved = eye_moved - ground.east * drift.x - ground.north * drift.y;
    *before = Before { origin: Some(origin.0), clock: air.clock };
    let from_centre = origin.0 - sky.centre;
    let height = (from_centre.length() - sky.radius) as f32;
    let up = from_centre.normalize().as_vec3();
    let over = Vec2::new(origin.0.as_vec3().dot(ground.east), origin.0.as_vec3().dot(ground.north));
    let (cumulus, deck) = (over - air.cumulus.drift * air.clock, over - air.deck.drift * air.clock);
    // The Sun's light as it reaches the cloud, through the air in its way; and less sky as the Sun goes down.
    let high = sky.sun.dot(up);
    let laid = field::lay(air.cumulus.cover, air.cumulus.size);
    let map = day.as_ref().map_or(blank.0.clone(), |day| day.image.clone());
    if marched.day != map {
        marched.day = map;
    }
    marched.frame = CloudFrame {
        up: up.extend(height),
        east: ground.east.extend(sky.radius as f32),
        north: ground.north.extend(air.clock),
        sun: sky.sun.extend(air.visibility),
        sunlight: sunlight(high).extend(air.haze),
        skylight: skylight(high).extend(0.0),
        over: Vec4::new(cumulus.x, cumulus.y, deck.x, deck.y),
        cumulus: layer(air.cumulus),
        deck: layer(air.deck),
        wind: Vec4::new(air.cumulus.drift.x, air.cumulus.drift.y, air.deck.drift.x, air.deck.drift.y),
        lay: Vec4::new(
            laid.x,
            laid.y,
            ripple::bank_starts(air.deck.cover),
            air.deck.size * ripple::CLOUDLETS as f32,
        ),
        day: Vec4::new(day.map_or(0.0, |day| day.extent), CIRRUS, MARCH_EVERY as f32, 0.0),
        moved: moved.extend(0.0),
    };
}

/// Keeps the targets at a [`MARCH_EVERY`]th of the size of what the eye draws into, whatever that becomes.
pub(super) fn fit(
    eyes: Query<&Camera, With<Eye>>,
    marched: Res<CloudSky>,
    sheet: Res<Sheet>,
    mut images: ResMut<Assets<Image>>,
    mut materials: ResMut<Assets<CloudLay>>,
) {
    let Some(size) = eyes.iter().find_map(Camera::physical_target_size) else { return };
    let small = (size + MARCH_EVERY - 1) / MARCH_EVERY;
    let want = Extent3d { width: small.x.max(1), height: small.y.max(1), depth_or_array_layers: 1 };
    if images.get(&marched.targets[0]).is_some_and(|image| image.texture_descriptor.size == want) {
        return;
    }
    for target in &marched.targets {
        if let Some(mut image) = images.get_mut(target) {
            image.resize(want);
        }
    }
    // (the laying-on holds the old textures until it is looked at again)
    let _ = materials.get_mut(&sheet.0);
}
