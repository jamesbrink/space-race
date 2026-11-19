//! The air over Launch Complex 5 at 1961-05-05T15:00Z, the hour nearest Freedom 7's liftoff
//! (`missions/usa/mercury/flights/mr-3-freedom-7/aloft.ts`, written there by `tools/era5-aloft.mjs`: do not edit
//! by hand; bake it again there and bring it across).
//!
//! ERA5's column between the four quarter-degree cells round the pad: each level's pressure, height above the
//! sea, temperature, and the wind's east and north parts, the ground's first.

use sr_measure::Confidence;
use sr_sim::aloft::{Aloft, Level};

const fn level(hpa: f64, height: f64, temperature: f64, east: f64, north: f64) -> Level {
    Level { pressure: hpa * 100.0, height, temperature, wind: [east, north] }
}

const LEVELS: [Level; 38] = [
    level(1022.56, 3.2, 296.76, -3.98, 0.36),
    level(1000.0, 198.2, 294.71, -4.62, 0.7),
    level(975.0, 417.9, 293.13, -4.14, 0.67),
    level(950.0, 642.2, 292.07, -3.49, 0.98),
    level(925.0, 871.4, 290.87, -2.83, 1.19),
    level(900.0, 1105.8, 289.53, -2.36, 1.08),
    level(875.0, 1345.6, 288.25, -2.09, 0.59),
    level(850.0, 1591.0, 286.93, -2.0, 0.03),
    level(825.0, 1842.5, 285.56, -1.86, -0.07),
    level(800.0, 2100.1, 284.01, -1.47, 0.04),
    level(775.0, 2364.5, 282.59, -0.82, -0.45),
    level(750.0, 2635.9, 281.07, -0.22, -1.48),
    level(700.0, 3201.4, 277.42, -0.52, -2.09),
    level(650.0, 3800.6, 273.62, -1.26, -2.35),
    level(600.0, 4438.6, 269.7, -1.82, -3.2),
    level(550.0, 5122.3, 266.17, 0.02, -3.23),
    level(500.0, 5860.3, 261.59, 1.82, -3.5),
    level(450.0, 6659.6, 255.52, 4.94, -3.27),
    level(400.0, 7530.7, 248.54, 5.5, -2.97),
    level(350.0, 8489.3, 241.03, 4.69, -0.19),
    level(300.0, 9563.0, 233.08, 9.3, -3.66),
    level(250.0, 10785.0, 223.68, 11.17, -2.19),
    level(225.0, 11469.7, 218.92, 12.27, -3.31),
    level(200.0, 12219.4, 214.51, 13.98, -3.67),
    level(175.0, 13054.6, 211.99, 16.38, -4.09),
    level(150.0, 14016.9, 212.83, 25.48, -9.2),
    level(125.0, 15154.9, 210.8, 26.75, -8.96),
    level(100.0, 16521.4, 205.69, 15.23, -11.16),
    level(70.0, 18646.3, 203.51, 5.33, -8.65),
    level(50.0, 20708.1, 212.71, -1.74, -2.07),
    level(30.0, 23959.6, 219.03, -4.5, -1.78),
    level(20.0, 26597.5, 222.81, -4.67, -0.66),
    level(10.0, 31290.0, 234.43, 3.67, 3.99),
    level(7.0, 33781.5, 238.98, 5.87, 5.78),
    level(5.0, 36191.0, 245.57, 11.57, 4.78),
    level(3.0, 40002.9, 258.16, 11.53, -12.44),
    level(2.0, 43188.1, 270.26, -5.19, -10.6),
    level(1.0, 48787.9, 272.23, -5.09, -1.1),
];

/// The day's column.
pub const ALOFT: Aloft = Aloft {
    levels: &LEVELS,
    confidence: Confidence::Derived,
    source: "ECMWF ERA5 hourly data on pressure levels and single levels (Hersbach et al. 2020, \
             doi:10.24381/cds.bd0915c6 and doi:10.24381/cds.adbb2d47), from the ARCO-ERA5 copy (Carver and Merose \
             2023), between the four quarter-degree cells round the pad: a reanalysis, not a sounding",
};
