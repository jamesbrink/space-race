//! Noise: a generator that needs no state but a word, white noise from it, pink from white, and a slow wander.

/// A xorshift generator: thirty-two bits of state, no allocation, the same sequence from the same seed.
#[derive(Debug, Clone, Copy)]
pub struct Rng(u32);

impl Rng {
    /// From a seed (nought would stick, so it is replaced).
    #[must_use]
    pub const fn new(seed: u32) -> Self {
        Self(if seed == 0 { 0x9E37_79B9 } else { seed })
    }

    /// The next word.
    pub fn word(&mut self) -> u32 {
        let mut x = self.0;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.0 = x;
        x
    }

    /// Evenly between nought and one.
    pub fn unit(&mut self) -> f32 {
        (self.word() >> 8) as f32 / 16_777_216.0
    }

    /// White noise, evenly between minus one and one.
    pub fn white(&mut self) -> f32 {
        self.unit() * 2.0 - 1.0
    }
}

/// Pink noise from white: equal power to the octave (Paul Kellett's filter, good to half a decibel from 10 Hz
/// up), scaled to about the white's own level.
#[derive(Debug, Clone, Copy, Default)]
pub struct Pink([f32; 7]);

impl Pink {
    /// One sample of pink for one of white.
    pub fn run(&mut self, white: f32) -> f32 {
        let b = &mut self.0;
        b[0] = 0.998_86 * b[0] + white * 0.055_517_9;
        b[1] = 0.993_32 * b[1] + white * 0.075_075_9;
        b[2] = 0.969_00 * b[2] + white * 0.153_852;
        b[3] = 0.866_50 * b[3] + white * 0.310_485_6;
        b[4] = 0.550_00 * b[4] + white * 0.532_952_2;
        b[5] = -0.761_6 * b[5] - white * 0.016_898_0;
        let pink = b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + white * 0.536_2;
        b[6] = white * 0.115_926;
        pink * 0.2
    }
}

/// A slow, smooth wander between minus one and one: a new place to go every so often, glided to. Gusts, swells
/// and the rolling of a big flame are this.
#[derive(Debug, Clone, Copy)]
pub struct Wander {
    rng: Rng,
    at: f32,
    toward: f32,
    left: u32,
}

impl Wander {
    /// From a seed.
    #[must_use]
    pub const fn new(seed: u32) -> Self {
        Self { rng: Rng::new(seed), at: 0.0, toward: 0.0, left: 0 }
    }

    /// The next sample, choosing somewhere new to go about `hertz` times a second.
    pub fn run(&mut self, hertz: f32) -> f32 {
        let every = (super::RATE / hertz.max(0.01)).max(1.0);
        if self.left == 0 {
            self.toward = self.rng.white();
            self.left = (every * (0.5 + self.rng.unit())) as u32;
        }
        self.left = self.left.saturating_sub(1);
        self.at += (self.toward - self.at) * (3.0 / every).min(1.0);
        self.at
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sound::meter::band;

    #[test]
    fn white_noise_is_even_about_nought() {
        let mut rng = Rng::new(7);
        let n = 200_000;
        let (mut sum, mut square) = (0.0_f64, 0.0_f64);
        for _ in 0..n {
            let x = f64::from(rng.white());
            sum += x;
            square += x * x;
        }
        // An even spread over -1..1 has a mean of nought and a variance of a third.
        assert!((sum / f64::from(n)).abs() < 0.01);
        assert!((square / f64::from(n) - 1.0 / 3.0).abs() < 0.01);
    }

    #[test]
    fn pink_noise_has_the_same_power_in_every_octave() {
        let (mut rng, mut pink) = (Rng::new(11), Pink::default());
        let heard: Vec<f32> = (0..1 << 17).map(|_| pink.run(rng.white())).collect();
        let low = band(&heard, 100.0, 200.0);
        for octave in [(400.0, 800.0), (1600.0, 3200.0), (6400.0, 12_800.0)] {
            let ratio = 10.0 * (band(&heard, octave.0, octave.1) / low).log10();
            assert!(ratio.abs() < 1.5, "{octave:?} is {ratio:.2} dB off the 100 Hz octave");
        }
    }

    #[test]
    fn a_wander_stays_within_one_and_moves() {
        let mut wander = Wander::new(3);
        let all: Vec<f32> = (0..96_000).map(|_| wander.run(2.0)).collect();
        assert!(all.iter().all(|x| x.abs() <= 1.0));
        let (lo, hi) = all.iter().fold((1.0_f32, -1.0_f32), |(lo, hi), &x| (lo.min(x), hi.max(x)));
        assert!(hi - lo > 0.5, "{lo} to {hi}");
    }
}
