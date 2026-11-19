//! What the flight has come to so far, kept as it is flown: the figures the record is held against, so that when
//! it is over the pilot can be told how near the flight that was flown theirs came.

use bevy::prelude::*;
use sr_missions::types::Figure;

use super::{Hand, Sequencer, Telemetry};
use crate::Showing;
use crate::clock::Clock;

/// The flight's figures so far.
#[derive(Resource, Debug, Clone, Copy, PartialEq, Default)]
pub struct Log {
    /// The greatest height, m above the sea.
    pub top: f64,
    /// Distance over the sea from the pad, m.
    pub range: f64,
    /// Speed over the turning Earth as the capsule left its booster, m/s.
    pub separation: Option<f64>,
    /// The greatest load coming down, before the parachutes, in g.
    pub entry: f64,
    /// The nearest the structure came to what it stands, 1 being failure.
    pub strain: f64,
    /// When it came down, s on the clock.
    pub down: Option<f64>,
}

impl Log {
    /// What the flight made of one of the record's figures, SI; `None` until it has one.
    #[must_use]
    pub fn made(&self, figure: Figure) -> Option<f64> {
        match figure {
            Figure::Top => Some(self.top),
            Figure::Range => Some(self.range),
            Figure::SeparationSpeed => self.separation,
            Figure::EntryLoad => Some(self.entry).filter(|&load| load > 0.0),
            Figure::Landing => self.down,
        }
    }
}

/// Each step: the figures brought up to it.
pub fn keep(
    clock: Res<Clock>,
    showing: Res<Showing>,
    telemetry: Res<Telemetry>,
    sequencer: Res<Sequencer>,
    hand: Res<Hand>,
    mut log: ResMut<Log>,
) {
    if !clock.ready || clock.t < 0.0 || log.down.is_some() {
        return;
    }
    let sequence = sequencer.0;
    log.top = log.top.max(telemetry.height);
    log.range = telemetry.range;
    log.strain = log.strain.max(telemetry.stress.part);
    if log.separation.is_none() && hand.free(&showing.0.plan, clock.t) {
        log.separation = Some(telemetry.speed);
    }
    // (as the simulator reckons it: from the top of the path to the drogue)
    if sequence.apogee.is_some() && sequence.drogue.is_none() {
        log.entry = log.entry.max(telemetry.g);
    }
    log.down = sequence.landed;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_figure_is_not_given_before_the_flight_has_one() {
        let log = Log { top: 1200.0, ..default() };
        assert_eq!(log.made(Figure::Top), Some(1200.0));
        assert_eq!(log.made(Figure::SeparationSpeed), None);
        assert_eq!(log.made(Figure::EntryLoad), None);
        assert_eq!(log.made(Figure::Landing), None);
    }
}
