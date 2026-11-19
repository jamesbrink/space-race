//! Where a flight happens: a site's frame on a turning, attracting sphere.
//!
//! Positions and velocities are in the site's frame, which turns with the Earth, so a body feels the Earth's
//! attraction and the frame's own two accelerations (Coriolis and centrifugal). The Earth is a sphere through the
//! site (no oblateness, no J2: `rust/README.md`, "What is simplified").

use sr_world::{Site, V3, earth};

/// The site's sphere and its spin.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Field {
    /// Radius of the sphere through sea level under the site, m.
    pub sea_radius: f64,
    /// The Earth's centre in the site's frame, m.
    pub centre: V3,
    /// The Earth's rotation in the site's frame, rad/s.
    pub spin: V3,
}

impl Field {
    /// The field at a site whose origin stands `above_sea` metres over the sea.
    #[must_use]
    pub fn at(site: &Site, above_sea: f64) -> Self {
        let radius = site.radius();
        Self { sea_radius: radius - above_sea, centre: V3::new(0.0, -radius, 0.0), spin: site.rotation() }
    }

    /// Height above the sea, m.
    #[must_use]
    pub fn height(&self, position: V3) -> f64 {
        (position - self.centre).length() - self.sea_radius
    }

    /// The local vertical at a position.
    #[must_use]
    pub fn up(&self, position: V3) -> V3 {
        (position - self.centre).normalized()
    }

    /// Distance over the sea from the site to the point under a position, m.
    #[must_use]
    pub fn range(&self, position: V3) -> f64 {
        self.up(position).dot(V3::Y).clamp(-1.0, 1.0).acos() * self.sea_radius
    }

    /// What every body feels whatever it is, m/s^2: the Earth's attraction and the turning frame's accelerations.
    #[must_use]
    pub fn acceleration(&self, position: V3, velocity: V3) -> V3 {
        let r = position - self.centre;
        let attraction = r * (-earth::GM / r.length().powi(3));
        let coriolis = self.spin.cross(velocity) * -2.0;
        let centrifugal = -self.spin.cross(self.spin.cross(r));
        attraction + coriolis + centrifugal
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const LC5: Site = Site { latitude: 28.439426, longitude: -80.573292, height: -27.0, bearing_x: 295.0 };

    #[test]
    fn a_body_at_rest_on_the_pad_weighs_what_it_should() {
        // Normal gravity at 28.44 N on the ellipsoid is 9.7915 m/s^2 (WGS 84 gravity formula); a sphere through
        // the site with no J2 comes within a few parts in a thousand.
        let g = Field::at(&LC5, 2.0).acceleration(V3::ZERO, V3::ZERO);
        assert!((g.length() - 9.7915).abs() < 0.02, "{}", g.length());
        assert!(g.normalized().dot(-V3::Y) > 0.999_99);
    }

    #[test]
    fn height_and_range_from_the_site() {
        let field = Field::at(&LC5, 2.0);
        assert!((field.height(V3::ZERO) - 2.0).abs() < 1e-6);
        assert!(field.range(V3::new(1000.0, 0.0, 0.0)) - 1000.0 < 1.0);
    }
}
