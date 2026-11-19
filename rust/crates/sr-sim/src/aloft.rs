//! The air over a site as a day's record has it (`src/world/aloft.ts`, `src/sim/air.ts`): a column of levels read
//! at any height, and the sky a flight flies through made of it.
//!
//! A column's levels are joined as the standard atmosphere joins its layers: the temperature straight in
//! geopotential height between two levels, the pressure along the power law that temperature implies, set so it
//! meets both levels' pressures exactly (exponentially where the temperature does not change). The density is dry
//! air's. The wind is taken straight between levels in its east and north parts. Outside the column the air is
//! the standard's, scaled by the column's density and temperature over the standard's at that end: held below
//! the ground, eased to the standard's own by 70 km above the top, so nothing steps. The wind is held below the
//! lowest level and falls evenly to nothing at the same height.

use sr_measure::Confidence;

use crate::air::{self, Air};

/// Specific gas constant of dry air, J/(kg K), and the ratio of its specific heats.
const R: f64 = 287.053;
const GAMMA: f64 = 1.4;
/// The Earth's radius the standard turns geometric height into geopotential height with, m.
const R0: f64 = 6_356_766.0;
/// Above this height, m, the air is the standard's own and there is no wind.
pub const EASED: f64 = 70_000.0;

/// One level of a column.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Level {
    /// Pressure, Pa.
    pub pressure: f64,
    /// Height above the sea, m (geometric).
    pub height: f64,
    /// Temperature, K.
    pub temperature: f64,
    /// The wind's east and north parts, m/s (the way it blows toward).
    pub wind: [f64; 2],
}

/// A column of air over a site at an hour.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Aloft {
    /// Its levels, rising.
    pub levels: &'static [Level],
    /// How it is known, and from what.
    pub confidence: Confidence,
    /// As `confidence`.
    pub source: &'static str,
}

fn geopotential(height: f64) -> f64 {
    R0 * height / (R0 + height)
}

impl Aloft {
    /// The air and the wind (east, north, m/s) at a height within the column; `None` outside it.
    #[must_use]
    pub fn at(&self, height: f64) -> Option<(Air, [f64; 2])> {
        let (low, top) = (self.levels.first()?, self.levels.last()?);
        if self.levels.len() < 2 || height < low.height || height > top.height {
            return None;
        }
        let k = self.levels.windows(2).position(|pair| pair[1].height >= height)?;
        let (a, b) = (self.levels[k], self.levels[k + 1]);
        let (h1, h2, h) = (geopotential(a.height), geopotential(b.height), geopotential(height));
        let f = if h2 > h1 { (h - h1) / (h2 - h1) } else { 0.0 };
        let temperature = a.temperature + (b.temperature - a.temperature) * f;
        let pressure = if (b.temperature - a.temperature).abs() < 1e-9 * a.temperature {
            a.pressure * (b.pressure / a.pressure).powf(f)
        } else {
            let power = (b.pressure / a.pressure).ln() / (b.temperature / a.temperature).ln();
            a.pressure * (temperature / a.temperature).powf(power)
        };
        let air =
            Air { density: pressure / (R * temperature), pressure, sound: (GAMMA * R * temperature).sqrt() };
        Some((air, [0, 1].map(|i| a.wind[i] + (b.wind[i] - a.wind[i]) * f)))
    }
}

/// The air a flight flies through: the day's column where the flight has one, the standard atmosphere and calm
/// where it has not.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Sky {
    aloft: Option<Aloft>,
}

/// The standard's air scaled by a column's departure from it: its density and temperature each so many times the
/// standard's (the pressure follows by the gas law).
fn scaled(standard: Air, [density, temperature]: [f64; 2]) -> Air {
    Air {
        density: standard.density * density,
        pressure: standard.pressure * density * temperature,
        sound: standard.sound * temperature.sqrt(),
    }
}

impl Sky {
    /// The sky over a flight: its day's column, if it has one.
    #[must_use]
    pub fn of(aloft: Option<Aloft>) -> Self {
        Self { aloft: aloft.filter(|aloft| aloft.levels.len() >= 2) }
    }

    /// The column's density and temperature over the standard's at one of its own heights.
    fn departure(aloft: &Aloft, height: f64) -> [f64; 2] {
        let standard = air::at(height);
        aloft.at(height).map_or([1.0, 1.0], |(day, _)| {
            [day.density / standard.density, (day.sound / standard.sound).powi(2)]
        })
    }

