//! A number with how sure we are of it and where it came from.
//!
//! The repo's rule (`AGENTS.md`, "Rules that keep the numbers honest"): every figure carries a confidence, and the
//! simulator refuses to stand on an estimate. [`Measure::for_sim`] is where that refusal lives.

use std::fmt;

/// How a figure is known.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Confidence {
    /// A published figure; the source names the document and the place in it.
    Documented,
    /// The type's or a sister vehicle's documented figure, taken for this unit.
    Assumed,
    /// Computed from documented figures; the source says how.
    Derived,
    /// Read off photographs, or chosen to look right.
    Estimated,
}

/// A figure, its confidence and its source.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Measure {
    /// The figure, in the SI unit its name says.
    pub value: f64,
    /// How it is known.
    pub confidence: Confidence,
    /// Where it comes from.
    pub source: &'static str,
}

/// The simulator was handed an estimate.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Refused(pub Measure);

impl fmt::Display for Refused {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "the simulator will not depend on an estimate: {} ({})", self.0.value, self.0.source)
    }
}

impl std::error::Error for Refused {}

impl Measure {
    /// A published figure.
    #[must_use]
    pub const fn documented(value: f64, source: &'static str) -> Self {
        Self { value, confidence: Confidence::Documented, source }
    }

    /// A sister unit's documented figure.
    #[must_use]
    pub const fn assumed(value: f64, source: &'static str) -> Self {
        Self { value, confidence: Confidence::Assumed, source }
    }

    /// A figure computed from documented ones.
    #[must_use]
    pub const fn derived(value: f64, source: &'static str) -> Self {
        Self { value, confidence: Confidence::Derived, source }
    }

    /// A figure read off a photograph or chosen to look right.
    #[must_use]
    pub const fn estimated(value: f64, source: &'static str) -> Self {
        Self { value, confidence: Confidence::Estimated, source }
    }

    /// The figure, for physics that may stand on nothing estimated.
    ///
    /// # Errors
    /// [`Refused`] if the figure is an estimate.
    pub fn for_sim(self) -> Result<f64, Refused> {
        if self.is_estimate() { Err(Refused(self)) } else { Ok(self.value) }
    }

    /// Whether the figure is an estimate: what a flight lists when it says what it stands on.
    #[must_use]
    pub const fn is_estimate(self) -> bool {
        matches!(self.confidence, Confidence::Estimated)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_simulator_refuses_an_estimate() {
        assert!(Measure::estimated(1.0, "by eye").for_sim().is_err());
        assert_eq!(Measure::documented(2.0, "TM X-0000, p. 1").for_sim(), Ok(2.0));
        assert_eq!(Measure::derived(3.0, "a / b").for_sim(), Ok(3.0));
    }
}
