//! The Moon and the Sun seen from a site: where, how far, and how much of the Moon is lit
//! (`src/world/ephemeris.ts`, `meeusMoon` and `meeusSun`).
//!
//! Meeus, Astronomical Algorithms (2nd ed.), chapter 47 (the Moon: the main terms of Chapront's ELP-2000/82, good to
//! about 10 arcseconds in longitude) and chapter 25 (the Sun, to 0.01 degrees), on the true equator of date, turned
//! to the site by the sidereal time and seen from the site itself: the Moon's parallax is up to a degree. The web
//! build reads JPL's DE440 when it has it and falls back to these; its tests hold these to JPL Horizons within
//! 0.02 degrees for the Moon.

use crate::precession::{centuries, date_to_earth, from_site, mean_obliquity, nutation};
use crate::{Instant, Site, V3};

/// The Moon's mean radius, m (IAU; the web build's `MOON_RADIUS`).
pub const RADIUS: f64 = 1_737_400.0;
/// The astronomical unit, m (IAU 2012).
const AU: f64 = 149_597_870_700.0;

/// The Moon's periodic terms (Meeus table 47.A): multiples of D, M, M' and F, then the sine coefficient for
/// longitude (1e-6 degree) and the cosine coefficient for distance (m).
const LR: [[f64; 6]; 32] = [
    [0.0, 0.0, 1.0, 0.0, 6288774.0, -20905355.0],
    [2.0, 0.0, -1.0, 0.0, 1274027.0, -3699111.0],
    [2.0, 0.0, 0.0, 0.0, 658314.0, -2955968.0],
    [0.0, 0.0, 2.0, 0.0, 213618.0, -569925.0],
    [0.0, 1.0, 0.0, 0.0, -185116.0, 48888.0],
    [0.0, 0.0, 0.0, 2.0, -114332.0, -3149.0],
    [2.0, 0.0, -2.0, 0.0, 58793.0, 246158.0],
    [2.0, -1.0, -1.0, 0.0, 57066.0, -152138.0],
    [2.0, 0.0, 1.0, 0.0, 53322.0, -170733.0],
    [2.0, -1.0, 0.0, 0.0, 45758.0, -204586.0],
    [0.0, 1.0, -1.0, 0.0, -40923.0, -129620.0],
    [1.0, 0.0, 0.0, 0.0, -34720.0, 108743.0],
    [0.0, 1.0, 1.0, 0.0, -30383.0, 104755.0],
    [2.0, 0.0, 0.0, -2.0, 15327.0, 10321.0],
    [0.0, 0.0, 1.0, 2.0, -12528.0, 0.0],
    [0.0, 0.0, 1.0, -2.0, 10980.0, 79661.0],
    [4.0, 0.0, -1.0, 0.0, 10675.0, -34782.0],
    [0.0, 0.0, 3.0, 0.0, 10034.0, -23210.0],
    [4.0, 0.0, -2.0, 0.0, 8548.0, -21636.0],
    [2.0, 1.0, -1.0, 0.0, -7888.0, 24208.0],
    [2.0, 1.0, 0.0, 0.0, -6766.0, 30824.0],
    [1.0, 0.0, -1.0, 0.0, -5163.0, -8379.0],
    [1.0, 1.0, 0.0, 0.0, 4987.0, -16675.0],
    [2.0, -1.0, 1.0, 0.0, 4036.0, -12831.0],
    [2.0, 0.0, 2.0, 0.0, 3994.0, -10445.0],
    [4.0, 0.0, 0.0, 0.0, 3861.0, -11650.0],
    [2.0, 0.0, -3.0, 0.0, 3665.0, 14403.0],
    [0.0, 1.0, -2.0, 0.0, -2689.0, -7003.0],
    [2.0, 0.0, -1.0, 2.0, -2602.0, 0.0],
    [2.0, -1.0, -2.0, 0.0, 2390.0, 10056.0],
    [1.0, 0.0, 1.0, 0.0, -2348.0, 6322.0],
    [2.0, -2.0, 0.0, 0.0, 2236.0, -9884.0],
];

