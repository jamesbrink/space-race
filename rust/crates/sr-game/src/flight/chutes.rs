//! The parachutes: the drogue when the sequencer lets it out, then the main in its place, filling as the plan
//! has it fill.

use bevy::prelude::*;
use sr_render::canopy::Canopy;
use sr_sim::plan::Chute;

use super::{Crewed, Sequencer};
use crate::Showing;
use crate::clock::Clock;

/// How far the canopy's rim rides above where its lines meet, in canopy diameters. Estimated: about one for a
/// ringsail, more for a drogue on its riser.
const MAIN_LINES: f32 = 1.0;
const DROGUE_LINES: f32 = 5.0;
/// An inflated canopy is this much of its constructed diameter across. Estimated: the usual two thirds.
const INFLATED: f32 = 0.67;

/// Which parachute is out.
#[derive(Component, Debug, Clone, Copy, PartialEq, Eq)]
pub enum Out {
    /// The drogue.
    Drogue,
    /// The main.
    Main,
}

fn canopy(chute: &Chute, lines: f32, colours: [[f32; 3]; 2]) -> Canopy {
    let across = chute.diameter.value as f32 * INFLATED;
    Canopy {
        radius: across / 2.0,
        lines: across * lines,
        colours: colours.map(Vec3::from_array),
        filled: 0.0,
    }
}

/// Each frame: the parachute that is out is there, and as full as it is.
pub fn fly(
    mut commands: Commands,
    showing: Res<Showing>,
    clock: Res<Clock>,
    sequencer: Res<Sequencer>,
    crewed: Query<Entity, With<Crewed>>,
    mut out: Query<(Entity, &Out, &mut Canopy)>,
) {
    let (flight, sequence) = (showing.0, sequencer.0);
    let Ok(capsule) = crewed.single() else { return };
    let wanted = match (sequence.drogue, sequence.main) {
        (_, Some(at)) => Some((Out::Main, at, &flight.plan.main, MAIN_LINES)),
        (Some(at), None) => Some((Out::Drogue, at, &flight.plan.drogue, DROGUE_LINES)),
        (None, None) => None,
    };
    let mut there = false;
    for (entity, &which, mut canopy) in &mut out {
        match wanted {
            Some((kind, at, chute, _)) if kind == which => {
                there = true;
                canopy.filled = ((clock.t - at) / chute.fills.value) as f32;
            }
            _ => commands.entity(entity).despawn(),
        }
    }
    if let (false, Some((kind, _, chute, lines))) = (there, wanted) {
        commands.spawn((
            kind,
            canopy(chute, lines, flight.canopy),
            Transform::from_xyz(0.0, flight.parts.chute_height as f32, 0.0),
            ChildOf(capsule),
        ));
    }
}
