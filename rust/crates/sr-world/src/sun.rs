//! Where the Sun is, from the instant and the site.
//!
//! The Astronomical Almanac's low-precision formulae (section C, "Low precision formulas for the Sun"): good to
//! 0.01 degrees between 1950 and 2050. The web build reads JPL's DE440 (`pnpm ephemeris`); this is the same Sun to
//! well within what can be seen, and the test holds it to the figures the flight's README states.

use crate::{Instant, Site, V3};

/// The Sun's true bearing and geometric elevation at a site, degrees.
#[must_use]
pub fn bearing_elevation(site: &Site, at: Instant) -> (f64, f64) {
    let n = at.days();
    let mean_longitude = (280.460 + 0.985_647_4 * n).to_radians();
    let anomaly = (357.528 + 0.985_600_3 * n).to_radians();
    let longitude = mean_longitude + (1.915 * anomaly.sin() + 0.020 * (2.0 * anomaly).sin()).to_radians();
    let obliquity = (23.439 - 0.000_000_4 * n).to_radians();
    let right_ascension = (obliquity.cos() * longitude.sin()).atan2(longitude.cos());
    let declination = (obliquity.sin() * longitude.sin()).asin();

    let sidereal = (18.697_374_558 + 24.065_709_824_419_08 * n).rem_euclid(24.0) * 15.0;
    let hour_angle = (sidereal + site.longitude).to_radians() - right_ascension;
    let latitude = site.latitude.to_radians();
    let elevation =
        (latitude.sin() * declination.sin() + latitude.cos() * declination.cos() * hour_angle.cos()).asin();
    let bearing =
        (-hour_angle.sin()).atan2(declination.tan() * latitude.cos() - latitude.sin() * hour_angle.cos());
    (bearing.to_degrees().rem_euclid(360.0), elevation.to_degrees())
}

/// The unit vector toward the Sun in the site's frame.
#[must_use]
pub fn direction(site: &Site, at: Instant) -> V3 {
    let (bearing, elevation) = bearing_elevation(site, at);
    site.toward(bearing, elevation)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_sun_over_complex_5_at_freedom_7s_liftoff() {
        // missions/usa/mercury/flights/mr-3-freedom-7/README.md: azimuth 098.8 true, elevation 50.2 (geometric),
        // computed there from DE440.
        let lc5 = Site { latitude: 28.439426, longitude: -80.573292, height: -27.0, bearing_x: 295.0 };
        let (bearing, elevation) = bearing_elevation(&lc5, Instant::utc(1961, 5, 5, 14, 34, 13.0));
        assert!((bearing - 98.8).abs() < 0.1, "bearing {bearing}");
        assert!((elevation - 50.2).abs() < 0.1, "elevation {elevation}");
    }
}