/// And for latitude (Meeus table 47.B): multiples of D, M, M' and F, then the sine coefficient (1e-6 degree).
const B: [[f64; 5]; 30] = [
    [0.0, 0.0, 0.0, 1.0, 5128122.0],
    [0.0, 0.0, 1.0, 1.0, 280602.0],
    [0.0, 0.0, 1.0, -1.0, 277693.0],
    [2.0, 0.0, 0.0, -1.0, 173237.0],
    [2.0, 0.0, -1.0, 1.0, 55413.0],
    [2.0, 0.0, -1.0, -1.0, 46271.0],
    [2.0, 0.0, 0.0, 1.0, 32573.0],
    [0.0, 0.0, 2.0, 1.0, 17198.0],
    [2.0, 0.0, 1.0, -1.0, 9266.0],
    [0.0, 0.0, 2.0, -1.0, 8822.0],
    [2.0, -1.0, 0.0, -1.0, 8216.0],
    [2.0, 0.0, -2.0, -1.0, 4324.0],
    [2.0, 0.0, 1.0, 1.0, 4200.0],
    [2.0, 1.0, 0.0, -1.0, -3359.0],
    [2.0, -1.0, -1.0, 1.0, 2463.0],
    [2.0, -1.0, 0.0, 1.0, 2211.0],
    [2.0, -1.0, -1.0, -1.0, 2065.0],
    [0.0, 1.0, -1.0, -1.0, -1870.0],
    [4.0, 0.0, -1.0, -1.0, 1828.0],
    [0.0, 1.0, 0.0, 1.0, -1794.0],
    [0.0, 0.0, 0.0, 3.0, -1749.0],
    [0.0, 1.0, -1.0, 1.0, -1565.0],
    [1.0, 0.0, 0.0, 1.0, -1491.0],
    [0.0, 1.0, 1.0, 1.0, -1475.0],
    [0.0, 1.0, 1.0, -1.0, -1410.0],
    [0.0, 1.0, 0.0, -1.0, -1344.0],
    [1.0, 0.0, 0.0, -1.0, -1335.0],
    [0.0, 0.0, 3.0, 1.0, 1107.0],
    [4.0, 0.0, 0.0, -1.0, 1021.0],
    [4.0, 0.0, -1.0, 1.0, 833.0],
];

fn sind(degrees: f64) -> f64 {
    degrees.to_radians().sin()
}

fn cosd(degrees: f64) -> f64 {
    degrees.to_radians().cos()
}

/// Ecliptic longitude and latitude (radians, true equinox of date) and a distance, as a vector on the true equator
/// of date.
fn from_ecliptic(longitude: f64, latitude: f64, distance: f64, obliquity: f64) -> V3 {
    let (sb, cb) = latitude.sin_cos();
    let (sl, cl) = longitude.sin_cos();
    let (se, ce) = obliquity.sin_cos();
    let (x, y, z) = (cb * cl, cb * sl, sb);
    V3::new(x, y * ce - z * se, y * se + z * ce) * distance
}

/// The Moon's centre from the Earth's, m, on the true equator and equinox of date (Meeus chapter 47).
#[must_use]
pub fn geocentric(t: f64) -> V3 {
    let poly = |c: [f64; 5]| c[0] + c[1] * t + c[2] * t * t + c[3] * t.powi(3) + c[4] * t.powi(4);
    let l = poly([218.3164477, 481267.88123421, -0.0015786, 1.0 / 538841.0, -1.0 / 65194000.0]);
    let d = poly([297.8501921, 445267.1114034, -0.0018819, 1.0 / 545868.0, -1.0 / 113065000.0]);
    let m = poly([357.5291092, 35999.0502909, -0.0001536, 1.0 / 24490000.0, 0.0]);
    let mp = poly([134.9633964, 477198.8675055, 0.0087414, 1.0 / 69699.0, -1.0 / 14712000.0]);
    let f = poly([93.272095, 483202.0175233, -0.0036539, -1.0 / 3526000.0, 1.0 / 863310000.0]);
    let (a1, a2, a3) = (119.75 + 131.849 * t, 53.09 + 479264.29 * t, 313.45 + 481266.484 * t);
    // (terms in the Sun's anomaly shrink as the Earth's orbit grows rounder)
    let e = 1.0 - 0.002516 * t - 0.0000074 * t * t;
    let fade = |k: f64| e.powi(k.abs() as i32);
    let mut sl = 3958.0 * sind(a1) + 1962.0 * sind(l - f) + 318.0 * sind(a2);
    let mut sr = 0.0;
    for [kd, km, kmp, kf, lon, dist] in LR {
        let arg = kd * d + km * m + kmp * mp + kf * f;
        sl += lon * fade(km) * sind(arg);
        sr += dist * fade(km) * cosd(arg);
    }
    let mut sb = -2235.0 * sind(l)
        + 382.0 * sind(a3)
        + 175.0 * sind(a1 - f)
        + 175.0 * sind(a1 + f)
        + 127.0 * sind(l - mp)
        - 115.0 * sind(l + mp);
    for [kd, km, kmp, kf, lat] in B {
        sb += lat * fade(km) * sind(kd * d + km * m + kmp * mp + kf * f);
    }
    let (dpsi, deps) = nutation(t);
    let longitude = (l + sl / 1e6).to_radians() + dpsi;
    from_ecliptic(longitude, (sb / 1e6).to_radians(), 385_000_560.0 + sr, mean_obliquity(t) + deps)
}

