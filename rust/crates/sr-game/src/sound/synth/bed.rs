//! The beds: what is there when nothing is happening. The place's (wind in gusts, surf breaking or the sea
//! lapping at a spacecraft, a far hum at the mains' frequency) and the cabin's (its fans, its inverters' whine).

use std::f32::consts::TAU;

use super::knobs::Knobs;
use crate::sound::dsp::RATE;
use crate::sound::dsp::filter::{Svf, Tuning};
use crate::sound::dsp::noise::{Pink, Rng, Wander};
use crate::sound::shared::Knob;

/// What brings each part to a quarter of full scale with its knob at one: measured, in the test below.
const WIND: f32 = 1.46;
const WATER: f32 = 6.45;
const HUM: f32 = 0.48;
const FANS: f32 = 2.47;
const WHINE: f32 = 0.47;
/// A wave breaks every so many seconds, between these, and laps at a hull as often as these. Estimated.
const BREAKS: [f32; 2] = [6.0, 11.0];
const LAPS: [f32; 2] = [1.2, 2.6];
/// The fans' band is centred here, Hz. Estimated: neither their speed nor their blades were found.
const FAN: f32 = 1100.0;

/// A tone and its first two overtones, a little of each.
#[derive(Debug, Clone, Copy, Default)]
struct Tone(f32);

impl Tone {
    fn run(&mut self, hertz: f32) -> f32 {
        self.0 = (self.0 + hertz / RATE).fract();
        let turn = TAU * self.0;
        0.7 * turn.sin() + 0.2 * (2.0 * turn).sin() + 0.1 * (3.0 * turn).sin()
    }
}

/// A wave: it gathers, breaks and runs out, then the next.
#[derive(Debug, Clone, Copy)]
struct Swell {
    rng: Rng,
    at: f32,
    lasts: f32,
}

impl Swell {
    /// How full the wave is now, 0 to 1, with `lap` of the way from surf's pace to lapping's.
    fn run(&mut self, lap: f32) -> f32 {
        self.at += 1.0 / (self.lasts * RATE);
        if self.at >= 1.0 {
            let pick = self.rng.unit();
            let between = |[lo, hi]: [f32; 2]| lo + (hi - lo) * pick;
            self.lasts = between(BREAKS) + (between(LAPS) - between(BREAKS)) * lap.clamp(0.0, 1.0);
            self.at = 0.0;
        }
        // A quarter of it gathering, the rest running out, never quite silent between.
        let shape = if self.at < 0.25 { self.at / 0.25 } else { 1.0 - (self.at - 0.25) / 0.75 };
        0.12 + 0.88 * shape * shape
    }
}

/// One ear's worth of the noises.
#[derive(Debug, Clone, Copy)]
struct Chain {
    rng: Rng,
    pink: Pink,
    wind: Svf,
    water: Svf,
    fans: Svf,
}

/// The place's bed and the cabin's.
#[derive(Debug, Clone, Copy)]
pub struct Bed {
    chains: [Chain; 2],
    gust: Wander,
    swell: Swell,
    hum: Tone,
    whine: Tone,
    wind: Tuning,
    water: Tuning,
    fans: Tuning,
    full: f32,
    blows: f32,
}

impl Bed {
    /// Silent until its knobs are turned up.
    #[must_use]
    pub fn new() -> Self {
        let chain = |seed| Chain {
            rng: Rng::new(seed),
            pink: Pink::default(),
            wind: Svf::default(),
            water: Svf::default(),
            fans: Svf::default(),
        };
        Self {
            chains: [chain(0x00C0_FFEE), chain(0x0DEC_AF00)],
            gust: Wander::new(21),
            swell: Swell { rng: Rng::new(31), at: 0.6, lasts: 8.0 },
            hum: Tone::default(),
            whine: Tone::default(),
            wind: Tuning::default(),
            water: Tuning::default(),
            fans: Tuning::at(FAN, 0.7),
            full: 0.0,
            blows: 0.5,
        }
    }

    /// Set the filters from where the gust and the wave have got to: once a block.
    pub fn tune(&mut self) {
        self.wind = Tuning::at(260.0 + 520.0 * self.blows, 0.6);
        self.water = Tuning::at(500.0 + 1500.0 * self.full, 0.5);
    }

