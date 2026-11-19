//! Filters: a one-pole low-pass (also the glide every parameter is smoothed by) and a state-variable filter that
//! stays stable while its frequency is moved.

use std::f32::consts::{PI, TAU};

use super::RATE;

/// The coefficient of a one-pole low-pass whose corner is at `hertz`.
#[must_use]
pub fn pole(hertz: f32) -> f32 {
    1.0 - (-TAU * hertz.clamp(0.0, 0.45 * RATE) / RATE).exp()
}

/// The coefficient that brings a glide 63 per cent of the way in `seconds`, run `rate` times a second.
#[must_use]
pub fn glide(seconds: f32, rate: f32) -> f32 {
    1.0 - (-1.0 / (seconds.max(1.0e-4) * rate)).exp()
}

/// A one-pole low-pass, 6 dB an octave.
#[derive(Debug, Clone, Copy, Default)]
pub struct Low(pub f32);

impl Low {
    /// One sample, with the coefficient [`pole`] gives.
    pub fn run(&mut self, x: f32, a: f32) -> f32 {
        self.0 += a * (x - self.0);
        self.0
    }

    /// What the low-pass leaves out: a one-pole high-pass.
    pub fn above(&mut self, x: f32, a: f32) -> f32 {
        x - self.run(x, a)
    }
}

/// A state-variable filter's tuning: where, and how sharp.
#[derive(Debug, Clone, Copy, Default)]
pub struct Tuning {
    a1: f32,
    a2: f32,
    a3: f32,
    k: f32,
}

impl Tuning {
    /// A corner (or a centre) at `hertz` with quality `q`: 0.707 is flat to the corner, more rings.
    #[must_use]
    pub fn at(hertz: f32, q: f32) -> Self {
        let g = (PI * hertz.clamp(5.0, 0.45 * RATE) / RATE).tan();
        let k = 1.0 / q.max(0.05);
        let a1 = 1.0 / (1.0 + g * (g + k));
        Self { a1, a2: g * a1, a3: g * g * a1, k }
    }
}

/// What a state-variable filter gives of one sample: what is below its corner, about it and above it.
#[derive(Debug, Clone, Copy, Default)]
pub struct Split {
    /// Below the corner, 12 dB an octave.
    pub low: f32,
    /// About the centre: its peak is `q` times the input.
    pub band: f32,
    /// Above the corner, 12 dB an octave.
    pub high: f32,
}

/// A state-variable filter in its trapezoidal form (Simper, "Linear trapezoidal integrated SVF", Cytomic 2013).
#[derive(Debug, Clone, Copy, Default)]
pub struct Svf {
    ic1: f32,
    ic2: f32,
}

impl Svf {
    /// One sample through it.
    pub fn run(&mut self, x: f32, t: &Tuning) -> Split {
        let v3 = x - self.ic2;
        let v1 = t.a1 * self.ic1 + t.a2 * v3;
        let v2 = self.ic2 + t.a2 * self.ic1 + t.a3 * v3;
        self.ic1 = 2.0 * v1 - self.ic1;
        self.ic2 = 2.0 * v2 - self.ic2;
        Split { low: v2, band: v1, high: x - t.k * v1 - v2 }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// The level a filter passes a steady tone at, as a gain.
    fn passes(hertz: f32, mut filter: impl FnMut(f32) -> f32) -> f32 {
        let n = RATE as usize;
        let mut square = 0.0_f64;
        for i in 0..2 * n {
            let y = filter((TAU * hertz * i as f32 / RATE).sin());
            if i >= n {
                square += f64::from(y * y);
            }
        }
        (2.0 * square / n as f64).sqrt() as f32
    }

    #[test]
    fn a_one_pole_low_pass_is_three_decibels_down_at_its_corner() {
        let a = pole(1000.0);
        let mut low = Low::default();
        assert!((passes(1000.0, |x| low.run(x, a)) - 0.707).abs() < 0.02);
        let mut low = Low::default();
        assert!(passes(20.0, |x| low.run(x, a)) > 0.99);
        // (well above the corner it falls six decibels an octave: half for each doubling)
        let mut low = Low::default();
        let two = passes(8000.0, |x| low.run(x, a));
        let mut low = Low::default();
        let four = passes(16_000.0, |x| low.run(x, a));
        assert!(two / four > 1.6 && two < 0.16, "{two} {four}");
    }

    #[test]
    fn a_state_variable_filter_splits_at_its_corner() {
        let t = Tuning::at(500.0, 0.707);
        let mut f = Svf::default();
        assert!((passes(500.0, |x| f.run(x, &t).low) - 0.707).abs() < 0.02);
        let mut f = Svf::default();
        // Two octaves above a 12 dB an octave corner: a sixteenth.
        assert!((passes(2000.0, |x| f.run(x, &t).low) - 1.0 / 16.0).abs() < 0.01);
        let mut f = Svf::default();
        assert!((passes(125.0, |x| f.run(x, &t).high) - 1.0 / 16.0).abs() < 0.01);
        let sharp = Tuning::at(500.0, 4.0);
        let mut f = Svf::default();
        assert!((passes(500.0, |x| f.run(x, &sharp).band) - 4.0).abs() < 0.1);
    }

    #[test]
    fn a_glide_is_most_of_the_way_there_after_its_time() {
        let a = glide(0.02, 1500.0);
        let mut y = Low::default();
        for _ in 0..30 {
            y.run(1.0, a);
        }
        assert!((y.0 - 0.632).abs() < 0.02, "{}", y.0);
    }
}
