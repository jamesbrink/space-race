//! The engine's voice: a roar whose spectrum peaks where the knobs say, a rumble under it that rolls as a big
//! flame does, and the crackle of a rocket over it (sharp compressions with slow recoveries, so the pressure is
//! skewed: Ffowcs Williams, Simson and Virchis, J. Fluid Mech. 71, 1975). All three go through the low-pass the
//! air's distance puts over them and are followed by the ground's reflection.
//!
//! Every timbre here is a synthesised impression, `estimated`: no recording was measured or used.

use super::knobs::{Knobs, spread};
use crate::sound::dsp::RATE;
use crate::sound::dsp::delay::Delay;
use crate::sound::dsp::filter::{Low, Svf, Tuning, pole};
use crate::sound::dsp::noise::{Pink, Rng, Wander};
use crate::sound::shared::Knob;

/// What brings each part to a quarter of full scale (root-mean-square) with its knob at one: measured, in the
/// test below.
const ROAR: f32 = 1.41;
const RUMBLE: f32 = 7.7;
const CRACKLE: f32 = 3.2;
/// How many shocks a second the crackle has, how long each takes to die away, s, and the lowest frequency left
/// in it, Hz. Estimated.
const SHOCKS: f32 = 160.0;
const DIES: f32 = 0.0014;
const SHARP: f32 = 500.0;
/// How deeply the roar is torn, and the rumble rolls, and how many times a second each. Estimated.
const TEAR: f32 = 0.5;
const TEARS: f32 = 28.0;
const ROLL: f32 = 0.35;
const ROLLS: f32 = 3.0;
/// The longest the ground's reflection can be late, s.
const LATEST: f32 = 0.5;

/// The crackle: shocks at random, each a jump up and a slow fall back.
#[derive(Debug, Clone, Copy, Default)]
struct Crackle {
    level: f32,
    under: Low,
}

impl Crackle {
    fn run(&mut self, rng: &mut Rng, sharp: f32) -> f32 {
        if rng.unit() < SHOCKS / RATE {
            let size = rng.unit();
            self.level += 0.3 + 0.7 * size * size;
        }
        self.level *= 1.0 - 1.0 / (DIES * RATE);
        self.under.above(self.level, sharp)
    }
}

/// One ear's worth of it.
#[derive(Debug, Clone)]
struct Chain {
    rng: Rng,
    pink: Pink,
    body: Svf,
    top: Low,
    rumble: Svf,
    tear: Low,
    crackle: Crackle,
    air: [Low; 2],
    echo: Delay,
}

impl Chain {
    fn new(seed: u32) -> Self {
        Self {
            rng: Rng::new(seed),
            pink: Pink::default(),
            body: Svf::default(),
            top: Low::default(),
            rumble: Svf::default(),
            tear: Low::default(),
            crackle: Crackle::default(),
            air: [Low::default(); 2],
            echo: Delay::new((LATEST * RATE) as usize + 8),
        }
    }

    fn run(&mut self, k: &Knobs, t: &Tuned, roll: f32) -> f32 {
        let white = self.rng.white();
        let roar = self.top.run(self.body.run(self.pink.run(white), &t.body).high, t.top) * ROAR;
        let tear = 1.0 + TEAR * (self.tear.run(self.rng.white(), t.tear) * 14.0).clamp(-1.0, 1.0);
        let rumble = self.rumble.run(white, &t.rumble).low * RUMBLE * roll;
        let crackle = self.crackle.run(&mut self.rng, t.sharp) * CRACKLE;
        let dry =
            (k.at(Knob::Roar) * roar + k.at(Knob::Crackle) * crackle) * tear + k.at(Knob::Rumble) * rumble;
        let once = self.air[0].run(dry, t.air);
        let heard = self.air[1].run(once, t.air);
        heard + k.at(Knob::EchoGain) * self.echo.run(heard, t.echo)
    }
}

/// The filters' settings, worked once a block from the knobs.
#[derive(Debug, Clone, Copy, Default)]
struct Tuned {
    body: Tuning,
    top: f32,
    rumble: Tuning,
    tear: f32,
    sharp: f32,
    air: f32,
    echo: f32,
}

/// The engine.
#[derive(Debug, Clone)]
pub struct Engine {
    chains: [Chain; 2],
    roll: Wander,
    tuned: Tuned,
}

impl Engine {
    /// One, silent until its knobs are turned up.
    #[must_use]
    pub fn new() -> Self {
        Self {
            chains: [Chain::new(0x51ED_270B), Chain::new(0x2545_F491)],
            roll: Wander::new(77),
            tuned: Tuned::default(),
        }
    }

