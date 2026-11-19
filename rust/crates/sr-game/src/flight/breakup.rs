//! A booster asked more than it stands comes to pieces: it parts at the joints its flight's data names, each
//! piece a body of its own that tumbles away and falls, in a burst of what was still in its tanks.
//!
//! How the pieces are thrown is an estimate, the same every time: enough to see them part.

use bevy::math::DVec3;
use bevy::prelude::*;
use sr_missions::Flight;
use sr_render::origin::WorldPos;
use sr_render::smoke::Puff;

use super::bodies::{Outline, State, body, hand_over};
use super::{Loose, Parts};

/// How fast the pieces are thrown apart, m/s, and how fast they tumble, rad/s. Estimated.
const THROWN: f64 = 6.0;
const TUMBLES: f64 = 0.9;
/// The burst: how many puffs, how fast they spread, m/s, and how big they get, m. Estimated.
const PUFFS: u32 = 36;
const SPREADS: f32 = 22.0;
const SWELLS: f32 = 16.0;

/// A direction for the `i`th of something, spread evenly over the sphere (the golden angle's spiral).
fn spread(i: u32, of: u32) -> DVec3 {
    let up = 1.0 - 2.0 * (f64::from(i) + 0.5) / f64::from(of.max(1));
    let round = f64::from(i) * 2.399_963;
    let out = (1.0 - up * up).max(0.0).sqrt();
    DVec3::new(out * round.cos(), up, out * round.sin())
}

/// The booster leaves the crewed body in its pieces.
pub fn shatter(commands: &mut Commands, parts: &Parts, from: &State, flight: &Flight, t: f64) {
    let pieces = flight.solids.breaks;
    for (i, piece) in (0_u32..).zip(pieces) {
        let way = spread(i, pieces.len() as u32);
        let mass = flight.plan.booster_mass.value * piece.share.value;
        let outline = Outline::of(&piece.solid);
        let state = from.leaving(outline.origin, way * THROWN, way.cross(DVec3::Y) * TUMBLES);
        let drag_area = flight.plan.booster_drag_area.value * piece.share.value;
        let fragment = commands.spawn((body(&state, mass, &outline), Loose { mass, drag_area })).id();
        let nodes = piece.nodes.iter().filter_map(|name| parts.0.get(*name).copied());
        hand_over(commands, fragment, nodes, outline.origin);
    }
    let middle = from.at + from.axis() * flight.solids.booster.balance.value;
    for i in 0..PUFFS {
        let way = spread(i, PUFFS).as_vec3();
        let size = 0.5 + 0.5 * (i % 5) as f32 / 4.0;
        commands.spawn((
            Puff {
                born: t as f32,
                lasts: 5.0 + 5.0 * size,
                grows: [2.0, SWELLS * size],
                velocity: way * SPREADS * size,
            },
            WorldPos(middle + (way * 3.0).as_dvec3()),
        ));
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_pieces_are_thrown_every_way() {
        let sum = (0..36).map(|i| spread(i, 36)).fold(DVec3::ZERO, |a, b| a + b);
        assert!(sum.length() < 0.5, "{sum}");
        assert!((spread(3, 36).length() - 1.0).abs() < 1e-9);
    }
}