/// The Sun's centre from the Earth's, m, on the true equator and equinox of date, apparent (Meeus chapter 25).
#[must_use]
pub fn sun_geocentric(t: f64) -> V3 {
    let l0 = 280.46646 + 36000.76983 * t + 0.0003032 * t * t;
    let m = 357.52911 + 35999.05029 * t - 0.0001537 * t * t;
    let e = 0.016708634 - 0.000042037 * t - 0.0000001267 * t * t;
    let centre = (1.914602 - 0.004817 * t - 0.000014 * t * t) * sind(m)
        + (0.019993 - 0.000101 * t) * sind(2.0 * m)
        + 0.000289 * sind(3.0 * m);
    let r = 1.000001018 * (1.0 - e * e) / (1.0 + e * cosd(m + centre));
    let (dpsi, deps) = nutation(t);
    // (aberration: the Sun is seen 20.5 arcseconds behind where it is)
    let longitude = (l0 + centre - 0.005_691_6 / r).to_radians() + dpsi;
    from_ecliptic(longitude, 0.0, r * AU, mean_obliquity(t) + deps)
}

/// The Moon as a site sees it at an instant.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MoonSeen {
    /// The unit vector toward its centre, in the site's frame, geometric (no refraction).
    pub direction: V3,
    /// From the site to its centre, m.
    pub distance: f64,
    /// How much of its disc is lit, 0 to 1.
    pub lit: f64,
    /// The angle at the Moon between the Earth and the Sun, radians: 0 full.
    pub phase_angle: f64,
    /// The unit vector toward the Sun, in the site's frame: what lights it.
    pub sun: V3,
}

impl MoonSeen {
    /// Half the angle it fills, radians.
    #[must_use]
    pub fn angular_radius(&self) -> f64 {
        (RADIUS / self.distance).asin()
    }
}

/// Where the Moon is over a site at an instant, and its phase.
#[must_use]
pub fn seen(site: &Site, at: Instant) -> MoonSeen {
    let t = centuries(at);
    let (moon, sun) = (geocentric(t), sun_geocentric(t));
    let (direction, distance) = from_site(site, date_to_earth(moon, at));
    let (sun_dir, sun_distance) = from_site(site, date_to_earth(sun, at));
    // the phase angle as the site sees it: at the Moon, between the site and the Sun
    let (to_site, to_sun) = (-direction, sun_dir * sun_distance - direction * distance);
    let phase_angle = to_site.cross(to_sun).length().atan2(to_site.dot(to_sun));
    MoonSeen { direction, distance, lit: f64::midpoint(1.0, phase_angle.cos()), phase_angle, sun: sun_dir }
}

#[cfg(test)]
mod tests {
    use super::*;

    const LC5: Site = Site { latitude: 28.439426, longitude: -80.573292, height: -27.0, bearing_x: 295.0 };

    #[test]
    fn meeus_example_47_a() {
        // 1992 April 12, 0h TD: right ascension 134.688470, declination 13.768368, 368,409.7 km.
        let t = (2448724.5 - 2451545.0) / 36525.0;
        let moon = geocentric(t);
        let ra = moon.y.atan2(moon.x).to_degrees().rem_euclid(360.0);
        let dec = (moon.z / moon.length()).asin().to_degrees();
        assert!((ra - 134.68847).abs() < 0.003, "{ra}");
        assert!((dec - 13.768368).abs() < 0.003, "{dec}");
        assert!((moon.length() / 1000.0 - 368409.7).abs() < 30.0);
    }

    #[test]
    fn the_moon_over_complex_5_at_liftoff_against_horizons() {
        // JPL Horizons (tests/world.test.mjs): azimuth 245.226747, elevation 4.604129 (no refraction), 73.57741 %
        // lit, waning.
        let moon = seen(&LC5, Instant::utc(1961, 5, 5, 14, 34, 13.0));
        let enu = LC5.to_enu(moon.direction);
        let azimuth = enu.x.atan2(enu.y).to_degrees().rem_euclid(360.0);
        let elevation = enu.z.asin().to_degrees();
        assert!((azimuth - 245.226747).abs() < 0.02, "azimuth {azimuth}");
        assert!((elevation - 4.604129).abs() < 0.02, "elevation {elevation}");
        assert!((moon.lit * 100.0 - 73.57741).abs() < 0.05, "lit {}", moon.lit);
        // its true size: 1941.28 arcseconds across (Horizons)
        assert!((moon.angular_radius().to_degrees() * 7200.0 - 1941.28).abs() < 3.0);
    }

    #[test]
    fn a_waning_moon_rises_after_midnight() {
        // 5 May 1961, 22:00 EST: the waning Moon is not yet up (tests/heavens.test.mjs).
        let moon = seen(&LC5, Instant::utc(1961, 5, 6, 3, 0, 0.0));
        assert!(moon.direction.y < 0.0);
    }
}
