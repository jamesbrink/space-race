//! The day's air, as the picture needs it: the cloud, the wind that carries it, the haze. The game fills it from
//! the flight's weather (docs/agents/rendering.md: "the sky over a site is its flight's own day"); nothing here
//! is a default sky.

use bevy::prelude::*;

/// A layer of cloud.
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct Layer {
    /// Fraction of the sky covered.
    pub cover: f32,
    /// Height of the bases above the ground, m.
    pub base: f32,
    /// From the bases to the highest tops, m.
    pub depth: f32,
    /// Across one cloud, m.
    pub size: f32,
    /// How it drifts over the ground, m/s east and north.
    pub drift: Vec2,
}

/// The air over the site at an instant.
#[derive(Resource, Debug, Clone, PartialEq, Default)]
pub struct Air {
    /// The low cloud: heaped (cumulus).
    pub cumulus: Layer,
    /// The middle cloud: a thin deck of cloudlets (altocumulus).
    pub deck: Layer,
    /// How far one can see, m.
    pub visibility: f32,
    /// The height over which the haze thins by e, m.
    pub haze: f32,
    /// Seconds on the flight's clock: what the cloud's drift is reckoned from, so a stopped clock stops the sky.
    pub clock: f32,
}

/// The day's map of the weather far from the site: how much of the sky each kind of cloud covers (red the heaped
/// cloud, green the high, blue the layered), on a square so far across, centred on the site. The game puts one in
/// the world if the flight has one; without it the cloud is the site's own everywhere.
#[derive(Resource, Debug, Clone, PartialEq)]
pub struct DayMap {
    /// The map.
    pub image: Handle<Image>,
    /// How far across it is, m.
    pub extent: f32,
}
