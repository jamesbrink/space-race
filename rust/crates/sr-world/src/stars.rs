//! The stars: the Yale Bright Star Catalogue, 5th revised edition (Hoffleit and Warren 1991; CDS V/50, public
//! domain), all 9,096 stars to magnitude 6.5 and a little past, as the web build bakes it (`public/sky/stars.bin`,
//! `tools/stars.mjs`; `src/world/stars.ts`).
//!
//! Six little-endian float32 a star, brightest first: right ascension and declination (degrees, equinox and epoch
//! J2000), visual magnitude, B-V colour index, and the proper motion a year in right ascension (on the sky: times
//! the cosine of the declination) and in declination, arcseconds. A star's place at a date is its catalogue place
//! carried along its proper motion, then turned by [`crate::precession::j2000_to_site`]. Left out, as the web build
//! leaves them: aberration (up to 0.006 degrees, the same for stars near each other), parallax and the change of a
//! proper motion over time. So a star is where it was to about 0.01 degrees.

use crate::{Instant, V3};

/// The catalogue as the web build bakes it.
pub const CATALOGUE: &[u8] = include_bytes!("../../../../public/sky/stars.bin");

/// Numbers to a star in [`CATALOGUE`].
const STRIDE: usize = 6;

/// One star as the catalogue gives it.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Star {
    /// Right ascension, degrees, J2000.
    pub ra: f64,
    /// Declination, degrees, J2000.
    pub dec: f64,
    /// Visual magnitude.
    pub magnitude: f64,
    /// B-V colour index: 0 white, negative blue, 1.5 orange-red.
    pub colour: f64,
    /// Proper motion a year in right ascension (on the sky) and declination, arcseconds.
    pub motion: [f64; 2],
}

impl Star {
    /// The unit vector toward the star in J2000, `years` after 2000.0 (before it: negative).
    #[must_use]
    pub fn direction(&self, years: f64) -> V3 {
        let (sa, ca) = self.ra.to_radians().sin_cos();
        let (sd, cd) = self.dec.to_radians().sin_cos();
        let arcsec = 1.0_f64.to_radians() / 3600.0;
        let (a, d) = (self.motion[0] * arcsec, self.motion[1] * arcsec);
        let moved = V3::new(-sa * a - ca * sd * d, ca * a - sa * sd * d, cd * d);
        (V3::new(ca * cd, sa * cd, sd) + moved * years).normalized()
    }
}

/// Every star in a catalogue laid out as [`CATALOGUE`] is.
#[must_use]
pub fn read(bytes: &[u8]) -> Vec<Star> {
    let (stars, _) = bytes.as_chunks::<{ 4 * STRIDE }>();
    stars
        .iter()
        .map(|star| {
            let (words, _) = star.as_chunks::<4>();
            let n: Vec<f64> = words.iter().map(|w| f64::from(f32::from_le_bytes(*w))).collect();
            Star { ra: n[0], dec: n[1], magnitude: n[2], colour: n[3], motion: [n[4], n[5]] }
        })
        .collect()
}

/// Years from 2000.0 to an instant: what a proper motion is multiplied by.
#[must_use]
pub fn years_from_2000(at: Instant) -> f64 {
    at.days() / 365.25
}

/// The illuminance a star of this visual magnitude puts square on to it above the air, lux: a zeroth-magnitude
/// star gives 2.54 micro-lux (Allen's Astrophysical Quantities, 4th ed., section 15.2: 2.54e-6 lux at V = 0).
#[must_use]
pub fn lux(magnitude: f64) -> f64 {
    2.54e-6 * 10f64.powf(-0.4 * magnitude)
}

/// A star's colour as linear red, green and blue of unit luminance, from its B-V index: its temperature by
/// Ballesteros's formula (EPL 97, 2012, 34008), then a black body of that temperature seen through the CIE eye
/// (Planckian locus fitted by Kim et al. 2002), white-balanced to daylight (6500 K is white).
#[must_use]
pub fn colour(b_v: f64) -> [f64; 3] {
    let bv = b_v.clamp(-0.4, 2.0);
    let kelvin = 4600.0 * (1.0 / (0.92 * bv + 1.7) + 1.0 / (0.92 * bv + 0.62));
    let (x, y) = locus(kelvin.clamp(1667.0, 25000.0));
    // CIE xyY (Y = 1) to linear sRGB
    let (cx, cz) = (x / y, (1.0 - x - y) / y);
    let r = 3.2406 * cx - 1.5372 - 0.4986 * cz;
    let g = -0.9689 * cx + 1.8758 + 0.0415 * cz;
    let b = 0.0557 * cx - 0.2040 + 1.0570 * cz;
    let rgb = [r.max(0.0), g.max(0.0), b.max(0.0)];
    let luma = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
    rgb.map(|c| c / luma.max(1e-6))
}

