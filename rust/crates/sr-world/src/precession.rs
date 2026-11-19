//! The sky's own frame turned to a place and an instant: precession, nutation and the Earth's turn
//! (`src/world/frames.ts`, `src/world/time.ts`).
//!
//! J2000 is where a star catalogue lives (the ICRF). The turn to the true equator and equinox of date is the IAU 2006
//! precession (Fukushima-Williams angles, with the frame bias) and the IAU 2000B nutation's twenty largest terms; the
//! Earth is then turned by the Greenwich apparent sidereal time. The terms left out of the nutation are each under
//! 0.01 arcseconds; together they move a star by well under a thousandth of a degree.

use crate::{Instant, Site, V3, earth};

/// A rotation, as its three rows.
pub type M3 = [[f64; 3]; 3];

const ARCSEC: f64 = std::f64::consts::PI / 180.0 / 3600.0;
/// A whole turn in arcseconds.
const TURN: f64 = 1_296_000.0;

/// The matrix applied to a vector.
#[must_use]
pub fn apply(m: &M3, v: V3) -> V3 {
    let row = |r: [f64; 3]| r[0] * v.x + r[1] * v.y + r[2] * v.z;
    V3::new(row(m[0]), row(m[1]), row(m[2]))
}

/// `a` after `b`.
#[must_use]
pub fn multiply(a: &M3, b: &M3) -> M3 {
    let mut out = [[0.0; 3]; 3];
    for (i, row) in out.iter_mut().enumerate() {
        for (j, cell) in row.iter_mut().enumerate() {
            *cell = (0..3).map(|k| a[i][k] * b[k][j]).sum();
        }
    }
    out
}

/// The rows become the columns.
#[must_use]
pub fn transpose(m: &M3) -> M3 {
    [[m[0][0], m[1][0], m[2][0]], [m[0][1], m[1][1], m[2][1]], [m[0][2], m[1][2], m[2][2]]]
}

/// A turn of the axes about +X (SOFA's iauRx).
fn axes_x(angle: f64) -> M3 {
    let (s, c) = angle.sin_cos();
    [[1.0, 0.0, 0.0], [0.0, c, s], [0.0, -s, c]]
}

/// A turn of the axes about +Z (SOFA's iauRz).
fn axes_z(angle: f64) -> M3 {
    let (s, c) = angle.sin_cos();
    [[c, s, 0.0], [-s, c, 0.0], [0.0, 0.0, 1.0]]
}

/// TT - UT1 at an instant, s: Espenak and Meeus's polynomials ("Five Millennium Canon of Solar Eclipses", NASA
/// TP-2006-214141, section 2), good to a second or so from 1941 to 2050 (33.6 s in May 1961).
#[must_use]
pub fn delta_t(at: Instant) -> f64 {
    let year = 2000.0 + at.days() / 365.25;
    if year < 1961.0 {
        let t = year - 1950.0;
        29.07 + 0.407 * t - t * t / 233.0 + t.powi(3) / 2547.0
    } else if year < 1986.0 {
        let t = year - 1975.0;
        45.45 + 1.067 * t - t * t / 260.0 - t.powi(3) / 718.0
    } else if year < 2005.0 {
        let t = year - 2000.0;
        63.86 + 0.3345 * t - 0.060374 * t * t
            + 0.0017275 * t.powi(3)
            + 0.000651814 * t.powi(4)
            + 0.00002373599 * t.powi(5)
    } else {
        let t = year - 2000.0;
        62.92 + 0.32217 * t + 0.005589 * t * t
    }
}

/// Julian centuries of TT from J2000 at an instant (given in UTC, taken as UT1: within a second of it).
#[must_use]
pub fn centuries(at: Instant) -> f64 {
    (at.days() + delta_t(at) / 86_400.0) / 36_525.0
}

/// The IAU 2006 mean obliquity of the ecliptic, radians (Hilton et al. 2006; SOFA iauObl06).
#[must_use]
pub fn mean_obliquity(t: f64) -> f64 {
    (84381.406
        + (-46.836769 + (-0.0001831 + (0.0020034 + (-0.000000576 - 0.0000000434 * t) * t) * t) * t) * t)
        * ARCSEC
}

