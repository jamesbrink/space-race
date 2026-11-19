//! What the air's heat does to a vehicle (`src/sim/heating.ts`): the heat flux at the stagnation point from the
//! air's density and the speed through it, and the temperature of each surface a flight names as it takes its
//! share of that flux and radiates.
//!
//! The flux is Sutton and Graves's (NASA TR R-376, 1971): at the stagnation point of a blunt body, to a wall far
//! colder than the gas, `q = k sqrt(density / nose radius) speed^3`. The equation and its constant are as they
//! are commonly given from that report, which was not opened (the web build says the same). A wall that has
//! warmed takes less, by the enthalpy it already has against the air's total. Each surface is one lump at one
//! temperature that radiates to surroundings at the temperature it started at; conduction into what is behind it
//! is left out. How hot the gas is behind the shock is a judgement, for its colour only.

use sr_measure::Measure;

use crate::Body;
use crate::air::Air;

/// Sutton and Graves's constant for air, kg^0.5 / m: quoted as commonly given, the report not opened.
pub const SUTTON_GRAVES: f64 = 1.7415e-4;
/// W/(m^2 K^4), CODATA 2018.
pub const STEFAN_BOLTZMANN: f64 = 5.670_374_419e-8;
/// Cold air's specific heat at constant pressure, J/(kg K): 7/2 of the 1976 standard air's gas constant.
const CP_AIR: f64 = 1004.7;
/// The ratio of air's specific heats times its gas constant, J/(kg K): the speed of sound squared over this is
/// its temperature.
const GAMMA_R: f64 = 1.4 * 287.053;

/// A surface the heat is worked on.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Surface {
    /// What it is called.
    pub name: &'static str,
    /// Which body it is on once the vehicle has come apart: lost with it if it goes past its limit.
    pub on: Body,
    /// Its share of the stagnation flux flying nose first, and blunt end first. Without the first it is out
    /// of the air while the vehicle rides its booster.
    pub up: Option<Measure>,
    /// As `up`.
    pub down: Option<Measure>,
    /// What is behind each square metre of it, kg.
    pub areal_mass: Measure,
    /// J/(kg K).
    pub specific_heat: Measure,
    /// How well it radiates, 0 to 1.
    pub emissivity: Measure,
    /// The temperature it stands, K.
    pub limit: Measure,
}

/// What a vehicle's heating is worked from.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Heating {
    /// The radius of the nose the stagnation flux is reckoned for, m.
    pub nose_radius: Measure,
    /// What everything stood at on the pad, K.
    pub starts: Measure,
    /// The surfaces.
    pub surfaces: &'static [Surface],
}

/// The heat flux at the stagnation point of a nose, to a cold wall, W/m^2.
#[must_use]
pub fn stagnation_flux(density: f64, airspeed: f64, nose_radius: f64) -> f64 {
    SUTTON_GRAVES * (density.max(0.0) / nose_radius).sqrt() * airspeed.abs().powi(3)
}

/// The air's total enthalpy at a speed through it, J/kg.
#[must_use]
pub fn total_enthalpy(air_temperature: f64, airspeed: f64) -> f64 {
    CP_AIR * air_temperature + 0.5 * airspeed * airspeed
}

/// How much of the cold-wall flux a wall at `wall` kelvin takes: 1 cold, 0 at the air's own stagnation
/// temperature, negative above it.
#[must_use]
pub fn wall_factor(enthalpy: f64, wall: f64) -> f64 {
    if enthalpy > 0.0 { 1.0 - CP_AIR * wall / enthalpy } else { 0.0 }
}

/// Roughly how hot the air is behind the bow shock, K: brought to rest as a perfect gas up to 2,500 K, and beyond
/// that only 15 per cent of the rise (the rest goes into pulling its molecules apart). For colour only.
#[must_use]
pub fn shock_temperature(air_temperature: f64, airspeed: f64) -> f64 {
    let perfect = total_enthalpy(air_temperature, airspeed) / CP_AIR;
    if perfect <= 2500.0 { perfect } else { 2500.0 + 0.15 * (perfect - 2500.0) }
}

/// A surface's share of the stagnation flux as the vehicle lies (`blunt` 0 nose first to 1 blunt end first).
fn share(surface: &Surface, blunt: f64, covered: bool) -> f64 {
    if covered && surface.up.is_none() {
        return 0.0;
    }
    let of = |part: Option<Measure>| part.map_or(0.0, |part| part.value);
    of(surface.up) * (1.0 - blunt) + of(surface.down) * blunt
}

/// How a body lies to the air it is moving through.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Lie {
    /// Its speed through the air, m/s.
    pub airspeed: f64,
    /// 0 flying nose first, 1 blunt end first.
    pub blunt: f64,
    /// Whether it is still riding its booster: what is under the booster's adapter is out of the air.
    pub covered: bool,
}

/// The heating at an instant.
#[derive(Debug, Clone, PartialEq)]
pub struct Thermal {
    /// The cold-wall flux at the stagnation point, W/m^2, and its sum since liftoff, J/m^2.
    pub flux: f64,
    /// As `flux`.
    pub load: f64,
    /// Roughly how hot the air is behind the shock, K.
    pub gas: f64,
    /// Each surface's temperature, K, in the order of the flight's surfaces.
    pub surfaces: Vec<f64>,
}

