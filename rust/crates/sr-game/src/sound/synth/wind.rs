//! The air on the vehicle, and its jets: a band of noise that follows dynamic pressure and flutters through
//! Mach 1 and under a canopy, the low thudding of buffet under it, and the hiss of the attitude jets.

use super::knobs::Knobs;
use crate::sound::dsp::filter::{Svf, Tuning};
use crate::sound::dsp::noise::{Pink, Rng, Wander};
use crate::sound::shared::Knob;

/// What brings each part to a quarter of full scale with its knob at one: measured, in the test below.
const RUSH: f32 = 2.26;
const BUFFET: f32 = 13.6;
const HISS: f32 = 0.46;
/// The buffet's band tops out here, Hz, and it thuds this many times a second. Estimated: Shepard's "head
/// vibration was such that my vision was blurred" gives no frequency.
const THUD: f32 = 42.0;
const THUDS: f32 = 11.0;
/// The jets' hiss is above this, Hz. Estimated.
const JET: f32 = 2600.0;

/// One ear's worth of it.
#[derive(Debug, Clone, Copy)]
struct Chain {
    rng: Rng,
    pink: Pink,
    rush: Svf,
    thud: Svf,
    hiss: Svf,
}

/// The air and the jets.
#[derive(Debug, Clone, Copy)]
pub struct Wind {
    chains: [Chain; 2],
    flap: Wander,
    shake: Wander,
    rush: Tuning,
    thud: Tuning,
    hiss: Tuning,
}

impl Wind {
    /// Silent until its knobs are turned up.
    #[must_use]
    pub fn new() -> Self {
        let chain = |seed| Chain {
            rng: Rng::new(seed),
            pink: Pink::default(),
            rush: Svf::default(),
            thud: Svf::default(),
            hiss: Svf::default(),
        };
        Self {
            chains: [chain(0x1234_5678), chain(0x0BAD_CAFE)],
            flap: Wander::new(5),
            shake: Wander::new(9),
            rush: Tuning::default(),
            thud: Tuning::at(THUD, 1.2),
            hiss: Tuning::at(JET, 0.7),
        }
    }

    /// Set the band from the knobs: once a block.
    pub fn tune(&mut self, k: &Knobs) {
        self.rush = Tuning::at(k.at(Knob::AirCentre).clamp(60.0, 4000.0), 0.8);
    }

    /// The next frame.
    pub fn run(&mut self, k: &Knobs) -> [f32; 2] {
        let (air, buffet, jets) = (k.at(Knob::Air), k.at(Knob::Buffet), k.at(Knob::Jets));
        if air + buffet + jets < 1.0e-5 {
            return [0.0; 2];
        }
        let flap = 0.5 + 0.5 * self.flap.run(k.at(Knob::FlutterRate).max(0.5));
        let rush = air * RUSH * (1.0 - k.at(Knob::Flutter).clamp(0.0, 1.0) * flap);
        let thud = buffet * BUFFET * (0.6 + 0.4 * self.shake.run(THUDS));
        let (band, low, high) = (self.rush, self.thud, self.hiss);
        self.chains.each_mut().map(|chain| {
            let white = chain.rng.white();
            // (pink into the band: wind on a body is weighted to the low side of wherever it is centred)
            rush * chain.rush.run(chain.pink.run(white), &band).band
                + thud * chain.thud.run(white, &low).low
                + jets * HISS * chain.hiss.run(white, &high).high
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sound::dsp::RATE;
    use crate::sound::meter::{band, centroid, level};

    fn heard(set: &[(Knob, f32)]) -> Vec<f32> {
        let mut k = Knobs::default();
        k.put(Knob::AirCentre, 500.0);
        k.put(Knob::FlutterRate, 9.0);
        for &(knob, value) in set {
            k.put(knob, value);
        }
        let mut wind = Wind::new();
        wind.tune(&k);
        (0..(4.0 * RATE) as usize).map(|_| wind.run(&k)[0]).collect()
    }

    #[test]
    fn each_part_is_a_quarter_of_full_scale_with_its_knob_at_one() {
        let levels =
            [Knob::Air, Knob::Buffet, Knob::Jets].map(|knob| (knob, level(&heard(&[(knob, 1.0)])).0));
        assert!(levels.iter().all(|(_, rms)| (0.22..0.28).contains(rms)), "{levels:?}");
        assert_eq!(level(&heard(&[])), (0.0, 0.0));
    }

    #[test]
    fn the_rush_follows_its_centre_the_buffet_is_low_and_the_jets_are_high() {
        let low = centroid(&heard(&[(Knob::Air, 1.0), (Knob::AirCentre, 250.0)]));
        let high = centroid(&heard(&[(Knob::Air, 1.0), (Knob::AirCentre, 750.0)]));
        assert!(high > 1.5 * low, "{low} {high}");
        let buffet = heard(&[(Knob::Buffet, 1.0)]);
        assert!(band(&buffet, 0.0, 80.0) > 10.0 * band(&buffet, 80.0, 24_000.0));
        assert!(centroid(&heard(&[(Knob::Jets, 1.0)])) > 5000.0);
    }

    #[test]
    fn a_flutter_makes_it_come_and_go() {
        let steady = heard(&[(Knob::Air, 1.0)]);
        let fluttering = heard(&[(Knob::Air, 1.0), (Knob::Flutter, 0.9)]);
        // Its level over each twentieth of a second: steadier without the flutter.
        let swing = |heard: &[f32]| {
            let levels: Vec<f32> = heard.chunks(2400).map(|chunk| level(chunk).0).collect();
            let mean = levels.iter().sum::<f32>() / levels.len() as f32;
            (levels.iter().map(|l| (l - mean).powi(2)).sum::<f32>() / levels.len() as f32).sqrt() / mean
        };
        assert!(swing(&fluttering) > 2.0 * swing(&steady), "{} {}", swing(&fluttering), swing(&steady));
    }
}
