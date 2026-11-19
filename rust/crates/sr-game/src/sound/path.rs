//! Sound arrives late. What is heard now left the vehicle at the earlier instant `te` for which
//! `te + distance(te) / c = now`, so the vehicle's past is kept ([`History`]) and that instant solved for
//! ([`History::heard`]).
//!
//! Slower than sound, a source has one such instant. Faster, it may have none (it has outrun everything it has
//! made, and the ears are outside its Mach cone) or two (inside the cone, where what it made coming and what it
//! made going arrive together); the instant a pair first exists, or stops existing, is the cone's surface
//! passing the ears: the boom ([`Cone`]).

use std::collections::VecDeque;

use sr_world::V3;

use super::air::between;

/// The most instants heard at once that are kept.
pub const IMAGES: usize = 4;

/// The source at an instant of its past.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Past {
    /// When, s on the flight's clock.
    pub t: f64,
    /// Where the sound comes from, in the site's frame, m, and how that was moving, m/s.
    pub at: V3,
    /// As `at`.
    pub velocity: V3,
    /// Which way its nose pointed.
    pub axis: V3,
    /// The sound power its engine was making, W, before the air's thinness is counted.
    pub power: f64,
    /// The speed of sound there, m/s, and how much of sea level's air there was to carry it, 0 to 1.
    pub sound: f64,
    /// As `sound`.
    pub carries: f64,
    /// The air's pressure there, Pa.
    pub pressure: f64,
    /// Its Mach number.
    pub mach: f64,
}

impl Past {
    /// Between two instants, `k` of the way from this to `next`.
    #[must_use]
    pub fn toward(&self, next: &Self, k: f64) -> Self {
        let mix = |a: f64, b: f64| a + (b - a) * k;
        let blend = |a: V3, b: V3| a + (b - a) * k;
        Self {
            t: mix(self.t, next.t),
            at: blend(self.at, next.at),
            velocity: blend(self.velocity, next.velocity),
            axis: blend(self.axis, next.axis),
            power: mix(self.power, next.power),
            sound: mix(self.sound, next.sound),
            carries: mix(self.carries, next.carries),
            pressure: mix(self.pressure, next.pressure),
            mach: mix(self.mach, next.mach),
        }
    }
}

/// Where the ears are, how they move, and the speed of sound there.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Ears {
    /// In the site's frame, m.
    pub at: V3,
    /// m/s.
    pub velocity: V3,
    /// The speed of sound at them, m/s.
    pub sound: f64,
}

/// One of the source's past instants being heard now.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Heard {
    /// The source then.
    pub past: Past,
    /// How far the sound came, m, and how long it took, s.
    pub distance: f64,
    /// As `distance`.
    pub delay: f64,
    /// How fast the heard instant runs against the clock: over 1 closing, under 1 parting. Pitch is multiplied
    /// by it.
    pub doppler: f64,
    /// The way the sound is travelling as it reaches the ears.
    pub toward: V3,
}

/// The source's past, sampled no finer than a step and kept no longer than a span.
#[derive(Debug, Clone)]
pub struct History {
    past: VecDeque<Past>,
    step: f64,
    keep: f64,
}

impl History {
    /// One that keeps `keep` seconds at `step` seconds apart.
    #[must_use]
    pub fn new(step: f64, keep: f64) -> Self {
        Self { past: VecDeque::with_capacity((keep / step) as usize + 4), step, keep }
    }

    /// How many instants are kept.
    #[must_use]
    pub fn len(&self) -> usize {
        self.past.len()
    }

    /// Whether nothing is.
    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.past.is_empty()
    }

    /// Forget everything.
    pub fn clear(&mut self) {
        self.past.clear();
    }

    /// The latest instant kept.
    #[must_use]
    pub fn latest(&self) -> Option<&Past> {
        self.past.back()
    }

    /// The source now. The newest instant is always the latest given; the ones before it are a step apart. A
    /// clock that has gone back takes the history with it.
    pub fn push(&mut self, now: Past) {
        if self.past.back().is_some_and(|last| now.t < last.t) {
            self.past.clear();
        }
        let n = self.past.len();
        if n >= 2 && self.past[n - 1].t - self.past[n - 2].t < self.step {
            self.past[n - 1] = now;
        } else {
            self.past.push_back(now);
        }
        while self.past.front().is_some_and(|first| now.t - first.t > self.keep) {
            self.past.pop_front();
        }
    }

    /// Every instant of the source's past being heard at `now` by these ears, the latest first.
    #[must_use]
    pub fn heard(&self, now: f64, ears: &Ears) -> Vec<Heard> {
        let mut all = Vec::new();
        let mut after = self.past.back().map(|last| lateness(last, now, ears));
        for i in (1..self.past.len()).rev() {
            let stretch = Stretch { a: &self.past[i - 1], b: &self.past[i], now, ears };
            let (before, behind) = (lateness(stretch.a, now, ears), after.unwrap_or((0.0, 0.0)));
            after = Some(before);
            if (before.0 <= 0.0) != (behind.0 <= 0.0) {
                all.push(stretch.found(0.0, 1.0));
            } else if before.1 * behind.1 < 0.0 {
                // The lateness turns round inside the stretch: the source's closing speed passed the speed of
                // sound there. If it turned past nought, two instants are heard from this one stretch.
                let turn = stretch.turn(before.1 < 0.0);
                if (stretch.late(turn) <= 0.0) != (before.0 <= 0.0) {
                    all.extend([stretch.found(turn, 1.0), stretch.found(0.0, turn)]);
                }
            }
            if all.len() >= IMAGES {
                break;
            }
        }
        all.truncate(IMAGES);
        all
    }
}