impl Thermal {
    /// As a flight begins: nothing taken in, everything at the temperature it stood at.
    #[must_use]
    pub fn begin(heating: &Heating) -> Self {
        Self { flux: 0.0, load: 0.0, gas: 0.0, surfaces: vec![heating.starts.value; heating.surfaces.len()] }
    }

    /// Carried on `step` seconds through this air, lying as it lies (Heun's method; the air is taken as the same
    /// across the step, which at the physics's hundredth of a second it is).
    pub fn advance(&mut self, heating: &Heating, air: &Air, lie: &Lie, step: f64) {
        let temperature = air.sound * air.sound / GAMMA_R;
        let enthalpy = total_enthalpy(temperature, lie.airspeed);
        self.flux = stagnation_flux(air.density, lie.airspeed, heating.nose_radius.value);
        self.load += self.flux * step;
        self.gas = shock_temperature(temperature, lie.airspeed);
        let cold = heating.starts.value;
        for (surface, wall) in heating.surfaces.iter().zip(&mut self.surfaces) {
            let capacity = surface.areal_mass.value * surface.specific_heat.value;
            let takes = self.flux * share(surface, lie.blunt, lie.covered);
            let net = |wall: f64| {
                takes * wall_factor(enthalpy, wall)
                    - surface.emissivity.value * STEFAN_BOLTZMANN * (wall.powi(4) - cold.powi(4))
            };
            let first = net(*wall);
            let second = net(*wall + step * first / capacity);
            *wall += step * (first + second) / 2.0 / capacity;
        }
    }

    /// How far a surface has come from what it stood at on the pad toward what it stands: 0 as it began, 1 at
    /// its limit.
    #[must_use]
    pub fn part(&self, heating: &Heating, which: usize) -> f64 {
        let (cold, limit) = (heating.starts.value, heating.surfaces[which].limit.value);
        (self.surfaces[which] - cold) / (limit - cold)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::air;

    const SHIELD: Surface = Surface {
        name: "a shield",
        on: Body::Capsule,
        up: None,
        down: Some(Measure::estimated(0.9, "a test's")),
        areal_mass: Measure::estimated(46.9, "a test's"),
        specific_heat: Measure::estimated(1825.0, "a test's"),
        emissivity: Measure::estimated(0.5, "a test's"),
        limit: Measure::estimated(1560.0, "a test's"),
    };
    const HEATING: Heating = Heating {
        nose_radius: Measure::estimated(2.032, "a test's"),
        starts: Measure::estimated(300.0, "a test's"),
        surfaces: &[SHIELD],
    };

    #[test]
    fn the_flux_is_sutton_and_graves_s() {
        // 7.5 km/s at 60 km (3.1e-4 kg/m^3) on a one metre nose: 1.7415e-4 * sqrt(3.1e-4) * 7500^3 = 1.29 MW/m^2.
        let flux = stagnation_flux(3.1e-4, 7500.0, 1.0);
        assert!((flux / 1.293e6 - 1.0).abs() < 0.01, "{flux}");
        assert_eq!(stagnation_flux(0.0, 7500.0, 1.0), 0.0);
    }

    #[test]
    fn a_wall_is_warmed_no_further_than_the_air_brought_to_rest() {
        let enthalpy = total_enthalpy(220.0, 900.0);
        assert!((wall_factor(enthalpy, 0.0) - 1.0).abs() < 1e-12);
        assert!(wall_factor(enthalpy, enthalpy / CP_AIR).abs() < 1e-12);
        assert!(wall_factor(enthalpy, 2000.0) < 0.0);
    }

    #[test]
    fn a_heat_sink_takes_what_the_air_gives_it_and_holds_it() {
        // Blunt end first at 2,300 m/s in the air of 45 km (1.97e-3 kg/m^3) for forty seconds: 1.7415e-4 *
        // sqrt(1.97e-3 / 2.032) * 2300^3 is 66 kW/m^2 on the nose; nine tenths of that, less the tenth the warm
        // wall turns away, into 85.6 kJ/(m^2 K) of beryllium is some twenty-five kelvin.
        let mut thermal = Thermal::begin(&HEATING);
        let lie = Lie { airspeed: 2300.0, blunt: 1.0, covered: false };
        for _ in 0..4000 {
            thermal.advance(&HEATING, &air::at(45_000.0), &lie, 0.01);
        }
        assert!((thermal.flux / 66_000.0 - 1.0).abs() < 0.03, "{}", thermal.flux);
        let rise = thermal.surfaces[0] - 300.0;
        assert!(rise > 21.0 && rise < 28.0, "{rise}");
        assert!((thermal.part(&HEATING, 0) - rise / 1260.0).abs() < 1e-9);
        // Riding its booster it is out of the air.
        let mut riding = Thermal::begin(&HEATING);
        riding.advance(&HEATING, &air::at(45_000.0), &Lie { covered: true, ..lie }, 1.0);
        assert!((riding.surfaces[0] - 300.0).abs() < 1e-9);
    }
}
