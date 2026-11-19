//! A rocket jet's gas dynamics, as far as its picture needs them: from the chamber's pressure, the pressure the
//! gas leaves the nozzle at and the air's, how wide the jet settles, how long its shock cells and its supersonic
//! core are, and how far the gas turns at the lip. One-dimensional isentropic flow of a perfect gas; every result
//! is derived, and as sure as the pressures it is given.

/// The air's pressure at the sea, Pa (the 1976 standard atmosphere).
pub const SEA: f32 = 101_325.0;
/// The least air a jet is worked against, as a fraction of its exit pressure: beyond this it is in a vacuum, and
/// its shape no longer changes.
const THINNEST: f32 = 1.0e-4;
/// No picture is drawn of gas turned further than this at the lip, radians: beyond it the gas is too thin to see.
const WIDEST_TURN: f32 = 1.25;

/// A nozzle and the gas it passes.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Nozzle {
    /// Radius of the exit, m.
    pub radius: f32,
    /// Pressure in the chamber, Pa.
    pub chamber: f32,
    /// Pressure of the gas at the exit, Pa.
    pub exit: f32,
    /// The gas's ratio of specific heats.
    pub gamma: f32,
}

/// What the air lets a jet be.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Shape {
    /// The exit's pressure over the air's: under 1 the jet is squeezed (over-expanded), over 1 it swells.
    pub ratio: f32,
    /// The jet's Mach number once it has come to the air's pressure.
    pub mach: f32,
    /// Its radius then, m.
    pub radius: f32,
    /// The length of one shock cell, m.
    pub cell: f32,
    /// The length of the supersonic core, m.
    pub core: f32,
    /// How far the gas turns outward at the lip, radians (0 when squeezed).
    pub turn: f32,
}

/// The Mach number a gas reaches expanding from rest at `chamber` to `pressure`.
#[must_use]
pub fn mach(chamber: f32, pressure: f32, gamma: f32) -> f32 {
    let ratio = (chamber / pressure).max(1.0);
    (2.0 / (gamma - 1.0) * (ratio.powf((gamma - 1.0) / gamma) - 1.0)).sqrt()
}

/// The area of a stream tube at a Mach number over its area at the throat.
#[must_use]
pub fn area(mach: f32, gamma: f32) -> f32 {
    let power = (gamma + 1.0) / (2.0 * (gamma - 1.0));
    (2.0 / (gamma + 1.0) * (1.0 + 0.5 * (gamma - 1.0) * mach * mach)).powf(power) / mach
}

/// The Prandtl-Meyer angle: how far a sonic stream has turned by the time it reaches a Mach number, radians.
#[must_use]
pub fn turned(mach: f32, gamma: f32) -> f32 {
    let k = ((gamma + 1.0) / (gamma - 1.0)).sqrt();
    let beta = (mach * mach - 1.0).max(0.0).sqrt();
    k * (beta / k).atan() - beta.atan()
}

impl Nozzle {
    /// The jet in air at `ambient` Pa.
    ///
    /// The shock cell is Prandtl's and Pack's for a jet's vortex sheet, 1.306 d sqrt(M^2 - 1) (Pack, Q. J. Mech.
    /// Appl. Math. 3, 1950); the core is NASA SP-8072's fit (1971, Figure 11), 3.45 d (1 + 0.38 M)^2; both on the
    /// jet's diameter and Mach number once it has come to the air's pressure.
    #[must_use]
    pub fn shape(&self, ambient: f32) -> Shape {
        let ambient = ambient.max(self.exit * THINNEST);
        let left = mach(self.chamber, self.exit, self.gamma).max(1.01);
        let jet = mach(self.chamber, ambient, self.gamma).max(1.01);
        let radius = self.radius * (area(jet, self.gamma) / area(left, self.gamma)).sqrt();
        let turn = (turned(jet, self.gamma) - turned(left, self.gamma)).clamp(0.0, WIDEST_TURN);
        Shape {
            ratio: self.exit / ambient,
            mach: jet,
            radius,
            cell: 1.306 * 2.0 * radius * (jet * jet - 1.0).sqrt(),
            core: 3.45 * 2.0 * radius * (1.0 + 0.38 * jet).powi(2),
            turn,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The Redstone's A-7: 318 psia in the chamber, about nine tenths of an atmosphere at a 0.366 m exit.
    const A7: Nozzle = Nozzle { radius: 0.366, chamber: 2_192_533.0, exit: 91_192.5, gamma: 1.2 };

    #[test]
    fn the_tables_of_isentropic_flow_are_kept() {
        // (NACA Report 1135's relations at gamma 1.4: A/A* 1.6875 and 26.38 degrees at Mach 2)
        assert!((area(2.0, 1.4) - 1.6875).abs() < 1e-3);
        assert!((turned(2.0, 1.4).to_degrees() - 26.38).abs() < 0.02);
        assert!((mach(1.0, 0.1278, 1.4) - 2.0).abs() < 2e-3);
    }

    #[test]
    fn at_the_sea_the_a7s_jet_is_nearly_matched() {
        let shape = A7.shape(SEA);
        assert!((0.85..1.0).contains(&shape.ratio));
        assert!((shape.radius / A7.radius - 1.0).abs() < 0.05, "{shape:?}");
        assert_eq!(shape.turn, 0.0);
        // A core of some ten metres: the stills have the fire fade seven to ten metres under the tail.
        assert!((8.0..12.0).contains(&shape.core), "{shape:?}");
        assert!((2.0..3.5).contains(&shape.cell), "{shape:?}");
    }

    #[test]
    fn it_swells_as_the_air_thins_and_then_changes_no_more() {
        let (low, high, higher) = (A7.shape(SEA), A7.shape(1_000.0), A7.shape(10.0));
        assert!(high.radius > 3.0 * low.radius && higher.radius > high.radius);
        assert!(high.cell > 5.0 * low.cell);
        assert!(high.turn > 0.5 && higher.turn <= WIDEST_TURN);
        assert_eq!(A7.shape(1.0e-3), A7.shape(0.0));
    }
}
