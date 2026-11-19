//! An instant of civil time (UTC), as a Julian date.

/// The Julian date of 2000 January 1, 12:00.
pub const J2000: f64 = 2_451_545.0;

/// A moment, kept as a Julian date in UTC. UT1 is within a second of it, which moves the Sun by less than 0.005
/// degrees: the web build bakes UT1 - TAI (`pnpm ut1`); this one does not yet.
#[derive(Debug, Clone, Copy, PartialEq, PartialOrd)]
pub struct Instant(pub f64);

impl Instant {
    /// From a Gregorian date and a time of day, UTC.
    #[must_use]
    pub fn utc(year: i32, month: u32, day: u32, hour: u32, minute: u32, second: f64) -> Self {
        let (y, m) = if month <= 2 { (year - 1, month + 12) } else { (year, month) };
        let century = (f64::from(y) / 100.0).floor();
        let leap = 2.0 - century + (century / 4.0).floor();
        let days =
            (365.25 * f64::from(y + 4716)).floor() + (30.6001 * f64::from(m + 1)).floor() + f64::from(day);
        let of_day = (f64::from(hour) + f64::from(minute) / 60.0 + second / 3600.0) / 24.0;
        Self(days + leap - 1524.5 + of_day)
    }

    /// The instant this many seconds later.
    #[must_use]
    pub fn plus(self, seconds: f64) -> Self {
        Self(self.0 + seconds / 86_400.0)
    }

    /// Days since J2000.
    #[must_use]
    pub fn days(self) -> f64 {
        self.0 - J2000
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn julian_dates_as_published() {
        // Meeus, Astronomical Algorithms, example 7.a: 1957 October 4.81 is JD 2,436,116.31.
        assert!((Instant::utc(1957, 10, 4, 19, 26, 24.0).0 - 2_436_116.31).abs() < 1e-6);
        assert_eq!(Instant::utc(2000, 1, 1, 12, 0, 0.0).0, J2000);
    }
}