/// The CIE 1931 chromaticity of a black body, Kim et al.'s cubic fit (US patent 7,024,034), 1667 K to 25000 K.
fn locus(t: f64) -> (f64, f64) {
    let (t1, t2, t3) = (1e3 / t, 1e6 / (t * t), 1e9 / (t * t * t));
    let x = if t <= 4000.0 {
        -0.2661239 * t3 - 0.2343589 * t2 + 0.8776956 * t1 + 0.179910
    } else {
        -3.0258469 * t3 + 2.1070379 * t2 + 0.2226347 * t1 + 0.240390
    };
    let y = if t <= 2222.0 {
        -1.1063814 * x.powi(3) - 1.34811020 * x * x + 2.18555832 * x - 0.20219683
    } else if t <= 4000.0 {
        -0.9549476 * x.powi(3) - 1.37418593 * x * x + 2.09137015 * x - 0.16748867
    } else {
        3.0817580 * x.powi(3) - 5.87338670 * x * x + 3.75112997 * x - 0.37001483
    };
    (x, y)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::Site;
    use crate::precession::{apply, j2000_to_site};

    const LC5: Site = Site { latitude: 28.439426, longitude: -80.573292, height: -27.0, bearing_x: 295.0 };

    /// tests/world.test.mjs: where seven bright stars stood over Launch Complex 5 at Freedom 7's liftoff (azimuth,
    /// elevation, degrees, no refraction), by the IAU's own routines (ERFA 2.0 `atci13` from Hipparcos places, then
    /// the Earth Rotation Angle), UT taken as UT1 and TT 33.6 s ahead of it: an independent chain.
    const AT_LIFTOFF: [(&str, f64, f64, f64, f64); 7] = [
        ("Sirius", 101.28715533, -16.71611586, 100.5385, -16.1302),
        ("Arcturus", 213.91530029, 19.18240916, 323.1339, -32.9068),
        ("Alpha Centauri A", 219.90205833, -60.83399269, 207.3782, -48.969),
        ("Vega", 279.23473479, 38.78368896, 302.9266, 22.9555),
        ("Polaris", 37.95456067, 89.26410897, 0.4903, 29.2522),
        ("Canopus", 95.98795783, -52.69566138, 138.2171, -24.9064),
        ("Capella", 79.17232794, 45.99799147, 50.4955, 28.5096),
    ];

    #[test]
    fn the_whole_catalogue_is_there_brightest_first() {
        let stars = read(CATALOGUE);
        assert_eq!(stars.len(), 9096);
        assert!((stars[0].magnitude + 1.46).abs() < 1e-3, "Sirius first");
        let to_6_5 = stars.iter().filter(|s| s.magnitude <= 6.5).count();
        assert!((8300..8500).contains(&to_6_5), "{to_6_5} to 6.5");
    }

    #[test]
    fn the_stars_at_liftoff_are_where_the_iaus_routines_put_them() {
        let at = Instant::utc(1961, 5, 5, 14, 34, 13.0);
        let m = j2000_to_site(&LC5, at);
        let years = years_from_2000(at);
        let stars = read(CATALOGUE);
        for (name, ra, dec, azimuth, elevation) in AT_LIFTOFF {
            let toward = Star { ra, dec, magnitude: 0.0, colour: 0.0, motion: [0.0; 2] }.direction(0.0);
            let star = stars
                .iter()
                .min_by(|a, b| {
                    let off = |s: &Star| -s.direction(0.0).dot(toward);
                    off(a).total_cmp(&off(b))
                })
                .copied();
            let Some(star) = star else { continue };
            let ours = apply(&m, star.direction(years));
            let theirs = LC5.toward(azimuth, elevation);
            let apart = ours.cross(theirs).length().atan2(ours.dot(theirs)).to_degrees();
            assert!(apart < 0.012, "{name}: {apart} degrees out");
        }
    }

    #[test]
    fn a_star_is_carried_along_its_proper_motion() {
        // Alpha Centauri A: 3.709 arcseconds a year, 0.04 degrees between 1961 and 2000.
        let star = read(CATALOGUE).into_iter().find(|s| (s.ra - 219.9).abs() < 1e-3 && s.magnitude < 0.0);
        assert!(star.is_some(), "Alpha Centauri A is in the catalogue");
        let Some(star) = star else { return };
        let (then, now) = (star.direction(-38.66), star.direction(0.0));
        let apart = then.cross(now).length().atan2(then.dot(now)).to_degrees();
        assert!((apart - 3.709 * 38.66 / 3600.0).abs() < 2e-4, "{apart}");
    }

    #[test]
    fn colours_run_blue_to_red() {
        let (blue, sun, red) = (colour(-0.3), colour(0.65), colour(1.8));
        assert!(blue[2] > blue[0] && red[0] > red[2]);
        assert!((sun[0] - sun[2]).abs() < 0.6, "the Sun's colour index is nearly white: {sun:?}");
    }
}
