//! The Earth's figure and field (`src/world/bodies.ts`).

use crate::V3;

/// WGS 84 equatorial radius, m.
pub const A: f64 = 6_378_137.0;
/// WGS 84 flattening.
pub const F: f64 = 1.0 / 298.257_223_563;
/// Gravitational parameter, m^3/s^2 (WGS 84, with the atmosphere).
pub const GM: f64 = 3.986_004_418e14;
/// Rotation rate, rad/s (WGS 84).
pub const ROTATION: f64 = 7.292_115e-5;
/// Standard gravity, m/s^2: what a pound-force and a second of specific impulse are defined by.
pub const G0: f64 = 9.806_65;

/// A point given by geodetic latitude and longitude (degrees) and height above the ellipsoid (m), in the
/// Earth-fixed frame: +Z the pole, +X the Greenwich meridian on the equator.
#[must_use]
pub fn ecef(latitude: f64, longitude: f64, height: f64) -> V3 {
    let (lat, lon) = (latitude.to_radians(), longitude.to_radians());
    let e2 = F * (2.0 - F);
    let n = A / (1.0 - e2 * lat.sin().powi(2)).sqrt();
    V3::new(
        (n + height) * lat.cos() * lon.cos(),
        (n + height) * lat.cos() * lon.sin(),
        (n * (1.0 - e2) + height) * lat.sin(),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_ellipsoid_has_its_published_axes() {
        assert!((ecef(0.0, 0.0, 0.0).x - A).abs() < 1e-6);
        // The polar radius WGS 84 derives: 6,356,752.3142 m.
        assert!((ecef(90.0, 0.0, 0.0).z - 6_356_752.3142).abs() < 1e-3);
    }
}
