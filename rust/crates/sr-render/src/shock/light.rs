//! The light of a hot body: Planck's law weighed by the eye, so a glow is as bright and as coloured as its
//! temperature makes it.
//!
//! The colour-matching functions are Wyman, Sloan and Shirley's fit to the CIE 1931 observer (Simple Analytic
//! Approximations to the CIE XYZ Color Matching Functions, JCGT 2(2), 2013, the multi-lobe fit), summed every
//! 5 nm from 380 to 780 nm.

use bevy::math::Vec3;

/// Planck's constant, J s; the speed of light, m/s; Boltzmann's constant, J/K (SI, exact).
const H: f64 = 6.626_070_15e-34;
const C: f64 = 299_792_458.0;
const K: f64 = 1.380_649e-23;
/// Lumens to a watt at the eye's peak (the SI's definition of the candela).
const KM: f64 = 683.0;

/// A piecewise Gaussian: `s1` wide below its middle, `s2` above.
fn lobe(x: f64, middle: f64, s1: f64, s2: f64) -> f64 {
    let s = if x < middle { s1 } else { s2 };
    (-0.5 * ((x - middle) / s).powi(2)).exp()
}

/// The CIE 1931 observer at a wavelength in nanometres.
fn observer(nm: f64) -> [f64; 3] {
    [
        1.056 * lobe(nm, 599.8, 37.9, 31.0) + 0.362 * lobe(nm, 442.0, 16.0, 26.7)
            - 0.065 * lobe(nm, 501.1, 20.4, 26.2),
        0.821 * lobe(nm, 568.8, 46.9, 40.5) + 0.286 * lobe(nm, 530.9, 16.3, 31.1),
        1.217 * lobe(nm, 437.0, 11.8, 36.0) + 0.681 * lobe(nm, 459.0, 26.0, 13.8),
    ]
}

/// A black body at `kelvin`: its colour in linear sRGB, scaled so its luminance is one, and its luminance, cd/m^2.
#[must_use]
pub fn blackbody(kelvin: f32) -> (Vec3, f32) {
    let t = f64::from(kelvin.max(300.0));
    let mut xyz = [0.0_f64; 3];
    for step in 0..80 {
        let nm = 382.5 + 5.0 * f64::from(step);
        let metres = nm * 1.0e-9;
        let radiance = 2.0 * H * C * C / metres.powi(5) / ((H * C / (metres * K * t)).exp() - 1.0);
        for (sum, weight) in xyz.iter_mut().zip(observer(nm)) {
            *sum += KM * radiance * weight * 5.0e-9;
        }
    }
    let [x, y, z] = xyz;
    let rgb = Vec3::new(
        (3.2406 * x - 1.5372 * y - 0.4986 * z) as f32,
        (-0.9689 * x + 1.8758 * y + 0.0415 * z) as f32,
        (0.0557 * x - 0.2040 * y + 1.0570 * z) as f32,
    )
    .max(Vec3::ZERO);
    let luminance = y as f32;
    let seen = rgb.dot(Vec3::new(0.2126, 0.7152, 0.0722)).max(f32::MIN_POSITIVE);
    (rgb / seen, luminance)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn platinum_freezing_is_sixty_candela_a_square_centimetre() {
        // (the candela's definition from 1948 to 1979: a black body at the freezing point of platinum, 2,042 K)
        let (_, luminance) = blackbody(2042.0);
        assert!((luminance / 6.0e5 - 1.0).abs() < 0.03, "{luminance}");
    }

    #[test]
    fn a_cool_glow_is_red_and_a_hot_one_white() {
        let (dull, _) = blackbody(1000.0);
        assert!(dull.x > 5.0 * dull.y && dull.z < 0.01, "{dull}");
        let (daylight, _) = blackbody(6500.0);
        assert!((daylight.x / daylight.z - 1.0).abs() < 0.15, "{daylight}");
        assert!(blackbody(800.0).1 < 0.1 && blackbody(2500.0).1 > 1.0e6);
    }
}
