//! A figure that varies: points read off a published curve, joined by straight lines.

use sr_measure::Confidence;

/// Points `(x, y)` in rising `x`, with how the curve is known.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Curve {
    /// The points, in rising `x`.
    pub points: &'static [(f64, f64)],
    /// How the curve is known.
    pub confidence: Confidence,
    /// Where it comes from.
    pub source: &'static str,
}

impl Curve {
    /// The curve at `x`: the first point's value before it, the last's after.
    #[must_use]
    pub fn at(&self, x: f64) -> f64 {
        let Some(&(first_x, first_y)) = self.points.first() else { return 0.0 };
        if x <= first_x {
            return first_y;
        }
        for pair in self.points.windows(2) {
            let ((x0, y0), (x1, y1)) = (pair[0], pair[1]);
            if x <= x1 {
                return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
            }
        }
        self.points.last().map_or(first_y, |p| p.1)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn straight_lines_between_points_and_flat_beyond() {
        let c = Curve {
            points: &[(0.0, 1.0), (2.0, 3.0), (4.0, 3.0)],
            confidence: Confidence::Documented,
            source: "",
        };
        assert_eq!(c.at(-1.0), 1.0);
        assert_eq!(c.at(1.0), 2.0);
        assert_eq!(c.at(3.0), 3.0);
        assert_eq!(c.at(9.0), 3.0);
    }
}