/// The IAU 2000B nutation's twenty largest terms (Celestial Mechanics 85, 2003, 37; SOFA's `iauNut00b`): the
/// multiples of the Moon's mean anomaly, the Sun's, the Moon's argument of latitude, its elongation and its node;
/// then the longitude's sine coefficient, its rate and its cosine coefficient, and the obliquity's cosine
/// coefficient, rate and sine coefficient, in 0.1 microarcseconds.
const NUTATION: [[f64; 11]; 20] = [
    [0.0, 0.0, 0.0, 0.0, 1.0, -172064161.0, -174666.0, 33386.0, 92052331.0, 9086.0, 15377.0],
    [0.0, 0.0, 2.0, -2.0, 2.0, -13170906.0, -1675.0, -13696.0, 5730336.0, -3015.0, -4587.0],
    [0.0, 0.0, 2.0, 0.0, 2.0, -2276413.0, -234.0, 2796.0, 978459.0, -485.0, 1374.0],
    [0.0, 0.0, 0.0, 0.0, 2.0, 2074554.0, 207.0, -698.0, -897492.0, 470.0, -291.0],
    [0.0, 1.0, 0.0, 0.0, 0.0, 1475877.0, -3633.0, 11817.0, 73871.0, -184.0, -1924.0],
    [0.0, 1.0, 2.0, -2.0, 2.0, -516821.0, 1226.0, -524.0, 224386.0, -677.0, -174.0],
    [1.0, 0.0, 0.0, 0.0, 0.0, 711159.0, 73.0, -872.0, -6750.0, 0.0, 358.0],
    [0.0, 0.0, 2.0, 0.0, 1.0, -387298.0, -367.0, 380.0, 200728.0, 18.0, 318.0],
    [1.0, 0.0, 2.0, 0.0, 2.0, -301461.0, -36.0, 816.0, 129025.0, -63.0, 367.0],
    [0.0, -1.0, 2.0, -2.0, 2.0, 215829.0, -494.0, 111.0, -95929.0, 299.0, 132.0],
    [0.0, 0.0, 2.0, -2.0, 1.0, 128227.0, 137.0, 181.0, -68982.0, -9.0, 39.0],
    [-1.0, 0.0, 2.0, 0.0, 2.0, 123457.0, 11.0, 19.0, -53311.0, 32.0, -4.0],
    [-1.0, 0.0, 0.0, 2.0, 0.0, 156994.0, 10.0, -168.0, -1235.0, 0.0, 82.0],
    [1.0, 0.0, 0.0, 0.0, 1.0, 63110.0, 63.0, 27.0, -33228.0, 0.0, -9.0],
    [-1.0, 0.0, 0.0, 0.0, 1.0, -57976.0, -63.0, -189.0, 31429.0, 0.0, -75.0],
    [-1.0, 0.0, 2.0, 2.0, 2.0, -59641.0, -11.0, 149.0, 25543.0, -11.0, 66.0],
    [1.0, 0.0, 2.0, 0.0, 1.0, -51613.0, -42.0, 129.0, 26366.0, 0.0, 78.0],
    [-2.0, 0.0, 2.0, 0.0, 1.0, 45893.0, 50.0, 31.0, -24236.0, -10.0, 20.0],
    [0.0, 0.0, 0.0, 2.0, 0.0, 63384.0, 11.0, -150.0, -1220.0, 0.0, 29.0],
    [0.0, 0.0, 2.0, 2.0, 2.0, -38571.0, -1.0, 158.0, 16452.0, -11.0, 68.0],
];

/// The nutation in longitude and in obliquity, radians, `t` Julian centuries of TT from J2000 (with IAU 2000B's
/// fixed offsets for the planetary terms).
#[must_use]
pub fn nutation(t: f64) -> (f64, f64) {
    let wrap = |arcsec: f64| (arcsec % TURN) * ARCSEC;
    let args = [
        wrap(485868.249036 + 1717915923.2178 * t),
        wrap(1287104.79305 + 129596581.0481 * t),
        wrap(335779.526232 + 1739527262.8478 * t),
        wrap(1072260.70369 + 1602961601.209 * t),
        wrap(450160.398036 - 6962890.5431 * t),
    ];
    let (mut dp, mut de) = (0.0, 0.0);
    for row in NUTATION.iter().rev() {
        let arg: f64 = (0..5).map(|i| row[i] * args[i]).sum();
        let (s, c) = arg.sin_cos();
        dp += (row[5] + row[6] * t) * s + row[7] * c;
        de += (row[8] + row[9] * t) * c + row[10] * s;
    }
    let unit = ARCSEC / 1e7;
    (dp * unit - 0.135e-3 * ARCSEC, de * unit + 0.388e-3 * ARCSEC)
}

/// From the ICRF (J2000) to the true equator and equinox of date (SOFA iauPnm06a, with the shorter nutation).
#[must_use]
pub fn icrf_to_date(t: f64) -> M3 {
    let poly = |c: [f64; 6]| c[0] + (c[1] + (c[2] + (c[3] + (c[4] + c[5] * t) * t) * t) * t) * t;
    let gamma = poly([-0.052928, 10.556378, 0.4932044, -0.00031238, -0.000002788, 0.000000026]) * ARCSEC;
    let phi = poly([84381.412819, -46.811016, 0.0511268, 0.00053289, -0.00000044, -0.0000000176]) * ARCSEC;
    let psi = poly([-0.041775, 5038.481484, 1.5584175, -0.00018522, -0.000026452, -0.0000000148]) * ARCSEC;
    let (dpsi, deps) = nutation(t);
    let eps = mean_obliquity(t) + deps;
    multiply(&axes_x(-eps), &multiply(&axes_z(-(psi + dpsi)), &multiply(&axes_x(phi), &axes_z(gamma))))
}

