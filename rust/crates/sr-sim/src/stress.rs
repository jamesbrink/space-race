//! What the structure stands, and how near a body is to it.
//!
//! Two things break a vehicle in the air. Going up, the air bends it: the load across a slender booster goes as
//! the dynamic pressure times the angle its nose is off the wind (the "q alpha" a launch is flown to keep small).
//! And anywhere, the load along it: thrust and drag over its mass. Each has a limit, and a body past one fails.
//! Heating is not here (`rust/README.md`, "What is simplified").

use sr_measure::Measure;
use sr_world::earth::G0;

use crate::loads::Moment;
use crate::{Body, Loads};

/// What a vehicle stands.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Limits {
    /// The most bending the stack stands: dynamic pressure times the angle of its nose off the wind, Pa rad.
    pub bending: Measure,
    /// The most load the stack stands, g.
    pub stack_load: Measure,
    /// The most load the capsule stands, g.
    pub capsule_load: Measure,
}

/// What is straining a body.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum Strain {
    /// The air, bending it.
    #[default]
    Bending,
    /// The load on it.
    Load,
}

/// How near a body is to what it stands.
#[derive(Debug, Clone, Copy, PartialEq, Default)]
pub struct Stress {
    /// What strains it most.
    pub strain: Strain,
    /// How much of the limit that is: at 1 it fails.
    pub part: f64,
}

/// The stress on a body at an instant. A piece already let go stands whatever comes: nothing is asked of it.
#[must_use]
pub fn stress(limits: &Limits, body: Body, m: &Moment, l: &Loads) -> Stress {
    let load = l.felt().length() / G0;
    let (bending, load) = match body {
        Body::Stack => {
            // (off the wind it meets, which is not quite the way it is going when the air itself is moving)
            let speed = l.through.length();
            let off = if speed > 1.0 { (m.axis.dot(l.through) / speed).clamp(-1.0, 1.0).acos() } else { 0.0 };
            (l.q * off / limits.bending.value, load / limits.stack_load.value)
        }
        Body::Capsule => (0.0, load / limits.capsule_load.value),
        Body::Booster | Body::Tower => (0.0, 0.0),
    };
    if bending > load {
        Stress { strain: Strain::Bending, part: bending }
    } else {
        Stress { strain: Strain::Load, part: load }
    }
}

#[cfg(test)]
mod tests {
    use sr_world::V3;

    use super::*;

    const LIMITS: Limits = Limits {
        bending: Measure::estimated(6000.0, "a test's"),
        stack_load: Measure::estimated(12.0, "a test's"),
        capsule_load: Measure::estimated(25.0, "a test's"),
    };

    fn loads(q: f64, thrust: f64, through: V3) -> Loads {
        Loads { mass: 1000.0, thrust: V3::Y * thrust, drag: V3::ZERO, through, mach: 1.0, q, pressure: 0.0 }
    }

    #[test]
    fn a_stack_flown_nose_to_the_wind_is_not_bent_and_one_flown_across_it_is() {
        let straight = Moment { t: 60.0, position: V3::ZERO, velocity: V3::Y * 400.0, axis: V3::Y };
        assert!(
            stress(&LIMITS, Body::Stack, &straight, &loads(40_000.0, 0.0, straight.velocity)).part < 1e-9
        );
        let across = Moment { axis: V3::new(0.3, 1.0, 0.0).normalized(), ..straight };
        let bent = stress(&LIMITS, Body::Stack, &across, &loads(40_000.0, 0.0, across.velocity));
        assert_eq!(bent.strain, Strain::Bending);
        assert!(bent.part > 1.0, "{}", bent.part);
    }

    #[test]
    fn a_capsule_is_strained_by_its_load_alone() {
        let m = Moment { t: 500.0, position: V3::ZERO, velocity: V3::new(2000.0, 0.0, 0.0), axis: V3::Y };
        let s = stress(&LIMITS, Body::Capsule, &m, &loads(40_000.0, 1000.0 * G0 * 12.5, m.velocity));
        assert_eq!(s.strain, Strain::Load);
        assert!((s.part - 0.5).abs() < 1e-9);
    }
}
