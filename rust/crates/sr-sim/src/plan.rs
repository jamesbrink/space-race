//! A flight as figures: one booster under one capsule, up and down again (`src/sim/plan.ts`, for the ballistic
//! Mercury-Redstone flights). A flight's own file in `sr-missions` fills one in, each figure with its source.

use sr_measure::Measure;
use sr_world::earth::G0;

use crate::{Curve, air};

/// A liquid engine as its test stand measured it.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Engine {
    /// Thrust at sea level, N.
    pub thrust: Measure,
    /// Specific impulse at sea level, s.
    pub isp: Measure,
    /// Nozzle exit area, m^2: what the thrust gains as the air thins.
    pub exit_area: Measure,
}

impl Engine {
    /// Propellant passed, kg/s.
    #[must_use]
    pub fn flow(&self) -> f64 {
        self.thrust.value / (G0 * self.isp.value)
    }

    /// Thrust against an ambient pressure (Pa), N.
    #[must_use]
    pub fn thrust_at(&self, pressure: f64) -> f64 {
        self.thrust.value + (air::P0 - pressure) * self.exit_area.value
    }
}

/// A solid motor: a thrust held for a time.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Motor {
    /// Thrust, N.
    pub thrust: Measure,
    /// Burning time, s.
    pub burn: Measure,
}

impl Motor {
    /// Thrust this long after it was lit, N.
    #[must_use]
    pub fn thrust_after(&self, seconds: f64) -> f64 {
        if (0.0..self.burn.value).contains(&seconds) { self.thrust.value } else { 0.0 }
    }
}

/// A parachute: let out by the barostat on the way down.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Chute {
    /// The height it comes out at, m above the sea.
    pub below: Measure,
    /// The drag area it adds once full, m^2.
    pub drag_area: Measure,
    /// How long it takes to fill, s.
    pub fills: Measure,
}

impl Chute {
    /// The drag area this long after it came out, m^2.
    #[must_use]
    pub fn area_after(&self, seconds: f64) -> f64 {
        self.drag_area.value * (seconds / self.fills.value).clamp(0.0, 1.0)
    }
}

/// Everything the simulator flies a ballistic flight from.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Plan {
    /// Launch azimuth, degrees true.
    pub azimuth: Measure,
    /// The booster's engine.
    pub engine: Engine,
    /// Mass at liftoff, kg.
    pub liftoff_mass: Measure,
    /// Engine cutoff, s from liftoff.
    pub cutoff: Measure,
    /// The tilt programme: degrees from the launch vertical against seconds, in the azimuth's plane.
    pub tilt: Curve,
    /// The area the drag coefficients are referred to, m^2.
    pub area: Measure,
    /// Drag coefficient against Mach number, going up on the booster.
    pub ascent_drag: Curve,
    /// Drag coefficient against Mach number, coming down heat shield first.
    pub entry_drag: Curve,
    /// When the escape tower leaves, s.
    pub tower_off: Measure,
    /// What leaves with it, kg.
    pub tower_mass: Measure,
    /// The motors that carry it away: the escape rocket and the jettison rocket.
    pub tower_motors: [Motor; 2],
    /// When the capsule separates, s.
    pub separation: Measure,
    /// The capsule after separation, kg.
    pub capsule_mass: Measure,
    /// The booster after separation, kg.
    pub booster_mass: Measure,
    /// The spent booster's drag area as it tumbles, m^2.
    pub booster_drag_area: Measure,
    /// How fast the two part, m/s.
    pub push: Measure,
    /// When each retrorocket fires, s.
    pub retro_fires: [Measure; 3],
    /// One retrorocket.
    pub retro: Motor,
    /// The blunt end's elevation above the level while they fire, degrees.
    pub retro_pitch: Measure,
    /// When the retropack is let go, s.
    pub retropack_off: Measure,
    /// The capsule after that, kg.
    pub entry_mass: Measure,
    /// The drogue.
    pub drogue: Chute,
    /// The main parachute.
    pub main: Chute,
}

impl Plan {
    /// The stack's mass before separation, kg.
    #[must_use]
    pub fn stack_mass(&self, t: f64) -> f64 {
        let burned = self.engine.flow() * t.clamp(0.0, self.cutoff.value);
        let tower = if t >= self.tower_off.value { self.tower_mass.value } else { 0.0 };
        self.liftoff_mass.value - burned - tower
    }

    /// The capsule's mass after separation, kg.
    #[must_use]
    pub fn capsule_mass_at(&self, t: f64) -> f64 {
        if t >= self.retropack_off.value { self.entry_mass.value } else { self.capsule_mass.value }
    }

    /// The three retrorockets' thrust together at an instant, N.
    #[must_use]
    pub fn retro_thrust(&self, t: f64) -> f64 {
        self.retro_fires.iter().map(|fired| self.retro.thrust_after(t - fired.value)).sum()
    }

    /// Every figure the flight stands on that is an estimate, for the flight to say so.
    #[must_use]
    pub fn estimates(&self) -> Vec<&'static str> {
        let figures = [
            self.azimuth,
            self.engine.thrust,
            self.engine.isp,
            self.engine.exit_area,
            self.liftoff_mass,
            self.cutoff,
            self.area,
            self.tower_mass,
            self.capsule_mass,
            self.booster_mass,
            self.booster_drag_area,
            self.push,
            self.retro.thrust,
            self.retro_pitch,
            self.entry_mass,
            self.drogue.drag_area,
            self.main.drag_area,
        ];
        let curves = [self.tilt, self.ascent_drag, self.entry_drag];
        let estimated = |c: sr_measure::Confidence| matches!(c, sr_measure::Confidence::Estimated);
        figures
            .iter()
            .filter(|m| m.is_estimate())
            .map(|m| m.source)
            .chain(curves.iter().filter(|c| estimated(c.confidence)).map(|c| c.source))
            .collect()
    }
}
