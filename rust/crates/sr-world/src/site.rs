//! A site: a local frame placed on the Earth (`src/world/frames.ts`).
//!
//! The frame is the pad model's: +Y up, +X on the bearing the site gives, +Z a quarter turn clockwise from +X seen
//! from above. Compass directions here are (east, north, up).

use crate::{V3, earth};

/// Where a site is and which way its frame lies.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Site {
    /// Geodetic latitude, degrees north (WGS 84).
    pub latitude: f64,
    /// Longitude, degrees east (WGS 84).
    pub longitude: f64,
    /// Height of the frame's origin above the ellipsoid, m.
    pub height: f64,
    /// The true bearing of the frame's +X, degrees clockwise from north.
    pub bearing_x: f64,
}

impl Site {
    /// A direction given as (east, north, up) in the site's frame.
    #[must_use]
    pub fn from_enu(&self, enu: V3) -> V3 {
        let (s, c) = self.bearing_x.to_radians().sin_cos();
        V3::new(enu.x * s + enu.y * c, enu.z, enu.x * c - enu.y * s)
    }

    /// A direction in the site's frame as (east, north, up).
    #[must_use]
    pub fn to_enu(&self, v: V3) -> V3 {
        let (s, c) = self.bearing_x.to_radians().sin_cos();
        V3::new(v.x * s + v.z * c, v.x * c - v.z * s, v.y)
    }

    /// The unit vector on a true bearing (degrees) at an elevation above the horizon (degrees), in the site's frame.
    #[must_use]
    pub fn toward(&self, bearing: f64, elevation: f64) -> V3 {
        let (sa, ca) = bearing.to_radians().sin_cos();
        let (se, ce) = elevation.to_radians().sin_cos();
        self.from_enu(V3::new(ce * sa, ce * ca, se))
    }

    /// The frame's origin in the Earth-fixed frame, m.
    #[must_use]
    pub fn ecef(&self) -> V3 {
        earth::ecef(self.latitude, self.longitude, self.height)
    }

    /// The origin's distance from the Earth's centre, m: the radius of the sphere the native build stands on.
    #[must_use]
    pub fn radius(&self) -> f64 {
        self.ecef().length()
    }

    /// East, north and up at the site as Earth-fixed unit vectors, for the sphere through the site about the
    /// Earth's centre (up is the geocentric vertical, a sixth of a degree from the plumb line).
    #[must_use]
    pub fn sphere_axes(&self) -> [V3; 3] {
        let up = self.ecef().normalized();
        let east = V3::new(0.0, 0.0, 1.0).cross(up).normalized();
        [east, up.cross(east), up]
    }

    /// An Earth-fixed direction in the site's frame, on that sphere. Its rows are what a shader needs to go the
    /// other way: [`Self::earth_fixed_rows`].
    #[must_use]
    pub fn from_earth_fixed(&self, v: V3) -> V3 {
        let [e, n, u] = self.sphere_axes();
        self.from_enu(V3::new(v.dot(e), v.dot(n), v.dot(u)))
    }

    /// The site frame's +X, +Y and +Z as Earth-fixed unit vectors: the columns that take a direction in the site's
    /// frame to the Earth-fixed one.
    #[must_use]
    pub fn earth_fixed_rows(&self) -> [V3; 3] {
        let [e, n, u] = self.sphere_axes();
        let axis = |v: V3| {
            let enu = self.to_enu(v);
            e * enu.x + n * enu.y + u * enu.z
        };
        [axis(V3::new(1.0, 0.0, 0.0)), axis(V3::Y), axis(V3::new(0.0, 0.0, 1.0))]
    }

    /// The Earth's rotation as a vector in the site's frame, rad/s.
    #[must_use]
    pub fn rotation(&self) -> V3 {
        let (s, c) = self.latitude.to_radians().sin_cos();
        self.from_enu(V3::new(0.0, c, s)) * earth::ROTATION
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const LC5: Site = Site { latitude: 28.439426, longitude: -80.573292, height: -27.0, bearing_x: 295.0 };

    #[test]
    fn the_frame_lies_as_frames_ts_has_it() {
        // +X bears 295, +Z bears 025, +Y is up (src/world/frames.ts siteToEnu).
        let x = LC5.to_enu(V3::new(1.0, 0.0, 0.0));
        assert!((x.x.atan2(x.y).to_degrees().rem_euclid(360.0) - 295.0).abs() < 1e-9);
        let z = LC5.to_enu(V3::new(0.0, 0.0, 1.0));
        assert!((z.x.atan2(z.y).to_degrees() - 25.0).abs() < 1e-9);
        assert_eq!(LC5.to_enu(V3::Y), V3::new(0.0, 0.0, 1.0));
    }

    #[test]
    fn there_and_back() {
        let v = V3::new(0.3, -0.5, 0.8);
        let back = LC5.to_enu(LC5.from_enu(v));
        assert!((back - v).length() < 1e-12);
        let fixed = LC5.earth_fixed_rows();
        let up = LC5.from_earth_fixed(fixed[1]);
        assert!((up - V3::Y).length() < 1e-12);
    }
}
