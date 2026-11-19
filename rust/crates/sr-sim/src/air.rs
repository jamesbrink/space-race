//! The air: the U.S. Standard Atmosphere, 1976, to 86 km, and an exponential tail above it.
//!
//! The web build flies each flight through its own day's ERA5 column (`aloft.ts`); this build flies the standard
//! day, which `rust/README.md` lists among what is simplified.

/// Sea-level pressure, Pa.
pub const P0: f64 = 101_325.0;
/// Specific gas constant of dry air, J/(kg K).
const R: f64 = 287.053;
/// Ratio of specific heats.
const GAMMA: f64 = 1.4;
/// Standard gravity, m/s^2, and the Earth's radius the standard takes for geopotential height, m.
const G0: f64 = 9.806_65;
const EARTH: f64 = 6_356_766.0;
/// Where the tables stop, m (geometric), and the scale height taken above, m.
const TOP: f64 = 86_000.0;
const TAIL: f64 = 6_500.0;

/// Each layer's base (geopotential m) and lapse rate (K/m).
const LAYERS: [(f64, f64); 7] = [
    (0.0, -0.0065),
    (11_000.0, 0.0),
    (20_000.0, 0.001),
    (32_000.0, 0.0028),
    (47_000.0, 0.0),
    (51_000.0, -0.0028),
    (71_000.0, -0.002),
];

/// The air at a height.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Air {
    /// Density, kg/m^3.
    pub density: f64,
    /// Pressure, Pa.
    pub pressure: f64,
    /// Speed of sound, m/s.
    pub sound: f64,
}

/// The standard air at a geometric height above sea level, m. Below sea level it is the sea-level air.
#[must_use]
pub fn at(height: f64) -> Air {
    let z = height.clamp(0.0, TOP);
    let h = EARTH * z / (EARTH + z);
    let (mut temperature, mut pressure) = (288.15, P0);
    for (i, &(base, lapse)) in LAYERS.iter().enumerate() {
        let top = LAYERS.get(i + 1).map_or(f64::INFINITY, |next| next.0);
        let dh = h.min(top) - base;
        if dh <= 0.0 {
            break;
        }
        if lapse == 0.0 {
            pressure *= (-G0 * dh / (R * temperature)).exp();
        } else {
            let next = temperature + lapse * dh;
            pressure *= (temperature / next).powf(G0 / (R * lapse));
            temperature = next;
        }
    }
    let thin = if height > TOP { (-(height - TOP) / TAIL).exp() } else { 1.0 };
    Air {
        density: pressure / (R * temperature) * thin,
        pressure: pressure * thin,
        sound: (GAMMA * R * temperature).sqrt(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// U.S. Standard Atmosphere, 1976, Table I, at geopotential heights (converted to geometric here).
    #[test]
    fn the_standard_atmosphere_as_tabulated() {
        let geometric = |h: f64| EARTH * h / (EARTH - h);
        let sea = at(0.0);
        assert!((sea.density - 1.225).abs() < 1e-4);
        assert!((sea.sound - 340.29).abs() < 0.01);
        let tropopause = at(geometric(11_000.0));
        assert!((tropopause.pressure - 22_632.0).abs() < 1.0);
        assert!((tropopause.density - 0.363_92).abs() < 1e-4);
        let at_20 = at(geometric(20_000.0));
        assert!((at_20.pressure - 5_474.9).abs() < 0.5);
        let at_47 = at(geometric(47_000.0));
        assert!((at_47.pressure - 110.91).abs() < 0.05);
    }

    #[test]
    fn it_thins_without_a_step_at_the_top() {
        assert!((at(85_999.0).density / at(86_001.0).density - 1.0).abs() < 1e-3);
        assert!(at(187_000.0).density < 1e-10);
    }
}