/// How late the sound of one instant of the source's past is at the ears, s (nought: it is arriving now), and
/// how fast that changes with the instant: one less the source's closing speed over the speed of sound.
fn lateness(past: &Past, now: f64, ears: &Ears) -> (f64, f64) {
    let path = ears.at - past.at;
    let (distance, c) = (path.length(), between(ears.sound, past.sound));
    let closing = if distance > 0.0 { path.dot(past.velocity) / distance } else { 0.0 };
    (past.t + distance / c - now, 1.0 - closing / c)
}

/// The source between two kept instants of its past.
struct Stretch<'a> {
    a: &'a Past,
    b: &'a Past,
    now: f64,
    ears: &'a Ears,
}

impl Stretch<'_> {
    fn late(&self, k: f64) -> f64 {
        lateness(&self.a.toward(self.b, k), self.now, self.ears).0
    }

    /// The instant being heard between `lo` and `hi` of the way along, across which the lateness changes sign:
    /// found by halving.
    fn found(&self, mut lo: f64, mut hi: f64) -> Heard {
        let below = self.late(lo) <= 0.0;
        for _ in 0..24 {
            let mid = f64::midpoint(lo, hi);
            if (self.late(mid) <= 0.0) == below { lo = mid } else { hi = mid }
        }
        hearing(self.a.toward(self.b, f64::midpoint(lo, hi)), self.now, self.ears)
    }

    /// Where along the stretch the lateness is least (`falling`: it falls and then rises) or greatest.
    fn turn(&self, falling: bool) -> f64 {
        let (mut lo, mut hi) = (0.0_f64, 1.0_f64);
        for _ in 0..32 {
            let (first, second) = (lo + (hi - lo) / 3.0, hi - (hi - lo) / 3.0);
            if (self.late(first) < self.late(second)) == falling { hi = second } else { lo = first }
        }
        f64::midpoint(lo, hi)
    }
}

/// What these ears make now of the source at one instant of its past.
fn hearing(past: Past, now: f64, ears: &Ears) -> Heard {
    let path = ears.at - past.at;
    let distance = path.length();
    let toward = if distance > 0.0 { path * (1.0 / distance) } else { V3::Y };
    let c = between(ears.sound, past.sound);
    // The classical shift: (c - the ears' speed along the path) / (c - the source's).
    let closing = 1.0 - toward.dot(past.velocity) / c;
    let doppler = if closing.abs() < 1.0e-3 { 4.0 } else { (1.0 - toward.dot(ears.velocity) / c) / closing };
    Heard { past, distance, delay: now - past.t, doppler: doppler.abs().clamp(0.25, 4.0), toward }
}

/// Watches for the Mach cone passing the ears: a pair of heard instants appearing or going.
#[derive(Debug, Clone, Copy, Default)]
pub struct Cone {
    /// How many instants were heard last time, and the nearest two of them to each other in time.
    count: Option<usize>,
    pair: Option<Heard>,
    /// When it last passed, s.
    last: Option<f64>,
}

/// No two booms nearer together than this, s: a pair that flickers in and out as it forms is one boom.
const APART: f64 = 0.6;

impl Cone {
    /// Forget what was heard: the ears have been moved, and nothing follows from what they heard before.
    pub fn reset(&mut self) {
        self.count = None;
        self.pair = None;
    }

    /// Given what is heard now: the instant of the source's past the cone's surface comes from, if it has just
    /// passed the ears.
    pub fn sweep(&mut self, now: f64, heard: &[Heard]) -> Option<Heard> {
        let nearest = heard
            .windows(2)
            .min_by(|a, b| (a[0].past.t - a[1].past.t).total_cmp(&(b[0].past.t - b[1].past.t)))
            .map(|pair| midway(&pair[0], &pair[1]));
        let was = self.count.replace(heard.len());
        let before = std::mem::replace(&mut self.pair, nearest);
        let passed = match was {
            Some(was) if heard.len() >= was + 2 => nearest,
            Some(was) if heard.len() + 2 <= was => before,
            _ => None,
        }?;
        if self.last.is_some_and(|last| (now - last).abs() < APART) {
            return None;
        }
        self.last = Some(now);
        Some(passed)
    }
}

fn midway(a: &Heard, b: &Heard) -> Heard {
    Heard {
        past: a.past.toward(&b.past, 0.5),
        distance: f64::midpoint(a.distance, b.distance),
        delay: f64::midpoint(a.delay, b.delay),
        doppler: 1.0,
        toward: a.toward,
    }
}

#[cfg(test)]
#[path = "path_tests.rs"]
mod tests;