    /// The column's two ends, if there is one.
    fn ends(&self) -> Option<(&Aloft, f64, f64)> {
        let aloft = self.aloft.as_ref()?;
        Some((aloft, aloft.levels.first()?.height, aloft.levels.last()?.height))
    }

    /// The air at a height above the sea, m.
    #[must_use]
    pub fn air(&self, height: f64) -> Air {
        let standard = air::at(height);
        let Some((aloft, low, top)) = self.ends() else { return standard };
        if let Some((day, _)) = aloft.at(height) {
            return day;
        }
        if height < low {
            return scaled(standard, Self::departure(aloft, low));
        }
        if height >= EASED {
            return standard;
        }
        let part = (EASED - height) / (EASED - top);
        scaled(standard, Self::departure(aloft, top).map(|ratio| 1.0 + (ratio - 1.0) * part))
    }

    /// The wind at a height above the sea: its east and north parts, m/s.
    #[must_use]
    pub fn wind(&self, height: f64) -> [f64; 2] {
        let Some((aloft, low, top)) = self.ends() else { return [0.0; 2] };
        if let Some((_, wind)) = aloft.at(height.max(low)) {
            return wind;
        }
        let part = ((EASED - height) / (EASED - top)).clamp(0.0, 1.0);
        aloft.at(top).map_or([0.0; 2], |(_, wind)| wind.map(|speed| speed * part))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The 1976 standard's own layer bases to 47 km, as a column: joined as above it must give the standard back.
    const STANDARD: [Level; 5] = [
        Level { pressure: 101_325.0, height: 0.0, temperature: 288.15, wind: [0.0, 0.0] },
        Level { pressure: 22_632.06, height: 11_019.1, temperature: 216.65, wind: [20.0, 0.0] },
        Level { pressure: 5_474.889, height: 20_063.1, temperature: 216.65, wind: [10.0, -4.0] },
        Level { pressure: 868.0187, height: 32_161.9, temperature: 228.65, wind: [0.0, 0.0] },
        Level { pressure: 110.9063, height: 47_350.1, temperature: 270.65, wind: [6.0, 0.0] },
    ];
    const COLUMN: Aloft = Aloft { levels: &STANDARD, confidence: Confidence::Documented, source: "a test's" };

    #[test]
    fn a_column_of_the_standard_s_own_layers_gives_the_standard_back() {
        let sky = Sky::of(Some(COLUMN));
        for height in [0.0, 1500.0, 9000.0, 11_019.1, 15_000.0, 25_000.0, 40_000.0, 60_000.0, 90_000.0] {
            let (day, standard) = (sky.air(height), air::at(height));
            assert!((day.density / standard.density - 1.0).abs() < 2e-4, "{height}: {day:?} {standard:?}");
            assert!((day.sound / standard.sound - 1.0).abs() < 2e-4, "{height}");
        }
    }

    #[test]
    fn the_wind_is_read_between_levels_held_below_and_gone_far_above() {
        let sky = Sky::of(Some(COLUMN));
        assert_eq!(sky.wind(-50.0), [0.0, 0.0]);
        let mid = sky.wind(15_541.1);
        assert!((mid[0] - 15.0).abs() < 0.01 && (mid[1] + 2.0).abs() < 0.01, "{mid:?}");
        assert_eq!(sky.wind(47_350.1), [6.0, 0.0]);
        let easing = sky.wind(f64::midpoint(47_350.1, EASED));
        assert!((easing[0] - 3.0).abs() < 1e-9, "{easing:?}");
        assert_eq!(sky.wind(80_000.0), [0.0, 0.0]);
        assert_eq!(Sky::of(None).wind(5000.0), [0.0, 0.0]);
    }

    #[test]
    fn a_warm_day_s_air_is_thinner_and_stays_so_just_outside_the_column() {
        let warm: &'static [Level] = &[
            Level { pressure: 101_325.0, height: 0.0, temperature: 298.15, wind: [0.0; 2] },
            Level { pressure: 90_000.0, height: 1030.0, temperature: 291.5, wind: [0.0; 2] },
        ];
        let sky = Sky::of(Some(Aloft { levels: warm, ..COLUMN }));
        let (day, standard) = (sky.air(0.0), air::at(0.0));
        assert!((day.density / standard.density - 288.15 / 298.15).abs() < 1e-6);
        // Above its top the departure eases away; it has not stepped.
        let (just_in, just_out) = (sky.air(1030.0), sky.air(1031.0));
        assert!((just_in.density / just_out.density - 1.0).abs() < 1e-3);
        assert_eq!(sky.air(EASED + 1.0), air::at(EASED + 1.0));
    }
}
