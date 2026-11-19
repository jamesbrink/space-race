//! A route on the ground, measured by distance: a centripetal Catmull-Rom curve from where a vehicle stands through
//! its route's points, as the web build lays it (`Route` in `src/viewer/explode.ts`, on three.js's
//! `CatmullRomCurve3`), and how far the front wheels are turned along it.

/// Samples of the curve's length taken to space its points evenly (three.js's `arcLengthDivisions`).
const LENGTH_SAMPLES: usize = 200;

/// A point of a route: where the rear axle is, and how it is turned from how it stood at the start.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Point {
    /// Across, m.
    pub x: f64,
    /// Along, m.
    pub z: f64,
    /// Radians about the vertical from the first leg's way.
    pub heading: f64,
}

/// A route from the origin through some points, sampled evenly by distance.
#[derive(Debug, Clone, PartialEq)]
pub struct Route {
    /// Its length, m.
    pub length: f64,
    /// Distance, x, z and heading at each sample.
    samples: Vec<[f64; 4]>,
}

/// The four points of the curve's span `i`, the ends carried on straight (three.js's open curve).
fn span(points: &[[f64; 2]], i: usize) -> [[f64; 2]; 4] {
    let n = points.len();
    let at = |k: usize| points[k];
    let beyond = |a: [f64; 2], b: [f64; 2]| [2.0 * a[0] - b[0], 2.0 * a[1] - b[1]];
    let p0 = if i > 0 { at(i - 1) } else { beyond(at(0), at(1)) };
    let p3 = if i + 2 < n { at(i + 2) } else { beyond(at(n - 1), at(n - 2)) };
    [p0, at(i), at(i + 1), p3]
}

/// The centripetal Catmull-Rom curve through `points` at `u` (0 to 1 over them all).
fn curve(points: &[[f64; 2]], u: f64) -> [f64; 2] {
    let last = points.len() - 1;
    let p = last as f64 * u.clamp(0.0, 1.0);
    let i = (p.floor() as usize).min(last - 1);
    let w = p - i as f64;
    let [p0, p1, p2, p3] = span(points, i);
    let gap = |a: [f64; 2], b: [f64; 2]| ((a[0] - b[0]).powi(2) + (a[1] - b[1]).powi(2)).powf(0.25);
    let mut dt1 = gap(p1, p2);
    if dt1 < 1e-4 {
        dt1 = 1.0;
    }
    let dt0 = Some(gap(p0, p1)).filter(|&d| d >= 1e-4).unwrap_or(dt1);
    let dt2 = Some(gap(p2, p3)).filter(|&d| d >= 1e-4).unwrap_or(dt1);
    let axis = |k: usize| {
        let (x0, x1, x2, x3) = (p0[k], p1[k], p2[k], p3[k]);
        let t1 = ((x1 - x0) / dt0 - (x2 - x0) / (dt0 + dt1) + (x2 - x1) / dt1) * dt1;
        let t2 = ((x2 - x1) / dt1 - (x3 - x1) / (dt1 + dt2) + (x3 - x2) / dt2) * dt1;
        let (c2, c3) = (-3.0 * x1 + 3.0 * x2 - 2.0 * t1 - t2, 2.0 * x1 - 2.0 * x2 + t1 + t2);
        x1 + w * (t1 + w * (c2 + w * c3))
    };
    [axis(0), axis(1)]
}

impl Route {
    /// From the origin through `path`.
    #[must_use]
    pub fn new(path: &[[f64; 2]]) -> Self {
        let mut points = vec![[0.0, 0.0]];
        points.extend_from_slice(path);
        if points.len() < 2 {
            return Self { length: 0.0, samples: vec![[0.0; 4], [0.0; 4]] };
        }
        // the curve's length along it, to space the samples evenly by distance (three.js's `getSpacedPoints`)
        let dense: Vec<[f64; 2]> =
            (0..=LENGTH_SAMPLES).map(|i| curve(&points, i as f64 / LENGTH_SAMPLES as f64)).collect();
        let mut lengths = vec![0.0];
        for pair in dense.windows(2) {
            let last = lengths.last().copied().unwrap_or(0.0);
            lengths.push(last + (pair[1][0] - pair[0][0]).hypot(pair[1][1] - pair[0][1]));
        }
        let whole = lengths.last().copied().unwrap_or(0.0);
        let count = 32.max(path.len() * 48);
        let spaced: Vec<[f64; 2]> = (0..=count)
            .map(|d| {
                let want = whole * d as f64 / count as f64;
                let i = lengths.partition_point(|&l| l < want).clamp(1, LENGTH_SAMPLES);
                let (a, b) = (lengths[i - 1], lengths[i]);
                let f = if b > a { (want - a) / (b - a) } else { 0.0 };
                curve(&points, (i as f64 - 1.0 + f) / LENGTH_SAMPLES as f64)
            })
            .collect();
        Self::from_points(&spaced)
    }

