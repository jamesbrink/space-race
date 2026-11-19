//! The last stage: what is under the hearing is taken out, a limiter that looks a little ahead rides the level
//! down before a peak arrives, and a soft clip that cannot pass full scale catches whatever it was too slow for.

use super::RATE;
use super::filter::{Low, glide, pole};

/// Below this a sample is passed as it is; above, it is bent toward full scale and never reaches it.
const KNEE: f32 = 0.6;
/// The level the limiter holds the louder channel to before the bend (so what comes out peaks at 0.9), how far ahead
/// it looks (samples: 2.7 ms), how fast it comes down on a peak it has seen coming and how slowly it lets go, s. A
/// choice, not physics: the roar should sound loud, its peaks rounded and not torn.
const HOLDS: f32 = 1.0;
const AHEAD: usize = 128;
const ATTACK: f32 = 0.0006;
const RELEASE: f32 = 0.25;
/// Nothing under this is passed, Hz: no loudspeaker reproduces it, and an N-wave's push would only waste headroom.
const UNDER: f32 = 18.0;

/// A sample bent so it cannot pass full scale: straight to [`KNEE`], then a hyperbolic tangent's shoulder.
#[must_use]
pub fn soft(x: f32) -> f32 {
    let size = x.abs();
    if size <= KNEE {
        return x;
    }
    let room = 1.0 - KNEE;
    (KNEE + room * ((size - KNEE) / room).tanh()).min(0.9999).copysign(x)
}

/// The last stage of both channels.
#[derive(Debug, Clone, Copy)]
pub struct Limiter {
    under: [Low; 2],
    /// What went in, kept until the envelope has seen what follows it.
    kept: [[f32; 2]; AHEAD],
    at: usize,
    /// The highest peak among what is kept, and how many more samples it is kept for.
    held: f32,
    left: usize,
    envelope: f32,
}

impl Default for Limiter {
    fn default() -> Self {
        Self { under: [Low::default(); 2], kept: [[0.0; 2]; AHEAD], at: 0, held: 0.0, left: 0, envelope: 0.0 }
    }
}

impl Limiter {
    /// One frame through it, [`AHEAD`] samples late. What comes out is never at or over full scale.
    pub fn run(&mut self, frame: [f32; 2]) -> [f32; 2] {
        let a = pole(UNDER);
        let now = [self.under[0].above(frame[0], a), self.under[1].above(frame[1], a)];
        let peak = now[0].abs().max(now[1].abs());
        // A peak is held for as long as it is kept, so the envelope is up to it by the time it comes out.
        if peak >= self.held || self.left == 0 {
            (self.held, self.left) = (peak, AHEAD);
        }
        self.left -= 1;
        let rate = if self.held > self.envelope { glide(ATTACK, RATE) } else { glide(RELEASE, RATE) };
        self.envelope += (self.held - self.envelope) * rate;
        let [l, r] = std::mem::replace(&mut self.kept[self.at], now);
        self.at = (self.at + 1) % AHEAD;
        let gain = if self.envelope > HOLDS { HOLDS / self.envelope } else { 1.0 };
        [soft(l * gain), soft(r * gain)]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn the_soft_clip_is_straight_when_quiet_and_never_reaches_full_scale() {
        assert_eq!(soft(0.5), 0.5);
        assert_eq!(soft(-0.3), -0.3);
        for x in [0.9, 1.5, 4.0, 100.0] {
            assert!(soft(x) < 1.0 && soft(-x) > -1.0, "{x}");
            assert!(soft(x) > KNEE);
        }
        // (no step where the shoulder begins)
        assert!((soft(KNEE + 1e-4) - KNEE - 1e-4).abs() < 1e-6);
    }

    #[test]
    fn a_roar_ten_times_too_loud_is_held_on_the_shoulder_and_a_quiet_one_comes_out_as_it_went_in() {
        let tone = |i: usize, gain: f32| gain * (i as f32 * 0.05).sin();
        let mut limiter = Limiter::default();
        let mut worst = 0.0_f32;
        for i in 0..48_000 {
            let [l, r] = limiter.run([tone(i, 10.0), -tone(i, 10.0)]);
            // (once it has had a hundredth of a second to come down on it)
            if i > 480 {
                worst = worst.max(l.abs()).max(r.abs());
            }
        }
        assert!(worst < 0.93, "{worst}");
        // 0.05 rad a sample is 382 Hz: far above the corner, so it is passed whole, as late as the limiter looks ahead.
        let mut limiter = Limiter::default();
        let mut out = 0.0;
        for i in 0..48_000 {
            out = limiter.run([tone(i, 0.2), 0.0])[0];
        }
        assert!((out - tone(47_999 - AHEAD, 0.2)).abs() < 0.01, "{out}");
    }

    #[test]
    fn a_sudden_blow_does_not_get_past_it() {
        // Silence, then at once a square wave four times full scale: it was seen coming.
        let mut limiter = Limiter::default();
        let mut worst = 0.0_f32;
        for i in 0..9600 {
            let x = if i < 4800 { 0.0 } else { 4.0_f32.copysign((i as f32 * 0.02).sin()) };
            worst = worst.max(limiter.run([x, x])[0].abs());
        }
        assert!(worst < 0.97, "{worst}");
    }

    #[test]
    fn a_steady_push_is_taken_out() {
        let mut limiter = Limiter::default();
        let mut out = [1.0; 2];
        for _ in 0..48_000 {
            out = limiter.run([0.5, 0.5]);
        }
        assert!(out[0].abs() < 1e-3);
    }
}
