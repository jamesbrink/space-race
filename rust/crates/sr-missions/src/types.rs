//! What a flight and a place are made of (`src/types/*.ts`, cut to what the native build draws and flies).

use sr_measure::Measure;
use sr_sim::Plan;
use sr_world::{Instant, Site};

/// A place's region as the web build maps it (`public/globe/<region>.json`, `tools/globe-region.mjs`): the shore
/// round it, drawn from OpenStreetMap as a field of distances.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Region {
    /// The near map's file under `public/globe/`: 160 km square about the site.
    pub shore: &'static str,
    /// Half its width, as a fraction of the sphere's radius (its `box`).
    pub half_width: f64,
    /// Texels across.
    pub texels: u32,
    /// How many texels from a shore it keeps a distance (its `spread`).
    pub spread: u32,
}

/// A site with how each figure of it is known (`SiteDef` in `src/types/site.ts`).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SiteDef {
    /// What the place is called.
    pub name: &'static str,
    /// Geodetic latitude, degrees north (WGS 84).
    pub latitude: Measure,
    /// Longitude, degrees east (WGS 84).
    pub longitude: Measure,
    /// Height of the frame's origin above the ellipsoid, m.
    pub height: Measure,
    /// Height of the sea above the ellipsoid there, m.
    pub sea_level: Measure,
    /// True bearing of the frame's +X, degrees.
    pub bearing_x: Measure,
    /// Where the land lies against the frame's origin, m (negative: below the hardstand).
    pub grade: Measure,
    /// The region round it, if it has been mapped.
    pub region: Option<Region>,
}

impl SiteDef {
    /// The frame, for `sr-world`.
    #[must_use]
    pub fn site(&self) -> Site {
        Site {
            latitude: self.latitude.value,
            longitude: self.longitude.value,
            height: self.height.value,
            bearing_x: self.bearing_x.value,
        }
    }

    /// How far the frame's origin stands above the sea, m.
    #[must_use]
    pub fn above_sea(&self) -> f64 {
        self.height.value - self.sea_level.value
    }
}

/// What a model is of.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Role {
    /// The spacecraft and its launch vehicle: what flies.
    Vehicle,
    /// The pad it stands on.
    Pad,
    /// The crew, as they stood by.
    Crew,
    /// What stood round the pad that day.
    Surroundings,
}

/// A model and where it stands in the site's frame.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Model {
    /// What it is of.
    pub role: Role,
    /// Its GLB, by the path it has under `public/models/` (and under `rust/assets/models/` once unpacked).
    pub path: &'static str,
    /// Where its origin stands, m.
    pub position: [f64; 3],
    /// How far it is turned about the vertical, degrees.
    pub turn: f64,
}

/// A layer of cloud (`CloudLayer` in `src/types/weather.ts`).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Cloud {
    /// Fraction of the sky covered.
    pub cover: Measure,
    /// Height of the bases above the ground, m.
    pub base: Measure,
    /// From bases to the highest tops, m.
    pub depth: Measure,
    /// Across one cloud, m.
    pub size: Measure,
    /// Where the wind at its height blows from, degrees true.
    pub wind_from: Measure,
    /// How fast, m/s.
    pub wind_speed: Measure,
}

/// The sky a flight stood under (`DayWeather`).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Weather {
    /// The low cloud: cumulus.
    pub low: Cloud,
    /// The middle cloud: altocumulus.
    pub middle: Cloud,
    /// How far one could see, m.
    pub visibility: Measure,
    /// The height over which the haze thins by e, m.
    pub haze: Measure,
    /// The day's cloud map under `public/globe/` (red cumulus, green high, blue layered).
    pub map: &'static str,
}

/// The parts of the vehicle's model that leave together, by the names of its top-level nodes.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Parts {
    /// The escape tower.
    pub tower: &'static [&'static str],
    /// The capsule.
    pub capsule: &'static [&'static str],
    /// The booster.
    pub booster: &'static [&'static str],
    /// The retropack, which leaves the capsule later.
    pub retropack: &'static str,
    /// The antenna canister, which leaves with the drogue when the main parachute comes out.
    pub canister: &'static str,
    /// Where the parachutes' lines meet the capsule, m up its axis from the model's origin.
    pub chute_height: f64,
}

/// An engine's fire, as it is drawn (`src/viewer/flames.ts`, `plume.ts`).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Flame {
    /// The node of the vehicle's model the nozzle is part of: the fire goes where it goes.
    pub node: &'static str,
    /// Height of the nozzle's exit in the vehicle's frame, m.
    pub exit_height: Measure,
    /// Radius of the nozzle's exit, m.
    pub exit_radius: Measure,
    /// Pressure of the gas at the exit, Pa.
    pub exit_pressure: Measure,
    /// Length of the visible flame at sea level, in exit radii.
    pub length: Measure,
    /// Linear colours from the core out: core, hot, warm, cool, and what is left in a vacuum.
    pub colours: [[f32; 3]; 5],
}

/// One thing the record says happened, for the simulator to be held against.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Check {
    /// What it is.
    pub label: &'static str,
    /// What the record has, SI.
    pub recorded: Measure,
    /// What this build's simulator makes it, SI.
    pub simulated: f64,
    /// Why they differ.
    pub why: &'static str,
}

/// An event on the flight's clock, as the record has it.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Event {
    /// Seconds from liftoff.
    pub at: f64,
    /// What happened.
    pub label: &'static str,
}

/// A flight.
#[derive(Debug, Clone, PartialEq)]
pub struct Flight {
    /// Its path under `missions/` and `public/models/`.
    pub id: &'static str,
    /// What it is called.
    pub name: &'static str,
    /// One line under the name.
    pub line: &'static str,
    /// Liftoff, as (year, month, day, hour, minute, second) UTC.
    pub launch: (i32, u32, u32, u32, u32, f64),
    /// Where it left from.
    pub site: SiteDef,
    /// The sky it stood under.
    pub weather: Weather,
    /// What is drawn.
    pub models: &'static [Model],
    /// How the vehicle comes apart.
    pub parts: Parts,
    /// Its engine's fire.
    pub flame: Flame,
    /// Its parachutes' two colours, linear.
    pub canopy: [[f32; 3]; 2],
    /// What it is flown from.
    pub plan: Plan,
    /// The record's clock.
    pub events: &'static [Event],
    /// Where this build's simulator misses the record.
    pub misses: &'static [Check],
}

impl Flight {
    /// The instant of liftoff.
    #[must_use]
    pub fn liftoff(&self) -> Instant {
        let (y, mo, d, h, mi, s) = self.launch;
        Instant::utc(y, mo, d, h, mi, s)
    }

    /// The model with a role.
    #[must_use]
    pub fn model(&self, role: Role) -> Option<&Model> {
        self.models.iter().find(|m| m.role == role)
    }
}