    /// The next frame: the cabin's, which is the flight's, and the place's, which is not.
    pub fn run(&mut self, k: &Knobs) -> ([f32; 2], [f32; 2]) {
        let (wind, water, hum) = (k.at(Knob::Wind), k.at(Knob::Water), k.at(Knob::Hum));
        let (fans, whine) = (k.at(Knob::Fans), k.at(Knob::Whine));
        if wind + water + hum + fans + whine < 1.0e-6 {
            return ([0.0; 2], [0.0; 2]);
        }
        self.blows = 0.5 + 0.5 * self.gust.run(0.25);
        self.full = self.swell.run(k.at(Knob::Lap));
        let wind = wind * WIND * (0.45 + 0.55 * self.blows);
        let water = water * WATER * self.full;
        let hum = hum * HUM * self.hum.run(k.at(Knob::Mains));
        let whine = whine * WHINE * self.whine.run(k.at(Knob::WhineAt));
        let (blowing, breaking, turning) = (self.wind, self.water, self.fans);
        let mut out = ([whine; 2], [hum; 2]);
        for (i, chain) in self.chains.iter_mut().enumerate() {
            let pink = chain.pink.run(chain.rng.white());
            out.0[i] += fans * FANS * chain.fans.run(pink, &turning).band;
            out.1[i] +=
                wind * chain.wind.run(pink, &blowing).low + water * chain.water.run(pink, &breaking).band;
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::sound::meter::{band, level};

    fn heard(set: &[(Knob, f32)], seconds: f32) -> (Vec<f32>, Vec<f32>) {
        let mut k = Knobs::default();
        k.put(Knob::Mains, 60.0);
        k.put(Knob::WhineAt, 400.0);
        for &(knob, value) in set {
            k.put(knob, value);
        }
        let mut bed = Bed::new();
        let (mut cabin, mut place) = (Vec::new(), Vec::new());
        for i in 0..(seconds * RATE) as usize {
            if i % 32 == 0 {
                bed.tune();
            }
            let (c, p) = bed.run(&k);
            cabin.push(c[0]);
            place.push(p[0]);
        }
        (cabin, place)
    }

    #[test]
    fn each_part_is_about_a_quarter_of_full_scale_with_its_knob_at_one() {
        let levels = [Knob::Wind, Knob::Water, Knob::Hum, Knob::Fans, Knob::Whine].map(|knob| {
            let (cabin, place) = heard(&[(knob, 1.0)], 60.0);
            let inboard = matches!(knob, Knob::Fans | Knob::Whine);
            // The cabin's bed is the flight's and the place's is not: neither is in the other's.
            assert_eq!(level(if inboard { &place } else { &cabin }).1, 0.0);
            (knob, level(if inboard { &cabin } else { &place }).0)
        });
        assert!(levels.iter().all(|(_, rms)| (0.2..0.3).contains(rms)), "{levels:?}");
    }

    #[test]
    fn the_hum_is_at_the_mains_and_the_whine_at_the_inverters() {
        let (_, place) = heard(&[(Knob::Hum, 1.0)], 2.0);
        assert!(band(&place, 55.0, 65.0) > 5.0 * band(&place, 65.0, 24_000.0));
        let (cabin, _) = heard(&[(Knob::Whine, 1.0)], 2.0);
        assert!(band(&cabin, 390.0, 410.0) > 5.0 * band(&cabin, 410.0, 24_000.0));
    }

    #[test]
    fn surf_comes_in_waves_and_lapping_comes_faster() {
        let breaks = |lap: f32| {
            let (_, place) = heard(&[(Knob::Water, 1.0), (Knob::Lap, lap)], 60.0);
            let levels: Vec<f32> = place.chunks(4800).map(|chunk| level(chunk).0).collect();
            let mean = levels.iter().sum::<f32>() / levels.len() as f32;
            levels.windows(2).filter(|pair| pair[0] < mean && pair[1] >= mean).count()
        };
        let (surf, lapping) = (breaks(0.0), breaks(1.0));
        assert!((4..=12).contains(&surf), "{surf} waves a minute");
        assert!(lapping > 2 * surf, "{lapping} against {surf}");
    }
}
