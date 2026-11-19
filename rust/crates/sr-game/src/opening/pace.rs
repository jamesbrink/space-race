//! How fast the opening runs the flight's clock: a time-lapse whose rate eases from one pace to the next, never
//! steps, and comes to real time at the hand-over. The paces are presentation, not history: they are chosen so each
//! of the morning's motions can be watched and the hours between them pass in seconds. The instants they are set
//! at are the record's (the pad's keyframes); the opening's length follows from them.
//!
//! The rate is a function of the clock (each pace is set at an instant of it), eased between paces, so it is smooth
//! in the opening's own time too; the clock is that rate integrated, worked once into a table so that any second of
//! the opening can be looked up, and played or filmed the same.

/// How fast the clock runs at an instant of it: seconds of the flight a second of the opening.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Pace {
    /// Seconds from liftoff.
    pub at: f64,
    /// Seconds of the flight a second.
    pub rate: f64,
}

/// The time-lapse (presentation): slow enough round each of the pad's motions to watch it, fast through the holds.
pub const PACES: [Pace; 16] = [
    // the platforms' last parting, the trailer and the huts going; then the structure rolling to the pad's edge
    Pace { at: -11_050.0, rate: 90.0 },
    Pace { at: -10_700.0, rate: 60.0 },
    Pace { at: -10_330.0, rate: 60.0 },
    // the cab rising to the hatch
    Pace { at: -10_300.0, rate: 40.0 },
    Pace { at: -10_170.0, rate: 40.0 },
    // the two and a half hours of holds, the Sun climbing
    Pace { at: -9_000.0, rate: 2_000.0 },
    Pace { at: -1_800.0, rate: 2_000.0 },
    // the structure to its launch position, and on past the minutes when nothing moves
    Pace { at: -620.0, rate: 50.0 },
    Pace { at: -470.0, rate: 50.0 },
    Pace { at: -330.0, rate: 90.0 },
    // the cab away and down
    Pace { at: -240.0, rate: 40.0 },
    Pace { at: -150.0, rate: 40.0 },
    // the masts fall, the boom in real time
    Pace { at: -50.0, rate: 15.0 },
    Pace { at: -22.0, rate: 3.5 },
    Pace { at: -14.0, rate: 1.0 },
    Pace { at: -12.0, rate: 1.0 },
];

/// The step the opening's clock is worked at, s of the opening.
const STEP: f64 = 1.0 / 240.0;

/// Smoothstep from 0 to 1.
fn ease(x: f64) -> f64 {
    let x = x.clamp(0.0, 1.0);
    x * x * (3.0 - 2.0 * x)
}

/// The clock's rate at `t`, each pace eased into the next. Eased in the clock's own time, a rate that changes
/// evenly with it changes by an even fraction of itself each second of the opening: the time-lapse gathers and
/// slows as a camera's speed does, and passes through the slow rates without lingering in them.
#[must_use]
pub fn rate(paces: &[Pace], t: f64) -> f64 {
    let (Some(first), Some(last)) = (paces.first(), paces.last()) else { return 1.0 };
    if t <= first.at {
        return first.rate;
    }
    for pair in paces.windows(2) {
        let (a, b) = (pair[0], pair[1]);
        if t <= b.at {
            let k = ease((t - a.at) / (b.at - a.at).max(1e-9));
            return a.rate + (b.rate - a.rate) * k;
        }
    }
    last.rate
}

/// The opening's clock: which instant of the flight each of its seconds shows.
#[derive(Debug, Clone, PartialEq)]
pub struct Timeline {
    /// The clock at every [`STEP`] of the opening, from its first paced instant to a step past its last.
    table: Vec<f64>,
    /// Where it ends on the flight's clock.
    end: f64,
}

impl Timeline {
    /// From the first pace's instant to the last's, the rate integrated (the midpoint rule, at [`STEP`]).
    #[must_use]
    pub fn new(paces: &[Pace]) -> Self {
        let (Some(first), Some(last)) = (paces.first(), paces.last()) else {
            return Self { table: vec![0.0, 1.0], end: 0.0 };
        };
        let mut table = vec![first.at];
        let mut t = first.at;
        while t < last.at || table.len() < 2 {
            let half = t + 0.5 * STEP * rate(paces, t);
            t += STEP * rate(paces, half);
            table.push(t);
        }
        Self { table, end: last.at }
    }

    /// How long it lasts, s of the opening.
    #[must_use]
    pub fn length(&self) -> f64 {
        self.tau(self.end)
    }

    /// The flight's clock `tau` seconds into the opening (no later than its end).
    #[must_use]
    pub fn t(&self, tau: f64) -> f64 {
        let at = (tau / STEP).clamp(0.0, (self.table.len() - 1) as f64);
        let i = (at.floor() as usize).min(self.table.len() - 2);
        let (a, b) = (self.table[i], self.table[i + 1]);
        (a + (b - a) * (at - i as f64)).min(self.end)
    }

    /// The second of the opening that shows the flight's instant `t`.
    #[must_use]
    pub fn tau(&self, t: f64) -> f64 {
        let i = self.table.partition_point(|&c| c < t).clamp(1, self.table.len() - 1);
        let (a, b) = (self.table[i - 1], self.table[i]);
        let f = if b > a { ((t - a) / (b - a)).clamp(0.0, 1.0) } else { 0.0 };
        (i as f64 - 1.0 + f) * STEP
    }

    /// Where it begins and ends on the flight's clock.
    #[must_use]
    pub fn span(&self) -> (f64, f64) {
        (self.table[0], self.end)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_opening_lasts_under_a_minute_and_ends_at_t_minus_twelve_in_real_time() {
        let line = Timeline::new(&PACES);
        assert!((45.0..52.0).contains(&line.length()), "{}", line.length());
        assert_eq!(line.span(), (-11_050.0, -12.0));
        assert_eq!(rate(&PACES, -12.0), 1.0);
        // the last second is real time, to within a hundredth
        let last = line.t(line.length()) - line.t(line.length() - 1.0);
        assert!((last - 1.0).abs() < 0.01, "{last}");
    }

    #[test]
    fn the_rate_never_steps_and_the_clock_never_goes_back() {
        let line = Timeline::new(&PACES);
        let frame = 1.0 / 60.0;
        let (mut before, mut was) = (line.t(0.0), None::<f64>);
        let mut tau = frame;
        while tau <= line.length() {
            let t = line.t(tau);
            let now = (t - before) / frame;
            assert!(now > 0.0);
            // from one frame to the next the rate changes by less than a twentieth of itself
            if let Some(was) = was {
                assert!((now / was - 1.0).abs() < 0.05, "at {tau}: {was} then {now}");
            }
            (before, was, tau) = (t, Some(now), tau + frame);
        }
        assert!((line.tau(line.t(20.0)) - 20.0).abs() < 1e-6);
    }
}