    /// Set the filters from the knobs: once a block.
    pub fn tune(&mut self, k: &Knobs) {
        let peak = (k.at(Knob::Peak) * k.at(Knob::Shift).clamp(0.25, 4.0)).clamp(10.0, 2000.0);
        self.tuned = Tuned {
            // Under half its peak the spectrum falls 12 dB an octave; over six times it, six more than pink's three.
            body: Tuning::at(0.5 * peak, 0.6),
            top: pole(6.0 * peak),
            rumble: Tuning::at(peak, 0.7),
            tear: pole(TEARS),
            sharp: pole(SHARP * k.at(Knob::Shift).clamp(0.25, 4.0)),
            air: pole(k.at(Knob::Cutoff).clamp(40.0, 16_000.0)),
            echo: (k.at(Knob::EchoDelay) * RATE).clamp(1.0, LATEST * RATE),
        };
    }

    /// The next frame.
    pub fn run(&mut self, k: &Knobs) -> [f32; 2] {
        if k.at(Knob::Roar) + k.at(Knob::Rumble) + k.at(Knob::Crackle) < 1.0e-5 {
            return [0.0; 2];
        }
        let roll = 1.0 + ROLL * self.roll.run(ROLLS);
        let [a, b] = &mut self.chains;
        let (a, b) = (a.run(k, &self.tuned, roll), b.run(k, &self.tuned, roll));
        spread(a, b, k.at(Knob::Pan), k.at(Knob::Width))
    }
}

impl Default for Engine {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sound::meter::{band, level};

    fn knobs(roar: f32, crackle: f32, rumble: f32) -> Knobs {
        let mut k = Knobs::default();
        for (knob, value) in [
            (Knob::Roar, roar),
            (Knob::Crackle, crackle),
            (Knob::Rumble, rumble),
            (Knob::Peak, 57.5),
            (Knob::Shift, 1.0),
            (Knob::Cutoff, 16_000.0),
            (Knob::Width, 1.0),
        ] {
            k.put(knob, value);
        }
        k
    }

    fn heard(k: &Knobs, seconds: f32) -> Vec<f32> {
        let mut engine = Engine::new();
        engine.tune(k);
        (0..(seconds * RATE) as usize).map(|_| engine.run(k)[0]).collect()
    }

    #[test]
    fn each_part_is_a_quarter_of_full_scale_with_its_knob_at_one() {
        let parts = [
            ("roar", knobs(1.0, 0.0, 0.0)),
            ("crackle", knobs(0.0, 1.0, 0.0)),
            ("rumble", knobs(0.0, 0.0, 1.0)),
        ];
        let levels = parts.map(|(name, k)| (name, level(&heard(&k, 6.0)).0));
        assert!(levels.iter().all(|(_, rms)| (0.22..0.28).contains(rms)), "{levels:?}");
        assert_eq!(level(&heard(&knobs(0.0, 0.0, 0.0), 0.5)), (0.0, 0.0));
    }

    #[test]
    fn the_roar_is_strongest_about_its_peak_and_the_crackle_is_skewed() {
        let roar = heard(&knobs(1.0, 0.0, 0.0), 4.0);
        let about = band(&roar, 40.0, 160.0);
        assert!(about > band(&roar, 640.0, 2560.0) && about > 4.0 * band(&roar, 0.0, 20.0));
        // The crackle's pressure is skewed: sharp rises, slow falls (over 0.3 is heard as crackle).
        let crackle = heard(&knobs(0.0, 1.0, 0.0), 4.0);
        let n = crackle.len() as f64;
        let mean = crackle.iter().map(|&x| f64::from(x)).sum::<f64>() / n;
        let moment = |power: i32| crackle.iter().map(|&x| (f64::from(x) - mean).powi(power)).sum::<f64>() / n;
        let skew = moment(3) / moment(2).powf(1.5);
        assert!(skew > 0.5, "{skew}");
    }

    #[test]
    fn distance_takes_the_top_off_it() {
        let near = heard(&knobs(1.0, 1.0, 1.0), 3.0);
        let mut k = knobs(1.0, 1.0, 1.0);
        k.put(Knob::Cutoff, 200.0);
        let far = heard(&k, 3.0);
        let top = |heard: &[f32]| band(heard, 2000.0, 8000.0) / band(heard, 30.0, 120.0);
        assert!(top(&far) < 0.01 * top(&near), "{} {}", top(&far), top(&near));
    }
}
