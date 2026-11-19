//! The knobs as the synthesiser holds them, and how a sound is placed between two ears.

use crate::sound::shared::{KNOBS, Knob};

/// The knobs as the synthesiser has them now: gliding to where they were set.
#[derive(Debug, Clone, Copy, Default)]
pub struct Knobs(pub(super) [f32; KNOBS]);

impl Knobs {
    /// Where a knob is now.
    #[must_use]
    pub fn at(&self, knob: Knob) -> f32 {
        self.0[knob as usize]
    }

    /// Put a knob somewhere at once.
    pub fn put(&mut self, knob: Knob, value: f32) {
        self.0[knob as usize] = value;
    }
}

/// Two ears' worth of one sound, placed: `pan` from -1 (left) to 1 (right) with equal power, and `width` from a
/// point (both ears hear the first) to all round (each ear its own, and no side).
#[must_use]
pub fn spread(a: f32, b: f32, pan: f32, width: f32) -> [f32; 2] {
    let width = width.clamp(0.0, 1.0);
    let other = (a * (1.0 - width) + b * width) / ((1.0 - width).powi(2) + width * width).sqrt();
    let angle = (pan.clamp(-1.0, 1.0) * (1.0 - width) + 1.0) * std::f32::consts::FRAC_PI_4;
    [a * angle.cos() * std::f32::consts::SQRT_2, other * angle.sin() * std::f32::consts::SQRT_2]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_point_is_placed_with_equal_power_and_a_wide_sound_is_in_both_ears() {
        // In the middle both ears have it whole; hard over, one has all its power and the other none.
        let [l, r] = spread(1.0, 0.3, 0.0, 0.0);
        assert!((l - 1.0).abs() < 1e-6 && (r - 1.0).abs() < 1e-6);
        let [l, r] = spread(1.0, 0.3, 1.0, 0.0);
        assert!(l.abs() < 1e-6 && (r - std::f32::consts::SQRT_2).abs() < 1e-6);
        let [l, r] = spread(1.0, 0.3, -0.5, 0.0);
        assert!(l > r && (l * l + r * r - 2.0).abs() < 1e-5);
        // All round, each ear has its own and where it is does not matter.
        assert_eq!(spread(1.0, 0.3, 1.0, 1.0), spread(1.0, 0.3, -1.0, 1.0));
        let [l, r] = spread(1.0, 0.3, 0.7, 1.0);
        assert!((l - 1.0).abs() < 1e-6 && (r - 0.3).abs() < 1e-6);
    }
}
