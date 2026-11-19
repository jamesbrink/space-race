//! What the capsule's sequencer has done so far: the things that happen on a condition, not at a time.

use crate::Plan;

/// When each conditional event happened, s from liftoff; `None` until it has.
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct Sequence {
    /// The top of the path.
    pub apogee: Option<f64>,
    /// The drogue came out.
    pub drogue: Option<f64>,
    /// The main parachute came out.
    pub main: Option<f64>,
    /// It reached the sea.
    pub landed: Option<f64>,
}

impl Sequence {
    /// Bring the sequencer up to an instant: the height above the sea (m) and the rate of climb (m/s) then, and
    /// whether the capsule is free of its booster (until it is, the sequencer does nothing).
    pub fn step(&mut self, plan: &Plan, t: f64, height: f64, climb: f64, free: bool) {
        if !free {
            return;
        }
        if self.apogee.is_none() && climb <= 0.0 {
            self.apogee = Some(t);
        }
        if self.apogee.is_none() {
            return;
        }
        if self.drogue.is_none() && height <= plan.drogue.below.value {
            self.drogue = Some(t);
        }
        if self.main.is_none() && height <= plan.main.below.value {
            self.main = Some(t);
        }
        if self.landed.is_none() && height <= 0.0 {
            self.landed = Some(t);
        }
    }

    /// The parachutes' drag area at an instant, m^2.
    #[must_use]
    pub fn chute_area(&self, plan: &Plan, t: f64) -> f64 {
        let out = |chute: &crate::plan::Chute, at: Option<f64>| at.map_or(0.0, |at| chute.area_after(t - at));
        // The drogue leaves with the antenna canister when the main comes out.
        if self.main.is_some() { out(&plan.main, self.main) } else { out(&plan.drogue, self.drogue) }
    }
}