    /// From evenly spaced points: each one's distance along, and its heading as one continuous turn from the first.
    fn from_points(points: &[[f64; 2]]) -> Self {
        let n = points.len();
        let mut samples = Vec::with_capacity(n);
        let (mut s, mut last, mut first) = (0.0, 0.0, None);
        for i in 0..n {
            let (a, b) = (points[i.saturating_sub(1)], points[(i + 1).min(n - 1)]);
            if i > 0 {
                s += (points[i][0] - points[i - 1][0]).hypot(points[i][1] - points[i - 1][1]);
            }
            let h = (b[0] - a[0]).atan2(b[1] - a[1]);
            let h0 = *first.get_or_insert(h);
            let mut d = h - h0;
            while d - last > std::f64::consts::PI {
                d -= std::f64::consts::TAU;
            }
            while d - last < -std::f64::consts::PI {
                d += std::f64::consts::TAU;
            }
            last = d;
            samples.push([s, points[i][0], points[i][1], d]);
        }
        Self { length: s, samples }
    }

    /// The point `distance` along it.
    #[must_use]
    pub fn at(&self, distance: f64) -> Point {
        let s = distance.clamp(0.0, self.length);
        let n = self.samples.len();
        let i = self.samples.partition_point(|sample| sample[0] < s).clamp(1, n - 1);
        let (a, b) = (self.samples[i - 1], self.samples[i]);
        let k = if b[0] > a[0] { (s - a[0]) / (b[0] - a[0]) } else { 0.0 };
        Point { x: a[1] + (b[1] - a[1]) * k, z: a[2] + (b[2] - a[2]) * k, heading: a[3] + (b[3] - a[3]) * k }
    }
}

/// Smoothstep from 0 to 1.
#[must_use]
pub fn ease(x: f64) -> f64 {
    let x = x.clamp(0.0, 1.0);
    x * x * (3.0 - 2.0 * x)
}

/// How far the front wheels are turned, radians, `distance` along a route by a vehicle `wheelbase` long: toward
/// where the route is one wheelbase ahead, straight at both ends (`steerAlong`).
#[must_use]
pub fn steer_along(route: &Route, distance: f64, wheelbase: f64) -> f64 {
    let s = distance.clamp(0.0, route.length);
    let reach = wheelbase.max(1e-3);
    let turn = route.at(s + reach).heading - route.at(s).heading;
    turn.atan() * ease(s / reach) * ease((route.length - s) / reach)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_straight_route_is_as_long_as_it_is_and_never_turns() {
        let route = Route::new(&[[24.0, 0.0], [48.0, 0.0], [72.0, 0.0]]);
        assert!((route.length - 72.0).abs() < 1e-6, "{}", route.length);
        let p = route.at(30.0);
        assert!((p.x - 30.0).abs() < 1e-6 && p.z.abs() < 1e-9 && p.heading.abs() < 1e-9);
        assert_eq!(steer_along(&route, 30.0, 2.8), 0.0);
    }

    #[test]
    fn a_route_that_bends_ends_where_its_last_point_is_and_steers_into_the_bend() {
        let route = Route::new(&[[12.0, 0.0], [26.0, 1.0], [40.0, 8.0], [50.0, 24.0]]);
        let end = route.at(route.length);
        assert!((end.x - 50.0).abs() < 1e-9 && (end.z - 24.0).abs() < 1e-9);
        // it turns from heading along +x toward +z: a turn the other way about the vertical
        assert!(end.heading < -0.5, "{}", end.heading);
        assert!(steer_along(&route, 30.0, 5.0) < 0.0);
        assert_eq!(steer_along(&route, 0.0, 5.0), 0.0);
        // evenly spaced: no step between samples is far longer than the mean
        let steps: Vec<f64> = route.samples.windows(2).map(|w| w[1][0] - w[0][0]).collect();
        let mean = route.length / steps.len() as f64;
        assert!(steps.iter().all(|&s| (s - mean).abs() < 0.05 * mean));
    }
}
