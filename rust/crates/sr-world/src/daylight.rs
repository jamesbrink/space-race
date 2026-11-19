//! What light there is on level ground, by the Sun's and the Moon's height: the web build's `daysky.ts`, the
//! published figures only. Documented (docs/sources.md, "The light at night").

use std::f64::consts::PI;

/// What a body at this apparent elevation (degrees) above a clear sky puts on level ground, as a share of what falls
/// square on to it above the air: its beam (`direct`) and the sky it lights (`sky`). Janiczek and De Young, U.S.
/// Naval Observatory Circular 171 (1987), subroutine ATMOS: good down to nautical twilight (-12 degrees).
#[must_use]
pub fn circular(elevation: f64) -> (f64, f64) {
    let ha = elevation.to_radians();
    let u = ha.sin();
    let x = 753.66156;
    let s = (x * ha.cos() / (x + 1.0)).asin();
    let m = x * (s.cos() - u) + s.cos();
    ((-0.21 * m).exp() * u, 0.0289 * (-0.042 * m).exp() * (1.0 + (elevation + 90.0) * u / 57.29577951))
}

/// The Sun's light square on to it above the air, lux (the circular's IS = 133775 M).
const SUN_LUX: f64 = 133_775.0;

/// Light on level ground from the Sun and the sky it lights, lux, by the Sun's apparent elevation (degrees):
/// 124,000 lux overhead, 3 at -6 degrees, 0.004 at -12.
#[must_use]
pub fn sun_lux(elevation: f64) -> f64 {
    let (direct, sky) = circular(elevation);
    SUN_LUX * (direct.max(0.0) + sky).max(0.0)
}

/// The full Moon's light square on to it above the air at its mean distance, lux: Krisciunas and Schaefer, PASP 103
/// (1991) 1033, equation 20 at a phase angle of nothing: 0.313 lux.
pub const FULL_MOON: f64 = 0.312_8;

/// How much of the full Moon's light a Moon at this phase angle (radians, 0 full) gives: fainter by
/// 0.026 |a| + 4e-9 a^4 magnitudes, a in degrees (Krisciunas and Schaefer, equation 20). A quarter Moon gives an
/// eleventh of a full one, not a half.
#[must_use]
pub fn moon_phase(phase_angle: f64) -> f64 {
    let a = phase_angle.to_degrees().abs();
    10f64.powf(-0.4 * (0.026 * a + 4e-9 * a.powi(4)))
}

/// The Moon's light on level ground, lux, at its apparent elevation (degrees) and phase angle (radians): its beam and
/// the sky it lights, through the circular's air as the Sun's are. It rises over its own half degree.
#[must_use]
pub fn moon_lux(elevation: f64, phase_angle: f64) -> f64 {
    let rising = ((elevation + 0.3) / 0.6).clamp(0.0, 1.0);
    let above = FULL_MOON * moon_phase(phase_angle) * rising * rising * (3.0 - 2.0 * rising);
    let (direct, sky) = circular(elevation.max(-0.3));
    above * (direct.max(0.0) + sky.max(0.0))
}

/// What lights level ground on a clear moonless night far from any town, lux: 0.8 millilux, airglow the most of it
/// (U.S. National Park Service, "Metrics Guide to Night Skies"; Duriscoe, PASP 125 (2013) 1370).
pub const NIGHT_LUX: f64 = 8e-4;

/// The natural night sky's luminance at the zenith, cd/m^2: 172 micro-candela (Duriscoe 2013), its mean over the
/// whole sky 1.45 times that (the airglow's layer is looked along toward the horizon).
pub const NIGHT_ZENITH: f64 = 1.72e-4;

/// How far the air lifts a body at this geometric elevation, degrees: Saemundsson's formula (Meeus 16.4) for 10 C
/// and 1010 hPa: 29 arcminutes at the horizon (the observed mean is nearer 34), nothing overhead.
#[must_use]
pub fn refraction(elevation: f64) -> f64 {
    let h = elevation.max(-1.0);
    1.02 / (h + 10.3 / (h + 5.11)).to_radians().tan() / 60.0
}

/// A Lambertian surface of this reflectance under this illuminance, cd/m^2.
#[must_use]
pub fn luminance(lux: f64, reflectance: f64) -> f64 {
    lux * reflectance / PI
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_suns_light_is_usno_circular_171s() {
        // the circular's own figures (tests/heavens.test.mjs): 123,800 overhead, 3.0 at -6, 0.0044 at -12
        assert!((sun_lux(90.0) - 123_800.0).abs() < 100.0);
        assert!((sun_lux(-6.0) - 3.0).abs() < 0.02);
        assert!((sun_lux(-12.0) - 0.0044).abs() < 1e-4);
        let mut last = f64::INFINITY;
        for e in (0..1100).map(|i| 30.0 - f64::from(i) * 0.05) {
            assert!(sun_lux(e) <= last, "no brighter at {e}");
            last = sun_lux(e);
        }
    }

    #[test]
    fn the_moons_light_is_krisciunas_and_schaefers() {
        // full and overhead through the air: 0.29 lux; a quarter Moon (phase angle 90) an eleventh of full
        assert!((moon_lux(90.0, 0.0) - 0.29).abs() < 0.01);
        assert!((moon_phase(90f64.to_radians()) - 0.091).abs() < 0.002);
        assert_eq!(moon_lux(-2.0, 0.0), 0.0);
    }

    #[test]
    fn refraction_as_meeus_has_it() {
        // the formula's own figures: 29 arcminutes at the horizon, a minute at 45 degrees
        assert!((refraction(0.0) * 60.0 - 29.0).abs() < 1.5);
        assert!((refraction(45.0) * 60.0 - 1.0).abs() < 0.05);
    }
}