/// Greenwich apparent sidereal time, radians: the IAU 2006 mean sidereal time on the Earth rotation angle, and the
/// equation of the equinoxes (SOFA iauGmst06, iauEe06a's leading terms).
#[must_use]
pub fn sidereal(at: Instant) -> f64 {
    let t = centuries(at);
    let era =
        std::f64::consts::TAU * (0.779_057_273_264 + 1.002_737_811_911_354_5 * at.days()).rem_euclid(1.0);
    let precession = 0.014506
        + (4612.156534 + (1.3915817 + (-0.00000044 + (-0.000029956 - 0.0000000368 * t) * t) * t) * t) * t;
    let (dpsi, _) = nutation(t);
    let node = ((450160.398036 - 6962890.5431 * t) % TURN) * ARCSEC;
    let complementary = (2640.96e-6 * node.sin() + 63.52e-6 * (2.0 * node).sin()) * ARCSEC;
    (era + precession * ARCSEC + dpsi * mean_obliquity(t).cos() + complementary)
        .rem_euclid(std::f64::consts::TAU)
}

/// East, north and up at a site, as Earth-fixed unit vectors (geodetic: up is the ellipsoid's normal).
#[must_use]
pub fn enu_axes(site: &Site) -> [V3; 3] {
    let (sp, cp) = site.latitude.to_radians().sin_cos();
    let (sl, cl) = site.longitude.to_radians().sin_cos();
    [V3::new(-sl, cl, 0.0), V3::new(-sp * cl, -sp * sl, cp), V3::new(cp * cl, cp * sl, sp)]
}

/// The rotation that takes a direction in J2000 (a catalogue star) into a site's own frame at an instant:
/// precession and nutation, the Earth's turn, the place and the frame's bearing (frames.ts `j2000ToSite`).
#[must_use]
pub fn j2000_to_site(site: &Site, at: Instant) -> M3 {
    let to_date = icrf_to_date(centuries(at));
    let earth = axes_z(sidereal(at));
    let to_earth = multiply(&earth, &to_date);
    let [e, n, u] = enu_axes(site);
    let column = |v: V3| {
        let fixed = apply(&to_earth, v);
        site.from_enu(V3::new(fixed.dot(e), fixed.dot(n), fixed.dot(u)))
    };
    let [x, y, z] = [column(V3::new(1.0, 0.0, 0.0)), column(V3::Y), column(V3::new(0.0, 0.0, 1.0))];
    [[x.x, y.x, z.x], [x.y, y.y, z.y], [x.z, y.z, z.z]]
}

/// An Earth-fixed point as seen from a site: the direction in the site's frame and the distance, m.
#[must_use]
pub fn from_site(site: &Site, earth_fixed: V3) -> (V3, f64) {
    let rel = earth_fixed - earth::ecef(site.latitude, site.longitude, site.height);
    let [e, n, u] = enu_axes(site);
    let distance = rel.length();
    (site.from_enu(V3::new(rel.dot(e), rel.dot(n), rel.dot(u))) * (1.0 / distance), distance)
}

/// A vector on the true equator and equinox of date, in the Earth-fixed frame at an instant.
#[must_use]
pub fn date_to_earth(v: V3, at: Instant) -> V3 {
    apply(&axes_z(sidereal(at)), v)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn delta_t_as_the_canon_has_it() {
        // Espenak and Meeus's table: 33.6 s in 1961.3, 63.8 s at 2000.0.
        assert!((delta_t(Instant::utc(1961, 5, 5, 0, 0, 0.0)) - 33.6).abs() < 0.2);
        assert!((delta_t(Instant::utc(2000, 1, 1, 12, 0, 0.0)) - 63.86).abs() < 0.05);
    }

    #[test]
    fn sidereal_time_as_meeus_has_it() {
        // Meeus, Astronomical Algorithms, example 12.a: 1987 April 10, 0h UT, mean sidereal time 13h10m46.3668s;
        // the apparent (12.a, with the nutation of 22.a) is 13h10m46.1351s. UT1 is taken as UTC here.
        let gast = sidereal(Instant::utc(1987, 4, 10, 0, 0, 0.0)).to_degrees() / 15.0;
        let want = 13.0 + 10.0 / 60.0 + 46.1351 / 3600.0;
        assert!((gast - want).abs() * 3600.0 < 0.05, "{gast}");
    }

    #[test]
    fn the_rotation_is_a_rotation() {
        let lc5 = Site { latitude: 28.439426, longitude: -80.573292, height: -27.0, bearing_x: 295.0 };
        let m = j2000_to_site(&lc5, Instant::utc(1961, 5, 5, 14, 34, 13.0));
        let product = multiply(&m, &transpose(&m));
        for (i, row) in product.iter().enumerate() {
            for (j, cell) in row.iter().enumerate() {
                assert!((cell - f64::from(u8::from(i == j))).abs() < 1e-12);
            }
        }
    }
}
